/**
 * @license
 * Copyright 2017 Google Inc.
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

import { querySnapshot } from '../../util/api_helpers';
import { addEqualityMatcher } from '../../util/equality_matcher';
import { keys } from '../../util/helpers';
import { Deferred } from '../../util/promise';
import { EventsAccumulator } from '../util/events_accumulator';
import firebase from '../util/firebase_export';
import {
  apiDescribe,
  arrayContainsAnyOp,
  inOp,
  isRunningAgainstEmulator,
  toChangesArray,
  toDataArray,
  withTestCollection,
  withTestDb
} from '../util/helpers';

// tslint:disable:no-floating-promises

const Blob = firebase.firestore!.Blob;
const FieldPath = firebase.firestore!.FieldPath;
const GeoPoint = firebase.firestore!.GeoPoint;
const Timestamp = firebase.firestore!.Timestamp;

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

      coll.firestore.disableNetwork().then(() => {
        coll.doc().set({ a: 1 });
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

  // TODO(in-queries): Enable browser tests once backend support is ready.
  (isRunningAgainstEmulator() ? it : it.skip)(
    'can use IN filters',
    async () => {
      const testDocs = {
        a: { zip: 98101 },
        b: { zip: 91102 },
        c: { zip: 98103 },
        d: { zip: [98101] },
        e: { zip: ['98101', { zip: 98101 }] },
        f: { zip: { code: 500 } }
      };

      await withTestCollection(persistence, testDocs, async coll => {
        const snapshot = await coll.where('zip', inOp, [98101, 98103]).get();
        expect(toDataArray(snapshot)).to.deep.equal([
          { zip: 98101 },
          { zip: 98103 }
        ]);

        // With objects.
        const snapshot2 = await coll.where('zip', inOp, [{ code: 500 }]).get();
        expect(toDataArray(snapshot2)).to.deep.equal([{ zip: { code: 500 } }]);
      });
    }
  );

  (isRunningAgainstEmulator() ? it : it.skip)(
    'can use IN filters by document ID',
    async () => {
      const testDocs = {
        aa: { key: 'aa' },
        ab: { key: 'ab' },
        ba: { key: 'ba' },
        bb: { key: 'bb' }
      };
      await withTestCollection(persistence, testDocs, async coll => {
        const snapshot = await coll
          .where(FieldPath.documentId(), inOp, ['aa', 'ab'])
          .get();

        expect(toDataArray(snapshot)).to.deep.equal([
          { key: 'aa' },
          { key: 'ab' }
        ]);
      });
    }
  );

  // TODO(in-queries): Enable browser tests once backend support is ready.
  (isRunningAgainstEmulator() ? it : it.skip)(
    'can use array-contains-any filters',
    async () => {
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
          .where('array', arrayContainsAnyOp, [42, 43])
          .get();
        expect(toDataArray(snapshot)).to.deep.equal([
          { array: [42] },
          { array: ['a', 42, 'c'] },
          { array: [42], array2: ['bingo'] },
          { array: [43] }
        ]);

        // With objects.
        const snapshot2 = await coll
          .where('array', arrayContainsAnyOp, [{ a: 42 }])
          .get();
        expect(toDataArray(snapshot2)).to.deep.equal([{ array: [{ a: 42 }] }]);
      });
    }
  );

  it('throws custom error when using docChanges as property', () => {
    const querySnap = querySnapshot('foo/bar', {}, {}, keys(), false, false);

    const expectedError =
      'QuerySnapshot.docChanges has been changed from a property into a method';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, We are testing invalid API usage.
    const docChange = querySnap.docChanges as any;
    expect(() => docChange.length).to.throw(expectedError);
    expect(() => {
      for (const _ of docChange) {
      }
    }).to.throw(expectedError);
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
});
