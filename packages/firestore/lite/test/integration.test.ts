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
import {
  withTestCollection,
  withTestDb,
  withTestDbSettings,
  withTestDoc,
  withTestDocAndInitialData
} from './helpers';
import {
  parent,
  collection,
  CollectionReference,
  doc,
  DocumentReference,
  getDoc,
  deleteDoc,
  setDoc,
  addDoc,
  updateDoc
} from '../src/api/reference';
import { FieldPath } from '../src/api/field_path';
import {
  DEFAULT_PROJECT_ID,
  DEFAULT_SETTINGS
} from '../../test/integration/util/settings';

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
        'Invalid path (coll). Path points to a collection.'
      );
      expect(() => doc(db, '')).to.throw(
        'Invalid path (). Empty paths are not supported.'
      );
      expect(() => doc(collection(db, 'coll'), 'doc/coll')).to.throw(
        'Invalid path (coll/doc/coll). Path points to a collection.'
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
        'Invalid path (coll/doc). Path points to a document.'
      );
      expect(() => collection(doc(db, 'coll/doc'), '')).to.throw(
        'Invalid path (). Empty paths are not supported.'
      );
      expect(() => collection(doc(db, 'coll/doc'), 'coll/doc')).to.throw(
        'Invalid path (coll/doc/coll/doc). Path points to a document.'
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

  it('can get an existing document', () => {
    return withTestDocAndInitialData({ val: 1 }, async docRef => {
      const docSnap = await getDoc(docRef);
      expect(docSnap.exists()).to.be.true;
    });
  });
});

describe('deleteDoc()', () => {
  it('can delete a non-existing document', () => {
    return withTestDoc(docRef => deleteDoc(docRef));
  });

  it('can delete an existing document', () => {
    return withTestDoc(async docRef => {
      await setDoc(docRef, {});
      await deleteDoc(docRef);
      const docSnap = await getDoc(docRef);
      expect(docSnap.exists()).to.be.false;
    });
  });
});

describe('setDoc()', () => {
  it('can set a new document', () => {
    return withTestDoc(async docRef => {
      await setDoc(docRef, { val: 1 });
      const docSnap = await getDoc(docRef);
      expect(docSnap.data()).to.deep.equal({ val: 1 });
    });
  });

  it('can merge a document', () => {
    return withTestDocAndInitialData({ foo: 1 }, async docRef => {
      await setDoc(docRef, { bar: 2 }, { merge: true });
      const docSnap = await getDoc(docRef);
      expect(docSnap.data()).to.deep.equal({ foo: 1, bar: 2 });
    });
  });

  it('can merge a document with mergeFields', () => {
    return withTestDocAndInitialData({ foo: 1 }, async docRef => {
      await setDoc(
        docRef,
        { foo: 'ignored', bar: 2, baz: { foobar: 3 } },
        { mergeFields: ['bar', new FieldPath('baz', 'foobar')] }
      );
      const docSnap = await getDoc(docRef);
      expect(docSnap.data()).to.deep.equal({
        foo: 1,
        bar: 2,
        baz: { foobar: 3 }
      });
    });
  });

  it('throws when user input fails validation', () => {
    return withTestDoc(async docRef => {
      expect(() => setDoc(docRef, { val: undefined })).to.throw(
        'Function setDoc() called with invalid data. Unsupported field value: undefined (found in field val)'
      );
    });
  });

  it("can ignore 'undefined'", () => {
    return withTestDbSettings(
      DEFAULT_PROJECT_ID,
      { ...DEFAULT_SETTINGS, ignoreUndefinedProperties: true },
      async db => {
        const docRef = doc(collection(db, 'test-collection'));
        await setDoc(docRef, { val: undefined });
        const docSnap = await getDoc(docRef);
        expect(docSnap.data()).to.deep.equal({});
      }
    );
  });
});

describe('update()', () => {
  it('can update a document', () => {
    return withTestDocAndInitialData({ foo: 1, bar: 1 }, async docRef => {
      await updateDoc(docRef, { foo: 2, baz: 2 });
      const docSnap = await getDoc(docRef);
      expect(docSnap.data()).to.deep.equal({ foo: 2, bar: 1, baz: 2 });
    });
  });

  it('can update a document (using varargs)', () => {
    return withTestDocAndInitialData({ foo: 1, bar: 1 }, async docRef => {
      await updateDoc(docRef, 'foo', 2, new FieldPath('baz'), 2);
      const docSnap = await getDoc(docRef);
      expect(docSnap.data()).to.deep.equal({ foo: 2, bar: 1, baz: 2 });
    });
  });

  it('throws when user input fails validation', () => {
    return withTestDoc(async docRef => {
      expect(() => updateDoc(docRef, { val: undefined })).to.throw(
        'Function updateDoc() called with invalid data. Unsupported field value: undefined (found in field val)'
      );
    });
  });
});

describe('addDoc()', () => {
  it('can add a document', () => {
    return withTestCollection(async collRef => {
      const docRef = await addDoc(collRef, { val: 1 });
      const docSnap = await getDoc(docRef);
      expect(docSnap.data()).to.deep.equal({ val: 1 });
    });
  });

  it('throws when user input fails validation', () => {
    return withTestCollection(async collRef => {
      expect(() => addDoc(collRef, { val: undefined })).to.throw(
        'Function addDoc() called with invalid data. Unsupported field value: undefined (found in field val)'
      );
    });
  });
});

describe('DocumentSnapshot', () => {
  it('can represent missing data', () => {
    return withTestDoc(async docRef => {
      const docSnap = await getDoc(docRef);
      expect(docSnap.exists()).to.be.false;
      expect(docSnap.data()).to.be.undefined;
    });
  });

  it('can return data', () => {
    return withTestDocAndInitialData({ foo: 1 }, async docRef => {
      const docSnap = await getDoc(docRef);
      expect(docSnap.exists()).to.be.true;
      expect(docSnap.data()).to.deep.equal({ foo: 1 });
    });
  });

  it('can return single field', () => {
    return withTestDocAndInitialData({ foo: 1, bar: 2 }, async docRef => {
      const docSnap = await getDoc(docRef);
      expect(docSnap.get('foo')).to.equal(1);
      expect(docSnap.get(new FieldPath('bar'))).to.equal(2);
    });
  });

  it('can return nested field', () => {
    return withTestDocAndInitialData({ foo: { bar: 1 } }, async docRef => {
      const docSnap = await getDoc(docRef);
      expect(docSnap.get('foo.bar')).to.equal(1);
      expect(docSnap.get(new FieldPath('foo', 'bar'))).to.equal(1);
    });
  });

  it('is properly typed', () => {
    return withTestDocAndInitialData({ foo: 1 }, async docRef => {
      const docSnap = await getDoc(docRef);
      let documentData = docSnap.data()!; // "data" is typed as nullable
      if (docSnap.exists()) {
        documentData = docSnap.data(); // "data" is typed as non-null
      }
      expect(documentData).to.deep.equal({ foo: 1 });
    });
  });
});

// TODO(firestorelite): Add converter tests
