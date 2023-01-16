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

import { deepEqual } from '@firebase/util';

import { AggregateImpl } from '../core/aggregate';
import { ObjectValue } from '../model/object_value';
import { invokeRunAggregationQueryRpc } from '../remote/datastore';
import { cast } from '../util/input_validation';
import { mapToArray } from '../util/obj';

import {
  AggregateField,
  AggregateQuerySnapshot,
  AggregateSpec
} from './aggregate_types';
import { getDatastore } from './components';
import { Firestore } from './database';
import { FieldPath } from './field_path';
import { Query, queryEqual } from './reference';
import { LiteUserDataWriter } from './reference_impl';

/**
 * Calculates the number of documents in the result set of the given query,
 * without actually downloading the documents.
 *
 * Using this function to count the documents is efficient because only the
 * final count, not the documents' data, is downloaded. This function can even
 * count the documents if the result set would be prohibitively large to
 * download entirely (e.g. thousands of documents).
 *
 * @param query - The query whose result set size to calculate.
 * @returns A Promise that will be resolved with the count; the count can be
 * retrieved from `snapshot.data().count`, where `snapshot` is the
 * `AggregateQuerySnapshot` to which the returned Promise resolves.
 */
export function getCount(
  query: Query<unknown>
): Promise<AggregateQuerySnapshot<{ count: AggregateField<number> }>> {
  const firestore = cast(query.firestore, Firestore);
  const datastore = getDatastore(firestore);

  const countQuerySpec: { count: AggregateField<number> } = {
    count: count()
  };

  const internalAggregates = mapToArray(countQuerySpec, (aggregate, alias) => {
    return new AggregateImpl(
      alias,
      aggregate.aggregateType,
      aggregate._internalFieldPath
    );
  });

  return invokeRunAggregationQueryRpc(
    datastore,
    query._query,
    internalAggregates
  ).then(aggregateResult =>
    convertToAggregateQuerySnapshot(
      firestore,
      query,
      countQuerySpec,
      aggregateResult
    )
  );
}

/**
 * TODO
 * @param query
 * @param aggregates
 */
export function getAggregate<T extends AggregateSpec>(
  query: Query<unknown>,
  aggregateSpec: T
): Promise<AggregateQuerySnapshot<T>> {
  const firestore = cast(query.firestore, Firestore);
  const datastore = getDatastore(firestore);

  const internalAggregates = mapToArray(aggregateSpec, (aggregate, alias) => {
    return new AggregateImpl(
      alias,
      aggregate.aggregateType,
      aggregate._internalFieldPath
    );
  });

  return invokeRunAggregationQueryRpc(
    datastore,
    query._query,
    internalAggregates
  ).then(aggregateResult =>
    convertToAggregateQuerySnapshot(
      firestore,
      query,
      aggregateSpec,
      aggregateResult
    )
  );
}

function convertToAggregateQuerySnapshot<T extends AggregateSpec>(
  firestore: Firestore,
  query: Query<unknown>,
  ref: T,
  aggregateResult: ObjectValue
): AggregateQuerySnapshot<T> {
  const userDataWriter = new LiteUserDataWriter(firestore);
  const querySnapshot = new AggregateQuerySnapshot<T>(
    query,
    firestore,
    userDataWriter,
    aggregateResult
  );
  return querySnapshot;
}

/**
 * TODO
 * @param field
 */
export function sum(field: string | FieldPath): AggregateField<number> {
  return new AggregateField('sum', 'sum', field);
}

/**
 * TODO
 * @param field
 */
export function average(
  field: string | FieldPath
): AggregateField<number | null> {
  return new AggregateField('avg', 'average', field);
}

/**
 * TODO
 */
export function count(): AggregateField<number> {
  return new AggregateField('count', 'count');
}

/**
 * Compares two 'AggregateField` instances for equality.
 *
 * @param left
 * @param right
 */
export function aggregateFieldEqual(
  left: AggregateField<unknown>,
  right: AggregateField<unknown>
): boolean {
  return (
    left instanceof AggregateField &&
    right instanceof AggregateField &&
    left._internalFieldPath?.canonicalString() ===
      right._internalFieldPath?.canonicalString() &&
    left.aggregateType === right.aggregateType
  );
}

/**
 * Compares two `AggregateQuerySnapshot` instances for equality.
 *
 * Two `AggregateQuerySnapshot` instances are considered "equal" if they have
 * underlying queries that compare equal, and the same data.
 *
 * @param left - The first `AggregateQuerySnapshot` to compare.
 * @param right - The second `AggregateQuerySnapshot` to compare.
 *
 * @returns `true` if the objects are "equal", as defined above, or `false`
 * otherwise.
 */
export function aggregateQuerySnapshotEqual<T extends AggregateSpec>(
  left: AggregateQuerySnapshot<T>,
  right: AggregateQuerySnapshot<T>
): boolean {
  return (
    queryEqual(left.query, right.query) && deepEqual(left.data(), right.data())
  );
}
