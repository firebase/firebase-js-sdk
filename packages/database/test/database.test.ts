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
import { DATABASE_ADDRESS, createTestApp } from './helpers/util';
import '../index';

describe('Database Tests', function() {
  let defaultApp;

  beforeEach(function() {
    defaultApp = createTestApp();
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

  it('Can get database with localhost URL and port', function() {
    var db = defaultApp.database('http://localhost:80');
    expect(db).to.be.ok;
    expect(db.ref().toString()).to.equal('http://localhost:80/');
  });

  it('Can get database with localhost URL', function() {
    var db = defaultApp.database('http://localhost');
    expect(db).to.be.ok;
    expect(db.ref().toString()).to.equal('https://localhost/');
  });

  it('Can read ns query param', function() {
    var db = defaultApp.database('http://localhost:80/?ns=foo&unused=true');
    expect(db).to.be.ok;
    expect(db.repo_.repoInfo_.namespace).to.equal('foo');
    expect(db.ref().toString()).to.equal('http://localhost:80/');
  });

  it('Only reads ns query param when subdomain not set', function() {
    var db = defaultApp.database('http://bar.firebaseio.com?ns=foo');
    expect(db).to.be.ok;
    expect(db.repo_.repoInfo_.namespace).to.equal('bar');
    expect(db.ref().toString()).to.equal('https://bar.firebaseio.com/');
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

  it('Can get ref from ref', function() {
    const db1 = (firebase as any).database();
    const db2 = (firebase as any).database();

    const ref1 = db1.ref('child');
    const ref2 = db2.ref(ref1);

    expect(ref1.key).to.equal('child');
    expect(ref2.key).to.equal('child');
  });

  it('ref() validates arguments', function() {
    const db = (firebase as any).database();
    expect(function() {
      const ref = (db as any).ref('path', 'extra');
    }).to.throw(/Expects no more than 1/);
  });

  it('ref() validates project', function() {
    const db1 = defaultApp.database('http://bar.foo.com');
    const db2 = defaultApp.database('http://foo.bar.com');

    const ref1 = db1.ref('child');

    expect(function() {
      db2.ref(ref1);
    }).to.throw(/does not match.*database/i);
  });

  it('Can get refFromURL()', function() {
    const db = (firebase as any).database();
    const ref = db.refFromURL(DATABASE_ADDRESS + '/path/to/data');
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
