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
import * as firebase from '../src/api';
import { base64 } from '@firebase/util';

describe('Testing Module Tests', function() {
  it('assertSucceeds() iff success', async function() {
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

  it('assertFails() iff failure', async function() {
    const success = Promise.resolve('success');
    const failure = Promise.reject('failure');
    await firebase
      .assertFails(success)
      .then(() => {
        throw new Error('Expected success to fail.');
      })
      .catch(() => {});
    await firebase.assertFails(failure).catch(() => {
      throw new Error('Expected failure to succeed.');
    });
  });

  it('initializeAdminApp() throws if no databaseName', function() {
    expect(firebase.initializeAdminApp.bind(null, {})).to.throw(
      /databaseName not specified/
    );
    expect(
      firebase.initializeAdminApp.bind(null, { databaseName: 'foo' })
    ).to.not.throw();
  });

  it('initializeAdminApp() provides admin', function() {
    const app = firebase.initializeAdminApp({ databaseName: 'foo' });
    expect(app.options).to.not.have.any.keys('databaseAuthVariableOverride');
  });

  it('initializeTestApp() uses specified auth.', function() {
    let app = firebase.initializeTestApp({ databaseName: 'foo', auth: {} });
    expect(app.options).to.have.any.keys('databaseAuthVariableOverride');

    app = firebase.initializeTestApp({
      databaseName: 'foo',
      auth: { uid: 'alice' }
    });
    expect(app.options).to.have.any.keys('databaseAuthVariableOverride');
    expect(app.options.databaseAuthVariableOverride).to.have.all.keys('uid');
    expect(app.options.databaseAuthVariableOverride['uid']).to.be.equal(
      'alice'
    );
  });

  it('initializeFirestoreTestApp() uses specified auth.', async function() {
    let app = firebase.initializeFirestoreTestApp({
      projectId: 'foo',
      auth: {}
    });
    let token = await (app as any).INTERNAL.getToken();
    expect(token).to.have.any.keys('accessToken');
    let claims = base64.decodeString(token.accessToken.split('.')[3],/*webSafe=*/true);
    expect(claims).to.equal('{}');

    app = firebase.initializeFirestoreTestApp({
      projectId: 'foo',
      auth: { uid: 'alice' }
    });
    token = await (app as any).INTERNAL.getToken()
    expect(token).to.have.any.keys('accessToken');
    claims = base64.decodeString(token.accessToken.split('.')[3],/*webSafe=*/true);
    expect(claims).to.equal('{"uid":"alice"}');
  });

  it('loadDatabaseRules() throws if no databaseName or rulesPath', async function() {
    expect(firebase.loadDatabaseRules.bind(null, {})).to.throw(
      /databaseName not specified/
    );
    expect(
      firebase.loadDatabaseRules.bind(null, { databaseName: 'foo' })
    ).to.throw(/must provide either rules or rulesPath/);
    expect(
      firebase.loadDatabaseRules.bind(null, {
        rulesPath: '/path/does/not/exist/file.json'
      })
    ).to.throw(/databaseName not specified/);
  });

  it('loadDatabaseRules() throws on file not found', function() {
    const options = {};
    expect(
      firebase.loadDatabaseRules.bind(null, {
        databaseName: 'foo',
        rulesPath: '/path/does/not/exist/file.json'
      })
    ).to.throw(/Could not find file/);
  });

  it('apps() returns all apps created except by initializeFirestoreTestApp', async function() {
    const numApps = firebase.apps().length;
    await firebase.initializeAdminApp({ databaseName: 'foo' });
    expect(firebase.apps().length).to.equal(numApps + 1);
    await firebase.initializeAdminApp({ databaseName: 'foo' });
    expect(firebase.apps().length).to.equal(numApps + 2);
    await firebase.initializeTestApp({ databaseName: 'foo', auth: {} });
    expect(firebase.apps().length).to.equal(numApps + 3);
    await firebase.initializeFirestoreTestApp({ projectId: 'foo', auth: {} });
    expect(firebase.apps().length).to.equal(numApps + 3);
  });

  it('firestoreApps() returns only apps created with initializeFirestoreTestApp', async function() {
    const numApps = firebase.firestoreApps().length;
    await firebase.initializeAdminApp({ databaseName: 'foo' });
    expect(firebase.firestoreApps().length).to.equal(numApps + 0);
    await firebase.initializeAdminApp({ databaseName: 'foo' });
    expect(firebase.firestoreApps().length).to.equal(numApps + 0);
    await firebase.initializeTestApp({ databaseName: 'foo', auth: {} });
    expect(firebase.firestoreApps().length).to.equal(numApps + 0);
    await firebase.initializeFirestoreTestApp({ projectId: 'foo', auth: {} });
    expect(firebase.firestoreApps().length).to.equal(numApps + 1);
  });
});
