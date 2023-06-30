/**
 * @license
 * Copyright 2018 Google LLC
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
import { EventsAccumulator } from '../util/events_accumulator';
import {
  doc,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  getDocFromCache,
  onSnapshot,
  setDoc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  FirestoreError
} from '../util/firebase_export';
import { apiDescribe, withTestDb, withTestDoc } from '../util/helpers';

addEqualityMatcher();

/**
 * Note: Transforms are tested pretty thoroughly in server_timestamp.test.ts
 * (via set, update, transactions, nested in documents, multiple transforms
 * together, etc.) and so these tests mostly focus on the array transform
 * semantics.
 */
apiDescribe('Array Transforms:', persistence => {
  // A document reference to read and write to.
  let docRef: DocumentReference;

  // Accumulator used to capture events during the test.
  let accumulator: EventsAccumulator<DocumentSnapshot>;

  // Listener registration for a listener maintained during the course of the
  // test.
  let unsubscribe: () => void;

  /** Writes some initialData and consumes the events generated. */
  async function writeInitialData(initialData: DocumentData): Promise<void> {
    await setDoc(docRef, initialData);
    await accumulator.awaitLocalEvent();
    const snapshot = await accumulator.awaitRemoteEvent();
    expect(snapshot.data()).to.deep.equal(initialData);
  }

  async function expectLocalAndRemoteEvent(
    expected: DocumentData
  ): Promise<void> {
    const localSnap = await accumulator.awaitLocalEvent();
    expect(localSnap.data()).to.deep.equal(expected);
    const remoteSnap = await accumulator.awaitRemoteEvent();
    expect(remoteSnap.data()).to.deep.equal(expected);
  }

  /**
   * Wraps a test, getting a docRef and event accumulator, and cleaning them
   * up when done.
   */
  async function withTestSetup<T>(test: () => Promise<T>): Promise<void> {
    await withTestDoc(persistence, async doc => {
      docRef = doc;
      accumulator = new EventsAccumulator<DocumentSnapshot>();
      unsubscribe = onSnapshot(
        docRef,
        { includeMetadataChanges: true },
        accumulator.storeEvent
      );

      // wait for initial null snapshot to avoid potential races.
      const snapshot = await accumulator.awaitRemoteEvent();
      expect(snapshot.exists()).to.be.false;
      await test();
      unsubscribe();
    });
  }

  it('create document with arrayUnion()', async () => {
    await withTestSetup(async () => {
      await setDoc(docRef, { array: arrayUnion(1, 2) });
      await expectLocalAndRemoteEvent({ array: [1, 2] });
    });
  });

  it('append to array via update()', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ array: [1, 3] });
      await updateDoc(docRef, { array: arrayUnion(2, 1, 4) });
      await expectLocalAndRemoteEvent({ array: [1, 3, 2, 4] });
    });
  });

  it('append to array via set(..., {merge: true})', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ array: [1, 3] });
      await setDoc(docRef, { array: arrayUnion(2, 1, 4) }, { merge: true });
      await expectLocalAndRemoteEvent({ array: [1, 3, 2, 4] });
    });
  });

  it('append object to array via update()', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ array: [{ a: 'hi' }] });
      await updateDoc(docRef, {
        array: arrayUnion({ a: 'hi' }, { a: 'bye' })
      });
      await expectLocalAndRemoteEvent({ array: [{ a: 'hi' }, { a: 'bye' }] });
    });
  });

  it('remove from array via update()', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ array: [1, 3, 1, 3] });
      await updateDoc(docRef, { array: arrayRemove(1, 4) });
      await expectLocalAndRemoteEvent({ array: [3, 3] });
    });
  });

  it('remove from array via set(..., {merge: true})', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ array: [1, 3, 1, 3] });
      await setDoc(docRef, { array: arrayRemove(1, 4) }, { merge: true });
      await expectLocalAndRemoteEvent({ array: [3, 3] });
    });
  });

  it('remove object from array via update()', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ array: [{ a: 'hi' }, { a: 'bye' }] });
      await updateDoc(docRef, { array: arrayRemove({ a: 'hi' }) });
      await expectLocalAndRemoteEvent({ array: [{ a: 'bye' }] });
    });
  });

  it('arrayUnion() supports DocumentReference', async () => {
    await withTestSetup(async () => {
      await setDoc(docRef, { array: arrayUnion(docRef) });
      await expectLocalAndRemoteEvent({ array: [docRef] });
    });
  });

  /**
   * Unlike the withTestSetup() tests above, these tests intentionally avoid
   * having any ongoing listeners so that we can test what gets stored in the
   * offline cache based purely on the write acknowledgement (without receiving
   * an updated document via watch). As such they also rely on persistence
   * being enabled so documents remain in the cache after the write.
   */
  // eslint-disable-next-line no-restricted-properties
  (persistence ? describe : describe.skip)('Server Application: ', () => {
    it('set() with no cached base doc', async () => {
      await withTestDoc(persistence, async docRef => {
        await setDoc(docRef, { array: arrayUnion(1, 2) });
        const snapshot = await getDocFromCache(docRef);
        expect(snapshot.data()).to.deep.equal({ array: [1, 2] });
      });
    });

    it('update() with no cached base doc', async () => {
      let path: string | null = null;
      // Write an initial document in an isolated Firestore instance so it's not
      // stored in our cache
      await withTestDoc(persistence, async docRef => {
        path = docRef.path;
        await setDoc(docRef, { array: [42] });
      });

      await withTestDb(persistence, async db => {
        const docRef = doc(db, path!);
        await updateDoc(docRef, { array: arrayUnion(1, 2) });

        // Nothing should be cached since it was an update and we had no base
        // doc.
        let errCaught = false;
        try {
          await getDocFromCache(docRef);
        } catch (err) {
          expect((err as FirestoreError).code).to.equal('unavailable');
          errCaught = true;
        }
        expect(errCaught).to.be.true;
      });
    });

    it('set(..., {merge}) with no cached based doc', async () => {
      let path: string | null = null;
      // Write an initial document in an isolated Firestore instance so it's not
      // stored in our cache
      await withTestDoc(persistence, async docRef => {
        path = docRef.path;
        await setDoc(docRef, { array: [42] });
      });

      await withTestDb(persistence, async db => {
        const docRef = doc(db, path!);
        await setDoc(docRef, { array: arrayUnion(1, 2) }, { merge: true });

        // Document will be cached but we'll be missing 42.
        const snapshot = await getDocFromCache(docRef);
        expect(snapshot.data()).to.deep.equal({ array: [1, 2] });
      });
    });

    it('update() with cached base doc using arrayUnion()', async () => {
      await withTestDoc(persistence, async docRef => {
        await setDoc(docRef, { array: [42] });
        await updateDoc(docRef, { array: arrayUnion(1, 2) });
        const snapshot = await getDocFromCache(docRef);
        expect(snapshot.data()).to.deep.equal({ array: [42, 1, 2] });
      });
    });

    it('update() with cached base doc using arrayRemove()', async () => {
      await withTestDoc(persistence, async docRef => {
        await setDoc(docRef, { array: [42, 1, 2] });
        await updateDoc(docRef, { array: arrayRemove(1, 2) });
        const snapshot = await getDocFromCache(docRef);
        expect(snapshot.data()).to.deep.equal({ array: [42] });
      });
    });
  });
});
