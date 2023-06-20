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

import {
  AggregateField,
  AggregateSpec, DocumentReference, FirestoreError,
  Query, SnapshotListenOptions,
  SnapshotMetadata, Unsubscribe
} from '../api';
import { AggregateQuerySnapshot } from '../api/aggregate_types';
import { AggregateImpl } from '../core/aggregate';
import { firestoreClientRunAggregateQuery } from '../core/firestore_client';
import { count } from '../lite-api/aggregate';
import { ApiClientObjectMap, Value } from '../protos/firestore_proto_api';
import { cast } from '../util/input_validation';
import { mapToArray } from '../util/obj';

import { ensureFirestoreConfigured, Firestore } from './database';
import { ExpUserDataWriter } from './reference_impl';

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
export function getCountFromServer(
  query: Query<unknown>
): Promise<AggregateQuerySnapshot<{ count: AggregateField<number> }>> {
  const countQuerySpec: { count: AggregateField<number> } = {
    count: count()
  };

  return getAggregateFromServer(query, countQuerySpec);
}

export function getCountFromCache(
  query: Query<unknown>
): Promise<AggregateQuerySnapshot<{ count: AggregateField<number> }>> {
  const countQuerySpec: { count: AggregateField<number> } = {
    count: count()
  };

  return getAggregateFromCache(query, countQuerySpec);
}

export function getCount(
  query: Query<unknown>
): Promise<AggregateQuerySnapshot<{ count: AggregateField<number> }>> {
  const countQuerySpec: { count: AggregateField<number> } = {
    count: count()
  };

  return getAggregate(query, countQuerySpec);
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
export function getAggregateFromServer<T extends AggregateSpec>(
  query: Query<unknown>,
  aggregateSpec: T
): Promise<AggregateQuerySnapshot<T>> {
  const firestore = cast(query.firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);

  const internalAggregates = mapToArray(aggregateSpec, (aggregate, alias) => {
    return new AggregateImpl(
      alias,
      aggregate._aggregateType,
      aggregate._internalFieldPath
    );
  });

  // Run the aggregation and convert the results
  return firestoreClientRunAggregateQuery(
    client,
    query._query,
    internalAggregates
  ).then(aggregateResult =>
    convertToAggregateQuerySnapshot(firestore, query, aggregateResult)
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
export function getAggregateFromCache<T extends AggregateSpec>(
  query: Query<unknown>,
  aggregateSpec: T
): Promise<AggregateQuerySnapshot<T>> {
  // TODO (streaming-count)
  throw new Error("Not implemented: API design only");
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
export function getAggregate<T extends AggregateSpec>(
  query: Query<unknown>,
  aggregateSpec: T
): Promise<AggregateQuerySnapshot<T>> {
  // TODO (streaming-count)
  throw new Error("Not implemented: API design only");
}

/**
 * Converts the core aggregration result to an `AggregateQuerySnapshot`
 * that can be returned to the consumer.
 * @param query
 * @param aggregateResult Core aggregation result
 * @internal
 */
function convertToAggregateQuerySnapshot<T extends AggregateSpec>(
  firestore: Firestore,
  query: Query<unknown>,
  aggregateResult: ApiClientObjectMap<Value>
): AggregateQuerySnapshot<T> {
  const userDataWriter = new ExpUserDataWriter(firestore);
  const querySnapshot = new AggregateQuerySnapshot<T>(
    query,
    userDataWriter,
    aggregateResult,
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
export function onAggregateSnapshot<T extends  AggregateSpec>(
  query: Query<unknown>,
  aggregateSpec: T,
  observer: {
    next?: (snapshot: AggregateQuerySnapshot<T>) => void;
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
export function onAggregateSnapshot<T extends AggregateSpec>(
  query: Query<unknown>,
  aggregateSpec: T,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: AggregateQuerySnapshot<T>) => void;
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
export function onAggregateSnapshot<T extends AggregateSpec>(
  query: Query<unknown>,
  aggregateSpec: T,
  onNext: (snapshot: AggregateQuerySnapshot<T>) => void,
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
export function onAggregateSnapshot<T extends AggregateSpec>(
  query: Query<unknown>,
  aggregateSpec: T,
  options: SnapshotListenOptions,
  onNext: (snapshot: AggregateQuerySnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;

export function onAggregateSnapshot<T extends AggregateSpec>(
  reference: Query<T> | DocumentReference<T>,
  aggregateSpec: T,
  ...args: unknown[]
): Unsubscribe {
  // TODO (streaming-count)
  throw new Error("Not implemented: API design only");
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
export function onCountSnapshot(
  query: Query<unknown>,
  observer: {
    next?: (snapshot: AggregateQuerySnapshot<{ count: AggregateField<number> }>) => void;
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
export function onCountSnapshot(
  query: Query<unknown>,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: AggregateQuerySnapshot<{ count: AggregateField<number> }>) => void;
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
export function onCountSnapshot(
  query: Query<unknown>,
  onNext: (snapshot: AggregateQuerySnapshot<{ count: AggregateField<number> }>) => void,
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
export function onCountSnapshot(
  query: Query<unknown>,
  options: SnapshotListenOptions,
  onNext: (snapshot: AggregateQuerySnapshot<{ count: AggregateField<number> }>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;

export function onCountSnapshot<T extends AggregateSpec>(
  reference: Query<T> | DocumentReference<T>,
  aggregateSpec: T,
  ...args: unknown[]
): Unsubscribe {
  const countQuerySpec: { count: AggregateField<number> } = {
    count: count()
  };

  // @ts-ignore
  return onAggregateSnapshot(reference, aggregateSpec, ...args);
}



// TODO (streaming-count) do we need onSnapshotsInSync()?
