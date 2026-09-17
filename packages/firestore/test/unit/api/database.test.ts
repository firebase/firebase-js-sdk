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

import { isNode } from '@firebase/util';

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
  querySnapshot,
  querySnapshotWithQuery
} from '../../util/api_helpers';
import { keys, query as internalQuery, orderBy } from '../../util/helpers';

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
    expect(
      refEqual(collectionReference('foo'), collectionReference('foo'))
    ).toBe(true);
    expect(
      refEqual(collectionReference('foo'), collectionReference('bar'))
    ).toBe(false);
  });

  it('JSON.stringify() does not throw', () => {
    JSON.stringify(collectionReference('foo'));
  });
});

describe('DocumentReference', () => {
  it('support equality checking with isEqual()', () => {
    expect(
      refEqual(documentReference('rooms/foo'), documentReference('rooms/foo'))
    ).toBe(true);
    expect(
      refEqual(documentReference('rooms/foo'), documentReference('rooms/bar'))
    ).toBe(false);
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
    expect(json).toEqual({
      type: 'firestore/documentReference/1.0',
      referencePath: 'foo/bar'
    });
  });

  it('fromJSON() throws with invalid data', () => {
    const db = newTestFirestore();
    expect(() => {
      DocumentReference.fromJSON(db, {});
    }).toThrow("JSON missing required field: 'type'");
  });

  it('fromJSON() throws with missing type data', () => {
    const db = newTestFirestore();
    expect(() => {
      documentSnapshotFromJSON(db, {
        bundleSource: 'DocumentSnapshot',
        bundleName: 'test name',
        bundle: 'test bundle'
      });
    }).toThrow("JSON missing required field: 'type'");
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
    }).toThrow("JSON field 'type' must be a string");
  });

  it('fromJSON() throws with missing bundleSource', () => {
    const db = newTestFirestore();
    expect(() => {
      documentSnapshotFromJSON(db, {
        type: DocumentSnapshot._jsonSchemaVersion,
        bundleName: 'test name',
        bundle: 'test bundle'
      });
    }).toThrow("JSON missing required field: 'bundleSource'");
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
    }).toThrow("JSON field 'bundleSource' must be a string");
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
    }).toThrow("Expected 'bundleSource' field to equal 'DocumentSnapshot'");
  });

  it('fromJSON() throws with missing bundleName', () => {
    const db = newTestFirestore();
    expect(() => {
      documentSnapshotFromJSON(db, {
        type: DocumentSnapshot._jsonSchemaVersion,
        bundleSource: 'DocumentSnapshot',
        bundle: 'test bundle'
      });
    }).toThrow("JSON missing required field: 'bundleName'");
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
    }).toThrow("JSON field 'bundleName' must be a string");
  });

  it('fromJSON() throws with missing bundle', () => {
    const db = newTestFirestore();
    expect(() => {
      documentSnapshotFromJSON(db, {
        type: DocumentSnapshot._jsonSchemaVersion,
        bundleSource: 'DocumentSnapshot',
        bundleName: 'test name'
      });
    }).toThrow("JSON missing required field: 'bundle'");
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
    }).toThrow("JSON field 'bundle' must be a string");
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
    expect(docRef.id).toBe(deserializedDocRef.id);
    expect(docRef.path).toBe(deserializedDocRef.path);
    expect(docRef.toJSON()).toEqual(deserializedDocRef.toJSON());
  });
});

describe('DocumentSnapshot', () => {
  it('support equality checking with isEqual()', () => {
    expect(
      snapshotEqual(
        documentSnapshot('rooms/foo', { a: 1 }, true),
        documentSnapshot('rooms/foo', { a: 1 }, true)
      )
    ).toBe(true);
    expect(
      snapshotEqual(
        documentSnapshot('rooms/foo', null, true),
        documentSnapshot('rooms/foo', null, true)
      )
    ).toBe(true);
    // will do both !left.isEqual(right) and !right.isEqual(left).
    expect(
      snapshotEqual(
        documentSnapshot('rooms/foo', { a: 1 }, true),
        documentSnapshot('rooms/foo', null, true)
      )
    ).toBe(false);
    expect(
      snapshotEqual(
        documentSnapshot('rooms/foo', { a: 1 }, true),
        documentSnapshot('rooms/bar', { a: 1 }, true)
      )
    ).toBe(false);
    expect(
      snapshotEqual(
        documentSnapshot('rooms/foo', { a: 1 }, true),
        documentSnapshot('rooms/bar', { b: 1 }, true)
      )
    ).toBe(false);
    expect(
      snapshotEqual(
        documentSnapshot('rooms/foo', { a: 1 }, true),
        documentSnapshot('rooms/bar', { a: 1 }, false)
      )
    ).toBe(false);
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
    expect(json.bundle).toBeDefined();
    expect(json.bundle.length).toBeGreaterThan(0);
  });

  it('toJSON returns a bundle containing NOT_SUPPORTED in non-node environments', () => {
    if (!isNode()) {
      const snapshotJson = documentSnapshot(
        'foo/bar',
        { a: 1 },
        /*fromCache=*/ true
      ).toJSON();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = snapshotJson as any;
      expect(json.bundle).toBeDefined();
      expect(json.bundle).toBe('NOT SUPPORTED');
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
      expect(json.bundle).toBeDefined();
      expect(json.bundle.length).toBe(0);
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
    }).toThrow(
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
    if (isNode()) {
      const docSnap = documentSnapshot(
        'foo/bar',
        { a: 1 },
        /*fromCache=*/ true
      );
      expect(() => {
        documentSnapshotFromJSON(docSnap._firestore, docSnap.toJSON());
      }).to.not.throw;
    }
  });

  it('fromJSON produces valid snapshot data.', () => {
    if (isNode()) {
      const docSnap = documentSnapshot(
        'foo/bar',
        { a: 1 },
        /*fromCache=*/ true
      );
      const db = firestore();
      const docSnapFromJSON = documentSnapshotFromJSON(db, docSnap.toJSON());
      expect(docSnapFromJSON).toBeDefined();
      const data = docSnapFromJSON.data();
      expect(docSnapFromJSON).toBeDefined();
      expect(docSnapFromJSON).not.toBeNull();
      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((data as any).a).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((data as any).a).toBe(1);
      }
    }
  });
});

describe('Query', () => {
  it('support equality checking with isEqual()', () => {
    expect(queryEqual(query('foo'), query('foo'))).toBe(true);
    expect(queryEqual(query('foo'), query('bar'))).toBe(false);
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
    ).toBe(true);
    expect(
      snapshotEqual(
        querySnapshot('foo', {}, { a: { a: 1 } }, keys(), false, false),
        querySnapshot('bar', {}, { a: { a: 1 } }, keys(), false, false)
      )
    ).toBe(false);
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
    ).toBe(false);
    expect(
      snapshotEqual(
        querySnapshot('foo', {}, { a: { a: 1 } }, keys(), false, false),
        querySnapshot('foo', {}, { a: { b: 1 } }, keys(), false, false)
      )
    ).toBe(false);
    expect(
      snapshotEqual(
        querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), false, false),
        querySnapshot('foo', {}, { a: { a: 1 } }, keys(), false, false)
      )
    ).toBe(false);
    expect(
      snapshotEqual(
        querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), false, false),
        querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/b'), false, false)
      )
    ).toBe(false);
    expect(
      snapshotEqual(
        querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), false, false),
        querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), true, false)
      )
    ).toBe(false);
    expect(
      snapshotEqual(
        querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), false, false),
        querySnapshot('foo', {}, { a: { a: 1 } }, keys('foo/a'), false, true)
      )
    ).toBe(false);
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
    ).toBe(true);
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
    ).toBe(false);
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
    expect(json.bundle).toBeDefined();
    expect(json.bundle.length).toBeGreaterThan(0);
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
      expect(json.bundle).toBeDefined();
      expect(json.bundle).toBe('NOT SUPPORTED');
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
      expect(json.bundle).toBeDefined();
      expect(json.bundle.length).toBeGreaterThan(0);
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
    ).toThrow(
      `QuerySnapshot.toJSON() attempted to serialize a document with pending writes. ` +
        `Await waitForPendingWrites() before invoking toJSON().`
    );
  });

  it('fromJSON() throws with invalid data', () => {
    const db = newTestFirestore();
    expect(() => {
      querySnapshotFromJSON(db, {});
    }).toThrow("JSON missing required field: 'type'");
  });

  it('fromJSON() throws with missing type data', () => {
    const db = newTestFirestore();
    expect(() => {
      querySnapshotFromJSON(db, {
        bundleSource: 'QuerySnapshot',
        bundleName: 'test name',
        bundle: 'test bundle'
      });
    }).toThrow("JSON missing required field: 'type'");
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
    }).toThrow("JSON field 'type' must be a string");
  });

  it('fromJSON() throws with missing bundle source data', () => {
    const db = newTestFirestore();
    expect(() => {
      querySnapshotFromJSON(db, {
        type: QuerySnapshot._jsonSchemaVersion,
        bundleName: 'test name',
        bundle: 'test bundle'
      });
    }).toThrow("JSON missing required field: 'bundleSource'");
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
    }).toThrow("JSON field 'bundleSource' must be a string");
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
    }).toThrow("Expected 'bundleSource' field to equal 'QuerySnapshot'");
  });

  it('fromJSON() throws with missing bundleName', () => {
    const db = newTestFirestore();
    expect(() => {
      querySnapshotFromJSON(db, {
        type: QuerySnapshot._jsonSchemaVersion,
        bundleSource: 'QuerySnapshot',
        bundle: 'test bundle'
      });
    }).toThrow("JSON missing required field: 'bundleName'");
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
    }).toThrow("JSON field 'bundleName' must be a string");
  });

  it('fromJSON() throws with missing bundle field', () => {
    const db = newTestFirestore();
    expect(() => {
      querySnapshotFromJSON(db, {
        type: QuerySnapshot._jsonSchemaVersion,
        bundleSource: 'QuerySnapshot',
        bundleName: 'test name'
      });
    }).toThrow("JSON missing required field: 'bundle'");
  });

  it('fromJSON() throws with invalid bundle field', () => {
    const db = newTestFirestore();
    expect(() => {
      querySnapshotFromJSON(db, {
        type: QuerySnapshot._jsonSchemaVersion,
        bundleSource: 'QuerySnapshot',
        bundleName: 'test name',
        bundle: 1
      });
    }).toThrow("JSON field 'bundle' must be a string");
  });

  it('fromJSON does not throw', () => {
    if (isNode()) {
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
      const db = firestore();
      expect(() => {
        querySnapshotFromJSON(db, snapshot.toJSON());
      }).to.not.throw;
    }
  });

  it('fromJSON produces valid snapshot data', () => {
    if (isNode()) {
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
      const db = firestore();
      const querySnap = querySnapshotFromJSON(db, snapshot.toJSON());
      expect(querySnap).toBeDefined();
      if (querySnap !== undefined) {
        const docs = querySnap.docs;
        expect(docs).toBeDefined();
        expect(docs).not.toBeNull();
        if (docs) {
          expect(docs.length).toBe(2);
          if (docs.length === 2) {
            let docData = docs[0].data();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let data = docData as any;
            expect(data.a).toBeDefined();
            expect(data.a).toBe(1);

            docData = docs[1].data();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data = docData as any;
            expect(data.bar).toBeDefined();
            expect(data.bar).toBe(2);
          }
        }
      }
    }
  });

  it('fromJSON respects query sort order', () => {
    if (isNode()) {
      const q = internalQuery('foo', orderBy('title', 'asc'));
      const snapshot = querySnapshotWithQuery(q, {
        docA: { title: 'C' },
        docB: { title: 'B' },
        docC: { title: 'A' }
      });
      const db = firestore();
      const querySnap = querySnapshotFromJSON(db, snapshot.toJSON());
      expect(querySnap).toBeDefined();
      const titles = querySnap.docs.map(d => d.data()['title']);
      expect(titles).toEqual(['A', 'B', 'C']);
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
    expect(documentSnapshot('rooms/foo', {}, true).metadata).toEqual(
      documentSnapshot('rooms/foo', {}, true).metadata
    );
    expect(documentSnapshot('rooms/foo', {}, true).metadata).not.toEqual(
      documentSnapshot('rooms/foo', {}, false).metadata
    );
  });

  it('from QuerySnapshot support equality checking with isEqual()', () => {
    expect(
      querySnapshot('foo', {}, {}, keys('foo/a'), true, false).metadata
    ).toEqual(
      querySnapshot('foo', {}, {}, keys('foo/a'), true, false).metadata
    );
    expect(
      querySnapshot('foo', {}, {}, keys('foo/a'), true, false).metadata
    ).not.toEqual(querySnapshot('foo', {}, {}, keys(), true, false).metadata);
    expect(
      querySnapshot('foo', {}, {}, keys('foo/a'), true, false).metadata
    ).not.toEqual(
      querySnapshot('foo', {}, {}, keys('foo/a'), false, false).metadata
    );
    expect(
      querySnapshot('foo', {}, {}, keys('foo/a'), true, false).metadata
    ).not.toEqual(querySnapshot('foo', {}, {}, keys(), false, false).metadata);
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
    ).toThrow(
      `experimentalForceLongPolling and experimentalAutoDetectLongPolling cannot be used together.`
    );
  });

  it('long polling should be in auto-detect mode by default', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(db._getSettings().experimentalAutoDetectLongPolling).toBe(true);
    expect(db._getSettings().experimentalForceLongPolling).toBe(false);
  });

  it('long polling should be in force mode if force=true', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      experimentalForceLongPolling: true
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).toBe(false);
    expect(db._getSettings().experimentalForceLongPolling).toBe(true);
  });

  it('long polling should be in auto-detect mode if autoDetect=true', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      experimentalAutoDetectLongPolling: true
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).toBe(true);
    expect(db._getSettings().experimentalForceLongPolling).toBe(false);
  });

  it('long polling should be in auto-detect mode if force=false', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      experimentalForceLongPolling: false
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).toBe(true);
    expect(db._getSettings().experimentalForceLongPolling).toBe(false);
  });

  it('long polling should be disabled if autoDetect=false', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      experimentalAutoDetectLongPolling: false
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).toBe(false);
    expect(db._getSettings().experimentalForceLongPolling).toBe(false);
  });

  it('long polling should be in auto-detect mode if autoDetect=true and force=false', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      experimentalAutoDetectLongPolling: true,
      experimentalForceLongPolling: false
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).toBe(true);
    expect(db._getSettings().experimentalForceLongPolling).toBe(false);
  });

  it('long polling should be in force mode if autoDetect=false and force=true', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      experimentalAutoDetectLongPolling: false,
      experimentalForceLongPolling: true
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).toBe(false);
    expect(db._getSettings().experimentalForceLongPolling).toBe(true);
  });

  it('long polling should be disabled if autoDetect=false and force=false', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      experimentalAutoDetectLongPolling: false,
      experimentalForceLongPolling: false
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).toBe(false);
    expect(db._getSettings().experimentalForceLongPolling).toBe(false);
  });

  it('timeoutSeconds is undefined by default', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(
      db._getSettings().experimentalLongPollingOptions.timeoutSeconds
    ).toBeUndefined();
  });

  it('timeoutSeconds minimum value is allowed', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({ experimentalLongPollingOptions: { timeoutSeconds: 5 } });
    expect(
      db._getSettings().experimentalLongPollingOptions.timeoutSeconds
    ).toBe(5);
  });

  it('timeoutSeconds maximum value is allowed', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({ experimentalLongPollingOptions: { timeoutSeconds: 30 } });
    expect(
      db._getSettings().experimentalLongPollingOptions.timeoutSeconds
    ).toBe(30);
  });

  it('timeoutSeconds typical value is allowed', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({ experimentalLongPollingOptions: { timeoutSeconds: 25 } });
    expect(
      db._getSettings().experimentalLongPollingOptions.timeoutSeconds
    ).toBe(25);
  });

  it('timeoutSeconds floating point value is allowed', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      experimentalLongPollingOptions: { timeoutSeconds: 12.3456 }
    });
    expect(
      db._getSettings().experimentalLongPollingOptions.timeoutSeconds
    ).toBe(12.3456);
  });

  it('timeoutSeconds value one less than minimum throws', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({ experimentalLongPollingOptions: { timeoutSeconds: 4 } })
    ).toThrow(/invalid.*timeout.*4.*\(.*5.*\)/i);
  });

  it('timeoutSeconds value one more than maximum throws', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({
        experimentalLongPollingOptions: { timeoutSeconds: 31 }
      })
    ).toThrow(/invalid.*timeout.*31.*\(.*30.*\)/i);
  });

  it('timeoutSeconds value of 0 throws', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({ experimentalLongPollingOptions: { timeoutSeconds: 0 } })
    ).toThrow(/invalid.*timeout.*0.*\(.*5.*\)/i);
  });

  it('timeoutSeconds value of -0 throws', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({
        experimentalLongPollingOptions: { timeoutSeconds: -0 }
      })
    ).toThrow(/invalid.*timeout.*0.*\(.*5.*\)/i);
  });

  it('timeoutSeconds value of -1 throws', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({
        experimentalLongPollingOptions: { timeoutSeconds: -1 }
      })
    ).toThrow(/invalid.*timeout.*-1.*\(.*5.*\)/i);
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
    ).toThrow(/invalid.*timeout.*-Infinity.*\(.*5.*\)/i);
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
    ).toThrow(/invalid.*timeout.*Infinity.*\(.*30.*\)/i);
  });

  it('timeoutSeconds value of NaN throws', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({
        experimentalLongPollingOptions: { timeoutSeconds: Number.NaN }
      })
    ).toThrow(/invalid.*timeout.*NaN/i);
  });

  it('long polling autoDetect=[something truthy] should be coerced to true', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      experimentalAutoDetectLongPolling: 1 as any
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).toBe(true);
  });

  it('long polling autoDetect=[something falsy] should be coerced to false', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      experimentalAutoDetectLongPolling: 0 as any
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).toBe(false);
  });

  it('long polling autoDetect=null should be coerced to false', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      experimentalAutoDetectLongPolling: null as any
    });
    expect(db._getSettings().experimentalAutoDetectLongPolling).toBe(false);
  });

  it('long polling force=[something truthy] should be coerced to true', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      experimentalForceLongPolling: 'I am truthy' as any
    });
    expect(db._getSettings().experimentalForceLongPolling).toBe(true);
  });

  it('long polling force=[something falsy] should be coerced to false', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      experimentalForceLongPolling: NaN as any
    });
    expect(db._getSettings().experimentalForceLongPolling).toBe(false);
  });

  it('long polling force=null should be coerced to false', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      experimentalForceLongPolling: null as any
    });
    expect(db._getSettings().experimentalForceLongPolling).toBe(false);
  });

  it('gets settings from useEmulator', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    connectFirestoreEmulator(db, '127.0.0.1', 9000);

    expect(db._getSettings().host).toBe('127.0.0.1:9000');
    expect(db._getSettings().ssl).toBe(false);
  });

  it('gets privateSettings from useEmulator', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    const emulatorOptions = { mockUserToken: 'test' };
    connectFirestoreEmulator(db, '127.0.0.1', 9000, emulatorOptions);

    expect(db._getSettings().host).toBe('127.0.0.1:9000');
    expect(db._getSettings().ssl).toBe(false);
    expect(db._getEmulatorOptions()).toBe(emulatorOptions);
  });

  it('sets ssl to true if cloud workstation host', () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true } as Response);
    try {
      // Use a new instance of Firestore in order to configure settings.
      const db = newTestFirestore();
      const emulatorOptions = { mockUserToken: 'test' };
      const workstationHost = 'abc.cloudworkstations.dev';
      connectFirestoreEmulator(db, workstationHost, 9000, emulatorOptions);

      expect(db._getSettings().host).toBe(`${workstationHost}:9000`);
      expect(db._getSettings().ssl).toBe(true);
      expect(db._getEmulatorOptions()).toBe(emulatorOptions);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('prefers host from useEmulator to host from settings', () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    db._setSettings({ host: 'other.host' });
    connectFirestoreEmulator(db, '127.0.0.1', 9000);

    expect(db._getSettings().host).toBe('127.0.0.1:9000');
    expect(db._getSettings().ssl).toBe(false);
  });

  it('sets credentials based on mockUserToken object', async () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    const mockUserToken = { sub: 'foobar' };
    connectFirestoreEmulator(db, '127.0.0.1', 9000, { mockUserToken });

    const credentials = db._authCredentials;
    expect(credentials).toBeInstanceOf(EmulatorAuthCredentialsProvider);
    const token = await credentials.getToken();
    expect(token!.type).toEqual('OAuth');
    expect(token!.user!.uid).toEqual(mockUserToken.sub);
  });

  it('sets credentials based on mockUserToken string', async () => {
    // Use a new instance of Firestore in order to configure settings.
    const db = newTestFirestore();
    connectFirestoreEmulator(db, '127.0.0.1', 9000, {
      mockUserToken: 'my-custom-mock-user-token'
    });

    const credentials = db._authCredentials;
    expect(credentials).toBeInstanceOf(EmulatorAuthCredentialsProvider);
    const token = await credentials.getToken();
    expect(token!.type).toEqual('OAuth');
    expect(token!.user).toEqual(User.MOCK_USER);
  });

  it('allows setting grpcFlowControlWindow to a positive integer', () => {
    const db = newTestFirestore();
    db._setSettings({
      grpcFlowControlWindow: 512 * 1024
    });
    expect(db._getSettings().grpcFlowControlWindow).toBe(512 * 1024);
  });

  it('throws when setting grpcFlowControlWindow to non-positive value', () => {
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({
        grpcFlowControlWindow: 0
      })
    ).toThrow(/grpcFlowControlWindow must be a positive integer/);

    expect(() =>
      db._setSettings({
        grpcFlowControlWindow: -50
      })
    ).toThrow(/grpcFlowControlWindow must be a positive integer/);
  });

  it('throws when setting grpcFlowControlWindow to a non-integer', () => {
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({
        grpcFlowControlWindow: 12.5
      })
    ).toThrow(/grpcFlowControlWindow must be a positive integer/);

    expect(() =>
      db._setSettings({
        grpcFlowControlWindow: '100' as unknown as number
      })
    ).toThrow(/grpcFlowControlWindow must be a positive integer/);
  });

  it('throws when setting grpcFlowControlWindow above 2147483647', () => {
    const db = newTestFirestore();
    expect(() =>
      db._setSettings({
        grpcFlowControlWindow: 2147483648
      })
    ).toThrow(
      /grpcFlowControlWindow must be a positive integer and cannot exceed 2147483647/
    );
  });
});
