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

import { EventsAccumulator } from '../util/events_accumulator';
import {
  disableNetwork,
  DocumentReference,
  DocumentSnapshot,
  enableNetwork,
  Firestore,
  FirestoreError,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc
} from '../util/firebase_export';
import { apiDescribe, withTestDoc } from '../util/helpers';

// Allow custom types for testing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTestData = any;

apiDescribe('Server Timestamps', persistence => {
  // Data written in tests via set().
  const setData = {
    a: 42,
    when: serverTimestamp(),
    deep: { when: serverTimestamp() }
  };

  // base and update data used for update() tests.
  const initialData = { a: 42 };
  const updateData = {
    when: serverTimestamp(),
    deep: { when: serverTimestamp() }
  };

  // A document reference to read and write to.
  let docRef: DocumentReference;

  let firestore: Firestore;

  // Accumulator used to capture events during the test.
  let accumulator: EventsAccumulator<DocumentSnapshot>;

  // Listener registration for a listener maintained during the course of the
  // test.
  let unsubscribe: () => void;

  // Returns the expected data, with an arbitrary timestamp substituted in.
  function expectedDataWithTimestamp(timestamp: object | null): AnyTestData {
    return { a: 42, when: timestamp, deep: { when: timestamp } };
  }

  /** Writes initialData and waits for the corresponding snapshot. */
  function writeInitialData(): Promise<void> {
    return setDoc(docRef, initialData)
      .then(() => accumulator.awaitEvent())
      .then(initialDataSnap => {
        expect(initialDataSnap.data()).to.deep.equal(initialData);
      });
  }

  /** Verifies a snapshot containing setData but with resolved server timestamps. */
  function verifyTimestampsAreResolved(snap: DocumentSnapshot): void {
    expect(snap.exists()).to.equal(true);
    const when = snap.get('when');
    expect(when).to.be.an.instanceof(Timestamp);
    // Tolerate up to 60 seconds of clock skew between client and server
    // since web tests may run in a Windows VM with a sloppy clock.
    const delta = 60;
    expect(Math.abs(when.toDate().getTime() - Date.now())).to.be.lessThan(
      delta * 1000
    );

    // Validate the rest of the document.
    expect(snap.data()).to.deep.equal(expectedDataWithTimestamp(when));
  }

  /** Verifies a snapshot containing setData but with null for the timestamps. */
  function verifyTimestampsAreNull(snap: DocumentSnapshot): void {
    expect(snap.exists()).to.equal(true);
    expect(snap.data()).to.deep.equal(expectedDataWithTimestamp(null));
  }

  /** Verifies a snapshot containing setData but with local estimates for server timestamps. */
  function verifyTimestampsAreEstimates(snap: DocumentSnapshot): void {
    expect(snap.exists()).to.equal(true);
    const when = snap.get('when', { serverTimestamps: 'estimate' });
    expect(when).to.be.an.instanceof(Timestamp);
    // Validate the rest of the document.
    expect(snap.data({ serverTimestamps: 'estimate' })).to.deep.equal(
      expectedDataWithTimestamp(when)
    );
  }

  /**
   * Wraps a test, getting a docRef and event accumulator, and cleaning them
   * up when done.
   */
  function withTestSetup(test: () => Promise<void>): Promise<void> {
    return withTestDoc(persistence, (doc, db) => {
      // Set variables for use during test.
      docRef = doc;
      firestore = db;

      accumulator = new EventsAccumulator<DocumentSnapshot>();
      unsubscribe = onSnapshot(
        docRef,
        { includeMetadataChanges: true },
        accumulator.storeEvent
      );

      // wait for initial null snapshot to avoid potential races.
      return accumulator
        .awaitEvent()
        .then(docSnap => {
          expect(docSnap.exists()).to.equal(false);
        })
        .then(() => test())
        .then(() => {
          unsubscribe();
        });
    });
  }

  it('work via set()', () => {
    return withTestSetup(() => {
      return setDoc(docRef, setData)
        .then(() => accumulator.awaitLocalEvent())
        .then(snapshot => verifyTimestampsAreNull(snapshot))
        .then(() => accumulator.awaitRemoteEvent())
        .then(snapshot => verifyTimestampsAreResolved(snapshot));
    });
  });

  it('work via update()', () => {
    return withTestSetup(() => {
      return writeInitialData()
        .then(() => updateDoc(docRef, updateData))
        .then(() => accumulator.awaitLocalEvent())
        .then(snapshot => verifyTimestampsAreNull(snapshot))
        .then(() => accumulator.awaitRemoteEvent())
        .then(snapshot => verifyTimestampsAreResolved(snapshot));
    });
  });

  it('work via transaction set()', () => {
    return withTestSetup(() =>
      runTransaction(firestore, async txn => {
        txn.set(docRef, setData);
      })
        .then(() => accumulator.awaitRemoteEvent())
        .then(snapshot => verifyTimestampsAreResolved(snapshot))
    );
  });

  it('work via transaction update()', () => {
    return withTestSetup(() => {
      return writeInitialData()
        .then(() => accumulator.awaitRemoteEvent())
        .then(() =>
          runTransaction(firestore, async txn => {
            txn.update(docRef, updateData);
          })
        )
        .then(() => accumulator.awaitRemoteEvent())
        .then(snapshot => verifyTimestampsAreResolved(snapshot));
    });
  });

  it('can return estimated value', () => {
    return withTestSetup(() => {
      return writeInitialData()
        .then(() => updateDoc(docRef, updateData))
        .then(() => accumulator.awaitLocalEvent())
        .then(snapshot => verifyTimestampsAreEstimates(snapshot));
    });
  });

  it('can return previous value of different type', () => {
    return withTestSetup(() => {
      return writeInitialData()
        .then(() =>
          // Change field 'a' from a number type to a server timestamp.
          updateDoc(docRef, 'a', serverTimestamp())
        )
        .then(() => accumulator.awaitLocalEvent())
        .then(snapshot => {
          // Verify that we can still obtain the number.
          expect(snapshot.get('a', { serverTimestamps: 'previous' })).to.equal(
            42
          );
        });
    });
  });

  it('can return previous value through consecutive updates', () => {
    return withTestSetup(() => {
      return writeInitialData()
        .then(() => disableNetwork(firestore))
        .then(() => {
          // We set up two consecutive writes with server timestamps.
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          updateDoc(docRef, 'a', serverTimestamp());
          // include b=1 to ensure there's a change resulting in a new snapshot.
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          updateDoc(docRef, 'a', serverTimestamp(), 'b', 1);
          return accumulator.awaitLocalEvents(2);
        })
        .then(snapshots => {
          // Both snapshot use the initial value (42) as the previous value.
          expect(
            snapshots[0].get('a', { serverTimestamps: 'previous' })
          ).to.equal(42);
          expect(
            snapshots[1].get('a', { serverTimestamps: 'previous' })
          ).to.equal(42);
          return enableNetwork(firestore);
        })
        .then(() => accumulator.awaitRemoteEvent())
        .then(remoteSnapshot => {
          expect(remoteSnapshot.get('a')).to.be.an.instanceof(Timestamp);
        });
    });
  });

  it('uses previous value from local mutation', () => {
    return withTestSetup(() => {
      return writeInitialData()
        .then(() => disableNetwork(firestore))
        .then(() => {
          // We set up three consecutive writes.
          void updateDoc(docRef, 'a', serverTimestamp());
          void updateDoc(docRef, 'a', 1337);
          void updateDoc(docRef, 'a', serverTimestamp());
          return accumulator.awaitLocalEvents(3);
        })
        .then(snapshots => {
          // The first snapshot uses the initial value (42) as the previous value.
          expect(
            snapshots[0].get('a', { serverTimestamps: 'previous' })
          ).to.equal(42);
          // The third snapshot uses the intermediate value as the previous value.
          expect(
            snapshots[2].get('a', { serverTimestamps: 'previous' })
          ).to.equal(1337);
          return enableNetwork(firestore);
        })
        .then(() => accumulator.awaitRemoteEvent())
        .then(remoteSnapshot => {
          expect(remoteSnapshot.get('a')).to.be.an.instanceof(Timestamp);
        });
    });
  });

  it('fail via update() on nonexistent document.', () => {
    return withTestSetup(() => {
      return updateDoc(docRef, updateData).then(
        () => Promise.reject('Should not have succeeded!'),
        (error: FirestoreError) => {
          expect(error.code).to.equal('not-found');
        }
      );
    });
  });

  it('fail via transaction update() on nonexistent document.', () => {
    return withTestSetup(() =>
      runTransaction(firestore, async txn => {
        txn.update(docRef, updateData);
      }).then(
        () => Promise.reject('Should not have succeeded!'),
        (error: FirestoreError) => {
          expect(error.code).to.equal('not-found');
        }
      )
    );
  });
});
