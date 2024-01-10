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
  average,
  Bytes,
  collection,
  collectionGroup,
  count,
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
  FieldPath,
  GeoPoint,
  getAggregateFromServer,
  getCountFromServer,
  getDocs,
  limit,
  limitToLast,
  onSnapshot,
  or,
  orderBy,
  query,
  QuerySnapshot,
  setDoc,
  startAfter,
  startAt,
  sum,
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
  RetryError,
  toChangesArray,
  toDataArray,
  toIds,
  PERSISTENCE_MODE_UNSPECIFIED,
  withEmptyTestCollection,
  withRetry,
  withTestCollection,
  withTestDb,
  checkOnlineAndOfflineResultsMatch
} from '../util/helpers';
import { USE_EMULATOR } from '../util/settings';
import { captureExistenceFilterMismatches } from '../util/testing_hooks_util';
import { ListenSource } from '../../../src/api/reference_impl';

apiDescribe('Snapshot Listener source options ', persistence => {
  (persistence.gc === 'lru' ? describe : describe.skip)(
    'listen to persistence cache',
    () => {
      it('can listen to source==cache', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 }
        };
        return withTestCollection(persistence, testDocs, async collection => {
          await getDocs(collection); // Populate the cache.

          const storeEvent = new EventsAccumulator<QuerySnapshot>();
          const unsubscribe = onSnapshot(
            query(collection, orderBy('sort', 'asc')),
            { source: ListenSource.Cache },
            storeEvent.storeEvent
          );

          let snapshot = await storeEvent.awaitEvent();
          expect(snapshot.metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);

          await addDoc(collection, { k: 'b', sort: 1 });
          snapshot = await storeEvent.awaitEvent();
          expect(snapshot.metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);
          unsubscribe();
        });
      });

      it('will not get metadata only updates if only listening to cache', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 }
        };
        return withTestCollection(persistence, testDocs, async collection => {
          await getDocs(collection); // Populate the cache.

          const storeEvent = new EventsAccumulator<QuerySnapshot>();
          const unsubscribe = onSnapshot(
            query(collection, orderBy('sort', 'asc')),
            { includeMetadataChanges: true, source: ListenSource.Cache },
            storeEvent.storeEvent
          );

          let snapshot = await storeEvent.awaitEvent();
          expect(snapshot.metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);

          await addDoc(collection, { k: 'b', sort: 1 });

          snapshot = await storeEvent.awaitEvent();
          expect(snapshot.metadata.hasPendingWrites).to.equal(true);
          expect(snapshot.metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);

          storeEvent.assertNoAdditionalEvents();
          unsubscribe();
        });
      });

      it('listen result would not be affected by online status', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 }
        };
        return withTestCollection(
          persistence,
          testDocs,
          async (collection, db) => {
            await getDocs(collection); // Populate the cache.

            const storeEvent = new EventsAccumulator<QuerySnapshot>();
            const unsubscribe = onSnapshot(
              collection,
              { includeMetadataChanges: true, source: ListenSource.Cache },
              storeEvent.storeEvent
            );

            let snapshot = await storeEvent.awaitEvent();
            expect(snapshot.metadata.fromCache).to.equal(true);
            expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);

            await disableNetwork(db);
            await enableNetwork(db);

            storeEvent.assertNoAdditionalEvents();
            unsubscribe();
          }
        );
      });

      it('can attach multiple listeners to source==cache', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 }
        };
        return withTestCollection(persistence, testDocs, async collection => {
          await getDocs(collection); // Populate the cache.

          const storeEvent = new EventsAccumulator<QuerySnapshot>();
          const unsubscribe1 = onSnapshot(
            query(collection, orderBy('sort', 'asc')),
            { source: ListenSource.Cache },
            storeEvent.storeEvent
          );

          const unsubscribe2 = onSnapshot(
            query(collection, orderBy('sort', 'asc')),
            { source: ListenSource.Cache },
            storeEvent.storeEvent
          );

          let snapshots = await storeEvent.awaitEvents(2);
          expect(snapshots[0].metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshots[0])).to.deep.equal([
            { k: 'a', sort: 0 }
          ]);
          expect(snapshots[1].metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshots[1])).to.deep.equal([
            { k: 'a', sort: 0 }
          ]);

          await addDoc(collection, { k: 'b', sort: 1 });

          snapshots = await storeEvent.awaitEvents(2);
          expect(snapshots[0].metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshots[0])).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);
          expect(snapshots[1].metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshots[1])).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);

          unsubscribe1();

          await addDoc(collection, { k: 'c', sort: 2 });

          const snapshot = await storeEvent.awaitEvent();
          expect(snapshot.metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 },
            { k: 'c', sort: 2 }
          ]);
          storeEvent.assertNoAdditionalEvents();
          unsubscribe2();
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
          await getDocs(collection); // Populate the cache.

          // Setup `limit` query
          const storeLimitEvent = new EventsAccumulator<QuerySnapshot>();
          const limitUnlisten = onSnapshot(
            query(collection, orderBy('sort', 'asc'), limit(2)),
            { source: ListenSource.Cache },
            storeLimitEvent.storeEvent
          );

          // Setup mirroring `limitToLast` query
          const storeLimitToLastEvent = new EventsAccumulator<QuerySnapshot>();
          const limitToLastUnlisten = onSnapshot(
            query(collection, orderBy('sort', 'desc'), limitToLast(2)),
            { source: ListenSource.Cache },
            storeLimitToLastEvent.storeEvent
          );

          // Verify both queries get expected results.
          let snapshot = await storeLimitEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);
          expect(snapshot.metadata.fromCache).to.equal(true);
          snapshot = await storeLimitToLastEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'b', sort: 1 },
            { k: 'a', sort: 0 }
          ]);
          expect(snapshot.metadata.fromCache).to.equal(true);

          // Unlisten then relisten limit query.
          limitUnlisten();
          onSnapshot(
            query(collection, orderBy('sort', 'asc'), limit(2)),
            { source: ListenSource.Cache },
            storeLimitEvent.storeEvent
          );

          // Verify `limit` query still works.
          snapshot = await storeLimitEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);
          expect(snapshot.metadata.fromCache).to.equal(true);

          // Add a document that would change the result set.
          await addDoc(collection, { k: 'e', sort: -1 });

          // Verify both queries get expected results.
          snapshot = await storeLimitEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'e', sort: -1 },
            { k: 'a', sort: 0 }
          ]);
          expect(snapshot.metadata.fromCache).to.equal(true);
          snapshot = await storeLimitToLastEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'e', sort: -1 }
          ]);
          expect(snapshot.metadata.fromCache).to.equal(true);

          // Unlisten to limitToLast, update a doc, then relisten limitToLast.
          limitToLastUnlisten();
          await updateDoc(doc(collection, 'a'), { k: 'a', sort: -2 });
          onSnapshot(
            query(collection, orderBy('sort', 'desc'), limitToLast(2)),
            { source: ListenSource.Cache },
            storeLimitToLastEvent.storeEvent
          );

          // Verify both queries get expected results.
          snapshot = await storeLimitEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: -2 },
            { k: 'e', sort: -1 }
          ]);
          expect(snapshot.metadata.fromCache).to.equal(true);
          snapshot = await storeLimitToLastEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'e', sort: -1 },
            { k: 'a', sort: -2 }
          ]);
          expect(snapshot.metadata.fromCache).to.equal(true);

          limitUnlisten();
          // limitToLastUnlisten();
        });
      });

      it('maintains correct DocumentChange indexes', async () => {
        const testDocs = {
          'a': { order: 1 },
          'b': { order: 2 },
          'c': { 'order': 3 }
        };
        await withTestCollection(persistence, testDocs, async collection => {
          await getDocs(collection); // Populate the cache.

          const accumulator = new EventsAccumulator<QuerySnapshot>();
          const unsubscribe = onSnapshot(
            query(collection, orderBy('order')),
            { source: ListenSource.Cache },
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
            .then(() => setDoc(doc(collection, 'b'), { order: 4 }))
            .then(() => accumulator.awaitEvent())
            .then(querySnapshot => {
              const changes = querySnapshot.docChanges();
              expect(changes.length).to.equal(1);
              verifyDocumentChange(changes[0], 'b', 1, 2, 'modified');
            })
            .then(() => deleteDoc(doc(collection, 'c')))
            .then(() => accumulator.awaitEvent())
            .then(querySnapshot => {
              const changes = querySnapshot.docChanges();
              expect(changes.length).to.equal(1);
              verifyDocumentChange(changes[0], 'c', 1, -1, 'removed');
            });

          unsubscribe();
        });
      });

      it('can listen to composite index queries', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 }
        };
        return withTestCollection(persistence, testDocs, async collection => {
          await getDocs(collection); // Populate the cache.

          const query_ = query(
            collection,
            where('k', '<=', 'a'),
            where('sort', '>=', 0)
          );
          const storeEvent = new EventsAccumulator<QuerySnapshot>();
          const unsubscribe = onSnapshot(
            query_,
            { source: ListenSource.Cache },
            storeEvent.storeEvent
          );

          let snapshot = await storeEvent.awaitEvent();
          expect(snapshot.metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);
          unsubscribe();
        });
      });

      it('can raise initial snapshot from cache, even if it is empty', () => {
        return withTestCollection(persistence, {}, async coll => {
          const snapshot1 = await getDocs(coll); // Populate the cache.
          expect(snapshot1.metadata.fromCache).to.be.false;
          expect(toDataArray(snapshot1)).to.deep.equal([]); // Precondition check.

          // Add a snapshot listener whose first event should be raised from cache.
          const storeEvent = new EventsAccumulator<QuerySnapshot>();
          onSnapshot(
            coll,
            { source: ListenSource.Cache },
            storeEvent.storeEvent
          );
          const snapshot2 = await storeEvent.awaitEvent();
          expect(snapshot2.metadata.fromCache).to.be.true;
          expect(toDataArray(snapshot2)).to.deep.equal([]);
        });
      });
    }
  );

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
});
