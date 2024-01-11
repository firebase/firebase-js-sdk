/**
 * @license
 * Copyright 2024 Google LLC
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

import { EventsAccumulator } from '../util/events_accumulator';
import {
  addDoc,
  deleteDoc,
  disableNetwork,
  doc,
  enableNetwork,
  getDocs,
  limit,
  limitToLast,
  ListenSource,
  onSnapshot,
  orderBy,
  query,
  QuerySnapshot,
  setDoc,
  updateDoc,
  where
} from '../util/firebase_export';
import { apiDescribe, toDataArray, withTestCollection } from '../util/helpers';

import { verifyDocumentChange } from './query.test';

apiDescribe('Snapshot Listener source options ', persistence => {
  // eslint-disable-next-line no-restricted-properties
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

          await storeEvent.assertNoAdditionalEvents();
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

            const snapshot = await storeEvent.awaitEvent();
            expect(snapshot.metadata.fromCache).to.equal(true);
            expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);

            await disableNetwork(db);
            await enableNetwork(db);

            await storeEvent.assertNoAdditionalEvents();
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
          await storeEvent.assertNoAdditionalEvents();
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
          let limitUnlisten = onSnapshot(
            query(collection, orderBy('sort', 'asc'), limit(2)),
            { source: ListenSource.Cache },
            storeLimitEvent.storeEvent
          );

          // Setup mirroring `limitToLast` query
          const storeLimitToLastEvent = new EventsAccumulator<QuerySnapshot>();
          let limitToLastUnlisten = onSnapshot(
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
          limitUnlisten = onSnapshot(
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
          limitToLastUnlisten = onSnapshot(
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
          limitToLastUnlisten();
        });
      });

      it('can listen/unlisten/relisten to same query with different source options', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 },
          b: { k: 'b', sort: 1 }
        };
        return withTestCollection(persistence, testDocs, async collection => {
          // Listen to the query with default options, which will also populates the cache
          const storeDefaultEvent = new EventsAccumulator<QuerySnapshot>();
          let defaultUnlisten = onSnapshot(
            query(collection, orderBy('sort', 'asc')),
            storeDefaultEvent.storeEvent
          );

          let snapshot = await storeDefaultEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);
          expect(snapshot.metadata.fromCache).to.equal(false);

          // Listen to the same query from cache
          const storeCacheEvent = new EventsAccumulator<QuerySnapshot>();
          let cacheUnlisten = onSnapshot(
            query(collection, orderBy('sort', 'asc')),
            { source: ListenSource.Cache },
            storeCacheEvent.storeEvent
          );

          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);
          // the cache is sync with server due to the other listener
          expect(snapshot.metadata.fromCache).to.equal(false);

          // Unlisten and re-listen to the default listener.
          defaultUnlisten();
          defaultUnlisten = onSnapshot(
            query(collection, orderBy('sort', 'asc')),
            storeDefaultEvent.storeEvent
          );

          snapshot = await storeDefaultEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);
          expect(snapshot.metadata.fromCache).to.equal(false);

          // Add a document that would change the result set.
          await addDoc(collection, { k: 'c', sort: -1 });

          // Verify both queries get expected results.
          snapshot = await storeDefaultEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'c', sort: -1 },
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);
          expect(snapshot.metadata.fromCache).to.equal(false);

          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'c', sort: -1 },
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);
          expect(snapshot.metadata.fromCache).to.equal(false);

          // Unlisten to cache, update a doc, then re-listen to cache.
          cacheUnlisten();
          await updateDoc(doc(collection, 'a'), { k: 'a', sort: -2 });
          cacheUnlisten = onSnapshot(
            query(collection, orderBy('sort', 'asc')),
            { source: ListenSource.Cache },
            storeCacheEvent.storeEvent
          );

          // Verify both queries get expected results.
          snapshot = await storeDefaultEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: -2 },
            { k: 'c', sort: -1 },
            { k: 'b', sort: 1 }
          ]);
          expect(snapshot.metadata.fromCache).to.equal(false);

          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: -2 },
            { k: 'c', sort: -1 },
            { k: 'b', sort: 1 }
          ]);
          expect(snapshot.metadata.fromCache).to.equal(false);

          defaultUnlisten();
          cacheUnlisten();
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

          const snapshot = await storeEvent.awaitEvent();
          expect(snapshot.metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);
          unsubscribe();
        });
      });

      it('can raise initial snapshot from cache, even if it is empty', () => {
        return withTestCollection(persistence, {}, async coll => {
          let snapshot = await getDocs(coll); // Populate the cache.
          expect(snapshot.metadata.fromCache).to.be.false;
          expect(toDataArray(snapshot)).to.deep.equal([]); // Precondition check.

          // Add a snapshot listener whose first event should be raised from cache.
          const storeEvent = new EventsAccumulator<QuerySnapshot>();
          onSnapshot(
            coll,
            { source: ListenSource.Cache },
            storeEvent.storeEvent
          );
          snapshot = await storeEvent.awaitEvent();
          expect(snapshot.metadata.fromCache).to.be.true;
          expect(toDataArray(snapshot)).to.deep.equal([]);
        });
      });
    }
  );
});
