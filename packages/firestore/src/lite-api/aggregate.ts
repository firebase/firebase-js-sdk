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

export type DocumentFieldValue = any;

export class AggregateField<T> {
  type = 'AggregateField';
  _datum?: T = undefined;
}

export function count(): AggregateField<number> {
  return new AggregateField<number>();
}

////////////////////////////////////////////////////////////////////////////////
// New aggregate query and snapshot functions.
////////////////////////////////////////////////////////////////////////////////
export type AggregateFieldType =
  | AggregateField<number>
  | AggregateField<DocumentFieldValue | undefined>
  | AggregateField<number | undefined>;

export type AggregateSpec = { [field: string]: AggregateFieldType };

export type AggregateSpecData<T extends AggregateSpec> = {
  [Property in keyof T]-?: T[Property]['_datum'];
};

export class AggregateQuerySnapshot<T extends AggregateSpec> {
  readonly type = 'AggregateQuerySnapshot';

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

export function aggregateSnapshotEqual<T extends AggregateSpec>(
  left: AggregateQuerySnapshot<T>,
  right: AggregateQuerySnapshot<T>
): boolean {
  return (
    queryEqual(left.query, right.query) && deepEqual(left.data(), right.data())
  );
}
