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

import {
  connectFirestoreEmulator,
  refEqual,
  snapshotEqual,
  queryEqual
} from '../../../src';
import { EmulatorAuthCredentialsProvider } from '../../../src/api/credentials';
import { User } from '../../../src/auth/user';
import {
  collectionReference,
  documentReference,
  documentSnapshot,
  newTestFirestore,
  query,
  querySnapshot
} from '../../util/api_helpers';
import { keys } from '../../util/helpers';

describe('CollectionReference', () => {
  it('support equality checking with isEqual()', () => {
    expect(refEqual(collectionReference('foo'), collectionReference('foo'))).to
      .be.true;
    expect(refEqual(collectionReference('foo'), collectionReference('bar'))).to
      .be.false;
  });

  it('JSON.stringify() does not throw', () => {
    JSON.stringify(collectionReference('foo'));
  });
});

describe('DocumentReference', () => {
  it('support equality checking with isEqual()', () => {
    expect(
      refEqual(documentReference('rooms/foo'), documentReference('rooms/foo'))
    ).to.be.true;
    expect(
      refEqual(documentReference('rooms/foo'), documentReference('rooms/bar'))
    ).to.be.false;
  });

  it('JSON.stringify() does not throw', () => {
    JSON.stringify(documentReference('foo/bar'));
  });
});

describe('DocumentSnapshot', () => {
  it('support equality checking with isEqual()', () => {
    expect(
      snapshotEqual(
        documentSnapshot('rooms/foo', { a: 1 }, true),
        documentSnapshot('rooms/foo', { a: 1 }, true)
      )
    ).to.be.true;
    expect(
      snapshotEqual(
        documentSnapshot('rooms/foo', null, true),
        documentSnapshot('rooms/foo', null, true)
      )
    ).to.be.true;
    // will do both !left.isEqual(right) and !right.isEqual(left).
    expect(
      snapshotEqual(
        documentSnapshot('rooms/foo', { a: 1 }, true),
        documentSnapshot('rooms/foo', null, true)
      )
    ).to.be.false;
    expect(
      snapshotEqual(
        documentSnapshot('rooms/foo', { a: 1 }, true),
        documentSnapshot('rooms/bar', { a: 1 }, true)
      )
    ).to.be.false;
    expect(
      snapshotEqual(
        documentSnapshot('rooms/foo', { a: 1 }, true),
        documentSnapshot('rooms/bar', { b: 1 }, true)
      )
    ).to.be.false;
    expect(
      snapshotEqual(
        documentSnapshot('rooms/foo', { a: 1 }, true),
        documentSnapshot('rooms/bar', { a: 1 }, false)
      )
    ).to.be.false;
  });

  it('JSON.stringify() does not throw', () => {
    JSON.stringify(documentSnapshot('foo/bar', { a: 1 }, true));
  });
});

describe('Query', () => {
  it('support equality checking with isEqual()', () => {
    expect(queryEqual(query('foo'), query('foo'))).to.be.true;
    expect(queryEqual(query('foo'), query('bar'))).to.be.false;
  });

  it('JSON.stringify() does not throw', () => {
    JSON.stringify(query('foo'));
  });
});

describe('QuerySnapshot', () => {
  it('support equality checking with isEqual()', () => {
    expect(
      snapshotEqual(
        querySnapshot('foo', {}, { a: { a: 1 } }, keys(), false, false),
        querySnapshot('foo', {}, { a: { a: 1 } }, keys(), false, false)
      )
    ).to.be.true;
    expect(
      snapshotEqual(
        querySnapshot('foo', {}, { a: { a: 1 } }, keys(), false, false),
        querySnapshot('bar', {}, { a: { a: 1 } }, keys(), false, false)
      )
    ).to.be.false;
    expect(
      snapshotEqual(
        querySnapshot('foo', {}, { a: { a: 1 } }, keys(), false, false),
        querySnapshot(
          'foo',
          { b: { b: 1 } },
          { a: { a: 1 } },
          keys(),
          false,
          false
        )
      )
    ).to.be.false;
    expect(
      snapshotEqual(
        querySnapshot('foo', {}, { a: { a: 1 } }, keys(), false, false),
        querySnapshot('foo', {}, { a: { b: 1 } }, keys(), false, false)
      )
    ).to.be.false;
    expect(
      snapshotEqual(
        querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), false, false),
        querySnapshot('foo', {}, { a: { a: 1 } }, keys(), false, false)
      )
    ).to.be.false;
    expect(
      snapshotEqual(
        querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), false, false),
        querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/b'), false, false)
      )
    ).to.be.false;
    expect(
      snapshotEqual(
        querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), false, false),
        querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), true, false)
      )
    ).to.be.false;
    expect(
      snapshotEqual(
        querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), false, false),
        querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), false, true)
      )
    ).to.be.false;
  });

  it('JSON.stringify() does not throw', () => {
    JSON.stringify(
      querySnapshot('foo', {}, { a: { a: 1 } }, keys(), false, false)
    );
  });
});

describe('SnapshotMetadata', () => {
  it('from DocumentSnapshot support equality checking with isEqual()', () => {
    expect(documentSnapshot('rooms/foo', {}, true).metadata).to.deep.equal(
      documentSnapshot('rooms/foo', {}, true).metadata
    );
    expect(documentSnapshot('rooms/foo', {}, true).metadata).to.not.deep.equal(
      documentSnapshot('rooms/foo', {}, false).metadata
    );
  });

  it('from QuerySnapshot support equality checking with isEqual()', () => {
    expect(
      querySnapshot('foo', {}, {}, keys('foo/a'), true, false).metadata
    ).to.deep.equal(
      querySnapshot('foo', {}, {}, keys('foo/a'), true, false).metadata
    );
    expect(
      querySnapshot('foo', {}, {}, keys('foo/a'), true, false).metadata
    ).to.not.deep.equal(
      querySnapshot('foo', {}, {}, keys(), true, false).metadata
    );
    expect(
      querySnapshot('foo', {}, {}, keys('foo/a'), true, false).metadata
    ).to.not.deep.equal(
      querySnapshot('foo', {}, {}, keys('foo/a'), false, false).metadata
    );
    expect(
      querySnapshot('foo', {}, {}, keys('foo/a'), true, false).metadata
    ).to.not.deep.equal(
      querySnapshot('foo', {}, {}, keys(), false, false).metadata
    );
  });
});

describe('Settings', () => {
  it('can not use mutually exclusive settings together', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: true
      })
    ).to.throw(
      `experimentalForceLongPolling and experimentalAutoDetectLongPolling cannot be used together.`
    );
  });

  it('gets settings from useEmulator', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    connectFirestoreEmulator(db, 'localhost', 9000);

    expect(db._getSettings().host).to.equal('localhost:9000');
    expect(db._getSettings().ssl).to.be.false;
  });

  it('prefers host from useEmulator to host from settings', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({ host: 'other.host' });
    connectFirestoreEmulator(db, 'localhost', 9000);

    expect(db._getSettings().host).to.equal('localhost:9000');
    expect(db._getSettings().ssl).to.be.false;
  });

  it('sets credentials based on mockUserToken object', async () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    const mockUserToken = { sub: 'foobar' };
    connectFirestoreEmulator(db, 'localhost', 9000, { mockUserToken });

    const credentials = db._authCredentials;
    expect(credentials).to.be.instanceOf(EmulatorAuthCredentialsProvider);
    const token = await credentials.getToken();
    expect(token!.type).to.eql('OAuth');
    expect(token!.user!.uid).to.eql(mockUserToken.sub);
  });

  it('sets credentials based on mockUserToken string', async () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    connectFirestoreEmulator(db, 'localhost', 9000, {
      mockUserToken: 'my-custom-mock-user-token'
    });

    const credentials = db._authCredentials;
    expect(credentials).to.be.instanceOf(EmulatorAuthCredentialsProvider);
    const token = await credentials.getToken();
    expect(token!.type).to.eql('OAuth');
    expect(token!.user).to.eql(User.MOCK_USER);
  });
});
