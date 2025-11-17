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
import { DataConnectTransport } from '../../network';
import { decoderImpl, encoderImpl } from '../../util/encoder';
import { Code, DataConnectError } from '../error';

import { ExecuteQueryOptions, QueryFetchPolicy } from './queryOptions';
import { OnErrorSubscription, OnResultSubscription } from './subscribe';

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
  private callbacks = new Map<
    string,
    Array<DataConnectSubscription<unknown, unknown>>
  >();
  constructor(
    private transport: DataConnectTransport,
    private cache: DataConnectCache,
    private dc: DataConnect
  ) {}
  private queue: Array<Promise<unknown>> = [];
  async waitForQueuedWrites(): Promise<void> {
    for (const promise of this.queue) {
      await promise;
    }
    this.queue = [];
  }

  updateSSR(updatedData: QueryResult<unknown, unknown>): void {
    // What about two different values overriding each other?
    this.queue.push(this.updateCache(updatedData)
      .then(async result =>
        this.publishCacheResultsToSubscribers(result)
      ));
  }

  updateCache<Data, Variables>(
    result: QueryResult<Data, Variables>
  ): Promise<string[]> {
    return this.cache.update(
      encoderImpl({
        name: result.ref.name,
        variables: result.ref.variables,
        refType: QUERY_STR
      }),
      result.data as ServerValues
    );
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
      if (!this.callbacks.has(key)) {
        const callbackList = this.callbacks.get(key)!;
        callbackList.forEach(subscription => {
          subscription.unsubscribe();
        });
        this.callbacks.set(key, []);
      }
    };

    if (initialCache) {
      // TODO: The type might be wrong here
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
    this.callbacks.get(key)!.push({
      userCallback: onResultCallback,
      errCallback: onErrorCallback,
      unsubscribe
    });

    return unsubscribe;
  }
  async executeQuery<Data, Variables>(
    queryRef: QueryRef<Data, Variables>,
    options?: ExecuteQueryOptions
  ): Promise<QueryResult<Data, Variables>> {
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
    // TODO: It seems like the cache isn't loading the data correctly.
    // TODO: It seems like cache loading is async. That needs to be fixed.
    if (
      options?.fetchPolicy !== QueryFetchPolicy.SERVER_ONLY &&
      (await this.cache.containsResultTree(key)) &&
      !(await this.cache.getResultTree(key)).isStale()
    ) {
      const cacheResult: Data = JSON.parse(await this.cache.getResultJSON(key));
      const result: QueryResult<Data, Variables> = {
        ...cacheResult,
        source: SOURCE_CACHE,
        ref: queryRef,
        data: cacheResult,
        toJSON: getRefSerializer(queryRef, cacheResult, SOURCE_CACHE),
        fetchTime: new Date().toISOString()
      };
      (await this.cache.getResultTree(key)).updateAccessed();
      logDebug(
          `Cache found for query ${
            queryRef.name
          } with variables ${JSON.stringify(
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
    try {
      const res = await this.transport.invokeQuery<Data, Variables>(
        queryRef.name,
        queryRef.variables
      );
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
      if (await this.cache.containsResultTree(key)) {
        (await this.cache.getResultTree(key)).updateAccessed();
      }
      const impactedQueries = await this.cache.update(
        key,
        result.data as ServerValues
      );
      await this.publishCacheResultsToSubscribers(impactedQueries);
      return result;
    } catch (err) {
      this.callbacks.get(key)?.forEach(subscription => {
        if (subscription.errCallback) {
          subscription.errCallback(err);
        }
      });
      throw err;
    }
  }
  async publishCacheResultsToSubscribers(
    impactedQueries: string[]
  ): Promise<void> {
    for (const query of impactedQueries) {
      const callbacks = this.callbacks.get(query);
      if (!callbacks) {
        continue;
      }
      const newJson = (await this.cache.getResultTree(query))
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

      callbacks.forEach(callback => {
        callback.userCallback({
          data: newJson,
          fetchTime: new Date().toISOString(),
          source: SOURCE_CACHE,
          ref: queryRef
        } as QueryResult<unknown, unknown>);
      });
    }
  }
  enableEmulator(host: string, port: number): void {
    this.transport.useEmulator(host, port);
  }
}
