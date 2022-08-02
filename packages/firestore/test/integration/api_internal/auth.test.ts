/**
 * @license
 * Copyright 2021 Google LLC
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

import { FirebaseApp, initializeApp } from '@firebase/app';
import { getAuth, signInAnonymously } from '@firebase/auth';
import { expect } from 'chai';

import {
  getDoc,
  getFirestore,
  doc,
  enableIndexedDbPersistence,
  disableNetwork,
  setDoc
} from '../../../src';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const firebaseConfig = require('../../../../../config/project.json');

let appCount = 0;

function getNextApp(): FirebaseApp {
  const name = 'initialization-test-app-' + appCount++;
  return initializeApp(firebaseConfig, name);
}

describe('Initialization', () => {
  let app: FirebaseApp;

  beforeEach(() => {
    app = getNextApp();
  });

  it('getAuth() before getFirestore()', () => {
    getAuth(app);
    const firestore = getFirestore(app);
    const testDoc = doc(firestore, 'coll/doc');
    return getDoc(testDoc);
  });

  it('getFirestore() before getAuth()', () => {
    const firestore = getFirestore(app);
    getAuth(app);
    const testDoc = doc(firestore, 'coll/doc');
    return getDoc(testDoc);
  });

  it('lazy-loaded getAuth()', () => {
    const firestore = getFirestore(app);
    void Promise.resolve(() => getAuth(app));
    const testDoc = doc(firestore, 'coll/doc');
    return getDoc(testDoc);
  });

  it('getDoc() before getAuth()', () => {
    const firestore = getFirestore(app);
    const testDoc = doc(firestore, 'coll/doc');
    const promise = getDoc(testDoc);
    getAuth(app);
    return promise;
  });

  it('uses user from getAuth()', async () => {
    const firestore = getFirestore(app);
    const testDoc = doc(firestore, 'coll/doc');
    void disableNetwork(firestore); // Go offline to enforce latency-compensation
    void setDoc(testDoc, { foo: 'bar' });

    const auth = getAuth(app);
    void signInAnonymously(auth);

    // setDoc() did not actually persist the document until the sign in attempt.
    // Hence there was no user change and we can read the same document back.
    const cachedDoc = await getDoc(testDoc);
    expect(cachedDoc.exists()).to.be.true;
  });

  it('uses user from asynchronously loaded getAuth()', async () => {
    const firestore = getFirestore(app);
    const testDoc = doc(firestore, 'coll/doc');
    void disableNetwork(firestore); // Go offline to enforce latency-compensation
    void setDoc(testDoc, { foo: 'bar' });

    void Promise.resolve().then(() => {
      const auth = getAuth(app);
      return signInAnonymously(auth);
    });

    // setDoc() did not actually persist the document until the sign in attempt.
    // Hence there was no user change and we can read the same document back.
    const cachedDoc = await getDoc(testDoc);
    expect(cachedDoc.exists()).to.be.true;
  });

  it('uses user from getAuth()', async () => {
    const firestore = getFirestore(app);
    const testDoc = doc(firestore, 'coll/doc');
    void disableNetwork(firestore); // Go offline to enforce latency-compensation
    void setDoc(testDoc, { foo: 'bar' });

    // Wait for the document. This waits for client initialization.
    const cachedDoc = await getDoc(testDoc);
    expect(cachedDoc.exists()).to.be.true;

    const auth = getAuth(app);
    void signInAnonymously(auth);

    try {
      await getDoc(testDoc);
      expect.fail('Document should not have been found after user change');
    } catch (e) {}
  });

  // eslint-disable-next-line no-restricted-properties
  (typeof indexedDB !== 'undefined' ? describe : describe.skip)(
    'with IndexedDB',
    () => {
      it('getAuth() before explicitly initializing Firestore', () => {
        getAuth(app);
        const firestore = getFirestore(app);
        void enableIndexedDbPersistence(firestore);
        const testDoc = doc(firestore, 'coll/doc');
        return getDoc(testDoc);
      });

      it('explicitly initialize Firestore before getAuth()', () => {
        const firestore = getFirestore(app);
        void enableIndexedDbPersistence(firestore);
        getAuth(app);
        const testDoc = doc(firestore, 'coll/doc');
        return getDoc(testDoc);
      });

      it('getFirestore() followed by getAuth() followed by explicitly initialization', () => {
        const firestore = getFirestore(app);
        getAuth(app);
        void enableIndexedDbPersistence(firestore);
        const testDoc = doc(firestore, 'coll/doc');
        return getDoc(testDoc);
      });
    }
  );
});
