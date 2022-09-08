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

import { hardAssert } from '../util/assert';
import { cast } from '../util/input_validation';
import { invokeRunAggregationQueryRpc } from '../remote/datastore';
import { Value } from '../protos/firestore_proto_api';

import { DocumentFieldValue, Query, queryEqual } from './reference';
import { Firestore } from './database';
import { getDatastore } from './components';
import { LiteUserDataWriter } from './reference_impl';

import { deepEqual } from '@firebase/util';
import { FieldPath } from './field_path';

/**
 * An `AggregateField` computes some aggregation statistics from the result set of
 * an aggregation query.
 */
export class AggregateField<T> {
  type = 'AggregateField';
  _datum?: T;

  constructor(readonly subType: string) {}
}

/**
 * The union of all `AggregateField` types that are returned from the factory
 * functions.
 */
export type AggregateFieldType =
  | AggregateField<number>
  | AggregateField<DocumentFieldValue | undefined>
  | AggregateField<number | undefined>;

/**
 * A type whose values are all `AggregateField` objects.
 * This is used as an argument to the "getter" functions, and the snapshot will
 * map the same names to the corresponding values.
 */
export type AggregateSpec = { [field: string]: AggregateFieldType };

/**
 * A type whose keys are taken from an `AggregateSpec` type, and whose values
 * are the result of the aggregation performed by the corresponding
 * `AggregateField` from the input `AggregateSpec`.
 */
export type AggregateSpecData<T extends AggregateSpec> = {
  [Property in keyof T]-?: T[Property]['_datum'];
};

/**
 * Creates and returns an aggregation field that counts the documents in the result set.
 * @returns An `AggregateField` object that includes number of documents.
 */
export function count(): AggregateField<number> {
  return new AggregateField<number>('count');
}

/**
 * Compares two `AggregateField` instances for equality.
 * The two `AggregateField` instances are considered "equal" if and only if
 * they were created by the same factory function (e.g. `count()`, `min()`, and
 * `sum()`) with "equal" arguments.
 */
export function aggregateFieldEqual(
  left: AggregateField<unknown>,
  right: AggregateField<unknown>
): boolean {
  return typeof left === typeof right && left.subType === right.subType;
}

/**
 * An `AggregateQuerySnapshot` contains the results of running an aggregate query.
 */
export class AggregateQuerySnapshot<T extends AggregateSpec> {
  readonly type = 'AggregateQuerySnapshot';

  constructor(
    readonly query: Query<unknown>,
    protected readonly _data: AggregateSpecData<T>
  ) {}

  /**
   * The results of the requested aggregations. The keys of the returned object
   * will be the same as those of the `AggregateSpec` object specified to the
   * aggregation method, and the values will be the corresponding aggregation
   * result.
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
 * This is a convenience shorthand for:
 * getAggregateFromServer(query, { count: count() }).
 */
export function getCountFromServer(
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
 * the same underlying query, the same metadata, and the same data.
 */
export function aggregateSnapshotEqual<T extends AggregateSpec>(
  left: AggregateQuerySnapshot<T>,
  right: AggregateQuerySnapshot<T>
): boolean {
  return (
    queryEqual(left.query, right.query) && deepEqual(left.data(), right.data())
  );
}
