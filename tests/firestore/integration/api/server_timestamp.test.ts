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
import * as firestore from 'firestore';

import * as testHelpers from '../../util/helpers';
import firebase from '../util/firebase_export';
import { apiDescribe, withTestDoc } from '../util/helpers';
import { PromiseImpl as Promise } from '../../../../src/utils/promise';

const asyncIt = testHelpers.asyncIt;

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
  let accumulator: testHelpers.EventsAccumulator<firestore.DocumentSnapshot>;

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
      .then(() => {
        return accumulator.awaitEvent();
      })
      .then(initialDataSnap => {
        expect(initialDataSnap.data()).to.deep.equal(initialData);
      });
  }

  /**
   * Waits for a snapshot containing setData but with null for the timestamps.
   */
  function waitForLocalEvent(): Promise<void> {
    return accumulator.awaitEvent().then(localSnap => {
      expect(localSnap.data()).to.deep.equal(expectedDataWithTimestamp(null));
    });
  }

  /**
   * Waits for a snapshot containing setData but with resolved server
   * timestamps.
   */
  function waitForRemoteEvent(): Promise<void> {
    // server event should have a resolved timestamp; verify it.
    return accumulator.awaitEvent().then(remoteSnap => {
      expect(remoteSnap.exists).to.equal(true);
      const when = remoteSnap.get('when');
      expect(when).to.be.an.instanceof(Date);
      // Tolerate up to 60 seconds of clock skew between client and server
      // since web tests may run in a Windows VM with a sloppy clock.
      const delta = 60;
      expect(Math.abs(when.getTime() - Date.now())).to.be.lessThan(
        delta * 1000
      );

      // Validate the rest of the document.
      expect(remoteSnap.data()).to.deep.equal(expectedDataWithTimestamp(when));
    });
  }

  /**
   * Wraps a test, getting a docRef and event accumulator, and cleaning them
   * up when done.
   */
  function withTestSetup(test: () => Promise<void>): Promise<void> {
    return withTestDoc(persistence, doc => {
      // Set variables for use during test.
      docRef = doc;
      accumulator = new testHelpers.EventsAccumulator<
        firestore.DocumentSnapshot
      >();
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

  asyncIt('work via set()', () => {
    return withTestSetup(() => {
      return docRef
        .set(setData)
        .then(() => waitForLocalEvent())
        .then(() => waitForRemoteEvent());
    });
  });

  asyncIt('work via update()', () => {
    return withTestSetup(() => {
      return writeInitialData()
        .then(() => docRef.update(updateData))
        .then(() => waitForLocalEvent())
        .then(() => waitForRemoteEvent());
    });
  });

  asyncIt('work via transaction set()', () => {
    return withTestSetup(() => {
      return docRef.firestore
        .runTransaction(txn => {
          txn.set(docRef, setData);
          return Promise.resolve();
        })
        .then(() => waitForRemoteEvent());
    });
  });

  asyncIt('work via transaction update()', () => {
    return withTestSetup(() => {
      return writeInitialData()
        .then(() =>
          docRef.firestore.runTransaction(txn => {
            txn.update(docRef, updateData);
            return Promise.resolve();
          })
        )
        .then(() => waitForRemoteEvent());
    });
  });

  asyncIt('fail via update() on nonexistent document.', () => {
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

  asyncIt('fail via transaction update() on nonexistent document.', () => {
    return withTestSetup(() => {
      return docRef.firestore
        .runTransaction(txn => {
          txn.update(docRef, updateData);
          return Promise.resolve();
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
