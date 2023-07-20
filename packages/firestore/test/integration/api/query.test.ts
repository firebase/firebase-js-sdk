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
  and,
  Bytes,
  collection,
  collectionGroup,
  deleteDoc,
  disableNetwork,
  doc,
  DocumentChange,
  DocumentChangeType,
  DocumentData,
  documentId,
  enableNetwork,
  endAt,
  endBefore,
  GeoPoint,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  limit,
  limitToLast,
  onSnapshot,
  or,
  orderBy,
  Query,
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
  RetryError,
  toChangesArray,
  toDataArray,
  toIds,
  withEmptyTestCollection,
  withRetry,
  withTestCollection,
  withTestDb
} from '../util/helpers';
import { USE_EMULATOR } from '../util/settings';
import { captureExistenceFilterMismatches } from '../util/testing_hooks_util';

apiDescribe('Queries', persistence => {
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

  it('can issue limitToLast queries with cursors', () => {
    const testDocs = {
      a: { k: 'a', sort: 0 },
      b: { k: 'b', sort: 1 },
      c: { k: 'c', sort: 1 },
      d: { k: 'd', sort: 2 }
    };
    return withTestCollection(persistence, testDocs, async collection => {
      let docs = await getDocs(
        query(collection, orderBy('sort'), endBefore(2), limitToLast(3))
      );
      expect(toDataArray(docs)).to.deep.equal([
        { k: 'a', sort: 0 },
        { k: 'b', sort: 1 },
        { k: 'c', sort: 1 }
      ]);

      docs = await getDocs(
        query(collection, orderBy('sort'), endAt(1), limitToLast(3))
      );
      expect(toDataArray(docs)).to.deep.equal([
        { k: 'a', sort: 0 },
        { k: 'b', sort: 1 },
        { k: 'c', sort: 1 }
      ]);

      docs = await getDocs(
        query(collection, orderBy('sort'), startAt(2), limitToLast(3))
      );
      expect(toDataArray(docs)).to.deep.equal([{ k: 'd', sort: 2 }]);

      docs = await getDocs(
        query(collection, orderBy('sort'), startAfter(0), limitToLast(3))
      );
      expect(toDataArray(docs)).to.deep.equal([
        { k: 'b', sort: 1 },
        { k: 'c', sort: 1 },
        { k: 'd', sort: 2 }
      ]);

      docs = await getDocs(
        query(collection, orderBy('sort'), startAfter(-1), limitToLast(3))
      );
      expect(toDataArray(docs)).to.deep.equal([
        { k: 'b', sort: 1 },
        { k: 'c', sort: 1 },
        { k: 'd', sort: 2 }
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

  // eslint-disable-next-line no-restricted-properties
  (USE_EMULATOR ? it.skip : it)(
    'can catch error message for missing index with error handler',
    () => {
      return withEmptyTestCollection(persistence, async coll => {
        const query_ = query(
          coll,
          where('sort', '<=', '2'),
          where('filter', '==', true)
        );
        const deferred = new Deferred<void>();

        const unsubscribe = onSnapshot(
          query_,
          () => {
            deferred.reject();
          },
          err => {
            expect(err.code).to.equal('failed-precondition');
            expect(err.message).to.exist;
            expect(err.message).to.match(
              /index.*https:\/\/console\.firebase\.google\.com/
            );
            deferred.resolve();
          }
        );
        await deferred.promise;
        unsubscribe();
      });
    }
  );

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
      await getDocs(query(coll)); // Populate the cache.
      const snapshot = await getDocs(
        query(coll, where('map.nested', '==', 'foo'))
      );
      expect(toDataArray(snapshot)).to.deep.equal([{ map: { nested: 'foo' } }]);
    });
  });

  // OR Query tests only run when the SDK's local cache is configured to use
  // LRU garbage collection (rather than eager garbage collection) because
  // they validate that the result from server and cache match.
  // eslint-disable-next-line no-restricted-properties
  (persistence.gc === 'lru' ? describe : describe.skip)('OR Queries', () => {
    it('can use query overloads', () => {
      const testDocs = {
        doc1: { a: 1, b: 0 },
        doc2: { a: 2, b: 1 },
        doc3: { a: 3, b: 2 },
        doc4: { a: 1, b: 3 },
        doc5: { a: 1, b: 1 }
      };

      return withTestCollection(persistence, testDocs, async coll => {
        // a == 1
        await checkOnlineAndOfflineResultsMatch(
          query(coll, where('a', '==', 1)),
          'doc1',
          'doc4',
          'doc5'
        );

        // Implicit AND: a == 1 && b == 3
        await checkOnlineAndOfflineResultsMatch(
          query(coll, where('a', '==', 1), where('b', '==', 3)),
          'doc4'
        );

        // explicit AND: a == 1 && b == 3
        await checkOnlineAndOfflineResultsMatch(
          query(coll, and(where('a', '==', 1), where('b', '==', 3))),
          'doc4'
        );

        // a == 1, limit 2
        await checkOnlineAndOfflineResultsMatch(
          query(coll, where('a', '==', 1), limit(2)),
          'doc1',
          'doc4'
        );

        // explicit OR: a == 1 || b == 1 with limit 2
        await checkOnlineAndOfflineResultsMatch(
          query(coll, or(where('a', '==', 1), where('b', '==', 1)), limit(2)),
          'doc1',
          'doc2'
        );

        // only limit 2
        await checkOnlineAndOfflineResultsMatch(
          query(coll, limit(2)),
          'doc1',
          'doc2'
        );

        // limit 2 and order by b desc
        await checkOnlineAndOfflineResultsMatch(
          query(coll, limit(2), orderBy('b', 'desc')),
          'doc4',
          'doc3'
        );
      });
    });

    it('can use or queries', () => {
      const testDocs = {
        doc1: { a: 1, b: 0 },
        doc2: { a: 2, b: 1 },
        doc3: { a: 3, b: 2 },
        doc4: { a: 1, b: 3 },
        doc5: { a: 1, b: 1 }
      };

      return withTestCollection(persistence, testDocs, async coll => {
        // Two equalities: a==1 || b==1.
        await checkOnlineAndOfflineResultsMatch(
          query(coll, or(where('a', '==', 1), where('b', '==', 1))),
          'doc1',
          'doc2',
          'doc4',
          'doc5'
        );

        // (a==1 && b==0) || (a==3 && b==2)
        await checkOnlineAndOfflineResultsMatch(
          query(
            coll,
            or(
              and(where('a', '==', 1), where('b', '==', 0)),
              and(where('a', '==', 3), where('b', '==', 2))
            )
          ),
          'doc1',
          'doc3'
        );

        // a==1 && (b==0 || b==3).
        await checkOnlineAndOfflineResultsMatch(
          query(
            coll,
            and(
              where('a', '==', 1),
              or(where('b', '==', 0), where('b', '==', 3))
            )
          ),
          'doc1',
          'doc4'
        );

        // (a==2 || b==2) && (a==3 || b==3)
        await checkOnlineAndOfflineResultsMatch(
          query(
            coll,
            and(
              or(where('a', '==', 2), where('b', '==', 2)),
              or(where('a', '==', 3), where('b', '==', 3))
            )
          ),
          'doc3'
        );

        // Test with limits without orderBy (the __name__ ordering is the tie breaker).
        await checkOnlineAndOfflineResultsMatch(
          query(coll, or(where('a', '==', 2), where('b', '==', 1)), limit(1)),
          'doc2'
        );
      });
    });

    it('can use or queries with in', () => {
      const testDocs = {
        doc1: { a: 1, b: 0 },
        doc2: { b: 1 },
        doc3: { a: 3, b: 2 },
        doc4: { a: 1, b: 3 },
        doc5: { a: 1 },
        doc6: { a: 2 }
      };

      return withTestCollection(persistence, testDocs, async coll => {
        // a==2 || b in [2,3]
        await checkOnlineAndOfflineResultsMatch(
          query(coll, or(where('a', '==', 2), where('b', 'in', [2, 3]))),
          'doc3',
          'doc4',
          'doc6'
        );
      });
    });

    it('can use or queries with array membership', () => {
      const testDocs = {
        doc1: { a: 1, b: [0] },
        doc2: { b: [1] },
        doc3: { a: 3, b: [2, 7] },
        doc4: { a: 1, b: [3, 7] },
        doc5: { a: 1 },
        doc6: { a: 2 }
      };

      return withTestCollection(persistence, testDocs, async coll => {
        // a==2 || b array-contains 7
        await checkOnlineAndOfflineResultsMatch(
          query(coll, or(where('a', '==', 2), where('b', 'array-contains', 7))),
          'doc3',
          'doc4',
          'doc6'
        );

        // a==2 || b array-contains-any [0, 3]
        await checkOnlineAndOfflineResultsMatch(
          query(
            coll,
            or(where('a', '==', 2), where('b', 'array-contains-any', [0, 3]))
          ),
          'doc1',
          'doc4',
          'doc6'
        );
      });
    });

    // TODO(orquery) enable this test when the backend supports
    // one in per disjunction
    // eslint-disable-next-line no-restricted-properties
    it.skip('supports multiple in ops', () => {
      const testDocs = {
        doc1: { a: 1, b: 0 },
        doc2: { b: 1 },
        doc3: { a: 3, b: 2 },
        doc4: { a: 1, b: 3 },
        doc5: { a: 1 },
        doc6: { a: 2 }
      };

      return withTestCollection(persistence, testDocs, async coll => {
        // Two IN operations on different fields with disjunction.
        await checkOnlineAndOfflineResultsMatch(
          query(coll, or(where('a', 'in', [2, 3]), where('b', 'in', [0, 2]))),
          'doc1',
          'doc3',
          'doc6'
        );

        // a IN [0,3] || a IN [0,2] should union them (similar to: a IN [0,2,3]).
        await checkOnlineAndOfflineResultsMatch(
          query(coll, or(where('a', 'in', [0, 3]), where('a', 'in', [0, 2]))),
          'doc3',
          'doc6'
        );
      });
    });

    // TODO(orquery) enable this test when the backend supports
    // one in or array-contains-any per disjunction
    // eslint-disable-next-line no-restricted-properties
    it.skip('supports using in with array contains any', () => {
      const testDocs = {
        doc1: { a: 1, b: [0] },
        doc2: { b: [1] },
        doc3: { a: 3, b: [2, 7], c: 10 },
        doc4: { a: 1, b: [3, 7] },
        doc5: { a: 1 },
        doc6: { a: 2, c: 20 }
      };

      return withTestCollection(persistence, testDocs, async coll => {
        await checkOnlineAndOfflineResultsMatch(
          query(
            coll,
            or(
              where('a', 'in', [2, 3]),
              where('b', 'array-contains-any', [0, 7])
            )
          ),
          'doc1',
          'doc3',
          'doc4',
          'doc6'
        );

        await checkOnlineAndOfflineResultsMatch(
          query(
            coll,
            or(
              and(where('a', 'in', [2, 3]), where('c', '==', 10)),
              where('b', 'array-contains-any', [0, 7])
            )
          ),
          'doc1',
          'doc3',
          'doc4'
        );
      });
    });

    // eslint-disable-next-line no-restricted-properties
    it('supports using in with array contains', () => {
      const testDocs = {
        doc1: { a: 1, b: [0] },
        doc2: { b: [1] },
        doc3: { a: 3, b: [2, 7] },
        doc4: { a: 1, b: [3, 7] },
        doc5: { a: 1 },
        doc6: { a: 2 }
      };

      return withTestCollection(persistence, testDocs, async coll => {
        await checkOnlineAndOfflineResultsMatch(
          query(
            coll,
            or(where('a', 'in', [2, 3]), where('b', 'array-contains', 3))
          ),
          'doc3',
          'doc4',
          'doc6'
        );

        await checkOnlineAndOfflineResultsMatch(
          query(
            coll,
            and(where('a', 'in', [2, 3]), where('b', 'array-contains', 7))
          ),
          'doc3'
        );

        await checkOnlineAndOfflineResultsMatch(
          query(
            coll,
            or(
              where('a', 'in', [2, 3]),
              and(where('b', 'array-contains', 3), where('a', '==', 1))
            )
          ),
          'doc3',
          'doc4',
          'doc6'
        );

        await checkOnlineAndOfflineResultsMatch(
          query(
            coll,
            and(
              where('a', 'in', [2, 3]),
              or(where('b', 'array-contains', 7), where('a', '==', 1))
            )
          ),
          'doc3'
        );
      });
    });
  });

  // OR Query tests only run when the SDK's local cache is configured to use
  // LRU garbage collection (rather than eager garbage collection) because
  // they validate that the result from server and cache match. Additionally,
  // these tests must be skipped if running against production because it
  // results in a 'missing index' error. The Firestore Emulator, however, does
  // serve these queries.
  // eslint-disable-next-line no-restricted-properties
  (persistence.gc === 'lru' && USE_EMULATOR ? describe : describe.skip)(
    'OR Queries',
    () => {
      it('can use query overloads', () => {
        const testDocs = {
          doc1: { a: 1, b: 0 },
          doc2: { a: 2, b: 1 },
          doc3: { a: 3, b: 2 },
          doc4: { a: 1, b: 3 },
          doc5: { a: 1, b: 1 }
        };

        return withTestCollection(persistence, testDocs, async coll => {
          // a == 1, limit 2, b - desc
          await checkOnlineAndOfflineResultsMatch(
            query(coll, where('a', '==', 1), limit(2), orderBy('b', 'desc')),
            'doc4',
            'doc5'
          );
        });
      });

      it('can use or queries', () => {
        const testDocs = {
          doc1: { a: 1, b: 0 },
          doc2: { a: 2, b: 1 },
          doc3: { a: 3, b: 2 },
          doc4: { a: 1, b: 3 },
          doc5: { a: 1, b: 1 }
        };

        return withTestCollection(persistence, testDocs, async coll => {
          // with one inequality: a>2 || b==1.
          await checkOnlineAndOfflineResultsMatch(
            query(coll, or(where('a', '>', 2), where('b', '==', 1))),
            'doc5',
            'doc2',
            'doc3'
          );

          // Test with limits (implicit order by ASC): (a==1) || (b > 0) LIMIT 2
          await checkOnlineAndOfflineResultsMatch(
            query(coll, or(where('a', '==', 1), where('b', '>', 0)), limit(2)),
            'doc1',
            'doc2'
          );

          // Test with limits (explicit order by): (a==1) || (b > 0) LIMIT_TO_LAST 2
          // Note: The public query API does not allow implicit ordering when limitToLast is used.
          await checkOnlineAndOfflineResultsMatch(
            query(
              coll,
              or(where('a', '==', 1), where('b', '>', 0)),
              limitToLast(2),
              orderBy('b')
            ),
            'doc3',
            'doc4'
          );

          // Test with limits (explicit order by ASC): (a==2) || (b == 1) ORDER BY a LIMIT 1
          await checkOnlineAndOfflineResultsMatch(
            query(
              coll,
              or(where('a', '==', 2), where('b', '==', 1)),
              limit(1),
              orderBy('a')
            ),
            'doc5'
          );

          // Test with limits (explicit order by DESC): (a==2) || (b == 1) ORDER BY a LIMIT_TO_LAST 1
          await checkOnlineAndOfflineResultsMatch(
            query(
              coll,
              or(where('a', '==', 2), where('b', '==', 1)),
              limitToLast(1),
              orderBy('a')
            ),
            'doc2'
          );
        });
      });

      it('can use or queries with not-in', () => {
        const testDocs = {
          doc1: { a: 1, b: 0 },
          doc2: { b: 1 },
          doc3: { a: 3, b: 2 },
          doc4: { a: 1, b: 3 },
          doc5: { a: 1 },
          doc6: { a: 2 }
        };

        return withTestCollection(persistence, testDocs, async coll => {
          // a==2 || b not-in [2,3]
          // Has implicit orderBy b.
          await checkOnlineAndOfflineResultsMatch(
            query(coll, or(where('a', '==', 2), where('b', 'not-in', [2, 3]))),
            'doc1',
            'doc2'
          );
        });
      });

      // eslint-disable-next-line no-restricted-properties
      it('supports order by equality', () => {
        const testDocs = {
          doc1: { a: 1, b: [0] },
          doc2: { b: [1] },
          doc3: { a: 3, b: [2, 7], c: 10 },
          doc4: { a: 1, b: [3, 7] },
          doc5: { a: 1 },
          doc6: { a: 2, c: 20 }
        };

        return withTestCollection(persistence, testDocs, async coll => {
          await checkOnlineAndOfflineResultsMatch(
            query(coll, where('a', '==', 1), orderBy('a')),
            'doc1',
            'doc4',
            'doc5'
          );

          await checkOnlineAndOfflineResultsMatch(
            query(coll, where('a', 'in', [2, 3]), orderBy('a')),
            'doc6',
            'doc3'
          );
        });
      });

      // eslint-disable-next-line no-restricted-properties
      it('supports multiple in ops', () => {
        const testDocs = {
          doc1: { a: 1, b: 0 },
          doc2: { b: 1 },
          doc3: { a: 3, b: 2 },
          doc4: { a: 1, b: 3 },
          doc5: { a: 1 },
          doc6: { a: 2 }
        };

        return withTestCollection(persistence, testDocs, async coll => {
          // Two IN operations on different fields with disjunction.
          await checkOnlineAndOfflineResultsMatch(
            query(
              coll,
              or(where('a', 'in', [2, 3]), where('b', 'in', [0, 2])),
              orderBy('a')
            ),
            'doc1',
            'doc6',
            'doc3'
          );

          // Two IN operations on different fields with conjunction.
          await checkOnlineAndOfflineResultsMatch(
            query(
              coll,
              and(where('a', 'in', [2, 3]), where('b', 'in', [0, 2])),
              orderBy('a')
            ),
            'doc3'
          );

          // Two IN operations on the same field.
          // a IN [1,2,3] && a IN [0,1,4] should result in "a==1".
          await checkOnlineAndOfflineResultsMatch(
            query(
              coll,
              and(where('a', 'in', [1, 2, 3]), where('a', 'in', [0, 1, 4]))
            ),
            'doc1',
            'doc4',
            'doc5'
          );

          // a IN [2,3] && a IN [0,1,4] is never true and so the result should be an
          // empty set.
          await checkOnlineAndOfflineResultsMatch(
            query(
              coll,
              and(where('a', 'in', [2, 3]), where('a', 'in', [0, 1, 4]))
            )
          );

          // a IN [0,3] || a IN [0,2] should union them (similar to: a IN [0,2,3]).
          await checkOnlineAndOfflineResultsMatch(
            query(coll, or(where('a', 'in', [0, 3]), where('a', 'in', [0, 2]))),
            'doc3',
            'doc6'
          );

          // Nested composite filter on the same field.
          await checkOnlineAndOfflineResultsMatch(
            query(
              coll,
              and(
                where('a', 'in', [1, 3]),
                or(
                  where('a', 'in', [0, 2]),
                  and(where('b', '>=', 1), where('a', 'in', [1, 3]))
                )
              )
            ),
            'doc3',
            'doc4'
          );

          // Nested composite filter on the different fields.
          await checkOnlineAndOfflineResultsMatch(
            query(
              coll,
              and(
                where('b', 'in', [0, 3]),
                or(
                  where('b', 'in', [1]),
                  and(where('b', 'in', [2, 3]), where('a', 'in', [1, 3]))
                )
              )
            ),
            'doc4'
          );
        });
      });

      // eslint-disable-next-line no-restricted-properties
      it('supports using in with array contains any', () => {
        const testDocs = {
          doc1: { a: 1, b: [0] },
          doc2: { b: [1] },
          doc3: { a: 3, b: [2, 7], c: 10 },
          doc4: { a: 1, b: [3, 7] },
          doc5: { a: 1 },
          doc6: { a: 2, c: 20 }
        };

        return withTestCollection(persistence, testDocs, async coll => {
          await checkOnlineAndOfflineResultsMatch(
            query(
              coll,
              or(
                where('a', 'in', [2, 3]),
                where('b', 'array-contains-any', [0, 7])
              )
            ),
            'doc1',
            'doc3',
            'doc4',
            'doc6'
          );

          await checkOnlineAndOfflineResultsMatch(
            query(
              coll,
              and(
                where('a', 'in', [2, 3]),
                where('b', 'array-contains-any', [0, 7])
              )
            ),
            'doc3'
          );

          await checkOnlineAndOfflineResultsMatch(
            query(
              coll,
              or(
                and(where('a', 'in', [2, 3]), where('c', '==', 10)),
                where('b', 'array-contains-any', [0, 7])
              )
            ),
            'doc1',
            'doc3',
            'doc4'
          );

          await checkOnlineAndOfflineResultsMatch(
            query(
              coll,
              and(
                where('a', 'in', [2, 3]),
                or(
                  where('b', 'array-contains-any', [0, 7]),
                  where('c', '==', 20)
                )
              )
            ),
            'doc3',
            'doc6'
          );
        });
      });

      // eslint-disable-next-line no-restricted-properties
      it('supports using in with array contains', () => {
        const testDocs = {
          doc1: { a: 1, b: [0] },
          doc2: { b: [1] },
          doc3: { a: 3, b: [2, 7] },
          doc4: { a: 1, b: [3, 7] },
          doc5: { a: 1 },
          doc6: { a: 2 }
        };

        return withTestCollection(persistence, testDocs, async coll => {
          await checkOnlineAndOfflineResultsMatch(
            query(
              coll,
              or(where('a', 'in', [2, 3]), where('b', 'array-contains', 3))
            ),
            'doc3',
            'doc4',
            'doc6'
          );

          await checkOnlineAndOfflineResultsMatch(
            query(
              coll,
              and(where('a', 'in', [2, 3]), where('b', 'array-contains', 7))
            ),
            'doc3'
          );

          await checkOnlineAndOfflineResultsMatch(
            query(
              coll,
              or(
                where('a', 'in', [2, 3]),
                and(where('b', 'array-contains', 3), where('a', '==', 1))
              )
            ),
            'doc3',
            'doc4',
            'doc6'
          );

          await checkOnlineAndOfflineResultsMatch(
            query(
              coll,
              and(
                where('a', 'in', [2, 3]),
                or(where('b', 'array-contains', 7), where('a', '==', 1))
              )
            ),
            'doc3'
          );
        });
      });

      // eslint-disable-next-line no-restricted-properties
      it('supports order by equality', () => {
        const testDocs = {
          doc1: { a: 1, b: [0] },
          doc2: { b: [1] },
          doc3: { a: 3, b: [2, 7], c: 10 },
          doc4: { a: 1, b: [3, 7] },
          doc5: { a: 1 },
          doc6: { a: 2, c: 20 }
        };

        return withTestCollection(persistence, testDocs, async coll => {
          await checkOnlineAndOfflineResultsMatch(
            query(coll, where('a', '==', 1), orderBy('a')),
            'doc1',
            'doc4',
            'doc5'
          );

          await checkOnlineAndOfflineResultsMatch(
            query(coll, where('a', 'in', [2, 3]), orderBy('a')),
            'doc6',
            'doc3'
          );
        });
      });
    }
  );

  // Reproduces https://github.com/firebase/firebase-js-sdk/issues/5873
  describe('Caching empty results', () => {
    it('can raise initial snapshot from cache, even if it is empty', () => {
      // Use persistence with LRU garbage collection so the resume token and
      // document data do not get prematurely deleted from the local cache.
      return withTestCollection(persistence.toLruGc(), {}, async coll => {
        const snapshot1 = await getDocs(coll); // Populate the cache.
        expect(snapshot1.metadata.fromCache).to.be.false;
        expect(toDataArray(snapshot1)).to.deep.equal([]); // Precondition check.

        // Add a snapshot listener whose first event should be raised from cache.
        const storeEvent = new EventsAccumulator<QuerySnapshot>();
        onSnapshot(coll, storeEvent.storeEvent);
        const snapshot2 = await storeEvent.awaitEvent();
        expect(snapshot2.metadata.fromCache).to.be.true;
        expect(toDataArray(snapshot2)).to.deep.equal([]);
      });
    });

    it('can raise initial snapshot from cache, even if it has become empty', () => {
      const testDocs = {
        a: { key: 'a' }
      };
      // Use persistence with LRU garbage collection so the resume token and
      // document data do not get prematurely deleted from the local cache.
      return withTestCollection(persistence.toLruGc(), testDocs, async coll => {
        // Populate the cache.
        const snapshot1 = await getDocs(coll);
        expect(snapshot1.metadata.fromCache).to.be.false;
        expect(toDataArray(snapshot1)).to.deep.equal([{ key: 'a' }]);
        // Empty the collection.
        void deleteDoc(doc(coll, 'a'));

        const storeEvent = new EventsAccumulator<QuerySnapshot>();
        onSnapshot(coll, storeEvent.storeEvent);
        const snapshot2 = await storeEvent.awaitEvent();
        expect(snapshot2.metadata.fromCache).to.be.true;
        expect(toDataArray(snapshot2)).to.deep.equal([]);
      });
    });
  });

  // TODO(b/291365820): Stop skipping this test when running against the
  // Firestore emulator once the emulator is improved to include a bloom filter
  // in the existence filter messages that it sends.
  // eslint-disable-next-line no-restricted-properties
  (USE_EMULATOR ? it.skip : it)(
    'resuming a query should use bloom filter to avoid full requery',
    async () => {
      // Prepare the names and contents of the 100 documents to create.
      const testDocs: { [key: string]: object } = {};
      for (let i = 0; i < 100; i++) {
        testDocs['doc' + (1000 + i)] = { key: 42 };
      }

      // Ensure that the local cache is configured to use LRU garbage
      // collection (rather than eager garbage collection) so that the resume
      // token and document data does not get prematurely evicted.
      const lruPersistence = persistence.toLruGc();

      return withRetry(async attemptNumber => {
        return withTestCollection(
          lruPersistence,
          testDocs,
          async (coll, db) => {
            // Run a query to populate the local cache with the 100 documents
            // and a resume token.
            const snapshot1 = await getDocs(coll);
            expect(snapshot1.size, 'snapshot1.size').to.equal(100);
            const createdDocuments = snapshot1.docs.map(
              snapshot => snapshot.ref
            );

            // Delete 50 of the 100 documents. Use a WriteBatch, rather than
            // deleteDoc(), to avoid affecting the local cache.
            const deletedDocumentIds = new Set<string>();
            const writeBatchForDocumentDeletes = writeBatch(db);
            for (let i = 0; i < createdDocuments.length; i += 2) {
              const documentToDelete = createdDocuments[i];
              writeBatchForDocumentDeletes.delete(documentToDelete);
              deletedDocumentIds.add(documentToDelete.id);
            }
            await writeBatchForDocumentDeletes.commit();

            // Wait for 10 seconds, during which Watch will stop tracking the
            // query and will send an existence filter rather than "delete"
            // events when the query is resumed.
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Resume the query and save the resulting snapshot for
            // verification. Use some internal testing hooks to "capture" the
            // existence filter mismatches to verify that Watch sent a bloom
            // filter, and it was used to avert a full requery.
            const [existenceFilterMismatches, snapshot2] =
              await captureExistenceFilterMismatches(() => getDocs(coll));

            // Verify that the snapshot from the resumed query contains the
            // expected documents; that is, that it contains the 50 documents
            // that were _not_ deleted.
            const actualDocumentIds = snapshot2.docs
              .map(documentSnapshot => documentSnapshot.ref.id)
              .sort();
            const expectedDocumentIds = createdDocuments
              .filter(documentRef => !deletedDocumentIds.has(documentRef.id))
              .map(documentRef => documentRef.id)
              .sort();
            expect(actualDocumentIds, 'snapshot2.docs').to.deep.equal(
              expectedDocumentIds
            );

            // Verify that Watch sent an existence filter with the correct
            // counts when the query was resumed.
            expect(
              existenceFilterMismatches,
              'existenceFilterMismatches'
            ).to.have.length(1);
            const { localCacheCount, existenceFilterCount, bloomFilter } =
              existenceFilterMismatches[0];
            expect(localCacheCount, 'localCacheCount').to.equal(100);
            expect(existenceFilterCount, 'existenceFilterCount').to.equal(50);

            // Verify that Watch sent a valid bloom filter.
            if (!bloomFilter) {
              expect.fail(
                'The existence filter should have specified a bloom filter ' +
                  'in its `unchanged_names` field.'
              );
              throw new Error('should never get here');
            }

            expect(bloomFilter.hashCount, 'bloomFilter.hashCount').to.be.above(
              0
            );
            expect(
              bloomFilter.bitmapLength,
              'bloomFilter.bitmapLength'
            ).to.be.above(0);
            expect(bloomFilter.padding, 'bloomFilterPadding').to.be.above(0);
            expect(bloomFilter.padding, 'bloomFilterPadding').to.be.below(8);

            // Verify that the bloom filter was successfully used to avert a
            // full requery. If a false positive occurred then retry the entire
            // test. Although statistically rare, false positives are expected
            // to happen occasionally. When a false positive _does_ happen, just
            // retry the test with a different set of documents. If that retry
            // also_ experiences a false positive, then fail the test because
            // that is so improbable that something must have gone wrong.
            if (attemptNumber === 1 && !bloomFilter.applied) {
              throw new RetryError();
            }

            expect(
              bloomFilter.applied,
              `bloomFilter.applied with attemptNumber=${attemptNumber}`
            ).to.be.true;
          }
        );
      });
    }
  ).timeout('90s');

  // TODO(b/291365820): Stop skipping this test when running against the
  // Firestore emulator once the emulator is improved to include a bloom filter
  // in the existence filter messages that it sends.
  // eslint-disable-next-line no-restricted-properties
  (USE_EMULATOR ? it.skip : it)(
    'bloom filter should correctly encode complex Unicode characters',
    async () => {
      // Firestore does not do any Unicode normalization on the document IDs.
      // Therefore, two document IDs that are canonically-equivalent (i.e. they
      // visually appear identical) but are represented by a different sequence
      // of Unicode code points are treated as distinct document IDs.
      const testDocIds = [
        'DocumentToDelete',
        // The next two strings both end with "e" with an accent: the first uses
        // the dedicated Unicode code point for this character, while the second
        // uses the standard lowercase "e" followed by the accent combining
        // character.
        'LowercaseEWithAcuteAccent_\u00E9',
        'LowercaseEWithAcuteAccent_\u0065\u0301',
        // The next two strings both end with an "e" with two different accents
        // applied via the following two combining characters. The combining
        // characters are specified in a different order and Firestore treats
        // these document IDs as unique, despite the order of the combining
        // characters being irrelevant.
        'LowercaseEWithMultipleAccents_\u0065\u0301\u0327',
        'LowercaseEWithMultipleAccents_\u0065\u0327\u0301',
        // The next string contains a character outside the BMP (the "basic
        // multilingual plane"); that is, its code point is greater than 0xFFFF.
        // In UTF-16 (which JavaScript uses to store Unicode strings) this
        // requires a surrogate pair, two 16-bit code units, to represent this
        // character. Make sure that its presence is correctly tested in the
        // bloom filter, which uses UTF-8 encoding.
        'Smiley_\u{1F600}'
      ];

      // Verify assumptions about the equivalence of strings in `testDocIds`.
      expect(testDocIds[1].normalize()).equals(testDocIds[2].normalize());
      expect(testDocIds[3].normalize()).equals(testDocIds[4].normalize());
      expect(testDocIds[5]).equals('Smiley_\uD83D\uDE00');

      // Create the mapping from document ID to document data for the document
      // IDs specified in `testDocIds`.
      const testDocs = testDocIds.reduce((map, docId) => {
        map[docId] = { foo: 42 };
        return map;
      }, {} as { [key: string]: DocumentData });

      // Ensure that the local cache is configured to use LRU garbage collection
      // (rather than eager garbage collection) so that the resume token and
      // document data does not get prematurely evicted.
      const lruPersistence = persistence.toLruGc();

      return withTestCollection(lruPersistence, testDocs, async (coll, db) => {
        // Run a query to populate the local cache with documents that have
        // names with complex Unicode characters.
        const snapshot1 = await getDocs(coll);
        const snapshot1DocumentIds = snapshot1.docs.map(
          documentSnapshot => documentSnapshot.id
        );
        expect(snapshot1DocumentIds, 'snapshot1DocumentIds').to.have.members(
          testDocIds
        );

        // Delete one of the documents so that the next call to getDocs() will
        // experience an existence filter mismatch. Use a WriteBatch, rather
        // than deleteDoc(), to avoid affecting the local cache.
        const documentToDelete = doc(coll, 'DocumentToDelete');
        const writeBatchForDocumentDeletes = writeBatch(db);
        writeBatchForDocumentDeletes.delete(documentToDelete);
        await writeBatchForDocumentDeletes.commit();

        // Wait for 10 seconds, during which Watch will stop tracking the query
        // and will send an existence filter rather than "delete" events when
        // the query is resumed.
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Resume the query and save the resulting snapshot for verification.
        // Use some internal testing hooks to "capture" the existence filter
        // mismatches.
        const [existenceFilterMismatches, snapshot2] =
          await captureExistenceFilterMismatches(() => getDocs(coll));
        const snapshot2DocumentIds = snapshot2.docs.map(
          documentSnapshot => documentSnapshot.id
        );
        const testDocIdsMinusDeletedDocId = testDocIds.filter(
          documentId => documentId !== documentToDelete.id
        );
        expect(snapshot2DocumentIds, 'snapshot2DocumentIds').to.have.members(
          testDocIdsMinusDeletedDocId
        );

        // Verify that Watch sent an existence filter with the correct counts.
        expect(
          existenceFilterMismatches,
          'existenceFilterMismatches'
        ).to.have.length(1);
        const existenceFilterMismatch = existenceFilterMismatches[0];
        expect(
          existenceFilterMismatch.localCacheCount,
          'localCacheCount'
        ).to.equal(testDocIds.length);
        expect(
          existenceFilterMismatch.existenceFilterCount,
          'existenceFilterCount'
        ).to.equal(testDocIds.length - 1);

        // Verify that we got a bloom filter from Watch.
        const bloomFilter = existenceFilterMismatch.bloomFilter!;
        expect(bloomFilter?.mightContain, 'bloomFilter.mightContain').to.not.be
          .undefined;

        // The bloom filter application should statistically be successful
        // almost every time; the _only_ time when it would _not_ be successful
        // is if there is a false positive when testing for 'DocumentToDelete'
        // in the bloom filter. So verify that the bloom filter application is
        // successful, unless there was a false positive.
        const isFalsePositive = bloomFilter.mightContain(documentToDelete);
        expect(bloomFilter.applied, 'bloomFilter.applied').to.equal(
          !isFalsePositive
        );

        // Verify that the bloom filter contains the document paths with complex
        // Unicode characters.
        for (const testDoc of snapshot2.docs.map(snapshot => snapshot.ref)) {
          expect(
            bloomFilter.mightContain(testDoc),
            `bloomFilter.mightContain('${testDoc.path}')`
          ).to.be.true;
        }
      });
    }
  ).timeout('90s');
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

/**
 * Checks that running the query while online (against the backend/emulator) results in the same
 * documents as running the query while offline. If `expectedDocs` is provided, it also checks
 * that both online and offline query result is equal to the expected documents.
 *
 * @param query The query to check
 * @param expectedDocs Ordered list of document keys that are expected to match the query
 */
async function checkOnlineAndOfflineResultsMatch(
  query: Query,
  ...expectedDocs: string[]
): Promise<void> {
  const docsFromServer = await getDocsFromServer(query);

  if (expectedDocs.length !== 0) {
    expect(expectedDocs).to.deep.equal(toIds(docsFromServer));
  }

  const docsFromCache = await getDocsFromCache(query);
  expect(toIds(docsFromServer)).to.deep.equal(toIds(docsFromCache));
}
