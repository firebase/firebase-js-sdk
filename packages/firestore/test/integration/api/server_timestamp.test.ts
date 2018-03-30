/**
 * Copyright 2017 Google Inc.
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
import * as firestore from '@firebase/firestore-types';

import firebase from '../util/firebase_export';
import { apiDescribe, DEFAULT_SETTINGS, withTestDoc } from '../util/helpers';
import { EventsAccumulator } from '../util/events_accumulator';

const Timestamp = firebase.firestore.Timestamp;

apiDescribe('Server Timestamps', persistence => {
  // Data written in tests via set().
  const setData = {
    a: 42,
    when: firebase.firestore.FieldValue.serverTimestamp(),
    deep: { when: firebase.firestore.FieldValue.serverTimestamp() }
  };

  // base and update data used for update() tests.
  const initialData = { a: 42 };
  const updateData = {
    when: firebase.firestore.FieldValue.serverTimestamp(),
    deep: { when: firebase.firestore.FieldValue.serverTimestamp() }
  };

  // A document reference to read and write to.
  let docRef: firestore.DocumentReference;

  // Accumulator used to capture events during the test.
  let accumulator: EventsAccumulator<firestore.DocumentSnapshot>;

  // Listener registration for a listener maintained during the course of the
  // test.
  let listenerRegistration: () => void;

  // Returns the expected data, with an arbitrary timestamp substituted in.
  function expectedDataWithTimestamp(timestamp: object | null) {
    return { a: 42, when: timestamp, deep: { when: timestamp } };
  }

  /** Writes initialData and waits for the corresponding snapshot. */
  function writeInitialData(): Promise<void> {
    return docRef
      .set(initialData)
      .then(() => accumulator.awaitEvent())
      .then(initialDataSnap => {
        expect(initialDataSnap.data()).to.deep.equal(initialData);
      });
  }

  /** Waits for a latency compensated local snapshot. */
  function waitForLocalEvent(): Promise<firestore.DocumentSnapshot> {
    return accumulator.awaitEvent().then(remoteSnap => {
      if (remoteSnap.metadata.hasPendingWrites) {
        return remoteSnap;
      } else {
        return waitForLocalEvent();
      }
    });
  }

  /** Waits for `count` latency compensated local snapshots. */
  function waitForLocalEvents(
    count: number
  ): Promise<firestore.DocumentSnapshot[]> {
    const snapshots: firestore.DocumentSnapshot[] = [];
    let promise = Promise.resolve(snapshots);

    while (count--) {
      promise = promise.then(() => waitForLocalEvent()).then(localSnap => {
        snapshots.push(localSnap);
        return snapshots;
      });
    }

    return promise;
  }

  /** Waits for a snapshot that has no pending writes */
  function waitForRemoteEvent(): Promise<firestore.DocumentSnapshot> {
    return accumulator.awaitEvent().then(remoteSnap => {
      if (!remoteSnap.metadata.hasPendingWrites) {
        return remoteSnap;
      } else {
        return waitForRemoteEvent();
      }
    });
  }

  /** Verifies a snapshot containing setData but with resolved server timestamps. */
  function verifyTimestampsAreResolved(snap: firestore.DocumentSnapshot): void {
    expect(snap.exists).to.equal(true);
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
  function verifyTimestampsAreNull(snap: firestore.DocumentSnapshot): void {
    expect(snap.exists).to.equal(true);
    expect(snap.data()).to.deep.equal(expectedDataWithTimestamp(null));
  }

  /** Verifies a snapshot containing setData but with local estimates for server timestamps. */
  function verifyTimestampsAreEstimates(
    snap: firestore.DocumentSnapshot
  ): void {
    expect(snap.exists).to.equal(true);
    const when = snap.get('when', { serverTimestamps: 'estimate' });
    expect(when).to.be.an.instanceof(Timestamp);
    // Validate the rest of the document.
    expect(snap.data({ serverTimestamps: 'estimate' })).to.deep.equal(
      expectedDataWithTimestamp(when)
    );
  }

  /**
   * Verifies a snapshot containing setData but using the previous field value
   * for the timestamps.
   */
  function verifyTimestampsUsePreviousValue(
    current: firestore.DocumentSnapshot,
    prev: firestore.DocumentSnapshot | null
  ): void {
    if (!prev) {
      verifyTimestampsAreNull(current);
    } else {
      expect(current.exists).to.equal(true);
      const when = prev.get('when');
      expect(current.data({ serverTimestamps: 'previous' })).to.deep.equal(
        expectedDataWithTimestamp(when)
      );
    }
  }

  /**
   * Wraps a test, getting a docRef and event accumulator, and cleaning them
   * up when done.
   */
  function withTestSetup(test: () => Promise<void>): Promise<void> {
    return withTestDoc(persistence, doc => {
      // Set variables for use during test.
      docRef = doc;

      accumulator = new EventsAccumulator<firestore.DocumentSnapshot>();
      listenerRegistration = docRef.onSnapshot(accumulator.storeEvent);

      // wait for initial null snapshot to avoid potential races.
      return accumulator
        .awaitEvent()
        .then(docSnap => {
          expect(docSnap.exists).to.equal(false);
        })
        .then(() => test())
        .then(() => {
          listenerRegistration();
        });
    });
  }

  it('work via set()', () => {
    return withTestSetup(() => {
      return docRef
        .set(setData)
        .then(waitForLocalEvent)
        .then(snapshot => verifyTimestampsAreNull(snapshot))
        .then(waitForRemoteEvent)
        .then(snapshot => verifyTimestampsAreResolved(snapshot));
    });
  });

  it('work via update()', () => {
    return withTestSetup(() => {
      return writeInitialData()
        .then(() => docRef.update(updateData))
        .then(waitForLocalEvent)
        .then(snapshot => verifyTimestampsAreNull(snapshot))
        .then(waitForRemoteEvent)
        .then(snapshot => verifyTimestampsAreResolved(snapshot));
    });
  });

  it('work via transaction set()', () => {
    return withTestSetup(() => {
      return docRef.firestore
        .runTransaction(async txn => {
          txn.set(docRef, setData);
        })
        .then(waitForRemoteEvent)
        .then(snapshot => verifyTimestampsAreResolved(snapshot));
    });
  });

  it('work via transaction update()', () => {
    return withTestSetup(() => {
      return writeInitialData()
        .then(() =>
          docRef.firestore.runTransaction(async txn => {
            txn.update(docRef, updateData);
          })
        )
        .then(waitForRemoteEvent)
        .then(snapshot => verifyTimestampsAreResolved(snapshot));
    });
  });

  it('can return estimated value', () => {
    return withTestSetup(() => {
      return writeInitialData()
        .then(() => docRef.update(updateData))
        .then(waitForLocalEvent)
        .then(snapshot => verifyTimestampsAreEstimates(snapshot));
    });
  });

  it('can return previous value', () => {
    let previousSnapshot: firestore.DocumentSnapshot;

    return withTestSetup(() => {
      return writeInitialData()
        .then(() => docRef.update(updateData))
        .then(waitForLocalEvent)
        .then(snapshot => verifyTimestampsUsePreviousValue(snapshot, null))
        .then(waitForRemoteEvent)
        .then(snapshot => {
          previousSnapshot = snapshot;
        })
        .then(() => docRef.update(updateData))
        .then(waitForLocalEvent)
        .then(snapshot =>
          verifyTimestampsUsePreviousValue(snapshot, previousSnapshot)
        );
    });
  });

  it('can return previous value of different type', () => {
    return withTestSetup(() => {
      return writeInitialData()
        .then(() =>
          // Change field 'a' from a number type to a server timestamp.
          docRef.update('a', firebase.firestore.FieldValue.serverTimestamp())
        )
        .then(waitForLocalEvent)
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
        .then(() => docRef.firestore.disableNetwork)
        .then(() => {
          // We set up two consecutive writes with server timestamps.
          docRef.update('a', firebase.firestore.FieldValue.serverTimestamp());
          docRef.update('a', firebase.firestore.FieldValue.serverTimestamp());
          return waitForLocalEvents(2);
        })
        .then(snapshots => {
          // Both snapshot use the initial value (42) as the previous value.
          expect(
            snapshots[0].get('a', { serverTimestamps: 'previous' })
          ).to.equal(42);
          expect(
            snapshots[1].get('a', { serverTimestamps: 'previous' })
          ).to.equal(42);
        });
    });
  });

  it('uses previous value from local mutation', () => {
    return withTestSetup(() => {
      return writeInitialData()
        .then(() => docRef.firestore.disableNetwork)
        .then(() => {
          // We set up three consecutive writes.
          docRef.update('a', firebase.firestore.FieldValue.serverTimestamp());
          docRef.update('a', 1337);
          docRef.update('a', firebase.firestore.FieldValue.serverTimestamp());
          return waitForLocalEvents(3);
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
        });
    });
  });

  it('fail via update() on nonexistent document.', () => {
    return withTestSetup(() => {
      return docRef.update(updateData).then(
        () => {
          return Promise.reject('Should not have succeeded!');
        },
        (error: firestore.FirestoreError) => {
          expect(error.code).to.equal('not-found');
        }
      );
    });
  });

  it('fail via transaction update() on nonexistent document.', () => {
    return withTestSetup(() => {
      return docRef.firestore
        .runTransaction(async txn => {
          txn.update(docRef, updateData);
        })
        .then(
          () => {
            return Promise.reject('Should not have succeeded!');
          },
          (error: firestore.FirestoreError) => {
            expect(error.code).to.equal('not-found');
          }
        );
    });
  });
});
