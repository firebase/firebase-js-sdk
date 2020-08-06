/**
 * @license
 * Copyright 2017 Google LLC
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

import * as firestore from '@firebase/firestore-types';
import { expect } from 'chai';

import { addEqualityMatcher } from '../../util/equality_matcher';
import { Deferred } from '../../util/promise';
import { EventsAccumulator } from '../util/events_accumulator';
import * as firebaseExport from '../util/firebase_export';
import {
  apiDescribe,
  isRunningAgainstEmulator,
  notEqualOp,
  notInOp,
  toChangesArray,
  toDataArray,
  withTestCollection,
  withTestDb
} from '../util/helpers';

const Blob = firebaseExport.Blob;
const FieldPath = firebaseExport.FieldPath;
const GeoPoint = firebaseExport.GeoPoint;
const Timestamp = firebaseExport.Timestamp;

apiDescribe('Queries', (persistence: boolean) => {
  addEqualityMatcher();

  it('can issue limit queries', () => {
    const testDocs = {
      a: { k: 'a' },
      b: { k: 'b' },
      c: { k: 'c' }
    };
    return withTestCollection(persistence, testDocs, collection => {
      return collection
        .limit(2)
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([{ k: 'a' }, { k: 'b' }]);
        });
    });
  });

  it('cannot issue limitToLast queries without explicit order-by', () => {
    return withTestCollection(persistence, {}, async collection => {
      const expectedError =
        'limitToLast() queries require specifying at least one orderBy() clause';
      expect(() => collection.limitToLast(2).get()).to.throw(expectedError);
    });
  });

  it('can issue limit queries using descending sort order', () => {
    const testDocs = {
      a: { k: 'a', sort: 0 },
      b: { k: 'b', sort: 1 },
      c: { k: 'c', sort: 1 },
      d: { k: 'd', sort: 2 }
    };
    return withTestCollection(persistence, testDocs, collection => {
      return collection
        .orderBy('sort', 'desc')
        .limit(2)
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([
            { k: 'd', sort: 2 },
            { k: 'c', sort: 1 }
          ]);
        });
    });
  });

  it('can issue limitToLast queries using descending sort order', () => {
    const testDocs = {
      a: { k: 'a', sort: 0 },
      b: { k: 'b', sort: 1 },
      c: { k: 'c', sort: 1 },
      d: { k: 'd', sort: 2 }
    };
    return withTestCollection(persistence, testDocs, collection => {
      return collection
        .orderBy('sort', 'desc')
        .limitToLast(2)
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([
            { k: 'b', sort: 1 },
            { k: 'a', sort: 0 }
          ]);
        });
    });
  });

  it('can listen to limitToLast queries', () => {
    const testDocs = {
      a: { k: 'a', sort: 0 },
      b: { k: 'b', sort: 1 },
      c: { k: 'c', sort: 1 },
      d: { k: 'd', sort: 2 }
    };
    return withTestCollection(persistence, testDocs, async collection => {
      const storeEvent = new EventsAccumulator<firestore.QuerySnapshot>();
      collection
        .orderBy('sort', 'desc')
        .limitToLast(2)
        .onSnapshot(storeEvent.storeEvent);

      let snapshot = await storeEvent.awaitEvent();
      expect(toDataArray(snapshot)).to.deep.equal([
        { k: 'b', sort: 1 },
        { k: 'a', sort: 0 }
      ]);

      await collection.add({ k: 'e', sort: -1 });
      snapshot = await storeEvent.awaitEvent();
      expect(toDataArray(snapshot)).to.deep.equal([
        { k: 'a', sort: 0 },
        { k: 'e', sort: -1 }
      ]);
    });
  });

  // Two queries that mapped to the same target ID are referred to as
  // "mirror queries". An example for a mirror query is a limitToLast()
  // query and a limit() query that share the same backend Target ID.
  // Since limitToLast() queries are sent to the backend with a modified
  // orderBy() clause, they can map to the same target representation as
  // limit() query, even if both queries appear separate to the user.
  it('can listen/unlisten/relisten to mirror queries', () => {
    const testDocs = {
      a: { k: 'a', sort: 0 },
      b: { k: 'b', sort: 1 },
      c: { k: 'c', sort: 1 },
      d: { k: 'd', sort: 2 }
    };
    return withTestCollection(persistence, testDocs, async collection => {
      // Setup `limit` query
      const storeLimitEvent = new EventsAccumulator<firestore.QuerySnapshot>();
      let limitUnlisten = collection
        .orderBy('sort', 'asc')
        .limit(2)
        .onSnapshot(storeLimitEvent.storeEvent);

      // Setup mirroring `limitToLast` query
      const storeLimitToLastEvent = new EventsAccumulator<
        firestore.QuerySnapshot
      >();
      let limitToLastUnlisten = collection
        .orderBy('sort', 'desc')
        .limitToLast(2)
        .onSnapshot(storeLimitToLastEvent.storeEvent);

      // Verify both queries get expected results.
      let snapshot = await storeLimitEvent.awaitEvent();
      expect(toDataArray(snapshot)).to.deep.equal([
        { k: 'a', sort: 0 },
        { k: 'b', sort: 1 }
      ]);
      snapshot = await storeLimitToLastEvent.awaitEvent();
      expect(toDataArray(snapshot)).to.deep.equal([
        { k: 'b', sort: 1 },
        { k: 'a', sort: 0 }
      ]);

      // Unlisten then relisten limit query.
      limitUnlisten();
      limitUnlisten = collection
        .orderBy('sort', 'asc')
        .limit(2)
        .onSnapshot(storeLimitEvent.storeEvent);

      // Verify `limit` query still works.
      snapshot = await storeLimitEvent.awaitEvent();
      expect(toDataArray(snapshot)).to.deep.equal([
        { k: 'a', sort: 0 },
        { k: 'b', sort: 1 }
      ]);

      // Add a document that would change the result set.
      await collection.add({ k: 'e', sort: -1 });

      // Verify both queries get expected results.
      snapshot = await storeLimitEvent.awaitEvent();
      expect(toDataArray(snapshot)).to.deep.equal([
        { k: 'e', sort: -1 },
        { k: 'a', sort: 0 }
      ]);
      snapshot = await storeLimitToLastEvent.awaitEvent();
      expect(toDataArray(snapshot)).to.deep.equal([
        { k: 'a', sort: 0 },
        { k: 'e', sort: -1 }
      ]);

      // Unlisten to limitToLast, update a doc, then relisten limitToLast.
      limitToLastUnlisten();
      await collection.doc('a').update({ k: 'a', sort: -2 });
      limitToLastUnlisten = collection
        .orderBy('sort', 'desc')
        .limitToLast(2)
        .onSnapshot(storeLimitToLastEvent.storeEvent);

      // Verify both queries get expected results.
      snapshot = await storeLimitEvent.awaitEvent();
      expect(toDataArray(snapshot)).to.deep.equal([
        { k: 'a', sort: -2 },
        { k: 'e', sort: -1 }
      ]);
      snapshot = await storeLimitToLastEvent.awaitEvent();
      expect(toDataArray(snapshot)).to.deep.equal([
        { k: 'e', sort: -1 },
        { k: 'a', sort: -2 }
      ]);
    });
  });

  it('key order is descending for descending inequality', () => {
    const testDocs = {
      a: {
        foo: 42
      },
      b: {
        foo: 42.0
      },
      c: {
        foo: 42
      },
      d: {
        foo: 21
      },
      e: {
        foo: 21
      },
      f: {
        foo: 66
      },
      g: {
        foo: 66
      }
    };
    return withTestCollection(persistence, testDocs, coll => {
      return coll
        .where('foo', '>', 21.0)
        .orderBy('foo', 'desc')
        .get()
        .then(docs => {
          expect(docs.docs.map(d => d.id)).to.deep.equal([
            'g',
            'f',
            'c',
            'b',
            'a'
          ]);
        });
    });
  });

  it('can use unary filters', () => {
    const testDocs = {
      a: { null: null, nan: NaN },
      b: { null: null, nan: 0 },
      c: { null: false, nan: NaN }
    };
    return withTestCollection(persistence, testDocs, coll => {
      return coll
        .where('null', '==', null)
        .where('nan', '==', NaN)
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([{ null: null, nan: NaN }]);
        });
    });
  });

  it('can filter on infinity', () => {
    const testDocs = {
      a: { inf: Infinity },
      b: { inf: -Infinity }
    };
    return withTestCollection(persistence, testDocs, coll => {
      return coll
        .where('inf', '==', Infinity)
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([{ inf: Infinity }]);
        });
    });
  });

  it('will not get metadata only updates', () => {
    const testDocs = { a: { v: 'a' }, b: { v: 'b' } };
    return withTestCollection(persistence, testDocs, coll => {
      const storeEvent = new EventsAccumulator<firestore.QuerySnapshot>();
      let unlisten: (() => void) | null = null;
      return Promise.all([
        coll.doc('a').set({ v: 'a' }),
        coll.doc('b').set({ v: 'b' })
      ])
        .then(() => {
          unlisten = coll.onSnapshot(storeEvent.storeEvent);
          return storeEvent.awaitEvent();
        })
        .then(querySnap => {
          expect(toDataArray(querySnap)).to.deep.equal([
            { v: 'a' },
            { v: 'b' }
          ]);
          return coll.doc('a').set({ v: 'a1' });
        })
        .then(() => {
          return storeEvent.awaitEvent();
        })
        .then(querySnap => {
          expect(toDataArray(querySnap)).to.deep.equal([
            { v: 'a1' },
            { v: 'b' }
          ]);
          return storeEvent.assertNoAdditionalEvents();
        })
        .then(() => {
          unlisten!();
        });
    });
  });

  it('can listen for the same query with different options', () => {
    const testDocs = { a: { v: 'a' }, b: { v: 'b' } };
    return withTestCollection(persistence, testDocs, coll => {
      const storeEvent = new EventsAccumulator<firestore.QuerySnapshot>();
      const storeEventFull = new EventsAccumulator<firestore.QuerySnapshot>();
      const unlisten1 = coll.onSnapshot(storeEvent.storeEvent);
      const unlisten2 = coll.onSnapshot(
        { includeMetadataChanges: true },
        storeEventFull.storeEvent
      );

      return storeEvent
        .awaitEvent()
        .then(querySnap => {
          expect(toDataArray(querySnap)).to.deep.equal([
            { v: 'a' },
            { v: 'b' }
          ]);
          return storeEventFull.awaitEvent();
        })
        .then(async querySnap => {
          expect(toDataArray(querySnap)).to.deep.equal([
            { v: 'a' },
            { v: 'b' }
          ]);
          if (querySnap.metadata.fromCache) {
            // We might receive an additional event if the first query snapshot
            // was served from cache.
            await storeEventFull.awaitEvent();
          }
          return coll.doc('a').set({ v: 'a1' });
        })
        .then(() => {
          return storeEventFull.awaitEvents(2);
        })
        .then(events => {
          // Expect two events for the write, once from latency compensation
          // and once from the acknowledgment from the server.
          expect(toDataArray(events[0])).to.deep.equal([
            { v: 'a1' },
            { v: 'b' }
          ]);
          expect(toDataArray(events[1])).to.deep.equal([
            { v: 'a1' },
            { v: 'b' }
          ]);
          const localResult = events[0].docs;
          expect(localResult[0].metadata.hasPendingWrites).to.equal(true);
          const syncedResults = events[1].docs;
          expect(syncedResults[0].metadata.hasPendingWrites).to.equal(false);

          return storeEvent.awaitEvent();
        })
        .then(querySnap => {
          // Expect only one event for the write.
          expect(toDataArray(querySnap)).to.deep.equal([
            { v: 'a1' },
            { v: 'b' }
          ]);
          return storeEvent.assertNoAdditionalEvents();
        })
        .then(() => {
          storeEvent.allowAdditionalEvents();
          return coll.doc('b').set({ v: 'b1' });
        })
        .then(() => {
          return storeEvent.awaitEvent();
        })
        .then(querySnap => {
          // Expect only one event from the second write
          expect(toDataArray(querySnap)).to.deep.equal([
            { v: 'a1' },
            { v: 'b1' }
          ]);
          return storeEventFull.awaitEvents(2);
        })
        .then(events => {
          // Expect 2 events from the second write.
          expect(toDataArray(events[0])).to.deep.equal([
            { v: 'a1' },
            { v: 'b1' }
          ]);
          expect(toDataArray(events[1])).to.deep.equal([
            { v: 'a1' },
            { v: 'b1' }
          ]);
          const localResults = events[0].docs;
          expect(localResults[1].metadata.hasPendingWrites).to.equal(true);
          const syncedResults = events[1].docs;
          expect(syncedResults[1].metadata.hasPendingWrites).to.equal(false);
          return storeEvent.assertNoAdditionalEvents();
        })
        .then(() => {
          return storeEventFull.assertNoAdditionalEvents();
        })
        .then(() => {
          unlisten1!();
          unlisten2!();
        });
    });
  });

  it('can issue queries with Dates differing in milliseconds', () => {
    const date1 = new Date();
    date1.setMilliseconds(0);
    const date2 = new Date(date1.getTime());
    date2.setMilliseconds(1);
    const date3 = new Date(date1.getTime());
    date3.setMilliseconds(2);

    const testDocs = {
      '1': { id: '1', date: date1 },
      '2': { id: '2', date: date2 },
      '3': { id: '3', date: date3 }
    };
    return withTestCollection(persistence, testDocs, coll => {
      // Make sure to issue the queries in parallel
      const docs1Promise = coll.where('date', '>', date1).get();
      const docs2Promise = coll.where('date', '>', date2).get();

      return Promise.all([docs1Promise, docs2Promise]).then(results => {
        const docs1 = results[0];
        const docs2 = results[1];

        expect(toDataArray(docs1)).to.deep.equal([
          { id: '2', date: Timestamp.fromDate(date2) },
          { id: '3', date: Timestamp.fromDate(date3) }
        ]);
        expect(toDataArray(docs2)).to.deep.equal([
          { id: '3', date: Timestamp.fromDate(date3) }
        ]);
      });
    });
  });

  it('can listen for QueryMetadata changes', () => {
    const testDocs = {
      '1': { sort: 1, filter: true, key: '1' },
      '2': { sort: 2, filter: true, key: '2' },
      '3': { sort: 2, filter: true, key: '3' },
      '4': { sort: 3, filter: false, key: '4' }
    };
    return withTestCollection(persistence, testDocs, coll => {
      const query = coll.where('key', '<', '4');
      const accum = new EventsAccumulator<firestore.QuerySnapshot>();
      let unlisten2: () => void;
      const unlisten1 = query.onSnapshot(result => {
        expect(toDataArray(result)).to.deep.equal([
          testDocs[1],
          testDocs[2],
          testDocs[3]
        ]);
        const query2 = coll.where('filter', '==', true);
        unlisten2 = query2.onSnapshot(
          {
            includeMetadataChanges: true
          },
          accum.storeEvent
        );
      });
      return accum.awaitEvents(2).then(events => {
        const results1 = events[0];
        const results2 = events[1];
        expect(toDataArray(results1)).to.deep.equal([
          testDocs[1],
          testDocs[2],
          testDocs[3]
        ]);
        expect(toDataArray(results1)).to.deep.equal(toDataArray(results2));
        expect(results1.metadata.fromCache).to.equal(true);
        expect(results2.metadata.fromCache).to.equal(false);
        unlisten1();
        unlisten2();
      });
    });
  });

  it('can listen for metadata changes', () => {
    const initialDoc = {
      foo: { a: 'b', v: 1 }
    };
    const modifiedDoc = {
      foo: { a: 'b', v: 2 }
    };
    return withTestCollection(persistence, initialDoc, async coll => {
      const accum = new EventsAccumulator<firestore.QuerySnapshot>();
      const unlisten = coll.onSnapshot(
        { includeMetadataChanges: true },
        accum.storeEvent
      );

      await accum.awaitEvents(1).then(events => {
        const results1 = events[0];
        expect(toDataArray(results1)).to.deep.equal([initialDoc['foo']]);
      });
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      coll.doc('foo').set(modifiedDoc['foo']);

      await accum.awaitEvents(2).then(events => {
        const results1 = events[0];
        expect(toDataArray(results1)).to.deep.equal([modifiedDoc['foo']]);
        expect(toChangesArray(results1)).to.deep.equal([modifiedDoc['foo']]);

        const results2 = events[1];
        expect(toDataArray(results2)).to.deep.equal([modifiedDoc['foo']]);
        expect(toChangesArray(results2)).to.deep.equal([]);
        expect(
          toChangesArray(results2, { includeMetadataChanges: true })
        ).to.deep.equal([modifiedDoc['foo']]);
      });

      unlisten();
    });
  });

  it('can explicitly sort by document ID', () => {
    const testDocs = {
      a: { key: 'a' },
      b: { key: 'b' },
      c: { key: 'c' }
    };
    return withTestCollection(persistence, testDocs, coll => {
      // Ideally this would be descending to validate it's different than
      // the default, but that requires an extra index
      return coll
        .orderBy(FieldPath.documentId())
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([
            testDocs['a'],
            testDocs['b'],
            testDocs['c']
          ]);
        });
    });
  });

  it('can query by document ID', () => {
    const testDocs = {
      aa: { key: 'aa' },
      ab: { key: 'ab' },
      ba: { key: 'ba' },
      bb: { key: 'bb' }
    };
    return withTestCollection(persistence, testDocs, coll => {
      return coll
        .where(FieldPath.documentId(), '==', 'ab')
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([testDocs['ab']]);
          return coll
            .where(FieldPath.documentId(), '>', 'aa')
            .where(FieldPath.documentId(), '<=', 'ba')
            .get();
        })
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([
            testDocs['ab'],
            testDocs['ba']
          ]);
        });
    });
  });

  it('can query by document ID using refs', () => {
    const testDocs = {
      aa: { key: 'aa' },
      ab: { key: 'ab' },
      ba: { key: 'ba' },
      bb: { key: 'bb' }
    };
    return withTestCollection(persistence, testDocs, coll => {
      return coll
        .where(FieldPath.documentId(), '==', coll.doc('ab'))
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([testDocs['ab']]);
          return coll
            .where(FieldPath.documentId(), '>', coll.doc('aa'))
            .where(FieldPath.documentId(), '<=', coll.doc('ba'))
            .get();
        })
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([
            testDocs['ab'],
            testDocs['ba']
          ]);
        });
    });
  });

  it('can query while reconnecting to network', () => {
    return withTestCollection(persistence, /* docs= */ {}, coll => {
      const deferred = new Deferred<void>();

      const unregister = coll.onSnapshot(
        { includeMetadataChanges: true },
        snapshot => {
          if (!snapshot.empty && !snapshot.metadata.fromCache) {
            deferred.resolve();
          }
        }
      );
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      coll.firestore.disableNetwork().then(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        coll.doc().set({ a: 1 });
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        coll.firestore.enableNetwork();
      });

      return deferred.promise.then(unregister);
    });
  });

  it('trigger with isFromCache=true when offline', () => {
    return withTestCollection(persistence, { a: { foo: 1 } }, coll => {
      const firestore = coll.firestore;
      const accum = new EventsAccumulator<firestore.QuerySnapshot>();
      const unregister = coll.onSnapshot(
        { includeMetadataChanges: true },
        accum.storeEvent
      );

      return accum
        .awaitEvent()
        .then(querySnap => {
          // initial event
          expect(querySnap.docs.map(doc => doc.data())).to.deep.equal([
            { foo: 1 }
          ]);
          expect(querySnap.metadata.fromCache).to.be.false;
        })
        .then(() => firestore.disableNetwork())
        .then(() => accum.awaitEvent())
        .then(querySnap => {
          // offline event with fromCache = true
          expect(querySnap.metadata.fromCache).to.be.true;
        })
        .then(() => firestore.enableNetwork())
        .then(() => accum.awaitEvent())
        .then(querySnap => {
          // back online event with fromCache = false
          expect(querySnap.metadata.fromCache).to.be.false;
          unregister();
        });
    });
  });

  // eslint-disable-next-line no-restricted-properties
  (isRunningAgainstEmulator() ? it : it.skip)(
    'can use != filters',
    async () => {
      const testDocs = {
        a: { zip: 98101 },
        b: { zip: 91102 },
        c: { zip: '98101' },
        d: { zip: [98101] },
        e: { zip: ['98101', { zip: 98101 }] },
        f: { zip: { code: 500 } },
        g: { zip: [98101, 98102] },
        h: { code: 500 },
        i: { zip: null },
        j: { zip: Number.NaN }
      };

      await withTestCollection(persistence, testDocs, async coll => {
        let expected = { ...testDocs };
        delete expected.a;
        delete expected.h;
        delete expected.i;
        const snapshot = await coll.where('zip', notEqualOp, 98101).get();
        expect(toDataArray(snapshot)).to.have.deep.members(
          Object.values(expected)
        );

        // With objects.
        const snapshot2 = await coll
          .where('zip', notEqualOp, { code: 500 })
          .get();
        expected = { ...testDocs };
        delete expected.f;
        delete expected.h;
        delete expected.i;
        expect(toDataArray(snapshot2)).to.have.deep.members(
          Object.values(expected)
        );

        // With null.
        const snapshot3 = await coll.where('zip', notEqualOp, null).get();
        expected = { ...testDocs };
        delete expected.h;
        delete expected.i;
        expect(toDataArray(snapshot3)).to.have.deep.members(
          Object.values(expected)
        );

        // With NaN.
        const snapshot4 = await coll.where('zip', notEqualOp, Number.NaN).get();
        expected = { ...testDocs };
        delete expected.h;
        delete expected.i;
        delete expected.j;
        expect(toDataArray(snapshot4)).to.have.deep.members(
          Object.values(expected)
        );
      });
    }
  );

  it('can use array-contains filters', async () => {
    const testDocs = {
      a: { array: [42] },
      b: { array: ['a', 42, 'c'] },
      c: { array: [41.999, '42', { a: [42] }] },
      d: { array: [42], array2: ['bingo'] }
    };

    await withTestCollection(persistence, testDocs, async coll => {
      // Search for 42
      const snapshot = await coll.where('array', 'array-contains', 42).get();
      expect(toDataArray(snapshot)).to.deep.equal([
        { array: [42] },
        { array: ['a', 42, 'c'] },
        { array: [42], array2: ['bingo'] }
      ]);

      // NOTE: The backend doesn't currently support null, NaN, objects, or
      // arrays, so there isn't much of anything else interesting to test.
    });
  });

  it('can use IN filters', async () => {
    const testDocs = {
      a: { zip: 98101 },
      b: { zip: 91102 },
      c: { zip: 98103 },
      d: { zip: [98101] },
      e: { zip: ['98101', { zip: 98101 }] },
      f: { zip: { code: 500 } },
      g: { zip: [98101, 98102] }
    };

    await withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await coll
        .where('zip', 'in', [98101, 98103, [98101, 98102]])
        .get();
      expect(toDataArray(snapshot)).to.deep.equal([
        { zip: 98101 },
        { zip: 98103 },
        { zip: [98101, 98102] }
      ]);

      // With objects.
      const snapshot2 = await coll.where('zip', 'in', [{ code: 500 }]).get();
      expect(toDataArray(snapshot2)).to.deep.equal([{ zip: { code: 500 } }]);
    });
  });

  it('can use IN filters by document ID', async () => {
    const testDocs = {
      aa: { key: 'aa' },
      ab: { key: 'ab' },
      ba: { key: 'ba' },
      bb: { key: 'bb' }
    };
    await withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await coll
        .where(FieldPath.documentId(), 'in', ['aa', 'ab'])
        .get();

      expect(toDataArray(snapshot)).to.deep.equal([
        { key: 'aa' },
        { key: 'ab' }
      ]);
    });
  });

  // eslint-disable-next-line no-restricted-properties
  (isRunningAgainstEmulator() ? it : it.skip)(
    'can use NOT_IN filters',
    async () => {
      const testDocs = {
        a: { zip: 98101 },
        b: { zip: 91102 },
        c: { zip: 98103 },
        d: { zip: [98101] },
        e: { zip: ['98101', { zip: 98101 }] },
        f: { zip: { code: 500 } },
        g: { zip: [98101, 98102] },
        h: { code: 500 },
        i: { zip: null },
        j: { zip: Number.NaN }
      };

      await withTestCollection(persistence, testDocs, async coll => {
        let expected = { ...testDocs };
        delete expected.a;
        delete expected.c;
        delete expected.g;
        delete expected.h;
        const snapshot = await coll
          .where('zip', notInOp, [98101, 98103, [98101, 98102]])
          .get();
        expect(toDataArray(snapshot)).to.deep.equal(Object.values(expected));

        // With objects.
        const snapshot2 = await coll
          .where('zip', notInOp, [{ code: 500 }])
          .get();
        expected = { ...testDocs };
        delete expected.f;
        delete expected.h;
        expect(toDataArray(snapshot2)).to.deep.equal(Object.values(expected));

        // With null.
        const snapshot3 = await coll.where('zip', notInOp, [null]).get();
        expect(toDataArray(snapshot3)).to.deep.equal([]);

        // With NaN.
        const snapshot4 = await coll.where('zip', notInOp, [Number.NaN]).get();
        expected = { ...testDocs };
        delete expected.h;
        delete expected.j;
        expect(toDataArray(snapshot4)).to.deep.equal(Object.values(expected));

        // With NaN and a number.
        const snapshot5 = await coll
          .where('zip', notInOp, [Number.NaN, 98101])
          .get();
        expected = { ...testDocs };
        delete expected.a;
        delete expected.h;
        delete expected.j;
        expect(toDataArray(snapshot5)).to.deep.equal(Object.values(expected));
      });
    }
  );

  // eslint-disable-next-line no-restricted-properties
  (isRunningAgainstEmulator() ? it : it.skip)(
    'can use NOT_IN filters by document ID',
    async () => {
      const testDocs = {
        aa: { key: 'aa' },
        ab: { key: 'ab' },
        ba: { key: 'ba' },
        bb: { key: 'bb' }
      };
      await withTestCollection(persistence, testDocs, async coll => {
        const snapshot = await coll
          .where(FieldPath.documentId(), notInOp, ['aa', 'ab'])
          .get();

        expect(toDataArray(snapshot)).to.deep.equal([
          { key: 'ba' },
          { key: 'bb' }
        ]);
      });
    }
  );

  it('can use array-contains-any filters', async () => {
    const testDocs = {
      a: { array: [42] },
      b: { array: ['a', 42, 'c'] },
      c: { array: [41.999, '42', { a: [42] }] },
      d: { array: [42], array2: ['bingo'] },
      e: { array: [43] },
      f: { array: [{ a: 42 }] },
      g: { array: 42 }
    };

    await withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await coll
        .where('array', 'array-contains-any', [42, 43])
        .get();
      expect(toDataArray(snapshot)).to.deep.equal([
        { array: [42] },
        { array: ['a', 42, 'c'] },
        { array: [42], array2: ['bingo'] },
        { array: [43] }
      ]);

      // With objects.
      const snapshot2 = await coll
        .where('array', 'array-contains-any', [{ a: 42 }])
        .get();
      expect(toDataArray(snapshot2)).to.deep.equal([{ array: [{ a: 42 }] }]);
    });
  });

  it('can query collection groups', async () => {
    await withTestDb(persistence, async db => {
      // Use .doc() to get a random collection group name to use but ensure it starts with 'b' for
      // predictable ordering.
      const collectionGroup = 'b' + db.collection('foo').doc().id;

      const docPaths = [
        `abc/123/${collectionGroup}/cg-doc1`,
        `abc/123/${collectionGroup}/cg-doc2`,
        `${collectionGroup}/cg-doc3`,
        `${collectionGroup}/cg-doc4`,
        `def/456/${collectionGroup}/cg-doc5`,
        `${collectionGroup}/virtual-doc/nested-coll/not-cg-doc`,
        `x${collectionGroup}/not-cg-doc`,
        `${collectionGroup}x/not-cg-doc`,
        `abc/123/${collectionGroup}x/not-cg-doc`,
        `abc/123/x${collectionGroup}/not-cg-doc`,
        `abc/${collectionGroup}`
      ];
      const batch = db.batch();
      for (const docPath of docPaths) {
        batch.set(db.doc(docPath), { x: 1 });
      }
      await batch.commit();

      const querySnapshot = await db.collectionGroup(collectionGroup).get();
      expect(querySnapshot.docs.map(d => d.id)).to.deep.equal([
        'cg-doc1',
        'cg-doc2',
        'cg-doc3',
        'cg-doc4',
        'cg-doc5'
      ]);
    });
  });

  it('can query collection groups with startAt / endAt by arbitrary documentId', async () => {
    await withTestDb(persistence, async db => {
      // Use .doc() to get a random collection group name to use but ensure it starts with 'b' for
      // predictable ordering.
      const collectionGroup = 'b' + db.collection('foo').doc().id;

      const docPaths = [
        `a/a/${collectionGroup}/cg-doc1`,
        `a/b/a/b/${collectionGroup}/cg-doc2`,
        `a/b/${collectionGroup}/cg-doc3`,
        `a/b/c/d/${collectionGroup}/cg-doc4`,
        `a/c/${collectionGroup}/cg-doc5`,
        `${collectionGroup}/cg-doc6`,
        `a/b/nope/nope`
      ];
      const batch = db.batch();
      for (const docPath of docPaths) {
        batch.set(db.doc(docPath), { x: 1 });
      }
      await batch.commit();

      let querySnapshot = await db
        .collectionGroup(collectionGroup)
        .orderBy(FieldPath.documentId())
        .startAt(`a/b`)
        .endAt('a/b0')
        .get();
      expect(querySnapshot.docs.map(d => d.id)).to.deep.equal([
        'cg-doc2',
        'cg-doc3',
        'cg-doc4'
      ]);

      querySnapshot = await db
        .collectionGroup(collectionGroup)
        .orderBy(FieldPath.documentId())
        .startAfter('a/b')
        .endBefore(`a/b/${collectionGroup}/cg-doc3`)
        .get();
      expect(querySnapshot.docs.map(d => d.id)).to.deep.equal(['cg-doc2']);
    });
  });

  it('can query collection groups with where filters on arbitrary documentId', async () => {
    await withTestDb(persistence, async db => {
      // Use .doc() to get a random collection group name to use but ensure it starts with 'b' for
      // predictable ordering.
      const collectionGroup = 'b' + db.collection('foo').doc().id;

      const docPaths = [
        `a/a/${collectionGroup}/cg-doc1`,
        `a/b/a/b/${collectionGroup}/cg-doc2`,
        `a/b/${collectionGroup}/cg-doc3`,
        `a/b/c/d/${collectionGroup}/cg-doc4`,
        `a/c/${collectionGroup}/cg-doc5`,
        `${collectionGroup}/cg-doc6`,
        `a/b/nope/nope`
      ];
      const batch = db.batch();
      for (const docPath of docPaths) {
        batch.set(db.doc(docPath), { x: 1 });
      }
      await batch.commit();

      let querySnapshot = await db
        .collectionGroup(collectionGroup)
        .where(FieldPath.documentId(), '>=', `a/b`)
        .where(FieldPath.documentId(), '<=', 'a/b0')
        .get();
      expect(querySnapshot.docs.map(d => d.id)).to.deep.equal([
        'cg-doc2',
        'cg-doc3',
        'cg-doc4'
      ]);

      querySnapshot = await db
        .collectionGroup(collectionGroup)
        .where(FieldPath.documentId(), '>', `a/b`)
        .where(FieldPath.documentId(), '<', `a/b/${collectionGroup}/cg-doc3`)
        .get();
      expect(querySnapshot.docs.map(d => d.id)).to.deep.equal(['cg-doc2']);
    });
  });

  it('can query custom types', () => {
    return withTestCollection(persistence, {}, async ref => {
      const data = {
        ref: ref.firestore.doc('f/c'),
        geoPoint: new GeoPoint(0, 0),
        buffer: Blob.fromBase64String('Zm9v'),
        time: Timestamp.now(),
        array: [
          ref.firestore.doc('f/c'),
          new GeoPoint(0, 0),
          Blob.fromBase64String('Zm9v'),
          Timestamp.now()
        ]
      };
      await ref.add({ data });

      // In https://github.com/firebase/firebase-js-sdk/issues/1524, a
      // customer was not able to unlisten from a query that contained a
      // nested object with a DocumentReference. The cause of it was that our
      // serialization of nested references via JSON.stringify() was different
      // for Queries created via the API layer versus Queries read from
      // persistence. To simulate this issue, we have to listen and unlisten
      // to the same query twice.
      const query = ref.where('data', '==', data);

      for (let i = 0; i < 2; ++i) {
        const deferred = new Deferred();
        const unsubscribe = query.onSnapshot(snapshot => {
          expect(snapshot.size).to.equal(1);
          deferred.resolve();
        });
        await deferred.promise;
        unsubscribe();
      }
    });
  });

  it('can use filter with nested field', () => {
    // Reproduces https://github.com/firebase/firebase-js-sdk/issues/2204
    const testDocs = {
      a: {},
      b: { map: {} },
      c: { map: { nested: {} } },
      d: { map: { nested: 'foo' } }
    };

    return withTestCollection(persistence, testDocs, async coll => {
      await coll.get(); // Populate the cache
      const snapshot = await coll.where('map.nested', '==', 'foo').get();
      expect(toDataArray(snapshot)).to.deep.equal([{ map: { nested: 'foo' } }]);
    });
  });
});
