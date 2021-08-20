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

import firebase from '@firebase/app-compat';
import { expect } from 'chai';

import { DATABASE_ADDRESS, createTestApp } from './helpers/util';
import '../src/index';

describe('Database Tests', () => {
  let defaultApp;

  beforeEach(() => {
    defaultApp = createTestApp();
  });

  afterEach(() => {
    return defaultApp.delete();
  });

  it('Can get database.', () => {
    const db = (firebase as any).database();
    expect(db).to.not.be.undefined;
    expect(db).not.to.be.null;
  });

  it('Can get database with custom URL', () => {
    const db = defaultApp.database('http://foo.bar.com');
    expect(db).to.be.ok;
    // The URL is assumed to be secure if no port is specified.
    expect(db.ref().toString()).to.equal('https://foo.bar.com/');
  });

  it('Can get database with custom URL and port', () => {
    const db = defaultApp.database('http://foo.bar.com:80');
    expect(db).to.be.ok;
    expect(db.ref().toString()).to.equal('http://foo.bar.com:80/');
  });

  it('Can get database with https URL', () => {
    const db = defaultApp.database('https://foo.bar.com');
    expect(db).to.be.ok;
    expect(db.ref().toString()).to.equal('https://foo.bar.com/');
  });

  it('Can get database with multi-region URL', () => {
    const db = defaultApp.database('http://foo.euw1.firebasedatabase.app');
    expect(db).to.be.ok;
    expect(db._delegate._repo.repoInfo_.namespace).to.equal('foo');
    expect(db.ref().toString()).to.equal(
      'https://foo.euw1.firebasedatabase.app/'
    );
  });

  it('Can get database with upper case URL', () => {
    const db = defaultApp.database('http://fOO.EUW1.firebaseDATABASE.app');
    expect(db).to.be.ok;
    expect(db._delegate._repo.repoInfo_.namespace).to.equal('foo');
    expect(db.ref().toString()).to.equal(
      'https://foo.euw1.firebasedatabase.app/'
    );
  });

  it('Can get database with localhost URL', () => {
    const db = defaultApp.database('http://localhost');
    expect(db).to.be.ok;
    expect(db.ref().toString()).to.equal('https://localhost/');
  });

  it('Can get database with localhost URL and port', () => {
    const db = defaultApp.database('http://localhost:80');
    expect(db).to.be.ok;
    expect(db.ref().toString()).to.equal('http://localhost:80/');
  });

  it('Can get database with a upper case localhost URL', () => {
    const db = defaultApp.database('http://LOCALHOST');
    expect(db).to.be.ok;
    expect(db.ref().toString()).to.equal('https://localhost/');
  });

  it('Can get database with a upper case localhost URL and ns', () => {
    const db = defaultApp.database('http://LOCALHOST?ns=foo');
    expect(db).to.be.ok;
    expect(db._delegate._repo.repoInfo_.namespace).to.equal('foo');
    expect(db.ref().toString()).to.equal('https://localhost/');
  });

  it('Can infer database URL from project Id', async () => {
    const app = firebase.initializeApp(
      { projectId: 'abc123' },
      'project-id-app'
    );
    const db = app.database();
    expect(db).to.be.ok;
    // The URL is assumed to be secure if no port is specified.
    expect(db.ref().toString()).to.equal(
      'https://abc123-default-rtdb.firebaseio.com/'
    );
    await app.delete();
  });

  it('Can read ns query param', () => {
    const db = defaultApp.database('http://localhost:80/?ns=foo&unused=true');
    expect(db).to.be.ok;
    expect(db._delegate._repo.repoInfo_.namespace).to.equal('foo');
    expect(db.ref().toString()).to.equal('http://localhost:80/');
  });

  it('Reads ns query param even when subdomain is set', () => {
    const db = defaultApp.database('http://bar.firebaseio.com?ns=foo');
    expect(db).to.be.ok;
    expect(db._delegate._repo.repoInfo_.namespace).to.equal('foo');
    expect(db.ref().toString()).to.equal('https://bar.firebaseio.com/');
  });

  it('Interprets FIREBASE_DATABASE_EMULATOR_HOST var correctly', () => {
    process.env['FIREBASE_DATABASE_EMULATOR_HOST'] = 'localhost:9000';
    const db = defaultApp.database('https://bar.firebaseio.com');
    expect(db).to.be.ok;
    expect(db._delegate._repo.repoInfo_.namespace).to.equal('bar');
    expect(db._delegate._repo.repoInfo_.host).to.equal('localhost:9000');
    delete process.env['FIREBASE_DATABASE_EMULATOR_HOST'];
  });

  it('Different instances for different URLs', () => {
    const db1 = defaultApp.database('http://foo1.bar.com');
    const db2 = defaultApp.database('http://foo2.bar.com');
    expect(db1.ref().toString()).to.equal('https://foo1.bar.com/');
    expect(db2.ref().toString()).to.equal('https://foo2.bar.com/');
  });

  it('Different instances for different URLs (with FIREBASE_DATABASE_EMULATOR_HOST)', () => {
    process.env['FIREBASE_DATABASE_EMULATOR_HOST'] = 'localhost:9000';
    const db1 = defaultApp.database('http://foo1.bar.com');
    const db2 = defaultApp.database('http://foo2.bar.com');
    expect(db1._delegate._repo.repoInfo_.toURLString()).to.equal(
      'http://localhost:9000/?ns=foo1'
    );
    expect(db2._delegate._repo.repoInfo_.toURLString()).to.equal(
      'http://localhost:9000/?ns=foo2'
    );
    delete process.env['FIREBASE_DATABASE_EMULATOR_HOST'];
  });

  it('Cannot use same URL twice', () => {
    defaultApp.database('http://foo.bar.com');
    expect(() => {
      defaultApp.database('http://foo.bar.com/');
    }).to.throw(/Database initialized multiple times/i);
  });

  it('Cannot use same URL twice (with FIREBASE_DATABASE_EMULATOR_HOST)', () => {
    process.env['FIREBASE_DATABASE_EMULATOR_HOST'] = 'localhost:9000';
    defaultApp.database('http://foo.bar.com');
    expect(() => {
      defaultApp.database('http://foo.bar.com/');
    }).to.throw(/Database initialized multiple times/i);
    delete process.env['FIREBASE_DATABASE_EMULATOR_HOST'];
  });

  it('Databases with legacy domain', () => {
    expect(() => {
      defaultApp.database('http://foo.firebase.com/');
    }).to.throw(/is no longer supported/i);
  });

  it('Databases with invalid custom URLs', () => {
    expect(() => {
      defaultApp.database('not-a-url');
    }).to.throw(/Cannot parse Firebase url/i);
    expect(() => {
      defaultApp.database('http://foo.com');
    }).to.throw(/Cannot parse Firebase url/i);
    expect(() => {
      defaultApp.database('http://fblocal.com');
    }).to.throw(/Cannot parse Firebase url/i);
    expect(() => {
      defaultApp.database('http://x.fblocal.com:9000/paths/are/bad');
    }).to.throw(/Database URL must point to the root of a Firebase Database/i);
  });

  it('Can get app', () => {
    const db = (firebase as any).database();
    expect(db.app).to.not.be.undefined;
    expect((db.app as any) instanceof firebase.app.App);
  });

  it('Can get root ref', () => {
    const db = (firebase as any).database();

    const ref = db.ref();

    expect(ref instanceof (firebase as any).database.Reference).to.be.true;
    expect(ref.key).to.be.null;
  });

  it('Can get child ref', () => {
    const db = (firebase as any).database();

    const ref = db.ref('child');

    expect(ref instanceof (firebase as any).database.Reference).to.be.true;
    expect(ref.key).to.equal('child');
  });

  it('Can get deep child ref', () => {
    const db = (firebase as any).database();

    const ref = db.ref('child/grand-child');

    expect(ref instanceof (firebase as any).database.Reference).to.be.true;
    expect(ref.key).to.equal('grand-child');
  });

  it('Can get ref from ref', () => {
    const db1 = (firebase as any).database();
    const db2 = (firebase as any).database();

    const ref1 = db1.ref('child');
    const ref2 = db2.ref(ref1);

    expect(ref1.key).to.equal('child');
    expect(ref2.key).to.equal('child');
  });

  it('ref() validates arguments', () => {
    const db = (firebase as any).database();
    expect(() => {
      const ref = (db as any).ref('path', 'extra');
    }).to.throw(/Expects no more than 1/);
  });

  it('ref() validates project', () => {
    const db1 = defaultApp.database('http://bar.firebaseio.com');
    const db2 = defaultApp.database('http://foo.firebaseio.com');

    const ref1 = db1.ref('child');

    expect(() => {
      db2.ref(ref1);
    }).to.throw(/does not match.*database/i);
  });

  it('Can get refFromURL()', () => {
    const db = (firebase as any).database();
    const ref = db.refFromURL(DATABASE_ADDRESS + '/path/to/data');
    expect(ref.key).to.equal('data');
  });

  it('refFromURL() validates domain', () => {
    const db = (firebase as any)
      .app()
      .database('https://thisisreal.firebaseio.com');
    expect(() =>
      db.refFromURL('https://thisisnotreal.firebaseio.com/path/to/data')
    ).to.throw(/does not match.*database/i);
  });

  it('refFromURL() validates argument', () => {
    const db = (firebase as any).database();
    expect(() => {
      const ref = (db as any).refFromURL();
    }).to.throw(/Expects at least 1/);
  });

  it('can call useEmulator before use', () => {
    const db = (firebase as any).database();
    db.useEmulator('localhost', 1234);
    expect(db.ref().toString()).to.equal('http://localhost:1234/');
  });

  it('cannot call useEmulator after use', () => {
    const db = (firebase as any).database();

    db.ref().set({
      hello: 'world'
    });

    expect(() => {
      db.useEmulator('localhost', 1234);
    }).to.throw(/Cannot call useEmulator/);
  });

  it('refFromURL returns an emulated ref with useEmulator', () => {
    const db = (firebase as any).database();
    db.useEmulator('localhost', 1234);

    const ref = db.refFromURL(DATABASE_ADDRESS + '/path/to/data');
    expect(ref.toString()).to.equal(`http://localhost:1234/path/to/data`);
  });
});
