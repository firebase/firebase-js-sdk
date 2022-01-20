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

import { expect } from 'chai';

import { addEqualityMatcher } from '../../util/equality_matcher';
import { Deferred } from '../../util/promise';
import { EventsAccumulator } from '../util/events_accumulator';
import {
  addDoc,
  Bytes,
  collection,
  collectionGroup,
  deleteDoc,
  disableNetwork,
  doc,
  DocumentChange,
  DocumentChangeType,
  documentId,
  enableNetwork,
  endAt,
  endBefore,
  GeoPoint,
  getDocs,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  QuerySnapshot,
  setDoc,
  startAfter,
  startAt,
  Timestamp,
  updateDoc,
  where,
  writeBatch
} from '../util/firebase_export';
import {
  apiDescribe,
  toChangesArray,
  toDataArray,
  withTestCollection,
  withTestDb
} from '../util/helpers';

apiDescribe('Queries', (persistence: boolean) => {
  addEqualityMatcher();

  it('can issue limit queries', () => {
    const testDocs = {
      a: { k: 'a' },
      b: { k: 'b' },
      c: { k: 'c' }
    };
    return withTestCollection(persistence, testDocs, collection => {
      return getDocs(query(collection, limit(2))).then(docs => {
        expect(toDataArray(docs)).to.deep.equal([{ k: 'a' }, { k: 'b' }]);
      });
    });
  });

  it('cannot issue limitToLast queries without explicit order-by', () => {
    return withTestCollection(persistence, {}, async collection => {
      const expectedError =
        'limitToLast() queries require specifying at least one orderBy() clause';
      expect(() => getDocs(query(collection, limitToLast(2)))).to.throw(
        expectedError
      );
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
      return getDocs(query(collection, orderBy('sort', 'desc'), limit(2))).then(
        docs => {
          expect(toDataArray(docs)).to.deep.equal([
            { k: 'd', sort: 2 },
            { k: 'c', sort: 1 }
          ]);
        }
      );
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
      return getDocs(
        query(collection, orderBy('sort', 'desc'), limitToLast(2))
      ).then(docs => {
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
      const storeEvent = new EventsAccumulator<QuerySnapshot>();
      onSnapshot(
        query(collection, orderBy('sort', 'desc'), limitToLast(2)),
        storeEvent.storeEvent
      );

      let snapshot = await storeEvent.awaitEvent();
      expect(toDataArray(snapshot)).to.deep.equal([
        { k: 'b', sort: 1 },
        { k: 'a', sort: 0 }
      ]);

      await addDoc(collection, { k: 'e', sort: -1 });
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
      const storeLimitEvent = new EventsAccumulator<QuerySnapshot>();
      const limitUnlisten = onSnapshot(
        query(collection, orderBy('sort', 'asc'), limit(2)),
        storeLimitEvent.storeEvent
      );

      // Setup mirroring `limitToLast` query
      const storeLimitToLastEvent = new EventsAccumulator<QuerySnapshot>();
      const limitToLastUnlisten = onSnapshot(
        query(collection, orderBy('sort', 'desc'), limitToLast(2)),
        storeLimitToLastEvent.storeEvent
      );

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
      onSnapshot(
        query(collection, orderBy('sort', 'asc'), limit(2)),
        storeLimitEvent.storeEvent
      );

      // Verify `limit` query still works.
      snapshot = await storeLimitEvent.awaitEvent();
      expect(toDataArray(snapshot)).to.deep.equal([
        { k: 'a', sort: 0 },
        { k: 'b', sort: 1 }
      ]);

      // Add a document that would change the result set.
      await addDoc(collection, { k: 'e', sort: -1 });

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
      await updateDoc(doc(collection, 'a'), { k: 'a', sort: -2 });
      onSnapshot(
        query(collection, orderBy('sort', 'desc'), limitToLast(2)),
        storeLimitToLastEvent.storeEvent
      );

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
      return getDocs(
        query(coll, where('foo', '>', 21.0), orderBy('foo', 'desc'))
      ).then(docs => {
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
      return getDocs(
        query(coll, where('null', '==', null), where('nan', '==', NaN))
      ).then(docs => {
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
      return getDocs(query(coll, where('inf', '==', Infinity))).then(docs => {
        expect(toDataArray(docs)).to.deep.equal([{ inf: Infinity }]);
      });
    });
  });

  it('will not get metadata only updates', () => {
    const testDocs = { a: { v: 'a' }, b: { v: 'b' } };
    return withTestCollection(persistence, testDocs, coll => {
      const storeEvent = new EventsAccumulator<QuerySnapshot>();
      let unlisten: (() => void) | null = null;
      return Promise.all([
        setDoc(doc(coll, 'a'), { v: 'a' }),
        setDoc(doc(coll, 'b'), { v: 'b' })
      ])
        .then(() => {
          unlisten = onSnapshot(coll, storeEvent.storeEvent);
          return storeEvent.awaitEvent();
        })
        .then(querySnap => {
          expect(toDataArray(querySnap)).to.deep.equal([
            { v: 'a' },
            { v: 'b' }
          ]);
          return setDoc(doc(coll, 'a'), { v: 'a1' });
        })
        .then(() => storeEvent.awaitEvent())
        .then(querySnap => {
          expect(toDataArray(querySnap)).to.deep.equal([
            { v: 'a1' },
            { v: 'b' }
          ]);
          return storeEvent.assertNoAdditionalEvents();
        })
        .then(() => unlisten!());
    });
  });

  it('maintains correct DocumentChange indices', async () => {
    const testDocs = {
      'a': { order: 1 },
      'b': { order: 2 },
      'c': { 'order': 3 }
    };
    await withTestCollection(persistence, testDocs, async coll => {
      const accumulator = new EventsAccumulator<QuerySnapshot>();
      const unlisten = onSnapshot(
        query(coll, orderBy('order')),
        accumulator.storeEvent
      );
      await accumulator
        .awaitEvent()
        .then(querySnapshot => {
          const changes = querySnapshot.docChanges();
          expect(changes.length).to.equal(3);
          verifyDocumentChange(changes[0], 'a', -1, 0, 'added');
          verifyDocumentChange(changes[1], 'b', -1, 1, 'added');
          verifyDocumentChange(changes[2], 'c', -1, 2, 'added');
        })
        .then(() => setDoc(doc(coll, 'b'), { order: 4 }))
        .then(() => accumulator.awaitEvent())
        .then(querySnapshot => {
          const changes = querySnapshot.docChanges();
          expect(changes.length).to.equal(1);
          verifyDocumentChange(changes[0], 'b', 1, 2, 'modified');
        })
        .then(() => deleteDoc(doc(coll, 'c')))
        .then(() => accumulator.awaitEvent())
        .then(querySnapshot => {
          const changes = querySnapshot.docChanges();
          expect(changes.length).to.equal(1);
          verifyDocumentChange(changes[0], 'c', 1, -1, 'removed');
        });

      unlisten();
    });
  });

  it('can listen for the same query with different options', () => {
    const testDocs = { a: { v: 'a' }, b: { v: 'b' } };
    return withTestCollection(persistence, testDocs, coll => {
      const storeEvent = new EventsAccumulator<QuerySnapshot>();
      const storeEventFull = new EventsAccumulator<QuerySnapshot>();
      const unlisten1 = onSnapshot(coll, storeEvent.storeEvent);
      const unlisten2 = onSnapshot(
        coll,
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
          return setDoc(doc(coll, 'a'), { v: 'a1' });
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
          return setDoc(doc(coll, 'b'), { v: 'b1' });
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
      const docs1Promise = getDocs(query(coll, where('date', '>', date1)));
      const docs2Promise = getDocs(query(coll, where('date', '>', date2)));

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
      const query1 = query(coll, where('key', '<', '4'));
      const accum = new EventsAccumulator<QuerySnapshot>();
      let unlisten2: () => void;
      const unlisten1 = onSnapshot(query1, result => {
        expect(toDataArray(result)).to.deep.equal([
          testDocs[1],
          testDocs[2],
          testDocs[3]
        ]);
        const query2 = query(coll, where('filter', '==', true));
        unlisten2 = onSnapshot(
          query2,
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
      const accum = new EventsAccumulator<QuerySnapshot>();
      const unlisten = onSnapshot(
        coll,
        { includeMetadataChanges: true },
        accum.storeEvent
      );

      await accum.awaitEvents(1).then(events => {
        const results1 = events[0];
        expect(toDataArray(results1)).to.deep.equal([initialDoc['foo']]);
      });
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      setDoc(doc(coll, 'foo'), modifiedDoc['foo']);

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
      return getDocs(query(coll, orderBy(documentId()))).then(docs => {
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
      return getDocs(query(coll, where(documentId(), '==', 'ab')))
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([testDocs['ab']]);
          return getDocs(
            query(
              coll,
              where(documentId(), '>', 'aa'),
              where(documentId(), '<=', 'ba')
            )
          );
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
      return getDocs(query(coll, where(documentId(), '==', doc(coll, 'ab'))))
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([testDocs['ab']]);
          return getDocs(
            query(
              coll,
              where(documentId(), '>', doc(coll, 'aa')),
              where(documentId(), '<=', doc(coll, 'ba'))
            )
          );
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
    return withTestCollection(persistence, /* docs= */ {}, (coll, db) => {
      const deferred = new Deferred<void>();

      const unregister = onSnapshot(
        coll,
        { includeMetadataChanges: true },
        snapshot => {
          if (!snapshot.empty && !snapshot.metadata.fromCache) {
            deferred.resolve();
          }
        }
      );
      void disableNetwork(db).then(() => {
        void setDoc(doc(coll), { a: 1 });
        void enableNetwork(db);
      });

      return deferred.promise.then(unregister);
    });
  });

  it('trigger with isFromCache=true when offline', () => {
    return withTestCollection(persistence, { a: { foo: 1 } }, (coll, db) => {
      const accum = new EventsAccumulator<QuerySnapshot>();
      const unregister = onSnapshot(
        coll,
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
        .then(() => disableNetwork(db))
        .then(() => accum.awaitEvent())
        .then(querySnap => {
          // offline event with fromCache = true
          expect(querySnap.metadata.fromCache).to.be.true;
        })
        .then(() => enableNetwork(db))
        .then(() => accum.awaitEvent())
        .then(querySnap => {
          // back online event with fromCache = false
          expect(querySnap.metadata.fromCache).to.be.false;
          unregister();
        });
    });
  });

  it('can use != filters', async () => {
    // These documents are ordered by value in "zip" since the '!=' filter is
    // an inequality, which results in documents being sorted by value.
    const testDocs = {
      a: { zip: Number.NaN },
      b: { zip: 91102 },
      c: { zip: 98101 },
      d: { zip: '98101' },
      e: { zip: [98101] },
      f: { zip: [98101, 98102] },
      g: { zip: ['98101', { zip: 98101 }] },
      h: { zip: { code: 500 } },
      i: { code: 500 },
      j: { zip: null }
    };

    await withTestCollection(persistence, testDocs, async coll => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let expected: { [name: string]: any } = { ...testDocs };
      delete expected.c;
      delete expected.i;
      delete expected.j;
      const snapshot = await getDocs(query(coll, where('zip', '!=', 98101)));
      expect(toDataArray(snapshot)).to.deep.equal(Object.values(expected));

      // With objects.
      const snapshot2 = await getDocs(
        query(coll, where('zip', '!=', { code: 500 }))
      );
      expected = { ...testDocs };
      delete expected.h;
      delete expected.i;
      delete expected.j;
      expect(toDataArray(snapshot2)).to.deep.equal(Object.values(expected));

      // With null.
      const snapshot3 = await getDocs(query(coll, where('zip', '!=', null)));
      expected = { ...testDocs };
      delete expected.i;
      delete expected.j;
      expect(toDataArray(snapshot3)).to.deep.equal(Object.values(expected));

      // With NaN.
      const snapshot4 = await getDocs(
        query(coll, where('zip', '!=', Number.NaN))
      );
      expected = { ...testDocs };
      delete expected.a;
      delete expected.i;
      delete expected.j;
      expect(toDataArray(snapshot4)).to.deep.equal(Object.values(expected));
    });
  });

  it('can use != filters by document ID', async () => {
    const testDocs = {
      aa: { key: 'aa' },
      ab: { key: 'ab' },
      ba: { key: 'ba' },
      bb: { key: 'bb' }
    };
    await withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getDocs(
        query(coll, where(documentId(), '!=', 'aa'))
      );

      expect(toDataArray(snapshot)).to.deep.equal([
        { key: 'ab' },
        { key: 'ba' },
        { key: 'bb' }
      ]);
    });
  });

  it('can use array-contains filters', async () => {
    const testDocs = {
      a: { array: [42] },
      b: { array: ['a', 42, 'c'] },
      c: { array: [41.999, '42', { a: [42] }] },
      d: { array: [42], array2: ['bingo'] },
      e: { array: [null] },
      f: { array: [Number.NaN] }
    };

    await withTestCollection(persistence, testDocs, async coll => {
      // Search for 42
      const snapshot = await getDocs(
        query(coll, where('array', 'array-contains', 42))
      );
      expect(toDataArray(snapshot)).to.deep.equal([
        { array: [42] },
        { array: ['a', 42, 'c'] },
        { array: [42], array2: ['bingo'] }
      ]);

      // NOTE: The backend doesn't currently support null, NaN, objects, or
      // arrays, so there isn't much of anything else interesting to test.
      // With null.
      const snapshot3 = await getDocs(
        query(coll, where('zip', 'array-contains', null))
      );
      expect(toDataArray(snapshot3)).to.deep.equal([]);

      // With NaN.
      const snapshot4 = await getDocs(
        query(coll, where('zip', 'array-contains', Number.NaN))
      );
      expect(toDataArray(snapshot4)).to.deep.equal([]);
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
      g: { zip: [98101, 98102] },
      h: { zip: null },
      i: { zip: Number.NaN }
    };

    await withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getDocs(
        query(coll, where('zip', 'in', [98101, 98103, [98101, 98102]]))
      );
      expect(toDataArray(snapshot)).to.deep.equal([
        { zip: 98101 },
        { zip: 98103 },
        { zip: [98101, 98102] }
      ]);

      // With objects.
      const snapshot2 = await getDocs(
        query(coll, where('zip', 'in', [{ code: 500 }]))
      );
      expect(toDataArray(snapshot2)).to.deep.equal([{ zip: { code: 500 } }]);

      // With null.
      const snapshot3 = await getDocs(query(coll, where('zip', 'in', [null])));
      expect(toDataArray(snapshot3)).to.deep.equal([]);

      // With null and a value.
      const snapshot4 = await getDocs(
        query(coll, where('zip', 'in', [98101, null]))
      );
      expect(toDataArray(snapshot4)).to.deep.equal([{ zip: 98101 }]);

      // With NaN.
      const snapshot5 = await getDocs(
        query(coll, where('zip', 'in', [Number.NaN]))
      );
      expect(toDataArray(snapshot5)).to.deep.equal([]);

      // With NaN and a value.
      const snapshot6 = await getDocs(
        query(coll, where('zip', 'in', [98101, Number.NaN]))
      );
      expect(toDataArray(snapshot6)).to.deep.equal([{ zip: 98101 }]);
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
      const snapshot = await getDocs(
        query(coll, where(documentId(), 'in', ['aa', 'ab']))
      );

      expect(toDataArray(snapshot)).to.deep.equal([
        { key: 'aa' },
        { key: 'ab' }
      ]);
    });
  });

  it('can use NOT_IN filters', async () => {
    // These documents are ordered by value in "zip" since the 'not-in' filter is
    // an inequality, which results in documents being sorted by value.
    const testDocs = {
      a: { zip: Number.NaN },
      b: { zip: 91102 },
      c: { zip: 98101 },
      d: { zip: 98103 },
      e: { zip: [98101] },
      f: { zip: [98101, 98102] },
      g: { zip: ['98101', { zip: 98101 }] },
      h: { zip: { code: 500 } },
      i: { code: 500 },
      j: { zip: null }
    };

    await withTestCollection(persistence, testDocs, async coll => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let expected: { [name: string]: any } = { ...testDocs };
      delete expected.c;
      delete expected.d;
      delete expected.f;
      delete expected.i;
      delete expected.j;
      const snapshot = await getDocs(
        query(coll, where('zip', 'not-in', [98101, 98103, [98101, 98102]]))
      );
      expect(toDataArray(snapshot)).to.deep.equal(Object.values(expected));

      // With objects.
      const snapshot2 = await getDocs(
        query(coll, where('zip', 'not-in', [{ code: 500 }]))
      );
      expected = { ...testDocs };
      delete expected.h;
      delete expected.i;
      delete expected.j;
      expect(toDataArray(snapshot2)).to.deep.equal(Object.values(expected));

      // With null.
      const snapshot3 = await getDocs(
        query(coll, where('zip', 'not-in', [null]))
      );
      expect(toDataArray(snapshot3)).to.deep.equal([]);

      // With NaN.
      const snapshot4 = await getDocs(
        query(coll, where('zip', 'not-in', [Number.NaN]))
      );
      expected = { ...testDocs };
      delete expected.a;
      delete expected.i;
      delete expected.j;
      expect(toDataArray(snapshot4)).to.deep.equal(Object.values(expected));

      // With NaN and a number.
      const snapshot5 = await getDocs(
        query(coll, where('zip', 'not-in', [Number.NaN, 98101]))
      );
      expected = { ...testDocs };
      delete expected.a;
      delete expected.c;
      delete expected.i;
      delete expected.j;
      expect(toDataArray(snapshot5)).to.deep.equal(Object.values(expected));
    });
  });

  it('can use NOT_IN filters by document ID', async () => {
    const testDocs = {
      aa: { key: 'aa' },
      ab: { key: 'ab' },
      ba: { key: 'ba' },
      bb: { key: 'bb' }
    };
    await withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getDocs(
        query(coll, where(documentId(), 'not-in', ['aa', 'ab']))
      );

      expect(toDataArray(snapshot)).to.deep.equal([
        { key: 'ba' },
        { key: 'bb' }
      ]);
    });
  });

  it('can use array-contains-any filters', async () => {
    const testDocs = {
      a: { array: [42] },
      b: { array: ['a', 42, 'c'] },
      c: { array: [41.999, '42', { a: [42] }] },
      d: { array: [42], array2: ['bingo'] },
      e: { array: [43] },
      f: { array: [{ a: 42 }] },
      g: { array: 42 },
      h: { array: [null] },
      i: { array: [Number.NaN] }
    };

    await withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getDocs(
        query(coll, where('array', 'array-contains-any', [42, 43]))
      );
      expect(toDataArray(snapshot)).to.deep.equal([
        { array: [42] },
        { array: ['a', 42, 'c'] },
        { array: [42], array2: ['bingo'] },
        { array: [43] }
      ]);

      // With objects.
      const snapshot2 = await getDocs(
        query(coll, where('array', 'array-contains-any', [{ a: 42 }]))
      );
      expect(toDataArray(snapshot2)).to.deep.equal([{ array: [{ a: 42 }] }]);

      // With null.
      const snapshot3 = await getDocs(
        query(coll, where('array', 'array-contains-any', [null]))
      );
      expect(toDataArray(snapshot3)).to.deep.equal([]);

      // With null and a value.
      const snapshot4 = await getDocs(
        query(coll, where('array', 'array-contains-any', [43, null]))
      );
      expect(toDataArray(snapshot4)).to.deep.equal([{ array: [43] }]);

      // With NaN.
      const snapshot5 = await getDocs(
        query(coll, where('array', 'array-contains-any', [Number.NaN]))
      );
      expect(toDataArray(snapshot5)).to.deep.equal([]);

      // With NaN and a value.
      const snapshot6 = await getDocs(
        query(coll, where('array', 'array-contains-any', [43, Number.NaN]))
      );
      expect(toDataArray(snapshot6)).to.deep.equal([{ array: [43] }]);
    });
  });

  it('can query collection groups', async () => {
    await withTestDb(persistence, async db => {
      // Use doc() to get a random collection group name to use but ensure it
      // starts with 'b' for predictable ordering.
      const cg = 'b' + doc(collection(db, 'foo')).id;

      const docPaths = [
        `abc/123/${cg}/cg-doc1`,
        `abc/123/${cg}/cg-doc2`,
        `${cg}/cg-doc3`,
        `${cg}/cg-doc4`,
        `def/456/${cg}/cg-doc5`,
        `${cg}/virtual-doc/nested-coll/not-cg-doc`,
        `x${cg}/not-cg-doc`,
        `${cg}x/not-cg-doc`,
        `abc/123/${cg}x/not-cg-doc`,
        `abc/123/x${cg}/not-cg-doc`,
        `abc/${cg}`
      ];
      const batch = writeBatch(db);
      for (const docPath of docPaths) {
        batch.set(doc(db, docPath), { x: 1 });
      }
      await batch.commit();

      const querySnapshot = await getDocs(collectionGroup(db, cg));
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
      // Use doc() to get a random collection group name to use but ensure it
      // starts with 'b' for predictable ordering.
      const cg = 'b' + doc(collection(db, 'foo')).id;

      const docPaths = [
        `a/a/${cg}/cg-doc1`,
        `a/b/a/b/${cg}/cg-doc2`,
        `a/b/${cg}/cg-doc3`,
        `a/b/c/d/${cg}/cg-doc4`,
        `a/c/${cg}/cg-doc5`,
        `${cg}/cg-doc6`,
        `a/b/nope/nope`
      ];
      const batch = writeBatch(db);
      for (const docPath of docPaths) {
        batch.set(doc(db, docPath), { x: 1 });
      }
      await batch.commit();

      let querySnapshot = await getDocs(
        query(
          collectionGroup(db, cg),
          orderBy(documentId()),
          startAt(`a/b`),
          endAt('a/b0')
        )
      );
      expect(querySnapshot.docs.map(d => d.id)).to.deep.equal([
        'cg-doc2',
        'cg-doc3',
        'cg-doc4'
      ]);

      querySnapshot = await getDocs(
        query(
          collectionGroup(db, cg),
          orderBy(documentId()),
          startAfter('a/b'),
          endBefore(`a/b/${cg}/cg-doc3`)
        )
      );
      expect(querySnapshot.docs.map(d => d.id)).to.deep.equal(['cg-doc2']);
    });
  });

  it('can query collection groups with where filters on arbitrary documentId', async () => {
    await withTestDb(persistence, async db => {
      // Use doc() to get a random collection group name to use but ensure it
      // starts with 'b' for predictable ordering.
      const cg = 'b' + doc(collection(db, 'foo')).id;

      const docPaths = [
        `a/a/${cg}/cg-doc1`,
        `a/b/a/b/${cg}/cg-doc2`,
        `a/b/${cg}/cg-doc3`,
        `a/b/c/d/${cg}/cg-doc4`,
        `a/c/${cg}/cg-doc5`,
        `${cg}/cg-doc6`,
        `a/b/nope/nope`
      ];
      const batch = writeBatch(db);
      for (const docPath of docPaths) {
        batch.set(doc(db, docPath), { x: 1 });
      }
      await batch.commit();

      let querySnapshot = await getDocs(
        query(
          collectionGroup(db, cg),
          where(documentId(), '>=', `a/b`),
          where(documentId(), '<=', 'a/b0')
        )
      );
      expect(querySnapshot.docs.map(d => d.id)).to.deep.equal([
        'cg-doc2',
        'cg-doc3',
        'cg-doc4'
      ]);

      querySnapshot = await getDocs(
        query(
          collectionGroup(db, cg),
          where(documentId(), '>', `a/b`),
          where(documentId(), '<', `a/b/${cg}/cg-doc3`)
        )
      );
      expect(querySnapshot.docs.map(d => d.id)).to.deep.equal(['cg-doc2']);
    });
  });

  it('can query custom types', () => {
    return withTestCollection(persistence, {}, async (ref, db) => {
      const data = {
        ref: doc(db, 'f/c'),
        geoPoint: new GeoPoint(0, 0),
        buffer: Bytes.fromBase64String('Zm9v'),
        time: Timestamp.now(),
        array: [
          doc(db, 'f/c'),
          new GeoPoint(0, 0),
          Bytes.fromBase64String('Zm9v'),
          Timestamp.now()
        ]
      };
      await addDoc(ref, { data });

      // In https://github.com/firebase/firebase-js-sdk/issues/1524, a
      // customer was not able to unlisten from a query that contained a
      // nested object with a DocumentReference. The cause of it was that our
      // serialization of nested references via JSON.stringify() was different
      // for Queries created via the API layer versus Queries read from
      // persistence. To simulate this issue, we have to listen and unlisten
      // to the same query twice.
      const query1 = query(ref, where('data', '==', data));

      for (let i = 0; i < 2; ++i) {
        const deferred = new Deferred<void>();
        const unsubscribe = onSnapshot(query1, snapshot => {
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
      await getDocs(query(coll)); // Populate the cache
      const snapshot = await getDocs(
        query(coll, where('map.nested', '==', 'foo'))
      );
      expect(toDataArray(snapshot)).to.deep.equal([{ map: { nested: 'foo' } }]);
    });
  });
});

function verifyDocumentChange<T>(
  change: DocumentChange<T>,
  id: string,
  oldIndex: number,
  newIndex: number,
  type: DocumentChangeType
): void {
  expect(change.doc.id).to.equal(id);
  expect(change.type).to.equal(type);
  expect(change.oldIndex).to.equal(oldIndex);
  expect(change.newIndex).to.equal(newIndex);
}
