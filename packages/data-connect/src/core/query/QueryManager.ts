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
  OperationRef,
  QUERY_STR,
  SerializedRef,
  SOURCE_SERVER,
  DataSource,
  SOURCE_CACHE,
  OpResult
} from '../../api/Reference';
import { DataConnectSubscription } from '../../api.browser';
import { DataConnectCache, ServerValues } from '../../cache/Cache';
import { logDebug } from '../../logger';
import { DataConnectExtension, DataConnectTransport } from '../../network';
import { decoderImpl, encoderImpl } from '../../util/encoder';
import { Code, DataConnectError } from '../error';

import { ExecuteQueryOptions, QueryFetchPolicy } from './queryOptions';
import {
  OnCompleteSubscription,
  OnErrorSubscription,
  OnResultSubscription
} from './subscribe';

export function getRefSerializer<Data, Variables>(
  queryRef: QueryRef<Data, Variables>,
  data: Data,
  source: DataSource
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
      fetchTime: Date.now().toLocaleString(), // TODO: Fix the fetch time here.
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
        this.publishCacheResultsToSubscribers(result)
      )
    );
  }

  async updateCache<Data, Variables>(
    result: QueryResult<Data, Variables>
  ): Promise<string[]> {
    await this.waitForQueuedWrites();
    if (this.cache) {
      const entityIds = parseEntityIds(result);
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
    queryRef: OperationRef<Data, Variables>,
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
  async loadCache<Data, Variables>(
    queryRef: QueryRef<Data, Variables>,
    cachingEnabled: boolean,
    options?: ExecuteQueryOptions
  ): Promise<QueryResult<Data, Variables> | null> {
    const key = encoderImpl({
      name: queryRef.name,
      variables: queryRef.variables,
      refType: QUERY_STR
    });
    if (!cachingEnabled) {
      const cachedData = this.subscriptionCache.get(key) as QueryResult<
        Data,
        Variables
      >;
      if (cachedData) {
        this.publishDataToSubscribers(key, {
          data: cachedData.data,
          fetchTime: cachedData.fetchTime,
          ref: cachedData.ref,
          source: SOURCE_CACHE,
          toJSON: getRefSerializer(
            cachedData.ref,
            cachedData.data,
            SOURCE_CACHE
          )
        });
        return cachedData;
      }
    }
    if (
      options?.fetchPolicy !== QueryFetchPolicy.SERVER_ONLY &&
      cachingEnabled &&
      (await this.cache!.containsResultTree(key)) &&
      !(await this.cache!.getResultTree(key))!.isStale()
    ) {
      const cacheResult: Data = JSON.parse(
        await this.cache!.getResultJSON(key)
      );
      const resultTree = await this.cache!.getResultTree(key);
      const result: QueryResult<Data, Variables> = {
        source: SOURCE_CACHE,
        ref: queryRef,
        data: cacheResult,
        toJSON: getRefSerializer(queryRef, cacheResult, SOURCE_CACHE),
        fetchTime: resultTree!.cachedAt.toString()
      };
      (await this.cache!.getResultTree(key))!.updateAccessed();
      logDebug(
        `Cache found for query ${queryRef.name} with variables ${JSON.stringify(
          queryRef.variables
        )}. Calling executeQuery`
      );
      return result;
    } else {
      if (options?.fetchPolicy === QueryFetchPolicy.SERVER_ONLY) {
        logDebug(`Skipping cache for fetch policy "serverOnly"`);
      } else {
        logDebug(
          `No Cache found for query ${
            queryRef.name
          } with variables ${JSON.stringify(
            queryRef.variables
          )}. Calling executeQuery`
        );
      }
    }
    return null;
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
      if (!cachingEnabled) {
        // read from subscriber cache.
        const fromSubscriberCache = await this.getFromSubscriberCache(key);
        if (!fromSubscriberCache) {
          shouldExecute = true;
        }
        queryResult = fromSubscriberCache as QueryResult<Data, Variables>;
      } else {
        if (!this.cache?.containsResultTree(key)) {
          shouldExecute = true;
        } else {
          queryResult = await this.getFromResultTreeCache(key, queryRef);
        }
      }
    }
    let impactedQueries: string[] = [key];
    if (shouldExecute) {
      try {
        const response = await this.transport.invokeQuery<Data, Variables>(
          queryRef.name,
          queryRef.variables
        );
        queryResult = {
          data: response.data,
          fetchTime: new Date().toISOString(),
          ref: queryRef,
          source: SOURCE_SERVER,
          extensions: response.extensions,
          toJSON: getRefSerializer(queryRef, response.data, SOURCE_SERVER)
        };
        impactedQueries = await this.updateCache(queryResult);
      } catch (e: unknown) {
        this.publishErrorToSubscribers(key, e);
        throw e;
      }
    }
    if (!cachingEnabled) {
      this.subscriptionCache.set(key, queryResult!);
      this.publishDataToSubscribers(key, queryResult!);
    } else {
      await this.publishCacheResultsToSubscribers(impactedQueries);
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
    const cacheResult: Data = JSON.parse(await this.cache!.getResultJSON(key));
    const resultTree = await this.cache!.getResultTree(key);
    const result: QueryResult<Data, Variables> = {
      source: SOURCE_CACHE,
      ref: queryRef,
      data: cacheResult,
      toJSON: getRefSerializer(queryRef, cacheResult, SOURCE_CACHE),
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
    result!.toJSON = getRefSerializer(result!.ref, result!.data, SOURCE_CACHE);
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
    impactedQueries: string[]
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
        .toJson();
      const { name, variables } = decoderImpl(query) as QueryRef<
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
        toJSON: getRefSerializer(queryRef, newJson, SOURCE_CACHE)
      });
    }
  }
  enableEmulator(host: string, port: number): void {
    this.transport.useEmulator(host, port);
  }
}

// TODO: Move this to its own file
// TODO: Make this return a Record<string, unknown>, and use this as a lookup table for entity ids
export function parseEntityIds<T>(
  result: OpResult<T>
): Record<string, unknown> {
  // Iterate through extensions.dataConnect
  const dataConnectExtensions = result.extensions?.dataConnect;
  const dataCopy = Object.assign(result);
  if (!dataConnectExtensions) {
    return dataCopy;
  }
  const ret: Record<string, unknown> = {};
  for (const extension of dataConnectExtensions) {
    const { path } = extension;
    populatePath(path, ret, extension);
  }
  return ret;
}

// TODO: Only enable this if clientCache.includeEntityId is true
// mutates the object to update the path
export function populatePath(
  path: Array<string | number>,
  toUpdate: Record<string | number, unknown>,
  extension: DataConnectExtension
): void {
  let curObj: Record<string | number, unknown> = toUpdate;
  for (const slice of path) {
    if (typeof curObj[slice] !== 'object') {
      curObj[slice] = {};
    }
    curObj = curObj[slice] as Record<string, unknown>;
  }

  if ('entityId' in extension) {
    curObj['_id'] = extension.entityId;
  } else {
    const entityArr = extension.entityIds;
    for (let i = 0; i < entityArr.length; i++) {
      const entityId = entityArr[i];
      if (typeof curObj[i] === 'undefined') {
        curObj[i] = {};
      }
      (curObj[i] as Record<string, unknown>)._id = entityId;
    }
  }
}
