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

import { CountQueryRunner } from '../core/count_query_runner';
import { cast } from '../util/input_validation';

import {
  AggregateField, AggregateFieldSpec,
  AggregateQuerySnapshot,
  AggregateSpec, AggregateType, AggregateFieldType, AggregateData
} from './aggregate_types';
import { getDatastore } from './components';
import { Firestore } from './database';
import { Query, queryEqual } from './reference';
import { LiteUserDataWriter } from './reference_impl';
import {FieldPath} from "./field_path";
import {AggregateQueryRunner} from "../core/aggregate_query_runner";

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
  const userDataWriter = new LiteUserDataWriter(firestore);
  return new CountQueryRunner(query, datastore, userDataWriter).run();
}

export function getAggregateFromServer<T extends AggregateSpec>(
  query: Query<unknown>,
  aggregates: T
): Promise<AggregateQuerySnapshot<T>>;

export function getAggregateFromServer<T extends AggregateFieldType>(
  query: Query<unknown>,
  aggregateField: T
): Promise<AggregateQuerySnapshot<T>>;

export function getAggregateFromServer<T extends AggregateSpec | AggregateFieldType>(
  query: Query<unknown>,
  aggregateFieldOrSpec: T
): Promise<AggregateQuerySnapshot<T>> {
  let aggregateSpec: AggregateSpec | undefined;

  if (aggregateFieldOrSpec instanceof AggregateField) {
    aggregateSpec = {[aggregateFieldOrSpec.aggregateType]: aggregateFieldOrSpec};
  }
  else {
    aggregateSpec = aggregateFieldOrSpec;
  }

  return new Promise(resolve => {
    const data: any = {};
    for (const key in aggregateSpec) {
      const field = aggregateSpec[key];
      switch (field.aggregateType) {
        case "count":
          data[key] = 1;
          break;
        case "sum":
          data[key] = 1;
          break;
        case "average":
          data[key] = 1;
          break;
      }
    }
    resolve(new AggregateQuerySnapshot(query, data))
  })
}

export function sum(field: string | FieldPath): AggregateField<number, 'sum'> {
  return new AggregateField('sum', field);
}

export function average(field: string | FieldPath): AggregateField<number | null, 'average'> {
  return new AggregateField('average', field);
}

export function count(): AggregateField<number, 'count'> {
  return new AggregateField('count');
}

/**
 * Compares two 'AggregateField` instances for equality.
 *
 * @param left
 * @param right
 */
export function aggregateFieldEqual(
  left: AggregateField<unknown, AggregateType>,
  right: AggregateField<unknown, AggregateType>
): boolean {
  return left instanceof AggregateField &&
    right instanceof AggregateField &&
    left.field == right.field &&
    left.aggregateType == right.aggregateType;
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
