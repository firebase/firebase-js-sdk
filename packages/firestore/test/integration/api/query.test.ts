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

import { isNode } from '@firebase/util';
import { expect } from 'chai';

import { addEqualityMatcher } from '../../util/equality_matcher';
import { it } from '../../util/mocha_extensions';
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
  documentId,
  enableNetwork,
  endAt,
  endBefore,
  GeoPoint,
  getDocFromCache,
  getDocs,
  limit,
  limitToLast,
  loadBundle,
  onSnapshot,
  or,
  orderBy,
  query,
  QuerySnapshot,
  setDoc,
  startAfter,
  startAt,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  CollectionReference,
  WriteBatch,
  Firestore
} from '../util/firebase_export';
import {
  apiDescribe,
  toChangesArray,
  toDataArray,
  withEmptyTestCollection,
  withTestCollection,
  withTestDb,
  checkOnlineAndOfflineResultsMatch
} from '../util/helpers';

apiDescribe('Queries', persistence => {
  addEqualityMatcher();

  it('QuerySnapshot.toJSON bundle getDocFromCache', async () => {
    if (isNode()) {
      let path: string | null = null;
      let jsonBundle: object | null = null;
      const testDocs = {
        a: { k: 'a' },
        b: { k: 'b' },
        c: { k: 'c' }
      };
      // Write an initial document in an isolated Firestore instance so it's not stored in the cache.
      await withTestCollection(persistence, testDocs, async collection => {
        await getDocs(query(collection)).then(querySnapshot => {
          expect(querySnapshot.docs.length).to.equal(3);
          // Find the path to a known doc.
          querySnapshot.docs.forEach(docSnapshot => {
            if (docSnapshot.ref.path.endsWith('a')) {
              path = docSnapshot.ref.path;
            }
          });
          expect(path).to.not.be.null;
          jsonBundle = querySnapshot.toJSON();
        });
      });
      expect(jsonBundle).to.not.be.null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = (jsonBundle as any).bundle;
      expect(json).to.exist;
      expect(json.length).to.be.greaterThan(0);

      if (path !== null) {
        await withTestDb(persistence, async db => {
          const docRef = doc(db, path!);
          await loadBundle(db, json);
          const docSnap = await getDocFromCache(docRef);
          expect(docSnap.exists);
          expect(docSnap.data()).to.deep.equal(testDocs.a);
        });
      }
    }
  });

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

  it('maintains correct DocumentChange indexes', async () => {
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

  // TODO(b/295872012): This test is skipped due to the flakiness around the
  // checks of hasPendingWrites.
  // We should investigate if this is an actual bug.
  // eslint-disable-next-line no-restricted-properties
  it.skip('can listen for the same query with different options', () => {
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
  it.skipEmulator.skipEnterprise(
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
            // @ts-ignore internal API usage
            if (coll.firestore._databaseId.isDefaultDatabase) {
              expect(err.message).to.match(
                /index.*https:\/\/console\.firebase\.google\.com/
              );
            }
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

  it.skipEnterprise('can use IN filters', async () => {
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

  it.skipEnterprise('can use array-contains-any filters', async () => {
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
          coll,
          query(coll, where('a', '==', 1)),
          'doc1',
          'doc4',
          'doc5'
        );

        // Implicit AND: a == 1 && b == 3
        await checkOnlineAndOfflineResultsMatch(
          coll,
          query(coll, where('a', '==', 1), where('b', '==', 3)),
          'doc4'
        );

        // explicit AND: a == 1 && b == 3
        await checkOnlineAndOfflineResultsMatch(
          coll,
          query(coll, and(where('a', '==', 1), where('b', '==', 3))),
          'doc4'
        );

        // a == 1, limit 2
        await checkOnlineAndOfflineResultsMatch(
          coll,
          query(coll, where('a', '==', 1), limit(2)),
          'doc1',
          'doc4'
        );

        // explicit OR: a == 1 || b == 1 with limit 2
        await checkOnlineAndOfflineResultsMatch(
          coll,
          query(coll, or(where('a', '==', 1), where('b', '==', 1)), limit(2)),
          'doc1',
          'doc2'
        );

        // only limit 2
        await checkOnlineAndOfflineResultsMatch(
          coll,
          query(coll, limit(2)),
          'doc1',
          'doc2'
        );

        // limit 2 and order by b desc
        await checkOnlineAndOfflineResultsMatch(
          coll,
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
          coll,
          query(coll, or(where('a', '==', 1), where('b', '==', 1))),
          'doc1',
          'doc2',
          'doc4',
          'doc5'
        );

        // (a==1 && b==0) || (a==3 && b==2)
        await checkOnlineAndOfflineResultsMatch(
          coll,
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
          coll,
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
          coll,
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
          coll,
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
          coll,
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
          coll,
          query(coll, or(where('a', '==', 2), where('b', 'array-contains', 7))),
          'doc3',
          'doc4',
          'doc6'
        );

        // a==2 || b array-contains-any [0, 3]
        await checkOnlineAndOfflineResultsMatch(
          coll,
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
          coll,
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
          coll,
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
          coll,
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
          coll,
          query(
            coll,
            and(
              where('a', 'in', [2, 3]),
              or(where('b', 'array-contains-any', [0, 7]), where('c', '==', 20))
            )
          ),
          'doc3',
          'doc6'
        );
      });
    });

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
          coll,
          query(
            coll,
            or(where('a', 'in', [2, 3]), where('b', 'array-contains', 3))
          ),
          'doc3',
          'doc4',
          'doc6'
        );

        await checkOnlineAndOfflineResultsMatch(
          coll,
          query(
            coll,
            and(where('a', 'in', [2, 3]), where('b', 'array-contains', 7))
          ),
          'doc3'
        );

        await checkOnlineAndOfflineResultsMatch(
          coll,
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
          coll,
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
          coll,
          query(coll, where('a', '==', 1), orderBy('a')),
          'doc1',
          'doc4',
          'doc5'
        );

        await checkOnlineAndOfflineResultsMatch(
          coll,
          query(coll, where('a', 'in', [2, 3]), orderBy('a')),
          'doc6',
          'doc3'
        );
      });
    });

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
          coll,
          query(coll, or(where('a', 'in', [2, 3]), where('b', 'in', [0, 2]))),
          'doc1',
          'doc3',
          'doc6'
        );

        // Two IN operations on different fields with conjunction.
        await checkOnlineAndOfflineResultsMatch(
          coll,
          query(coll, and(where('a', 'in', [2, 3]), where('b', 'in', [0, 2]))),
          'doc3'
        );

        // Two IN operations on the same field.
        // a IN [1,2,3] && a IN [0,1,4] should result in "a==1".
        await checkOnlineAndOfflineResultsMatch(
          coll,
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
          coll,
          query(
            coll,
            and(where('a', 'in', [2, 3]), where('a', 'in', [0, 1, 4]))
          )
        );

        // a IN [0,3] || a IN [0,2] should union them (similar to: a IN [0,2,3]).
        await checkOnlineAndOfflineResultsMatch(
          coll,
          query(coll, or(where('a', 'in', [0, 3]), where('a', 'in', [0, 2]))),
          'doc3',
          'doc6'
        );

        // Nested composite filter on the same field.
        await checkOnlineAndOfflineResultsMatch(
          coll,
          query(
            coll,
            and(
              where('a', 'in', [1, 3]),
              or(
                where('a', 'in', [0, 2]),
                and(where('b', '==', 3), where('a', 'in', [1, 3]))
              )
            )
          ),
          'doc4'
        );

        // Nested composite filter on the different fields.
        await checkOnlineAndOfflineResultsMatch(
          coll,
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

    it('sdk uses != filter same as backend', async () => {
      const testDocs = {
        a: { zip: Number.NaN },
        b: { zip: 91102 },
        c: { zip: 98101 },
        d: { zip: '98101' },
        e: { zip: [98101] },
        f: { zip: [98101, 98102] },
        g: { zip: ['98101', { zip: 98101 }] },
        h: { zip: { code: 500 } },
        i: { zip: null },
        j: { code: 500 }
      };

      await withTestCollection(persistence, testDocs, async coll => {
        // populate cache with all documents first to ensure getDocsFromCache() scans all docs
        await getDocs(coll);

        let testQuery = query(coll, where('zip', '!=', 98101));
        await checkOnlineAndOfflineResultsMatch(
          coll,
          testQuery,
          'a',
          'b',
          'd',
          'e',
          'f',
          'g',
          'h'
        );

        testQuery = query(coll, where('zip', '!=', Number.NaN));
        await checkOnlineAndOfflineResultsMatch(
          coll,
          testQuery,
          'b',
          'c',
          'd',
          'e',
          'f',
          'g',
          'h'
        );

        testQuery = query(coll, where('zip', '!=', null));
        await checkOnlineAndOfflineResultsMatch(
          coll,
          testQuery,
          'a',
          'b',
          'c',
          'd',
          'e',
          'f',
          'g',
          'h'
        );
      });
    });

    it('sdk uses not-in filter same as backend', async () => {
      const testDocs = {
        a: { zip: Number.NaN },
        b: { zip: 91102 },
        c: { zip: 98101 },
        d: { zip: '98101' },
        e: { zip: [98101] },
        f: { zip: [98101, 98102] },
        g: { zip: ['98101', { zip: 98101 }] },
        h: { zip: { code: 500 } },
        i: { zip: null },
        j: { code: 500 }
      };

      await withTestCollection(persistence, testDocs, async coll => {
        // populate cache with all documents first to ensure getDocsFromCache() scans all docs
        await getDocs(coll);

        let testQuery = query(
          coll,
          where('zip', 'not-in', [98101, 98103, [98101, 98102]])
        );
        await checkOnlineAndOfflineResultsMatch(
          coll,
          testQuery,
          'a',
          'b',
          'd',
          'e',
          'g',
          'h'
        );

        testQuery = query(coll, where('zip', 'not-in', [null]));
        await checkOnlineAndOfflineResultsMatch(coll, testQuery);
      });
    });
  });

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

  it('can query large documents with multi-byte character strings', () => {
    function randomMultiByteCharString(length: number): string {
      const charCodes: number[] = [];

      for (let i = 0; i < length; i++) {
        charCodes.push(randInt(1, 65535));
      }

      return String.fromCharCode(...charCodes);
    }

    function randInt(min: number, max: number): number {
      const scale = max - min + 1;
      return Math.floor(Math.random() * scale);
    }

    let bigString = randomMultiByteCharString(10000);

    // Encode and decode `bigString` to/from UTF-8 to
    // ensure that any transformations applied during
    // UTF-8 encoding are applied equally to the expected
    // and actual results.
    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();
    bigString = textDecoder.decode(textEncoder.encode(bigString));

    const doc = {
      field: bigString
    };

    expect(bigString).to.deep.equal(bigString);

    return withTestCollection(
      persistence,
      { 1: doc },
      async collectionReference => {
        const querySnap = await getDocs(collectionReference);
        expect(querySnap.size).to.equal(1);

        const fieldValue = querySnap.docs[0].get('field');
        expect(fieldValue).to.deep.equal(bigString);
      }
    );
  });
});

apiDescribe('Hanging query issue - #7652', persistence => {
  // Defines a collection that produces the hanging query issue.
  const collectionDefinition = {
    'totalDocs': 573,
    'pageSize': 127,
    'dataSizes': [
      2578, 622, 3385, 0, 2525, 1084, 4192, 3940, 520, 0, 3675, 0, 2639, 1194,
      0, 247, 0, 1618, 494, 1559, 0, 0, 2756, 250, 497, 0, 2071, 355, 3594,
      3174, 2186, 1834, 2455, 226, 211, 2202, 3036, 0, 684, 3114, 0, 0, 1312,
      758, 0, 0, 3582, 586, 1219, 0, 0, 3831, 2848, 1485, 4739, 0, 2632, 0,
      1266, 2169, 0, 179, 1780, 4296, 2041, 3829, 2028, 5430, 0, 0, 5006, 2877,
      0, 298, 538, 0, 3158, 1070, 3221, 652, 2946, 3600, 1716, 2308, 890, 784,
      1332, 4530, 1727, 0, 653, 0, 386, 576, 0, 1908, 0, 5539, 1127, 0, 2340, 0,
      1782, 0, 2153, 194, 0, 3432, 2881, 1016, 0, 941, 430, 5806, 1523, 3287,
      2940, 196, 0, 418, 2012, 2616, 4264, 0, 3226, 1294, 1400, 2425, 0, 0,
      4530, 466, 0, 1803, 2145, 1763, 0, 1190, 0, 0, 3729, 700, 3258, 132, 2307,
      0, 1573, 38, 3209, 2564, 2835, 1554, 1035, 0, 2893, 2141, 2743, 0, 4443,
      296, 0, 0, 576, 0, 770, 0, 3413, 694, 2779, 2541, 0, 0, 787, 3773, 862,
      3311, 1012, 0, 0, 1924, 2511, 1512, 0, 0, 1348, 1327, 0, 0, 2629, 2933,
      145, 457, 4270, 3629, 0, 0, 3060, 1404, 4841, 1657, 0, 1176, 0, 0, 1216,
      1505, 449, 0, 2179, 1168, 0, 1305, 0, 2915, 2692, 1103, 2986, 1200, 1799,
      2526, 827, 0, 2581, 6323, 400, 1377, 1306, 3043, 447, 1479, 520, 4572,
      1883, 0, 6004, 345, 2126, 0, 1967, 3265, 1802, 0, 2986, 3979, 2493, 599,
      3575, 86, 2062, 1596, 1676, 2026, 0, 861, 4938, 1734, 2598, 2503, 0, 0,
      121, 0, 4068, 0, 1492, 0, 0, 0, 1947, 2352, 4353, 0, 0, 1036, 4161, 3142,
      605, 144, 0, 2240, 0, 3382, 2947, 0, 4334, 3441, 5045, 2213, 3131, 0, 154,
      2317, 2831, 0, 1608, 0, 2483, 0, 3992, 4915, 0, 3481, 0, 4369, 951, 2307,
      430, 1510, 1079, 58, 0, 2752, 2782, 108, 0, 2309, 555, 2276, 1969, 0,
      1708, 1282, 1870, 4300, 3909, 3801, 3216, 1240, 1303, 61, 3846, 0, 0,
      3250, 203, 2969, 4053, 452, 1834, 2272, 1605, 3952, 0, 2685, 0, 773, 0,
      2211, 0, 1049, 1076, 0, 18, 2919, 620, 2220, 1238, 0, 3557, 1879, 1264,
      4030, 2001, 770, 1327, 0, 4036, 43, 5425, 0, 0, 1282, 1350, 1672, 1996,
      2969, 275, 1429, 2504, 0, 160, 891, 1471, 5487, 1966, 1780, 0, 2265, 3753,
      4226, 1710, 0, 1583, 5488, 3460, 3942, 2329, 2399, 0, 924, 1879, 0, 2476,
      4164, 3064, 4950, 2464, 1268, 1621, 430, 0, 770, 0, 3807, 1946, 0, 1484,
      3460, 674, 3089, 0, 0, 437, 2535, 0, 0, 2423, 1251, 2087, 2682, 2820, 239,
      0, 1596, 34, 3823, 546, 0, 2495, 0, 3762, 887, 0, 0, 0, 3353, 0, 0, 3230,
      5250, 3369, 4344, 50, 4180, 2033, 1475, 1498, 3402, 1, 900, 0, 4210, 1069,
      0, 1595, 2444, 0, 3249, 3440, 0, 2572, 4686, 1586, 1395, 1890, 946, 0,
      1052, 405, 1800, 0, 1482, 2041, 1416, 3639, 1795, 2380, 1502, 944, 3835,
      688, 6986, 1187, 3572, 2997, 2580, 552, 52, 0, 2924, 0, 0, 1631, 283,
      5936, 0, 3057, 2243, 45, 2944, 3417, 3645, 1800, 1958, 1428, 0, 5347, 186,
      0, 4274, 1590, 2729, 4168, 4175, 0, 2234, 0, 2430, 0, 1751, 0, 0, 2847, 0,
      3726, 728, 5645, 1666, 1900, 2835, 3925, 1425, 576, 0, 5067, 2202, 868,
      2337, 4748, 2690, 0, 3289, 0, 0, 484, 1628, 0, 1195, 1883, 1114, 6103,
      1055, 3794, 2030, 0, 0, 1124, 0, 0, 1353, 0, 3410, 0
    ]
  };
  let collPath: string;

  // Recreates a collection that produces the hanging query issue.
  async function generateTestData(
    db: Firestore,
    coll: CollectionReference
  ): Promise<void> {
    let batch: WriteBatch | null = null;
    for (let i = 1; i <= collectionDefinition.totalDocs; i++) {
      if (batch == null) {
        batch = writeBatch(db);
      }

      batch.set(doc(coll, i.toString()), {
        id: i,
        data: new Array(collectionDefinition.dataSizes[i]).fill(0).join(''),
        createdClientTs: Date.now()
      });

      if (i % 100 === 0) {
        await batch.commit();
        batch = null;
      }
    }

    if (batch != null) {
      await batch.commit();
    }
  }

  // Before all test iterations, create a collection that produces the
  // hanging query issue.
  before(function () {
    this.timeout('90s');
    return withTestCollection(persistence, {}, async (testCollection, db) => {
      collPath = testCollection.path;
      await generateTestData(db, testCollection);
    });
  });

  // Run the test for 20 iteration to attempt to force a failure.
  for (let i = 0; i < 20; i++) {
    // Do not ignore timeouts for these tests. A timeout may indicate a
    // regression. The test is attempting to reproduce hanging queries
    // with a data set known to reproduce.
    it(`iteration ${i}`, async () => {
      return withTestDb(persistence, async db => {
        const q = query(
          collection(db, collPath)!,
          orderBy('id'),
          limit(collectionDefinition.pageSize)
        );

        // In issue #7652, this line will hang indefinitely.
        // The root cause was addressed, and a hardAssert was
        // added to catch any regressions, so this is no longer
        // expected to hang.
        const qSnap = await getDocs(q);

        expect(qSnap.size).to.equal(collectionDefinition.pageSize);
      });
    });
  }
});

export function verifyDocumentChange<T>(
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
