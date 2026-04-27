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
import * as sinon from 'sinon';

import {
  getDoc,
  doc,
  setDoc,
  getDocs,
  collection,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocFromCache,
  getDocsFromCache
} from '../../../src';
import * as eventManagerModule from '../../../src/core/event_manager';
import * as syncEngineModule from '../../../src/core/sync_engine_impl';
import * as localStoreImpl from '../../../src/local/local_store_impl';
import {
  FirestoreError,
  ContextualFirestoreError
} from '../../../src/util/error';
import { newTestFirestore } from '../../util/api_helpers';

describe('Contextual Errors', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('getDoc throws contextual error on failure with authInfo', async () => {
    const firestore = newTestFirestore();

    sinon
      .stub(eventManagerModule, 'eventManagerListen')
      .callsFake(async (eventManager, listener) => {
        listener.onError(
          new FirestoreError('permission-denied', 'Permission denied', {
            authInfo: { uid: 'mock-uid' }
          })
        );
      });

    const docRef = doc(firestore, 'coll/doc');

    try {
      await getDoc(docRef);
      expect.fail('getDoc should have failed');
    } catch (e: unknown) {
      expect(e).to.be.instanceOf(FirestoreError);
      const err = e as ContextualFirestoreError;
      expect(err.code).to.equal('permission-denied');
      expect(err.customData).to.include({
        path: 'coll/doc',
        operationType: 'read'
      });
      expect(err.customData!.authInfo).to.deep.equal({ uid: 'mock-uid' });
    }
  });

  it('getDocs throws contextual error on failure with authInfo', async () => {
    const firestore = newTestFirestore();

    sinon
      .stub(eventManagerModule, 'eventManagerListen')
      .callsFake(async (eventManager, listener) => {
        listener.onError(
          new FirestoreError('permission-denied', 'Permission denied', {
            authInfo: { uid: 'mock-uid' }
          })
        );
      });

    const collRef = collection(firestore, 'coll');

    try {
      await getDocs(collRef);
      expect.fail('getDocs should have failed');
    } catch (e: unknown) {
      expect(e).to.be.instanceOf(FirestoreError);
      const err = e as ContextualFirestoreError;
      expect(err.code).to.equal('permission-denied');
      expect(err.customData).to.include({
        path: 'coll',
        operationType: 'read'
      });
      expect(err.customData!.authInfo).to.deep.equal({ uid: 'mock-uid' });
    }
  });

  it('setDoc throws contextual error on failure with authInfo', async () => {
    const firestore = newTestFirestore();

    sinon
      .stub(syncEngineModule, 'syncEngineWrite')
      .callsFake((syncEngine, batch, userCallback) => {
        userCallback.reject(
          new FirestoreError('permission-denied', 'Permission denied', {
            authInfo: { uid: 'mock-uid' }
          })
        );
        return Promise.resolve();
      });

    const docRef = doc(firestore, 'coll/doc');

    try {
      await setDoc(docRef, { foo: 'bar' });
      expect.fail('setDoc should have failed');
    } catch (e: unknown) {
      expect(e).to.be.instanceOf(FirestoreError);
      const err = e as ContextualFirestoreError;
      expect(err.code).to.equal('permission-denied');
      expect(err.customData).to.include({
        path: 'coll/doc',
        operationType: 'write'
      });
      expect(err.customData!.authInfo).to.deep.equal({ uid: 'mock-uid' });
    }
  });

  it('updateDoc throws contextual error on failure with authInfo', async () => {
    const firestore = newTestFirestore();

    sinon
      .stub(syncEngineModule, 'syncEngineWrite')
      .callsFake((syncEngine, batch, userCallback) => {
        userCallback.reject(
          new FirestoreError('permission-denied', 'Permission denied', {
            authInfo: { uid: 'mock-uid' }
          })
        );
        return Promise.resolve();
      });

    const docRef = doc(firestore, 'coll/doc');

    try {
      await updateDoc(docRef, { foo: 'bar' });
      expect.fail('updateDoc should have failed');
    } catch (e: unknown) {
      expect(e).to.be.instanceOf(FirestoreError);
      const err = e as ContextualFirestoreError;
      expect(err.code).to.equal('permission-denied');
      expect(err.customData).to.include({
        path: 'coll/doc',
        operationType: 'write'
      });
      expect(err.customData!.authInfo).to.deep.equal({ uid: 'mock-uid' });
    }
  });

  it('deleteDoc throws contextual error on failure with authInfo', async () => {
    const firestore = newTestFirestore();

    sinon
      .stub(syncEngineModule, 'syncEngineWrite')
      .callsFake((syncEngine, batch, userCallback) => {
        userCallback.reject(
          new FirestoreError('permission-denied', 'Permission denied', {
            authInfo: { uid: 'mock-uid' }
          })
        );
        return Promise.resolve();
      });

    const docRef = doc(firestore, 'coll/doc');

    try {
      await deleteDoc(docRef);
      expect.fail('deleteDoc should have failed');
    } catch (e: unknown) {
      expect(e).to.be.instanceOf(FirestoreError);
      const err = e as ContextualFirestoreError;
      expect(err.code).to.equal('permission-denied');
      expect(err.customData).to.include({
        path: 'coll/doc',
        operationType: 'write'
      });
      expect(err.customData!.authInfo).to.deep.equal({ uid: 'mock-uid' });
    }
  });

  it('addDoc throws contextual error on failure with authInfo', async () => {
    const firestore = newTestFirestore();

    sinon
      .stub(syncEngineModule, 'syncEngineWrite')
      .callsFake((syncEngine, batch, userCallback) => {
        userCallback.reject(
          new FirestoreError('permission-denied', 'Permission denied', {
            authInfo: { uid: 'mock-uid' }
          })
        );
        return Promise.resolve();
      });

    const collRef = collection(firestore, 'coll');

    try {
      await addDoc(collRef, { foo: 'bar' });
      expect.fail('addDoc should have failed');
    } catch (e: unknown) {
      expect(e).to.be.instanceOf(FirestoreError);
      const err = e as ContextualFirestoreError;
      expect(err.code).to.equal('permission-denied');
      expect(err.customData!.operationType).to.equal('write');
      expect(err.customData!.path).to.match(/^coll\/.+$/);
      expect(err.customData!.authInfo).to.deep.equal({ uid: 'mock-uid' });
    }
  });

  // Cache tests are left without authInfo checks because the internal
  // wrapInUserErrorIfRecoverable function currently drops customData
  // when wrapping IndexedDb errors.
  it('getDocFromCache throws contextual error on failure', async () => {
    const firestore = newTestFirestore();

    const error = new Error('Read failed');
    error.name = 'IndexedDbTransactionError';
    sinon.stub(localStoreImpl, 'localStoreReadDocument').rejects(error);

    const docRef = doc(firestore, 'coll/doc');

    try {
      await getDocFromCache(docRef);
      expect.fail('getDocFromCache should have failed');
    } catch (e: unknown) {
      expect(e).to.be.instanceOf(FirestoreError);
      const err = e as ContextualFirestoreError;
      expect(err.customData).to.include({
        path: 'coll/doc',
        operationType: 'read'
      });
    }
  });

  it('getDocsFromCache throws contextual error on failure', async () => {
    const firestore = newTestFirestore();

    const error = new Error('Query failed');
    error.name = 'IndexedDbTransactionError';
    sinon.stub(localStoreImpl, 'localStoreExecuteQuery').rejects(error);

    const collRef = collection(firestore, 'coll');

    try {
      await getDocsFromCache(collRef);
      expect.fail('getDocsFromCache should have failed');
    } catch (e: unknown) {
      expect(e).to.be.instanceOf(FirestoreError);
      const err = e as ContextualFirestoreError;
      expect(err.customData).to.include({
        path: 'coll',
        operationType: 'read'
      });
    }
  });
});
