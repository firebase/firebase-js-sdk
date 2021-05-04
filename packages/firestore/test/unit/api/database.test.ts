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

import { expect } from 'chai';

import { EmulatorCredentialsProvider } from '../../../src/api/credentials';
import {
  collectionReference,
  documentReference,
  documentSnapshot,
  newTestFirestore,
  query,
  querySnapshot
} from '../../util/api_helpers';
import { expectEqual, expectNotEqual, keys } from '../../util/helpers';

describe('CollectionReference', () => {
  it('support equality checking with isEqual()', () => {
    expectEqual(collectionReference('foo'), collectionReference('foo'));
    expectNotEqual(collectionReference('foo'), collectionReference('bar'));
  });

  it('JSON.stringify() does not throw', () => {
    JSON.stringify(collectionReference('foo'));
  });
});

describe('DocumentReference', () => {
  it('support equality checking with isEqual()', () => {
    expectEqual(documentReference('rooms/foo'), documentReference('rooms/foo'));
    expectNotEqual(
      documentReference('rooms/foo'),
      documentReference('rooms/bar')
    );
  });

  it('JSON.stringify() does not throw', () => {
    JSON.stringify(documentReference('foo/bar'));
  });
});

describe('DocumentSnapshot', () => {
  it('support equality checking with isEqual()', () => {
    expectEqual(
      documentSnapshot('rooms/foo', { a: 1 }, true),
      documentSnapshot('rooms/foo', { a: 1 }, true)
    );
    expectEqual(
      documentSnapshot('rooms/foo', null, true),
      documentSnapshot('rooms/foo', null, true)
    );
    // will do both !left.isEqual(right) and !right.isEqual(left).
    expectNotEqual(
      documentSnapshot('rooms/foo', { a: 1 }, true),
      documentSnapshot('rooms/foo', null, true)
    );
    expectNotEqual(
      documentSnapshot('rooms/foo', { a: 1 }, true),
      documentSnapshot('rooms/bar', { a: 1 }, true)
    );
    expectNotEqual(
      documentSnapshot('rooms/foo', { a: 1 }, true),
      documentSnapshot('rooms/bar', { b: 1 }, true)
    );
    expectNotEqual(
      documentSnapshot('rooms/foo', { a: 1 }, true),
      documentSnapshot('rooms/bar', { a: 1 }, false)
    );
  });

  it('JSON.stringify() does not throw', () => {
    JSON.stringify(documentSnapshot('foo/bar', { a: 1 }, true));
  });
});

describe('Query', () => {
  it('support equality checking with isEqual()', () => {
    expectEqual(query('foo'), query('foo'));
    expectNotEqual(query('foo'), query('bar'));
  });

  it('JSON.stringify() does not throw', () => {
    JSON.stringify(query('foo'));
  });
});

describe('QuerySnapshot', () => {
  it('support equality checking with isEqual()', () => {
    expectEqual(
      querySnapshot('foo', {}, { a: { a: 1 } }, keys(), false, false),
      querySnapshot('foo', {}, { a: { a: 1 } }, keys(), false, false)
    );
    expectNotEqual(
      querySnapshot('foo', {}, { a: { a: 1 } }, keys(), false, false),
      querySnapshot('bar', {}, { a: { a: 1 } }, keys(), false, false)
    );
    expectNotEqual(
      querySnapshot('foo', {}, { a: { a: 1 } }, keys(), false, false),
      querySnapshot(
        'foo',
        { b: { b: 1 } },
        { a: { a: 1 } },
        keys(),
        false,
        false
      )
    );
    expectNotEqual(
      querySnapshot('foo', {}, { a: { a: 1 } }, keys(), false, false),
      querySnapshot('foo', {}, { a: { b: 1 } }, keys(), false, false)
    );
    expectNotEqual(
      querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), false, false),
      querySnapshot('foo', {}, { a: { a: 1 } }, keys(), false, false)
    );
    expectNotEqual(
      querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), false, false),
      querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/b'), false, false)
    );
    expectNotEqual(
      querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), false, false),
      querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), true, false)
    );
    expectNotEqual(
      querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), false, false),
      querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), false, true)
    );
  });

  it('JSON.stringify() does not throw', () => {
    JSON.stringify(
      querySnapshot('foo', {}, { a: { a: 1 } }, keys(), false, false)
    );
  });
});

describe('SnapshotMetadata', () => {
  it('from DocumentSnapshot support equality checking with isEqual()', () => {
    expectEqual(
      documentSnapshot('rooms/foo', {}, true).metadata,
      documentSnapshot('rooms/foo', {}, true).metadata
    );
    expectNotEqual(
      documentSnapshot('rooms/foo', {}, true).metadata,
      documentSnapshot('rooms/foo', {}, false).metadata
    );
  });

  it('from QuerySnapshot support equality checking with isEqual()', () => {
    expectEqual(
      querySnapshot('foo', {}, {}, keys('foo/a'), true, false).metadata,
      querySnapshot('foo', {}, {}, keys('foo/a'), true, false).metadata
    );
    expectNotEqual(
      querySnapshot('foo', {}, {}, keys('foo/a'), true, false).metadata,
      querySnapshot('foo', {}, {}, keys(), true, false).metadata
    );
    expectNotEqual(
      querySnapshot('foo', {}, {}, keys('foo/a'), true, false).metadata,
      querySnapshot('foo', {}, {}, keys('foo/a'), false, false).metadata
    );
    expectNotEqual(
      querySnapshot('foo', {}, {}, keys('foo/a'), true, false).metadata,
      querySnapshot('foo', {}, {}, keys(), false, false).metadata
    );
  });
});

describe('Settings', () => {
  it('replaces settings by default', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db.settings({ host: 'other.host' });
    db.settings({ ignoreUndefinedProperties: true });

    expect(db._delegate._getSettings().ignoreUndefinedProperties).to.be.true;
    // Expect host to be replaced with default host.
    expect(db._delegate._getSettings().host).to.equal(
      'firestore.googleapis.com'
    );
  });

  it('can not use mutually exclusive settings together', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(() =>
      db.settings({
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: true
      })
    ).to.throw(
      `experimentalForceLongPolling and experimentalAutoDetectLongPolling cannot be used together.`
    );
  });

  it('can merge settings', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db.settings({ host: 'other.host' });
    db.settings({
      ignoreUndefinedProperties: true,
      merge: true
    });

    expect(db._delegate._getSettings().ignoreUndefinedProperties).to.be.true;
    expect(db._delegate._getSettings().host).to.equal('other.host');
  });

  it('can use `merge` without previous call to settings()', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db.settings({ host: 'other.host' });
    db.settings({
      ignoreUndefinedProperties: true,
      merge: true
    });

    expect(db._delegate._getSettings().ignoreUndefinedProperties).to.be.true;
    expect(db._delegate._getSettings().host).to.equal('other.host');
  });

  it('gets settings from useEmulator', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db.useEmulator('localhost', 9000);

    expect(db._delegate._getSettings().host).to.equal('localhost:9000');
    expect(db._delegate._getSettings().ssl).to.be.false;
  });

  it('prefers host from useEmulator to host from settings', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db.settings({ host: 'other.host' });
    db.useEmulator('localhost', 9000);

    expect(db._delegate._getSettings().host).to.equal('localhost:9000');
    expect(db._delegate._getSettings().ssl).to.be.false;
  });

  it('sets credentials based on mockUserToken', async () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    const mockUserToken = { sub: 'foobar' };
    db.useEmulator('localhost', 9000, { mockUserToken });

    const credentials = db._delegate._credentials;
    expect(credentials).to.be.instanceOf(EmulatorCredentialsProvider);
    const token = await credentials.getToken();
    expect(token!.type).to.eql('OAuth');
    expect(token!.user.uid).to.eql(mockUserToken.sub);
  });
});
