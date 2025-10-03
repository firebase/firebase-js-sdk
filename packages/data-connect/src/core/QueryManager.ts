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

import {
  DataConnectSubscription,
  OnErrorSubscription,
  OnResultSubscription,
  QueryPromise,
  QueryRef,
  QueryResult
} from '../api/query';
import {
  OperationRef,
  QUERY_STR,
  OpResult,
  SerializedRef,
  SOURCE_SERVER,
  DataSource,
  SOURCE_CACHE
} from '../api/Reference';
import { logDebug } from '../logger';
import { DataConnectTransport } from '../network';
import { encoderImpl } from '../util/encoder';
import { Cache as DataConnectCache, ServerValues } from '../cache/Cache';

import { Code, DataConnectError } from './error';

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
      fetchTime: Date.now().toLocaleString(),
      source
    };
  };
}

export class QueryManager {
  // _queries: Map<string, TrackedQuery<unknown, unknown>>;
  private callbacks = new Map<
    string,
    DataConnectSubscription<unknown, unknown>[]
  >();
  constructor(
    private transport: DataConnectTransport,
    private cache: DataConnectCache
  ) {}

  updateCache<Data, Variables>(
    queryName: string,
    variables: unknown,
    result: QueryResult<Data, Variables>
  ) {
    this.cache.update(
      encoderImpl({
        name: queryName,
        variables,
        refType: QUERY_STR
      }),
      result.data as ServerValues
    );
    console.log('updated cache!');
  }

  addSubscription<Data, Variables>(
    queryRef: OperationRef<Data, Variables>,
    onResultCallback: OnResultSubscription<Data, Variables>,
    onErrorCallback?: OnErrorSubscription,
    initialCache?: OpResult<Data>
  ): () => void {
    const key = encoderImpl({
      name: queryRef.name,
      variables: queryRef.variables,
      refType: QUERY_STR
    });
    const unsubscribe = (): void => {
      if(!this.callbacks.has(key)) {
        const callbackList = this.callbacks.get(key)!;
        callbackList.forEach(subscription => {
          subscription.unsubscribe();
        });
        this.callbacks.set(key, []);
      }
      
    };

    if (initialCache) {
      // TODO: The type might be wrong here
      this.cache.update(key, initialCache.data as ServerValues);
    }

    // TODO: How is the cache getting retrieved by the query?
    // Are we checking inside the CacheProvider for the TTL to see whether we should re-fetch?
    if (this.cache.containsResultTree(key)) {
      const cachedData = JSON.parse(this.cache.getResultJSON(key));
      onResultCallback({
        data: cachedData,
        source: SOURCE_CACHE,
        ref: queryRef as QueryRef<Data, Variables>,
        toJSON: getRefSerializer(
          queryRef as QueryRef<Data, Variables>,
          cachedData,
          SOURCE_CACHE
        ),
        // TODO: Update this to the right value
        // fetchTime: trackedQuery.currentCache.fetchTime
        fetchTime: new Date().toISOString()
      });
      // TODO: Handle lastError
      //   if (trackedQuery.lastError !== null && onErrorCallback) {
      //     onErrorCallback(undefined);
      //   }
    } else {
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
    }

    if (!this.callbacks.has(key)) {
      this.callbacks.set(key, []);
    }
    this.callbacks.get(key)!.push({
      userCallback: onResultCallback,
      errCallback: onErrorCallback,
      unsubscribe
    });

    return unsubscribe;
  }
  executeQuery<Data, Variables>(
    queryRef: QueryRef<Data, Variables>
  ): QueryPromise<Data, Variables> {
    if (queryRef.refType !== QUERY_STR) {
      throw new DataConnectError(
        Code.INVALID_ARGUMENT,
        `ExecuteQuery can only execute query operation`
      );
    }
    const key = encoderImpl({
      name: queryRef.name,
      variables: queryRef.variables,
      refType: QUERY_STR
    });
    // TODO: Check if the cache is stale
    if(this.cache.containsResultTree(key) && !this.cache.getResultTree(key).isStale()) {
      const cacheResult: Data = JSON.parse(this.cache.getResultJSON(key));
      const result: QueryResult<Data, Variables> = {
          ...cacheResult,
          source: SOURCE_CACHE,
          ref: queryRef,
          data: cacheResult,
          toJSON: getRefSerializer(queryRef, cacheResult, SOURCE_CACHE),
          fetchTime: new Date().toISOString()
        };
      this.cache.getResultTree(key).updateAccessed();

      return Promise.resolve(result);
    } else {
      logDebug(
        `No Cache found for query ${
          queryRef.name
        } with variables ${JSON.stringify(queryRef.variables)}. Calling executeQuery`
      );
    }
    const result = this.transport.invokeQuery<Data, Variables>(
      queryRef.name,
      queryRef.variables
    );
    const newR = result.then(
      res => {
        const fetchTime = new Date().toString();
        const result: QueryResult<Data, Variables> = {
          ...res,
          source: SOURCE_SERVER,
          ref: queryRef,
          toJSON: getRefSerializer(queryRef, res.data, SOURCE_SERVER),
          fetchTime
        };
        const subscribers = this.callbacks.get(key);
        if (subscribers !== undefined) {
          subscribers.forEach(subscription => {
            subscription.userCallback(result);
          });
        }
        // TODO: Fix servervalues type
        this.cache.getResultTree(key).updateAccessed();
        this.cache.update(key, result.data as ServerValues);
        return result;
      },
      err => {
        // TODO: Update cache with query's last error
        // trackedQuery.lastError = err;
        this.callbacks.get(key)?.forEach(subscription => {
          if (subscription.errCallback) {
            subscription.errCallback(err);
          }
        });
        throw err;
      }
    );

    return newR;
  }
  enableEmulator(host: string, port: number): void {
    this.transport.useEmulator(host, port);
  }
}
function compareDates(str1: string, str2: string): boolean {
  const date1 = new Date(str1);
  const date2 = new Date(str2);
  return date1.getTime() < date2.getTime();
}
