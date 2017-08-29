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
import firebase from '@firebase/app';
import { TEST_PROJECT, patchFakeAuthFunctions } from './helpers/util';
import '../index';

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
    const db = (firebase as any).database();
    expect(db).to.not.be.undefined;
    expect(db).not.to.be.null;
  });

  it('Illegal to call constructor', function() {
    expect(function() {
      const db = new (firebase as any).database.Database('url');
    }).to.throw(/don't call new Database/i);
  });

  it('Can get database with custom URL', function() {
    var db = defaultApp.database('http://foo.bar.com');
    expect(db).to.be.ok;
    // The URL is assumed to be secure if no port is specified.
    expect(db.ref().toString()).to.equal('https://foo.bar.com/');
  });

  it('Can get database with custom URL and port', function() {
    var db = defaultApp.database('http://foo.bar.com:80');
    expect(db).to.be.ok;
    expect(db.ref().toString()).to.equal('http://foo.bar.com:80/');
  });

  it('Can get database with https URL', function() {
    var db = defaultApp.database('https://foo.bar.com');
    expect(db).to.be.ok;
    expect(db.ref().toString()).to.equal('https://foo.bar.com/');
  });

  it('Different instances for different URLs', function() {
    var db1 = defaultApp.database('http://foo1.bar.com');
    var db2 = defaultApp.database('http://foo2.bar.com');
    expect(db1.ref().toString()).to.equal('https://foo1.bar.com/');
    expect(db2.ref().toString()).to.equal('https://foo2.bar.com/');
  });

  it('Cannot use same URL twice', function() {
    defaultApp.database('http://foo.bar.com');
    expect(function() {
      defaultApp.database('http://foo.bar.com/');
    }).to.throw(/Database initialized multiple times/i);
  });

  it('Databases with invalid custom URLs', function() {
    expect(function() {
      defaultApp.database('not-a-url');
    }).to.throw(/Cannot parse Firebase url/i);
    expect(function() {
      defaultApp.database('http://fblocal.com');
    }).to.throw(/Cannot parse Firebase url/i);
    expect(function() {
      defaultApp.database('http://x.fblocal.com:9000/paths/are/bad');
    }).to.throw(/Database URL must point to the root of a Firebase Database/i);
  });

  it('Can get app', function() {
    const db = (firebase as any).database();
    expect(db.app).to.not.be.undefined;
    expect((db.app as any) instanceof firebase.app.App);
  });

  it('Can get root ref', function() {
    const db = (firebase as any).database();

    const ref = db.ref();

    expect(ref instanceof (firebase as any).database.Reference).to.be.true;
    expect(ref.key).to.be.null;
  });

  it('Can get child ref', function() {
    const db = (firebase as any).database();

    const ref = db.ref('child');

    expect(ref instanceof (firebase as any).database.Reference).to.be.true;
    expect(ref.key).to.equal('child');
  });

  it('Can get deep child ref', function() {
    const db = (firebase as any).database();

    const ref = db.ref('child/grand-child');

    expect(ref instanceof (firebase as any).database.Reference).to.be.true;
    expect(ref.key).to.equal('grand-child');
  });

  it('ref() validates arguments', function() {
    const db = (firebase as any).database();
    expect(function() {
      const ref = (db as any).ref('path', 'extra');
    }).to.throw(/Expects no more than 1/);
  });

  it('Can get refFromURL()', function() {
    const db = (firebase as any).database();
    const ref = db.refFromURL(TEST_PROJECT.databaseURL + '/path/to/data');
    expect(ref.key).to.equal('data');
  });

  it('refFromURL() validates domain', function() {
    const db = (firebase as any).database();
    expect(function() {
      const ref = db.refFromURL(
        'https://thisisnotarealfirebase.firebaseio.com/path/to/data'
      );
    }).to.throw(/does not match.*database/i);
  });

  it('refFromURL() validates argument', function() {
    const db = (firebase as any).database();
    expect(function() {
      const ref = (db as any).refFromURL();
    }).to.throw(/Expects at least 1/);
  });
});
