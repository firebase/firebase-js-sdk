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
import firebase from '../../src/app';
import { TEST_PROJECT, patchFakeAuthFunctions } from './helpers/util';
import '../../src/database';

describe('Database Tests', function() {
  let defaultApp;

  beforeEach(function() {
    defaultApp = firebase.initializeApp({
      databaseURL: TEST_PROJECT.databaseURL
    });
    patchFakeAuthFunctions(defaultApp);
  });

  afterEach(function() {
    return defaultApp.delete();
  });

  it('Can get database.', function() {
    const db = firebase.database();
    expect(db).to.not.be.undefined;
    expect(db).not.to.be.null;
  });

  it('Illegal to call constructor', function() {
    expect(function() {
      const db = new firebase.database.Database('url');
    }).to.throw(/don't call new Database/i);
  });

  it('Can get app', function() {
    const db = firebase.database();
    expect(db.app).to.not.be.undefined;
    expect((db.app as any) instanceof firebase.app.App);
  });

  it('Can get root ref', function() {
    const db = firebase.database();

    const ref = db.ref();

    expect(ref instanceof firebase.database.Reference).to.be.true;
    expect(ref.key).to.be.null;
  });

  it('Can get child ref', function() {
    const db = firebase.database();

    const ref = db.ref('child');

    expect(ref instanceof firebase.database.Reference).to.be.true;
    expect(ref.key).to.equal('child');
  });

  it('Can get deep child ref', function() {
    const db = firebase.database();

    const ref = db.ref('child/grand-child');

    expect(ref instanceof firebase.database.Reference).to.be.true;
    expect(ref.key).to.equal('grand-child');
  });

  it('ref() validates arguments', function() {
    const db = firebase.database();
    expect(function() {
      const ref = (db as any).ref('path', 'extra');
    }).to.throw(/Expects no more than 1/);
  });

  it('Can get refFromURL()', function() {
    const db = firebase.database();
    const ref = db.refFromURL(TEST_PROJECT.databaseURL + '/path/to/data');
    expect(ref.key).to.equal('data');
  });

  it('refFromURL() validates domain', function() {
    const db = firebase.database();
    expect(function() {
      const ref = db.refFromURL(
        'https://thisisnotarealfirebase.firebaseio.com/path/to/data'
      );
    }).to.throw(/does not match.*database/i);
  });

  it('refFromURL() validates argument', function() {
    const db = firebase.database();
    expect(function() {
      const ref = (db as any).refFromURL();
    }).to.throw(/Expects at least 1/);
  });
});
