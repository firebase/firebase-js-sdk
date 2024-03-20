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

// eslint-disable-next-line import/no-extraneous-dependencies
import { initializeApp } from '@firebase/app';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  aggregateQuerySnapshotEqual,
  getCount,
  getAggregate,
  count,
  sum,
  average
} from '../../src/lite-api/aggregate';
import { Bytes } from '../../src/lite-api/bytes';
import {
  Firestore,
  getFirestore,
  initializeFirestore,
  terminate
} from '../../src/lite-api/database';
import { FieldPath } from '../../src/lite-api/field_path';
import { FieldValue } from '../../src/lite-api/field_value';
import {
  arrayRemove,
  arrayUnion,
  deleteField,
  increment,
  serverTimestamp
} from '../../src/lite-api/field_value_impl';
import {
  endAt,
  endBefore,
  limit,
  limitToLast,
  orderBy,
  query,
  startAfter,
  startAt,
  where
} from '../../src/lite-api/query';
import {
  collection,
  CollectionReference,
  doc,
  DocumentReference,
  refEqual,
  queryEqual,
  collectionGroup,
  SetOptions,
  DocumentData,
  WithFieldValue,
  PartialWithFieldValue,
  UpdateData
} from '../../src/lite-api/reference';
import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc
} from '../../src/lite-api/reference_impl';
import {
  FirestoreDataConverter,
  snapshotEqual,
  QuerySnapshot,
  QueryDocumentSnapshot
} from '../../src/lite-api/snapshot';
import { Timestamp } from '../../src/lite-api/timestamp';
import { runTransaction } from '../../src/lite-api/transaction';
import { writeBatch } from '../../src/lite-api/write_batch';
import { apiDescribe } from '../integration/util/helpers';
import {
  DEFAULT_PROJECT_ID,
  DEFAULT_SETTINGS,
  USE_EMULATOR
} from '../integration/util/settings';

import {
  Post,
  postConverter,
  postConverterMerge,
  withTestCollection,
  withTestCollectionAndInitialData,
  withTestDb,
  withTestDbSettings,
  withTestDoc,
  withTestDocAndInitialData
} from './helpers';

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

  it('returns same default instance from named app', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-getFirestore'
    );
    const fs1 = getFirestore(app);
    const fs2 = getFirestore(app);
    const fs3 = getFirestore(app, '(default)');
    expect(fs1).to.be.equal(fs2).and.equal(fs3);
  });

  it('returns different instance from named app', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-getFirestore'
    );
    const fs1 = initializeFirestore(app, DEFAULT_SETTINGS, 'init1');
    const fs2 = initializeFirestore(app, DEFAULT_SETTINGS, 'init2');
    const fs3 = getFirestore(app);
    const fs4 = getFirestore(app, 'name1');
    const fs5 = getFirestore(app, 'name2');
    expect(fs1).to.not.be.equal(fs2);
    expect(fs1).to.not.be.equal(fs3);
    expect(fs1).to.not.be.equal(fs4);
    expect(fs1).to.not.be.equal(fs5);
    expect(fs2).to.not.be.equal(fs3);
    expect(fs2).to.not.be.equal(fs4);
    expect(fs2).to.not.be.equal(fs5);
    expect(fs3).to.not.be.equal(fs4);
    expect(fs3).to.not.be.equal(fs5);
    expect(fs4).to.not.be.equal(fs5);
  });

  it('returns same default instance from default app', () => {
    const app = initializeApp({
      apiKey: 'fake-api-key',
      projectId: 'test-project'
    });
    const fs1 = initializeFirestore(app, DEFAULT_SETTINGS);
    const fs2 = getFirestore();
    const fs3 = getFirestore(app);
    const fs4 = getFirestore('(default)');
    const fs5 = getFirestore(app, '(default)');
    expect(fs1).to.be.equal(fs2);
    expect(fs1).to.be.equal(fs3);
    expect(fs1).to.be.equal(fs4);
    expect(fs1).to.be.equal(fs5);
  });

  it('returns different instance from different named app', () => {
    initializeApp({ apiKey: 'fake-api-key', projectId: 'test-project' });
    const app1 = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-getFirestore-1'
    );
    const app2 = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-getFirestore-2'
    );
    const fs1 = getFirestore();
    const fs2 = getFirestore(app1);
    const fs3 = getFirestore(app2);
    expect(fs1).to.not.be.equal(fs2);
    expect(fs1).to.not.be.equal(fs3);
    expect(fs2).to.not.be.equal(fs3);
  });

  it('cannot call initializeFirestore() twice', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-initializeFirestore-twice'
    );
    initializeFirestore(app, {});

    expect(() => {
      initializeFirestore(app, {});
    }).to.throw('Firestore can only be initialized once per app.');
  });

  it('cannot use once terminated', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-terminated'
    );
    const firestore = initializeFirestore(app, {
      host: 'localhost',
      ssl: false
    });

    // We don't await the Promise. Any operation enqueued after should be
    // rejected.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    terminate(firestore);

    try {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      getDoc(doc(firestore, 'coll/doc'));
      expect.fail();
    } catch (e) {
      expect((e as Error)?.message).to.equal(
        'The client has already been terminated.'
      );
    }
  });

  it('can call terminate() multiple times', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-multi-terminate'
    );
    const firestore = initializeFirestore(app, {
      host: 'localhost',
      ssl: false
    });

    return terminate(firestore).then(() => terminate(firestore));
  });
});

describe('doc', () => {
  it('can be used relative to Firestore root', () => {
    return withTestDb(db => {
      const result = doc(db, 'coll/doc');
      expect(result).to.be.an.instanceOf(DocumentReference);
      expect(result.id).to.equal('doc');
      expect(result.path).to.equal('coll/doc');
    });
  });

  it('can be used relative to collection', () => {
    return withTestDb(db => {
      const result = doc(collection(db, 'coll'), 'doc');
      expect(result).to.be.an.instanceOf(DocumentReference);
      expect(result.id).to.equal('doc');
      expect(result.path).to.equal('coll/doc');
    });
  });

  it('can be used with multiple arguments', () => {
    return withTestDb(db => {
      const result = doc(db, 'coll1/doc1', 'coll2', 'doc2');
      expect(result).to.be.an.instanceOf(DocumentReference);
      expect(result.id).to.equal('doc2');
      expect(result.path).to.equal('coll1/doc1/coll2/doc2');
    });
  });

  it('strips leading and trailing slashes', () => {
    return withTestDb(db => {
      const result = doc(db, '/coll', 'doc/');
      expect(result).to.be.an.instanceOf(DocumentReference);
      expect(result.id).to.equal('doc');
      expect(result.path).to.equal('coll/doc');
    });
  });

  it('can be relative to doc', () => {
    return withTestDb(db => {
      const result = doc(doc(db, 'coll/doc'), 'subcoll/subdoc');
      expect(result).to.be.an.instanceOf(DocumentReference);
      expect(result.id).to.equal('subdoc');
      expect(result.path).to.equal('coll/doc/subcoll/subdoc');
    });
  });

  it('validates path', () => {
    return withTestDb(db => {
      expect(() => doc(db, 'coll')).to.throw(
        'Invalid document reference. Document references must have an even ' +
          'number of segments, but coll has 1.'
      );
      expect(() => doc(db, '')).to.throw(
        'Function doc() cannot be called with an empty path.'
      );
      expect(() => doc(collection(db, 'coll'), 'doc/coll')).to.throw(
        'Invalid document reference. Document references must have an even ' +
          'number of segments, but coll/doc/coll has 3.'
      );
      expect(() => doc(db, 'coll//doc')).to.throw(
        'Invalid segment (coll//doc). Paths must not contain // in them.'
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
  it('can be used relative to Firestore root', () => {
    return withTestDb(db => {
      const result = collection(db, 'coll/doc/subcoll');
      expect(result).to.be.an.instanceOf(CollectionReference);
      expect(result.id).to.equal('subcoll');
      expect(result.path).to.equal('coll/doc/subcoll');
    });
  });

  it('can be used relative to Firestore root with multiple arguments', () => {
    return withTestDb(db => {
      const result = collection(db, 'coll1/doc1', '/coll2', 'doc2/', '/coll3/');
      expect(result).to.be.an.instanceOf(CollectionReference);
      expect(result.id).to.equal('coll3');
      expect(result.path).to.equal('coll1/doc1/coll2/doc2/coll3');
    });
  });

  it('can be used relative to collection', () => {
    return withTestDb(db => {
      const result = collection(collection(db, 'coll'), 'doc/subcoll');
      expect(result).to.be.an.instanceOf(CollectionReference);
      expect(result.id).to.equal('subcoll');
      expect(result.path).to.equal('coll/doc/subcoll');
    });
  });

  it('can be used relative to doc', () => {
    return withTestDb(db => {
      const result = collection(doc(db, 'coll/doc'), 'subcoll');
      expect(result).to.be.an.instanceOf(CollectionReference);
      expect(result.id).to.equal('subcoll');
      expect(result.path).to.equal('coll/doc/subcoll');
    });
  });

  it('can be used relative to collection with multiple arguments', () => {
    return withTestDb(db => {
      const col = collection(db, 'coll1');
      const result = collection(
        col,
        '/doc1/coll2/doc2/',
        '/coll3',
        'doc3/',
        '/coll4/'
      );
      expect(result).to.be.an.instanceOf(CollectionReference);
      expect(result.id).to.equal('coll4');
      expect(result.path).to.equal('coll1/doc1/coll2/doc2/coll3/doc3/coll4');
    });
  });

  it('validates path', () => {
    return withTestDb(db => {
      expect(() => collection(db, 'coll/doc')).to.throw(
        'Invalid collection reference. Collection references must have an odd ' +
          'number of segments, but coll/doc has 2.'
      );
      expect(() => collection(doc(db, 'coll/doc'), '')).to.throw(
        'Function collection() cannot be called with an empty path'
      );
      expect(() => collection(doc(db, 'coll/doc'), 'coll/doc')).to.throw(
        'Invalid collection reference. Collection references must have an odd ' +
          'number of segments, but coll/doc/coll/doc has 4.'
      );
    });
  });
});

describe('parent', () => {
  it('returns CollectionReferences for DocumentReferences', () => {
    return withTestDb(db => {
      const coll = collection(db, 'coll/doc/coll');
      const result = coll.parent;
      expect(result).to.be.an.instanceOf(DocumentReference);
      expect(result!.path).to.equal('coll/doc');
    });
  });

  it('returns DocumentReferences for CollectionReferences', () => {
    return withTestDb(db => {
      const coll = doc(db, 'coll/doc');
      const result = coll.parent;
      expect(result).to.be.an.instanceOf(CollectionReference);
      expect(result.path).to.equal('coll');
    });
  });

  it('returns null for root collection', () => {
    return withTestDb(db => {
      const coll = collection(db, 'coll');
      const result = coll.parent;
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

/**
 * Shared test class that is used to verify the WriteBatch, Transaction and
 * DocumentReference-based mutation API.
 */
interface MutationTester {
  set<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>,
    data: WithFieldValue<AppModelType>
  ): Promise<void>;
  set<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>,
    data: PartialWithFieldValue<AppModelType>,
    options: SetOptions
  ): Promise<void>;
  update<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>,
    data: UpdateData<DbModelType>
  ): Promise<void>;
  update<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>,
    field: string | FieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): Promise<void>;
  delete<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>
  ): Promise<void>;
}

genericMutationTests({
  set: setDoc,
  update: updateDoc,
  delete: deleteDoc
});

describe('WriteBatch', () => {
  class WriteBatchTester implements MutationTester {
    delete<AppModelType, DbModelType extends DocumentData>(
      ref: DocumentReference<AppModelType, DbModelType>
    ): Promise<void> {
      const batch = writeBatch(ref.firestore);
      batch.delete(ref);
      return batch.commit();
    }

    set<AppModelType, DbModelType extends DocumentData>(
      ref: DocumentReference<AppModelType, DbModelType>,
      data: PartialWithFieldValue<AppModelType>,
      options?: SetOptions
    ): Promise<void> {
      const batch = writeBatch(ref.firestore);
      // TODO(mrschmidt): Find a way to remove the `any` cast here
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (batch.set as any).apply(batch, Array.from(arguments));
      return batch.commit();
    }

    update<AppModelType, DbModelType extends DocumentData>(
      ref: DocumentReference<AppModelType, DbModelType>,
      dataOrField: UpdateData<DbModelType> | string | FieldPath,
      value?: unknown,
      ...moreFieldsAndValues: unknown[]
    ): Promise<void> {
      const batch = writeBatch(ref.firestore);
      // TODO(mrschmidt): Find a way to remove the `any` cast here
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (batch.update as any).apply(batch, Array.from(arguments));
      return batch.commit();
    }
  }

  genericMutationTests(new WriteBatchTester());

  it('can add multiple operations', () => {
    return withTestCollection(async coll => {
      const batch = writeBatch(coll.firestore);
      batch.set(doc(coll), { doc: 1 });
      batch.set(doc(coll), { doc: 2 });
      await batch.commit();

      // TODO(firestorelite): Verify collection contents once getDocs is added
    });
  });

  it('cannot add write after commit', () => {
    return withTestDoc(async doc => {
      const batch = writeBatch(doc.firestore);
      batch.set(doc, { doc: 1 });
      const op = batch.commit();
      expect(() => batch.delete(doc)).to.throw(
        'A write batch can no longer be used after commit() has been called.'
      );
      await op;
      expect(() => batch.delete(doc)).to.throw(
        'A write batch can no longer be used after commit() has been called.'
      );
    });
  });
});

describe('Transaction', () => {
  class TransactionTester implements MutationTester {
    delete<AppModelType, DbModelType extends DocumentData>(
      ref: DocumentReference<AppModelType, DbModelType>
    ): Promise<void> {
      return runTransaction(ref.firestore, async transaction => {
        transaction.delete(ref);
      });
    }

    set<AppModelType, DbModelType extends DocumentData>(
      ref: DocumentReference<AppModelType, DbModelType>,
      data: PartialWithFieldValue<AppModelType>,
      options?: SetOptions
    ): Promise<void> {
      return runTransaction(ref.firestore, async transaction => {
        if (options) {
          transaction.set(ref, data, options);
        } else {
          transaction.set(ref, data as WithFieldValue<AppModelType>);
        }
      });
    }

    update<AppModelType, DbModelType extends DocumentData>(
      ref: DocumentReference<AppModelType, DbModelType>,
      dataOrField: UpdateData<DbModelType> | string | FieldPath,
      value?: unknown,
      ...moreFieldsAndValues: unknown[]
    ): Promise<void> {
      return runTransaction(ref.firestore, async transaction => {
        if (value) {
          transaction.update(
            ref,
            dataOrField as string | FieldPath,
            value,
            ...moreFieldsAndValues
          );
        } else {
          transaction.update(ref, dataOrField as UpdateData<DbModelType>);
        }
      });
    }
  }

  genericMutationTests(
    new TransactionTester(),
    /* testRunnerMayUseBackoff= */ true,
    /* validationUsesPromises= */ true
  );

  it('can read and then write', () => {
    return withTestDocAndInitialData({ counter: 1 }, async doc => {
      await runTransaction(doc.firestore, async transaction => {
        const snap = await transaction.get(doc);
        transaction.update(doc, 'counter', snap.get('counter') + 1);
      });
      const result = await getDoc(doc);
      expect(result.get('counter')).to.equal(2);
    });
  });

  it('can read non-existing doc then write', () => {
    return withTestDoc(async doc => {
      await runTransaction(doc.firestore, async transaction => {
        const snap = await transaction.get(doc);
        expect(snap.exists()).to.be.false;
        transaction.set(doc, { counter: 1 });
      });
      const result = await getDoc(doc);
      expect(result.get('counter')).to.equal(1);
    });
  });

  // This test is identical to the test above, except that a non-existent
  // document is replaced by a deleted document, to guard against regression of
  // https://github.com/firebase/firebase-js-sdk/issues/5871, where transactions
  // would incorrectly fail with FAILED_PRECONDITION when operations were
  // performed on a deleted document (rather than a non-existent document).
  it('can read deleted doc then write', () => {
    return withTestDocAndInitialData({ counter: 1 }, async doc => {
      await deleteDoc(doc);
      await runTransaction(doc.firestore, async transaction => {
        const snap = await transaction.get(doc);
        expect(snap.exists()).to.be.false;
        transaction.set(doc, { counter: 1 });
      });
      const result = await getDoc(doc);
      expect(result.get('counter')).to.equal(1);
    });
  });

  it('retries when document is modified', () => {
    return withTestDoc(async doc => {
      let retryCounter = 0;
      await runTransaction(doc.firestore, async transaction => {
        ++retryCounter;
        await transaction.get(doc);

        if (retryCounter === 1) {
          // Out of band modification that doesn't use the transaction
          await setDoc(doc, { counter: 'invalid' });
        }

        transaction.set(doc, { counter: 1 });
      });
      expect(retryCounter).to.equal(2);
      const result = await getDoc(doc);
      expect(result.get('counter')).to.equal(1);
    });
  });
});

function genericMutationTests(
  op: MutationTester,
  testRunnerMayUseBackoff = false,
  validationUsesPromises = false
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

    it('supports partials with merge', async () => {
      return withTestCollection(async coll => {
        const ref = doc(coll, 'post').withConverter(postConverterMerge);
        await setDoc(ref, new Post('walnut', 'author'));
        await setDoc(
          ref,
          { title: 'olive', id: increment(2) },
          { merge: true }
        );
        const postDoc = await getDoc(ref);
        expect(postDoc.get('title')).to.equal('olive');
        expect(postDoc.get('author')).to.equal('author');
      });
    });

    it('supports partials with mergeFields', async () => {
      return withTestCollection(async coll => {
        const ref = doc(coll, 'post').withConverter(postConverterMerge);
        await setDoc(ref, new Post('walnut', 'author'));
        await setDoc(ref, { title: 'olive' }, { mergeFields: ['title'] });
        const postDoc = await getDoc(ref);
        expect(postDoc.get('title')).to.equal('olive');
        expect(postDoc.get('author')).to.equal('author');
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

    // The Transaction tests use backoff for updates that fail with failed
    // preconditions. This leads to test timeouts.
    // eslint-disable-next-line no-restricted-properties
    (testRunnerMayUseBackoff ? it.skip : it)(
      'enforces that document exists',
      () => {
        return withTestDoc(async docRef => {
          await expect(updateDoc(docRef, { foo: 2, baz: 2 })).to.eventually.be
            .rejected;
        });
      }
    );

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

  it('returns Bytes', () => {
    return withTestDocAndInitialData(
      { bytes: Bytes.fromBase64String('aa==') },
      async docRef => {
        const docSnap = await getDoc(docRef);
        const bytes = docSnap.get('bytes');
        expect(bytes.constructor.name).to.equal('Bytes');
      }
    );
  });
});

describe('deleteDoc()', () => {
  it('can delete a non-existing document', () => {
    return withTestDoc(docRef => deleteDoc(docRef));
  });
});

describe('FieldValue', () => {
  it('support equality checking with isEqual()', () => {
    expect(deleteField().isEqual(deleteField())).to.be.true;
    expect(serverTimestamp().isEqual(serverTimestamp())).to.be.true;
    expect(deleteField().isEqual(serverTimestamp())).to.be.false;
    expect(arrayUnion().isEqual(arrayUnion())).to.be.true;
    expect(arrayUnion('a').isEqual(arrayUnion('a'))).to.be.true;
    expect(arrayUnion('a').isEqual(arrayUnion('b'))).to.be.false;
    expect(arrayUnion('a', 'b').isEqual(arrayUnion('b', 'a'))).to.be.false;
    expect(arrayRemove().isEqual(arrayRemove())).to.be.true;
    expect(arrayRemove('a').isEqual(arrayRemove('a'))).to.be.true;
    expect(arrayRemove('a').isEqual(arrayRemove('b'))).to.be.false;
    expect(arrayRemove('a', 'b').isEqual(arrayRemove('b', 'a'))).to.be.false;
    expect(increment(1).isEqual(increment(1))).to.be.true;
    expect(increment(1).isEqual(increment(2))).to.be.false;
  });

  it('support instanceof checks', () => {
    expect(deleteField()).to.be.an.instanceOf(FieldValue);
    expect(serverTimestamp()).to.be.an.instanceOf(FieldValue);
    expect(increment(1)).to.be.an.instanceOf(FieldValue);
    expect(arrayUnion('a')).to.be.an.instanceOf(FieldValue);
    expect(arrayRemove('a')).to.be.an.instanceOf(FieldValue);
  });

  it('can apply arrayUnion', () => {
    return withTestDocAndInitialData({ 'val': ['foo'] }, async docRef => {
      await updateDoc(docRef, 'val', arrayUnion('bar'));
      const snap = await getDoc(docRef);
      expect(snap.data()).to.deep.equal({ 'val': ['foo', 'bar'] });
    });
  });

  it('can apply arrayRemove', () => {
    return withTestDocAndInitialData(
      { 'val': ['foo', 'bar'] },
      async docRef => {
        await updateDoc(docRef, 'val', arrayRemove('bar'));
        const snap = await getDoc(docRef);
        expect(snap.data()).to.deep.equal({ 'val': ['foo'] });
      }
    );
  });

  it('can apply serverTimestamp', () => {
    return withTestDocAndInitialData({ 'val': null }, async docRef => {
      await updateDoc(docRef, 'val', serverTimestamp());
      const snap = await getDoc(docRef);
      expect(snap.get('val')).to.be.an.instanceOf(Timestamp);
    });
  });

  it('can delete field', () => {
    return withTestDocAndInitialData({ 'val': 'foo' }, async docRef => {
      await updateDoc(docRef, 'val', deleteField());
      const snap = await getDoc(docRef);
      expect(snap.data()).to.deep.equal({});
    });
  });
});

describe('Query', () => {
  function verifyResults(
    actual: QuerySnapshot<DocumentData>,
    ...expected: DocumentData[]
  ): void {
    expect(actual.empty).to.equal(expected.length === 0);
    expect(actual.size).to.equal(expected.length);

    for (let i = 0; i < expected.length; ++i) {
      expect(actual.docs[i].data()).to.deep.equal(expected[i]);
    }
  }

  it('supports default query', () => {
    return withTestCollectionAndInitialData([{ foo: 1 }], async collRef => {
      const result = await getDocs(collRef);
      verifyResults(result, { foo: 1 });
    });
  });

  it('supports empty results', () => {
    return withTestCollectionAndInitialData([], async collRef => {
      const result = await getDocs(collRef);
      verifyResults(result);
    });
  });

  it('supports filtered query', () => {
    return withTestCollectionAndInitialData(
      [{ foo: 1 }, { foo: 2 }],
      async collRef => {
        const query1 = query(collRef, where('foo', '==', 1));
        const result = await getDocs(query1);
        verifyResults(result, { foo: 1 });
      }
    );
  });

  it('supports filtered query (with FieldPath)', () => {
    return withTestCollectionAndInitialData(
      [{ foo: 1 }, { foo: 2 }],
      async collRef => {
        const query1 = query(collRef, where(new FieldPath('foo'), '==', 1));
        const result = await getDocs(query1);
        verifyResults(result, { foo: 1 });
      }
    );
  });

  it('supports ordered query (with default order)', () => {
    return withTestCollectionAndInitialData(
      [{ foo: 1 }, { foo: 2 }],
      async collRef => {
        const query1 = query(collRef, orderBy('foo'));
        const result = await getDocs(query1);
        verifyResults(result, { foo: 1 }, { foo: 2 });
      }
    );
  });

  it('supports ordered query (with asc)', () => {
    return withTestCollectionAndInitialData(
      [{ foo: 1 }, { foo: 2 }],
      async collRef => {
        const query1 = query(collRef, orderBy('foo', 'asc'));
        const result = await getDocs(query1);
        verifyResults(result, { foo: 1 }, { foo: 2 });
      }
    );
  });

  it('supports ordered query (with desc)', () => {
    return withTestCollectionAndInitialData(
      [{ foo: 1 }, { foo: 2 }],
      async collRef => {
        const query1 = query(collRef, orderBy('foo', 'desc'));
        const result = await getDocs(query1);
        verifyResults(result, { foo: 2 }, { foo: 1 });
      }
    );
  });

  it('supports limit query', () => {
    return withTestCollectionAndInitialData(
      [{ foo: 1 }, { foo: 2 }],
      async collRef => {
        const query1 = query(collRef, orderBy('foo'), limit(1));
        const result = await getDocs(query1);
        verifyResults(result, { foo: 1 });
      }
    );
  });

  it('supports limitToLast query', () => {
    return withTestCollectionAndInitialData(
      [{ foo: 1 }, { foo: 2 }, { foo: 3 }],
      async collRef => {
        const query1 = query(collRef, orderBy('foo'), limitToLast(2));
        const result = await getDocs(query1);
        verifyResults(result, { foo: 2 }, { foo: 3 });
      }
    );
  });

  it('supports startAt', () => {
    return withTestCollectionAndInitialData(
      [{ foo: 1 }, { foo: 2 }],
      async collRef => {
        const query1 = query(collRef, orderBy('foo'), startAt(2));
        const result = await getDocs(query1);
        verifyResults(result, { foo: 2 });
      }
    );
  });

  it('supports startAfter', () => {
    return withTestCollectionAndInitialData(
      [{ foo: 1 }, { foo: 2 }],
      async collRef => {
        const query1 = query(collRef, orderBy('foo'), startAfter(1));
        const result = await getDocs(query1);
        verifyResults(result, { foo: 2 });
      }
    );
  });

  it('supports endAt', () => {
    return withTestCollectionAndInitialData(
      [{ foo: 1 }, { foo: 2 }],
      async collRef => {
        const query1 = query(collRef, orderBy('foo'), endAt(1));
        const result = await getDocs(query1);
        verifyResults(result, { foo: 1 });
      }
    );
  });

  it('supports endBefore', () => {
    return withTestCollectionAndInitialData(
      [{ foo: 1 }, { foo: 2 }],
      async collRef => {
        const query1 = query(collRef, orderBy('foo'), endBefore(2));
        const result = await getDocs(query1);
        verifyResults(result, { foo: 1 });
      }
    );
  });

  it('supports pagination', () => {
    return withTestCollectionAndInitialData(
      [{ foo: 1 }, { foo: 2 }],
      async collRef => {
        let query1 = query(collRef, orderBy('foo'), limit(1));
        let result = await getDocs(query1);
        verifyResults(result, { foo: 1 });

        // Pass the document snapshot from the previous result
        query1 = query(query1, startAfter(result.docs[0]));
        result = await getDocs(query1);
        verifyResults(result, { foo: 2 });
      }
    );
  });

  it('supports collection groups', () => {
    return withTestCollection(async collRef => {
      const collectionGroupId = `${collRef.id}group`;

      const fooDoc = doc(
        collRef.firestore,
        `${collRef.id}/foo/${collectionGroupId}/doc1`
      );
      const barDoc = doc(
        collRef.firestore,
        `${collRef.id}/bar/baz/boo/${collectionGroupId}/doc2`
      );
      await setDoc(fooDoc, { foo: 1 });
      await setDoc(barDoc, { bar: 1 });

      const query1 = collectionGroup(collRef.firestore, collectionGroupId);
      const result = await getDocs(query1);

      verifyResults(result, { bar: 1 }, { foo: 1 });
    });
  });

  it('validates collection groups', () => {
    return withTestDb(firestore => {
      expect(() => collectionGroup(firestore, '')).to.throw(
        'Function collectionGroup() cannot be called with an empty collection id.'
      );
      expect(() => collectionGroup(firestore, '/')).to.throw(
        "Invalid collection ID '/' passed to function collectionGroup(). Collection IDs must not contain '/'."
      );
    });
  });

  it('supports query over collection path with special characters', () => {
    return withTestCollection(async collRef => {
      const docWithSpecials = doc(collRef, 'so!@#$%^&*()_+special');

      const collectionWithSpecials = collection(
        docWithSpecials,
        'so!@#$%^&*()_+special'
      );
      await addDoc(collectionWithSpecials, { foo: 1 });
      await addDoc(collectionWithSpecials, { foo: 2 });

      const result = await getDocs(
        query(collectionWithSpecials, orderBy('foo', 'asc'))
      );

      verifyResults(result, { foo: 1 }, { foo: 2 });
    });
  });
});

describe('equality', () => {
  it('for collection references', () => {
    return withTestDb(firestore => {
      const coll1a = collection(firestore, 'a');
      const coll1b = doc(firestore, 'a/b').parent;
      const coll2 = collection(firestore, 'c');

      expect(refEqual(coll1a, coll1b)).to.be.true;
      expect(refEqual(coll1a, coll2)).to.be.false;

      const coll1c = collection(firestore, 'a').withConverter({
        toFirestore: (data: DocumentData) => data as DocumentData,
        fromFirestore: snap => snap.data()
      });
      expect(refEqual(coll1a, coll1c)).to.be.false;

      expect(refEqual(coll1a, doc(firestore, 'a/b'))).to.be.false;
    });
  });

  it('for document references', () => {
    return withTestDb(firestore => {
      const doc1a = doc(firestore, 'a/b');
      const doc1b = doc(collection(firestore, 'a'), 'b');
      const doc2 = doc(firestore, 'a/c');

      expect(refEqual(doc1a, doc1b)).to.be.true;
      expect(refEqual(doc1a, doc2)).to.be.false;

      const doc1c = collection(firestore, 'a').withConverter({
        toFirestore: (data: DocumentData) => data as DocumentData,
        fromFirestore: snap => snap.data()
      });
      expect(refEqual(doc1a, doc1c)).to.be.false;

      expect(refEqual(doc1a, collection(firestore, 'a'))).to.be.false;
    });
  });

  it('for queries', () => {
    return withTestCollectionAndInitialData(
      [{ foo: 1 }, { foo: 2 }],
      async collRef => {
        const query1a = query(collRef, orderBy('foo'));
        const query1b = query(collRef, orderBy('foo', 'asc'));
        const query2 = query(collRef, orderBy('foo', 'desc'));
        const query3 = query(collection(collRef, 'a/b'), orderBy('foo'));

        expect(queryEqual(query1a, query1b)).to.be.true;
        expect(queryEqual(query1a, query2)).to.be.false;
        expect(queryEqual(query1a, query3)).to.be.false;
      }
    );
  });

  it('for query snapshots', () => {
    return withTestCollectionAndInitialData(
      [{ foo: 1 }, { foo: 2 }],
      async collRef => {
        const query1a = query(collRef, limit(10));
        const query1b = query(collRef, limit(10));
        const query2 = query(collRef, limit(100));

        const snap1a = await getDocs(query1a);
        const snap1b = await getDocs(query1b);
        const snap2 = await getDocs(query2);

        expect(snapshotEqual(snap1a, snap1b)).to.be.true;
        expect(snapshotEqual(snap1a, snap2)).to.be.false;

        // Re-run the query with an additional result.
        await addDoc(collRef, { foo: 3 });
        const snap1c = await getDocs(query1a);
        expect(snapshotEqual(snap1a, snap1c)).to.be.false;
      }
    );
  });

  it('for document snapshots', () => {
    return withTestCollectionAndInitialData(
      [{ foo: 1 }, { foo: 2 }],
      async collRef => {
        const snap1a = await getDocs(collRef);
        const snap1b = await getDocs(collRef);
        expect(snapshotEqual(snap1a.docs[0], snap1b.docs[0])).to.be.true;
        expect(snapshotEqual(snap1a.docs[0], snap1a.docs[0])).to.be.true;

        // Modify the document and obtain the snapshot again.
        await updateDoc(snap1a.docs[0].ref, { foo: 3 });
        const snap3 = await getDocs(collRef);
        expect(snapshotEqual(snap1a.docs[0], snap3.docs[0])).to.be.false;
      }
    );
  });
});

describe('withConverter() support', () => {
  it('for DocumentReference.withConverter()', () => {
    return withTestDoc(async docRef => {
      docRef = docRef.withConverter(postConverter);
      await setDoc(docRef, new Post('post', 'author'));
      const postData = await getDoc(docRef);
      const post = postData.data();
      expect(post).to.not.equal(undefined);
      expect(post!.byline()).to.equal('post, by author');
    });
  });

  it('for DocumentReference.withConverter(null) applies default converter', () => {
    return withTestCollection(async coll => {
      coll = coll.withConverter(postConverter).withConverter(null);
      expect(() =>
        setDoc(doc(coll, 'post1'), new Post('post', 'author'))
      ).to.throw();
    });
  });

  it('for CollectionReference.withConverter()', () => {
    return withTestCollection(async coll => {
      coll = coll.withConverter(postConverter);
      const docRef = await addDoc(coll, new Post('post', 'author'));
      const postData = await getDoc(docRef);
      const post = postData.data();
      expect(post).to.not.equal(undefined);
      expect(post!.byline()).to.equal('post, by author');
    });
  });

  it('for CollectionReference.withConverter(null) applies default converter', () => {
    return withTestDoc(async doc => {
      doc = doc.withConverter(postConverter).withConverter(null);
      expect(() => setDoc(doc, new Post('post', 'author'))).to.throw();
    });
  });

  it('for Query.withConverter()', () => {
    return withTestCollectionAndInitialData(
      [{ title: 'post', author: 'author' }],
      async collRef => {
        let query1 = query(collRef, where('title', '==', 'post'));
        query1 = query1.withConverter(postConverter);
        const result = await getDocs(query1);
        expect(result.docs[0].data()).to.be.an.instanceOf(Post);
        expect(result.docs[0].data()!.byline()).to.equal('post, by author');
      }
    );
  });

  it('for Query.withConverter(null) applies default converter', () => {
    return withTestCollectionAndInitialData(
      [{ title: 'post', author: 'author' }],
      async collRef => {
        let query1 = query(collRef, where('title', '==', 'post'));
        query1 = query1.withConverter(postConverter).withConverter(null);
        const result = await getDocs(query1);
        expect(result.docs[0]).to.not.be.an.instanceOf(Post);
      }
    );
  });

  it('keeps the converter when calling parent() with a DocumentReference', () => {
    return withTestDb(async db => {
      const coll = doc(db, 'root/doc').withConverter(postConverter);
      const typedColl = coll.parent!;
      expect(
        refEqual(typedColl, collection(db, 'root').withConverter(postConverter))
      ).to.be.true;
    });
  });

  it('drops the converter when calling parent() with a CollectionReference', () => {
    return withTestDb(async db => {
      const coll = collection(db, 'root/doc/parent').withConverter(
        postConverter
      );
      const untypedDoc = coll.parent!;
      expect(refEqual(untypedDoc, doc(db, 'root/doc'))).to.be.true;
    });
  });

  it('checks converter when comparing with isEqual()', () => {
    return withTestDb(async db => {
      const postConverter2 = { ...postConverter };

      const postsCollection = collection(db, 'users/user1/posts').withConverter(
        postConverter
      );
      const postsCollection2 = collection(
        db,
        'users/user1/posts'
      ).withConverter(postConverter2);
      expect(refEqual(postsCollection, postsCollection2)).to.be.false;

      const docRef = doc(db, 'some/doc').withConverter(postConverter);
      const docRef2 = doc(db, 'some/doc').withConverter(postConverter2);
      expect(refEqual(docRef, docRef2)).to.be.false;
    });
  });

  it('requires the correct converter for Partial usage', async () => {
    return withTestDb(async db => {
      const coll = collection(db, 'posts');
      const ref = doc(coll, 'post').withConverter(postConverter);
      const batch = writeBatch(db);
      expect(() =>
        batch.set(ref, { title: 'olive' }, { merge: true })
      ).to.throw(
        'Function WriteBatch.set() called with invalid data ' +
          '(via `toFirestore()`). Unsupported field value: undefined ' +
          '(found in field author in document posts/post)'
      );
    });
  });

  it('supports primitive types with valid converter', () => {
    type Primitive = number;
    const primitiveConverter = {
      toFirestore(value: Primitive): DocumentData {
        return { value };
      },
      fromFirestore(snapshot: QueryDocumentSnapshot): Primitive {
        const data = snapshot.data();
        return data.value;
      }
    };

    type ArrayValue = number[];
    const arrayConverter = {
      toFirestore(value: ArrayValue): DocumentData {
        return { values: value };
      },
      fromFirestore(snapshot: QueryDocumentSnapshot): ArrayValue {
        const data = snapshot.data();
        return data.values;
      }
    };

    return withTestCollection(async coll => {
      const ref = doc(coll, 'number').withConverter(primitiveConverter);
      await setDoc(ref, 3);
      const result = await getDoc(ref);
      expect(result.data()).to.equal(3);

      const ref2 = doc(coll, 'array').withConverter(arrayConverter);
      await setDoc(ref2, [1, 2, 3]);
      const result2 = await getDoc(ref2);
      expect(result2.data()).to.deep.equal([1, 2, 3]);
    });
  });

  describe('types test', () => {
    class TestObject {
      constructor(
        readonly outerString: string,
        readonly outerArr: string[],
        readonly nested: {
          innerNested: {
            innerNestedNum: number;
          };
          innerArr: number[];
          timestamp: Timestamp;
        }
      ) {}
    }

    const testConverter: FirestoreDataConverter<TestObject, TestObject> = {
      toFirestore(testObj: WithFieldValue<TestObject>) {
        return { ...testObj };
      },
      fromFirestore(snapshot: QueryDocumentSnapshot): TestObject {
        const data = snapshot.data();
        return new TestObject(data.outerString, data.outerArr, data.nested);
      }
    };

    const initialData = {
      outerString: 'foo',
      outerArr: [],
      nested: {
        innerNested: {
          innerNestedNum: 2
        },
        innerArr: arrayUnion(2),
        timestamp: serverTimestamp()
      }
    };

    describe('nested partial support', () => {
      const testConverterMerge = {
        toFirestore(
          testObj: PartialWithFieldValue<TestObject>,
          options?: SetOptions
        ) {
          return { ...testObj };
        },
        fromFirestore(snapshot: QueryDocumentSnapshot): TestObject {
          const data = snapshot.data();
          return new TestObject(data.outerString, data.outerArr, data.nested);
        }
      };

      it('supports FieldValues', async () => {
        return withTestDoc(async doc => {
          const ref = doc.withConverter(testConverterMerge);

          // Allow Field Values in nested partials.
          await setDoc(
            ref,
            {
              outerString: deleteField(),
              nested: {
                innerNested: {
                  innerNestedNum: increment(1)
                },
                innerArr: arrayUnion(2),
                timestamp: serverTimestamp()
              }
            },
            { merge: true }
          );

          // Allow setting FieldValue on entire object field.
          await setDoc(
            ref,
            {
              nested: deleteField()
            },
            { merge: true }
          );
        });
      });

      it('validates types in outer and inner fields', async () => {
        return withTestDoc(async doc => {
          const ref = doc.withConverter(testConverterMerge);

          // Check top-level fields.
          await setDoc(
            ref,
            {
              // @ts-expect-error
              outerString: 3,
              // @ts-expect-error
              outerArr: null
            },
            { merge: true }
          );

          // Check nested fields.
          await setDoc(
            ref,
            {
              nested: {
                innerNested: {
                  // @ts-expect-error
                  innerNestedNum: 'string'
                },
                // @ts-expect-error
                innerArr: null
              }
            },
            { merge: true }
          );
          await setDoc(
            ref,
            {
              // @ts-expect-error
              nested: 3
            },
            { merge: true }
          );
        });
      });

      it('checks for nonexistent properties', async () => {
        return withTestDoc(async doc => {
          const ref = doc.withConverter(testConverterMerge);
          // Top-level property.
          await setDoc(
            ref,
            {
              // @ts-expect-error
              nonexistent: 'foo'
            },
            { merge: true }
          );

          // Nested property
          await setDoc(
            ref,
            {
              nested: {
                // @ts-expect-error
                nonexistent: 'foo'
              }
            },
            { merge: true }
          );
        });
      });

      it('allows omitting fields', async () => {
        return withTestDoc(async doc => {
          const ref = doc.withConverter(testConverterMerge);

          // Omit outer fields
          await setDoc(
            ref,
            {
              outerString: deleteField(),
              nested: {
                innerNested: {
                  innerNestedNum: increment(1)
                },
                innerArr: arrayUnion(2),
                timestamp: serverTimestamp()
              }
            },
            { merge: true }
          );

          // Omit inner fields
          await setDoc(
            ref,
            {
              outerString: deleteField(),
              outerArr: [],
              nested: {
                innerNested: {
                  innerNestedNum: increment(1)
                },
                timestamp: serverTimestamp()
              }
            },
            { merge: true }
          );
        });
      });
    });

    describe('WithFieldValue', () => {
      it('supports FieldValues', async () => {
        return withTestDoc(async doc => {
          const ref = doc.withConverter(testConverter);

          // Allow Field Values and nested partials.
          await setDoc(ref, {
            outerString: 'foo',
            outerArr: [],
            nested: {
              innerNested: {
                innerNestedNum: increment(1)
              },
              innerArr: arrayUnion(2),
              timestamp: serverTimestamp()
            }
          });
        });
      });

      it('requires all outer fields to be present', async () => {
        return withTestDoc(async doc => {
          const ref = doc.withConverter(testConverter);

          // Allow Field Values and nested partials.
          // @ts-expect-error
          await setDoc(ref, {
            outerArr: [],
            nested: {
              innerNested: {
                innerNestedNum: increment(1)
              },
              innerArr: arrayUnion(2),
              timestamp: serverTimestamp()
            }
          });
        });
      });

      it('requires all nested fields to be present', async () => {
        return withTestDoc(async doc => {
          const ref = doc.withConverter(testConverter);

          await setDoc(ref, {
            outerString: 'foo',
            outerArr: [],
            // @ts-expect-error
            nested: {
              innerNested: {
                innerNestedNum: increment(1)
              },
              timestamp: serverTimestamp()
            }
          });
        });
      });

      it('validates inner and outer fields', async () => {
        return withTestDoc(async doc => {
          const ref = doc.withConverter(testConverter);

          await setDoc(ref, {
            outerString: 'foo',
            // @ts-expect-error
            outerArr: 2,
            nested: {
              innerNested: {
                // @ts-expect-error
                innerNestedNum: 'string'
              },
              innerArr: arrayUnion(2),
              timestamp: serverTimestamp()
            }
          });
        });
      });

      it('checks for nonexistent properties', async () => {
        return withTestDoc(async doc => {
          const ref = doc.withConverter(testConverter);

          // Top-level nonexistent fields should error
          await setDoc(ref, {
            outerString: 'foo',
            // @ts-expect-error
            outerNum: 3,
            outerArr: [],
            nested: {
              innerNested: {
                innerNestedNum: 2
              },
              innerArr: arrayUnion(2),
              timestamp: serverTimestamp()
            }
          });

          // Nested nonexistent fields should error
          await setDoc(ref, {
            outerString: 'foo',
            outerNum: 3,
            outerArr: [],
            nested: {
              innerNested: {
                // @ts-expect-error
                nonexistent: 'string',
                innerNestedNum: 2
              },
              innerArr: arrayUnion(2),
              timestamp: serverTimestamp()
            }
          });
        });
      });

      it('allows certain types but not others', () => {
        const withTryCatch = async (fn: () => Promise<void>): Promise<void> => {
          try {
            await fn();
          } catch {}
        };

        // These tests exist to establish which object types are allowed to be
        // passed in by default when `T = DocumentData`. Some objects extend
        // the Javascript `{}`, which is why they're allowed whereas others
        // throw an error.
        return withTestDoc(async doc => {
          // @ts-expect-error
          await withTryCatch(() => setDoc(doc, 1));
          // @ts-expect-error
          await withTryCatch(() => setDoc(doc, 'foo'));
          // @ts-expect-error
          await withTryCatch(() => setDoc(doc, false));
          await withTryCatch(() => setDoc(doc, undefined));
          await withTryCatch(() => setDoc(doc, null));
          await withTryCatch(() => setDoc(doc, [0]));
          await withTryCatch(() => setDoc(doc, new Set<string>()));
          await withTryCatch(() => setDoc(doc, new Map<string, number>()));
        });
      });

      describe('used as a type', () => {
        class ObjectWrapper<T> {
          withFieldValueT(value: WithFieldValue<T>): WithFieldValue<T> {
            return value;
          }

          withPartialFieldValueT(
            value: PartialWithFieldValue<T>
          ): PartialWithFieldValue<T> {
            return value;
          }

          // Wrapper to avoid having Firebase types in non-Firebase code.
          withT(value: T): void {
            this.withFieldValueT(value);
          }

          // Wrapper to avoid having Firebase types in non-Firebase code.
          withPartialT(value: Partial<T>): void {
            this.withPartialFieldValueT(value);
          }
        }

        it('supports passing in the object as `T`', () => {
          interface Foo {
            id: string;
            foo: number;
          }
          const foo = new ObjectWrapper<Foo>();
          foo.withFieldValueT({ id: '', foo: increment(1) });
          foo.withPartialFieldValueT({ foo: increment(1) });
          foo.withT({ id: '', foo: 1 });
          foo.withPartialT({ foo: 1 });
        });

        it('does not allow primitive types to use FieldValue', () => {
          type Bar = number;
          const bar = new ObjectWrapper<Bar>();
          // @ts-expect-error
          bar.withFieldValueT(increment(1));
          // @ts-expect-error
          bar.withPartialFieldValueT(increment(1));
        });
      });
    });

    describe('UpdateData', () => {
      it('supports FieldValues', () => {
        return withTestDocAndInitialData(initialData, async docRef => {
          await updateDoc(docRef.withConverter(testConverter), {
            outerString: deleteField(),
            nested: {
              innerNested: {
                innerNestedNum: increment(2)
              },
              innerArr: arrayUnion(3)
            }
          });
        });
      });

      it('validates inner and outer fields', async () => {
        return withTestDocAndInitialData(initialData, async docRef => {
          await updateDoc(docRef.withConverter(testConverter), {
            // @ts-expect-error
            outerString: 3,
            nested: {
              innerNested: {
                // @ts-expect-error
                innerNestedNum: 'string'
              },
              // @ts-expect-error
              innerArr: 2
            }
          });
        });
      });

      it('supports string-separated fields', () => {
        return withTestDocAndInitialData(initialData, async docRef => {
          const testDocRef = docRef.withConverter(testConverter);
          await updateDoc(testDocRef, {
            // @ts-expect-error
            outerString: 3,
            // @ts-expect-error
            'nested.innerNested.innerNestedNum': 'string',
            // @ts-expect-error
            'nested.innerArr': 3,
            'nested.timestamp': serverTimestamp()
          });

          // String comprehension works in nested fields.
          await updateDoc(testDocRef, {
            nested: {
              innerNested: {
                // @ts-expect-error
                'innerNestedNum': 'string'
              },
              // @ts-expect-error
              'innerArr': 3
            }
          });
        });
      });

      it('supports optional fields', () => {
        interface TestObjectOptional {
          optionalStr?: string;
          nested?: {
            requiredStr: string;
          };
        }

        const testConverterOptional = {
          toFirestore(testObj: WithFieldValue<TestObjectOptional>) {
            return { ...testObj };
          },
          fromFirestore(snapshot: QueryDocumentSnapshot): TestObjectOptional {
            const data = snapshot.data();
            return {
              optionalStr: data.optionalStr,
              nested: data.nested
            };
          }
        };

        return withTestDocAndInitialData(initialData, async docRef => {
          const testDocRef: DocumentReference<TestObjectOptional> =
            docRef.withConverter(testConverterOptional);

          await updateDoc(testDocRef, {
            optionalStr: 'foo'
          });
          await updateDoc(testDocRef, {
            'optionalStr': 'foo'
          });

          await updateDoc(testDocRef, {
            nested: {
              requiredStr: 'foo'
            }
          });
          await updateDoc(testDocRef, {
            'nested.requiredStr': 'foo'
          });
        });
      });

      it('supports null fields', () => {
        interface TestObjectOptional {
          optionalStr?: string;
          nested?: {
            strOrNull: string | null;
          };
        }

        const testConverterOptional = {
          toFirestore(testObj: WithFieldValue<TestObjectOptional>) {
            return { ...testObj };
          },
          fromFirestore(snapshot: QueryDocumentSnapshot): TestObjectOptional {
            const data = snapshot.data();
            return {
              optionalStr: data.optionalStr,
              nested: data.nested
            };
          }
        };

        return withTestDocAndInitialData(initialData, async docRef => {
          const testDocRef: DocumentReference<TestObjectOptional> =
            docRef.withConverter(testConverterOptional);

          await updateDoc(testDocRef, {
            nested: {
              strOrNull: null
            }
          });
          await updateDoc(testDocRef, {
            'nested.strOrNull': null
          });
        });
      });

      it('supports union fields', () => {
        interface TestObjectUnion {
          optionalStr?: string;
          nested?:
            | {
                requiredStr: string;
              }
            | { requiredNumber: number };
        }

        const testConverterUnion: FirestoreDataConverter<
          TestObjectUnion,
          TestObjectUnion
        > = {
          toFirestore(testObj: WithFieldValue<TestObjectUnion>) {
            return { ...testObj };
          },
          fromFirestore(snapshot: QueryDocumentSnapshot): TestObjectUnion {
            const data = snapshot.data();
            return {
              optionalStr: data.optionalStr,
              nested: data.nested
            };
          }
        };

        return withTestDocAndInitialData(initialData, async docRef => {
          const testDocRef = docRef.withConverter(testConverterUnion);

          await updateDoc(testDocRef, {
            nested: {
              requiredStr: 'foo'
            }
          });

          await updateDoc(testDocRef, {
            'nested.requiredStr': 'foo'
          });
          await updateDoc(testDocRef, {
            // @ts-expect-error
            'nested.requiredStr': 1
          });

          await updateDoc(testDocRef, {
            'nested.requiredNumber': 1
          });

          await updateDoc(testDocRef, {
            // @ts-expect-error
            'nested.requiredNumber': 'foo'
          });
          await updateDoc(testDocRef, {
            // @ts-expect-error
            'nested.requiredNumber': null
          });
        });
      });

      it('checks for nonexistent fields', () => {
        return withTestDocAndInitialData(initialData, async docRef => {
          const testDocRef = docRef.withConverter(testConverter);

          // Top-level fields.
          await updateDoc(testDocRef, {
            // @ts-expect-error
            nonexistent: 'foo'
          });

          // Nested Fields.
          await updateDoc(testDocRef, {
            nested: {
              // @ts-expect-error
              nonexistent: 'foo'
            }
          });

          // String fields.
          await updateDoc(testDocRef, {
            // @ts-expect-error
            'nonexistent': 'foo'
          });
          await updateDoc(testDocRef, {
            // @ts-expect-error
            'nested.nonexistent': 'foo'
          });
        });
      });
    });

    describe('methods', () => {
      it('addDoc()', () => {
        return withTestDb(async db => {
          const ref = collection(db, 'testobj').withConverter(testConverter);

          // Requires all fields to be present
          // @ts-expect-error
          await addDoc(ref, {
            outerArr: [],
            nested: {
              innerNested: {
                innerNestedNum: 2
              },
              innerArr: [],
              timestamp: serverTimestamp()
            }
          });
        });
      });

      it('WriteBatch.set()', () => {
        return withTestDb(async db => {
          const ref = doc(collection(db, 'testobj')).withConverter(
            testConverter
          );
          const batch = writeBatch(db);

          // Requires full object if {merge: true} is not set.
          // @ts-expect-error
          batch.set(ref, {
            outerArr: [],
            nested: {
              innerNested: {
                innerNestedNum: increment(1)
              },
              innerArr: arrayUnion(2),
              timestamp: serverTimestamp()
            }
          });

          batch.set(
            ref,
            {
              outerArr: [],
              nested: {
                innerNested: {
                  innerNestedNum: increment(1)
                },
                innerArr: arrayUnion(2),
                timestamp: serverTimestamp()
              }
            },
            { merge: true }
          );
        });
      });

      it('WriteBatch.update()', () => {
        return withTestDb(async db => {
          const ref = doc(collection(db, 'testobj')).withConverter(
            testConverter
          );
          const batch = writeBatch(db);

          batch.update(ref, {
            outerArr: [],
            nested: {
              'innerNested.innerNestedNum': increment(1),
              'innerArr': arrayUnion(2),
              timestamp: serverTimestamp()
            }
          });
        });
      });

      it('Transaction.set()', () => {
        return withTestDb(async db => {
          const ref = doc(collection(db, 'testobj')).withConverter(
            testConverter
          );

          return runTransaction(db, async tx => {
            // Requires full object if {merge: true} is not set.
            // @ts-expect-error
            tx.set(ref, {
              outerArr: [],
              nested: {
                innerNested: {
                  innerNestedNum: increment(1)
                },
                innerArr: arrayUnion(2),
                timestamp: serverTimestamp()
              }
            });

            tx.set(
              ref,
              {
                outerArr: [],
                nested: {
                  innerNested: {
                    innerNestedNum: increment(1)
                  },
                  innerArr: arrayUnion(2),
                  timestamp: serverTimestamp()
                }
              },
              { merge: true }
            );
          });
        });
      });

      it('Transaction.update()', () => {
        return withTestDb(async db => {
          const ref = doc(collection(db, 'testobj')).withConverter(
            testConverter
          );
          await setDoc(ref, {
            outerString: 'foo',
            outerArr: [],
            nested: {
              innerNested: {
                innerNestedNum: 2
              },
              innerArr: arrayUnion(2),
              timestamp: serverTimestamp()
            }
          });

          return runTransaction(db, async tx => {
            tx.update(ref, {
              outerArr: [],
              nested: {
                innerNested: {
                  innerNestedNum: increment(1)
                },
                innerArr: arrayUnion(2),
                timestamp: serverTimestamp()
              }
            });
          });
        });
      });
    });
  });
});

// eslint-disable-next-line no-restricted-properties
describe('Count queries', () => {
  it('AggregateQuerySnapshot inherits the original query', () => {
    return withTestCollection(async coll => {
      const query_ = query(coll);
      const snapshot = await getCount(query_);
      expect(snapshot.query).to.equal(query_);
    });
  });

  ['so!@#$%^&*()_+special/sub', 'b1/so!@#$%^&*()_+special'].forEach(
    documentPath => {
      it(
        'can run count query getCount with special chars in the document path: ' +
          documentPath,
        () => {
          return withTestCollection(async coll => {
            const subColl1 = collection(coll, documentPath);
            await addDoc(subColl1, { foo: 'bar' });
            await addDoc(subColl1, { foo: 'baz' });
            const snapshot1 = await getCount(subColl1);
            expect(snapshot1.data().count).to.equal(2);
          });
        }
      );
    }
  );

  it('run count query on empty collection', () => {
    return withTestCollection(async coll => {
      const snapshot = await getCount(coll);
      expect(snapshot.data().count).to.equal(0);
    });
  });

  it('run count query on collection with 3 docs', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const snapshot = await getCount(coll);
      expect(snapshot.data().count).to.equal(3);
    });
  });

  it('run count query fails on invalid collection reference', () => {
    return withTestDb(async db => {
      const queryForRejection = collection(db, '__badpath__');
      await expect(getCount(queryForRejection)).to.eventually.be.rejected;
    });
  });

  it('count query supports filter', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(coll, where('author', '==', 'authorA'));
      const snapshot = await getCount(query_);
      expect(snapshot.data().count).to.equal(2);
    });
  });

  it('count query supports filter and a small limit size', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(coll, where('author', '==', 'authorA'), limit(1));
      const snapshot = await getCount(query_);
      expect(snapshot.data().count).to.equal(1);
    });
  });

  it('count query supports filter and a large limit size', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(coll, where('author', '==', 'authorA'), limit(3));
      const snapshot = await getCount(query_);
      expect(snapshot.data().count).to.equal(2);
    });
  });

  it('count query supports order by', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: null },
      { author: 'authorB' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(coll, orderBy('title'));
      const snapshot = await getCount(query_);
      expect(snapshot.data().count).to.equal(3);
    });
  });

  it('count query supports order by and startAt', () => {
    const testDocs = [
      { id: 3, author: 'authorA', title: 'titleA' },
      { id: 1, author: 'authorA', title: 'titleB' },
      { id: 2, author: 'authorB', title: 'titleC' },
      { id: null, author: 'authorB', title: 'titleD' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(coll, orderBy('id'), startAt(2));
      const snapshot = await getCount(query_);
      expect(snapshot.data().count).to.equal(2);
    });
  });

  it('count query supports order by and startAfter', () => {
    const testDocs = [
      { id: 3, author: 'authorA', title: 'titleA' },
      { id: 1, author: 'authorA', title: 'titleB' },
      { id: 2, author: 'authorB', title: 'titleC' },
      { id: null, author: 'authorB', title: 'titleD' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(coll, orderBy('id'), startAfter(2));
      const snapshot = await getCount(query_);
      expect(snapshot.data().count).to.equal(1);
    });
  });

  it('count query supports order by and endAt', () => {
    const testDocs = [
      { id: 3, author: 'authorA', title: 'titleA' },
      { id: 1, author: 'authorA', title: 'titleB' },
      { id: 2, author: 'authorB', title: 'titleC' },
      { id: null, author: 'authorB', title: 'titleD' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(coll, orderBy('id'), startAt(1), endAt(2));
      const snapshot = await getCount(query_);
      expect(snapshot.data().count).to.equal(2);
    });
  });

  it('count query supports order by and endBefore', () => {
    const testDocs = [
      { id: 3, author: 'authorA', title: 'titleA' },
      { id: 1, author: 'authorA', title: 'titleB' },
      { id: 2, author: 'authorB', title: 'titleC' },
      { id: null, author: 'authorB', title: 'titleD' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(coll, orderBy('id'), startAt(1), endBefore(2));
      const snapshot = await getCount(query_);
      expect(snapshot.data().count).to.equal(1);
    });
  });

  it("count query doesn't use converter", () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' }
    ];
    const throwingConverter = {
      toFirestore(obj: never): DocumentData {
        throw new Error('should never be called');
      },
      fromFirestore(snapshot: QueryDocumentSnapshot): never {
        throw new Error('should never be called');
      }
    };
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(
        coll,
        where('author', '==', 'authorA')
      ).withConverter(throwingConverter);
      const snapshot = await getCount(query_);
      expect(snapshot.data().count).to.equal(2);
    });
  });

  it('count query supports collection groups', () => {
    return withTestDb(async db => {
      const collectionGroupId = doc(collection(db, 'countTest')).id;
      const docPaths = [
        `${collectionGroupId}/cg-doc1`,
        `abc/123/${collectionGroupId}/cg-doc2`,
        `zzz${collectionGroupId}/cg-doc3`,
        `abc/123/zzz${collectionGroupId}/cg-doc4`,
        `abc/123/zzz/${collectionGroupId}`
      ];
      const batch = writeBatch(db);
      for (const docPath of docPaths) {
        batch.set(doc(db, docPath), { x: 1 });
      }
      await batch.commit();
      const snapshot = await getCount(collectionGroup(db, collectionGroupId));
      expect(snapshot.data().count).to.equal(2);
    });
  });

  it('aggregateQuerySnapshotEqual on same queries be truthy', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query1 = query(coll, where('author', '==', 'authorA'));
      const query2 = query(coll, where('author', '==', 'authorA'));
      const snapshot1A = await getCount(query1);
      const snapshot1B = await getCount(query1);
      const snapshot2 = await getCount(query2);
      expect(aggregateQuerySnapshotEqual(snapshot1A, snapshot1B)).to.be.true;
      expect(aggregateQuerySnapshotEqual(snapshot1A, snapshot2)).to.be.true;
    });
  });

  it('aggregateQuerySnapshotEqual on same queries with different documents size be falsy', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query1 = query(coll, where('author', '==', 'authorA'));
      const snapshot1A = await getCount(query1);
      await addDoc(coll, { author: 'authorA', title: 'titleD' });
      const query2 = query(coll, where('author', '==', 'authorA'));
      const snapshot1B = await getCount(query1);
      const snapshot2 = await getCount(query2);
      expect(aggregateQuerySnapshotEqual(snapshot1A, snapshot1B)).to.be.false;
      expect(aggregateQuerySnapshotEqual(snapshot1A, snapshot2)).to.be.false;
    });
  });

  it('aggregateQuerySnapshotEqual on different queries be falsy', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' },
      { author: 'authorB', title: 'titleD' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query1 = query(coll, where('author', '==', 'authorA'));
      const query2 = query(coll, where('author', '==', 'authorB'));
      const snapshot1 = await getCount(query1);
      const snapshot2 = await getCount(query2);
      expect(aggregateQuerySnapshotEqual(snapshot1, snapshot2)).to.be.false;
    });
  });

  it('count query fails on a terminated Firestore', () => {
    return withTestCollection(async coll => {
      await terminate(coll.firestore);
      expect(() => getCount(coll)).to.throw(
        'The client has already been terminated.'
      );
    });
  });

  it('terminate Firestore not effect count query in flight', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const promise = getCount(coll);
      await terminate(coll.firestore);
      const snapshot = await promise;
      expect(snapshot.data().count).to.equal(3);
    });
  });

  // Only verify the error message for missing indexes when running against
  // production, since the Firestore Emulator does not require index creation
  // and will, therefore, never fail in this situation.
  // eslint-disable-next-line no-restricted-properties
  (USE_EMULATOR ? it.skip : it)(
    'getCount error message contains console link if missing index',
    () => {
      return withTestCollection(async coll => {
        const query_ = query(
          coll,
          where('key1', '==', 42),
          where('key2', '<', 42)
        );
        await expect(getCount(query_)).to.be.eventually.rejectedWith(
          /index.*https:\/\/console\.firebase\.google\.com/
        );
      });
    }
  );
});

describe('Aggregate queries', () => {
  it('AggregateQuerySnapshot inherits the original query', () => {
    return withTestCollection(async coll => {
      const query_ = query(coll);
      const snapshot = await getAggregate(query_, { count: count() });
      expect(snapshot.query).to.equal(query_);
    });
  });

  it('run aggregate query on empty collection', () => {
    return withTestCollection(async coll => {
      const snapshot = await getAggregate(coll, { myCount: count() });
      expect(snapshot.data().myCount).to.equal(0);
    });
  });

  it('run aggregate query on collection with 3 docs', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const snapshot = await getAggregate(coll, { myCount: count() });
      expect(snapshot.data().myCount).to.equal(3);
    });
  });

  it('run aggregate query with duplicate aggregates', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const snapshot = await getAggregate(coll, {
        myCount: count(),
        yourCount: count()
      });
      expect(snapshot.data().myCount).to.equal(3);
      expect(snapshot.data().yourCount).to.equal(3);
    });
  });

  it('run aggregate query fails on invalid collection reference', () => {
    return withTestDb(async db => {
      const queryForRejection = collection(db, '__badpath__');
      await expect(getAggregate(queryForRejection, { myCount: count() })).to
        .eventually.be.rejected;
    });
  });

  it('aggregate query supports filter', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(coll, where('author', '==', 'authorA'));
      const snapshot = await getAggregate(query_, { myCount: count() });
      expect(snapshot.data().myCount).to.equal(2);
    });
  });

  it('aggregate query supports filter and a small limit size', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(coll, where('author', '==', 'authorA'), limit(1));
      const snapshot = await getAggregate(query_, { myCount: count() });
      expect(snapshot.data().myCount).to.equal(1);
    });
  });

  it('aggregate query supports filter and a large limit size', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(coll, where('author', '==', 'authorA'), limit(3));
      const snapshot = await getAggregate(query_, { myCount: count() });
      expect(snapshot.data().myCount).to.equal(2);
    });
  });

  it('aggregate query supports order by', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: null },
      { author: 'authorB' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(coll, orderBy('title'));
      const snapshot = await getAggregate(query_, { myCount: count() });
      expect(snapshot.data().myCount).to.equal(3);
    });
  });

  it('aggregate query supports order by and startAt', () => {
    const testDocs = [
      { id: 3, author: 'authorA', title: 'titleA' },
      { id: 1, author: 'authorA', title: 'titleB' },
      { id: 2, author: 'authorB', title: 'titleC' },
      { id: null, author: 'authorB', title: 'titleD' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(coll, orderBy('id'), startAt(2));
      const snapshot = await getAggregate(query_, { myCount: count() });
      expect(snapshot.data().myCount).to.equal(2);
    });
  });

  it('aggregate query supports order by and startAfter', () => {
    const testDocs = [
      { id: 3, author: 'authorA', title: 'titleA' },
      { id: 1, author: 'authorA', title: 'titleB' },
      { id: 2, author: 'authorB', title: 'titleC' },
      { id: null, author: 'authorB', title: 'titleD' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(coll, orderBy('id'), startAfter(2));
      const snapshot = await getAggregate(query_, { myCount: count() });
      expect(snapshot.data().myCount).to.equal(1);
    });
  });

  it('aggregate query supports order by and endAt', () => {
    const testDocs = [
      { id: 3, author: 'authorA', title: 'titleA' },
      { id: 1, author: 'authorA', title: 'titleB' },
      { id: 2, author: 'authorB', title: 'titleC' },
      { id: null, author: 'authorB', title: 'titleD' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(coll, orderBy('id'), startAt(1), endAt(2));
      const snapshot = await getAggregate(query_, { myCount: count() });
      expect(snapshot.data().myCount).to.equal(2);
    });
  });

  it('aggregate query supports order by and endBefore', () => {
    const testDocs = [
      { id: 3, author: 'authorA', title: 'titleA' },
      { id: 1, author: 'authorA', title: 'titleB' },
      { id: 2, author: 'authorB', title: 'titleC' },
      { id: null, author: 'authorB', title: 'titleD' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(coll, orderBy('id'), startAt(1), endBefore(2));
      const snapshot = await getAggregate(query_, { myCount: count() });
      expect(snapshot.data().myCount).to.equal(1);
    });
  });

  it("aggregate query doesn't use converter", () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' }
    ];
    const throwingConverter = {
      toFirestore(obj: never): DocumentData {
        throw new Error('should never be called');
      },
      fromFirestore(snapshot: QueryDocumentSnapshot): never {
        throw new Error('should never be called');
      }
    };
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query_ = query(
        coll,
        where('author', '==', 'authorA')
      ).withConverter(throwingConverter);
      const snapshot = await getAggregate(query_, { myCount: count() });
      expect(snapshot.data().myCount).to.equal(2);
    });
  });

  it('aggregate query supports collection groups', () => {
    return withTestDb(async db => {
      const collectionGroupId = doc(collection(db, 'countTest')).id;
      const docPaths = [
        `${collectionGroupId}/cg-doc1`,
        `abc/123/${collectionGroupId}/cg-doc2`,
        `zzz${collectionGroupId}/cg-doc3`,
        `abc/123/zzz${collectionGroupId}/cg-doc4`,
        `abc/123/zzz/${collectionGroupId}`
      ];
      const batch = writeBatch(db);
      for (const docPath of docPaths) {
        batch.set(doc(db, docPath), { x: 1 });
      }
      await batch.commit();
      const snapshot = await getAggregate(
        collectionGroup(db, collectionGroupId),
        { myCount: count() }
      );
      expect(snapshot.data().myCount).to.equal(2);
    });
  });

  it('aggregateQuerySnapshotEqual on same queries be truthy', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query1 = query(coll, where('author', '==', 'authorA'));
      const query2 = query(coll, where('author', '==', 'authorA'));
      const snapshot1A = await getAggregate(query1, { myCount: count() });
      const snapshot1B = await getAggregate(query1, { myCount: count() });
      const snapshot2 = await getAggregate(query2, { myCount: count() });
      expect(aggregateQuerySnapshotEqual(snapshot1A, snapshot1B)).to.be.true;
      expect(aggregateQuerySnapshotEqual(snapshot1A, snapshot2)).to.be.true;
    });
  });

  it('aggregateQuerySnapshotEqual on same queries with different documents size be falsy', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query1 = query(coll, where('author', '==', 'authorA'));
      const snapshot1A = await getAggregate(query1, { myCount: count() });
      await addDoc(coll, { author: 'authorA', title: 'titleD' });
      const query2 = query(coll, where('author', '==', 'authorA'));
      const snapshot1B = await getAggregate(query1, { myCount: count() });
      const snapshot2 = await getAggregate(query2, { myCount: count() });
      expect(aggregateQuerySnapshotEqual(snapshot1A, snapshot1B)).to.be.false;
      expect(aggregateQuerySnapshotEqual(snapshot1A, snapshot2)).to.be.false;
    });
  });

  it('aggregateQuerySnapshotEqual on different queries be falsy', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' },
      { author: 'authorB', title: 'titleD' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const query1 = query(coll, where('author', '==', 'authorA'));
      const query2 = query(coll, where('author', '==', 'authorB'));
      const snapshot1 = await getAggregate(query1, { myCount: count() });
      const snapshot2 = await getAggregate(query2, { myCount: count() });
      expect(aggregateQuerySnapshotEqual(snapshot1, snapshot2)).to.be.false;
    });
  });

  it('aggregate query fails on a terminated Firestore', () => {
    return withTestCollection(async coll => {
      await terminate(coll.firestore);
      expect(() => getAggregate(coll, { myCount: count() })).to.throw(
        'The client has already been terminated.'
      );
    });
  });

  it('terminate Firestore not effect aggregate query in flight', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA' },
      { author: 'authorA', title: 'titleB' },
      { author: 'authorB', title: 'titleC' }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const promise = getAggregate(coll, { myCount: count() });
      await terminate(coll.firestore);
      const snapshot = await promise;
      expect(snapshot.data().myCount).to.equal(3);
    });
  });

  // Only verify the error message for missing indexes when running against
  // production, since the Firestore Emulator does not require index creation
  // and will, therefore, never fail in this situation.
  // eslint-disable-next-line no-restricted-properties
  (USE_EMULATOR ? it.skip : it)(
    'getAggregate error message contains console link if missing index',
    () => {
      return withTestCollection(async coll => {
        const query_ = query(
          coll,
          where('key1', '==', 42),
          where('key2', '<', 42)
        );
        await expect(
          getAggregate(query_, {
            myCount: count()
          })
        ).to.be.eventually.rejectedWith(
          /index.*https:\/\/console\.firebase\.google\.com/
        );
      });
    }
  );
});

describe('Aggregate queries - sum / average', () => {
  it('aggregateQuerySnapshotEqual on different aggregations to be falsy', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA', rating: 1 },
      { author: 'authorA', title: 'titleB', rating: 5 },
      { author: 'authorB', title: 'titleC', rating: 4 },
      { author: 'authorB', title: 'titleD', rating: 3 }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const snapshot1 = await getAggregate(coll, { sum: sum('rating') });
      const snapshot2 = await getAggregate(coll, { avg: average('rating') });

      // `snapshot1` and `snapshot2` have different types and therefore the
      // following use of `aggregateQuerySnapshotEqual(...)` will cause a
      // TS error. To test the method for JS users, we ignore the TS error.
      // @ts-expect-error
      expect(aggregateQuerySnapshotEqual(snapshot1, snapshot2)).to.be.false;
    });
  });

  it('aggregateQuerySnapshotEqual on same aggregations with different aliases to be falsy', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA', rating: 1 },
      { author: 'authorA', title: 'titleB', rating: 5 },
      { author: 'authorB', title: 'titleC', rating: 4 },
      { author: 'authorB', title: 'titleD', rating: 3 }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const snapshot1 = await getAggregate(coll, { foo: average('rating') });
      const snapshot2 = await getAggregate(coll, { bar: average('rating') });

      // `snapshot1` and `snapshot2` have different types and therefore the
      // following use of `aggregateQuerySnapshotEqual(...)` will cause a
      // TS error. To test the method for JS users, we ignore the TS error.
      // @ts-expect-error
      expect(aggregateQuerySnapshotEqual(snapshot1, snapshot2)).to.be.false;
    });
  });

  it('aggregateQuerySnapshotEqual on same aggregations with same aliases to be truthy', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA', rating: 1 },
      { author: 'authorA', title: 'titleB', rating: 5 },
      { author: 'authorB', title: 'titleC', rating: 4 },
      { author: 'authorB', title: 'titleD', rating: 3 }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const snapshot1 = await getAggregate(coll, {
        foo: average('rating'),
        bar: sum('rating')
      });
      const snapshot2 = await getAggregate(coll, {
        bar: sum('rating'),
        foo: average('rating')
      });

      expect(aggregateQuerySnapshotEqual(snapshot1, snapshot2)).to.be.true;
    });
  });

  it('can run sum query getAggregationFromServer', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA', pages: 100 },
      { author: 'authorB', title: 'titleB', pages: 50 }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const snapshot = await getAggregate(coll, {
        totalPages: sum('pages')
      });
      expect(snapshot.data().totalPages).to.equal(150);
    });
  });

  it('can run average query getAggregationFromServer', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA', pages: 100 },
      { author: 'authorB', title: 'titleB', pages: 50 }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const snapshot = await getAggregate(coll, {
        averagePages: average('pages')
      });
      expect(snapshot.data().averagePages).to.equal(75);
    });
  });

  it('can get multiple aggregations using getAggregationFromServer', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA', pages: 100 },
      { author: 'authorB', title: 'titleB', pages: 50 }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const snapshot = await getAggregate(coll, {
        totalPages: sum('pages'),
        averagePages: average('pages'),
        count: count()
      });
      expect(snapshot.data().totalPages).to.equal(150);
      expect(snapshot.data().averagePages).to.equal(75);
      expect(snapshot.data().count).to.equal(2);
    });
  });

  it('fails when exceeding the max (5) aggregations using getAggregationFromServer', () => {
    const testDocs = [
      { author: 'authorA', title: 'titleA', pages: 100 },
      { author: 'authorB', title: 'titleB', pages: 50 }
    ];
    return withTestCollectionAndInitialData(testDocs, async coll => {
      const promise = getAggregate(coll, {
        totalPages: sum('pages'),
        averagePages: average('pages'),
        count: count(),
        totalPagesX: sum('pages'),
        averagePagesY: average('pages'),
        countZ: count()
      });

      await expect(promise).to.eventually.be.rejectedWith(
        /maximum number of aggregations/
      );
    });
  });

  // Only run tests that require indexes against the emulator, because we don't
  // have a way to dynamically create the indexes when running the tests.
  (USE_EMULATOR ? apiDescribe : apiDescribe.skip)(
    'queries requiring indexes',
    () => {
      it('performs aggregations on documents with all aggregated fields using getAggregationFromServer', () => {
        const testDocs = [
          { author: 'authorA', title: 'titleA', pages: 100, year: 1980 },
          { author: 'authorB', title: 'titleB', pages: 50, year: 2020 },
          { author: 'authorC', title: 'titleC', pages: 150, year: 2021 },
          { author: 'authorD', title: 'titleD', pages: 50 }
        ];
        return withTestCollectionAndInitialData(testDocs, async coll => {
          const snapshot = await getAggregate(coll, {
            totalPages: sum('pages'),
            averagePages: average('pages'),
            averageYear: average('year'),
            count: count()
          });
          expect(snapshot.data().totalPages).to.equal(300);
          expect(snapshot.data().averagePages).to.equal(100);
          expect(snapshot.data().averageYear).to.equal(2007);
          expect(snapshot.data().count).to.equal(3);
        });
      });
    }
  );
});
