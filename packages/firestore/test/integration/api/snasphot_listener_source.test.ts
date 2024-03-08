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

import { ListenerDataSource as Source } from '../../../src/core/event_manager';
import { EventsAccumulator } from '../util/events_accumulator';
import {
  addDoc,
  disableNetwork,
  doc,
  DocumentSnapshot,
  enableNetwork,
  getDoc,
  getDocs,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  QuerySnapshot,
  runTransaction,
  updateDoc,
  where
} from '../util/firebase_export';
import {
  apiDescribe,
  toDataArray,
  withTestCollection,
  withTestDocAndInitialData
} from '../util/helpers';

apiDescribe('Snapshot Listener source options ', persistence => {
  // eslint-disable-next-line no-restricted-properties
  (persistence.gc === 'lru' ? describe : describe.skip)(
    'listen to persistence cache',
    () => {
      it('can raise snapshot from cache for Query', () => {
        const testDocs = {
          a: { k: 'a' }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          await getDocs(coll); // Populate the cache.

          const storeEvent = new EventsAccumulator<QuerySnapshot>();
          const unsubscribe = onSnapshot(
            coll,
            { source: Source.Cache },
            storeEvent.storeEvent
          );

          const snapshot = await storeEvent.awaitEvent();
          expect(snapshot.metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a' }]);

          await storeEvent.assertNoAdditionalEvents();
          unsubscribe();
        });
      });

      it('can raise snapshot from cache for DocumentReference', () => {
        const testDocs = { k: 'a' };
        return withTestDocAndInitialData(
          persistence,
          testDocs,
          async docRef => {
            await getDoc(docRef); // Populate the cache.

            const storeEvent = new EventsAccumulator<DocumentSnapshot>();
            const unsubscribe = onSnapshot(
              docRef,
              { source: Source.Cache },
              storeEvent.storeEvent
            );

            const snapshot = await storeEvent.awaitEvent();
            expect(snapshot.metadata.fromCache).to.equal(true);
            expect(snapshot.data()).to.deep.equal({ k: 'a' });

            await storeEvent.assertNoAdditionalEvents();
            unsubscribe();
          }
        );
      });

      it('listen to cache would not be affected by online status change', () => {
        const testDocs = {
          a: { k: 'a' }
        };
        return withTestCollection(persistence, testDocs, async (coll, db) => {
          await getDocs(coll); // Populate the cache.

          const storeEvent = new EventsAccumulator<QuerySnapshot>();
          const unsubscribe = onSnapshot(
            coll,
            { includeMetadataChanges: true, source: Source.Cache },
            storeEvent.storeEvent
          );

          const snapshot = await storeEvent.awaitEvent();
          expect(snapshot.metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'a' }]);

          await disableNetwork(db);
          await enableNetwork(db);

          await storeEvent.assertNoAdditionalEvents();
          unsubscribe();
        });
      });

      it('multiple listeners sourced from cache can work independently', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 },
          b: { k: 'b', sort: 1 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          await getDocs(coll); // Populate the cache.
          const testQuery = query(
            coll,
            where('sort', '>', 0),
            orderBy('sort', 'asc')
          );

          const storeEvent = new EventsAccumulator<QuerySnapshot>();
          const unsubscribe1 = onSnapshot(
            testQuery,
            { source: Source.Cache },
            storeEvent.storeEvent
          );

          const unsubscribe2 = onSnapshot(
            testQuery,
            { source: Source.Cache },
            storeEvent.storeEvent
          );

          let snapshots = await storeEvent.awaitEvents(2);
          expect(toDataArray(snapshots[0])).to.deep.equal([
            { k: 'b', sort: 1 }
          ]);
          expect(snapshots[0].metadata).to.deep.equal(snapshots[1].metadata);
          expect(toDataArray(snapshots[0])).to.deep.equal(
            toDataArray(snapshots[1])
          );

          await addDoc(coll, { k: 'c', sort: 2 });

          snapshots = await storeEvent.awaitEvents(2);
          expect(toDataArray(snapshots[0])).to.deep.equal([
            { k: 'b', sort: 1 },
            { k: 'c', sort: 2 }
          ]);
          expect(snapshots[0].metadata).to.deep.equal(snapshots[1].metadata);
          expect(toDataArray(snapshots[0])).to.deep.equal(
            toDataArray(snapshots[1])
          );

          // Detach one listener, and do a local mutation. The other listener
          // should not be affected.
          unsubscribe1();

          await addDoc(coll, { k: 'd', sort: 3 });

          const snapshot = await storeEvent.awaitEvent();
          expect(snapshot.metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'b', sort: 1 },
            { k: 'c', sort: 2 },
            { k: 'd', sort: 3 }
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
            { source: Source.Cache },
            storeLimitEvent.storeEvent
          );

          // Setup mirroring `limitToLast` query
          const storeLimitToLastEvent = new EventsAccumulator<QuerySnapshot>();
          let limitToLastUnlisten = onSnapshot(
            query(coll, orderBy('sort', 'desc'), limitToLast(2)),
            { source: Source.Cache },
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
            { source: Source.Cache },
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
            { source: Source.Cache },
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
          a: { k: 'a', sort: 0 },
          b: { k: 'b', sort: 1 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          // Listen to the query with default options, which will also populates the cache
          const storeDefaultEvent = new EventsAccumulator<QuerySnapshot>();
          const testQuery = query(
            coll,
            where('sort', '>=', 1),
            orderBy('sort', 'asc')
          );

          const defaultUnlisten = onSnapshot(
            testQuery,
            storeDefaultEvent.storeEvent
          );
          let snapshot = await storeDefaultEvent.awaitRemoteEvent();
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'b', sort: 1 }]);
          expect(snapshot.metadata.fromCache).to.equal(false);

          // Listen to the same query from cache
          const storeCacheEvent = new EventsAccumulator<QuerySnapshot>();
          const cacheUnlisten = onSnapshot(
            testQuery,
            { source: Source.Cache },
            storeCacheEvent.storeEvent
          );
          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'b', sort: 1 }]);
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
          a: { k: 'a', sort: 0 },
          b: { k: 'b', sort: 1 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          // Listen to the cache
          const storeCacheEvent = new EventsAccumulator<QuerySnapshot>();
          const testQuery = query(
            coll,
            where('sort', '!=', 0),
            orderBy('sort', 'asc')
          );

          const cacheUnlisten = onSnapshot(
            testQuery,
            { source: Source.Cache },
            storeCacheEvent.storeEvent
          );
          let snapshot = await storeCacheEvent.awaitEvent();
          // Cache is empty
          expect(toDataArray(snapshot)).to.deep.equal([]);
          expect(snapshot.metadata.fromCache).to.equal(true);

          // Listen to the same query from server
          const storeDefaultEvent = new EventsAccumulator<QuerySnapshot>();
          const defaultUnlisten = onSnapshot(
            testQuery,
            storeDefaultEvent.storeEvent
          );
          snapshot = await storeDefaultEvent.awaitEvent();
          const expectedData = [{ k: 'b', sort: 1 }];
          expect(toDataArray(snapshot)).to.deep.equal(expectedData);
          expect(snapshot.metadata.fromCache).to.equal(false);

          // Default listener updates the cache, which triggers cache listener to raise snapshot.
          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal(expectedData);
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
          a: { k: 'a', sort: 0 },
          b: { k: 'b', sort: 1 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          await getDocs(coll); // Populate the cache.
          const testQuery = query(
            coll,
            where('sort', '!=', 0),
            orderBy('sort', 'asc')
          );

          const storeEvent = new EventsAccumulator<QuerySnapshot>();
          const unsubscribe = onSnapshot(
            testQuery,
            { includeMetadataChanges: true, source: Source.Cache },
            storeEvent.storeEvent
          );

          let snapshot = await storeEvent.awaitEvent();
          expect(snapshot.metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'b', sort: 1 }]);

          await addDoc(coll, { k: 'c', sort: 2 });

          snapshot = await storeEvent.awaitEvent();
          expect(snapshot.metadata.hasPendingWrites).to.equal(true);
          expect(snapshot.metadata.fromCache).to.equal(true);
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'b', sort: 1 },
            { k: 'c', sort: 2 }
          ]);

          // As we are not listening to server, the listener will not get notified
          // when local mutation is acknowledged by server.
          await storeEvent.assertNoAdditionalEvents();
          unsubscribe();
        });
      });

      it('will have synced metadata updates when listening to both cache and default source', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 },
          b: { k: 'b', sort: 1 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          await getDocs(coll); // Populate the cache.
          const testQuery = query(
            coll,
            where('sort', '!=', 0),
            orderBy('sort', 'asc')
          );

          // Listen to the query from cache
          const storeCacheEvent = new EventsAccumulator<QuerySnapshot>();
          const cacheUnlisten = onSnapshot(
            testQuery,
            { includeMetadataChanges: true, source: Source.Cache },
            storeCacheEvent.storeEvent
          );
          let snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'b', sort: 1 }]);
          expect(snapshot.metadata.fromCache).to.equal(true);

          // Listen to the same query from server
          const storeDefaultEvent = new EventsAccumulator<QuerySnapshot>();
          const defaultUnlisten = onSnapshot(
            testQuery,
            { includeMetadataChanges: true },
            storeDefaultEvent.storeEvent
          );
          snapshot = await storeDefaultEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([{ k: 'b', sort: 1 }]);
          // First snapshot will be raised from cache.
          expect(snapshot.metadata.fromCache).to.equal(true);
          snapshot = await storeDefaultEvent.awaitEvent();
          // Second snapshot will be raised from server result
          expect(snapshot.metadata.fromCache).to.equal(false);

          // As listening to metadata changes, the cache listener also gets triggered and synced
          // with default listener.
          snapshot = await storeCacheEvent.awaitEvent();
          expect(snapshot.metadata.fromCache).to.equal(false);

          await addDoc(coll, { k: 'c', sort: 2 });

          // snapshot gets triggered by local mutation
          snapshot = await storeDefaultEvent.awaitEvent();
          const expectedData = [
            { k: 'b', sort: 1 },
            { k: 'c', sort: 2 }
          ];
          expect(toDataArray(snapshot)).to.deep.equal(expectedData);
          expect(snapshot.metadata.hasPendingWrites).to.equal(true);
          expect(snapshot.metadata.fromCache).to.equal(false);

          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal(expectedData);
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
          a: { k: 'a', sort: 0 },
          b: { k: 'b', sort: 1 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          const testQuery = query(
            coll,
            where('sort', '!=', 0),
            orderBy('sort', 'asc')
          );

          // Listen to the query with both source options
          const storeDefaultEvent = new EventsAccumulator<QuerySnapshot>();
          const defaultUnlisten = onSnapshot(
            testQuery,
            storeDefaultEvent.storeEvent
          );
          await storeDefaultEvent.awaitEvent();
          const storeCacheEvent = new EventsAccumulator<QuerySnapshot>();
          const cacheUnlisten = onSnapshot(
            testQuery,
            { source: Source.Cache },
            storeCacheEvent.storeEvent
          );
          await storeCacheEvent.awaitEvent();

          // Un-listen to the default listener.
          defaultUnlisten();
          await storeDefaultEvent.assertNoAdditionalEvents();

          // Add a document and verify listener to cache works as expected
          await addDoc(coll, { k: 'c', sort: -1 });

          const snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'c', sort: -1 },
            { k: 'b', sort: 1 }
          ]);

          await storeCacheEvent.assertNoAdditionalEvents();
          cacheUnlisten();
        });
      });

      it('can un-listen to cache while still listening to server', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 },
          b: { k: 'b', sort: 1 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          const testQuery = query(
            coll,
            where('sort', '!=', 0),
            orderBy('sort', 'asc')
          );

          // Listen to the query with both source options
          const storeDefaultEvent = new EventsAccumulator<QuerySnapshot>();
          const defaultUnlisten = onSnapshot(
            testQuery,
            storeDefaultEvent.storeEvent
          );
          await storeDefaultEvent.awaitEvent();
          const storeCacheEvent = new EventsAccumulator<QuerySnapshot>();
          const cacheUnlisten = onSnapshot(
            testQuery,
            { source: Source.Cache },
            storeCacheEvent.storeEvent
          );
          await storeCacheEvent.awaitEvent();

          // Un-listen to cache.
          cacheUnlisten();
          await storeCacheEvent.assertNoAdditionalEvents();

          // Add a document and verify listener to server works as expected.
          await addDoc(coll, { k: 'c', sort: -1 });

          const snapshot = await storeDefaultEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([
            { k: 'c', sort: -1 },
            { k: 'b', sort: 1 }
          ]);

          await storeDefaultEvent.assertNoAdditionalEvents();
          defaultUnlisten();
        });
      });

      it('can listen/un-listen/re-listen to same query with different source options', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 },
          b: { k: 'b', sort: 1 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          const testQuery = query(
            coll,
            where('sort', '>', 0),
            orderBy('sort', 'asc')
          );

          // Listen to the query with default options, which also populates the cache
          const storeDefaultEvent = new EventsAccumulator<QuerySnapshot>();
          let defaultUnlisten = onSnapshot(
            testQuery,
            storeDefaultEvent.storeEvent
          );
          let snapshot = await storeDefaultEvent.awaitEvent();
          let expectedData = [{ k: 'b', sort: 1 }];
          expect(toDataArray(snapshot)).to.deep.equal(expectedData);

          // Listen to the same query from cache
          const storeCacheEvent = new EventsAccumulator<QuerySnapshot>();
          let cacheUnlisten = onSnapshot(
            testQuery,
            { source: Source.Cache },
            storeCacheEvent.storeEvent
          );
          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal(expectedData);

          // Un-listen to the default listener, add a doc and re-listen.
          defaultUnlisten();
          await addDoc(coll, { k: 'c', sort: 2 });

          snapshot = await storeCacheEvent.awaitEvent();
          expectedData = [
            { k: 'b', sort: 1 },
            { k: 'c', sort: 2 }
          ];
          expect(toDataArray(snapshot)).to.deep.equal(expectedData);

          defaultUnlisten = onSnapshot(testQuery, storeDefaultEvent.storeEvent);
          snapshot = await storeDefaultEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal(expectedData);

          // Un-listen to cache, update a doc, then re-listen to cache.
          cacheUnlisten();
          await updateDoc(doc(coll, 'b'), { k: 'b', sort: 3 });

          snapshot = await storeDefaultEvent.awaitEvent();
          expectedData = [
            { k: 'c', sort: 2 },
            { k: 'b', sort: 3 }
          ];
          expect(toDataArray(snapshot)).to.deep.equal(expectedData);

          cacheUnlisten = onSnapshot(
            testQuery,
            { source: Source.Cache },
            storeCacheEvent.storeEvent
          );

          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal(expectedData);

          defaultUnlisten();
          cacheUnlisten();
        });
      });

      it('can listen to composite index queries from cache', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 },
          b: { k: 'b', sort: 1 }
        };
        return withTestCollection(persistence, testDocs, async coll => {
          await getDocs(coll); // Populate the cache.

          const testQuery = query(
            coll,
            where('k', '<=', 'a'),
            where('sort', '>=', 0)
          );
          const storeEvent = new EventsAccumulator<QuerySnapshot>();
          const unsubscribe = onSnapshot(
            testQuery,
            { source: Source.Cache },
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
          onSnapshot(coll, { source: Source.Cache }, storeEvent.storeEvent);
          snapshot = await storeEvent.awaitEvent();
          expect(snapshot.metadata.fromCache).to.be.true;
          expect(toDataArray(snapshot)).to.deep.equal([]);
        });
      });

      it('will not be triggered by transactions while listening to cache', () => {
        return withTestCollection(persistence, {}, async (coll, db) => {
          const accumulator = new EventsAccumulator<QuerySnapshot>();
          const unsubscribe = onSnapshot(
            coll,
            { source: Source.Cache },
            accumulator.storeEvent
          );

          const snapshot = await accumulator.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal([]);

          const docRef = doc(coll);
          // Use a transaction to perform a write without triggering any local events.
          await runTransaction(db, async txn => {
            txn.set(docRef, { k: 'a' });
          });

          // There should be no events raised
          await accumulator.assertNoAdditionalEvents();
          unsubscribe();
        });
      });

      it('share server side updates when listening to both cache and default', () => {
        const testDocs = {
          a: { k: 'a', sort: 0 },
          b: { k: 'b', sort: 1 }
        };
        return withTestCollection(persistence, testDocs, async (coll, db) => {
          const testQuery = query(
            coll,
            where('sort', '>', 0),
            orderBy('sort', 'asc')
          );

          // Listen to the query with default options, which will also populates the cache
          const storeDefaultEvent = new EventsAccumulator<QuerySnapshot>();
          const defaultUnlisten = onSnapshot(
            testQuery,
            storeDefaultEvent.storeEvent
          );
          let snapshot = await storeDefaultEvent.awaitRemoteEvent();
          let expectedData = [{ k: 'b', sort: 1 }];
          expect(toDataArray(snapshot)).to.deep.equal(expectedData);

          // Listen to the same query from cache
          const storeCacheEvent = new EventsAccumulator<QuerySnapshot>();
          const cacheUnlisten = onSnapshot(
            testQuery,
            { source: Source.Cache },
            storeCacheEvent.storeEvent
          );
          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal(expectedData);

          // Use a transaction to mock server side updates
          const docRef = doc(coll);
          await runTransaction(db, async txn => {
            txn.set(docRef, { k: 'c', sort: 2 });
          });

          // Default listener receives the server update
          snapshot = await storeDefaultEvent.awaitRemoteEvent();
          expectedData = [
            { k: 'b', sort: 1 },
            { k: 'c', sort: 2 }
          ];
          expect(toDataArray(snapshot)).to.deep.equal(expectedData);
          expect(snapshot.metadata.fromCache).to.be.false;

          // Cache listener raises snapshot as well
          snapshot = await storeCacheEvent.awaitEvent();
          expect(toDataArray(snapshot)).to.deep.equal(expectedData);
          expect(snapshot.metadata.fromCache).to.be.false;

          defaultUnlisten();
          cacheUnlisten();
        });
      });
    }
  );
});
