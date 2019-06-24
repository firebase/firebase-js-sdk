/**
 * @license
 * Copyright 2018 Google Inc.
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

import { EventsAccumulator } from '../util/events_accumulator';
import firebase from '../util/firebase_export';
import { apiDescribe, withTestDb, withTestDoc } from '../util/helpers';

// tslint:disable-next-line:variable-name Type alias can be capitalized.
const FieldValue = firebase.firestore!.FieldValue;

/**
 * Note: Transforms are tested pretty thoroughly in server_timestamp.test.ts
 * (via set, update, transactions, nested in documents, multiple transforms
 * together, etc.) and so these tests mostly focus on the array transform
 * semantics.
 */
apiDescribe('Array Transforms:', (persistence: boolean) => {
  // A document reference to read and write to.
  let docRef: firestore.DocumentReference;

  // Accumulator used to capture events during the test.
  let accumulator: EventsAccumulator<firestore.DocumentSnapshot>;

  // Listener registration for a listener maintained during the course of the
  // test.
  let unsubscribe: () => void;

  /** Writes some initialData and consumes the events generated. */
  async function writeInitialData(
    initialData: firestore.DocumentData
  ): Promise<void> {
    await docRef.set(initialData);
    await accumulator.awaitLocalEvent();
    const snapshot = await accumulator.awaitRemoteEvent();
    expect(snapshot.data()).to.deep.equal(initialData);
  }

  async function expectLocalAndRemoteEvent(
    expected: firestore.DocumentData
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
      accumulator = new EventsAccumulator<firestore.DocumentSnapshot>();
      unsubscribe = docRef.onSnapshot(
        { includeMetadataChanges: true },
        accumulator.storeEvent
      );

      // wait for initial null snapshot to avoid potential races.
      const snapshot = await accumulator.awaitRemoteEvent();
      expect(snapshot.exists).to.be.false;
      await test();
      unsubscribe();
    });
  }

  it('create document with arrayUnion()', async () => {
    await withTestSetup(async () => {
      await docRef.set({ array: FieldValue.arrayUnion(1, 2) });
      await expectLocalAndRemoteEvent({ array: [1, 2] });
    });
  });

  it('append to array via update()', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ array: [1, 3] });
      await docRef.update({ array: FieldValue.arrayUnion(2, 1, 4) });
      await expectLocalAndRemoteEvent({ array: [1, 3, 2, 4] });
    });
  });

  it('append to array via set(..., {merge: true})', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ array: [1, 3] });
      await docRef.set(
        { array: FieldValue.arrayUnion(2, 1, 4) },
        { merge: true }
      );
      await expectLocalAndRemoteEvent({ array: [1, 3, 2, 4] });
    });
  });

  it('append object to array via update()', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ array: [{ a: 'hi' }] });
      await docRef.update({
        array: FieldValue.arrayUnion({ a: 'hi' }, { a: 'bye' })
      });
      await expectLocalAndRemoteEvent({ array: [{ a: 'hi' }, { a: 'bye' }] });
    });
  });

  it('remove from array via update()', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ array: [1, 3, 1, 3] });
      await docRef.update({ array: FieldValue.arrayRemove(1, 4) });
      await expectLocalAndRemoteEvent({ array: [3, 3] });
    });
  });

  it('remove from array via set(..., {merge: true})', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ array: [1, 3, 1, 3] });
      await docRef.set(
        { array: FieldValue.arrayRemove(1, 4) },
        { merge: true }
      );
      await expectLocalAndRemoteEvent({ array: [3, 3] });
    });
  });

  it('remove object from array via update()', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ array: [{ a: 'hi' }, { a: 'bye' }] });
      await docRef.update({ array: FieldValue.arrayRemove({ a: 'hi' }) });
      await expectLocalAndRemoteEvent({ array: [{ a: 'bye' }] });
    });
  });

  /**
   * Unlike the withTestSetup() tests above, these tests intentionally avoid
   * having any ongoing listeners so that we can test what gets stored in the
   * offline cache based purely on the write acknowledgement (without receiving
   * an updated document via watch). As such they also rely on persistence
   * being enabled so documents remain in the cache after the write.
   */
  (persistence ? describe : describe.skip)('Server Application: ', () => {
    it('set() with no cached base doc', async () => {
      await withTestDoc(persistence, async docRef => {
        await docRef.set({ array: FieldValue.arrayUnion(1, 2) });
        const snapshot = await docRef.get({ source: 'cache' });
        expect(snapshot.data()).to.deep.equal({ array: [1, 2] });
      });
    });

    it('update() with no cached base doc', async () => {
      let path: string | null = null;
      // Write an initial document in an isolated Firestore instance so it's not
      // stored in our cache
      await withTestDoc(persistence, async docRef => {
        path = docRef.path;
        await docRef.set({ array: [42] });
      });

      await withTestDb(persistence, async db => {
        const docRef = db.doc(path!);
        await docRef.update({ array: FieldValue.arrayUnion(1, 2) });

        // Nothing should be cached since it was an update and we had no base
        // doc.
        let errCaught = false;
        try {
          await docRef.get({ source: 'cache' });
        } catch (err) {
          expect(err.code).to.equal('unavailable');
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
        await docRef.set({ array: [42] });
      });

      await withTestDb(persistence, async db => {
        const docRef = db.doc(path!);
        await docRef.set(
          { array: FieldValue.arrayUnion(1, 2) },
          { merge: true }
        );

        // Document will be cached but we'll be missing 42.
        const snapshot = await docRef.get({ source: 'cache' });
        expect(snapshot.data()).to.deep.equal({ array: [1, 2] });
      });
    });

    it('update() with cached base doc using arrayUnion()', async () => {
      await withTestDoc(persistence, async docRef => {
        await docRef.set({ array: [42] });
        await docRef.update({ array: FieldValue.arrayUnion(1, 2) });
        const snapshot = await docRef.get({ source: 'cache' });
        expect(snapshot.data()).to.deep.equal({ array: [42, 1, 2] });
      });
    });

    it('update() with cached base doc using arrayRemove()', async () => {
      await withTestDoc(persistence, async docRef => {
        await docRef.set({ array: [42, 1, 2] });
        await docRef.update({ array: FieldValue.arrayRemove(1, 2) });
        const snapshot = await docRef.get({ source: 'cache' });
        expect(snapshot.data()).to.deep.equal({ array: [42] });
      });
    });
  });
});
