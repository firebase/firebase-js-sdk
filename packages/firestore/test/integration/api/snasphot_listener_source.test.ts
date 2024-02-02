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
  collection,
  disableNetwork,
  doc,
  DocumentSnapshot,
  enableNetwork,
  getDoc,
  getDocs,
  limit,
  limitToLast,
  ListenSource,
  loadBundle,
  namedQuery,
  onSnapshot,
  orderBy,
  query,
  QuerySnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  where
} from '../util/firebase_export';
import {
  apiDescribe,
  toDataArray,
  withTestCollection,
  withTestDb,
  withTestDocAndInitialData
} from '../util/helpers';

import { bundleString, verifySuccessProgress } from './bundle.test';

apiDescribe('Snapshot Listener source options ', persistence => {
  // eslint-disable-next-line no-restricted-properties
  (persistence.gc === 'lru' ? describe : describe.skip)(
    'listen to persistence cache',
    () => {
      it('can raise snapshot from cache for Query', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          await getDocs(coll); // Populate the cache.

          const storeEvent = new EventsAccumulator<QuerySnapshot>();
          const unsubscribe = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            { source: ListenSource.Cache },
            storeEvent.storeEvent
          );

          const snapshot = await storeEvent.awaitEvent();
          expect(snapshot.metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);

          await storeEvent.assertNoAdditionalEvents();
          unsubscribe();
        });
      });

      it('can raise snapshot from cache for DocumentReference', () => {
        const testDocs = { k: 'a', sort: 0 };
        return withTestDocAndInitialData(
          persistence,
          testDocs,
          async docRef => {
            await getDoc(docRef); // Populate the cache.

            const storeEvent = new EventsAccumulator<DocumentSnapshot>();
            const unsubscribe = onSnapshot(
              docRef,
              { source: ListenSource.Cache },
              storeEvent.storeEvent
            );

            const snapshot = await storeEvent.awaitEvent();
            expect(snapshot.metadata.fromCache).to.equal(true);
            expect(snapshot.data()).to.deep.equal({ k: 'a', sort: 0 });

            await storeEvent.assertNoAdditionalEvents();
            unsubscribe();
          }
        );
      });

      it('listen to cache would not be affected by online status change', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 }
        };
        return withTestCollection(persistence, testDocs, async (coll, db) => {
          await getDocs(coll); // Populate the cache.

          const storeEvent = new EventsAccumulator<QuerySnapshot>();
          const unsubscribe = onSnapshot(
            coll,
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
        });
      });

      it('multiple listeners sourced from cache can work independently', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          await getDocs(coll); // Populate the cache.

          const storeEvent = new EventsAccumulator<QuerySnapshot>();
          const unsubscribe1 = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            { source: ListenSource.Cache },
            storeEvent.storeEvent
          );

          const unsubscribe2 = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            { source: ListenSource.Cache },
            storeEvent.storeEvent
          );

          let snapshots = await storeEvent.awaitEvents(2);
          expect(toDataArray(snapshots[0])).to.deep.equal([
            { k: 'a', sort: 0 }
          ]);
          expect(snapshots[0].metadata).to.deep.equal(snapshots[1].metadata);
          expect(toDataArray(snapshots[0])).to.deep.equal(
            toDataArray(snapshots[1])
          );

          await addDoc(coll, { k: 'b', sort: 1 });

          snapshots = await storeEvent.awaitEvents(2);
          expect(toDataArray(snapshots[0])).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);
          expect(snapshots[0].metadata).to.deep.equal(snapshots[1].metadata);
          expect(toDataArray(snapshots[0])).to.deep.equal(
            toDataArray(snapshots[1])
          );

          // Detach one listener, and do a local mutation. The other listener
          // should not be affected.
          unsubscribe1();

          await addDoc(coll, { k: 'c', sort: 2 });

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
      it('can listen/un-listen/re-listen to mirror queries from cache', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 },
          b: { k: 'b', sort: 1 },
          c: { k: 'c', sort: 1 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          await getDocs(coll); // Populate the cache.

          // Setup `limit` query
          const storeLimitEvent = new EventsAccumulator<QuerySnapshot>();
          let limitUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc'), limit(2)),
            { source: ListenSource.Cache },
            storeLimitEvent.storeEvent
          );

          // Setup mirroring `limitToLast` query
          const storeLimitToLastEvent = new EventsAccumulator<QuerySnapshot>();
          let limitToLastUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'desc'), limitToLast(2)),
            { source: ListenSource.Cache },
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

          // Un-listen then re-listen to the limit query.
          limitUnlisten();
          limitUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc'), limit(2)),
            { source: ListenSource.Cache },
            storeLimitEvent.storeEvent
          );
          snapshot = await storeLimitEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);
          expect(snapshot.metadata.fromCache).to.equal(true);

          // Add a document that would change the result set.
          await addDoc(coll, { k: 'd', sort: -1 });

          // Verify both queries get expected results.
          snapshot = await storeLimitEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'd', sort: -1 },
            { k: 'a', sort: 0 }
          ]);
          expect(snapshot.metadata.hasPendingWrites).to.equal(true);

          snapshot = await storeLimitToLastEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'd', sort: -1 }
          ]);
          expect(snapshot.metadata.hasPendingWrites).to.equal(true);

          // Un-listen to limitToLast, update a doc, then re-listen limitToLast.
          limitToLastUnlisten();

          await updateDoc(doc(coll, 'a'), { k: 'a', sort: -2 });
          limitToLastUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'desc'), limitToLast(2)),
            { source: ListenSource.Cache },
            storeLimitToLastEvent.storeEvent
          );

          // Verify both queries get expected results.
          snapshot = await storeLimitEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: -2 },
            { k: 'd', sort: -1 }
          ]);
          expect(snapshot.metadata.hasPendingWrites).to.equal(true);

          snapshot = await storeLimitToLastEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'd', sort: -1 },
            { k: 'a', sort: -2 }
          ]);
          // We listened to LimitToLast query after the doc update.
          expect(snapshot.metadata.hasPendingWrites).to.equal(false);

          limitUnlisten();
          limitToLastUnlisten();
        });
      });

      it('can listen to default source first and then cache', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          // Listen to the query with default options, which will also populates the cache
          const storeDefaultEvent = new EventsAccumulator<QuerySnapshot>();
          const defaultUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            storeDefaultEvent.storeEvent
          );
          let snapshot = await storeDefaultEvent.awaitRemoteEvent();
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);
          expect(snapshot.metadata.fromCache).to.equal(false);

          // Listen to the same query from cache
          const storeCacheEvent = new EventsAccumulator<QuerySnapshot>();
          const cacheUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            { source: ListenSource.Cache },
            storeCacheEvent.storeEvent
          );
          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);
          // The metadata is sync with server due to the default listener
          expect(snapshot.metadata.fromCache).to.equal(false);

          await storeDefaultEvent.assertNoAdditionalEvents();
          await storeCacheEvent.assertNoAdditionalEvents();

          defaultUnlisten();
          cacheUnlisten();
        });
      });

      it('can listen to cache source first and then default', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          // Listen to the cache
          const storeCacheEvent = new EventsAccumulator<QuerySnapshot>();
          const cacheUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            { source: ListenSource.Cache },
            storeCacheEvent.storeEvent
          );
          let snapshot = await storeCacheEvent.awaitEvent();
          // Cache is empty
          expect(toDataArray(snapshot)).to.deep.equal([]);
          expect(snapshot.metadata.fromCache).to.equal(true);

          // Listen to the same query from server
          const storeDefaultEvent = new EventsAccumulator<QuerySnapshot>();
          const defaultUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            storeDefaultEvent.storeEvent
          );
          snapshot = await storeDefaultEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);
          expect(snapshot.metadata.fromCache).to.equal(false);

          // Default listener updates the cache, whish triggers cache listener to raise snapshot.
          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);
          // The metadata is sync with server due to the default listener
          expect(snapshot.metadata.fromCache).to.equal(false);

          await storeDefaultEvent.assertNoAdditionalEvents();
          await storeCacheEvent.assertNoAdditionalEvents();

          defaultUnlisten();
          cacheUnlisten();
        });
      });

      it('will not get metadata only updates if listening to cache only', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          await getDocs(coll); // Populate the cache.

          const storeEvent = new EventsAccumulator<QuerySnapshot>();
          const unsubscribe = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            { includeMetadataChanges: true, source: ListenSource.Cache },
            storeEvent.storeEvent
          );

          let snapshot = await storeEvent.awaitEvent();
          expect(snapshot.metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);

          await addDoc(coll, { k: 'b', sort: 1 });

          snapshot = await storeEvent.awaitEvent();
          expect(snapshot.metadata.hasPendingWrites).to.equal(true);
          expect(snapshot.metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);

          // As we are not listening to server, the listener will not get notified
          // when local mutation is acknowledged by server.
          await storeEvent.assertNoAdditionalEvents();
          unsubscribe();
        });
      });

      it('will have synced metadata updates when listening to both cache and default source', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          await getDocs(coll); // Populate the cache.

          // Listen to the query from cache
          const storeCacheEvent = new EventsAccumulator<QuerySnapshot>();
          const cacheUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            { includeMetadataChanges: true, source: ListenSource.Cache },
            storeCacheEvent.storeEvent
          );
          let snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);
          expect(snapshot.metadata.fromCache).to.equal(true);

          // Listen to the same query from server
          const storeDefaultEvent = new EventsAccumulator<QuerySnapshot>();
          const defaultUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            { includeMetadataChanges: true },
            storeDefaultEvent.storeEvent
          );
          snapshot = await storeDefaultEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);
          // First snapshot will be raised from cache.
          expect(snapshot.metadata.fromCache).to.equal(true);
          snapshot = await storeDefaultEvent.awaitEvent();
          // Second snapshot will be raised from server result
          expect(snapshot.metadata.fromCache).to.equal(false);

          // As listening to metadata changes, the cache listener also gets triggered and synced
          // with default listener.
          snapshot = await storeCacheEvent.awaitEvent();
          expect(snapshot.metadata.fromCache).to.equal(false);

          await addDoc(coll, { k: 'b', sort: 1 });

          // snapshot gets triggered by local mutation
          snapshot = await storeDefaultEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);
          expect(snapshot.metadata.hasPendingWrites).to.equal(true);
          expect(snapshot.metadata.fromCache).to.equal(false);

          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);
          expect(snapshot.metadata.hasPendingWrites).to.equal(true);
          expect(snapshot.metadata.fromCache).to.equal(false);

          // Local mutation gets acknowledged by the server
          snapshot = await storeDefaultEvent.awaitEvent();
          expect(snapshot.metadata.hasPendingWrites).to.equal(false);
          expect(snapshot.metadata.fromCache).to.equal(false);

          snapshot = await storeCacheEvent.awaitEvent();
          expect(snapshot.metadata.hasPendingWrites).to.equal(false);
          expect(snapshot.metadata.fromCache).to.equal(false);

          cacheUnlisten();
          defaultUnlisten();
        });
      });

      it('can un-listen to default source while still listening to cache', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          // Listen to the query with both source options
          const storeDefaultEvent = new EventsAccumulator<QuerySnapshot>();
          const defaultUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            storeDefaultEvent.storeEvent
          );
          await storeDefaultEvent.awaitEvent();
          const storeCacheEvent = new EventsAccumulator<QuerySnapshot>();
          const cacheUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            { source: ListenSource.Cache },
            storeCacheEvent.storeEvent
          );
          await storeCacheEvent.awaitEvent();

          // Un-listen to the default listener.
          defaultUnlisten();
          await storeDefaultEvent.assertNoAdditionalEvents();

          // Add a document and verify listener to cache works as expected
          await addDoc(coll, { k: 'b', sort: -1 });

          const snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'b', sort: -1 },
            { k: 'a', sort: 0 }
          ]);

          await storeCacheEvent.assertNoAdditionalEvents();
          cacheUnlisten();
        });
      });

      it('can un-listen to cache while still listening to server', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          // Listen to the query with both source options
          const storeDefaultEvent = new EventsAccumulator<QuerySnapshot>();
          const defaultUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            storeDefaultEvent.storeEvent
          );
          await storeDefaultEvent.awaitEvent();
          const storeCacheEvent = new EventsAccumulator<QuerySnapshot>();
          const cacheUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            { source: ListenSource.Cache },
            storeCacheEvent.storeEvent
          );
          await storeCacheEvent.awaitEvent();

          // Un-listen to cache.
          cacheUnlisten();
          await storeCacheEvent.assertNoAdditionalEvents();

          // Add a document and verify listener to server works as expected.
          await addDoc(coll, { k: 'b', sort: -1 });

          const snapshot = await storeDefaultEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'b', sort: -1 },
            { k: 'a', sort: 0 }
          ]);

          await storeDefaultEvent.assertNoAdditionalEvents();
          defaultUnlisten();
        });
      });

      it('can listen/un-listen/re-listen to same query with different source options', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          // Listen to the query with default options, which also populates the cache
          const storeDefaultEvent = new EventsAccumulator<QuerySnapshot>();
          let defaultUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            storeDefaultEvent.storeEvent
          );
          let snapshot = await storeDefaultEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);

          // Listen to the same query from cache
          const storeCacheEvent = new EventsAccumulator<QuerySnapshot>();
          let cacheUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            { source: ListenSource.Cache },
            storeCacheEvent.storeEvent
          );
          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);

          // Un-listen to the default listener, add a doc and re-listen.
          defaultUnlisten();
          await addDoc(coll, { k: 'b', sort: 1 });

          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);

          defaultUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            storeDefaultEvent.storeEvent
          );
          snapshot = await storeDefaultEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);

          // Un-listen to cache, update a doc, then re-listen to cache.
          cacheUnlisten();
          await updateDoc(doc(coll, 'a'), { k: 'a', sort: 2 });

          snapshot = await storeDefaultEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'b', sort: 1 },
            { k: 'a', sort: 2 }
          ]);

          cacheUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            { source: ListenSource.Cache },
            storeCacheEvent.storeEvent
          );

          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'b', sort: 1 },
            { k: 'a', sort: 2 }
          ]);

          defaultUnlisten();
          cacheUnlisten();
        });
      });

      it('can listen to composite index queries', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          await getDocs(coll); // Populate the cache.

          const query_ = query(
            coll,
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
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);
          unsubscribe();
        });
      });

      it('can raise initial snapshot from cache, even if it is empty', () => {
        return withTestCollection(persistence, {}, async coll => {
          let snapshot = await getDocs(coll); // Populate the cache.
          expect(toDataArray(snapshot)).to.deep.equal([]); // Precondition check.

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

      it('load with documents already pulled from backend', () => {
        return withTestDb(persistence, async db => {
          await setDoc(doc(db, 'coll-1/a'), { k: 'a', bar: 0 });
          await setDoc(doc(db, 'coll-1/b'), { k: 'b', bar: 0 });

          const accumulator = new EventsAccumulator<QuerySnapshot>();
          onSnapshot(
            collection(db, 'coll-1'),
            { source: ListenSource.Cache },
            accumulator.storeEvent
          );
          await accumulator.awaitEvent();
          const encoder = new TextEncoder();
          const progress = await loadBundle(
            db,
            // Testing passing in non-string bundles.
            encoder.encode(bundleString(db))
          );

          verifySuccessProgress(progress);
          // The test bundle is holding ancient documents, so no events are
          // generated as a result. The case where a bundle has newer doc than
          // cache can only be tested in spec tests.
          await accumulator.assertNoAdditionalEvents();

          let snapshot = await getDocs((await namedQuery(db, 'limit'))!);
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'b', bar: 0 }]);

          snapshot = await getDocs((await namedQuery(db, 'limit-to-last'))!);
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', bar: 0 }]);
        });
      });

      it('will not be triggered by transactions', () => {
        return withTestCollection(persistence, {}, async (coll, db) => {
          const accumulator = new EventsAccumulator<QuerySnapshot>();
          const unsubscribe = onSnapshot(
            query(coll, orderBy('sort')),
            { source: ListenSource.Cache },
            accumulator.storeEvent
          );

          const snapshot = await accumulator.awaitEvent();
          expect(snapshot.metadata.fromCache).to.be.true;
          expect(toDataArray(snapshot)).to.deep.equal([]);

          const docRef = doc(coll);
          // Use a transaction to perform a write without triggering any local events.
          await runTransaction(db, async txn => {
            txn.set(docRef, { k: 'a' });
          });

          await accumulator.assertNoAdditionalEvents();
          unsubscribe();
        });
      });

      it('gets triggered by server side updates when listening to both cache and default', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 }
        };
        return withTestCollection(persistence, testDocs, async (coll, db) => {
          // Listen to the query with default options, which will also populates the cache
          const storeDefaultEvent = new EventsAccumulator<QuerySnapshot>();
          const defaultUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            storeDefaultEvent.storeEvent
          );
          let snapshot = await storeDefaultEvent.awaitRemoteEvent();
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);

          // Listen to the same query from cache
          const storeCacheEvent = new EventsAccumulator<QuerySnapshot>();
          const cacheUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'asc')),
            { source: ListenSource.Cache },
            storeCacheEvent.storeEvent
          );
          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a', sort: 0 }]);

          let docRef = doc(coll);
          // Use a transaction to perform a write without triggering any local events.
          await runTransaction(db, async txn => {
            txn.set(docRef, { k: 'b', sort: 1 });
          });

          snapshot = await storeDefaultEvent.awaitRemoteEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);
          expect(snapshot.metadata.fromCache).to.be.false;

          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);
          expect(snapshot.metadata.fromCache).to.be.false;

          defaultUnlisten();
          docRef = doc(coll);
          // Use a transaction to perform a write without triggering any local events.
          await runTransaction(db, async txn => {
            txn.set(docRef, { k: 'c', sort: 2 });
          });

          // Add a document that would change the result set.
          await addDoc(coll, { k: 'c', sort: -1 });

          // Verify listener to cache works as expected
          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'c', sort: -1 },
            { k: 'a', sort: 0 },
            { k: 'b', sort: 1 }
          ]);
          cacheUnlisten();
        });
      });
    }
  );
});
