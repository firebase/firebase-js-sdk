/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { type DataConnect } from '../../api/DataConnect';
import { QueryRef, QueryResult } from '../../api/query';
import {
  QUERY_STR,
  SerializedRef,
  SOURCE_SERVER,
  DataSource,
  SOURCE_CACHE
} from '../../api/Reference';
import { DataConnectSubscription } from '../../api.browser';
import { DataConnectCache, ServerValues } from '../../cache/Cache';
import { parseEntityIds } from '../../cache/cacheUtils';
import { EncodingMode } from '../../cache/EntityNode';
import {
  DataConnectTransportInterface,
  Extensions,
  DataConnectExtensionWithMaxAge,
  ExtensionsWithMaxAge,
  SubscribeObserver,
  DataConnectResponse
} from '../../network';
import { decoderImpl, encoderImpl } from '../../util/encoder';
import {
  Code,
  DataConnectError,
  DataConnectOperationError,
  DataConnectOperationFailureResponse
} from '../error';

import {
  OnCompleteSubscription,
  OnErrorSubscription,
  OnResultSubscription
} from './subscribe';

import { PersistentCacheProvider } from '../../cache/IndexedDbCacheProvider';
import { InMemoryCacheProvider } from '../../cache/InMemoryCacheProvider';
import {
  MultiTabCoordinator,
  ServerRequestMessage,
  ServerResponseMessage,
  CacheUpdateMessage
} from '../MultiTabCoordinator';

export function getRefSerializer<Data, Variables>(
  queryRef: QueryRef<Data, Variables>,
  data: Data,
  source: DataSource,
  fetchTime: string
) {
  return function toJSON(): SerializedRef<Data, Variables> {
    return {
      data,
      refInfo: {
        name: queryRef.name,
        variables: queryRef.variables,
        connectorConfig: {
          projectId: queryRef.dataConnect.app.options.projectId!,
          ...queryRef.dataConnect.getSettings()
        }
      },
      fetchTime,
      source
    };
  };
}

/**
 * QueryManager handles execution, caching, real-time synchronization, and concurrent multi-tab persistence routing.
 */
export class QueryManager {
  private callbacks = new Map<
    string,
    Array<DataConnectSubscription<unknown, unknown>>
  >();
  
  /**
   * Map of serialized query keys to most recent Query Result. Used as a simple fallback cache
   * for subscriptions if caching is not enabled.
   */
  private subscriptionCache = new Map<string, QueryResult<unknown, unknown>>();
  
  private queue: Array<Promise<unknown>> = [];

  // Persistent Coordinator fields
  private coordinator: MultiTabCoordinator | null = null;
  private currentProvider: any = null;
  private pendingIpcRequests = new Map<
    string,
    {
      queryRef: QueryRef<any, any>;
      resolve: (res: any) => void;
      reject: (err: any) => void;
    }
  >();

  constructor(
    private transport: DataConnectTransportInterface,
    private dc: DataConnect,
    private cache?: DataConnectCache
  ) {}

  async preferCacheResults<Data, Variables>(
    queryRef: QueryRef<Data, Variables>,
    allowStale = false
  ): Promise<QueryResult<Data, Variables>> {
    let cacheResult: QueryResult<Data, Variables> | undefined;
    try {
      cacheResult = await this.fetchCacheResults(queryRef, allowStale);
    } catch (e) {
      // Ignore the error and try to fetch from the server.
    }
    if (cacheResult) {
      return cacheResult;
    }
    return this.fetchServerResults(queryRef);
  }

  async waitForQueuedWrites(): Promise<void> {
    for (const promise of this.queue) {
      await promise;
    }
    this.queue = [];
  }

  updateSSR<Data, Variables>(updatedData: QueryResult<Data, Variables>): void {
    this.queue.push(
      this.updateCache(updatedData).then(async result =>
        this.publishCacheResultsToSubscribers(result, updatedData.fetchTime)
      )
    );
  }

  async updateCache<Data, Variables>(
    result: QueryResult<Data, Variables>,
    extensions?: DataConnectExtensionWithMaxAge[]
  ): Promise<string[]> {
    await this.waitForQueuedWrites();
    if (this.cache) {
      const entityIds = parseEntityIds(result);
      const updatedMaxAge = getMaxAgeFromExtensions(extensions);
      if (updatedMaxAge !== undefined) {
        this.cache.cacheSettings.maxAgeSeconds = updatedMaxAge;
      }
      return this.cache.update(
        encoderImpl({
          name: result.ref.name,
          variables: result.ref.variables,
          refType: QUERY_STR
        }),
        result.data as ServerValues,
        entityIds
      );
    } else {
      const key = encoderImpl({
        name: result.ref.name,
        variables: result.ref.variables,
        refType: QUERY_STR
      });
      this.subscriptionCache.set(key, result);
      return [key];
    }
  }

  /**
   * Resolves or creates the MultiTabCoordinator on demand to align with Auth namespacing.
   */
  private getCoordinator(): MultiTabCoordinator | null {
    if (!this.cache) {
      return null;
    }
    const provider = this.cache.getProvider();
    if (!provider || !('startWriteSession' in provider)) {
      if (this.coordinator) {
        this.coordinator.close();
        this.coordinator = null;
      }
      this.currentProvider = null;
      return null;
    }
    if (provider !== this.currentProvider) {
      if (this.coordinator) {
        this.coordinator.close();
      }
      this.currentProvider = provider;
      this.coordinator = new MultiTabCoordinator(
        (provider as any).dbName,
        provider as any,
        (isLeader) => this.handleLeaderChange(isLeader),
        (msg) => this.handleServerRequest(msg),
        (msg) => this.handleServerResponse(msg),
        (msg) => this.handleCacheUpdate(msg)
      );
      this.coordinator.init();
    }
    return this.coordinator;
  }

  private handleLeaderChange(isLeader: boolean): void {
    if (isLeader) {
      // Promote to Leader: clean up tracked pending IPCs and execute queries natively
      const pending = Array.from(this.pendingIpcRequests.entries());
      this.pendingIpcRequests.clear();
      for (const [_, req] of pending) {
        this.fetchServerResults(req.queryRef).then(req.resolve, req.reject);
      }
    } else {
      // Re-send unfulfilled queries and active subscriptions to the new Leader
      const pending = Array.from(this.pendingIpcRequests.entries());
      const coordinator = this.getCoordinator();
      if (coordinator) {
        for (const [requestID, req] of pending) {
          coordinator.broadcastMessage({
            type: 'Server Request',
            requestID,
            requestType: 'execute',
            queryRef: { name: req.queryRef.name, variables: req.queryRef.variables },
            followerId: coordinator.myClientId
          });
        }

        // Re-establish active passive subscriptions on the new Leader
        for (const [key, callbacks] of this.callbacks.entries()) {
          if (callbacks.length > 0) {
            const { name, variables } = decoderImpl(key) as any;
            coordinator.broadcastMessage({
              type: 'Server Request',
              requestID: Math.random().toString(),
              requestType: 'subscribe',
              queryRef: { name, variables, serializedKey: key },
              followerId: coordinator.myClientId
            });
          }
        }
      }
    }
  }

  private async handleServerRequest(msg: ServerRequestMessage): Promise<void> {
    if (msg.requestType === 'execute') {
      const { name, variables } = msg.queryRef;
      const queryRef: QueryRef<any, any> = {
        dataConnect: this.dc,
        refType: QUERY_STR,
        name,
        variables
      };
      this.fetchServerResults(queryRef).then(
        (result) => {
          const coordinator = this.getCoordinator();
          if (coordinator && coordinator.isLeader) {
            coordinator.broadcastMessage({
              type: 'Server Response',
              requestID: msg.requestID,
              queryRef: msg.queryRef,
              leaderId: coordinator.myClientId,
              result: result
            });
          }
        },
        (error) => {
          const coordinator = this.getCoordinator();
          if (coordinator && coordinator.isLeader) {
            coordinator.broadcastMessage({
              type: 'Server Response',
              requestID: msg.requestID,
              queryRef: msg.queryRef,
              leaderId: coordinator.myClientId,
              error: error
            });
          }
        }
      );
    } else if (msg.requestType === 'subscribe') {
      const { name, variables, serializedKey } = msg.queryRef;
      const queryRef: QueryRef<any, any> = {
        dataConnect: this.dc,
        refType: QUERY_STR,
        name,
        variables
      };
      if (!this.callbacks.has(serializedKey)) {
        this.callbacks.set(serializedKey, []);
        this.serverNetworkSubscribe(queryRef);
      }
    } else if (msg.requestType === 'unsubscribe') {
      const { serializedKey } = msg.queryRef;
      const { name, variables } = decoderImpl(serializedKey) as any;
      const queryRef: QueryRef<any, any> = {
        dataConnect: this.dc,
        refType: QUERY_STR,
        name,
        variables
      };
      if (this.callbacks.has(serializedKey) && this.callbacks.get(serializedKey)!.length === 0) {
        this.callbacks.delete(serializedKey);
        this.serverNetworkUnsubscribe(queryRef);
      }
    }
  }

  private handleServerResponse(msg: ServerResponseMessage): void {
    const req = this.pendingIpcRequests.get(msg.requestID);
    if (req) {
      this.pendingIpcRequests.delete(msg.requestID);
      if (msg.error) {
        req.reject(msg.error);
      } else {
        req.resolve(msg.result);
      }
    }
  }

  private async handleCacheUpdate(msg: CacheUpdateMessage): Promise<void> {
    await this.publishCacheResultsToSubscribers(msg.updatedKeys, msg.fetchTime.toString());
  }

  addSubscription<Data, Variables>(
    queryRef: QueryRef<Data, Variables>,
    onResultCallback: OnResultSubscription<Data, Variables>,
    onCompleteCallback?: OnCompleteSubscription,
    onErrorCallback?: OnErrorSubscription,
    initialCache?: QueryResult<Data, Variables>
  ): () => void {
    const key = encoderImpl({
      name: queryRef.name,
      variables: queryRef.variables,
      refType: QUERY_STR
    });

    const unsubscribe = (): void => {
      if (this.callbacks.has(key)) {
        const callbackList = this.callbacks.get(key)!;
        const newList = callbackList.filter(
          callback => callback !== subscription
        );
        this.callbacks.set(key, newList);

        if (newList.length === 0) {
          this.callbacks.delete(key);
          const coordinator = this.getCoordinator();
          if (coordinator && !coordinator.isLeader) {
            coordinator.broadcastMessage({
              type: 'Server Request',
              requestID: Math.random().toString(),
              requestType: 'unsubscribe',
              queryRef: { name: queryRef.name, variables: queryRef.variables, serializedKey: key },
              followerId: coordinator.myClientId
            });
          } else {
            this.serverNetworkUnsubscribe(queryRef);
          }
        }
        onCompleteCallback?.();
      }
    };
    
    const subscription: DataConnectSubscription<Data, Variables> = {
      userCallback: onResultCallback,
      errCallback: onErrorCallback,
      unsubscribe
    };

    if (initialCache) {
      this.updateSSR(initialCache);
    }

    const promise = this.preferCacheResults(queryRef, /*allowStale=*/ true);
    // We want to ignore the error and let subscriptions handle it
    promise.then(undefined, err => {});

    if (this.callbacks.has(key)) {
      this.callbacks
        .get(key)!
        .push(subscription as DataConnectSubscription<unknown, unknown>);
    } else {
      this.callbacks.set(key, [
        subscription as DataConnectSubscription<unknown, unknown>
      ]);

      const coordinator = this.getCoordinator();
      if (coordinator && !coordinator.isLeader) {
        coordinator.broadcastMessage({
          type: 'Server Request',
          requestID: Math.random().toString(),
          requestType: 'subscribe',
          queryRef: { name: queryRef.name, variables: queryRef.variables, serializedKey: key },
          followerId: coordinator.myClientId
        });
      } else {
        this.serverNetworkSubscribe(queryRef);
      }
    }

    return unsubscribe;
  }

  /**
   * Executes a raw server network query call.
   */
  private async serverNetworkCall<Data, Variables>(
    queryRef: QueryRef<Data, Variables>
  ): Promise<QueryResult<Data, Variables>> {
    await this.waitForQueuedWrites();
    const result = await this.transport.invokeQuery<Data, Variables>(
      queryRef.name,
      queryRef.variables
    );
    const fetchTime = Date.now().toString();
    const originalExtensions = result.extensions;
    return {
      ...result,
      ref: queryRef,
      source: SOURCE_SERVER,
      fetchTime,
      data: result.data,
      extensions: getDataConnectExtensionsWithoutMaxAge(originalExtensions),
      toJSON: getRefSerializer(
        queryRef,
        result.data,
        SOURCE_SERVER,
        fetchTime
      ),
      _originalExtensions: originalExtensions
    } as any;
  }

  /**
   * Writes result values directly to the cache.
   */
  private async writeToCache<Data, Variables>(
    key: string,
    queryResult: QueryResult<Data, Variables>,
    extensions?: DataConnectExtensionWithMaxAge[]
  ): Promise<string[]> {
    return this.updateCache(queryResult, extensions);
  }

  /**
   * Propagates results to local callback structures and fallback subscription caches.
   */
  private async updateLocalFromCallbacks(
    key: string,
    queryResult: QueryResult<unknown, unknown>,
    updatedKeys: string[],
    fetchTime: string
  ): Promise<void> {
    this.publishDataToSubscribers(key, queryResult);
    if (this.cache) {
      await this.publishCacheResultsToSubscribers(updatedKeys, fetchTime);
    } else {
      this.subscriptionCache.set(key, queryResult);
    }
  }

  async fetchServerResults<Data, Variables>(
    queryRef: QueryRef<Data, Variables>
  ): Promise<QueryResult<Data, Variables>> {
    const key = encoderImpl({
      name: queryRef.name,
      variables: queryRef.variables,
      refType: QUERY_STR
    });

    try {
      const coordinator = this.getCoordinator();
      if (coordinator && !coordinator.isLeader) {
        // Route over BroadcastChannel as a passive Follower
        const requestID = Math.random().toString(36).substring(2, 15);
        return new Promise<QueryResult<Data, Variables>>((resolve, reject) => {
          this.pendingIpcRequests.set(requestID, { queryRef, resolve, reject });
          coordinator.broadcastMessage({
            type: 'Server Request',
            requestID,
            requestType: 'execute',
            queryRef: { name: queryRef.name, variables: queryRef.variables },
            followerId: coordinator.myClientId
          });
        });
      }

      const queryResult = await this.serverNetworkCall(queryRef);
      const originalExtensions = (queryResult as any)._originalExtensions;

      const updatedKeys = await this.writeToCache(
        key,
        queryResult,
        originalExtensions?.dataConnect
      );

      await this.updateLocalFromCallbacks(
        key,
        queryResult,
        updatedKeys,
        queryResult.fetchTime
      );

      if (coordinator && coordinator.isLeader) {
        coordinator.broadcastMessage({
          type: 'Cache Update',
          leaderId: coordinator.myClientId,
          updatedKeys,
          fetchTime: Number(queryResult.fetchTime)
        });
      }

      return queryResult;
    } catch (e: any) {
      // Fallback gracefully to InMemoryCacheProvider on Quota, incognito restrictions or lease revocations
      if (
        e &&
        (e.name === 'QuotaExceededError' ||
          e.name === 'SecurityError' ||
          e.message?.includes('revoked') ||
          e.message?.includes('Leadership'))
      ) {
        const coordinator = this.getCoordinator();
        if (coordinator) {
          coordinator.demote();
        }
        if (this.cache) {
          (this.cache as any).cacheProvider = new InMemoryCacheProvider(
            Math.random().toString()
          );
        }
        return this.fetchServerResults(queryRef);
      }
      this.publishErrorToSubscribers(key, e);
      throw e;
    }
  }

  async fetchCacheResults<Data, Variables>(
    queryRef: QueryRef<Data, Variables>,
    allowStale = false
  ): Promise<QueryResult<Data, Variables>> {
    await this.waitForQueuedWrites();
    let result: QueryResult<Data, Variables> | undefined | null;
    if (!this.cache) {
      result = await this.getFromSubscriberCache(queryRef);
    } else {
      result = await this.getFromResultTreeCache(queryRef, allowStale);
    }
    if (!result) {
      throw new DataConnectError(
        Code.OTHER,
        'No cache entry found for query: ' + queryRef.name
      );
    }
    const fetchTime = Date.now().toString();
    const queryResult: QueryResult<Data, Variables> = {
      ...result,
      ref: queryRef,
      source: SOURCE_CACHE,
      fetchTime,
      data: result.data,
      extensions: result.extensions,
      toJSON: getRefSerializer(queryRef, result.data, SOURCE_CACHE, fetchTime)
    };
    if (this.cache) {
      const key = encoderImpl({
        name: queryRef.name,
        variables: queryRef.variables,
        refType: QUERY_STR
      });
      await this.publishCacheResultsToSubscribers([key], fetchTime);
    } else {
      const key = encoderImpl({
        name: queryRef.name,
        variables: queryRef.variables,
        refType: QUERY_STR
      });
      this.subscriptionCache.set(key, queryResult);
      this.publishDataToSubscribers(key, queryResult);
    }

    return queryResult;
  }

  publishErrorToSubscribers(key: string, err: unknown): void {
    this.callbacks.get(key)?.forEach(subscription => {
      if (subscription.errCallback) {
        subscription.errCallback(err as DataConnectError);
      }
    });
  }

  async getFromResultTreeCache<Data, Variables>(
    queryRef: QueryRef<Data, Variables>,
    allowStale = false
  ): Promise<QueryResult<Data, Variables> | null> {
    const key = encoderImpl({
      name: queryRef.name,
      variables: queryRef.variables,
      refType: QUERY_STR
    });
    if (!this.cache || !(await this.cache.containsResultTree(key))) {
      return null;
    }
    const cacheResult: Data = (await this.cache!.getResultJSON(key)) as Data;
    const resultTree = await this.cache!.getResultTree(key);
    if (!allowStale && resultTree!.isStale()) {
      return null;
    }
    const result: QueryResult<Data, Variables> = {
      source: SOURCE_CACHE,
      ref: queryRef,
      data: cacheResult,
      toJSON: getRefSerializer(
        queryRef,
        cacheResult,
        SOURCE_CACHE,
        resultTree!.cachedAt.toString()
      ),
      fetchTime: resultTree!.cachedAt.toString()
    };
    (await this.cache!.getResultTree(key))!.updateAccessed();
    return result;
  }

  async getFromSubscriberCache<Data, Variables>(
    queryRef: QueryRef<Data, Variables>
  ): Promise<QueryResult<Data, Variables> | undefined> {
    const key = encoderImpl({
      name: queryRef.name,
      variables: queryRef.variables,
      refType: QUERY_STR
    });
    if (!this.subscriptionCache.has(key)) {
      return;
    }
    const result = this.subscriptionCache.get(key);
    result!.source = SOURCE_CACHE;
    result!.toJSON = getRefSerializer(
      result!.ref,
      result!.data,
      SOURCE_CACHE,
      result!.fetchTime
    );
    return result as QueryResult<Data, Variables>;
  }

  /** Call the registered onNext callbacks for the given key */
  publishDataToSubscribers(
    key: string,
    queryResult: QueryResult<unknown, unknown>
  ): void {
    if (!this.callbacks.has(key)) {
      return;
    }
    const subscribers = this.callbacks.get(key);
    subscribers!.forEach(callback => {
      callback.userCallback(queryResult);
    });
  }

  async publishCacheResultsToSubscribers(
    impactedQueries: string[],
    fetchTime: string
  ): Promise<void> {
    if (!this.cache) {
      return;
    }
    for (const query of impactedQueries) {
      const callbacks = this.callbacks.get(query);
      if (!callbacks) {
        continue;
      }
      const newJson = (await this.cache.getResultTree(query))!
        .getRootStub()
        .toJSON(EncodingMode.hydrated);
      const { name, variables } = decoderImpl(query) as unknown as QueryRef<
        unknown,
        unknown
      >;
      const queryRef: QueryRef<unknown, unknown> = {
        dataConnect: this.dc,
        refType: QUERY_STR,
        name,
        variables
      };
      this.publishDataToSubscribers(query, {
        data: newJson,
        fetchTime,
        ref: queryRef,
        source: SOURCE_CACHE,
        toJSON: getRefSerializer(queryRef, newJson, SOURCE_CACHE, fetchTime)
      });
    }
  }

  enableEmulator(host: string, port: number): void {
    this.transport.useEmulator(host, port);
  }

  private serverNetworkSubscribe<Data, Variables>(
    queryRef: QueryRef<Data, Variables>
  ): void {
    this.transport.invokeSubscribe<Data, Variables>(
      this.makeSubscribeObserver(queryRef),
      queryRef.name,
      queryRef.variables
    );
  }

  private serverNetworkUnsubscribe(
    queryRef: QueryRef<unknown, unknown>
  ): void {
    this.transport.invokeUnsubscribe(queryRef.name, queryRef.variables);
  }

  /**
   * Create a new {@link SubscribeObserver} for the given QueryRef.
   */
  private makeSubscribeObserver<Data, Variables>(
    queryRef: QueryRef<Data, Variables>
  ): SubscribeObserver<Data> {
    const key = encoderImpl({
      name: queryRef.name,
      variables: queryRef.variables,
      refType: QUERY_STR
    });
    return {
      onData: async response => {
        await this.handleStreamNotification(key, response, queryRef);
      },
      onDisconnect: (code, reason) => {
        this.handleStreamDisconnect(key, code, reason);
      },
      onError: error => {
        this.publishErrorToSubscribers(key, error);
      }
    };
  }

  /**
   * Parses updates from stream network notifications.
   */
  private parseStreamResponse<Data, Variables>(
    key: string,
    response: DataConnectResponse<Data>,
    queryRef: QueryRef<Data, Variables>
  ): QueryResult<Data, Variables> | null {
    if (response.errors && response.errors.length > 0) {
      const stringified = JSON.stringify(
        response.errors.map(e => {
          if (e && typeof e === 'object') {
            return {
              message: (e as unknown as { message: string }).message,
              code: (e as unknown as { code?: unknown }).code
            };
          }
          return e;
        })
      );
      const failureResponse: DataConnectOperationFailureResponse = {
        errors: response.errors as [],
        data: response.data as Record<string, unknown>
      };
      const error = new DataConnectOperationError(
        'DataConnect error received from subscribe notification: ' +
          stringified,
        failureResponse
      );
      this.publishErrorToSubscribers(key, error);
      return null;
    }

    const fetchTime = Date.now().toString();
    return {
      ref: queryRef,
      source: SOURCE_SERVER,
      fetchTime,
      data: response.data,
      extensions: getDataConnectExtensionsWithoutMaxAge(response.extensions),
      toJSON: getRefSerializer(
        queryRef,
        response.data,
        SOURCE_SERVER,
        fetchTime
      ),
      _originalExtensions: response.extensions
    } as any;
  }

  /**
   * Handles incoming updates from background socket streams.
   */
  private async handleStreamNotification<Data, Variables>(
    key: string,
    response: DataConnectResponse<Data>,
    queryRef: QueryRef<Data, Variables>
  ): Promise<void> {
    const queryResult = this.parseStreamResponse(key, response, queryRef);
    if (!queryResult) {
      return;
    }
    const originalExtensions = (queryResult as any)._originalExtensions;
    const updatedKeys = await this.writeToCache(
      key,
      queryResult,
      originalExtensions?.dataConnect
    );
    await this.updateLocalFromCallbacks(
      key,
      queryResult,
      updatedKeys,
      queryResult.fetchTime
    );

    const coordinator = this.getCoordinator();
    if (coordinator && coordinator.isLeader) {
      coordinator.broadcastMessage({
        type: 'Cache Update',
        leaderId: coordinator.myClientId,
        updatedKeys,
        fetchTime: Number(queryResult.fetchTime)
      });
    }
  }

  private handleStreamDisconnect(
    key: string,
    code: string,
    reason: string
  ): void {
    const error = new DataConnectError(code as Code, reason);
    this.publishErrorToSubscribers(key, error);

    const callbacks = this.callbacks.get(key);
    if (callbacks) {
      [...callbacks].forEach(cb => cb.unsubscribe());
    }
    return;
  }
}

export function getMaxAgeFromExtensions(
  extensions: DataConnectExtensionWithMaxAge[] | undefined
): number | undefined {
  if (!extensions) {
    return;
  }
  for (const extension of extensions) {
    if (
      'maxAge' in extension &&
      extension.maxAge !== undefined &&
      extension.maxAge !== null
    ) {
      if (extension.maxAge.endsWith('s')) {
        return Number(
          extension.maxAge.substring(0, extension.maxAge.length - 1)
        );
      }
    }
  }
}

function getDataConnectExtensionsWithoutMaxAge(
  extensions: ExtensionsWithMaxAge | undefined
): Extensions | undefined {
  if (!extensions) {
    return;
  }
  return {
    dataConnect: extensions.dataConnect?.filter(
      extension => 'entityId' in extension || 'entityIds' in extension
    )
  };
}
