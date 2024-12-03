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
  QUERY_STR,
  DataConnectResult,
  SerializedRef
} from './Reference';

/**
 * Signature for `OnResultSubscription` for `subscribe`
 */
export type OnResultSubscription<Data, Variables> = (
  res: QueryResult<Data, Variables>
) => void;
/**
 * Signature for `OnErrorSubscription` for `subscribe`
 */
export type OnErrorSubscription = (err?: DataConnectError) => void;
/**
 * Signature for unsubscribe from `subscribe`
 */
export type QueryUnsubscribe = () => void;
/**
 * Representation of user provided subscription options.
 */
export interface DataConnectSubscription<Data, Variables> {
  userCallback: OnResultSubscription<Data, Variables>;
  errCallback?: (e?: DataConnectError) => void;
  unsubscribe: () => void;
}

/**
 * QueryRef object
 */
export interface QueryRef<Data, Variables>
  extends OperationRef<Data, Variables> {
  refType: typeof QUERY_STR;
}
/**
 * Result of `executeQuery`
 */
export interface QueryResult<Data, Variables>
  extends DataConnectResult<Data, Variables> {
  ref: QueryRef<Data, Variables>;
  toJSON: () => SerializedRef<Data, Variables>;
}
/**
 * Promise returned from `executeQuery`
 */
export interface QueryPromise<Data, Variables>
  extends PromiseLike<QueryResult<Data, Variables>> {
  // reserved for special actions like cancellation
}

/**
 * Execute Query
 * @param queryRef query to execute.
 * @returns `QueryPromise`
 */
export function executeQuery<Data, Variables>(
  queryRef: QueryRef<Data, Variables>
): QueryPromise<Data, Variables> {
  return queryRef.dataConnect._queryManager.executeQuery(queryRef);
}

/**
 * Execute Query
 * @param dcInstance Data Connect instance to use.
 * @param queryName Query to execute
 * @returns `QueryRef`
 */
export function queryRef<Data>(
  dcInstance: DataConnect,
  queryName: string
): QueryRef<Data, undefined>;
/**
 * Execute Query
 * @param dcInstance Data Connect instance to use.
 * @param queryName Query to execute
 * @param variables Variables to execute with
 * @returns `QueryRef`
 */
export function queryRef<Data, Variables>(
  dcInstance: DataConnect,
  queryName: string,
  variables: Variables
): QueryRef<Data, Variables>;

export function queryRef<Data, Variables>(
  dcInstance: DataConnect,
  serializedRef: SerializedRef<Data, Variables>
): QueryRef<Data, Variables>;

/**
 * Execute Query
 * @param dcInstance Data Connect instance to use.
 * @param queryNameOrSerializedRef Query to execute
 * @param variables Variables to execute with
 * @param initialCache initial cache to use for client hydration
 * @returns `QueryRef`
 */
export function queryRef<Data, Variables>(
  dcInstance: DataConnect,
  queryNameOrSerializedRef: string | SerializedRef<Data, Variables>,
  variables?: Variables,
  initialCache?: QueryResult<Data, Variables>
): QueryRef<Data, Variables> {
  dcInstance.setInitialized();
  if (typeof queryNameOrSerializedRef === 'string') {
    dcInstance._queryManager.track(
      queryNameOrSerializedRef,
      variables,
      initialCache
    );
  } else {
    dcInstance._queryManager.track(
      queryNameOrSerializedRef.refInfo.name,
      queryNameOrSerializedRef.refInfo.variables,
      queryNameOrSerializedRef
    );
  }
  const vars =
    typeof queryNameOrSerializedRef !== 'string'
      ? queryNameOrSerializedRef.refInfo.variables
      : variables;
  const name =
    typeof queryNameOrSerializedRef !== 'string'
      ? queryNameOrSerializedRef.refInfo.name
      : queryNameOrSerializedRef;
  return {
    dataConnect: dcInstance,
    refType: QUERY_STR,
    name,
    variables: vars
  };
}
/**
 * Converts serialized ref to query ref
 * @param serializedRef ref to convert to `QueryRef`
 * @returns `QueryRef`
 */
export function toQueryRef<Data, Variables>(
  serializedRef: SerializedRef<Data, Variables>
): QueryRef<Data, Variables> {
  const {
    refInfo: { name, variables, connectorConfig }
  } = serializedRef;
  return queryRef(getDataConnect(connectorConfig), name, variables);
}
/**
 * `OnCompleteSubscription`
 */
export type OnCompleteSubscription = () => void;
/**
 * Representation of full observer options in `subscribe`
 */
export interface SubscriptionOptions<Data, Variables> {
  onNext?: OnResultSubscription<Data, Variables>;
  onErr?: OnErrorSubscription;
  onComplete?: OnCompleteSubscription;
}
