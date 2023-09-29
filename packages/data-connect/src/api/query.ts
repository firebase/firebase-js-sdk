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

import { DataConnectError } from '../core/error';
import { DataConnect, getDataConnect } from './DataConnect';
import {
  OperationRef,
  QueryStr,
  DataConnectResult,
  SerializedRef
} from './Reference';

export type OnResultSubscription<Data, Variables> = (
  res: QueryResult<Data, Variables>
) => void;
export type OnErrorSubscription = (err?: DataConnectError) => void;
export type QueryUnsubscribe = () => void;
export interface DataConnectSubscription<Data, Variables> {
  userCallback: OnResultSubscription<Data, Variables>;
  errCallback?: (e?: DataConnectError) => void;
  unsubscribe: () => void;
}
export interface QueryRef<Data, Variables>
  extends OperationRef<Data, Variables> {
  refType: typeof QueryStr;
}
export interface QueryResult<Data, Variables>
  extends DataConnectResult<Data, Variables> {
  ref: QueryRef<Data, Variables>;
  toJSON: () => SerializedRef<Data, Variables>;
}
export interface QueryPromise<Data, Variables>
  extends PromiseLike<QueryResult<Data, Variables>> {
  // reserved for special actions like cancellation
}

export function executeQuery<Data, Variables>(
  queryRef: QueryRef<Data, Variables>
): QueryPromise<Data, Variables> {
  return queryRef.dataConnect._queryManager.executeQuery(queryRef);
}

export function queryRef<Data>(
  dcInstance: DataConnect,
  queryName: string
): QueryRef<Data, undefined>;
export function queryRef<Data, Variables>(
  dcInstance: DataConnect,
  queryName: string,
  variables: Variables
): QueryRef<Data, Variables>;
export function queryRef<Data, Variables>(
  dcInstance: DataConnect,
  queryName: string,
  variables?: Variables,
  initialCache?: QueryResult<Data, Variables>
): QueryRef<Data, Variables> {
  dcInstance.setInitialized();
  dcInstance._queryManager.track(queryName, variables, initialCache);
  return {
    dataConnect: dcInstance,
    refType: QueryStr,
    name: queryName,
    variables: variables as Variables
  };
}
export function toQueryRef<Data, Variables>(
  serializedRef: SerializedRef<Data, Variables>
) {
  const {
    refInfo: { name, variables, connectorConfig }
  } = serializedRef;
  return queryRef(getDataConnect(connectorConfig), name, variables);
}
export type OnCompleteSubscription = () => void;
export interface SubscriptionOptions<Data, Variables> {
  onNext?: OnResultSubscription<Data, Variables>;
  onErr?: OnErrorSubscription;
  onComplete?: OnCompleteSubscription;
}
