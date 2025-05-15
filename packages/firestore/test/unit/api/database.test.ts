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
  DocumentReference,
  DocumentSnapshot,
  documentSnapshotFromJSON,
  QuerySnapshot,
  querySnapshotFromJSON,
  connectFirestoreEmulator,
  loadBundle,
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
  firestore,
  newTestFirestore,
  query,
  querySnapshot
} from '../../util/api_helpers';
import {
  DOCUMENT_SNAPSHOT_BUNDLE_TEST_PROJECT,
  QUERY_SNAPSHOT_BUNDLE_TEST_PROJECT,
  keys
} from '../../util/helpers';

import { isNode } from '@firebase/util';

describe('Bundle', () => {
  it('loadBundle does not throw with an empty bundle string)', async () => {
    const db = newTestFirestore();
    expect(async () => {
      await loadBundle(db, '');
    }).to.not.throw;
  });
});

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

  it('toJSON() does not throw', () => {
    expect(() => {
      documentReference('foo/bar').toJSON();
    }).to.not.throw;
  });

  it('toJSON() includes correct JSON fields', () => {
    const docRef = documentReference('foo/bar');
    const json = docRef.toJSON();
    expect(json).to.deep.equal({
      type: 'firestore/documentReference/1.0',
      referencePath: 'foo/bar'
    });
  });

  it('fromJSON() throws with invalid data', () => {
    const db = newTestFirestore();
    expect(() => {
      DocumentReference.fromJSON(db, {});
    }).to.throw;
  });

  it('fromJSON() throws with missing type data', () => {
    const db = newTestFirestore();
    expect(() => {
      documentSnapshotFromJSON(db, {
        bundleSource: 'DocumentSnapshot',
        bundleName: 'test name',
        bundle: 'test bundle'
      });
    }).to.throw;
  });

  it('fromJSON() throws with invalid type data', () => {
    const db = newTestFirestore();
    expect(() => {
      documentSnapshotFromJSON(db, {
        type: 1,
        bundleSource: 'DocumentSnapshot',
        bundleName: 'test name',
        bundle: 'test bundle'
      });
    }).to.throw;
  });

  it('fromJSON() throws with missing bundleSource', () => {
    const db = newTestFirestore();
    expect(() => {
      documentSnapshotFromJSON(db, {
        type: DocumentSnapshot._jsonSchemaVersion,
        bundleName: 'test name',
        bundle: 'test bundle'
      });
    }).to.throw;
  });

  it('fromJSON() throws with invalid bundleSource type', () => {
    const db = newTestFirestore();
    expect(() => {
      documentSnapshotFromJSON(db, {
        type: DocumentSnapshot._jsonSchemaVersion,
        bundleSource: 1,
        bundleName: 'test name',
        bundle: 'test bundle'
      });
    }).to.throw;
  });

  it('fromJSON() throws with invalid bundleSource value', () => {
    const db = newTestFirestore();
    expect(() => {
      documentSnapshotFromJSON(db, {
        type: DocumentSnapshot._jsonSchemaVersion,
        bundleSource: 'QuerySnapshot',
        bundleName: 'test name',
        bundle: 'test bundle'
      });
    }).to.throw;
  });

  it('fromJSON() throws with missing bundleName', () => {
    const db = newTestFirestore();
    expect(() => {
      documentSnapshotFromJSON(db, {
        type: DocumentSnapshot._jsonSchemaVersion,
        bundleSource: 'DocumentSnapshot',
        bundle: 'test bundle'
      });
    }).to.throw;
  });

  it('fromJSON() throws with invalid bundleName', () => {
    const db = newTestFirestore();
    expect(() => {
      documentSnapshotFromJSON(db, {
        type: DocumentSnapshot._jsonSchemaVersion,
        bundleSource: 'DocumentSnapshot',
        bundleName: 1,
        bundle: 'test bundle'
      });
    }).to.throw;
  });

  it('fromJSON() throws with missing bundle', () => {
    const db = newTestFirestore();
    expect(() => {
      documentSnapshotFromJSON(db, {
        type: DocumentSnapshot._jsonSchemaVersion,
        bundleSource: 'DocumentSnapshot',
        bundleName: 'test name'
      });
    }).to.throw;
  });

  it('fromJSON() throws with invalid bundle', () => {
    const db = newTestFirestore();
    expect(() => {
      documentSnapshotFromJSON(db, {
        type: DocumentSnapshot._jsonSchemaVersion,
        bundleSource: 'DocumentSnapshot',
        bundleName: 'test name',
        bundle: 1
      });
    }).to.throw;
  });

  it('fromJSON() does not throw', () => {
    const db = newTestFirestore();
    const docRef = documentReference('foo/bar');
    const json = docRef.toJSON();
    expect(() => {
      DocumentReference.fromJSON(db, json);
    }).to.not.throw;
  });

  it('fromJSON() equals original docRef', () => {
    const db = newTestFirestore();
    const docRef = documentReference('foo/bar');
    const json = docRef.toJSON();
    const deserializedDocRef = DocumentReference.fromJSON(db, json);
    expect(docRef.id).to.equal(deserializedDocRef.id);
    expect(docRef.path).to.equal(deserializedDocRef.path);
    expect(docRef.toJSON()).to.deep.equal(deserializedDocRef.toJSON());
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

  it('toJSON returns a bundle', () => {
    const snapshotJson = documentSnapshot(
      'foo/bar',
      { a: 1 },
      /*fromCache=*/ true
    ).toJSON();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = snapshotJson as any;
    expect(json.bundle).to.exist;
    expect(json.bundle.length).to.be.greaterThan(0);
  });

  it('toJSON returns a bundle containing NOT_SUPPORTED in non-node environments', () => {
    if (!isNode()) {
      const snapshotJson = documentSnapshot(
        'foo/bar',
        /*data=*/ null,
        /*fromCache=*/ true
      ).toJSON();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = snapshotJson as any;
      expect(json.bundle).to.exist;
      expect(json.bundle).to.equal('NOT SUPPORTED');
    }
  });

  it('toJSON returns an empty bundle when there are no documents', () => {
    if (isNode()) {
      const snapshotJson = documentSnapshot(
        'foo/bar',
        /*data=*/ null,
        /*fromCache=*/ true
      ).toJSON();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = snapshotJson as any;
      expect(json.bundle).to.exist;
      expect(json.bundle.length).to.equal(0);
    }
  });

  it('toJSON throws when there are pending writes', () => {
    expect(() => {
      documentSnapshot(
        'foo/bar',
        {},
        /*fromCache=*/ true,
        /*hasPendingWrites=*/ true
      ).toJSON();
    }).to.throw(
      `DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. ` +
        `Await waitForPendingWrites() before invoking toJSON().`
    );
  });

  it('fromJSON throws when parsing client-side toJSON result', () => {
    if (!isNode()) {
      const docSnap = documentSnapshot(
        'foo/bar',
        { a: 1 },
        /*fromCache=*/ true
      );
      expect(() => {
        documentSnapshotFromJSON(docSnap._firestore, docSnap.toJSON());
      }).to.throw;
    }
  });

  it('fromJSON parses toJSON result', () => {
    const docSnap = documentSnapshot('foo/bar', { a: 1 }, /*fromCache=*/ true);
    let json: object = DOCUMENT_SNAPSHOT_BUNDLE_TEST_PROJECT; // Bundled Doc: { a: 1 }.
    if (isNode()) {
      json = docSnap.toJSON();
    }

    expect(() => {
      documentSnapshotFromJSON(docSnap._firestore, json);
    }).to.not.throw;
  });

  it('fromJSON produces valid snapshot data.', () => {
    const docSnap = documentSnapshot('foo/bar', { a: 1 }, /*fromCache=*/ true);
    let json: object = DOCUMENT_SNAPSHOT_BUNDLE_TEST_PROJECT; // Bundled Doc: { a: 1 }.
    //if (isNode()) {
    if (true) {
      console.error('DEDB docSnap.toJSON: ', docSnap.toJSON());
      json = docSnap.toJSON();
    }
    const db = firestore();
    const docSnapFromJSON = documentSnapshotFromJSON(db, json);
    expect(docSnapFromJSON).to.exist;
    const data = docSnapFromJSON.data();
    expect(docSnapFromJSON).to.not.be.undefined;
    expect(docSnapFromJSON).to.not.be.null;
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((data as any).a).to.exist;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((data as any).a).to.equal(1);
    }
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

  it('toJSON returns a bundle', () => {
    const snapshotJson = querySnapshot(
      'foo',
      {},
      { a: { a: 1 } },
      keys(), // An empty set of mutaded document keys signifies that there are no pending writes.
      false,
      false
    ).toJSON();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = snapshotJson as any;
    expect(json.bundle).to.exist;
    expect(json.bundle.length).to.be.greaterThan(0);
  });

  it('toJSON returns a bundle containing NOT_SUPPORTED in non-node environments', () => {
    if (!isNode()) {
      const snapshotJson = querySnapshot(
        'foo',
        {},
        { a: { a: 1 } },
        keys(), // An empty set of mutaded document keys signifies that there are no pending writes.
        false,
        false
      ).toJSON();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = snapshotJson as any;
      expect(json.bundle).to.exist;
      expect(json.bundle).to.equal('NOT SUPPORTED');
    }
  });

  it('toJSON returns a bundle when there are no documents', () => {
    if (isNode()) {
      const snapshotJson = querySnapshot(
        'foo',
        {},
        {},
        keys(),
        false,
        false
      ).toJSON();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = snapshotJson as any;
      expect(json.bundle).to.exist;
      expect(json.bundle.length).to.be.greaterThan(0);
    }
  });

  it('toJSON throws when there are pending writes', () => {
    expect(() =>
      querySnapshot(
        'foo',
        {},
        { a: { a: 1 } },
        keys('foo/a'), // A non empty set of mutated keys signifies pending writes.
        false,
        false
      ).toJSON()
    ).to.throw(
      `QuerySnapshot.toJSON() attempted to serialize a document with pending writes. ` +
        `Await waitForPendingWrites() before invoking toJSON().`
    );
  });

  it('fromJSON() throws with invalid data', () => {
    const db = newTestFirestore();
    expect(() => {
      querySnapshotFromJSON(db, {});
    }).to.throw;
  });

  it('fromJSON() throws with missing type data', () => {
    const db = newTestFirestore();
    expect(() => {
      querySnapshotFromJSON(db, {
        bundleSource: 'QuerySnapshot',
        bundleName: 'test name',
        bundle: 'test bundle'
      });
    }).to.throw;
  });

  it('fromJSON() throws with invalid type data', () => {
    const db = newTestFirestore();
    expect(() => {
      querySnapshotFromJSON(db, {
        type: 1,
        bundleSource: 'QuerySnapshot',
        bundleName: 'test name',
        bundle: 'test bundle'
      });
    }).to.throw;
  });

  it('fromJSON() throws with invalid type data', () => {
    const db = newTestFirestore();
    expect(() => {
      querySnapshotFromJSON(db, {
        type: QuerySnapshot._jsonSchemaVersion,
        bundleName: 'test name',
        bundle: 'test bundle'
      });
    }).to.throw;
  });

  it('fromJSON() throws with invalid bundleSource type', () => {
    const db = newTestFirestore();
    expect(() => {
      querySnapshotFromJSON(db, {
        type: QuerySnapshot._jsonSchemaVersion,
        bundleSource: 1,
        bundleName: 'test name',
        bundle: 'test bundle'
      });
    }).to.throw;
  });

  it('fromJSON() throws with invalid bundleSource value', () => {
    const db = newTestFirestore();
    expect(() => {
      querySnapshotFromJSON(db, {
        type: QuerySnapshot._jsonSchemaVersion,
        bundleSource: 'DocumentSnapshot',
        bundleName: 'test name',
        bundle: 'test bundle'
      });
    }).to.throw;
  });

  it('fromJSON() throws with missing bundleName', () => {
    const db = newTestFirestore();
    expect(() => {
      querySnapshotFromJSON(db, {
        type: QuerySnapshot._jsonSchemaVersion,
        bundleSource: 'QuerySnapshot',
        bundle: 'test bundle'
      });
    }).to.throw;
  });

  it('fromJSON() throws with invalid bundleName', () => {
    const db = newTestFirestore();
    expect(() => {
      querySnapshotFromJSON(db, {
        type: QuerySnapshot._jsonSchemaVersion,
        bundleSource: 'QuerySnapshot',
        bundleName: 1,
        bundle: 'test bundle'
      });
    }).to.throw;
  });

  it('fromJSON() throws with missing bundle data', () => {
    const db = newTestFirestore();
    expect(() => {
      querySnapshotFromJSON(db, {
        type: QuerySnapshot._jsonSchemaVersion,
        bundleSource: 'QuerySnapshot',
        bundleName: 'test name'
      });
    }).to.throw;
  });

  it('fromJSON() throws with invalid bundle data', () => {
    const db = newTestFirestore();
    expect(() => {
      querySnapshotFromJSON(db, {
        type: QuerySnapshot._jsonSchemaVersion,
        bundleSource: 'QuerySnapshot',
        bundleName: 'test name',
        bundle: 1
      });
    }).to.throw;
  });

  it('fromJSON does not throw', () => {
    const snapshot = querySnapshot(
      'foo',
      {},
      {
        a: { a: 1 },
        b: { bar: 2 }
      },
      keys(), // An empty set of mutaded document keys signifies that there are no pending writes.
      false,
      false
    );
    let json: object = QUERY_SNAPSHOT_BUNDLE_TEST_PROJECT; // Bundled docs: { a: { foo: 1 }, b: { bar: 2 } }.
    if (isNode()) {
      json = snapshot.toJSON();
    }
    const db = firestore();
    expect(() => {
      querySnapshotFromJSON(db, json);
    }).to.not.throw;
  });

  it('fromJSON produces valid snapshot data', () => {
    const snapshot = querySnapshot(
      'foo',
      {},
      {
        a: { a: 1 },
        b: { bar: 2 }
      },
      keys(), // An empty set of mutaded document keys signifies that there are no pending writes.
      false,
      false
    );
    let json: object = QUERY_SNAPSHOT_BUNDLE_TEST_PROJECT; // Bundled docs: { a: { foo: 1 }, b: { bar: 2 } }.
    if (isNode()) {
      json = snapshot.toJSON();
    }
    const db = firestore();
    const querySnap = querySnapshotFromJSON(db, json);
    expect(querySnap).to.exist;
    if (querySnap !== undefined) {
      const docs = querySnap.docs;
      expect(docs).to.not.be.undefined;
      expect(docs).to.not.be.null;
      if (docs) {
        expect(docs.length).to.equal(2);
        if (docs.length === 2) {
          let docData = docs[0].data();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let data = docData as any;
          expect(data.a).to.exist;
          expect(data.a).to.equal(1);

          docData = docs[1].data();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data = docData as any;
          expect(data.bar).to.exist;
          expect(data.bar).to.equal(2);
        }
      }
    }
  });

  it('fromJSON throws when parsing client-side toJSON result', () => {
    if (!isNode()) {
      const querySnap = querySnapshot(
        'foo',
        {},
        { a: { a: 1 } },
        keys(), // An empty set of mutaded document keys signifies that there are no pending writes.
        false,
        false
      );
      const json = querySnap.toJSON();
      expect(() => {
        querySnapshotFromJSON(querySnap._firestore, json);
      }).to.throw;
    }
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
