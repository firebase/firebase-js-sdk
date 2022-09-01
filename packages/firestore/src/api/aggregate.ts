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

import { firestoreClientRunAggregationQuery } from '../core/firestore_client';
import { AggregateQuery, AggregateQuerySnapshot } from '../lite-api/aggregate';
import { cast } from '../util/input_validation';

import { ensureFirestoreConfigured, Firestore } from './database';

export {
  AggregateQuery,
  AggregateQuerySnapshot,
  aggregateQueryEqual,
  aggregateQuerySnapshotEqual,
  countQuery
} from '../lite-api/aggregate';

export function getAggregateFromServerDirect(
  query: AggregateQuery
): Promise<AggregateQuerySnapshot> {
  const firestore = cast(query.query.firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);
  return firestoreClientRunAggregationQuery(client, query);
}
