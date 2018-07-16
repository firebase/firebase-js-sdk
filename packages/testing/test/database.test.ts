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

  it('initializeTestApp() with DatabaseAppOptions uses specified auth.', async function() {
    let app = firebase.initializeTestApp({
      projectId: 'foo',
      auth: {}
    });
    let token = await (app as any).INTERNAL.getToken();
    expect(token).to.have.any.keys('accessToken');
    let claims = base64.decodeString(
      token.accessToken.split('.')[1],
      /*webSafe=*/ false
    );
    expect(claims).to.equal('{}');

    app = firebase.initializeTestApp({
      projectId: 'foo',
      auth: { uid: 'alice' }
    });
    token = await (app as any).INTERNAL.getToken();
    expect(token).to.have.any.keys('accessToken');
    claims = base64.decodeString(
      token.accessToken.split('.')[1],
      /*webSafe=*/ false
    );
    expect(claims).to.equal('{"uid":"alice"}');
  });

  it('initializeTestApp() with FirestoreAppOptions uses specified auth.', async function() {
    let app = firebase.initializeTestApp({
      projectId: 'foo',
      auth: {}
    });
    let token = await (app as any).INTERNAL.getToken();
    expect(token).to.have.any.keys('accessToken');
    let claims = base64.decodeString(
      token.accessToken.split('.')[1],
      /*webSafe=*/ false
    );
    expect(claims).to.equal('{}');

    app = firebase.initializeTestApp({
      projectId: 'foo',
      auth: { uid: 'alice' }
    });
    token = await (app as any).INTERNAL.getToken();
    expect(token).to.have.any.keys('accessToken');
    claims = base64.decodeString(
      token.accessToken.split('.')[1],
      /*webSafe=*/ false
    );
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

  it('apps() returns apps created with initializeTestApp', async function() {
    const numApps = firebase.apps().length;
    await firebase.initializeTestApp({ databaseName: 'foo', auth: {} });
    expect(firebase.apps().length).to.equal(numApps + 1);
    await firebase.initializeTestApp({ databaseName: 'bar', auth: {} });
    expect(firebase.apps().length).to.equal(numApps + 2);
  });
});
