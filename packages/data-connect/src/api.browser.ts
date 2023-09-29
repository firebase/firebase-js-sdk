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
  OnCompleteSubscription,
  OnErrorSubscription,
  OnResultSubscription,
  QueryRef,
  QueryUnsubscribe,
  SubscriptionOptions,
  toQueryRef
} from './api/query';
import { OpResult, SerializedRef } from './api/Reference';
import { DataConnectError, Code } from './core/error';

/**
 *
 * @public
 * @param queryRef
 * @param onResult
 * @param onErr
 * @param initialCache
 * @returns
 */
export function subscribe<Data, Variables>(
  queryRefOrSerializedResult:
    | QueryRef<Data, Variables>
    | SerializedRef<Data, Variables>,
  observer: SubscriptionOptions<Data, Variables>
): QueryUnsubscribe;
export function subscribe<Data, Variables>(
  queryRefOrSerializedResult:
    | QueryRef<Data, Variables>
    | SerializedRef<Data, Variables>,
  onNext: OnResultSubscription<Data, Variables>,
  onError?: OnErrorSubscription,
  onComplete?: OnCompleteSubscription
): QueryUnsubscribe;
export function subscribe<Data, Variables>(
  queryRefOrSerializedResult:
    | QueryRef<Data, Variables>
    | SerializedRef<Data, Variables>,
  observerOrOnNext:
    | SubscriptionOptions<Data, Variables>
    | OnResultSubscription<Data, Variables>,
  onError?: OnErrorSubscription,
  onComplete?: OnCompleteSubscription
): QueryUnsubscribe {
  let ref: QueryRef<Data, Variables>;
  let initialCache: OpResult<Data> | undefined;
  if ('refInfo' in queryRefOrSerializedResult) {
    let serializedRef: SerializedRef<Data, Variables> =
      queryRefOrSerializedResult;
    const { data, source, fetchTime } = serializedRef;
    initialCache = {
      data,
      source,
      fetchTime
    };
    ref = toQueryRef(serializedRef);
  } else {
    ref = queryRefOrSerializedResult;
  }
  let onResult: OnResultSubscription<Data, Variables> | undefined = undefined;
  if (typeof observerOrOnNext === 'function') {
    onResult = observerOrOnNext;
  } else {
    onResult = observerOrOnNext.onNext;
    onError = observerOrOnNext.onErr;
    onComplete = observerOrOnNext.onComplete;
  }
  if (!onResult) {
    throw new DataConnectError(Code.INVALID_ARGUMENT, 'Must provide onNext');
  }
  return ref.dataConnect._queryManager.addSubscription(
    ref,
    onResult,
    onError,
    initialCache
  );
}
