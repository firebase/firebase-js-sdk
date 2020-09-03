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

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as firebase from '../src/api';
import { base64 } from '@firebase/util';
import { _FirebaseApp } from '@firebase/app-types/private';

const expect = chai.expect;

before(() => {
  chai.use(chaiAsPromised);
});

describe('Testing Module Tests', function () {
  it('assertSucceeds() iff success', async function () {
    const success = Promise.resolve('success');
    const failure = Promise.reject('failure');
    await firebase.assertSucceeds(success).catch(() => {
      throw new Error('Expected success to succeed.');
    });
    await firebase
      .assertSucceeds(failure)
      .then(() => {
        throw new Error('Expected failure to fail.');
      })
      .catch(() => {});
  });

  it('assertFails() iff PERMISSION_DENIED', async function () {
    const success = Promise.resolve('success');
    const permissionDenied = Promise.reject({
      message: 'PERMISSION_DENIED'
    });
    const otherFailure = Promise.reject('failure');
    await firebase
      .assertFails(success)
      .then(() => {
        throw new Error('Expected success to fail.');
      })
      .catch(() => {});

    await firebase.assertFails(permissionDenied).catch(() => {
      throw new Error('Expected permissionDenied to succeed.');
    });

    await firebase
      .assertFails(otherFailure)
      .then(() => {
        throw new Error('Expected otherFailure to fail.');
      })
      .catch(() => {});
  });

  it('assertFails() if code is permission-denied', async function () {
    const success = Promise.resolve('success');
    const permissionDenied = Promise.reject({
      code: 'permission-denied'
    });
    const otherFailure = Promise.reject('failure');
    await firebase
      .assertFails(success)
      .then(() => {
        throw new Error('Expected success to fail.');
      })
      .catch(() => {});

    await firebase.assertFails(permissionDenied).catch(() => {
      throw new Error('Expected permissionDenied to succeed.');
    });

    await firebase
      .assertFails(otherFailure)
      .then(() => {
        throw new Error('Expected otherFailure to fail.');
      })
      .catch(() => {});
  });

  it('initializeTestApp() with auth=null does not set access token', async function () {
    const app = firebase.initializeTestApp({
      projectId: 'foo',
      auth: undefined
    });

    const authInternal = ((app as unknown) as _FirebaseApp).container
      .getProvider('auth-internal')
      .getImmediate({ optional: true });
    // Auth instance will not be available because no API Key is provided
    expect(authInternal).to.be.null;
  });

  it('initializeTestApp() with auth sets the correct access token', async function () {
    const auth = { uid: 'alice' };
    const app = firebase.initializeTestApp({
      projectId: 'foo',
      auth: auth
    });
    const authInternal = ((app as unknown) as _FirebaseApp).container
      .getProvider('auth-internal')
      .getImmediate();

    const token = await authInternal.getToken();
    expect(token).to.have.keys('accessToken');
    const claims = JSON.parse(
      base64.decodeString(token!.accessToken.split('.')[1], /*webSafe=*/ false)
    );
    // We add an 'iat' field.
    expect(claims).to.deep.equal({ uid: auth.uid, iat: 0, sub: auth.uid });
  });

  it('initializeAdminApp() has admin access', async function () {
    await firebase.loadFirestoreRules({
      projectId: 'foo',
      rules: `service cloud.firestore {
        match /databases/{db}/documents/{doc=**} {
          allow read, write: if false;
        }
      }`
    });

    await firebase.loadDatabaseRules({
      databaseName: 'foo',
      rules: '{ "rules": {".read": false, ".write": false} }'
    });

    const app = firebase.initializeAdminApp({
      projectId: 'foo',
      databaseName: 'foo'
    });

    await firebase.assertSucceeds(
      app.firestore().doc('/foo/bar').set({ hello: 'world' })
    );
    await firebase.assertSucceeds(
      app.database().ref().child('/foo/bar').set({ hello: 'world' })
    );
  });

  it('initializeAdminApp() and initializeTestApp() work together', async function () {
    await firebase.loadDatabaseRules({
      databaseName: 'foo',
      rules: JSON.stringify({
        'rules': {
          'public': { '.read': true, '.write': true },
          'private': { '.read': false, '.write': false }
        }
      })
    });

    const adminApp = firebase.initializeAdminApp({
      projectId: 'foo',
      databaseName: 'foo'
    });

    const testApp = firebase.initializeTestApp({
      projectId: 'foo',
      databaseName: 'foo'
    });

    // Admin app can write anywhere
    await firebase.assertSucceeds(
      adminApp.database().ref().child('/public/doc').set({ hello: 'admin' })
    );
    await firebase.assertSucceeds(
      adminApp.database().ref().child('/private/doc').set({ hello: 'admin' })
    );

    // Test app can only write to public, not to private
    await firebase.assertSucceeds(
      testApp.database().ref().child('/public/doc').set({ hello: 'test' })
    );
    await firebase.assertFails(
      testApp.database().ref().child('/private/doc').set({ hello: 'test' })
    );
  });

  it('loadDatabaseRules() throws if no databaseName or rules', async function () {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect((firebase as any).loadDatabaseRules.bind(null, {})).to.throw(
      /databaseName not specified/
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(
      (firebase as any).loadDatabaseRules.bind(null, {
        databaseName: 'foo'
      }) as Promise<void>
    ).to.throw(/must provide rules/);
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (firebase as any).loadDatabaseRules.bind(null, { rules: '{}' })
    ).to.throw(/databaseName not specified/);
  });

  it('loadDatabaseRules() succeeds on valid input', async function () {
    await firebase.loadDatabaseRules({
      databaseName: 'foo',
      rules: '{ "rules": {} }'
    });
  });

  it('loadFirestoreRules() succeeds on valid input', async function () {
    await firebase.loadFirestoreRules({
      projectId: 'foo',
      rules: `service cloud.firestore {
        match /databases/{db}/documents/{doc=**} {
          allow read, write;
        }
      }`
    });
  });

  it('clearFirestoreData() succeeds on valid input', async function () {
    await firebase.clearFirestoreData({
      projectId: 'foo'
    });
  });

  it('apps() returns apps created with initializeTestApp', async function () {
    const numApps = firebase.apps().length;
    await firebase.initializeTestApp({ databaseName: 'foo', auth: undefined });
    expect(firebase.apps().length).to.equal(numApps + 1);
    await firebase.initializeTestApp({ databaseName: 'bar', auth: undefined });
    expect(firebase.apps().length).to.equal(numApps + 2);
  });

  it('there is a way to get database timestamps', function () {
    expect(firebase.database.ServerValue.TIMESTAMP).to.deep.equal({
      '.sv': 'timestamp'
    });
  });

  it('there is a way to get firestore timestamps', function () {
    expect(firebase.firestore.FieldValue.serverTimestamp()).not.to.be.null;
  });
});
