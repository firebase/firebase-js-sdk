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

import { Query, queryEqual } from './reference';
import { cast } from '../util/input_validation';
import { Firestore } from './database';
import { getDatastore } from './components';
import { LiteUserDataWriter } from './reference_impl';
import { invokeRunAggregationQueryRpc } from '../remote/datastore';
import { hardAssert } from '../util/assert';
import { Value } from '../protos/firestore_proto_api';
import { deepEqual } from '@firebase/util';

type DocumentFieldValue = any;

interface AggregateFieldBase<T> {
  _datum?: T;
}

export class CountAggregateField implements AggregateFieldBase<number> {
  type = 'CountAggregateField';
  _datum?: number = undefined;
}

class MinAggregateField
  implements AggregateFieldBase<DocumentFieldValue | undefined>
{
  type = 'MinAggregateField';
  _datum?: DocumentFieldValue = undefined;
}

class SumAggregateField implements AggregateFieldBase<number | undefined> {
  type = 'SumAggregateField';
  _datum?: number = undefined;
}

export type AggregateField =
  | CountAggregateField
  | MinAggregateField
  | SumAggregateField;

export function count(): CountAggregateField {
  return new CountAggregateField();
}

export function aggregateFieldEqual(
  left: AggregateField,
  right: AggregateField
): boolean {
  return left.type === right.type && left._datum === right._datum;
}

////////////////////////////////////////////////////////////////////////////////
// New aggregate query and snapshot functions.
////////////////////////////////////////////////////////////////////////////////

export type AggregateSpec = { [field: string]: AggregateField };

export type AggregateSpecData<T extends AggregateSpec> = {
  [Property in keyof T]-?: T[Property]['_datum'];
};

export class AggregateQuerySnapshot<T extends AggregateSpec> {
  // type: "AggregateQuerySnapshot";
  readonly type = 'AggregateQuerySnapshot';

  // private constructor(private readonly _data: AggregateSpecData<T>) {
  // }
  constructor(
    readonly query: Query<unknown>,
    protected readonly _data: AggregateSpecData<T>
  ) {}

  data(): AggregateSpecData<T> {
    return this._data;
  }
}

export function getCountFromServer(
  query: Query<unknown>
): Promise<AggregateQuerySnapshot<AggregateSpec>> {
  // ): Promise<AggregateQuerySnapshot<{ count: CountAggregateField }>> {
  return getAggregateFromServer(query, { count: count() });
}

export function getAggregateFromServer<T extends AggregateSpec>(
  query: Query<unknown>,
  aggregates: T
): Promise<AggregateQuerySnapshot<AggregateSpec>> {
  const firestore = cast(query.firestore, Firestore);
  const datastore = getDatastore(firestore);
  const userDataWriter = new LiteUserDataWriter(firestore);

  // console.log('aggregates', Object.keys(aggregates));

  return invokeRunAggregationQueryRpc(datastore, query._query, aggregates).then(
    result => {
      hardAssert(
        result[0] !== undefined,
        'Aggregation fields are missing from result.'
      );

      const counts = Object.entries(result[0])
        // .filter(([key, value]) => Object.keys(aggregates).includes(key))
        .filter(([key, value]) => key === 'count_alias')
        .map(([key, value]) => userDataWriter.convertValue(value as Value));

      const countValue = counts[0];

      hardAssert(
        typeof countValue === 'number',
        'Count aggeragte field value is not a number: ' + countValue
      );

      return Promise.resolve(
        new AggregateQuerySnapshot(query, { count: countValue })
      );
    }
  );
}

export function aggregateSnapshotEqual<T extends AggregateSpec>(
  left: AggregateQuerySnapshot<T>,
  right: AggregateQuerySnapshot<T>
): boolean {
  return (
    queryEqual(left.query, right.query) && deepEqual(left.data(), right.data())
  );
}
