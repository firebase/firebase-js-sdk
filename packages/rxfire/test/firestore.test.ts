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

// tslint:disable:no-floating-promises

import { expect } from 'chai';
// app is used as namespaces to access types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { initializeApp, firestore, app } from 'firebase/app';
import 'firebase/firestore';
import {
  collection,
  collectionChanges,
  sortedChanges,
  auditTrail,
  docData,
  collectionData
} from '../firestore';
import { map, take, skip } from 'rxjs/operators';

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const TEST_PROJECT = require('../../../config/project.json');

const createId = (): string =>
  Math.random()
    .toString(36)
    .substring(5);

/**
 * Create a collection with a random name. This helps sandbox offline tests and
 * makes sure tests don't interfere with each other as they run.
 */
const createRandomCol = (
  firestore: firestore.Firestore
): firestore.CollectionReference => firestore.collection(createId());

/**
 * Unwrap a snapshot but add the type property to the data object.
 */
const unwrapChange = map((changes: firestore.DocumentChange[]) => {
  return changes.map(c => ({ type: c.type, ...c.doc.data() }));
});

/**
 * Create an environment for the tests to run in. The information is returned
 * from the function for use within the test.
 */
const seedTest = (firestore: firestore.Firestore): any => {
  const colRef = createRandomCol(firestore);
  const davidDoc = colRef.doc('david');
  davidDoc.set({ name: 'David' });
  const shannonDoc = colRef.doc('shannon');
  shannonDoc.set({ name: 'Shannon' });
  const expectedNames = ['David', 'Shannon'];
  const expectedEvents = [
    { name: 'David', type: 'added' },
    { name: 'Shannon', type: 'added' }
  ];
  return { colRef, davidDoc, shannonDoc, expectedNames, expectedEvents };
};

describe('RxFire Firestore', () => {
  let app: app.App;
  let firestore: firestore.Firestore;

  /**
   * Each test runs inside it's own app instance and the app
   * is deleted after the test runs.
   *
   * Firestore tests run "offline" to reduce "flakeyness".
   *
   * Each test is responsible for seeding and removing data. Helper
   * functions are useful if the process becomes brittle or tedious.
   * Note that removing is less necessary since the tests are run
   * offline.
   */
  beforeEach(() => {
    app = initializeApp({ projectId: TEST_PROJECT.projectId });
    firestore = app.firestore();
    firestore.disableNetwork();
  });

  afterEach((done: MochaDone) => {
    app.delete().then(() => done());
  });

  describe('collection', () => {
    /**
     * This is a simple test to see if the collection() method
     * correctly emits snapshots.
     *
     * The test seeds two "people" into the collection. RxFire
     * creats an observable with the `collection()` method and
     * asserts that the two "people" are in the array.
     */
    it('should emit snapshots', (done: MochaDone) => {
      const { colRef, expectedNames } = seedTest(firestore);

      collection(colRef)
        .pipe(map(docs => docs.map(doc => doc.data().name)))
        .subscribe(names => {
          expect(names).to.eql(expectedNames);
          done();
        });
    });
  });

  describe('collectionChanges', () => {
    /**
     * The `stateChanges()` method emits a stream of events as they
     * occur rather than in sorted order.
     *
     * This test adds a "person" and then modifies it. This should
     * result in an array item of "added" and then "modified".
     */
    it('should emit events as they occur', (done: MochaDone) => {
      const { colRef, davidDoc } = seedTest(firestore);

      davidDoc.set({ name: 'David' });
      const firstChange = collectionChanges(colRef).pipe(take(1));
      const secondChange = collectionChanges(colRef).pipe(skip(1));

      firstChange.subscribe(change => {
        expect(change[0].type).to.eq('added');
        davidDoc.update({ name: 'David!' });
      });

      secondChange.subscribe(change => {
        expect(change[0].type).to.eq('modified');
        done();
      });
    });
  });

  describe('sortedChanges', () => {
    /**
     * The `sortedChanges()` method reduces the stream of `collectionChanges()` to
     * a sorted array. This test seeds two "people" and checks to make sure
     * the 'added' change type exists. Afterwards, one "person" is modified.
     * The test then checks that the person is modified and in the proper sorted
     * order.
     */
    it('should emit an array of sorted snapshots', (done: MochaDone) => {
      const { colRef, davidDoc } = seedTest(firestore);

      const addedChanges = sortedChanges(colRef, ['added']).pipe(unwrapChange);

      const modifiedChanges = sortedChanges(colRef).pipe(
        unwrapChange,
        skip(1),
        take(1)
      );

      addedChanges.subscribe(data => {
        const expectedNames = [
          { name: 'David', type: 'added' },
          { name: 'Shannon', type: 'added' }
        ];
        expect(data).to.eql(expectedNames);
        davidDoc.update({ name: 'David!' });
      });

      modifiedChanges.subscribe(data => {
        const expectedNames = [
          { name: 'David!', type: 'modified' },
          { name: 'Shannon', type: 'added' }
        ];
        expect(data).to.eql(expectedNames);
        done();
      });
    });

    /**
     * The events parameter in `sortedChanges()` filters out events by change
     * type. This test seeds two "people" and creates two observables to test
     * the filtering. The first observable filters to 'added' and the second
     * filters to 'modified'.
     */
    it('should filter by event type', (done: MochaDone) => {
      const { colRef, davidDoc, expectedEvents } = seedTest(firestore);

      const addedChanges = sortedChanges(colRef, ['added']).pipe(unwrapChange);
      const modifiedChanges = sortedChanges(colRef, ['modified']).pipe(
        unwrapChange
      );

      addedChanges.subscribe(data => {
        // kick off the modifiedChanges observable
        expect(data).to.eql(expectedEvents);
        davidDoc.update({ name: 'David!' });
      });

      modifiedChanges.subscribe(data => {
        const expectedModifiedEvent = [{ name: 'David!', type: 'modified' }];
        expect(data).to.eql(expectedModifiedEvent);
        done();
      });
    });
  });

  describe('auditTrail', () => {
    /**
     * The `auditTrail()` method returns an array of every change that has
     * occured in the application. This test seeds two "people" into the
     * collection and checks that the two added events are there. It then
     * modifies a "person" and makes sure that event is on the array as well.
     */
    it('should keep create a list of all changes', (done: MochaDone) => {
      const { colRef, expectedEvents, davidDoc } = seedTest(firestore);

      const firstAudit = auditTrail(colRef).pipe(
        unwrapChange,
        take(1)
      );
      const secondAudit = auditTrail(colRef).pipe(
        unwrapChange,
        skip(1)
      );

      firstAudit.subscribe(list => {
        expect(list).to.eql(expectedEvents);
        davidDoc.update({ name: 'David!' });
      });

      secondAudit.subscribe(list => {
        const modifiedList = [
          ...expectedEvents,
          { name: 'David!', type: 'modified' }
        ];
        expect(list).to.eql(modifiedList);
        done();
      });
    });

    /**
     * This test seeds two "people" into the collection. It then creates an
     * auditList observable that is filtered to 'modified' events. It modifies
     * a "person" document and ensures that list contains only the 'modified'
     * event.
     */
    it('should filter the trail of events by event type', (done: MochaDone) => {
      const { colRef, davidDoc } = seedTest(firestore);

      const modifiedAudit = auditTrail(colRef, ['modified']).pipe(unwrapChange);

      modifiedAudit.subscribe(updateList => {
        const expectedEvents = [{ type: 'modified', name: 'David!' }];
        expect(updateList).to.eql(expectedEvents);
        done();
      });

      davidDoc.update({ name: 'David!' });
    });
  });

  describe('auditTrail', () => {
    /**
     * The `auditTrail()` method returns an array of every change that has
     * occured in the application. This test seeds two "people" into the
     * collection and checks that the two added events are there. It then
     * modifies a "person" and makes sure that event is on the array as well.
     */
    it('should keep create a list of all changes', (done: MochaDone) => {
      const { colRef, expectedEvents, davidDoc } = seedTest(firestore);

      const firstAudit = auditTrail(colRef).pipe(
        unwrapChange,
        take(1)
      );
      const secondAudit = auditTrail(colRef).pipe(
        unwrapChange,
        skip(1)
      );

      firstAudit.subscribe(list => {
        expect(list).to.eql(expectedEvents);
        davidDoc.update({ name: 'David!' });
      });

      secondAudit.subscribe(list => {
        const modifiedList = [
          ...expectedEvents,
          { name: 'David!', type: 'modified' }
        ];
        expect(list).to.eql(modifiedList);
        done();
      });
    });

    /**
     * This test seeds two "people" into the collection. The wrap operator then converts
     */
    it('should filter the trail of events by event type', (done: MochaDone) => {
      const { colRef, davidDoc } = seedTest(firestore);

      const modifiedAudit = auditTrail(colRef, ['modified']).pipe(unwrapChange);

      modifiedAudit.subscribe(updateList => {
        const expectedEvents = [{ type: 'modified', name: 'David!' }];
        expect(updateList).to.eql(expectedEvents);
        done();
      });

      davidDoc.update({ name: 'David!' });
    });
  });

  describe('Data Mapping Functions', () => {
    /**
     * The `unwrap(id)` method will map a collection to its data payload and map the doc ID to a the specificed key.
     */
    it('collectionData should map a QueryDocumentSnapshot[] to an array of plain objects', (done: MochaDone) => {
      const { colRef } = seedTest(firestore);

      // const unwrapped = collection(colRef).pipe(unwrap('userId'));
      const unwrapped = collectionData(colRef, 'userId');

      unwrapped.subscribe(val => {
        const expectedDoc = {
          name: 'David',
          userId: 'david'
        };
        expect(val).to.be.instanceof(Array);
        expect(val[0]).to.eql(expectedDoc);
        done();
      });
    });

    it('docData should map a QueryDocumentSnapshot to a plain object', (done: MochaDone) => {
      const { davidDoc } = seedTest(firestore);

      // const unwrapped = doc(davidDoc).pipe(unwrap('UID'));
      const unwrapped = docData(davidDoc, 'UID');

      unwrapped.subscribe(val => {
        const expectedDoc = {
          name: 'David',
          UID: 'david'
        };
        expect(val).to.eql(expectedDoc);
        done();
      });
    });
  });
});
