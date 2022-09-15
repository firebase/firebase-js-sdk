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

import { Query } from '../api';
import { firestoreClientRunCountQuery } from '../core/firestore_client';
import { AggregateField, AggregateQuerySnapshot } from '../lite-api/aggregate';
import { cast } from '../util/input_validation';

import { ensureFirestoreConfigured, Firestore } from './database';

/**
 * Executes the query and returns the results as a `AggregateQuerySnapshot` from the
 * server. Returns an error if the network is not available.
 *
 * @param query - The `Query` to execute.
 *
 * @returns A `Promise` that will be resolved with the results of the query.
 */
export function getCountFromServer(
  query: Query<unknown>
): Promise<AggregateQuerySnapshot<{ count: AggregateField<number> }>> {
  const firestore = cast(query.firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);
  return firestoreClientRunCountQuery(client, query);
}
