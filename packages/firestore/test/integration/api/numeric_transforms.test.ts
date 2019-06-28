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
import { apiDescribe, withTestDoc } from '../util/helpers';

// tslint:disable:no-floating-promises

// tslint:disable-next-line:variable-name Type alias can be capitalized.
const FieldValue = firebase.firestore!.FieldValue;

const DOUBLE_EPSILON = 0.000001;

apiDescribe('Numeric Transforms:', (persistence: boolean) => {
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

  async function expectLocalAndRemoteValue(expectedSum: number): Promise<void> {
    const localSnap = await accumulator.awaitLocalEvent();
    expect(localSnap.get('sum')).to.be.closeTo(expectedSum, DOUBLE_EPSILON);
    const remoteSnap = await accumulator.awaitRemoteEvent();
    expect(remoteSnap.get('sum')).to.be.closeTo(expectedSum, DOUBLE_EPSILON);
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

  it('create document with increment', async () => {
    await withTestSetup(async () => {
      await docRef.set({ sum: FieldValue.increment(1337) });
      await expectLocalAndRemoteValue(1337);
    });
  });

  it('merge on non-existing document with increment', async () => {
    await withTestSetup(async () => {
      await docRef.set({ sum: FieldValue.increment(1337) }, { merge: true });
      await expectLocalAndRemoteValue(1337);
    });
  });

  it('increment existing integer with integer', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ sum: 1337 });
      await docRef.update('sum', FieldValue.increment(1));
      await expectLocalAndRemoteValue(1338);
    });
  });

  it('increment existing double with double', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ sum: 13.37 });
      await docRef.update('sum', FieldValue.increment(0.1));
      await expectLocalAndRemoteValue(13.47);
    });
  });

  it('increment existing double with integer', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ sum: 13.37 });
      await docRef.update('sum', FieldValue.increment(1));
      await expectLocalAndRemoteValue(14.37);
    });
  });

  it('increment existing integer with double', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ sum: 1337 });
      await docRef.update('sum', FieldValue.increment(0.1));
      await expectLocalAndRemoteValue(1337.1);
    });
  });

  it('increment existing string with integer', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ sum: 'overwrite' });
      await docRef.update('sum', FieldValue.increment(1337));
      await expectLocalAndRemoteValue(1337);
    });
  });

  it('increment existing string with double', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ sum: 'overwrite' });
      await docRef.update('sum', FieldValue.increment(13.37));
      await expectLocalAndRemoteValue(13.37);
    });
  });

  it('multiple double increments', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ sum: 0.0 });

      await docRef.firestore.disableNetwork();

      docRef.update('sum', FieldValue.increment(0.1));
      docRef.update('sum', FieldValue.increment(0.01));
      docRef.update('sum', FieldValue.increment(0.001));

      let snap = await accumulator.awaitLocalEvent();
      expect(snap.get('sum')).to.be.closeTo(0.1, DOUBLE_EPSILON);
      snap = await accumulator.awaitLocalEvent();
      expect(snap.get('sum')).to.be.closeTo(0.11, DOUBLE_EPSILON);
      snap = await accumulator.awaitLocalEvent();
      expect(snap.get('sum')).to.be.closeTo(0.111, DOUBLE_EPSILON);

      await docRef.firestore.enableNetwork();

      snap = await accumulator.awaitRemoteEvent();
      expect(snap.get('sum')).to.be.closeTo(0.111, DOUBLE_EPSILON);
    });
  });

  it('increment twice in a batch', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ sum: 'overwrite' });

      const batch = docRef.firestore.batch();
      batch.update(docRef, 'sum', FieldValue.increment(1));
      batch.update(docRef, 'sum', FieldValue.increment(1));
      await batch.commit();

      await expectLocalAndRemoteValue(2);
    });
  });

  it('increment, delete and increment in a batch', async () => {
    await withTestSetup(async () => {
      await writeInitialData({ sum: 'overwrite' });

      const batch = docRef.firestore.batch();
      batch.update(docRef, 'sum', FieldValue.increment(1));
      batch.update(docRef, 'sum', FieldValue.delete());
      batch.update(docRef, 'sum', FieldValue.increment(3));
      await batch.commit();

      await expectLocalAndRemoteValue(3);
    });
  });

  it('increment on top of ServerTimestamp', async () => {
    // This test stacks two pending transforms (a ServerTimestamp and an Increment transform)
    // and reproduces the setup that was reported in
    // https://github.com/firebase/firebase-android-sdk/issues/491
    // In our original code, a NumericIncrementTransformOperation could cause us to decode the
    // ServerTimestamp as part of a PatchMutation, which triggered an assertion failure.
    await withTestSetup(async () => {
      await docRef.firestore.disableNetwork();

      docRef.set({ val: FieldValue.serverTimestamp() });
      let snap = await accumulator.awaitLocalEvent();
      expect(snap.get('val', { serverTimestamps: 'estimate' })).to.not.be.null;

      docRef.set({ val: FieldValue.increment(1) });
      snap = await accumulator.awaitLocalEvent();
      expect(snap.get('val')).to.equal(1);

      await docRef.firestore.enableNetwork();

      snap = await accumulator.awaitRemoteEvent();
      expect(snap.get('val')).to.equal(1);
    });
  });
});
