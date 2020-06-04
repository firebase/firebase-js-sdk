/**
 * @license
 * Copyright 2020 Google LLC
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

import { initializeApp } from '@firebase/app-exp';
import {
  Firestore,
  getFirestore,
  initializeFirestore
} from '../src/api/database';
import { withTestDb, withTestDoc } from './helpers';
import {
  parent,
  collection,
  CollectionReference,
  doc,
  DocumentReference,
  getDoc,
  deleteDoc
} from '../src/api/reference';
import { expectEqual, expectNotEqual } from '../../test/util/helpers';
import { FieldValue } from '../../src/api/field_value';

describe('Firestore', () => {
  it('can provide setting', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-initializeFirestore'
    );
    const fs1 = initializeFirestore(app, { host: 'localhost', ssl: false });
    expect(fs1).to.be.an.instanceOf(Firestore);
  });

  it('returns same instance', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-getFirestore'
    );
    const fs1 = getFirestore(app);
    const fs2 = getFirestore(app);
    expect(fs1 === fs2).to.be.true;
  });

  it('cannot call initializeFirestore() twice', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-initializeFirestore-twice'
    );
    initializeFirestore(app, { host: 'localhost', ssl: false });
    expect(() => {
      initializeFirestore(app, { host: 'localhost', ssl: false });
    }).to.throw(
      'Firestore has already been started and its settings can no longer be changed.'
    );
  });
});

describe('doc', () => {
  it('can provide name', () => {
    return withTestDb(db => {
      const result = doc(db, 'coll/doc');
      expect(result).to.be.an.instanceOf(DocumentReference);
      expect(result.id).to.equal('doc');
      expect(result.path).to.equal('coll/doc');
    });
  });

  it('validates path', () => {
    return withTestDb(db => {
      expect(() => doc(db, 'coll')).to.throw(
        'Invalid document path (coll). Path points to a collection.'
      );
      expect(() => doc(db, '')).to.throw(
        'Function doc() requires its second argument to be of type non-empty string, but it was: ""'
      );
      expect(() => doc(collection(db, 'coll'), 'doc/coll')).to.throw(
        'Invalid document path (coll/doc/coll). Path points to a collection.'
      );
      expect(() => doc(db, 'coll//doc')).to.throw(
        'Invalid path (coll//doc). Paths must not contain // in them.'
      );
    });
  });

  it('supports AutoId', () => {
    return withTestDb(db => {
      const coll = collection(db, 'coll');
      const ref = doc(coll);
      expect(ref.id.length).to.equal(20);
    });
  });
});

describe('collection', () => {
  it('can provide name', () => {
    return withTestDb(db => {
      const result = collection(db, 'coll/doc/subcoll');
      expect(result).to.be.an.instanceOf(CollectionReference);
      expect(result.id).to.equal('subcoll');
      expect(result.path).to.equal('coll/doc/subcoll');
    });
  });

  it('validates path', () => {
    return withTestDb(db => {
      expect(() => collection(db, 'coll/doc')).to.throw(
        'Invalid collection path (coll/doc). Path points to a document.'
      );
      // TODO(firestorelite): Explore returning a more helpful message
      // (e.g. "Empty document paths are not supported.")
      expect(() => collection(doc(db, 'coll/doc'), '')).to.throw(
        'Function doc() requires its second argument to be of type non-empty string, but it was: ""'
      );
      expect(() => collection(doc(db, 'coll/doc'), 'coll/doc')).to.throw(
        'Invalid collection path (coll/doc/coll/doc). Path points to a document.'
      );
    });
  });
});

describe('parent', () => {
  it('returns CollectionReferences for DocumentReferences', () => {
    return withTestDb(db => {
      const coll = collection(db, 'coll/doc/coll');
      const result = parent(coll);
      expect(result).to.be.an.instanceOf(DocumentReference);
      expect(result!.path).to.equal('coll/doc');
    });
  });

  it('returns DocumentReferences for CollectionReferences', () => {
    return withTestDb(db => {
      const coll = doc(db, 'coll/doc');
      const result = parent(coll);
      expect(result).to.be.an.instanceOf(CollectionReference);
      expect(result.path).to.equal('coll');
    });
  });

  it('returns null for root collection', () => {
    return withTestDb(db => {
      const coll = collection(db, 'coll');
      const result = parent(coll);
      expect(result).to.be.null;
    });
  });
});

describe('getDoc()', () => {
  it('can get a non-existing document', () => {
    return withTestDoc(async docRef => {
      const docSnap = await getDoc(docRef);
      expect(docSnap.exists()).to.be.false;
    });
  });

  // TODO(firestorelite): Expand test coverage once we can write docs
});

describe('deleteDoc()', () => {
  it('can delete a non-existing document', () => {
    return withTestDoc(docRef => deleteDoc(docRef));
  });
});

// TODO(firestorelite): Expand test coverage once we can write docs
describe('FieldValue', () => {
  it('support equality checking with isEqual()', () => {
    expectEqual(FieldValue.delete(), FieldValue.delete());
    expectEqual(FieldValue.serverTimestamp(), FieldValue.serverTimestamp());
    expectNotEqual(FieldValue.delete(), FieldValue.serverTimestamp());
    // TODO(firestorelite): Add test when field value is available
    //expectNotEqual(FieldValue.delete(), documentId());
  });

  it('support instanceof checks', () => {
    expect(FieldValue.delete()).to.be.an.instanceOf(FieldValue);
    expect(FieldValue.serverTimestamp()).to.be.an.instanceOf(FieldValue);
    expect(FieldValue.increment(1)).to.be.an.instanceOf(FieldValue);
    expect(FieldValue.arrayUnion('a')).to.be.an.instanceOf(FieldValue);
    expect(FieldValue.arrayRemove('a')).to.be.an.instanceOf(FieldValue);
  });
});
