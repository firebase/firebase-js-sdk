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

import { Value } from '../protos/firestore_proto_api';
import { invokeRunAggregationQueryRpc } from '../remote/datastore';
import { hardAssert } from '../util/assert';
import { cast } from '../util/input_validation';

import { getDatastore } from './components';
import { Firestore } from './database';
import { Query, queryEqual } from './reference';
import { LiteUserDataWriter } from './reference_impl';

/**
 * An `AggregateField`that captures input type T.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class AggregateField<T> {
  type = 'AggregateField';
}

/**
 * Creates and returns an aggregation field that counts the documents in the result set.
 * @returns An `AggregateField` object with number input type.
 */
export function count(): AggregateField<number> {
  return new AggregateField<number>();
}

/**
 * The union of all `AggregateField` types that are returned from the factory
 * functions.
 */
export type AggregateFieldType = ReturnType<typeof count>;

/**
 * A type whose values are all `AggregateField` objects.
 * This is used as an argument to the "getter" functions, and the snapshot will
 * map the same names to the corresponding values.
 */
export interface AggregateSpec {
  [field: string]: AggregateFieldType;
}

/**
 * A type whose keys are taken from an `AggregateSpec` type, and whose values
 * are the result of the aggregation performed by the corresponding
 * `AggregateField` from the input `AggregateSpec`.
 */
export type AggregateSpecData<T extends AggregateSpec> = {
  [P in keyof T]: T[P] extends AggregateField<infer U> ? U : never;
};

/**
 * An `AggregateQuerySnapshot` contains the results of running an aggregate query.
 */
export class AggregateQuerySnapshot<T extends AggregateSpec> {
  readonly type = 'AggregateQuerySnapshot';

  /** @hideconstructor */
  constructor(
    readonly query: Query<unknown>,
    private readonly _data: AggregateSpecData<T>
  ) {}

  /**
   * The results of the requested aggregations. The keys of the returned object
   * will be the same as those of the `AggregateSpec` object specified to the
   * aggregation method, and the values will be the corresponding aggregation
   * result.
   *
   * @returns The aggregation statistics result of running a query.
   */
  data(): AggregateSpecData<T> {
    return this._data;
  }
}

/**
 * Counts the number of documents in the result set of the given query, ignoring
 * any locally-cached data and any locally-pending writes and simply surfacing
 * whatever the server returns. If the server cannot be reached then the
 * returned promise will be rejected.
 *
 * @param query - The `Query` to execute.
 *
 * @returns An `AggregateQuerySnapshot` that contains the number of documents.
 */
export function getCount(
  query: Query<unknown>
): Promise<AggregateQuerySnapshot<{ count: AggregateField<number> }>> {
  const firestore = cast(query.firestore, Firestore);
  const datastore = getDatastore(firestore);
  const userDataWriter = new LiteUserDataWriter(firestore);
  return invokeRunAggregationQueryRpc(datastore, query._query).then(result => {
    hardAssert(
      result[0] !== undefined,
      'Aggregation fields are missing from result.'
    );

    const counts = Object.entries(result[0])
      .filter(([key, value]) => key === 'count_alias')
      .map(([key, value]) => userDataWriter.convertValue(value as Value));

    const countValue = counts[0];

    hardAssert(
      typeof countValue === 'number',
      'Count aggregate field value is not a number: ' + countValue
    );

    return Promise.resolve(
      new AggregateQuerySnapshot<{ count: AggregateField<number> }>(query, {
        count: countValue
      })
    );
  });
}

/**
 * Compares two `AggregateQuerySnapshot` instances for equality.
 * Two `AggregateQuerySnapshot` instances are considered "equal" if they have
 * the same underlying query, and the same data.
 *
 * @param left - The `AggregateQuerySnapshot` to compare.
 * @param right - The `AggregateQuerySnapshot` to compare.
 *
 * @returns true if the AggregateQuerySnapshots are equal.
 */
export function aggregateQuerySnapshotEqual<T extends AggregateSpec>(
  left: AggregateQuerySnapshot<T>,
  right: AggregateQuerySnapshot<T>
): boolean {
  return (
    queryEqual(left.query, right.query) && deepEqual(left.data(), right.data())
  );
}
