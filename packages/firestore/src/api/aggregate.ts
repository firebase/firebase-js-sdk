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

import { AggregateField, AggregateSpec, Query } from '../api';
import { AggregateImpl } from '../core/aggregate';
import { firestoreClientRunAggregateQuery } from '../core/firestore_client';
import { count } from '../lite-api/aggregate';
import { AggregateQuerySnapshot } from '../lite-api/aggregate_types';
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
    aggregateResult
  );
  return querySnapshot;
}
