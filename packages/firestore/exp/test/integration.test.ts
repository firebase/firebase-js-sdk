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

import { initializeApp } from '@firebase/app-exp';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import {
  Firestore,
  getFirestore,
  initializeFirestore
} from '../src/api/database';
import {
  withTestDoc,
  withTestDocAndInitialData,
  withTestDbSettings,
  withTestCollection
} from './helpers';
import { getDoc } from '../src/api/reference';
import { FieldPath } from '../../lite/src/api/field_path';
import {
  DEFAULT_PROJECT_ID,
  DEFAULT_SETTINGS
} from '../../test/integration/util/settings';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  setDoc,
  updateDoc
} from '../../lite/src/api/reference';
import * as firestore from '../../lite';

use(chaiAsPromised);

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
});

describe('getDoc()', () => {
  it('can get a non-existing document', () => {
    return withTestDoc(async docRef => {
      const docSnap = await getDoc(docRef);
      expect(docSnap.metadata.fromCache).to.be.false;
      expect(docSnap.metadata.hasPendingWrites).to.be.false;
      expect(docSnap.data()).to.be.undefined;
      expect(docSnap.exists()).to.be.false;
    });
  });
});

// TODO(firestoreexp): Once all APIs from the Lite client are available in the
// EXP client, we should run the Firestore Lite integration tests against the
// EXP client. For now, we duplicate some of the tests.

/**
 * Shared test class that is used to verify the WriteBatch, Transaction and
 * DocumentReference-based mutation API.
 */
interface MutationTester {
  set<T>(documentRef: firestore.DocumentReference<T>, data: T): Promise<void>;
  set<T>(
    documentRef: firestore.DocumentReference<T>,
    data: Partial<T>,
    options: firestore.SetOptions
  ): Promise<void>;
  update(
    documentRef: firestore.DocumentReference<unknown>,
    data: firestore.UpdateData
  ): Promise<void>;
  update(
    documentRef: firestore.DocumentReference<unknown>,
    field: string | firestore.FieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): Promise<void>;
  delete(documentRef: firestore.DocumentReference<unknown>): Promise<void>;
}

genericMutationTests({
  set: setDoc,
  update: updateDoc,
  delete: deleteDoc
});

function genericMutationTests(
  op: MutationTester,
  validationUsesPromises: boolean = false
): void {
  const setDoc = op.set;
  const updateDoc = op.update;
  const deleteDoc = op.delete;

  describe('delete', () => {
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

  describe('set', () => {
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
        if (validationUsesPromises) {
          return expect(
            setDoc(docRef, { val: undefined })
          ).to.eventually.be.rejectedWith(
            /Function .* called with invalid data. Unsupported field value: undefined \(found in field val in document .*\)/
          );
        } else {
          expect(() => setDoc(docRef, { val: undefined })).to.throw(
            /Function .* called with invalid data. Unsupported field value: undefined \(found in field val in document .*\)/
          );
        }
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

  describe('update', () => {
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

    it('enforces that document exists', () => {
      return withTestDoc(async docRef => {
        await expect(updateDoc(docRef, { foo: 2, baz: 2 })).to.eventually.be
          .rejected;
      });
    });

    it('throws when user input fails validation', () => {
      return withTestDoc(async docRef => {
        if (validationUsesPromises) {
          return expect(
            updateDoc(docRef, { val: undefined })
          ).to.eventually.be.rejectedWith(
            /Function .* called with invalid data. Unsupported field value: undefined \(found in field val in document .*\)/
          );
        } else {
          expect(() => updateDoc(docRef, { val: undefined })).to.throw(
            /Function .* called with invalid data. Unsupported field value: undefined \(found in field val in document .*\)/
          );
        }
      });
    });
  });
}

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
        /Function addDoc\(\) called with invalid data. Unsupported field value: undefined \(found in field val in document .*\)/
      );
    });
  });
});
