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

import { cast } from '../util/input_validation';
import { Query, queryEqual } from './reference';
import { Firestore } from './database';
import { getDatastore } from './components';
import { invokeRunAggregationQueryRpc, invokeRunQueryRpc } from '../remote/datastore';

export class AggregateQuery {
  readonly type = 'AggregateQuery';
  /**
   * The query on which you called {@link countQuery} in order to get this
   * `AggregateQuery`.
   * Query type is set to unknown to avoid error caused by query type converter.
   * might change it back to T after testing if the error do exist or not
   */
  readonly query: Query<unknown>;

  /** @hideconstructor */
  constructor(query: Query<unknown>) {
    this.query = query;
  }
}

export class AggregateQuerySnapshot {
  readonly type = 'AggregateQuerySnapshot';
  readonly query: AggregateQuery;

  /** @hideconstructor */
  constructor(query: AggregateQuery, readonly _count: number) {
    this.query = query;
  }

  //which one we prefer? method or accessor?
  getCount(): number | null {
    return this._count;
  }

  get count(): number | null {
    return this._count;
  }

  compare() {
    console.log(this.getCount());
    console.log(this.count);
  }
}

export function countQuery(query: Query<unknown>): AggregateQuery {
  return new AggregateQuery(query);
}

export function getAggregateFromServerDirect(
  aggregateQuery: AggregateQuery
): Promise<AggregateQuerySnapshot> {
  const firestore = cast(aggregateQuery.query.firestore, Firestore);
  const datastore = getDatastore(firestore);

return invokeRunAggregationQueryRpc(
    datastore,
    aggregateQuery.query._query
  ).then(result => {
    return Promise.resolve(
      new AggregateQuerySnapshot(aggregateQuery, result.length)
    );
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
