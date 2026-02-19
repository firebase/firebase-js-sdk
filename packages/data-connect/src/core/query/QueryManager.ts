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
import { InternalQueryResult, QueryRef, QueryResult } from '../../api/query';
import {
  OperationRef,
  QUERY_STR,
  SerializedRef,
  SOURCE_SERVER,
  DataSource,
  SOURCE_CACHE
} from '../../api/Reference';
import { DataConnectSubscription } from '../../api.browser';
import { DataConnectCache, ServerValues } from '../../cache/Cache';
import { EncodingMode } from '../../cache/EntityNode';
import { logDebug } from '../../logger';
import { DataConnectExtension, DataConnectTransport, Extensions } from '../../network';
import { decoderImpl, encoderImpl } from '../../util/encoder';
import { Code, DataConnectError } from '../error';

import { ExecuteQueryOptions, QueryFetchPolicy } from './queryOptions';
import {
  OnCompleteSubscription,
  OnErrorSubscription,
  OnResultSubscription
} from './subscribe';
import { parseEntityIds } from '../../cache/cacheUtils';
import { DataConnectExtensionWithMaxAge, ExtensionsWithMaxAge } from '../../network/transport';

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
      // TODO: Check if the path is empty, then we should check for properties like maxAge.
      const updatedMaxAge = getMaxAgeFromExtensions(
        extensions
      );
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
    const promise = this.maybeExecuteQuery(
      queryRef as QueryRef<Data, Variables>
    );
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
  async maybeExecuteQuery<Data, Variables>(
    queryRef: QueryRef<Data, Variables>,
    options?: ExecuteQueryOptions
  ): Promise<QueryResult<Data, Variables>> {
    await this.waitForQueuedWrites();
    if (queryRef.refType !== QUERY_STR) {
      throw new DataConnectError(
        Code.INVALID_ARGUMENT,
        `ExecuteQuery can only execute query operations`
      );
    }
    let queryResult: QueryResult<Data, Variables> | undefined;
    const cachingEnabled = this.cache && !!this.cache.cacheSettings;
    let shouldExecute = false;
    const key = encoderImpl({
      name: queryRef.name,
      variables: queryRef.variables,
      refType: QUERY_STR
    });
    if (options?.fetchPolicy === QueryFetchPolicy.SERVER_ONLY) {
      // definitely execute query
      // queryResult = await this.executeQuery(queryRef, options);
      shouldExecute = true;
    } else {
      if (cachingEnabled) {
        if (
          !(await this.cache?.containsResultTree(key)) ||
          (await this.cache?.getResultTree(key))!.isStale()
        ) {
          shouldExecute = true;
        } else {
          queryResult = await this.getFromResultTreeCache(key, queryRef);
        }
      } else {
        // read from subscriber cache.
        const fromSubscriberCache = await this.getFromSubscriberCache(key);
        if (!fromSubscriberCache) {
          shouldExecute = true;
        }
        queryResult = fromSubscriberCache as QueryResult<Data, Variables>;
      }
    }
    let impactedQueries: string[] = [key];
    if (shouldExecute) {
      try {
        const response = await this.transport.invokeQuery<Data, Variables>(
          queryRef.name,
          queryRef.variables
        );
        const fetchTime = new Date().toISOString();
        queryResult = {
          data: response.data,
          fetchTime,
          ref: queryRef,
          source: SOURCE_SERVER,
          extensions: getDataConnectExtensionsWithoutMaxAge(response.extensions),
          toJSON: getRefSerializer(
            queryRef,
            response.data,
            SOURCE_SERVER,
            fetchTime
          )
        };
        impactedQueries = await this.updateCache(queryResult, response.extensions.dataConnect);
      } catch (e: unknown) {
        this.publishErrorToSubscribers(key, e);
        throw e;
      }
    }
    if (cachingEnabled) {
      await this.publishCacheResultsToSubscribers(
        impactedQueries,
        queryResult!.fetchTime
      );
    } else {
      this.subscriptionCache.set(key, queryResult!);
      this.publishDataToSubscribers(key, queryResult!);
    }
    return queryResult!;
  }
  publishErrorToSubscribers(key: string, err: unknown): void {
    this.callbacks.get(key)?.forEach(subscription => {
      if (subscription.errCallback) {
        subscription.errCallback(err as DataConnectError);
      }
    });
  }
  async getFromResultTreeCache<Data, Variables>(
    key: string,
    queryRef: QueryRef<Data, Variables>
  ): Promise<QueryResult<Data, Variables>> {
    const cacheResult: Data = (await this.cache!.getResultJSON(key)) as Data;
    const resultTree = await this.cache!.getResultTree(key);
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
  async getFromSubscriberCache(
    key: string
  ): Promise<QueryResult<unknown, unknown> | undefined> {
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
    return result;
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
        return parseInt(
          extension.maxAge.substring(0, extension.maxAge.length - 1)
        );
      }
      return parseInt(extension.maxAge);
    }
  }
}
function getDataConnectExtensionsWithoutMaxAge(extensions: ExtensionsWithMaxAge): Extensions | undefined {
  return {
    dataConnect: extensions.dataConnect?.filter(extension => 'entityId' in extension || 'entityIds' in extension)
  }
}

