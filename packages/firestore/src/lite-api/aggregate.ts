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
import { invokeRunAggregationQueryRpc } from '../remote/datastore';
import { LiteUserDataWriter } from './reference_impl';

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

  getQuery(): Query<unknown> {
    return this.query;
  }
}

export class AggregateQuerySnapshot {
  readonly type = 'AggregateQuerySnapshot';
  readonly query: AggregateQuery;
  readonly count: number | null;

  /** @hideconstructor */
  constructor(query: AggregateQuery, count: number | null) {
    this.query = query;
    this.count = count;
  }

  /** @return The original {@link AggregateQuery} this snapshot is a result of. */
  getQuery(): AggregateQuery {
    return this.query;
  }

  /**
   * @return The result of a document count aggregation. Returns null if no count aggregation is
   *     available in the result.
   */
  getCount(): number | null {
    return this.count;
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
  const userDataWriter = new LiteUserDataWriter(firestore);

  return invokeRunAggregationQueryRpc(datastore, aggregateQuery).then(
    result => {
      const aggregationFields = new Map();
      /**
       * while getting aggregation fields from server direct, it should get only
       * one ProtoRunAggregationQueryResponse returned.
       * But we used streaming rpc here, so we will have an array of
       * (onr , or possibly more)RunAggregationQueryResponse. For this specific
       * function, we get the first RunAggregationQueryResponse only.
       */
      for (const [key, value] of Object.entries(result[0])) {
        aggregationFields.set(key, userDataWriter.convertValue(value));
      }
      return Promise.resolve(
        new AggregateQuerySnapshot(
          aggregateQuery,
          aggregationFields.get('count')
        )
      );
    }
  );
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
