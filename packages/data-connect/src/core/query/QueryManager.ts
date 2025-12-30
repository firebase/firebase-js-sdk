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
  OpResult,
  SerializedRef,
  SOURCE_SERVER,
  DataSource,
  SOURCE_CACHE
} from '../../api/Reference';
import { DataConnectSubscription } from '../../api.browser';
import { DataConnectCache, ServerValues } from '../../cache/Cache';
import { logDebug } from '../../logger';
import {
  DataConnectExtension,
  DataConnectResponse,
  DataConnectTransport
} from '../../network';
import { decoderImpl, encoderImpl } from '../../util/encoder';
import { Code, DataConnectError } from '../error';

import { ExecuteQueryOptions, QueryFetchPolicy } from './queryOptions';
import {
  OnCompleteSubscription,
  OnErrorSubscription,
  OnResultSubscription
} from './subscribe';

function getRefSerializer<Data, Variables>(
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

  updateSSR(updatedData: QueryResult<unknown, unknown>): void {
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
      return this.cache.update(
        encoderImpl({
          name: result.ref.name,
          variables: result.ref.variables,
          refType: QUERY_STR
        }),
        result.data as ServerValues
      );
    } else {
      const key = encoderImpl({
        name: result.ref.name,
        variables: result.ref.variables,
        refType: QUERY_STR
      });
      this.subscriptionCache.set(key, result);
    }
    return [];
  }

  addSubscription<Data, Variables>(
    queryRef: OperationRef<Data, Variables>,
    onResultCallback: OnResultSubscription<Data, Variables>,
    onCompleteCallback?: OnCompleteSubscription,
    onErrorCallback?: OnErrorSubscription,
    initialCache?: OpResult<Data>
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
      this.updateSSR(initialCache as QueryResult<Data, Variables>);
    }

    logDebug(
      `Cache not available for query ${
        queryRef.name
      } with variables ${JSON.stringify(
        queryRef.variables
      )}. Calling executeQuery.`
    );
    const promise = this.executeQuery(queryRef as QueryRef<Data, Variables>);
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
  async executeQuery<Data, Variables>(
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
    const key = encoderImpl({
      name: queryRef.name,
      variables: queryRef.variables,
      refType: QUERY_STR
    });
    const cachingEnabled = this.cache && !!this.cache?.cacheSettings;
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
          toJSON: getRefSerializer(cachedData.ref, cachedData.data, SOURCE_CACHE)
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
      await this.publishCacheResultsToSubscribers([key]);

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
    try {
      const res = await this.transport.invokeQuery<Data, Variables>(
        queryRef.name,
        queryRef.variables
      );
      const fetchTime = new Date().toString();
      const result: QueryResult<Data, Variables> = {
        data: res.data,
        source: SOURCE_SERVER,
        ref: queryRef,
        toJSON: getRefSerializer(queryRef, res.data, SOURCE_SERVER),
        fetchTime
      };

      if (cachingEnabled && (await this.cache!.containsResultTree(key))) {
        (await this.cache!.getResultTree(key))!.updateAccessed();
      }
      if (cachingEnabled) {
        const parsedData = parseEntityIds(res);
        const impactedQueries = await this.cache!.update(
          key,
          parsedData as unknown as ServerValues
        );
        await this.publishCacheResultsToSubscribers(impactedQueries);
      } else {
        this.subscriptionCache.set(key, result);
        this.publishDataToSubscribers(key, result);
      }
      return result;
    } catch (err: unknown) {
      this.callbacks.get(key)?.forEach(subscription => {
        if (subscription.errCallback) {
          subscription.errCallback(err as DataConnectError);
        }
      });
      throw err;
    }
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

// TODO: Move into its own file
export function parseEntityIds<T>(
  data: DataConnectResponse<T>
): DataConnectResponse<T> {
  // Iterate through extensions.dataConnect
  const dataConnectExtensions = data.extensions.dataConnect;
  const dataCopy = Object.assign(data);
  if (!dataConnectExtensions) {
    return dataCopy;
  }
  for (const extension of dataConnectExtensions) {
    const { path } = extension;
    populatePath(path, dataCopy.data, extension);
  }
  return dataCopy;
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
    curObj = curObj[slice] as Record<string, unknown>; // TODO: This type can be fixed
  }
  if ('entityId' in extension) {
    curObj['_id'] = extension.entityId;
  } else {
    const entityArr = extension.entityIds;
    for (let i = 0; i < entityArr.length; i++) {
      const entityId = entityArr[i];
      (curObj[i] as Record<string, unknown>)._id = entityId;
    }
  }
}
