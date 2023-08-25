/**
 * @license
 * Copyright 2022 Google LLC
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

import { AggregateImpl } from '../core/aggregate';
import {
  FirestoreClient,
  firestoreClientListenAggregate,
  firestoreClientRunAggregateQuery
} from '../core/firestore_client';
import { AggregateQuery as InternalAggregateQuery } from '../core/query';
import { AggregateViewSnapshot } from '../core/view_snapshot';
import { count } from '../lite-api/aggregate';
import {
  AggregateField,
  AggregateSpec,
  AggregateType
} from '../lite-api/aggregate_types';
import { validateHasExplicitOrderByForLimitToLast } from '../lite-api/query';
import { ApiClientObjectMap, Value } from '../protos/firestore_proto_api';
import { hardAssert } from '../util/assert';
import { FirestoreError } from '../util/error';
import { cast } from '../util/input_validation';
import { mapToArray } from '../util/obj';

import { AggregateQuerySnapshot } from './aggregate_types';
import { ensureFirestoreConfigured, Firestore } from './database';
import {
  CompleteFn,
  ErrorFn,
  isPartialObserver,
  NextFn,
  PartialObserver
} from './observer';
import { Query, DocumentData } from './reference';
import {
  ExpUserDataWriter,
  SnapshotListenOptions,
  Unsubscribe
} from './reference_impl';
import { SnapshotMetadata } from './snapshot';

export {
  aggregateQuerySnapshotEqual,
  count,
  sum,
  average,
  aggregateFieldEqual
} from '../lite-api/aggregate';

/**
 * Calculates the number of documents in the result set of the given query,
 * without actually downloading the documents.
 *
 * Using this function to count the documents is efficient because only the
 * final count, not the documents' data, is downloaded. This function can even
 * count the documents if the result set would be prohibitively large to
 * download entirely (e.g. thousands of documents).
 *
 * The result received from the server is presented, unaltered, without
 * considering any local state. That is, documents in the local cache are not
 * taken into consideration, neither are local modifications not yet
 * synchronized with the server. Previously-downloaded results, if any, are not
 * used: every request using this source necessarily involves a round trip to
 * the server.
 *
 * @param query - The query whose result set size to calculate.
 * @returns A Promise that will be resolved with the count; the count can be
 * retrieved from `snapshot.data().count`, where `snapshot` is the
 * `AggregateQuerySnapshot` to which the returned Promise resolves.
 */
export function getCountFromServer<
  AppModelType,
  DbModelType extends DocumentData
>(
  query: Query<AppModelType, DbModelType>
): Promise<
  AggregateQuerySnapshot<
    { count: AggregateField<number> },
    AppModelType,
    DbModelType
  >
> {
  const countQuerySpec: { count: AggregateField<number> } = {
    count: count()
  };

  return getAggregateFromServer(query, countQuerySpec);
}

export function getCountFromCache<
  AppModelType,
  DbModelType extends DocumentData
>(
  query: Query<AppModelType, DbModelType>
): Promise<
  AggregateQuerySnapshot<
    { count: AggregateField<number> },
    AppModelType,
    DbModelType
  >
> {
  const countQuerySpec: { count: AggregateField<number> } = {
    count: count()
  };

  return getAggregateFromCache<
    { count: AggregateField<number> },
    AppModelType,
    DbModelType
  >(query, countQuerySpec);
}

export function getCount<AppModelType, DbModelType extends DocumentData>(
  query: Query<AppModelType, DbModelType>
): Promise<
  AggregateQuerySnapshot<
    { count: AggregateField<number> },
    AppModelType,
    DbModelType
  >
> {
  const countQuerySpec: { count: AggregateField<number> } = {
    count: count()
  };

  return getAggregate<
    { count: AggregateField<number> },
    AppModelType,
    DbModelType
  >(query, countQuerySpec);
}

/**
 * Calculates the specified aggregations over the documents in the result
 * set of the given query, without actually downloading the documents.
 *
 * Using this function to perform aggregations is efficient because only the
 * final aggregation values, not the documents' data, is downloaded. This
 * function can even perform aggregations of the documents if the result set
 * would be prohibitively large to download entirely (e.g. thousands of documents).
 *
 * The result received from the server is presented, unaltered, without
 * considering any local state. That is, documents in the local cache are not
 * taken into consideration, neither are local modifications not yet
 * synchronized with the server. Previously-downloaded results, if any, are not
 * used: every request using this source necessarily involves a round trip to
 * the server.
 *
 * @param query The query whose result set to aggregate over.
 * @param aggregateSpec An `AggregateSpec` object that specifies the aggregates
 * to perform over the result set. The AggregateSpec specifies aliases for each
 * aggregate, which can be used to retrieve the aggregate result.
 * @example
 * ```typescript
 * const aggregateSnapshot = await getAggregateFromServer(query, {
 *   countOfDocs: count(),
 *   totalHours: sum('hours'),
 *   averageScore: average('score')
 * });
 *
 * const countOfDocs: number = aggregateSnapshot.data().countOfDocs;
 * const totalHours: number = aggregateSnapshot.data().totalHours;
 * const averageScore: number | null = aggregateSnapshot.data().averageScore;
 * ```
 * @internal TODO (sum/avg) remove when public
 */
export function getAggregateFromServer<
  AggregateSpecType extends AggregateSpec,
  AppModelType,
  DbModelType extends DocumentData
>(
  query: Query<AppModelType, DbModelType>,
  aggregateSpec: AggregateSpecType
): Promise<
  AggregateQuerySnapshot<AggregateSpecType, AppModelType, DbModelType>
> {
  const firestore = cast(query.firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);

  const internalAggregates = mapToArray(aggregateSpec, (aggregate, alias) => {
    return new AggregateImpl(
      alias,
      aggregate._aggregateType,
      aggregate._internalFieldPath
    );
  });

  // TODO (streaming-aggregation) test order-by with limit-to-last
  validateHasExplicitOrderByForLimitToLast(query._query);

  // Run the aggregation and convert the results
  return firestoreClientRunAggregateQuery(
    client,
    query._query,
    internalAggregates
  ).then(aggregateResult =>
    convertToAggregateQuerySnapshot(
      firestore,
      query,
      aggregateResult,
      undefined
    )
  );
}

/**
 * Returns the specified aggregations over the documents in the result
 * set of the given query, based on data in the SDK's cache.
 *
 * If there IS NOT a cached aggregation result for the specified
 * query and (TODO: alias or AggregateField) from a previous AggregateQuery sent
 * to the server, then the returned aggregation value will be computed against
 * documents in the SDK's local cache.
 *
 * If there IS a cached aggregation result for the specified
 * query and (TODO: alias or AggregateField) from a previous AggregateQuery sent
 * to the server, then the returned aggregation value will be computed by
 * augmenting the cached aggregation value against document mutations in the
 * SDK's local cache. The SDK attempts to compute the most accurate aggregation
 * values from these two sources by comparing timestamps on the cached
 * aggregation values and the cached document mutations.
 *
 * If cached aggregation values are not available for all of the requested
 * AggregateFields, or if cached aggregation values do not have the same timestamp
 * for all of the requested aggregate fields, then TODO?
 *   - The SDK computes aggregations based on the most recent cached aggregation
 *     value it has in the cache.
 *   - The SDK ignore cached aggregation values and computes each aggregation
 *     based on the documents in the cache.
 */
export function getAggregateFromCache<
  AggregateSpecType extends AggregateSpec,
  AppModelType,
  DbModelType extends DocumentData
>(
  query: Query<AppModelType, DbModelType>,
  aggregateSpec: AggregateSpecType
): Promise<
  AggregateQuerySnapshot<AggregateSpecType, AppModelType, DbModelType>
> {
  // TODO (streaming-count)
  throw new Error('Not implemented: API design only');
}

/**
 * Calculates the specified aggregations over the documents in the result
 * set of the given query, without actually downloading the documents.
 *
 * `getAggregate()` attempts to provide up-to-date data when possible by
 * waiting for data from the server, but it may return aggregation results based
 * on cached data or fail if you are offline and the server cannot be reached.
 * To specify this behavior, invoke {@link getAggregateFromCache} or
 * {@link getAggregateFromServer}.
 *
 * If computing aggregation results based on cached data, the behavior of the
 * SDK is defined in {@link getAggregateFromCache}.
 */
export function getAggregate<
  AggregateSpecType extends AggregateSpec,
  AppModelType,
  DbModelType extends DocumentData
>(
  query: Query<AppModelType, DbModelType>,
  aggregateSpec: AggregateSpecType
): Promise<
  AggregateQuerySnapshot<AggregateSpecType, AppModelType, DbModelType>
> {
  // TODO (streaming-count)
  throw new Error('Not implemented: API design only');
}

/**
 * Converts the core aggregration result to an `AggregateQuerySnapshot`
 * that can be returned to the consumer.
 * @param query
 * @param aggregateResult Core aggregation result
 * @internal
 */
function convertToAggregateQuerySnapshot<
  AggregateSpecType extends AggregateSpec,
  AppModelType,
  DbModelType extends DocumentData
>(
  firestore: Firestore,
  query: Query<AppModelType, DbModelType>,
  aggregateResult: ApiClientObjectMap<Value>,
  delta: ApiClientObjectMap<number> | undefined
): AggregateQuerySnapshot<AggregateSpecType, AppModelType, DbModelType> {
  const userDataWriter = new ExpUserDataWriter(firestore);
  const querySnapshot = new AggregateQuerySnapshot<
    AggregateSpecType,
    AppModelType,
    DbModelType
  >(
    query,
    userDataWriter,
    aggregateResult,
    delta,
    // TODO (streaming-count) add real snapshot metadata
    new SnapshotMetadata(false, false) // this is stubbed
  );
  return querySnapshot;
}

/**
 * Attaches a listener for `AggregateQuerySnapshot` events. You may either pass
 * individual `onNext` and `onError` callbacks or pass a single observer
 * object with `next` and `error` callbacks. The listener can be cancelled by
 * calling the function that is returned when `onAggregateSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will
 * never be called because the snapshot stream is never-ending.
 *
 * @param query - The base query to listen for aggregate updates.
 * @param aggregateSpec An `AggregateSpec` object that specifies the aggregates
 * to perform over the result set of the `query`. The AggregateSpec specifies
 * aliases for each aggregate, which can be used to retrieve the aggregate
 * result from the AggregateQuerySnapshot.
 * @param observer - A single object containing `next` and `error` callbacks.
 * @returns An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onAggregateSnapshot<
  AggregateSpecType extends AggregateSpec,
  AppModelType,
  DbModelType extends DocumentData
>(
  query: Query<AppModelType, DbModelType>,
  aggregateSpec: AggregateSpecType,
  observer: {
    next?: (snapshot: AggregateQuerySnapshot<AggregateSpecType>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;

/**
 * Attaches a listener for `AggregateQuerySnapshot` events. You may either pass
 * individual `onNext` and `onError` callbacks or pass a single observer
 * object with `next` and `error` callbacks. The listener can be cancelled by
 * calling the function that is returned when `onAggregateSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will
 * never be called because the snapshot stream is never-ending.
 *
 * @param query - The base query to listen for aggregate updates.
 * @param aggregateSpec An `AggregateSpec` object that specifies the aggregates
 * to perform over the result set of the `query`. The AggregateSpec specifies
 * aliases for each aggregate, which can be used to retrieve the aggregate
 * result from the AggregateQuerySnapshot.
 * @param options - Options controlling the listen behavior.
 * @param observer - A single object containing `next` and `error` callbacks.
 * @returns An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onAggregateSnapshot<
  AggregateSpecType extends AggregateSpec,
  AppModelType,
  DbModelType extends DocumentData
>(
  query: Query<AppModelType, DbModelType>,
  aggregateSpec: AggregateSpecType,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: AggregateQuerySnapshot<AggregateSpecType>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;

/**
 * Attaches a listener for `AggregateQuerySnapshot` events. You may either pass
 * individual `onNext` and `onError` callbacks or pass a single observer
 * object with `next` and `error` callbacks. The listener can be cancelled by
 * calling the function that is returned when `onAggregateSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will
 * never be called because the snapshot stream is never-ending.
 *
 * @param query - The base query to listen for aggregate updates.
 * @param aggregateSpec An `AggregateSpec` object that specifies the aggregates
 * to perform over the result set of the `query`. The AggregateSpec specifies
 * aliases for each aggregate, which can be used to retrieve the aggregate
 * result from the AggregateQuerySnapshot.
 * @param onNext - A callback to be called every time a new `QuerySnapshot`
 * is available.
 * @param onCompletion - Can be provided, but will not be called since streams are
 * never ending.
 * @param onError - A callback to be called if the listen fails or is
 * cancelled. No further callbacks will occur.
 * @returns An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onAggregateSnapshot<
  AggregateSpecType extends AggregateSpec,
  AppModelType,
  DbModelType extends DocumentData
>(
  query: Query<AppModelType, DbModelType>,
  aggregateSpec: AggregateSpecType,
  onNext: (snapshot: AggregateQuerySnapshot<AggregateSpecType>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;

/**
 * Attaches a listener for `QuerySnapshot` events. You may either pass
 * individual `onNext` and `onError` callbacks or pass a single observer
 * object with `next` and `error` callbacks. The listener can be cancelled by
 * calling the function that is returned when `onAggregateSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will
 * never be called because the snapshot stream is never-ending.
 *
 * @param query - The base query to listen for aggregate updates.
 * @param aggregateSpec An `AggregateSpec` object that specifies the aggregates
 * to perform over the result set of the `query`. The AggregateSpec specifies
 * aliases for each aggregate, which can be used to retrieve the aggregate
 * result from the AggregateQuerySnapshot.
 * @param options - Options controlling the listen behavior.
 * @param onNext - A callback to be called every time a new `QuerySnapshot`
 * is available.
 * @param onCompletion - Can be provided, but will not be called since streams are
 * never ending.
 * @param onError - A callback to be called if the listen fails or is
 * cancelled. No further callbacks will occur.
 * @returns An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onAggregateSnapshot<
  AggregateSpecType extends AggregateSpec,
  AppModelType,
  DbModelType extends DocumentData
>(
  query: Query<AppModelType, DbModelType>,
  aggregateSpec: AggregateSpecType,
  options: SnapshotListenOptions,
  onNext: (snapshot: AggregateQuerySnapshot<AggregateSpecType>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;

export function onAggregateSnapshot<
  AggregateSpecType extends AggregateSpec,
  AppModelType,
  DbModelType extends DocumentData
>(
  query: Query<AppModelType, DbModelType>,
  aggregateSpec: AggregateSpecType,
  ...args: unknown[]
): Unsubscribe {
  // process `query` arg
  const firestore = cast(query.firestore, Firestore);
  const client: FirestoreClient = ensureFirestoreConfigured(firestore);
  validateHasExplicitOrderByForLimitToLast(query._query);

  // process `aggregateSpec` arg
  const internalAggregates = mapToArray(aggregateSpec, (aggregate, alias) => {
    return new AggregateImpl(
      alias,
      aggregate._aggregateType,
      aggregate._internalFieldPath
    );
  });
  validateSupportedStreamingAggregations(internalAggregates);

  // process `...args`
  const { options, next, error, complete } = processSnapshotArgs<
    AggregateQuerySnapshot<AggregateSpecType>
  >(...args);

  // Internal observer
  const internalObserver: PartialObserver<AggregateViewSnapshot> = {
    next: view => {
      if (next) {
        // TODO streaming-count add snapshot metadata
        // TODO streaming-count apply offsets to snapshot metadata
        next(
          convertToAggregateQuerySnapshot(
            firestore,
            query,
            view.snapshot.snapshot,
            view.snapshot.delta
          )
        );
      }
    },
    error,
    complete
  };

  const internalAggregateQuery = new InternalAggregateQuery(
    query._query,
    internalAggregates
  );

  return firestoreClientListenAggregate(
    client,
    internalAggregateQuery,
    options,
    internalObserver
  );
}

interface SnapshotArgs<SnapshotType> {
  options: SnapshotListenOptions;
  next?: NextFn<SnapshotType>;
  error?: ErrorFn;
  complete?: CompleteFn;
}

function processSnapshotArgs<SnapshotType>(
  ...args: unknown[]
): SnapshotArgs<SnapshotType> {
  // Get options or default options
  let options: SnapshotListenOptions = {
    includeMetadataChanges: false
  };
  let currArg = 0;
  if (typeof args[currArg] === 'object' && !isPartialObserver(args[currArg])) {
    options = args[currArg] as SnapshotListenOptions;
    currArg++;
  }

  // Process Observer, partial Observer, or callback functions
  let next: NextFn<SnapshotType> | undefined;
  let error: ErrorFn | undefined;
  let complete: CompleteFn | undefined;
  if (isPartialObserver(args[currArg])) {
    const userObserver = args[currArg] as PartialObserver<SnapshotType>;
    next = userObserver.next?.bind(userObserver);
    error = userObserver.error?.bind(userObserver);
    complete = userObserver.complete?.bind(userObserver);
  } else {
    // expecting 1-3 arguments representing the next, error, and complete functions
    next = args[currArg] as NextFn<SnapshotType>;
    error = args[currArg + 1] as ErrorFn;
    complete = args[currArg + 2] as CompleteFn;
  }

  return {
    options: {
      includeMetadataChanges: options.includeMetadataChanges
    },
    next,
    error,
    complete
  };
}

function validateSupportedStreamingAggregations(
  internalAggregates: AggregateImpl[]
): void {
  // Assert that only supported aggregations are requested.
  const supportedStreamingAggregates: AggregateType[] = ['count'];
  internalAggregates.forEach(agg => {
    hardAssert(
      !supportedStreamingAggregates.includes(agg.aggregateType),
      `Watch does not support the '${agg.aggregateType}' aggregation operation.`
    );
  });
}

/**
 * Attaches a listener for count snapshot events. You may either pass
 * individual `onNext` and `onError` callbacks or pass a single observer
 * object with `next` and `error` callbacks. The listener can be cancelled by
 * calling the function that is returned when `onCountSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will
 * never be called because the snapshot stream is never-ending.
 *
 * @param query - The base query to listen for aggregate updates.
 * @param aggregateSpec An `AggregateSpec` object that specifies the aggregates
 * to perform over the result set of the `query`. The AggregateSpec specifies
 * aliases for each aggregate, which can be used to retrieve the aggregate
 * result from the AggregateQuerySnapshot.
 * @param observer - A single object containing `next` and `error` callbacks.
 * @returns An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onCountSnapshot<AppModelType, DbModelType extends DocumentData>(
  query: Query<AppModelType, DbModelType>,
  observer: {
    next?: (
      snapshot: AggregateQuerySnapshot<{ count: AggregateField<number> }>
    ) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;

/**
 * Attaches a listener for count snapshot events. You may either pass
 * individual `onNext` and `onError` callbacks or pass a single observer
 * object with `next` and `error` callbacks. The listener can be cancelled by
 * calling the function that is returned when `onCountSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will
 * never be called because the snapshot stream is never-ending.
 *
 * @param query - The base query to listen for aggregate updates.
 * @param aggregateSpec An `AggregateSpec` object that specifies the aggregates
 * to perform over the result set of the `query`. The AggregateSpec specifies
 * aliases for each aggregate, which can be used to retrieve the aggregate
 * result from the AggregateQuerySnapshot.
 * @param options - Options controlling the listen behavior.
 * @param observer - A single object containing `next` and `error` callbacks.
 * @returns An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onCountSnapshot<AppModelType, DbModelType extends DocumentData>(
  query: Query<AppModelType, DbModelType>,
  options: SnapshotListenOptions,
  observer: {
    next?: (
      snapshot: AggregateQuerySnapshot<{ count: AggregateField<number> }>
    ) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;

/**
 * Attaches a listener for count snapshot events. You may either pass
 * individual `onNext` and `onError` callbacks or pass a single observer
 * object with `next` and `error` callbacks. The listener can be cancelled by
 * calling the function that is returned when `onCountSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will
 * never be called because the snapshot stream is never-ending.
 *
 * @param query - The base query to listen for aggregate updates.
 * @param aggregateSpec An `AggregateSpec` object that specifies the aggregates
 * to perform over the result set of the `query`. The AggregateSpec specifies
 * aliases for each aggregate, which can be used to retrieve the aggregate
 * result from the AggregateQuerySnapshot.
 * @param onNext - A callback to be called every time a new `QuerySnapshot`
 * is available.
 * @param onCompletion - Can be provided, but will not be called since streams are
 * never ending.
 * @param onError - A callback to be called if the listen fails or is
 * cancelled. No further callbacks will occur.
 * @returns An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onCountSnapshot<AppModelType, DbModelType extends DocumentData>(
  query: Query<AppModelType, DbModelType>,
  onNext: (
    snapshot: AggregateQuerySnapshot<{ count: AggregateField<number> }>
  ) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;

/**
 * Attaches a listener for count snapshot events. You may either pass
 * individual `onNext` and `onError` callbacks or pass a single observer
 * object with `next` and `error` callbacks. The listener can be cancelled by
 * calling the function that is returned when `onCountSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will
 * never be called because the snapshot stream is never-ending.
 *
 * @param query - The base query to listen for aggregate updates.
 * @param options - Options controlling the listen behavior.
 * @param onNext - A callback to be called every time a new `QuerySnapshot`
 * is available.
 * @param onCompletion - Can be provided, but will not be called since streams are
 * never ending.
 * @param onError - A callback to be called if the listen fails or is
 * cancelled. No further callbacks will occur.
 * @returns An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onCountSnapshot<AppModelType, DbModelType extends DocumentData>(
  query: Query<AppModelType, DbModelType>,
  options: SnapshotListenOptions,
  onNext: (
    snapshot: AggregateQuerySnapshot<{ count: AggregateField<number> }>
  ) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;

export function onCountSnapshot<AppModelType, DbModelType extends DocumentData>(
  query: Query<AppModelType, DbModelType>,
  ...args: unknown[]
): Unsubscribe {
  const countQuerySpec: { count: AggregateField<number> } = {
    count: count()
  };

  // @ts-ignore
  return onAggregateSnapshot(query, countQuerySpec, ...args);
}
