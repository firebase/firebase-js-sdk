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

import { AbstractUserDataWriter, Query } from '../api';
import {
  AggregateField,
  AggregateQuerySnapshot
} from '../lite-api/aggregate_types';
import { Value } from '../protos/firestore_proto_api';
import { Datastore, invokeRunAggregationQueryRpc } from '../remote/datastore';
import { hardAssert } from '../util/assert';

/**
 * CountQueryRunner encapsulates the logic needed to run the count aggregation
 * queries.
 */
export class CountQueryRunner {
  constructor(
    private readonly query: Query<unknown>,
    private readonly datastore: Datastore,
    private readonly userDataWriter: AbstractUserDataWriter
  ) {}

  run(): Promise<AggregateQuerySnapshot<{ count: AggregateField<number> }>> {
    return invokeRunAggregationQueryRpc(this.datastore, this.query._query).then(
      result => {
        hardAssert(
          result[0] !== undefined,
          'Aggregation fields are missing from result.'
        );

        const counts = Object.entries(result[0])
          .filter(([key, value]) => key === 'count_alias')
          .map(([key, value]) =>
            this.userDataWriter.convertValue(value as Value)
          );

        const countValue = counts[0];

        hardAssert(
          typeof countValue === 'number',
          'Count aggregate field value is not a number: ' + countValue
        );

        return Promise.resolve(
          new AggregateQuerySnapshot<{ count: AggregateField<number> }>(
            this.query,
            {
              count: countValue
            }
          )
        );
      }
    );
  }
}
