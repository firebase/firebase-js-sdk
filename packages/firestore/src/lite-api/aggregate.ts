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
import {  Firestore } from './database';
import { getDatastore } from './components';
import { LiteUserDataWriter } from './reference_impl';
import { invokeRunQueryRpc } from '../remote/datastore';
import { QueryDocumentSnapshot, QuerySnapshot } from './snapshot';

export class AggregateQuery {
  readonly type = 'AggregateQuery';
    /**
   * The query on which you called {@link countQuery} in order to get this
   * `AggregateQuery`.
   * Qury type is set to unknown to avoid error caused by quey type converter.
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
  constructor(query: AggregateQuery, readonly _count: number, readonly docs:QueryDocumentSnapshot<unknown>[]) {
    this.query = query;
  }

  getCount(): number | null {
    return this._count;
  }

  getdocs(): Array<QueryDocumentSnapshot<unknown>> {
    return [...this.docs];
  }

  get count(): number | null {
    return this._count;
  }

  compare(){
    //which one we prefer?
    console.log(this.getCount())
    console.log(this.count)
  }
}

export function countQuery(query: Query<unknown>): AggregateQuery {
  return new AggregateQuery(query);
}

export function getAggregateFromServerDirect(
  aggregateQuery: AggregateQuery
): Promise<AggregateQuerySnapshot> {
  
  // const firestore = cast(aggregateQuery.query.firestore, Firestore);
  const datastore = getDatastore(aggregateQuery.query.firestore);
  const userDataWriter = new LiteUserDataWriter(aggregateQuery.query.firestore);
  console.log("===========",datastore)

  return invokeRunQueryRpc(datastore, aggregateQuery.query._query).then(result => {
    const docs = result.map(
      doc =>
        new QueryDocumentSnapshot(
          aggregateQuery.query.firestore,
          userDataWriter,
          doc.key,
          doc,
          aggregateQuery.query.converter
        )
    );

    return Promise.resolve(new AggregateQuerySnapshot(aggregateQuery, 42, docs));
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
