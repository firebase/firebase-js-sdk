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

import { expect } from 'chai';

import {
  AggregateQuery,
  AggregateQuerySnapshot,
  CollectionReference,
  DocumentReference,
  Firestore,
  aggregateQuery,
  aggregateQueryEqual,
  aggregateSnapshotEqual,
  average,
  collection,
  count,
  countQuery,
  disableNetwork,
  doc,
  enableNetwork,
  first,
  getAggregate,
  getAggregateFromCache,
  getAggregateFromServer,
  last,
  max,
  min,
  onAggregateSnapshot,
  setDoc,
  sum,
  waitForPendingWrites,
} from '../util/firebase_export';
import {Deferred} from '../../util/promise';


class AggregateDemo {

  readonly doc: DocumentReference;
  readonly coll: CollectionReference;
  readonly coll1: CollectionReference;
  readonly coll2: CollectionReference;
  readonly aggregateQuery: AggregateQuery;

  constructor(readonly db: Firestore) {
    this.coll = collection(db, "MyCoolCollection");
    this.coll1 = collection(db, "MyCoolCollection1");
    this.coll2 = collection(db, "MyCoolCollection2");
    this.doc = doc(this.coll, "MyCoolDocument");
    this.aggregateQuery = aggregateQuery(this.coll, count());
  }

  async CountQuery() {
    const snapshot = await getAggregate(aggregateQuery(this.coll, count()));
    expect(snapshot.get(count())).to.equal(50);
  }

  async CountQuery_UsingConvenienceMethod() {
    // Note the use of countQuery() instead of aggregateQuery(..., count()).
    const snapshot = await getAggregate(countQuery(this.coll));
    expect(snapshot.get(count())).to.equal(50);
  }

  async CountQuery_CountUpTo() {
    // Note the use of `upTo` to cap the count, and possibly backend work.
    const snapshot = await getAggregate(aggregateQuery(this.coll, count({upTo: 20})));
    expect(snapshot.get(count())).to.equal(20);
  }

  async AggregateQuery_FromCacheAndServer() {
    const cacheSnapshot = await getAggregateFromCache(this.aggregateQuery);
    expect(cacheSnapshot.get(count())).to.equal(50);
    const serverSnapshot = await getAggregateFromServer(this.aggregateQuery);
    expect(serverSnapshot.get(count())).to.equal(50);
  }

  async AggregateQuery_FullOrLiteExecutionMode() {
    const fullSnapshot = await getAggregate(this.aggregateQuery, { mode: 'full' });
    const liteSnapshot = await getAggregate(this.aggregateQuery, { mode: 'lite' });
  }

  async AggregateQuery_Metadata() {
    const doc1 = doc(this.coll);
    await setDoc(doc1, { meaningOfLife: 42 });

    await disableNetwork(this.db);

    const cacheSnapshot1 = await getAggregateFromCache(aggregateQuery(this.coll, count()));
    expect(cacheSnapshot1.metadata.fromCache).to.be.true;
    expect(cacheSnapshot1.metadata.hasPendingWrites).to.be.false;

    setDoc(doc1, { meaningOfLife: 43 });
    const cacheSnapshot2 = await getAggregateFromCache(aggregateQuery(this.coll, count()));
    expect(cacheSnapshot2.metadata.fromCache).to.be.true;
    expect(cacheSnapshot2.metadata.hasPendingWrites).to.be.true;

    await enableNetwork(this.db);
    await waitForPendingWrites(this.db);

    const serverSnapshot = await getAggregateFromServer(aggregateQuery(this.coll, count()));
    expect(serverSnapshot.metadata.fromCache).to.be.false;
    expect(serverSnapshot.metadata.hasPendingWrites).to.be.false;
  }

  async AggregateQuery_ServerTimestampBehavior() {
    const snapshot = await getAggregate(aggregateQuery(this.coll, last('modTime')));
    snapshot.get(last('modTime'), { serverTimestamps: 'estimate' });
  }

  async AggregateQuery_AllAggregations() {
    const snapshot = await getAggregate(aggregateQuery(this.coll, count(), min('age'), max('age'), first('name'), last('name'), average('age'), sum('fingers')));
    expect(snapshot.get(count())).to.equal(50);
    expect(snapshot.get(min('age'))).to.equal(10);
    expect(snapshot.get(max('age'))).to.equal(60);
    expect(snapshot.get(first('name'))).to.equal('Aardvark');
    expect(snapshot.get(last('name'))).to.equal('Zebra');
    expect(snapshot.get(average('age'))).to.equal(25);
    expect(snapshot.get(sum('fingers'))).to.equal(900);
  }

  async AggregateQuery_Listen1() {
    const deferred = new Deferred<AggregateQuerySnapshot>();
    const unsubscribe = onAggregateSnapshot(this.aggregateQuery, {
      next: snapshot => {
        deferred.resolve(snapshot);
      },
      error: error => {
        deferred.reject(error);
      },
      complete: () => {
        console.log("done");
      }
    });

    const snapshot = await deferred.promise;
    console.log(`count is: ${snapshot.get(count())}`);

    unsubscribe();
  }

  async AggregateQuery_Listen2() {
    // This is the same as AggregateQuery_Listen1(), except that it specifies
    // the "options" arguments.
    const deferred = new Deferred<AggregateQuerySnapshot>();
    const unsubscribe = onAggregateSnapshot(this.aggregateQuery,
      { mode: 'lite', includeMetadataChanges: true },
      {
        next: snapshot => {
          deferred.resolve(snapshot);
        },
        error: error => {
          deferred.reject(error);
        },
        complete: () => {
          console.log("done");
        }
      }
    );

    const snapshot = await deferred.promise;
    console.log(`count is: ${snapshot.get(count())}`);

    unsubscribe();
  }

  async AggregateQuery_Listen3() {
    const deferred = new Deferred<AggregateQuerySnapshot>();
    const unsubscribe = onAggregateSnapshot(this.aggregateQuery,
      snapshot => {
        deferred.resolve(snapshot);
      },
      error => {
        deferred.reject(error);
      },
      () => {
        console.log("done");
      }
    );

    const snapshot = await deferred.promise;
    console.log(`count is: ${snapshot.get(count())}`);

    unsubscribe();
  }

  async AggregateQuery_Listen4() {
    // This is the same as AggregateQuery_Listen3(), except that it specifies
    // the "options" arguments.
    const deferred = new Deferred<AggregateQuerySnapshot>();
    const unsubscribe = onAggregateSnapshot(this.aggregateQuery,
      { mode: 'full', includeMetadataChanges: false },
      snapshot => {
        deferred.resolve(snapshot);
      },
      error => {
        deferred.reject(error);
      },
      () => {
        console.log("done");
      }
    );

    const snapshot = await deferred.promise;
    console.log(`count is: ${snapshot.get(count())}`);

    unsubscribe();
  }

  async AggregateQuery_Equality() {
    const aggregateQuery1a = aggregateQuery(this.coll, count());
    const aggregateQuery1b = aggregateQuery(this.coll, count());
    const aggregateQuery2a = aggregateQuery(this.coll, count({upTo: 10}));
    const aggregateQuery2b = aggregateQuery(this.coll, count({upTo: 10}));
    const aggregateQuery3a = aggregateQuery(this.coll1, min('age'), max('height'));
    const aggregateQuery3b = aggregateQuery(this.coll1, min('age'), max('height'));
    const aggregateQuery4a = aggregateQuery(this.coll2, min('age'), max('height'));
    const aggregateQuery4b = aggregateQuery(this.coll2, min('age'), max('height'));

    expect(aggregateQueryEqual(aggregateQuery1a, aggregateQuery1b)).to.be.true;
    expect(aggregateQueryEqual(aggregateQuery2a, aggregateQuery2b)).to.be.true;
    expect(aggregateQueryEqual(aggregateQuery3a, aggregateQuery3b)).to.be.true;
    expect(aggregateQueryEqual(aggregateQuery4a, aggregateQuery4b)).to.be.true;

    expect(aggregateQueryEqual(aggregateQuery1a, aggregateQuery2a)).to.be.false;
    expect(aggregateQueryEqual(aggregateQuery1a, aggregateQuery3a)).to.be.false;
    expect(aggregateQueryEqual(aggregateQuery1a, aggregateQuery4a)).to.be.false;
    expect(aggregateQueryEqual(aggregateQuery2a, aggregateQuery3a)).to.be.false;
    expect(aggregateQueryEqual(aggregateQuery2a, aggregateQuery4a)).to.be.false;
    expect(aggregateQueryEqual(aggregateQuery3a, aggregateQuery4a)).to.be.false;
  }

  async AggregateSnapshot_Equality() {
    const aggregateQuery1 = aggregateQuery(this.coll, count());
    const aggregateQuery2 = aggregateQuery(this.coll, count({upTo: 10}));
    const aggregateQuery3 = aggregateQuery(this.coll1, min('age'), max('height'));
    const aggregateQuery4 = aggregateQuery(this.coll2, min('age'), max('height'));
    const snapshot1a = await getAggregate(aggregateQuery1);
    const snapshot1b = await getAggregate(aggregateQuery1);
    const snapshot2a = await getAggregate(aggregateQuery2);
    const snapshot2b = await getAggregate(aggregateQuery2);
    const snapshot3a = await getAggregate(aggregateQuery3);
    const snapshot3b = await getAggregate(aggregateQuery3);
    const snapshot4a = await getAggregate(aggregateQuery4);
    const snapshot4b = await getAggregate(aggregateQuery4);

    expect(aggregateSnapshotEqual(snapshot1a, snapshot1b)).to.be.true;
    expect(aggregateSnapshotEqual(snapshot2a, snapshot2b)).to.be.true;
    expect(aggregateSnapshotEqual(snapshot3a, snapshot3b)).to.be.true;
    expect(aggregateSnapshotEqual(snapshot4a, snapshot4b)).to.be.true;

    expect(aggregateSnapshotEqual(snapshot1a, snapshot2a)).to.be.false;
    expect(aggregateSnapshotEqual(snapshot1a, snapshot3a)).to.be.false;
    expect(aggregateSnapshotEqual(snapshot1a, snapshot4a)).to.be.false;
    expect(aggregateSnapshotEqual(snapshot2a, snapshot3a)).to.be.false;
    expect(aggregateSnapshotEqual(snapshot2a, snapshot4a)).to.be.false;
    expect(aggregateSnapshotEqual(snapshot3a, snapshot4a)).to.be.false;
  }

}
