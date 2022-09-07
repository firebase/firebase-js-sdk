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

import { Query, SnapshotMetadata, SnapshotOptions } from '../api';
import { firestoreClientRunAggregationQuery } from '../core/firestore_client';
import {
  AggregateQuerySnapshot as AggregateQuerySnapshotLite,
  AggregateSpec,
  AggregateSpecData,
  count,
  CountAggregateField
} from '../lite-api/aggregate';
import { cast } from '../util/input_validation';

import { ensureFirestoreConfigured, Firestore } from './database';

export class AggregateQuerySnapshot<
  T extends AggregateSpec
> extends AggregateQuerySnapshotLite<T> {
  constructor(
    query: Query<unknown>,
    _data: AggregateSpecData<T>,
    private readonly metadata: SnapshotMetadata
  ) {
    super(query, _data);
  }

  data(options: SnapshotOptions = {}): AggregateSpecData<T> {
    return super.data();
  }
}

export function getCountFromServer(
  query: Query<unknown>
): Promise<AggregateQuerySnapshot<AggregateSpec>> {
  const firestore = cast(query.firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);
  return firestoreClientRunAggregationQuery(client, query, {
    count: count()
  }).then(snapshot => {
    console.log(snapshot);
    return snapshot;
  });
}

////////////////////////////////////////////////////////////////////////////////
// NOT implemented functions
////////////////////////////////////////////////////////////////////////////////

export function getCount(
  query: Query<unknown>
): Promise<AggregateQuerySnapshot<{ count: CountAggregateField }>> {
  throw new Error('not implemented');
}

export function getCountFromCache(
  query: Query<unknown>
): Promise<AggregateQuerySnapshot<{ count: CountAggregateField }>> {
  throw new Error('not implemented');
}

export function getAggregate<T extends AggregateSpec>(
  query: Query<unknown>,
  aggregates: T
): Promise<AggregateQuerySnapshot<T>> {
  throw new Error('not implemented');
}

export function getAggregateFromServer<T extends AggregateSpec>(
  query: Query<unknown>,
  aggregates: T
): Promise<AggregateQuerySnapshot<T>> {
  throw new Error('not implemented');
}

export function getAggregateFromCache<T extends AggregateSpec>(
  query: Query<unknown>,
  aggregates: T
): Promise<AggregateQuerySnapshot<T>> {
  throw new Error('not implemented');
}
