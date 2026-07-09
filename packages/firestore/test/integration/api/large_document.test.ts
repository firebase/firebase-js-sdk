/**
 * @license
 * Copyright 2026 Google LLC
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
  collection,
  doc,
  disableNetwork,
  enableNetwork,
  getDocFromCache,
  getDocFromServer,
  getDocsFromCache,
  getDocsFromServer,
  onSnapshot,
  orderBy,
  query,
  limit,
  where,
  documentId,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc
} from '../util/firebase_export';
import { apiDescribe, withTestDb } from '../util/helpers';
import {
  getTargetBackend,
  getRunEnterpriseTests,
  TargetBackend
} from '../util/settings';

apiDescribe('Large Documents', persistence => {
  let seedColName: string;

  before(async function () {
    this.timeout(180000); // Tests are very slow because large doc reads have very high latency.
    const runLargeTests = process.env.FIRESTORE_RUN_LARGE_DOC_TESTS;
    if (runLargeTests !== 'YES' && runLargeTests !== 'true') {
      this.skip();
    }
    if (
      getTargetBackend() !== TargetBackend.NIGHTLY ||
      !getRunEnterpriseTests()
    ) {
      this.skip();
    }

    seedColName = `large_doc_tests_js_${Date.now()}`;

    await withTestDb(persistence, async db => {
      const docRef = doc(collection(db, seedColName), 'doc_15_9MB_unicode');
      const snap = await getDocFromServer(docRef);
      if (!snap.exists()) {
        const targetBytes = Math.floor(15.9 * 1024 * 1024);
        const payload = 'a'.repeat(targetBytes);
        await setDoc(docRef, { chunk: payload });
        await setDoc(doc(collection(db, seedColName), 'doc_a'), {
          chunk: payload
        });
        await setDoc(doc(collection(db, seedColName), 'doc_b'), {
          chunk: payload
        });
      }
    });
  });

  after(async function () {
    this.timeout(120000);
    if (!seedColName) return;
    await withTestDb(persistence, async db => {
      try {
        await deleteDoc(doc(collection(db, seedColName), 'doc_15_9MB_unicode'));
        await deleteDoc(doc(collection(db, seedColName), 'doc_a'));
        await deleteDoc(doc(collection(db, seedColName), 'doc_b'));
      } catch (e) {
        // Suppress cleanup exceptions
      }
    });
  });

  it('can read and cache a 15.9MB Unicode document', function () {
    this.timeout(120000);
    return withTestDb(persistence, async db => {
      const docRef = doc(collection(db, seedColName), 'doc_15_9MB_unicode');
      try {
        const serverSnapshot = await getDocFromServer(docRef);
        expect(serverSnapshot.exists()).to.be.true;

        await disableNetwork(db);

        const cacheSnapshot = await getDocFromCache(docRef);
        expect(cacheSnapshot.exists()).to.be.true;

        expect(serverSnapshot.data()).to.deep.equal(cacheSnapshot.data());
      } finally {
        await enableNetwork(db);
      }
    });
  });

  it('cache integrity with multiple large documents', function () {
    this.timeout(120000);
    return withTestDb(persistence, async db => {
      const colRef = collection(db, seedColName);
      const docA = doc(colRef, 'doc_a');
      const docB = doc(colRef, 'doc_b');

      try {
        await getDocFromServer(docA);
        await getDocFromServer(docB);

        await disableNetwork(db);

        const cacheSnapshotA = await getDocFromCache(docA);
        const cacheSnapshotB = await getDocFromCache(docB);

        expect(cacheSnapshotA.exists()).to.be.true;
        expect(cacheSnapshotB.exists()).to.be.true;

        expect(cacheSnapshotA.data()!.chunk).to.exist;
        expect(cacheSnapshotB.data()!.chunk).to.exist;
      } finally {
        await enableNetwork(db);
      }
    });
  });

  it('can run watch snapshot listener on a large document', function () {
    this.timeout(120000);
    return withTestDb(persistence, async db => {
      const docRef = doc(collection(db, seedColName), 'doc_15_9MB_unicode');
      let updateReceived = false;

      const deferred = new Promise<void>((resolve, reject) => {
        const unsubscribe = onSnapshot(
          docRef,
          snapshot => {
            if (snapshot.exists() && snapshot.data()!['differential_field']) {
              updateReceived = true;
              unsubscribe();
              resolve();
            }
          },
          error => {
            unsubscribe();
            reject(error);
          }
        );
      });

      await updateDoc(docRef, { differential_field: 'updated_value' });
      await deferred;
      expect(updateReceived).to.be.true;
    });
  });

  it('can run transaction read-modify-write on a large document', function () {
    this.timeout(120000);
    return withTestDb(persistence, async db => {
      const docRef = doc(collection(db, seedColName), 'doc_15_9MB_unicode');
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(docRef);
        expect(snapshot.exists()).to.be.true;
        transaction.update(docRef, {
          // eslint-disable-next-line camelcase
          transaction_timestamp: serverTimestamp()
        });
      });
    });
  });

  it('can query large documents', function () {
    this.timeout(120000);
    return withTestDb(persistence, async db => {
      const colRef = collection(db, seedColName);
      const q = query(colRef, where(documentId(), 'in', ['doc_a', 'doc_b']));

      try {
        const serverSnapshot = await getDocsFromServer(q);
        expect(serverSnapshot.size).to.equal(2);

        await disableNetwork(db);

        const cacheSnapshot = await getDocsFromCache(q);
        expect(cacheSnapshot.size).to.equal(2);

        expect(serverSnapshot.docs[0].data()).to.deep.equal(
          cacheSnapshot.docs[0].data()
        );
      } finally {
        await enableNetwork(db);
      }
    });
  });

  it('query large documents forces local scan', function () {
    this.timeout(120000);
    return withTestDb(persistence, async db => {
      const colRef = collection(db, seedColName);
      const docA = doc(colRef, 'doc_a');
      const docB = doc(colRef, 'doc_b');

      try {
        await getDocFromServer(docA);
        await getDocFromServer(docB);

        await disableNetwork(db);

        const q = query(colRef, orderBy(documentId()), limit(2));
        const cacheSnapshot = await getDocsFromCache(q);
        expect(cacheSnapshot.size).to.equal(2);
        expect(cacheSnapshot.docs[0].data()!.chunk).to.exist;
      } finally {
        await enableNetwork(db);
      }
    });
  });

  it('gracefully rejects oversized payloads', function () {
    this.timeout(120000);
    return withTestDb(persistence, async db => {
      const docRef = doc(collection(db, seedColName), 'temp_oversized_doc');
      const targetBytes = 16 * 1024 * 1024 + 102400;
      const largePayload = 'a'.repeat(targetBytes);

      try {
        await setDoc(docRef, { chunk: largePayload });
        throw new Error(
          'Setting a document exceeding the 16MB limit should fail.'
        );
      } catch (error: unknown) {
        expect((error as any).code).to.equal('invalid-argument');
      }
    });
  });

  it('can write a 15.9MB document', function () {
    this.timeout(120000);
    return withTestDb(persistence, async db => {
      const tempDocId = 'temp_valid_large_doc_' + Date.now();
      const docRef = doc(collection(db, seedColName), tempDocId);
      const targetBytes = Math.floor(15.9 * 1024 * 1024);
      const largePayload = 'a'.repeat(targetBytes);

      try {
        await setDoc(docRef, { chunk: largePayload });
        const snapshot = await getDocFromServer(docRef);
        expect(snapshot.exists()).to.be.true;
        expect(snapshot.data()!.chunk.length).to.equal(targetBytes);
      } finally {
        try {
          await deleteDoc(docRef);
        } catch (e) {
          // Suppress cleanup exceptions
        }
      }
    });
  });
});
