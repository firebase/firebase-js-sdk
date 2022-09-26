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
  AggregateField,
  AggregateQuerySnapshot,
  AggregateSpec
} from './aggregate_types';
import { getDatastore } from './components';
import { Firestore } from './database';
import { Query, queryEqual } from './reference';
import { LiteUserDataWriter } from './reference_impl';

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
  return new CountQueryRunner(query, datastore, userDataWriter).run();
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
