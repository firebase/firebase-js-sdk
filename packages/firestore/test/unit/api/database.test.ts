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
    // hasCachedResults should affect querySnapshot equality
    expect(
      snapshotEqual(
        querySnapshot(
          'foo',
          {},
          { a: { a: 1 } },
          keys('foo/a'),
          false,
          false,
          true
        ),
        querySnapshot(
          'foo',
          {},
          { a: { a: 1 } },
          keys('foo/a'),
          false,
          false,
          true
        )
      )
    ).to.be.true;
    expect(
      snapshotEqual(
        querySnapshot(
          'foo',
          {},
          { a: { a: 1 } },
          keys('foo/a'),
          false,
          false,
          true
        ),
        querySnapshot(
          'foo',
          {},
          { a: { a: 1 } },
          keys('foo/a'),
          false,
          false,
          false
        )
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
  it('cannot use mutually exclusive settings together', () => {
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

  it('long polling should be in auto-detect mode by default', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(db._getSettings().experimentalAutoDetectLongPolling).to.be.true;
    expect(db._getSettings().experimentalForceLongPolling).to.be.false;
  });

  it('long polling should be in force mode if force=true', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      experimentalForceLongPolling: true
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).to.be.false;
    expect(db._getSettings().experimentalForceLongPolling).to.be.true;
  });

  it('long polling should be in auto-detect mode if autoDetect=true', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      experimentalAutoDetectLongPolling: true
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).to.be.true;
    expect(db._getSettings().experimentalForceLongPolling).to.be.false;
  });

  it('long polling should be in auto-detect mode if force=false', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      experimentalForceLongPolling: false
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).to.be.true;
    expect(db._getSettings().experimentalForceLongPolling).to.be.false;
  });

  it('long polling should be disabled if autoDetect=false', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      experimentalAutoDetectLongPolling: false
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).to.be.false;
    expect(db._getSettings().experimentalForceLongPolling).to.be.false;
  });

  it('long polling should be in auto-detect mode if autoDetect=true and force=false', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      experimentalAutoDetectLongPolling: true,
      experimentalForceLongPolling: false
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).to.be.true;
    expect(db._getSettings().experimentalForceLongPolling).to.be.false;
  });

  it('long polling should be in force mode if autoDetect=false and force=true', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      experimentalAutoDetectLongPolling: false,
      experimentalForceLongPolling: true
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).to.be.false;
    expect(db._getSettings().experimentalForceLongPolling).to.be.true;
  });

  it('long polling should be disabled if autoDetect=false and force=false', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      experimentalAutoDetectLongPolling: false,
      experimentalForceLongPolling: false
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).to.be.false;
    expect(db._getSettings().experimentalForceLongPolling).to.be.false;
  });

  it('timeoutSeconds is undefined by default', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(db._getSettings().experimentalLongPollingOptions.timeoutSeconds).to
      .be.undefined;
  });

  it('timeoutSeconds minimum value is allowed', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({ experimentalLongPollingOptions: { timeoutSeconds: 5 } });
    expect(
      db._getSettings().experimentalLongPollingOptions.timeoutSeconds
    ).to.equal(5);
  });

  it('timeoutSeconds maximum value is allowed', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({ experimentalLongPollingOptions: { timeoutSeconds: 30 } });
    expect(
      db._getSettings().experimentalLongPollingOptions.timeoutSeconds
    ).to.equal(30);
  });

  it('timeoutSeconds typical value is allowed', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({ experimentalLongPollingOptions: { timeoutSeconds: 25 } });
    expect(
      db._getSettings().experimentalLongPollingOptions.timeoutSeconds
    ).to.equal(25);
  });

  it('timeoutSeconds floating point value is allowed', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      experimentalLongPollingOptions: { timeoutSeconds: 12.3456 }
    });
    expect(
      db._getSettings().experimentalLongPollingOptions.timeoutSeconds
    ).to.equal(12.3456);
  });

  it('timeoutSeconds value one less than minimum throws', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({ experimentalLongPollingOptions: { timeoutSeconds: 4 } })
    ).to.throw(/invalid.*timeout.*4.*\(.*5.*\)/i);
  });

  it('timeoutSeconds value one more than maximum throws', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({
        experimentalLongPollingOptions: { timeoutSeconds: 31 }
      })
    ).to.throw(/invalid.*timeout.*31.*\(.*30.*\)/i);
  });

  it('timeoutSeconds value of 0 throws', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({ experimentalLongPollingOptions: { timeoutSeconds: 0 } })
    ).to.throw(/invalid.*timeout.*0.*\(.*5.*\)/i);
  });

  it('timeoutSeconds value of -0 throws', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({
        experimentalLongPollingOptions: { timeoutSeconds: -0 }
      })
    ).to.throw(/invalid.*timeout.*0.*\(.*5.*\)/i);
  });

  it('timeoutSeconds value of -1 throws', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({
        experimentalLongPollingOptions: { timeoutSeconds: -1 }
      })
    ).to.throw(/invalid.*timeout.*-1.*\(.*5.*\)/i);
  });

  it('timeoutSeconds value of -infinity throws', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({
        experimentalLongPollingOptions: {
          timeoutSeconds: Number.NEGATIVE_INFINITY
        }
      })
    ).to.throw(/invalid.*timeout.*-Infinity.*\(.*5.*\)/i);
  });

  it('timeoutSeconds value of +infinity throws', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({
        experimentalLongPollingOptions: {
          timeoutSeconds: Number.POSITIVE_INFINITY
        }
      })
    ).to.throw(/invalid.*timeout.*Infinity.*\(.*30.*\)/i);
  });

  it('timeoutSeconds value of NaN throws', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({
        experimentalLongPollingOptions: { timeoutSeconds: Number.NaN }
      })
    ).to.throw(/invalid.*timeout.*NaN/i);
  });

  it('long polling autoDetect=[something truthy] should be coerced to true', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      experimentalAutoDetectLongPolling: 1 as any
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).to.be.true;
  });

  it('long polling autoDetect=[something falsy] should be coerced to false', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      experimentalAutoDetectLongPolling: 0 as any
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).to.be.false;
  });

  it('long polling autoDetect=null should be coerced to false', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      experimentalAutoDetectLongPolling: null as any
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).to.be.false;
  });

  it('long polling force=[something truthy] should be coerced to true', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      experimentalForceLongPolling: 'I am truthy' as any
    });
    expect(db._getSettings().experimentalForceLongPolling).to.be.true;
  });

  it('long polling force=[something falsy] should be coerced to false', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      experimentalForceLongPolling: NaN as any
    });
    expect(db._getSettings().experimentalForceLongPolling).to.be.false;
  });

  it('long polling force=null should be coerced to false', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      experimentalForceLongPolling: null as any
    });
    expect(db._getSettings().experimentalForceLongPolling).to.be.false;
  });

  it('gets settings from useEmulator', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    connectFirestoreEmulator(db, '127.0.0.1', 9000);

    expect(db._getSettings().host).to.equal('127.0.0.1:9000');
    expect(db._getSettings().ssl).to.be.false;
  });

  it('gets privateSettings from useEmulator', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    const emulatorOptions = { mockUserToken: 'test' };
    connectFirestoreEmulator(db, '127.0.0.1', 9000, emulatorOptions);

    expect(db._getSettings().host).to.exist.and.to.equal('127.0.0.1:9000');
    expect(db._getSettings().ssl).to.exist.and.to.be.false;
    expect(db._getEmulatorOptions()).to.equal(emulatorOptions);
  });

  it('sets ssl to true if cloud workstation host', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    const emulatorOptions = { mockUserToken: 'test' };
    const workstationHost = 'abc.cloudworkstations.dev';
    connectFirestoreEmulator(db, workstationHost, 9000, emulatorOptions);

    expect(db._getSettings().host).to.exist.and.to.equal(
      `${workstationHost}:9000`
    );
    expect(db._getSettings().ssl).to.exist.and.to.be.true;
    expect(db._getEmulatorOptions()).to.equal(emulatorOptions);
  });

  it('prefers host from useEmulator to host from settings', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({ host: 'other.host' });
    connectFirestoreEmulator(db, '127.0.0.1', 9000);

    expect(db._getSettings().host).to.equal('127.0.0.1:9000');
    expect(db._getSettings().ssl).to.be.false;
  });

  it('sets credentials based on mockUserToken object', async () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    const mockUserToken = { sub: 'foobar' };
    connectFirestoreEmulator(db, '127.0.0.1', 9000, { mockUserToken });

    const credentials = db._authCredentials;
    expect(credentials).to.be.instanceOf(EmulatorAuthCredentialsProvider);
    const token = await credentials.getToken();
    expect(token!.type).to.eql('OAuth');
    expect(token!.user!.uid).to.eql(mockUserToken.sub);
  });

  it('sets credentials based on mockUserToken string', async () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    connectFirestoreEmulator(db, '127.0.0.1', 9000, {
      mockUserToken: 'my-custom-mock-user-token'
    });

    const credentials = db._authCredentials;
    expect(credentials).to.be.instanceOf(EmulatorAuthCredentialsProvider);
    const token = await credentials.getToken();
    expect(token!.type).to.eql('OAuth');
    expect(token!.user).to.eql(User.MOCK_USER);
  });
});
