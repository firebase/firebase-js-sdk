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

  it('initializeTestApp() throws if no databaseName', function() {
    expect(firebase.initializeTestApp.bind(null, {})).to.throw(
      /databaseName not specified/
    );
    expect(
      firebase.initializeTestApp.bind(null, { databaseName: 'foo' })
    ).to.not.throw();
  });

  it('initializeTestApp() uses specified auth.', function() {
    let app = firebase.initializeTestApp({ databaseName: 'foo' });
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

  it('loadDatabaseRules() throws if no databaseName or rulesPath', async function() {
    expect(firebase.loadDatabaseRules.bind(null, {})).to.throw(
      /databaseName not specified/
    );
    expect(
      firebase.loadDatabaseRules.bind(null, { databaseName: 'foo' })
    ).to.throw(/rulesPath not specified/);
    expect(
      firebase.loadDatabaseRules.bind(null, {
        rulesPath: '/path/does/not/exist/file.json'
      })
    ).to.throw(/databaseName not specified/);
    expect(
      firebase.loadDatabaseRules.bind(null, {
        databaseName: 'foo',
        rulesPath: '/path/does/not/exist/file.json'
      })
    ).to.throw(/Could not find file/);
  });

  it('loadDatabaseRules() throws on file not found', function() {
    const options = {
      databaseName: 'foo',
      rulesPath: '/path/does/not/exist/file.json'
    };
    expect(firebase.loadDatabaseRules.bind(null, options)).to.throw(
      /Could not find file/
    );
  });

  it('apps() returns all created apps', async function() {
    const numApps = firebase.apps().length;
    await firebase.initializeAdminApp({ databaseName: 'foo' });
    expect(firebase.apps().length).to.equal(numApps + 1);
    await firebase.initializeAdminApp({ databaseName: 'foo' });
    expect(firebase.apps().length).to.equal(numApps + 2);
    await firebase.initializeTestApp({ databaseName: 'foo' });
    expect(firebase.apps().length).to.equal(numApps + 3);
  });
});
