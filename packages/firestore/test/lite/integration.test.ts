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
  AggregateField, aggregateQuery, AggregateQuery, aggregateQueryEqual, AggregateQuerySnapshot, aggregateSnapshotEqual, average, count, endAtGroup, endBeforeGroup, first, getAggregate, getGroups, groupByQuery, groupByQueryEqual, GroupByQuerySnapshot, groupByQuerySnapshotEqual, groupOffset, GroupSnapshot, last, limitGroups, limitToLastGroups, max, min, orderByGroup, startAfterGroup, startAtGroup, sum
} from '../../src/lite-api/aggregate';
import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc
} from '../../src/lite-api/reference_impl';
import {
  snapshotEqual,
  QuerySnapshot,
  QueryDocumentSnapshot
} from '../../src/lite-api/snapshot';
import { Timestamp } from '../../src/lite-api/timestamp';
import { documentId } from '../../src/lite-api/field_path';
import { runTransaction } from '../../src/lite-api/transaction';
import { writeBatch } from '../../src/lite-api/write_batch';
import {
  DEFAULT_PROJECT_ID,
  DEFAULT_SETTINGS
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


class AggregateDemo {

  constructor(readonly db: Firestore) {
  }

  async Demo1A_CountOfDocumentsInACollection() {
    const query1 = collection(this.db, 'games', 'halo', 'players');
    const snapshot = await getAggregate(aggregateQuery(query1, count()));
    expect(snapshot.get(count())).to.equal(5000000);
  }

  async Demo1B_LimitNumberOfDocumentsScannedWithLimit() {
    // Limit the work / documents scanned by restricting underlying query.
    const collection1 = collection(this.db, 'games', 'halo', 'players');
    const query1 = query(collection1, limit(1000));
    const snapshot = await getAggregate(aggregateQuery(query1, count()));
    expect(snapshot.get(count())).to.equal(1000);
  }

  async Demo1C_LimitNumberOfDocumentsScannedWithUpTo() {
    // Limit the work / documents scanned by specifying upTo on the aggregation.
    const query1 = collection(this.db, 'games', 'halo', 'players');
    const snapshot = await getAggregate(aggregateQuery(query1, count({ upTo: 1000})));
    expect(snapshot.get(count())).to.equal(1000);
  }
  
  async Demo2_GroupBySupport() {
    const collectionGroup1 = collectionGroup(this.db, 'players');
    const query1 = query(collectionGroup1, where('state', '==', 'active'));
    const snapshot = await getGroups(groupByQuery(query1, 'game', count()));
    expect(snapshot.empty).to.be.false;
    expect(snapshot.size).to.equal(3);
    expect(snapshot.groups).to.have.length(3);
    expect(snapshot.groups[0].get('game')).to.equal('cyber_punk');
    expect(snapshot.groups[0].get(count())).to.equal(5);
    expect(snapshot.groups[1].get('game')).to.equal('halo');
    expect(snapshot.groups[1].get(count())).to.equal(55);
    expect(snapshot.groups[2].get('game')).to.equal('mine_craft');
    expect(snapshot.groups[2].get(count())).to.equal(5000000);
  }

  async Demo3_FieldRenamingAliasing() {
    // Aliasing / renaming of aggregations is not exposed from the API surface.
    // I've requested that the proto allow non-aggregate fields to also be
    // aliased so that the implementation of the Firestore clients can rename
    // both aggregate and non-aggregate fields to guarantee that there is NEVER
    // a conflict.
  }

  async Demo4_LimitTheNumberOfDocumentsScanned() {
    // This is a duplicate of Demo1B_LimitNumberOfDocumentsScannedWithLimit.
  }

  async Demo5_LimitAggregationBuckets() {
    const collectionGroup1 = collectionGroup(this.db, 'players');
    const snapshot = await getGroups(groupByQuery(collectionGroup1, 'game',
      count(), limitGroups(1), groupOffset(1)));
    expect(snapshot.size).to.equal(1);
    expect(snapshot.groups[0].get('game')).to.equal('halo');
    expect(snapshot.groups[0].get(count())).to.equal(55);
  }

  async Demo6_LimitWorkPerAggregationBucket() {
    const query1 = collection(this.db, 'games', 'halo', 'players');
    const snapshot = await getGroups(groupByQuery(query1, 'game', count({ upTo: 50})));
    expect(snapshot.size).to.equal(3);
    expect(snapshot.groups[0].get('game')).to.equal('cyber_punk');
    expect(snapshot.groups[0].get(count())).to.equal(5);
    expect(snapshot.groups[1].get('game')).to.equal('halo');
    expect(snapshot.groups[1].get(count())).to.equal(50); // count is capped at 50
    expect(snapshot.groups[2].get('game')).to.equal('mine_craft');
    expect(snapshot.groups[2].get(count())).to.equal(50); // count is capped at 50
  }

  async Demo7_OffsetOnNonGroupByQuery() {
    // The API does not provide a way to specify an offset for a non-group-by query.
  }

  async Demo8_PaginationOverAggregationBuckets() {
    const collectionGroup1 = collectionGroup(this.db, 'players');
    const query1 = query(collectionGroup1, where('state', '==', 'active'));
    // orderBy('game') is implied by the group by
    const snapshot = await getGroups(groupByQuery(query1, 'game', count(),
      startAfterGroup('cyber_punk')));
    expect(snapshot.size).to.equal(2);
    expect(snapshot.groups[0].get('game')).to.equal('halo');
    expect(snapshot.groups[0].get(count())).to.equal(55);
    expect(snapshot.groups[1].get('game')).to.equal('mine_craft');
    expect(snapshot.groups[1].get(count())).to.equal(5000000);
  }

  async Demo9A_ResumeTokens() {
    const collectionGroup1 = collectionGroup(this.db, 'players');
    const baseQuery = query(collectionGroup1, orderBy(documentId()), limit(1000));
    let playerCount = 0;

    let query1 = baseQuery;
    while (true) {
      const aggregateQuery1 = aggregateQuery(query1, count(), last(documentId()));
      const snapshot = await getAggregate(aggregateQuery1);
      const count1 = snapshot.get(count());
      playerCount = playerCount + count1;

      if (count1 < 1000) {
        break;
      }

      const lastDocumentId = snapshot.get(last(documentId()));
      query1 = query(query1, startAfter(lastDocumentId));
    }

    console.log(`There are ${playerCount} players`)
  }

  async Demo9B_ResumeTokensWithGroupBy() {
    const collectionGroup1 = collectionGroup(this.db, 'players');
    const baseQuery = query(collectionGroup1, orderBy(documentId()), limit(1000));
    const countByCountry = {};

    let query1 = baseQuery;
    while (true) {
      const groupByQuery1 = groupByQuery(query1, 'country', count(), last(documentId()));
      const snapshot = await getGroups(groupByQuery1);
      let curTotalCount = 0;
      let lastDocumentId: (string | null) = null;

      for (const group of snapshot.groups) {
        const country = group.get('country');
        const countryCount = group.get(count()) as number;
      }

      query1 = query(query1, startAfter(lastDocumentId));
    }
  }

}









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
  set<T>(
    documentRef: DocumentReference<T>,
    data: WithFieldValue<T>
  ): Promise<void>;
  set<T>(
    documentRef: DocumentReference<T>,
    data: PartialWithFieldValue<T>,
    options: SetOptions
  ): Promise<void>;
  update<T>(
    documentRef: DocumentReference<T>,
    data: UpdateData<T>
  ): Promise<void>;
  update(
    documentRef: DocumentReference<unknown>,
    field: string | FieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): Promise<void>;
  delete(documentRef: DocumentReference<unknown>): Promise<void>;
}

genericMutationTests({
  set: setDoc,
  update: updateDoc,
  delete: deleteDoc
});

describe('WriteBatch', () => {
  class WriteBatchTester implements MutationTester {
    delete(ref: DocumentReference<unknown>): Promise<void> {
      const batch = writeBatch(ref.firestore);
      batch.delete(ref);
      return batch.commit();
    }

    set<T>(
      ref: DocumentReference<T>,
      data: PartialWithFieldValue<T>,
      options?: SetOptions
    ): Promise<void> {
      const batch = writeBatch(ref.firestore);
      // TODO(mrschmidt): Find a way to remove the `any` cast here
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (batch.set as any).apply(batch, Array.from(arguments));
      return batch.commit();
    }

    update<T>(
      ref: DocumentReference<T>,
      dataOrField: UpdateData<T> | string | FieldPath,
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
    delete(ref: DocumentReference<unknown>): Promise<void> {
      return runTransaction(ref.firestore, async transaction => {
        transaction.delete(ref);
      });
    }

    set<T>(
      ref: DocumentReference<T>,
      data: PartialWithFieldValue<T>,
      options?: SetOptions
    ): Promise<void> {
      return runTransaction(ref.firestore, async transaction => {
        if (options) {
          transaction.set(ref, data, options);
        } else {
          transaction.set(ref, data as WithFieldValue<T>);
        }
      });
    }

    update<T>(
      ref: DocumentReference<T>,
      dataOrField: UpdateData<T> | string | FieldPath,
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
          transaction.update(ref, dataOrField as UpdateData<T>);
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
      return withTestDb(async db => {
        const coll = collection(db, 'posts');
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
      return withTestDb(async db => {
        const coll = collection(db, 'posts');
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
      { bytes: Bytes.fromBase64String('aa') },
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
})

describe('AggregateField', () => {
  it('isEqual() returns true for equal instances', () => {
    expect(count().isEqual(count())).to.be.true;
    expect(count({'upTo': 42}).isEqual(count({'upTo': 42}))).to.be.true;
    expect(min('field').isEqual(min('field'))).to.be.true;
    expect(min('field').isEqual(min(new FieldPath('field')))).to.be.true;
    expect(min(new FieldPath('field')).isEqual(min(new FieldPath('field')))).to.be.true;
    expect(max('field').isEqual(max('field'))).to.be.true;
    expect(max('field').isEqual(max(new FieldPath('field')))).to.be.true;
    expect(max(new FieldPath('field')).isEqual(max(new FieldPath('field')))).to.be.true;
    expect(sum('field').isEqual(sum('field'))).to.be.true;
    expect(sum('field').isEqual(sum(new FieldPath('field')))).to.be.true;
    expect(sum(new FieldPath('field')).isEqual(sum(new FieldPath('field')))).to.be.true;
    expect(average('field').isEqual(average('field'))).to.be.true;
    expect(average('field').isEqual(average(new FieldPath('field')))).to.be.true;
    expect(average(new FieldPath('field')).isEqual(average(new FieldPath('field')))).to.be.true;
    expect(first('field').isEqual(first('field'))).to.be.true;
    expect(first('field').isEqual(first(new FieldPath('field')))).to.be.true;
    expect(first(new FieldPath('field')).isEqual(first(new FieldPath('field')))).to.be.true;
    expect(last('field').isEqual(last('field'))).to.be.true;
    expect(last('field').isEqual(last(new FieldPath('field')))).to.be.true;
    expect(last(new FieldPath('field')).isEqual(last(new FieldPath('field')))).to.be.true;
  });

  it('isEqual() returns false for unequal instances', () => {
    const instances = [
      count(), count({'upTo': 42}),
      min('field1'), min(new FieldPath('field2')),
      max('field1'), max(new FieldPath('field2')),
      sum('field1'), sum(new FieldPath('field2')),
      average('field1'), average(new FieldPath('field2')),
      first('field1'), first(new FieldPath('field2')),
      last('field1'), last(new FieldPath('field2')),
    ];
    for (let i = 0; i < instances.length; i++) {
      for (let j = 0; j < instances.length; j++) {
        if (i != j) {
          expect(instances[i].isEqual(instances[j])).to.be.false;
        }
      }
    }
  });

  it('instanceof checks out', () => {
    expect(count()).to.be.an.instanceof(AggregateField);
    expect(count({'upTo': 42})).to.be.an.instanceof(AggregateField);
    expect(min('field')).to.be.an.instanceof(AggregateField);
    expect(max('field')).to.be.an.instanceof(AggregateField);
    expect(sum('field')).to.be.an.instanceof(AggregateField);
    expect(average('field')).to.be.an.instanceof(AggregateField);
    expect(first('field')).to.be.an.instanceof(AggregateField);
    expect(last('field')).to.be.an.instanceof(AggregateField);
  });

});

describe('AggregateQuery', () => {
  it('query property is the correct instance', () => {
    return withTestCollection(async collRef => {
      const aggregateQuery = aggregate(collRef, count());
      expect(aggregateQuery.query).to.equal(collRef);
    });
  });

  it('aggregateQueryEqual() returns true for equal instances', () => {
    return withTestDb(async db => {
      const collRef1 = collection(db, "coll");
      const aggregateQuery1 = aggregate(collRef1, count());
      const collRef2 = collection(db, "coll");
      const aggregateQuery2 = aggregate(collRef2, count());
      expect(aggregateQueryEqual(aggregateQuery1, aggregateQuery2)).to.be.true;
    });
  });

  it('aggregateQueryEqual() returns false for unequal instances', () => {
    return withTestDb(async db => {
      const collRef1 = collection(db, "coll1");
      const collRef2 = collection(db, "coll2");
      const aggregateQuery1 = aggregate(collRef1, count());
      const aggregateQuery2 = aggregate(collRef1, count({'upTo': 42}));
      const aggregateQuery3 = aggregate(collRef2, count());
      expect(aggregateQueryEqual(aggregateQuery1, aggregateQuery2)).to.be.false;
      expect(aggregateQueryEqual(aggregateQuery1, aggregateQuery3)).to.be.false;
      expect(aggregateQueryEqual(aggregateQuery2, aggregateQuery3)).to.be.false;
    });
  });
});

describe('AggregateSnapshot', () => {
  it('AggregateSnapshot.query', () => {
    return withTestCollection(async collRef => {
      const aggregateQuery = aggregate(collRef, count());
      const snapshot = await getAggregate(aggregateQuery);
      expect(snapshot.query).to.equal(aggregateQuery);
    });
  });

  it('AggregateSnapshot.aggregations with length 1', () => {
    return withTestCollection(async collRef => {
      const aggregateQuery = aggregate(collRef, count());
      const snapshot = await getAggregate(aggregateQuery);
      expect(snapshot.aggregations).to.deep.equal([count()]);
    });
  });

  it('AggregateSnapshot.aggregations with length 2', () => {
    return withTestCollection(async collRef => {
      const aggregateQuery = aggregate(collRef, min('field1'), last('field2'));
      const snapshot = await getAggregate(aggregateQuery);
      expect(snapshot.aggregations).to.deep.equal([min('field1'), last('field2')]);
    });
  });

  it('AggregateSnapshot.get with field not in the query', () => {
    return withTestCollection(async collRef => {
      const aggregateQuery = aggregate(collRef, count());
      const snapshot = await getAggregate(aggregateQuery);
      expect(snapshot.get(count({'upTo': 42}))).to.be.undefined;
      expect(snapshot.get(min('field'))).to.be.undefined;
      expect(snapshot.get(max('field'))).to.be.undefined;
      expect(snapshot.get(sum('field'))).to.be.undefined;
      expect(snapshot.get(average('field'))).to.be.undefined;
      expect(snapshot.get(first('field'))).to.be.undefined;
      expect(snapshot.get(last('field'))).to.be.undefined;
    });
  });

  it('AggregateSnapshot.get with fields in the query', () => {
    return withTestCollectionAndInitialData([{'age': 42}, {'age': 24}], async collRef => {
      const aggregateQuery = aggregate(collRef, count(), min('age'));
      const snapshot = await getAggregate(aggregateQuery);
      expect(snapshot.get(count())).to.equal(2);
      expect(snapshot.get(min('age'))).to.equal(24);
    });
  });

  it('aggregateSnapshotEqual() returns true for equal instances', () => {
    return withTestCollection(async collRef => {
      const aggregateQuery = aggregate(collRef, count());
      const snapshot1 = await getAggregate(aggregateQuery);
      const snapshot2 = await getAggregate(aggregateQuery);
      expect(aggregateSnapshotEqual(snapshot1, snapshot2)).to.be.true;
    });
  });
});

describe('GroupByQuery', () => {
  function verifyResults(
    actual: GroupByQuerySnapshot,
    ...expected: DocumentData[]
  ): void {
    expect(actual.empty).to.equal(expected.length === 0);
    expect(actual.size).to.equal(expected.length);
  }

  it('query property is the correct instance', () => {
    return withTestCollection(async collRef => {
      const groupByQuery1 = groupByQuery(collRef, 'shape');
      expect(groupByQuery1.query).to.equal(collRef);
    });
  });

  it('groupByQueryEqual() returns true for equal instances', () => {
    return withTestDb(async db => {
      const collRef1 = collection(db, "coll");
      const groupByQuery1 = groupByQuery(collRef1, 'color');
      const collRef2 = collection(db, "coll");
      const groupByQuery2 = groupByQuery(collRef2, 'color');
      expect(groupByQueryEqual(groupByQuery1, groupByQuery2)).to.be.true;
    });
  });

  it('groupByQueryEqual() returns false for unequal instances', () => {
    return withTestDb(async db => {
      const collRef1 = collection(db, "coll1");
      const collRef2 = collection(db, "coll2");
      const groupByQuery1 = groupByQuery(collRef1, 'field1');
      const groupByQuery2 = groupByQuery(collRef2, 'field1');
      const groupByQuery3 = groupByQuery(collRef1, 'field2');
      const groupByQuery4 = groupByQuery(collRef1, 'field1', 'field2');
      expect(groupByQueryEqual(groupByQuery1, groupByQuery2)).to.be.false;
      expect(groupByQueryEqual(groupByQuery1, groupByQuery3)).to.be.false;
      expect(groupByQueryEqual(groupByQuery1, groupByQuery4)).to.be.false;
      expect(groupByQueryEqual(groupByQuery2, groupByQuery3)).to.be.false;
      expect(groupByQueryEqual(groupByQuery2, groupByQuery4)).to.be.false;
      expect(groupByQueryEqual(groupByQuery3, groupByQuery4)).to.be.false;
    });
  });

  it('supports orderByGroup (with default order)', () => {
    return withTestCollectionAndInitialData(
      [{ color: 'green' }, { color: 'red' }, { color: 'blue' }, { color: 'red' }],
      async collRef => {
        const groupByQuery1 = groupByQuery(collRef, 'color', count(), orderByGroup('color'));
        const result = await getGroups(groupByQuery1)
        expect(result.empty).to.be.false;
        expect(result.size).to.equal(3);
        for (const group of result.groups) {
          expect(group.fields).to.have.length(1);
          expect(group.fields[0].isEqual(new FieldPath('color'))).to.be.true;
          expect(group.aggregations).to.have.length(1);
          expect(group.aggregations[0].isEqual(count())).to.be.true;
        }
        expect(result.groups[0].get('color')).to.equal('blue');
        expect(result.groups[0].get(count())).to.equal(1);
        expect(result.groups[1].get('color')).to.equal('green');
        expect(result.groups[1].get(count())).to.equal(1);
        expect(result.groups[2].get('color')).to.equal('red');
        expect(result.groups[2].get(count())).to.equal(2);
      }
    );
  });

  it('supports orderByGroup (with asc)', () => {
    return withTestCollectionAndInitialData(
      [{ color: 'green' }, { color: 'red' }, { color: 'blue' }, { color: 'red' }],
      async collRef => {
        const groupByQuery1 = groupByQuery(collRef, 'color', count(), orderByGroup('color', 'asc'));
        const result = await getGroups(groupByQuery1);
        verifyResults(result);
      }
    );
  });

  it('supports orderByGroup (with desc)', () => {
    return withTestCollectionAndInitialData(
      [{ color: 'green' }, { color: 'red' }, { color: 'blue' }, { color: 'red' }],
      async collRef => {
        const groupByQuery1 = groupByQuery(collRef, 'color', count(), orderByGroup('color', 'desc'));
        const result = await getGroups(groupByQuery1);
        verifyResults(result);
      }
    );
  });

  it('supports limitGroups', () => {
    return withTestCollectionAndInitialData(
      [{ color: 'green' }, { color: 'red' }, { color: 'blue' }, { color: 'red' }],
      async collRef => {
        const groupByQuery1 = groupByQuery(collRef, 'color', count(), limitGroups(2));
        const result = await getGroups(groupByQuery1);
        verifyResults(result);
      }
    );
  });

  it('supports limitToLastGroups query', () => {
    return withTestCollectionAndInitialData(
      [{ color: 'green' }, { color: 'red' }, { color: 'blue' }, { color: 'red' }],
      async collRef => {
        const groupByQuery1 = groupByQuery(collRef, 'color', count(), limitToLastGroups(2));
        const result = await getGroups(groupByQuery1);
        verifyResults(result);
      }
    );
  });

  it('supports startAtGroup', () => {
    return withTestCollectionAndInitialData(
      [{ color: 'green' }, { color: 'red' }, { color: 'blue' }, { color: 'red' }],
      async collRef => {
        const groupByQuery1 = groupByQuery(collRef, 'color', count(), limitGroups(1));
        const result1 = await getGroups(groupByQuery1);
        verifyResults(result1);
        const groupByQuery2 = groupByQuery(groupByQuery1, startAtGroup('blue'));
        const result2 = await getGroups(groupByQuery2);
        verifyResults(result2);
        const groupByQuery3 = groupByQuery(groupByQuery2, startAtGroup(result2.groups[0]));
        const result3 = await getGroups(groupByQuery3);
        verifyResults(result3);
      }
    );
  });

  it('supports startAfterGroup', () => {
    return withTestCollectionAndInitialData(
      [{ color: 'green' }, { color: 'red' }, { color: 'blue' }, { color: 'red' }],
      async collRef => {
        const groupByQuery1 = groupByQuery(collRef, 'color', count(), limitGroups(1));
        const result1 = await getGroups(groupByQuery1);
        verifyResults(result1);
        const groupByQuery2 = groupByQuery(groupByQuery1, startAfterGroup('blue'));
        const result2 = await getGroups(groupByQuery2);
        verifyResults(result2);
        const groupByQuery3 = groupByQuery(groupByQuery2, startAfterGroup(result2.groups[0]));
        const result3 = await getGroups(groupByQuery3);
        verifyResults(result3);
      }
    );
  });

  it('supports endAtGroup', () => {
    return withTestCollectionAndInitialData(
      [{ color: 'green' }, { color: 'red' }, { color: 'blue' }, { color: 'red' }],
      async collRef => {
        const groupByQuery1 = groupByQuery(collRef, 'color', count(), limitGroups(1));
        const result1 = await getGroups(groupByQuery1);
        verifyResults(result1);
        const groupByQuery2 = groupByQuery(groupByQuery1, endAtGroup('blue'));
        const result2 = await getGroups(groupByQuery2);
        verifyResults(result2);
        const groupByQuery3 = groupByQuery(groupByQuery2, endAtGroup(result2.groups[0]));
        const result3 = await getGroups(groupByQuery3);
        verifyResults(result3);
      }
    );
  });

  it('supports endBeforeGroup', () => {
    return withTestCollectionAndInitialData(
      [{ color: 'green' }, { color: 'red' }, { color: 'blue' }, { color: 'red' }],
      async collRef => {
        const groupByQuery1 = groupByQuery(collRef, 'color', count(), limitGroups(1));
        const result1 = await getGroups(groupByQuery1);
        verifyResults(result1);
        const groupByQuery2 = groupByQuery(groupByQuery1, endBeforeGroup('blue'));
        const result2 = await getGroups(groupByQuery2);
        verifyResults(result2);
        const groupByQuery3 = groupByQuery(groupByQuery2, endBeforeGroup(result2.groups[0]));
        const result3 = await getGroups(groupByQuery3);
        verifyResults(result3);
      }
    );
  });
});

describe('GroupBySnapshot', () => {
  it('GroupBySnapshot.query', () => {
    return withTestCollection(async collRef => {
      const groupByQuery1 = groupByQuery(collRef, 'field');
      const snapshot = await getGroups(groupByQuery1);
      expect(snapshot.query).to.equal(groupByQuery1);
    });
  });

  it('GroupBySnapshot with no results', () => {
    return withTestCollection(async collRef => {
      const groupByQuery1 = groupByQuery(collRef, 'field');
      const snapshot = await getGroups(groupByQuery1);
      expect(snapshot.groups).to.have.length(0);
      expect(snapshot.size).to.equal(0);
      expect(snapshot.empty).to.be.true;
    });
  });

  it('GroupBySnapshot with 1 group', () => {
    const initialData = [
      {'num': 1, 'color': 'red'},
      {'num': 1, 'color': 'blue'},
      {'num': 1, 'color': 'green'},
    ];
    return withTestCollectionAndInitialData(initialData, async collRef => {
      const groupByQuery1 = groupByQuery(collRef, 'num');
      const snapshot = await getGroups(groupByQuery1);
      expect(snapshot.groups).to.have.length(1);
      expect(snapshot.size).to.equal(1);
      expect(snapshot.empty).to.be.false;
    });
  });

  it('GroupBySnapshot with 3 groups', () => {
    const initialData = [
      {'num': 1, 'color': 'red'},
      {'num': 1, 'color': 'red'},
      {'num': 2, 'color': 'red'},
      {'num': 2, 'color': 'red'},
      {'num': 2, 'color': 'blue'},
    ];
    return withTestCollectionAndInitialData(initialData, async collRef => {
      const groupByQuery1 = groupByQuery(collRef, 'num', 'color');
      const snapshot = await getGroups(groupByQuery1);
      expect(snapshot.groups).to.have.length(3);
      expect(snapshot.size).to.equal(3);
      expect(snapshot.empty).to.be.false;
    });
  });

  it('GroupBySnapshot.forEach', () => {
    const initialData = [
      {'num': 1, 'color': 'red'},
      {'num': 2, 'color': 'red'},
    ];
    return withTestCollectionAndInitialData(initialData, async collRef => {
      const groupByQuery1 = groupByQuery(collRef, 'num', 'color');
      const snapshot = await getGroups(groupByQuery1);
      let groupsForForEach: Array<GroupSnapshot> = [];
      snapshot.forEach((result => { groupsForForEach.push(result); }))
      expect(groupsForForEach).to.have.length(2);
      expect(groupsForForEach).to.deep.equal(snapshot.groups);
    });
  });

  it('groupBySnapshotEqual() returns true for equal instances', () => {
    return withTestCollection(async collRef => {
      const groupByQuery1 = groupByQuery(collRef, 'field');
      const snapshot1 = await getGroups(groupByQuery1);
      const snapshot2 = await getGroups(groupByQuery1);
      expect(groupByQuerySnapshotEqual(snapshot1, snapshot2)).to.be.true;
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

    return withTestDb(async db => {
      const coll = collection(db, 'tests');
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

    const testConverter = {
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
          const testDocRef: DocumentReference<TestObject> =
            docRef.withConverter(testConverter);
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

        const testConverterUnion = {
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
          const testDocRef: DocumentReference<TestObjectUnion> =
            docRef.withConverter(testConverterUnion);

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
          const testDocRef: DocumentReference<TestObject> =
            docRef.withConverter(testConverter);

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
