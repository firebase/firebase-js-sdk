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
import { logDebug } from '../../logger';
import { DataConnectTransport, Extensions } from '../../network';
import {
  DataConnectExtensionWithMaxAge,
  ExtensionsWithMaxAge
} from '../../network/transport';
import { decoderImpl, encoderImpl } from '../../util/encoder';
import { Code, DataConnectError } from '../error';

import {
  OnCompleteSubscription,
  OnErrorSubscription,
  OnResultSubscription
} from './subscribe';

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

export class QueryManager {
  async preferCacheResults<Data, Variables>(
    queryRef: QueryRef<Data, Variables>,
    allowStale = false
  ): Promise<QueryResult<Data, Variables>> {
    try {
      const cacheResult = await this.fetchCacheResults(queryRef, allowStale);
      return cacheResult;
    } catch {
      return this.fetchServerResults(queryRef);
    }
  }
  private callbacks = new Map<
    string,
    Array<DataConnectSubscription<unknown, unknown>>
  >();
  private subscriptionCache = new Map<string, QueryResult<unknown, unknown>>();
  constructor(
    private transport: DataConnectTransport,
    private dc: DataConnect,
    private cache?: DataConnectCache
  ) {}
  private queue: Array<Promise<unknown>> = [];
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
        this.callbacks.set(
          key,
          callbackList.filter(callback => callback !== subscription)
        );
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

    logDebug(
      `Cache not available for query ${
        queryRef.name
      } with variables ${JSON.stringify(
        queryRef.variables
      )}. Calling executeQuery.`
    );
    const promise = this.preferCacheResults(queryRef, /*allowStale=*/ true);
    // We want to ignore the error and let subscriptions handle it
    promise.then(undefined, err => {});

    if (!this.callbacks.has(key)) {
      this.callbacks.set(key, []);
    }
    this.callbacks
      .get(key)!
      .push(subscription as DataConnectSubscription<unknown, unknown>);

    return unsubscribe;
  }

  async fetchServerResults<Data, Variables>(
    queryRef: QueryRef<Data, Variables>
  ): Promise<QueryResult<Data, Variables>> {
    await this.waitForQueuedWrites();
    const key = encoderImpl({
      name: queryRef.name,
      variables: queryRef.variables,
      refType: QUERY_STR
    });
    try {
      const result = await this.transport.invokeQuery<Data, Variables>(
        queryRef.name,
        queryRef.variables
      );
      const fetchTime = Date.now().toString();
      const originalExtensions = result.extensions;
      const queryResult: QueryResult<Data, Variables> = {
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
        )
      };
      const updatedKeys = await this.updateCache(
        queryResult,
        originalExtensions?.dataConnect
      );
      if (this.cache) {
        await this.publishCacheResultsToSubscribers(updatedKeys, fetchTime);
      } else {
        this.subscriptionCache.set(key, queryResult);
        this.publishDataToSubscribers(key, queryResult);
      }
      return queryResult;
    } catch (e) {
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
        fetchTime: new Date().toISOString(),
        ref: queryRef,
        source: SOURCE_CACHE,
        toJSON: getRefSerializer(queryRef, newJson, SOURCE_CACHE, fetchTime)
      });
    }
  }
  enableEmulator(host: string, port: number): void {
    this.transport.useEmulator(host, port);
  }
}

export function getMaxAgeFromExtensions(
  extensions: DataConnectExtensionWithMaxAge[] | undefined
): number | undefined {
  if (!extensions) {
    return;
  }
  for (const extension of extensions) {
    if ('maxAge' in extension && extension.maxAge !== undefined) {
      if (extension.maxAge.endsWith('s')) {
        return Number(
          extension.maxAge.substring(0, extension.maxAge.length - 1)
        );
      }
    }
  }
}
function getDataConnectExtensionsWithoutMaxAge(
  extensions: ExtensionsWithMaxAge
): Extensions | undefined {
  return {
    dataConnect: extensions.dataConnect?.filter(
      extension => 'entityId' in extension || 'entityIds' in extension
    )
  };
}
