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

import { Value } from '../protos/firestore_proto_api';
import { invokeRunAggregationQueryRpc } from '../remote/datastore';
import { hardAssert } from '../util/assert';
import { cast } from '../util/input_validation';

import { getDatastore } from './components';
import { Firestore } from './database';
import { Query, queryEqual } from './reference';
import { LiteUserDataWriter } from './reference_impl';

/**
 * An `AggregateQuery` computes some aggregation statistics from the result set of
 * a base `Query`.
 */
export class AggregateQuery {
  readonly type = 'AggregateQuery';
  /**
   * The query on which you called `countQuery` in order to get this `AggregateQuery`.
   */
  readonly query: Query<unknown>;

  /** @hideconstructor */
  constructor(query: Query<unknown>) {
    this.query = query;
  }
}

/**
 * An `AggregateQuerySnapshot` contains results of a `AggregateQuery`.
 */
export class AggregateQuerySnapshot {
  readonly type = 'AggregateQuerySnapshot';
  readonly query: AggregateQuery;

  /** @hideconstructor */
  constructor(query: AggregateQuery, private readonly _count: number) {
    this.query = query;
  }

  /**
   * @returns The result of a document count aggregation. Returns null if no count aggregation is
   * available in the result.
   */
  getCount(): number | null {
    return this._count;
  }
}

/**
 * Creates an `AggregateQuery` counting the number of documents matching this query.
 *
 * @returns An `AggregateQuery` object that can be used to count the number of documents in
 * the result set of this query.
 */
export function countQuery(query: Query<unknown>): AggregateQuery {
  return new AggregateQuery(query);
}

export function getAggregateFromServerDirect(
  query: AggregateQuery
): Promise<AggregateQuerySnapshot> {
  const firestore = cast(query.query.firestore, Firestore);
  const datastore = getDatastore(firestore);
  const userDataWriter = new LiteUserDataWriter(firestore);

  return invokeRunAggregationQueryRpc(datastore, query).then(result => {
    hardAssert(
      result[0] !== undefined,
      'Aggregation fields are missing from result.'
    );

    const counts = Object.entries(result[0])
      .filter(([key, value]) => key === 'count_alias')
      .map(([key, value]) => userDataWriter.convertValue(value as Value));

    const count = counts[0];
    hardAssert(
      typeof count === 'number',
      'Count aggeragte field value is not a number: ' + count
    );

    return Promise.resolve(new AggregateQuerySnapshot(query, count));
  });
}

export function aggregateQueryEqual(
  left: AggregateQuery,
  right: AggregateQuery
): boolean {
  return queryEqual(left.query, right.query);
}

export function aggregateQuerySnapshotEqual(
  left: AggregateQuerySnapshot,
  right: AggregateQuerySnapshot
): boolean {
  return (
    aggregateQueryEqual(left.query, right.query) &&
    left.getCount() === right.getCount()
  );
}
