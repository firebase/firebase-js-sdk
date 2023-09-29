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
  QueryStr,
  OpResult,
  SerializedRef,
  SOURCE_SERVER,
  DataSource,
  SOURCE_CACHE
} from '../api/Reference';
import { DataConnectTransport } from '../network';
import { encoderImpl } from '../util/encoder';
import { setIfNotExists } from '../util/map';
import { DataConnectError } from './error';

interface TrackedQuery<Response, Variables> {
  ref: Omit<OperationRef<Response, Variables>, 'dataConnect'>;
  subscriptions: Array<DataConnectSubscription<Response, Variables>>;
  currentCache: OpResult<Response> | null;
  lastError: DataConnectError | null;
}

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
  _queries: Map<string, TrackedQuery<unknown, unknown>>;
  constructor(private transport: DataConnectTransport) {
    this._queries = new Map();
  }
  track<Response, Variables>(
    queryName: string,
    variables: Variables,
    initialCache?: OpResult<Response>
  ) {
    const ref: TrackedQuery<Response, Variables>['ref'] = {
      name: queryName,
      variables,
      refType: QueryStr
    };
    const key = encoderImpl(ref);
    const newTrackedQuery: TrackedQuery<Response, Variables> = {
      ref,
      subscriptions: [],
      currentCache: initialCache || null,
      lastError: null
    };
    // @ts-ignore
    setIfNotExists(this._queries, key, newTrackedQuery);
    return this._queries.get(key);
  }
  addSubscription<Response, Variables>(
    queryRef: OperationRef<Response, Variables>,
    onResultCallback: OnResultSubscription<Response, Variables>,
    onErrorCallback?: OnErrorSubscription,
    initialCache?: OpResult<Response>
  ) {
    const key = encoderImpl({
      name: queryRef.name,
      variables: queryRef.variables,
      refType: QueryStr
    });
    const trackedQuery = this._queries.get(key) as TrackedQuery<
      Response,
      Variables
    >;
    const subscription = {
      userCallback: onResultCallback,
      errCallback: onErrorCallback
    };
    const unsubscribe = () => {
      const trackedQuery = this._queries.get(key)!;
      trackedQuery.subscriptions = trackedQuery.subscriptions.filter(
        sub => sub !== subscription
      );
    };
    if (initialCache && trackedQuery.currentCache !== initialCache) {
      if (
        !trackedQuery.currentCache ||
        (trackedQuery.currentCache &&
          compareDates(
            trackedQuery.currentCache.fetchTime,
            initialCache.fetchTime
          ))
      ) {
        trackedQuery.currentCache = initialCache;
      }
    }
    if (trackedQuery.currentCache !== null) {
      const cachedData = trackedQuery.currentCache.data;
      onResultCallback({
        data: cachedData,
        source: SOURCE_CACHE,
        ref: queryRef as QueryRef<Response, Variables>,
        toJSON: getRefSerializer(
          queryRef as QueryRef<Response, Variables>,
          trackedQuery.currentCache.data,
          SOURCE_CACHE
        ),
        fetchTime: trackedQuery.currentCache.fetchTime
      });
      if (trackedQuery.lastError !== null && onErrorCallback) {
        onErrorCallback(undefined);
      }
    }

    trackedQuery.subscriptions.push({
      userCallback: onResultCallback,
      errCallback: onErrorCallback,
      unsubscribe
    });
    if (!trackedQuery.currentCache) {
      const promise = this.executeQuery(
        queryRef as QueryRef<Response, Variables>
      );
      // We want to ignore the error and let subscriptions handle it
      promise.then(undefined, err => {});
    }
    return unsubscribe;
  }
  executeQuery<Response, Variables>(
    queryRef: QueryRef<Response, Variables>
  ): QueryPromise<Response, Variables> {
    const key = encoderImpl({
      name: queryRef.name,
      variables: queryRef.variables,
      refType: QueryStr
    });
    const trackedQuery = this._queries.get(key)!;
    const result = this.transport.invokeQuery<Response, Variables>(
      queryRef.name,
      queryRef.variables
    );
    const newR = result.then(
      res => {
        const fetchTime = new Date().toString();
        const result: QueryResult<Response, Variables> = {
          ...res,
          source: SOURCE_SERVER,
          ref: queryRef,
          toJSON: getRefSerializer(queryRef, res.data, SOURCE_SERVER),
          fetchTime
        };
        trackedQuery.subscriptions.forEach(subscription => {
          subscription.userCallback(result);
        });
        trackedQuery.currentCache = {
          data: res.data,
          source: SOURCE_CACHE,
          fetchTime
        };
        return result;
      },
      err => {
        trackedQuery.lastError = err;
        trackedQuery.subscriptions.forEach(subscription => {
          if (subscription.errCallback) {
            subscription.errCallback(err);
          }
        });
        throw err;
      }
    );

    return newR;
  }
  enableEmulator(host: string, port: number) {
    this.transport.useEmulator(host, port);
  }
}
function compareDates(str1: string, str2: string) {
  const date1 = new Date(str1);
  const date2 = new Date(str2);
  return date1.getTime() < date2.getTime();
}
