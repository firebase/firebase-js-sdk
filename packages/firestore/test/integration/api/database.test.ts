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

import { deleteApp } from '@firebase/app';
import { Deferred } from '@firebase/util';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { EventsAccumulator } from '../util/events_accumulator';
import {
  addDoc,
  clearIndexedDbPersistence,
  collection,
  collectionGroup,
  deleteDoc,
  deleteField,
  disableNetwork,
  doc,
  DocumentData,
  documentId,
  DocumentSnapshot,
  enableIndexedDbPersistence,
  enableNetwork,
  getDoc,
  getDocFromCache,
  getDocFromServer,
  getDocs,
  initializeFirestore,
  limit,
  onSnapshot,
  onSnapshotsInSync,
  orderBy,
  query,
  queryEqual,
  refEqual,
  serverTimestamp,
  setDoc,
  SetOptions,
  terminate,
  updateDoc,
  waitForPendingWrites,
  where,
  writeBatch,
  QueryDocumentSnapshot,
  DocumentReference,
  runTransaction,
  WithFieldValue,
  Timestamp,
  FieldPath,
  newTestFirestore,
  SnapshotOptions,
  newTestApp,
  FirestoreError,
  QuerySnapshot,
  vector,
  getDocsFromServer
} from '../util/firebase_export';
import {
  apiDescribe,
  withTestCollection,
  withTestDbsSettings,
  withTestDb,
  withTestDbs,
  withTestDoc,
  withTestDocAndInitialData,
  withNamedTestDbsOrSkipUnlessUsingEmulator,
  toDataArray,
  checkOnlineAndOfflineResultsMatch,
  toIds
} from '../util/helpers';
import { DEFAULT_SETTINGS, DEFAULT_PROJECT_ID } from '../util/settings';

use(chaiAsPromised);

apiDescribe('Database', persistence => {
  it('can set a document', () => {
    return withTestDoc(persistence, docRef => {
      return setDoc(docRef, {
        desc: 'Stuff related to Firestore project...',
        owner: {
          name: 'Jonny',
          title: 'scallywag'
        }
      });
    });
  });

  it('doc() will auto generate an ID', () => {
    return withTestDb(persistence, async db => {
      const ref = doc(collection(db, 'foo'));
      // Auto IDs are 20 characters long
      expect(ref.id.length).to.equal(20);
    });
  });

  it('can delete a document', () => {
    // TODO(#1865): This test fails with node:persistence against Prod
    return withTestDoc(persistence, docRef => {
      return setDoc(docRef, { foo: 'bar' })
        .then(() => getDoc(docRef))
        .then(doc => {
          expect(doc.data()).to.deep.equal({ foo: 'bar' });
          return deleteDoc(docRef);
        })
        .then(() => getDoc(docRef))
        .then(doc => {
          expect(doc.exists()).to.equal(false);
        });
    });
  });

  it('can update existing document', () => {
    return withTestDoc(persistence, doc => {
      const initialData = {
        desc: 'Description',
        owner: { name: 'Jonny', email: 'abc@xyz.com' }
      };
      const updateData = {
        desc: 'NewDescription',
        'owner.email': 'new@xyz.com'
      };
      const finalData = {
        desc: 'NewDescription',
        owner: { name: 'Jonny', email: 'new@xyz.com' }
      };
      return setDoc(doc, initialData)
        .then(() => updateDoc(doc, updateData))
        .then(() => getDoc(doc))
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.be.ok;
          expect(docSnapshot.data()).to.deep.equal(finalData);
        });
    });
  });

  it('can retrieve document that does not exist', () => {
    return withTestDoc(persistence, doc => {
      return getDoc(doc).then(snapshot => {
        expect(snapshot.exists()).to.equal(false);
        expect(snapshot.data()).to.equal(undefined);
        expect(snapshot.get('foo')).to.equal(undefined);
      });
    });
  });

  // eslint-disable-next-line no-restricted-properties
  (persistence.gc === 'lru' ? it : it.skip)(
    'can update an unknown document',
    () => {
      return withTestDbs(persistence, 2, async ([reader, writer]) => {
        const writerRef = doc(collection(writer, 'collection'));
        const readerRef = doc(collection(reader, 'collection'), writerRef.id);
        await setDoc(writerRef, { a: 'a' });
        await updateDoc(readerRef, { b: 'b' });
        await getDocFromCache(writerRef).then(
          doc => expect(doc.exists()).to.be.true
        );
        await getDocFromCache(readerRef).then(
          () => {
            expect.fail('Expected cache miss');
          },
          err => expect(err.code).to.be.equal('unavailable')
        );
        await getDoc(writerRef).then(doc =>
          expect(doc.data()).to.deep.equal({ a: 'a', b: 'b' })
        );
        await getDoc(readerRef).then(doc =>
          expect(doc.data()).to.deep.equal({ a: 'a', b: 'b' })
        );
      });
    }
  );

  it('can merge data with an existing document using set', () => {
    return withTestDoc(persistence, doc => {
      const initialData = {
        desc: 'description',
        'owner.data': { name: 'Jonny', email: 'abc@xyz.com' }
      };
      const mergeData = {
        updated: true,
        'owner.data': { name: 'Sebastian' }
      };
      const finalData = {
        updated: true,
        desc: 'description',
        'owner.data': { name: 'Sebastian', email: 'abc@xyz.com' }
      };
      return setDoc(doc, initialData)
        .then(() => setDoc(doc, mergeData, { merge: true }))
        .then(() => getDoc(doc))
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.be.ok;
          expect(docSnapshot.data()).to.deep.equal(finalData);
        });
    });
  });

  it('can merge server timestamps', () => {
    return withTestDoc(persistence, doc => {
      const initialData = {
        updated: false
      };
      const mergeData = {
        time: serverTimestamp(),
        nested: { time: serverTimestamp() }
      };
      return setDoc(doc, initialData)
        .then(() => setDoc(doc, mergeData, { merge: true }))
        .then(() => getDoc(doc))
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.be.ok;
          expect(docSnapshot.get('updated')).to.be.false;
          expect(docSnapshot.get('time')).to.be.an.instanceof(Timestamp);
          expect(docSnapshot.get('nested.time')).to.be.an.instanceof(Timestamp);
        });
    });
  });

  it('can merge empty object', async () => {
    await withTestDoc(persistence, async doc => {
      const accumulator = new EventsAccumulator<DocumentSnapshot>();
      const unsubscribe = onSnapshot(doc, accumulator.storeEvent);
      await accumulator
        .awaitEvent()
        .then(() => setDoc(doc, {}))
        .then(() => accumulator.awaitEvent())
        .then(docSnapshot => expect(docSnapshot.data()).to.be.deep.equal({}))
        .then(() => setDoc(doc, { a: {} }, { mergeFields: ['a'] }))
        .then(() => accumulator.awaitEvent())
        .then(docSnapshot =>
          expect(docSnapshot.data()).to.be.deep.equal({ a: {} })
        )
        .then(() => setDoc(doc, { b: {} }, { merge: true }))
        .then(() => accumulator.awaitEvent())
        .then(docSnapshot =>
          expect(docSnapshot.data()).to.be.deep.equal({ a: {}, b: {} })
        )
        .then(() => getDocFromServer(doc))
        .then(docSnapshot => {
          expect(docSnapshot.data()).to.be.deep.equal({ a: {}, b: {} });
        });

      unsubscribe();
    });
  });

  it('update with empty object replaces all fields', () => {
    return withTestDoc(persistence, async doc => {
      await setDoc(doc, { a: 'a' });
      await updateDoc(doc, 'a', {});
      const docSnapshot = await getDoc(doc);
      expect(docSnapshot.data()).to.be.deep.equal({ a: {} });
    });
  });

  it('merge with empty object replaces all fields', () => {
    return withTestDoc(persistence, async doc => {
      await setDoc(doc, { a: 'a' });
      await setDoc(doc, { 'a': {} }, { merge: true });
      const docSnapshot = await getDoc(doc);
      expect(docSnapshot.data()).to.be.deep.equal({ a: {} });
    });
  });

  it('can delete field using merge', () => {
    return withTestDoc(persistence, doc => {
      const initialData = {
        untouched: true,
        foo: 'bar',
        nested: { untouched: true, foo: 'bar' }
      };
      const mergeData = {
        foo: deleteField(),
        nested: { foo: deleteField() }
      };
      const finalData = {
        untouched: true,
        nested: { untouched: true }
      };
      return setDoc(doc, initialData)
        .then(() => setDoc(doc, mergeData, { merge: true }))
        .then(() => getDoc(doc))
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.be.ok;
          expect(docSnapshot.data()).to.deep.equal(finalData);
        });
    });
  });

  it('can delete field using mergeFields', () => {
    return withTestDoc(persistence, doc => {
      const initialData = {
        untouched: true,
        foo: 'bar',
        inner: { removed: true, foo: 'bar' },
        nested: { untouched: true, foo: 'bar' }
      };
      const mergeData = {
        foo: deleteField(),
        inner: { foo: deleteField() },
        nested: {
          untouched: deleteField(),
          foo: deleteField()
        }
      };
      const finalData = {
        untouched: true,
        inner: {},
        nested: { untouched: true }
      };
      return setDoc(doc, initialData)
        .then(() =>
          setDoc(doc, mergeData, {
            mergeFields: ['foo', 'inner', 'nested.foo']
          })
        )
        .then(() => getDoc(doc))
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.be.ok;
          expect(docSnapshot.data()).to.deep.equal(finalData);
        });
    });
  });

  it('can set server timestamps using mergeFields', () => {
    return withTestDoc(persistence, doc => {
      const initialData = {
        untouched: true,
        foo: 'bar',
        nested: { untouched: true, foo: 'bar' }
      };
      const mergeData = {
        foo: serverTimestamp(),
        inner: { foo: serverTimestamp() },
        nested: { foo: serverTimestamp() }
      };
      return setDoc(doc, initialData)
        .then(() =>
          setDoc(doc, mergeData, {
            mergeFields: ['foo', 'inner', 'nested.foo']
          })
        )
        .then(() => getDoc(doc))
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.be.ok;
          expect(docSnapshot.get('foo')).to.be.instanceof(Timestamp);
          expect(docSnapshot.get('inner.foo')).to.be.instanceof(Timestamp);
          expect(docSnapshot.get('nested.foo')).to.be.instanceof(Timestamp);
        });
    });
  });

  it('can replace an array by merging using set', () => {
    return withTestDoc(persistence, doc => {
      const initialData = {
        untouched: true,
        data: 'old',
        topLevel: ['old', 'old'],
        mapInArray: [{ data: 'old' }]
      };
      const mergeData = {
        data: 'new',
        topLevel: ['new'],
        mapInArray: [{ data: 'new' }]
      };
      const finalData = {
        untouched: true,
        data: 'new',
        topLevel: ['new'],
        mapInArray: [{ data: 'new' }]
      };
      return setDoc(doc, initialData)
        .then(() => setDoc(doc, mergeData, { merge: true }))
        .then(() => getDoc(doc))
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.be.ok;
          expect(docSnapshot.data()).to.deep.equal(finalData);
        });
    });
  });

  it("can't specify a field mask for a missing field using set", () => {
    return withTestDoc(persistence, async docRef => {
      expect(() => {
        void setDoc(
          docRef,
          { desc: 'NewDescription' },
          { mergeFields: ['desc', 'owner'] }
        );
      }).to.throw(
        "Field 'owner' is specified in your field mask but missing from your input data."
      );
    });
  });

  it('can set a subset of fields using a field mask', () => {
    const initialData = {
      desc: 'Description',
      owner: { name: 'Jonny', email: 'abc@xyz.com' }
    };
    const finalData = { desc: 'Description', owner: 'Sebastian' };
    return withTestDocAndInitialData(persistence, initialData, async docRef => {
      await setDoc(
        docRef,
        { desc: 'NewDescription', owner: 'Sebastian' },
        { mergeFields: ['owner'] }
      );
      const result = await getDoc(docRef);
      expect(result.data()).to.deep.equal(finalData);
    });
  });

  it("doesn't apply field delete outside of mask", () => {
    const initialData = {
      desc: 'Description',
      owner: { name: 'Jonny', email: 'abc@xyz.com' }
    };
    const finalData = { desc: 'Description', owner: 'Sebastian' };
    return withTestDocAndInitialData(persistence, initialData, async docRef => {
      await setDoc(
        docRef,
        { desc: deleteField(), owner: 'Sebastian' },
        { mergeFields: ['owner'] }
      );
      const result = await getDoc(docRef);
      expect(result.data()).to.deep.equal(finalData);
    });
  });

  it("doesn't apply field transform outside of mask", () => {
    const initialData = {
      desc: 'Description',
      owner: { name: 'Jonny', email: 'abc@xyz.com' }
    };
    const finalData = { desc: 'Description', owner: 'Sebastian' };
    return withTestDocAndInitialData(persistence, initialData, async docRef => {
      await setDoc(
        docRef,
        {
          desc: serverTimestamp(),
          owner: 'Sebastian'
        },
        { mergeFields: ['owner'] }
      );
      const result = await getDoc(docRef);
      expect(result.data()).to.deep.equal(finalData);
    });
  });

  it('can set an empty field mask', () => {
    const initialData = {
      desc: 'Description',
      owner: { name: 'Jonny', email: 'abc@xyz.com' }
    };
    const finalData = initialData;
    return withTestDocAndInitialData(persistence, initialData, async docRef => {
      await setDoc(
        docRef,
        { desc: 'NewDescription', owner: 'Sebastian' },
        { mergeFields: [] }
      );
      const result = await getDoc(docRef);
      expect(result.data()).to.deep.equal(finalData);
    });
  });

  it('can specify fields multiple times in a field mask', () => {
    const initialData = {
      desc: 'Description',
      owner: { name: 'Jonny', email: 'abc@xyz.com' }
    };
    const finalData = {
      desc: 'Description',
      owner: { name: 'Sebastian', email: 'new@xyz.com' }
    };
    return withTestDocAndInitialData(persistence, initialData, async docRef => {
      await setDoc(
        docRef,
        {
          desc: 'NewDescription',
          owner: { name: 'Sebastian', email: 'new@xyz.com' }
        },
        { mergeFields: ['owner.name', 'owner', 'owner'] }
      );
      const result = await getDoc(docRef);
      expect(result.data()).to.deep.equal(finalData);
    });
  });

  it('cannot update nonexistent document', () => {
    return withTestDoc(persistence, doc => {
      return updateDoc(doc, { owner: 'abc' })
        .then(
          () => Promise.reject('update should have failed.'),
          err => {
            expect(err.message).to.exist;
            expect(err.code).to.equal('not-found');
          }
        )
        .then(() => getDoc(doc))
        .then(docSnapshot => {
          expect(docSnapshot.exists()).to.equal(false);
        });
    });
  });

  it('can delete a field with an update', () => {
    return withTestDoc(persistence, doc => {
      const initialData = {
        desc: 'Description',
        owner: { name: 'Jonny', email: 'abc@xyz.com' }
      };
      const updateData = {
        'owner.email': deleteField()
      };
      const finalData = {
        desc: 'Description',
        owner: { name: 'Jonny' }
      };
      return setDoc(doc, initialData)
        .then(() => updateDoc(doc, updateData))
        .then(() => getDoc(doc))
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.be.ok;
          expect(docSnapshot.data()).to.deep.equal(finalData);
        });
    });
  });

  it('can update nested fields', () => {
    return withTestDoc(persistence, doc => {
      const initialData = {
        desc: 'Description',
        owner: { name: 'Jonny' },
        'is.admin': false
      };
      const finalData = {
        desc: 'Description',
        owner: { name: 'Sebastian' },
        'is.admin': true
      };
      return setDoc(doc, initialData)
        .then(() =>
          updateDoc(
            doc,
            'owner.name',
            'Sebastian',
            new FieldPath('is.admin'),
            true
          )
        )
        .then(() => getDoc(doc))
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.be.ok;
          expect(docSnapshot.data()).to.deep.equal(finalData);
        });
    });
  });

  it('can specify updated field multiple times', () => {
    return withTestDoc(persistence, doc => {
      return setDoc(doc, {})
        .then(() => updateDoc(doc, 'field', 100, new FieldPath('field'), 200))
        .then(() => getDoc(doc))
        .then(docSnap => {
          expect(docSnap.data()).to.deep.equal({ field: 200 });
        });
    });
  });

  describe('vector embeddings', () => {
    it('can write and read vector embeddings', async () => {
      return withTestCollection(persistence, {}, async coll => {
        const ref = await addDoc(coll, {
          vector0: vector([0.0]),
          vector1: vector([1, 2, 3.99])
        });
        await setDoc(ref, {
          vector0: vector([0.0]),
          vector1: vector([1, 2, 3.99]),
          vector2: vector([0, 0, 0])
        });
        await updateDoc(ref, {
          vector3: vector([-1, -200, -999])
        });

        const snap1 = await getDoc(ref);
        expect(snap1.get('vector0').isEqual(vector([0.0]))).to.be.true;
        expect(snap1.get('vector1').isEqual(vector([1, 2, 3.99]))).to.be.true;
        expect(snap1.get('vector2').isEqual(vector([0, 0, 0]))).to.be.true;
        expect(snap1.get('vector3').isEqual(vector([-1, -200, -999]))).to.be
          .true;
      });
    });

    it('can listen to documents with vectors', async () => {
      return withTestCollection(persistence, {}, async randomCol => {
        const ref = doc(randomCol);
        const initialDeferred = new Deferred<void>();
        const createDeferred = new Deferred<void>();
        const setDeferred = new Deferred<void>();
        const updateDeferred = new Deferred<void>();
        const deleteDeferred = new Deferred<void>();

        const expected = [
          initialDeferred,
          createDeferred,
          setDeferred,
          updateDeferred,
          deleteDeferred
        ];
        let idx = 0;
        let document: DocumentSnapshot | null = null;

        const q = query(randomCol, where('purpose', '==', 'vector tests'));
        const unlisten = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
          expected[idx].resolve();
          idx += 1;
          if (snap.docs.length > 0) {
            document = snap.docs[0];
          } else {
            document = null;
          }
        });

        await initialDeferred.promise;
        expect(document).to.be.null;

        await setDoc(ref, {
          purpose: 'vector tests',
          vector0: vector([0.0]),
          vector1: vector([1, 2, 3.99])
        });

        await createDeferred.promise;
        expect(document).to.be.not.null;
        expect(document!.get('vector0').isEqual(vector([0.0]))).to.be.true;
        expect(document!.get('vector1').isEqual(vector([1, 2, 3.99]))).to.be
          .true;

        await setDoc(ref, {
          purpose: 'vector tests',
          vector0: vector([0.0]),
          vector1: vector([1, 2, 3.99]),
          vector2: vector([0, 0, 0])
        });
        await setDeferred.promise;
        expect(document).to.be.not.null;
        expect(document!.get('vector0').isEqual(vector([0.0]))).to.be.true;
        expect(document!.get('vector1').isEqual(vector([1, 2, 3.99]))).to.be
          .true;
        expect(document!.get('vector2').isEqual(vector([0, 0, 0]))).to.be.true;

        await updateDoc(ref, {
          vector3: vector([-1, -200, -999])
        });
        await updateDeferred.promise;
        expect(document).to.be.not.null;
        expect(document!.get('vector0').isEqual(vector([0.0]))).to.be.true;
        expect(document!.get('vector1').isEqual(vector([1, 2, 3.99]))).to.be
          .true;
        expect(document!.get('vector2').isEqual(vector([0, 0, 0]))).to.be.true;
        expect(document!.get('vector3').isEqual(vector([-1, -200, -999]))).to.be
          .true;

        await deleteDoc(ref);
        await deleteDeferred.promise;
        expect(document).to.be.null;

        unlisten();
      });
    });

    it('SDK orders vector field same way as backend', async () => {
      // Test data in the order that we expect the backend to sort it.
      const docsInOrder = [
        { embedding: [1, 2, 3, 4, 5, 6] },
        { embedding: [100] },
        { embedding: vector([Number.NEGATIVE_INFINITY]) },
        { embedding: vector([-100]) },
        { embedding: vector([100]) },
        { embedding: vector([Number.POSITIVE_INFINITY]) },
        { embedding: vector([1, 2]) },
        { embedding: vector([2, 2]) },
        { embedding: vector([1, 2, 3]) },
        { embedding: vector([1, 2, 3, 4]) },
        { embedding: vector([1, 2, 3, 4, 5]) },
        { embedding: vector([1, 2, 100, 4, 4]) },
        { embedding: vector([100, 2, 3, 4, 5]) },
        { embedding: { HELLO: 'WORLD' } },
        { embedding: { hello: 'world' } }
      ];

      const docs = docsInOrder.reduce((obj, doc) => {
        obj[Math.random().toString()] = doc;
        return obj;
      }, {} as { [i: string]: DocumentData });

      return withTestCollection(persistence, docs, async randomCol => {
        // We validate that the SDK orders the vector field the same way as the backend
        // by comparing the sort order of vector fields from getDocsFromServer and
        // onSnapshot. onSnapshot will return sort order of the SDK,
        // and getDocsFromServer will return sort order of the backend.

        const orderedQuery = query(randomCol, orderBy('embedding'));
        const gotInitialSnapshot = new Deferred<QuerySnapshot>();

        const unsubscribe = onSnapshot(
          orderedQuery,
          snapshot => {
            gotInitialSnapshot.resolve(snapshot);
          },
          err => {
            gotInitialSnapshot.reject!(err);
          }
        );

        const watchSnapshot = await gotInitialSnapshot.promise;
        unsubscribe();

        const getSnapshot = await getDocsFromServer(orderedQuery);

        // Compare the snapshot (including sort order) of a snapshot
        // from Query.onSnapshot() to an actual snapshot from Query.get()
        expect(toDataArray(watchSnapshot)).to.deep.equal(
          toDataArray(getSnapshot)
        );

        // Compare the snapshot (including sort order) of a snapshot
        // from Query.onSnapshot() to the expected sort order from
        // the backend.
        expect(toDataArray(watchSnapshot)).to.deep.equal(docsInOrder);
      });
    });

    // eslint-disable-next-line no-restricted-properties
    (persistence.gc === 'lru' ? describe : describe.skip)('From Cache', () => {
      it('SDK orders vector field the same way online and offline', async () => {
        // Test data in the order that we expect the SDK to sort it.
        const docsInOrder = [
          { embedding: [1, 2, 3, 4, 5, 6] },
          { embedding: [100] },
          { embedding: vector([Number.NEGATIVE_INFINITY]) },
          { embedding: vector([-100]) },
          { embedding: vector([100]) },
          { embedding: vector([Number.POSITIVE_INFINITY]) },
          { embedding: vector([1, 2]) },
          { embedding: vector([2, 2]) },
          { embedding: vector([1, 2, 3]) },
          { embedding: vector([1, 2, 3, 4]) },
          { embedding: vector([1, 2, 3, 4, 5]) },
          { embedding: vector([1, 2, 100, 4, 4]) },
          { embedding: vector([100, 2, 3, 4, 5]) },
          { embedding: { HELLO: 'WORLD' } },
          { embedding: { hello: 'world' } }
        ];

        const documentIds: string[] = [];
        const docs = docsInOrder.reduce((obj, doc, index) => {
          const documentId = index.toString();
          documentIds.push(documentId);
          obj[documentId] = doc;
          return obj;
        }, {} as { [i: string]: DocumentData });

        return withTestCollection(persistence, docs, async randomCol => {
          const orderedQuery = query(randomCol, orderBy('embedding'));
          await checkOnlineAndOfflineResultsMatch(
            randomCol,
            orderedQuery,
            ...documentIds
          );

          const orderedQueryLessThan = query(
            randomCol,
            orderBy('embedding'),
            where('embedding', '<', vector([1, 2, 100, 4, 4]))
          );
          await checkOnlineAndOfflineResultsMatch(
            randomCol,
            orderedQueryLessThan,
            ...documentIds.slice(2, 11)
          );

          const orderedQueryGreaterThan = query(
            randomCol,
            orderBy('embedding'),
            where('embedding', '>', vector([1, 2, 100, 4, 4]))
          );
          await checkOnlineAndOfflineResultsMatch(
            randomCol,
            orderedQueryGreaterThan,
            ...documentIds.slice(12, 13)
          );
        });
      });
    });
  });

  describe('documents: ', () => {
    const invalidDocValues = [undefined, null, 0, 'foo', ['a'], new Date()];
    for (const val of invalidDocValues) {
      it('set/update should reject: ' + val, () => {
        return withTestDoc(persistence, async doc => {
          // Intentionally passing bad types.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expect(() => setDoc(doc, val as any)).to.throw();
          // Intentionally passing bad types.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expect(() => updateDoc(doc, val as any)).to.throw();
        });
      });
    }
  });

  it('CollectionRef.add() resolves with resulting DocumentRef.', () => {
    return withTestCollection(persistence, {}, coll => {
      return addDoc(coll, { foo: 1 })
        .then(docRef => getDoc(docRef))
        .then(docSnap => {
          expect(docSnap.data()).to.deep.equal({ foo: 1 });
        });
    });
  });

  it('onSnapshotsInSync fires after listeners are in sync', () => {
    const testDocs = {
      a: { foo: 1 }
    };
    return withTestCollection(persistence, testDocs, async (coll, db) => {
      let events: string[] = [];
      const gotInitialSnapshot = new Deferred<void>();
      const docA = doc(coll, 'a');

      onSnapshot(docA, snap => {
        events.push('doc');
        gotInitialSnapshot.resolve();
      });
      await gotInitialSnapshot.promise;
      events = [];

      const done = new Deferred<void>();
      onSnapshotsInSync(db, () => {
        events.push('snapshots-in-sync');
        if (events.length === 3) {
          // We should have an initial snapshots-in-sync event, then a snapshot
          // event for set(), then another event to indicate we're in sync
          // again.
          expect(events).to.deep.equal([
            'snapshots-in-sync',
            'doc',
            'snapshots-in-sync'
          ]);
          done.resolve();
        }
      });

      await setDoc(docA, { foo: 3 });
      await done.promise;
    });
  });

  apiDescribe('Queries are validated client-side', persistence => {
    // NOTE: Failure cases are validated in validation_test.ts

    it('same inequality fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(coll, where('x', '>=', 32), where('x', '<=', 'cat'))
        ).not.to.throw();
      });
    });

    it('inequality and equality on different fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(coll, where('x', '>=', 32), where('y', '==', 'cat'))
        ).not.to.throw();
      });
    });

    it('inequality on multiple fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(coll, where('x', '>=', 32), where('y', '!=', 'cat'))
        ).not.to.throw();
      });
    });

    it('inequality with key fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(coll, where(documentId(), '>=', 'aa'), where('x', '>=', 32))
        ).not.to.throw();
      });
    });

    it('inequality and array-contains on different fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(coll, where('x', '>=', 32), where('y', 'array-contains', 'cat'))
        ).not.to.throw();
      });
    });

    it('inequality and array-contains-any on different fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(
            coll,
            where('x', '>=', 32),
            where('y', 'array-contains-any', [1, 2])
          )
        ).not.to.throw();
      });
    });

    it('multiple inequality and array-contains on different fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(
            coll,
            where('x', '>=', 32),
            where('y', 'array-contains', 'cat'),
            where('z', '<=', 42)
          )
        ).not.to.throw();
      });
    });

    it('multiple inequality and array-contains-any on different fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(
            coll,
            where('x', '>=', 32),
            where('y', 'array-contains-any', [1, 2]),
            where('z', '<=', 42)
          )
        ).not.to.throw();
      });
    });

    it('inequality and IN on different fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(coll, where('x', '>=', 32), where('y', 'in', [1, 2]))
        ).not.to.throw();
      });
    });

    it('multiple inequality and IN on different fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(
            coll,
            where('x', '>=', 32),
            where('y', 'in', [1, 2]),
            where('z', '<=', 42)
          )
        ).not.to.throw();
      });
    });

    it('inequality and NOT IN on different fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(coll, where('x', '>=', 32), where('y', 'not-in', [1, 2]))
        ).not.to.throw();
      });
    });

    it('multiple inequality and NOT IN on different fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(
            coll,
            where('x', '>=', 32),
            where('y', 'not-in', [1, 2]),
            where('z', '<=', 42)
          )
        ).not.to.throw();
      });
    });

    it('inequality same as orderBy works.', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(coll, where('x', '>', 32), orderBy('x'))
        ).not.to.throw();
        expect(() =>
          query(coll, orderBy('x'), where('x', '>', 32))
        ).not.to.throw();
      });
    });

    it('!= same as orderBy works.', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(coll, where('x', '!=', 32), orderBy('x'))
        ).not.to.throw();
        expect(() =>
          query(coll, orderBy('x'), where('x', '!=', 32))
        ).not.to.throw();
      });
    });

    it('equality different than orderBy works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(coll, orderBy('x'), where('y', '==', 'cat'))
        ).not.to.throw();
      });
    });

    it('inequality different than orderBy works.', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(coll, where('x', '>', 32), orderBy('y'))
        ).not.to.throw();
        expect(() =>
          query(coll, orderBy('y'), where('x', '>', 32))
        ).not.to.throw();
        expect(() =>
          query(coll, where('x', '>', 32), orderBy('y'), orderBy('z'))
        ).not.to.throw();
        expect(() =>
          query(coll, orderBy('y'), where('x', '>', 32), orderBy('x'))
        ).not.to.throw();
      });
    });

    it('multiple inequality different from orderBy works.', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(
            coll,
            where('x', '>', 32),
            where('y', '!=', 'cat'),
            orderBy('z')
          )
        ).not.to.throw();
        expect(() =>
          query(
            coll,
            orderBy('z'),
            where('x', '>', 32),
            where('y', '!=', 'cat')
          )
        ).not.to.throw();
      });
    });

    it('array-contains different than orderBy works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(coll, orderBy('x'), where('y', 'array-contains', 'cat'))
        ).not.to.throw();
      });
    });

    it('IN different than orderBy works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(coll, orderBy('x'), where('y', 'in', [1, 2]))
        ).not.to.throw();
      });
    });

    it('array-contains-any different than orderBy works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          query(coll, orderBy('x'), where('y', 'array-contains-any', [1, 2]))
        ).not.to.throw();
      });
    });
  });

  it('DocumentSnapshot events for nonexistent document', () => {
    return withTestCollection(persistence, {}, col => {
      const docA = doc(col);
      const storeEvent = new EventsAccumulator<DocumentSnapshot>();
      onSnapshot(docA, storeEvent.storeEvent);
      return storeEvent.awaitEvent().then(snap => {
        expect(snap.exists()).to.be.false;
        expect(snap.data()).to.equal(undefined);
        return storeEvent.assertNoAdditionalEvents();
      });
    });
  });

  it('DocumentSnapshot events for add data to document', () => {
    return withTestCollection(persistence, {}, col => {
      const docA = doc(col);
      const storeEvent = new EventsAccumulator<DocumentSnapshot>();
      onSnapshot(docA, { includeMetadataChanges: true }, storeEvent.storeEvent);
      return storeEvent
        .awaitEvent()
        .then(snap => {
          expect(snap.exists()).to.be.false;
          expect(snap.data()).to.equal(undefined);
        })
        .then(() => setDoc(docA, { a: 1 }))
        .then(() => storeEvent.awaitEvent())
        .then(snap => {
          expect(snap.exists()).to.be.true;
          expect(snap.data()).to.deep.equal({ a: 1 });
          expect(snap.metadata.hasPendingWrites).to.be.true;
        })
        .then(() => storeEvent.awaitEvent())
        .then(snap => {
          expect(snap.exists()).to.be.true;
          expect(snap.data()).to.deep.equal({ a: 1 });
          // This event could be a metadata change for fromCache as well.
          // We comment this line out to reduce flakiness.
          // TODO(b/295872012): Figure out a way to check for all scenarios.
          // expect(snap.metadata.hasPendingWrites).to.be.false;
        });
    });
  });

  it('DocumentSnapshot events for change data in document', () => {
    const initialData = { a: 1 };
    const changedData = { b: 2 };

    return withTestCollection(persistence, { key1: initialData }, col => {
      const doc1 = doc(col, 'key1');
      const storeEvent = new EventsAccumulator<DocumentSnapshot>();
      onSnapshot(doc1, { includeMetadataChanges: true }, storeEvent.storeEvent);
      return storeEvent
        .awaitEvent()
        .then(snap => {
          expect(snap.data()).to.deep.equal(initialData);
          expect(snap.metadata.hasPendingWrites).to.be.false;
        })
        .then(() => setDoc(doc1, changedData))
        .then(() => storeEvent.awaitEvent())
        .then(snap => {
          expect(snap.data()).to.deep.equal(changedData);
          expect(snap.metadata.hasPendingWrites).to.be.true;
        })
        .then(() => storeEvent.awaitEvent())
        .then(snap => {
          expect(snap.data()).to.deep.equal(changedData);
          // This event could be a metadata change for fromCache as well.
          // We comment this line out to reduce flakiness.
          // TODO(b/295872012): Figure out a way to check for all scenarios.
          // expect(snap.metadata.hasPendingWrites).to.be.false;
        });
    });
  });

  it('DocumentSnapshot events for delete data in document', () => {
    const initialData = { a: 1 };

    return withTestCollection(persistence, { key1: initialData }, col => {
      const doc1 = doc(col, 'key1');
      const storeEvent = new EventsAccumulator<DocumentSnapshot>();
      onSnapshot(doc1, { includeMetadataChanges: true }, storeEvent.storeEvent);
      return storeEvent
        .awaitEvent()
        .then(snap => {
          expect(snap.exists()).to.be.true;
          expect(snap.data()).to.deep.equal(initialData);
          expect(snap.metadata.hasPendingWrites).to.be.false;
        })
        .then(() => deleteDoc(doc1))
        .then(() => storeEvent.awaitEvent())
        .then(snap => {
          expect(snap.exists()).to.be.false;
          expect(snap.data()).to.equal(undefined);
          expect(snap.metadata.hasPendingWrites).to.be.false;
        })
        .then(() => storeEvent.assertNoAdditionalEvents());
    });
  });

  it('Listen can be called multiple times', () => {
    return withTestCollection(persistence, {}, coll => {
      const docA = doc(coll);
      const deferred1 = new Deferred<void>();
      const deferred2 = new Deferred<void>();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      setDoc(docA, { foo: 'bar' }).then(() => {
        onSnapshot(docA, () => {
          deferred1.resolve();
          onSnapshot(docA, () => deferred2.resolve());
        });
      });
      return Promise.all([deferred1.promise, deferred2.promise]).then(() => {});
    });
  });

  it('Metadata only changes are not fired when no options provided', () => {
    return withTestDoc(persistence, docRef => {
      const secondUpdateFound = new Deferred();
      let count = 0;
      const unlisten = onSnapshot(docRef, doc => {
        if (doc) {
          count++;
          if (count === 1) {
            expect(doc.data()).to.deep.equal({ a: 1 });
          } else {
            expect(doc.data()).to.deep.equal({ b: 1 });
            secondUpdateFound.resolve();
          }
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      setDoc(docRef, { a: 1 }).then(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        setDoc(docRef, { b: 1 });
      });
      return secondUpdateFound.promise.then(() => {
        unlisten();
      });
    });
  });

  // TODO(mikelehen): We need a way to create a query that will pass
  // client-side validation but fail remotely.  May need to wait until we
  // have security rules support or something?
  // eslint-disable-next-line no-restricted-properties
  describe('Listens are rejected remotely:', () => {
    it('will reject listens', () => {
      return withTestDb(persistence, async db => {
        const deferred = new Deferred();
        const queryForRejection = collection(db, 'a/__badpath__/b');
        onSnapshot(
          queryForRejection,
          () => {},
          (err: Error) => {
            expect(err.name).to.exist;
            expect(err.message).to.exist;
            deferred.resolve();
          }
        );
        await deferred.promise;
      });
    });

    it('will reject same listens twice in a row', () => {
      return withTestDb(persistence, async db => {
        const deferred = new Deferred();
        const queryForRejection = collection(db, 'a/__badpath__/b');
        onSnapshot(
          queryForRejection,
          () => {},
          (err: Error) => {
            expect(err.name).to.exist;
            expect(err.message).to.exist;
            onSnapshot(
              queryForRejection,
              () => {},
              (err2: Error) => {
                expect(err2.name).to.exist;
                expect(err2.message).to.exist;
                deferred.resolve();
              }
            );
          }
        );
        await deferred.promise;
      });
    });

    it('will reject gets', () => {
      return withTestDb(persistence, async db => {
        const queryForRejection = collection(db, 'a/__badpath__/b');
        await getDocs(queryForRejection).then(
          () => {
            expect.fail('Promise resolved even though error was expected.');
          },
          err => {
            expect(err.name).to.exist;
            expect(err.message).to.exist;
          }
        );
      });
    });

    it('will reject gets twice in a row', () => {
      return withTestDb(persistence, async db => {
        const queryForRejection = collection(db, 'a/__badpath__/b');
        return getDocs(queryForRejection)
          .then(
            () => {
              expect.fail('Promise resolved even though error was expected.');
            },
            err => {
              expect(err.name).to.exist;
              expect(err.message).to.exist;
            }
          )
          .then(() => getDocs(queryForRejection))
          .then(
            () => {
              expect.fail('Promise resolved even though error was expected.');
            },
            err => {
              expect(err.name).to.exist;
              expect(err.message).to.exist;
            }
          );
      });
    });
  });

  it('exposes "firestore" on document references.', () => {
    return withTestDb(persistence, async db => {
      expect(doc(db, 'foo/bar').firestore).to.equal(db);
    });
  });

  it('exposes "firestore" on query references.', () => {
    return withTestDb(persistence, async db => {
      expect(query(collection(db, 'foo'), limit(5)).firestore).to.equal(db);
    });
  });

  it('can compare DocumentReference instances with isEqual().', () => {
    return withTestDb(persistence, firestore => {
      return withTestDb(persistence, async otherFirestore => {
        const docRef = doc(firestore, 'foo/bar');
        expect(refEqual(docRef, doc(firestore, 'foo/bar'))).to.be.true;
        expect(refEqual(collection(docRef, 'baz').parent!, docRef)).to.be.true;

        expect(refEqual(doc(firestore, 'foo/BAR'), docRef)).to.be.false;

        expect(refEqual(doc(otherFirestore, 'foo/bar'), docRef)).to.be.false;
      });
    });
  });

  it('can compare Query instances with isEqual().', () => {
    return withTestDb(persistence, firestore => {
      return withTestDb(persistence, async otherFirestore => {
        const query1 = query(
          collection(firestore, 'foo'),
          orderBy('bar'),
          where('baz', '==', 42)
        );
        const query2 = query(
          collection(firestore, 'foo'),
          orderBy('bar'),
          where('baz', '==', 42)
        );
        expect(queryEqual(query1, query2)).to.be.true;

        const query3 = query(
          collection(firestore, 'foo'),
          orderBy('BAR'),
          where('baz', '==', 42)
        );
        expect(queryEqual(query1, query3)).to.be.false;

        const query4 = query(
          collection(otherFirestore, 'foo'),
          orderBy('bar'),
          where('baz', '==', 42)
        );
        expect(queryEqual(query4, query1)).to.be.false;
      });
    });
  });

  it('can compare multiple inequality Query instances with isEqual().', () => {
    return withTestDb(persistence, async firestore => {
      const query1 = query(
        collection(firestore, 'foo'),
        where('x', '>=', 42),
        where('y', '!=', 42),
        orderBy('z')
      );
      const query2 = query(
        collection(firestore, 'foo'),
        where('x', '>=', 42),
        where('y', '!=', 42),
        orderBy('z')
      );
      expect(queryEqual(query1, query2)).to.be.true;

      // Inequality fields in different order
      const query3 = query(
        collection(firestore, 'foo'),
        where('y', '!=', 42),
        where('x', '>=', 42),
        orderBy('z')
      );
      expect(queryEqual(query1, query3)).to.be.false;
    });
  });

  it('can traverse collections and documents.', () => {
    return withTestDb(persistence, async db => {
      const expected = 'a/b/c/d';
      // doc path from root Firestore.
      expect(doc(db, 'a/b/c/d').path).to.deep.equal(expected);
      // collection path from root Firestore.
      expect(doc(collection(db, 'a/b/c'), 'd').path).to.deep.equal(expected);
      // doc path from CollectionReference.
      expect(doc(collection(db, 'a'), 'b/c/d').path).to.deep.equal(expected);
      // collection path from DocumentReference.
      expect(collection(doc(db, 'a/b'), 'c/d/e').path).to.deep.equal(
        expected + '/e'
      );
    });
  });

  it('can traverse collection and document parents.', () => {
    return withTestDb(persistence, async db => {
      let coll = collection(db, 'a/b/c');
      expect(coll.path).to.deep.equal('a/b/c');

      const doc = coll.parent!;
      expect(doc.path).to.deep.equal('a/b');

      coll = doc.parent;
      expect(coll.path).to.equal('a');

      const nullDoc = coll.parent;
      expect(nullDoc).to.equal(null);
    });
  });

  it('can queue writes while offline', () => {
    return withTestDoc(persistence, (docRef, firestore) => {
      return disableNetwork(firestore)
        .then(() =>
          Promise.all([
            setDoc(docRef, { foo: 'bar' }),
            enableNetwork(firestore)
          ])
        )
        .then(() => getDoc(docRef))
        .then(doc => {
          expect(doc.data()).to.deep.equal({ foo: 'bar' });
        });
    });
  });

  // eslint-disable-next-line no-restricted-properties
  (persistence.storage === 'indexeddb' ? it : it.skip)(
    'offline writes are sent after restart',
    () => {
      return withTestDoc(persistence, async (docRef, firestore) => {
        const app = firestore.app;
        const name = app.name;
        const options = app.options;

        await disableNetwork(firestore);

        // We are merely adding to the cache.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        setDoc(docRef, { foo: 'bar' });

        await deleteApp(app);

        const firestore2 = newTestFirestore(
          newTestApp(options.projectId!, name),
          DEFAULT_SETTINGS,
          firestore._databaseId.database
        );
        await enableIndexedDbPersistence(firestore2);
        await waitForPendingWrites(firestore2);
        const doc2 = await getDoc(doc(firestore2, docRef.path));

        expect(doc2.exists()).to.be.true;
        expect(doc2.metadata.hasPendingWrites).to.be.false;
      });
    }
  );

  it('rejects subsequent method calls after terminate() is called', async () => {
    return withTestDb(persistence, db => {
      return terminate(db).then(() => {
        expect(() => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          disableNetwork(db);
        }).to.throw('The client has already been terminated.');
      });
    });
  });

  it('can call terminate() multiple times', async () => {
    return withTestDb(persistence, async db => {
      await terminate(db);
      await terminate(db);
    });
  });

  // eslint-disable-next-line no-restricted-properties
  (persistence.storage === 'indexeddb' ? it : it.skip)(
    'maintains persistence after restarting app',
    async () => {
      await withTestDoc(persistence, async docRef => {
        await setDoc(docRef, { foo: 'bar' });
        const app = docRef.firestore.app;
        const name = app.name;
        const options = app.options;

        await deleteApp(app);

        const firestore2 = newTestFirestore(
          newTestApp(options.projectId!, name),
          undefined,
          docRef.firestore._databaseId.database
        );
        await enableIndexedDbPersistence(firestore2);
        const docRef2 = doc(firestore2, docRef.path);
        const docSnap2 = await getDocFromCache(docRef2);
        expect(docSnap2.exists()).to.be.true;
      });
    }
  );

  // eslint-disable-next-line no-restricted-properties
  (persistence.storage === 'indexeddb' ? it : it.skip)(
    'can clear persistence if the client has been terminated',
    async () => {
      await withTestDoc(persistence, async (docRef, firestore) => {
        await setDoc(docRef, { foo: 'bar' });
        const app = docRef.firestore.app;
        const name = app.name;
        const options = app.options;

        await deleteApp(app);
        await clearIndexedDbPersistence(firestore);
        const firestore2 = newTestFirestore(
          newTestApp(options.projectId!, name)
        );
        await enableIndexedDbPersistence(firestore2);
        const docRef2 = doc(firestore2, docRef.path);
        await expect(getDocFromCache(docRef2)).to.eventually.be.rejectedWith(
          'Failed to get document from cache.'
        );
      });
    }
  );

  // eslint-disable-next-line no-restricted-properties
  (persistence.storage === 'indexeddb' ? it : it.skip)(
    'can clear persistence if the client has not been initialized',
    async () => {
      await withTestDoc(persistence, async docRef => {
        await setDoc(docRef, { foo: 'bar' });
        const app = docRef.firestore.app;
        const name = app.name;
        const options = app.options;

        await deleteApp(app);
        const firestore2 = newTestFirestore(
          newTestApp(options.projectId!, name)
        );
        await clearIndexedDbPersistence(firestore2);
        await enableIndexedDbPersistence(firestore2);
        const docRef2 = doc(firestore2, docRef.path);
        await expect(getDocFromCache(docRef2)).to.eventually.be.rejectedWith(
          'Failed to get document from cache.'
        );
      });
    }
  );

  // eslint-disable-next-line no-restricted-properties
  (persistence.storage === 'indexeddb' ? it : it.skip)(
    'cannot clear persistence if the client has been initialized',
    async () => {
      await withTestDoc(persistence, async (docRef, firestore) => {
        await setDoc(docRef, {});
        const expectedError =
          'Persistence can only be cleared before a Firestore instance is ' +
          'initialized or after it is terminated.';
        expect(() => clearIndexedDbPersistence(firestore)).to.throw(
          expectedError
        );
      });
    }
  );

  it('can get documents while offline', async () => {
    await withTestDoc(persistence, async (docRef, firestore) => {
      await disableNetwork(firestore);
      await expect(getDoc(docRef)).to.eventually.be.rejectedWith(
        'Failed to get document because the client is offline.'
      );

      const writePromise = setDoc(docRef, { foo: 'bar' });
      const doc = await getDoc(docRef);
      expect(doc.metadata.fromCache).to.be.true;

      await enableNetwork(firestore);
      await writePromise;

      const doc2 = await getDoc(docRef);
      expect(doc2.metadata.fromCache).to.be.false;
      expect(doc2.data()).to.deep.equal({ foo: 'bar' });
    });
  });

  it('can enable and disable networking', () => {
    return withTestDb(persistence, async db => {
      // There's not currently a way to check if networking is in fact disabled,
      // so for now just test that the method is well-behaved and doesn't throw.
      await enableNetwork(db);
      await enableNetwork(db);
      await disableNetwork(db);
      await disableNetwork(db);
      await enableNetwork(db);
    });
  });

  it('can start a new instance after shut down', async () => {
    return withTestDoc(persistence, async (docRef, firestore) => {
      const app = firestore.app;
      await terminate(firestore);

      const newFirestore = initializeFirestore(app, DEFAULT_SETTINGS);
      expect(newFirestore).to.not.equal(firestore);

      // New instance functions.
      const docRef2 = doc(newFirestore, docRef.path);
      await setDoc(docRef2, { foo: 'bar' });
      const docSnap = await getDoc(docRef2);
      expect(docSnap.data()).to.deep.equal({ foo: 'bar' });
    });
  });

  it('new operation after termination should throw', async () => {
    await withTestDoc(persistence, async (docRef, firestore) => {
      await terminate(firestore);

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        setDoc(doc(firestore, docRef.path), { foo: 'bar' });
      }).to.throw('The client has already been terminated.');
    });
  });

  it('calling terminate multiple times should proceed', async () => {
    await withTestDoc(persistence, async (docRef, firestore) => {
      await terminate(firestore);
      await terminate(firestore);

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        setDoc(doc(firestore, docRef.path), { foo: 'bar' });
      }).to.throw();
    });
  });

  it('can unlisten queries after termination', async () => {
    return withTestDoc(persistence, async (docRef, firestore) => {
      const accumulator = new EventsAccumulator<DocumentSnapshot>();
      const unsubscribe = onSnapshot(docRef, accumulator.storeEvent);
      await accumulator.awaitEvent();
      await terminate(firestore);

      // This should proceed without error.
      unsubscribe();
      // Multiple calls should proceed as well.
      unsubscribe();
    });
  });

  it('can query after firestore restart', async () => {
    return withTestDoc(persistence, async (docRef, firestore) => {
      const deferred: Deferred<FirestoreError> = new Deferred();
      const unsubscribe = onSnapshot(docRef, snapshot => {}, deferred.resolve);

      await firestore._restart();

      await expect(deferred.promise)
        .to.eventually.haveOwnProperty('message')
        .equal('Firestore shutting down');

      // Call should proceed without error.
      unsubscribe();

      await setDoc(docRef, { foo: 'bar' });
      const docSnap = await getDoc(docRef);
      expect(docSnap.data()).to.deep.equal({ foo: 'bar' });
    });
  });

  it('query listener throws error on termination', async () => {
    return withTestDoc(persistence, async (docRef, firestore) => {
      const deferred: Deferred<FirestoreError> = new Deferred();
      const unsubscribe = onSnapshot(docRef, snapshot => {}, deferred.resolve);

      await terminate(firestore);

      await expect(deferred.promise)
        .to.eventually.haveOwnProperty('message')
        .equal('Firestore shutting down');

      // Call should proceed without error.
      unsubscribe();
    });
  });

  it('can wait for pending writes', async () => {
    await withTestDoc(persistence, async (docRef, firestore) => {
      // Prevent pending writes receiving acknowledgement.
      await disableNetwork(firestore);

      const pendingWrites = setDoc(docRef, { foo: 'bar' });
      const awaitPendingWrites = waitForPendingWrites(firestore);

      // pending writes can receive acknowledgements now.
      await enableNetwork(firestore);
      await pendingWrites;
      await awaitPendingWrites;
    });
  });

  it('waiting for pending writes resolves immediately when offline and no pending writes', async () => {
    await withTestDoc(persistence, async (docRef, firestore) => {
      // Prevent pending writes receiving acknowledgement.
      await disableNetwork(firestore);

      // `awaitsPendingWrites` is created when there is no pending writes, it will resolve
      // immediately even if we are offline.
      await waitForPendingWrites(firestore);
    });
  });

  // PORTING NOTE: These tests are for FirestoreDataConverter support and apply
  // only to web.
  apiDescribe('withConverter() support', persistence => {
    class Post {
      constructor(
        readonly title: string,
        readonly author: string,
        readonly ref: DocumentReference | null = null
      ) {}
      byline(): string {
        return this.title + ', by ' + this.author;
      }
    }

    const postConverter = {
      toFirestore(post: Post): DocumentData {
        return { title: post.title, author: post.author };
      },
      fromFirestore(snapshot: QueryDocumentSnapshot): Post {
        expect(snapshot).to.be.an.instanceof(QueryDocumentSnapshot);
        const data = snapshot.data();
        return new Post(data.title, data.author, snapshot.ref);
      }
    };

    const postConverterMerge = {
      toFirestore(
        post: WithFieldValue<Post>,
        options?: SetOptions
      ): DocumentData {
        if (options && ('merge' in options || 'mergeFields' in options)) {
          expect(post).to.not.be.an.instanceof(Post);
        } else {
          expect(post).to.be.an.instanceof(Post);
        }
        const result: DocumentData = {};
        if (post.title) {
          result.title = post.title;
        }
        if (post.author) {
          result.author = post.author;
        }
        return result;
      },
      fromFirestore(snapshot: QueryDocumentSnapshot): Post {
        const data = snapshot.data();
        return new Post(data.title, data.author, snapshot.ref);
      }
    };

    it('for DocumentReference.withConverter()', () => {
      return withTestDb(persistence, async db => {
        const docRef = doc(collection(db, 'posts')).withConverter(
          postConverter
        );

        await setDoc(docRef, new Post('post', 'author'));
        const postData = await getDoc(docRef);
        const post = postData.data();
        expect(post).to.not.equal(undefined);
        expect(post!.byline()).to.equal('post, by author');
      });
    });

    it('for DocumentReference.withConverter(null) ', () => {
      return withTestDb(persistence, async db => {
        const docRef = doc(collection(db, 'posts'))
          .withConverter(postConverter)
          .withConverter(null);

        expect(() => setDoc(docRef, new Post('post', 'author'))).to.throw();
      });
    });

    it('for CollectionReference.withConverter()', () => {
      return withTestDb(persistence, async db => {
        const coll = collection(db, 'posts').withConverter(postConverter);

        const docRef = await addDoc(coll, new Post('post', 'author'));
        const postData = await getDoc(docRef);
        const post = postData.data();
        expect(post).to.not.equal(undefined);
        expect(post!.byline()).to.equal('post, by author');
      });
    });

    it('for CollectionReference.withConverter(null)', () => {
      return withTestDb(persistence, async db => {
        const coll = collection(db, 'posts')
          .withConverter(postConverter)
          .withConverter(null);

        expect(() => addDoc(coll, new Post('post', 'author'))).to.throw();
      });
    });

    it('for Query.withConverter()', () => {
      return withTestDb(persistence, async db => {
        await setDoc(doc(db, 'postings/post1'), {
          title: 'post1',
          author: 'author1'
        });
        await setDoc(doc(db, 'postings/post2'), {
          title: 'post2',
          author: 'author2'
        });
        const posts = await getDocs(
          collectionGroup(db, 'postings').withConverter(postConverter)
        );
        expect(posts.size).to.equal(2);
        expect(posts.docs[0].data()!.byline()).to.equal('post1, by author1');
      });
    });

    it('for Query.withConverter(null)', () => {
      return withTestDb(persistence, async db => {
        await setDoc(doc(db, 'postings/post1'), {
          title: 'post1',
          author: 'author1'
        });
        const posts = await getDocs(
          collectionGroup(db, 'postings')
            .withConverter(postConverter)
            .withConverter(null)
        );
        expect(posts.docs[0].data()).to.not.be.an.instanceof(Post);
      });
    });

    it('requires the correct converter for Partial usage', async () => {
      return withTestDb(persistence, async db => {
        const ref = doc(db, 'posts', 'some-post').withConverter(postConverter);
        await setDoc(ref, new Post('walnut', 'author'));
        const batch = writeBatch(db);
        expect(() =>
          batch.set(ref, { title: 'olive' }, { merge: true })
        ).to.throw(
          'Function WriteBatch.set() called with invalid ' +
            'data (via `toFirestore()`). Unsupported field value: undefined ' +
            '(found in field author in document posts/some-post)'
        );
      });
    });

    it('WriteBatch.set() supports partials with merge', async () => {
      return withTestDb(persistence, async db => {
        const ref = doc(collection(db, 'posts')).withConverter(
          postConverterMerge
        );
        await setDoc(ref, new Post('walnut', 'author'));
        const batch = writeBatch(db);
        batch.set(ref, { title: 'olive' }, { merge: true });
        await batch.commit();
        const docSnap = await getDoc(ref);
        expect(docSnap.get('title')).to.equal('olive');
        expect(docSnap.get('author')).to.equal('author');
      });
    });

    it('WriteBatch.set() supports partials with mergeFields', async () => {
      return withTestDb(persistence, async db => {
        const ref = doc(collection(db, 'posts')).withConverter(
          postConverterMerge
        );
        await setDoc(ref, new Post('walnut', 'author'));
        const batch = writeBatch(db);
        batch.set(
          ref,
          { title: 'olive', author: 'writer' },
          { mergeFields: ['title'] }
        );
        await batch.commit();
        const docSnap = await getDoc(ref);
        expect(docSnap.get('title')).to.equal('olive');
        expect(docSnap.get('author')).to.equal('author');
      });
    });

    it('Transaction.set() supports partials with merge', async () => {
      return withTestDb(persistence, async db => {
        const ref = doc(collection(db, 'posts')).withConverter(
          postConverterMerge
        );
        await setDoc(ref, new Post('walnut', 'author'));
        await runTransaction(db, async tx => {
          tx.set(ref, { title: 'olive' }, { merge: true });
        });
        const docSnap = await getDoc(ref);
        expect(docSnap.get('title')).to.equal('olive');
        expect(docSnap.get('author')).to.equal('author');
      });
    });

    it('Transaction.set() supports partials with mergeFields', async () => {
      return withTestDb(persistence, async db => {
        const ref = doc(collection(db, 'posts')).withConverter(
          postConverterMerge
        );
        await setDoc(ref, new Post('walnut', 'author'));
        await runTransaction(db, async tx => {
          tx.set(
            ref,
            { title: 'olive', author: 'person' },
            { mergeFields: ['title'] }
          );
        });
        const docSnap = await getDoc(ref);
        expect(docSnap.get('title')).to.equal('olive');
        expect(docSnap.get('author')).to.equal('author');
      });
    });

    it('DocumentReference.set() supports partials with merge', async () => {
      return withTestDb(persistence, async db => {
        const ref = doc(collection(db, 'posts')).withConverter(
          postConverterMerge
        );
        await setDoc(ref, new Post('walnut', 'author'));
        await setDoc(ref, { title: 'olive' }, { merge: true });
        const docSnap = await getDoc(ref);
        expect(docSnap.get('title')).to.equal('olive');
        expect(docSnap.get('author')).to.equal('author');
      });
    });

    it('DocumentReference.set() supports partials with mergeFields', async () => {
      return withTestDb(persistence, async db => {
        const ref = doc(collection(db, 'posts')).withConverter(
          postConverterMerge
        );
        await setDoc(ref, new Post('walnut', 'author'));
        await setDoc(
          ref,
          { title: 'olive', author: 'writer' },
          { mergeFields: ['title'] }
        );
        const docSnap = await getDoc(ref);
        expect(docSnap.get('title')).to.equal('olive');
        expect(docSnap.get('author')).to.equal('author');
      });
    });

    it('calls DocumentSnapshot.data() with specified SnapshotOptions', () => {
      return withTestDb(persistence, async db => {
        const docRef = doc(db, 'some/doc').withConverter({
          toFirestore(post: Post): DocumentData {
            return { title: post.title, author: post.author };
          },
          fromFirestore(snapshot: QueryDocumentSnapshot): Post {
            // Hack: Due to our build setup, TypeScript thinks this is a
            // firestore-lite converter which does not have options
            const options = arguments[1] as SnapshotOptions;
            // Check that options were passed in properly.
            expect(options).to.deep.equal({ serverTimestamps: 'estimate' });

            const data = snapshot.data(options);
            return new Post(data.title, data.author, snapshot.ref);
          }
        });

        await setDoc(docRef, new Post('post', 'author'));
        const postData = await getDoc(docRef);
        postData.data({ serverTimestamps: 'estimate' });
      });
    });

    it('drops the converter when calling CollectionReference<T>.parent()', () => {
      return withTestDb(persistence, async db => {
        const postsCollection = collection(
          db,
          'users/user1/posts'
        ).withConverter(postConverter);

        const usersCollection = postsCollection.parent;
        expect(refEqual(usersCollection!, doc(db, 'users/user1'))).to.be.true;
      });
    });

    it('checks converter when comparing with isEqual()', () => {
      return withTestDb(persistence, async db => {
        const postConverter2 = { ...postConverter };

        const postsCollection = collection(
          db,
          'users/user1/posts'
        ).withConverter(postConverter);
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

    it('Correct snapshot specified to fromFirestore() when registered with DocumentReference', () => {
      return withTestDb(persistence, async db => {
        const untypedDocRef = doc(collection(db, '/models'));
        const docRef = untypedDocRef.withConverter(postConverter);
        await setDoc(docRef, new Post('post', 'author'));
        const docSnapshot = await getDoc(docRef);
        const ref = docSnapshot.data()!.ref!;
        expect(ref).to.be.an.instanceof(DocumentReference);
        expect(refEqual(untypedDocRef, ref)).to.be.true;
      });
    });

    it('Correct snapshot specified to fromFirestore() when registered with CollectionReference', () => {
      return withTestDb(persistence, async db => {
        const untypedCollection = collection(
          doc(collection(db, '/models')),
          'sub'
        );
        const typedCollection = untypedCollection.withConverter(postConverter);
        const docRef = doc(typedCollection);
        await setDoc(docRef, new Post('post', 'author', docRef));
        const querySnapshot = await getDocs(typedCollection);
        expect(querySnapshot.size).to.equal(1);
        const ref = querySnapshot.docs[0].data().ref!;
        expect(ref).to.be.an.instanceof(DocumentReference);
        const untypedDocRef = doc(untypedCollection, docRef.id);
        expect(refEqual(untypedDocRef, ref)).to.be.true;
      });
    });

    it('Correct snapshot specified to fromFirestore() when registered with Query', () => {
      return withTestDb(persistence, async db => {
        const untypedCollection = collection(db, '/models');
        const untypedDocRef = doc(untypedCollection);
        const docRef = untypedDocRef.withConverter(postConverter);
        await setDoc(docRef, new Post('post', 'author', docRef));
        const filteredQuery = query(
          untypedCollection,
          where(documentId(), '==', docRef.id)
        ).withConverter(postConverter);
        const querySnapshot = await getDocs(filteredQuery);
        expect(querySnapshot.size).to.equal(1);
        const ref = querySnapshot.docs[0].data().ref!;
        expect(ref).to.be.an.instanceof(DocumentReference);
        expect(refEqual(untypedDocRef, ref)).to.be.true;
      });
    });

    it('DocumentReference.withConverter() default DbModelType', () => {
      const converter = {
        toFirestore: (value: number) => {
          return { value };
        },
        fromFirestore: (snapshot: QueryDocumentSnapshot) => {
          return snapshot.data()['value'] as number;
        }
      };
      return withTestDoc(persistence, async docRef => {
        // The line below should compile since the DbModelType type parameter of
        // DocumentReference.withConverter() has a default value.
        const typedDocRef = docRef.withConverter<number>(converter);
        await setDoc(typedDocRef, 42);
        const snapshot = await getDoc(typedDocRef);
        expect(snapshot.data()).to.equal(42);
      });
    });

    it('CollectionReference.withConverter() default DbModelType', () => {
      const converter = {
        toFirestore: (value: number) => {
          return { value };
        },
        fromFirestore: (snapshot: QueryDocumentSnapshot) => {
          return snapshot.data()['value'] as number;
        }
      };
      const testDocs = { doc1: { value: 42 } };
      return withTestCollection(persistence, testDocs, async collectionRef => {
        // The line below should compile since the DbModelType type parameter of
        // CollectionReference.withConverter() has a default value.
        const typedCollectionRef =
          collectionRef.withConverter<number>(converter);
        const snapshot = await getDocs(typedCollectionRef);
        expect(snapshot.size).to.equal(1);
        expect(snapshot.docs[0].data()).to.equal(42);
      });
    });

    it('Query.withConverter() default DbModelType', () => {
      const converter = {
        toFirestore: (value: number) => {
          return { value };
        },
        fromFirestore: (snapshot: QueryDocumentSnapshot) => {
          return snapshot.data()['value'] as number;
        }
      };
      const testDocs = { doc1: { value: 42 } };
      return withTestCollection(persistence, testDocs, async collectionRef => {
        const query_ = query(collectionRef, where('value', '==', 42));
        // The line below should compile since the DbModelType type parameter of
        // Query.withConverter() has a default value.
        const typedQuery = query_.withConverter<number>(converter);
        const snapshot = await getDocs(typedQuery);
        expect(snapshot.size).to.equal(1);
        expect(snapshot.docs[0].data()).to.equal(42);
      });
    });
  });

  // TODO(b/196858864): This test regularly times out on CI.
  // eslint-disable-next-line no-restricted-properties
  it.skip('can set and get data with auto detect long polling enabled', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      experimentalAutoDetectLongPolling: true
    };

    return withTestDbsSettings(
      persistence,
      DEFAULT_PROJECT_ID,
      settings,
      1,
      async ([db]) => {
        const data = { name: 'Rafi', email: 'abc@xyz.com' };
        const ref = await doc(collection(db, 'users'));

        return setDoc(ref, data)
          .then(() => getDoc(ref))
          .then(snapshot => {
            expect(snapshot.exists()).to.be.ok;
            expect(snapshot.data()).to.deep.equal(data);
          });
      }
    );
  });

  it('can keep docs separate with multi-db when online', () => {
    return withNamedTestDbsOrSkipUnlessUsingEmulator(
      persistence,
      ['db1', 'db2'],
      async ([db1, db2]) => {
        const data = { name: 'Rafi', email: 'abc@xyz.com' };

        const ref1 = await doc(collection(db1, 'users'), 'doc1');
        await setDoc(ref1, data);
        const snapshot1 = await getDoc(ref1);
        expect(snapshot1.exists()).to.be.ok;
        expect(snapshot1.data()).to.be.deep.equals(data);

        const ref2 = await doc(collection(db2, 'users'), 'doc1');
        const snapshot2 = await getDocFromServer(ref2);
        expect(snapshot2.exists()).to.not.be.ok;
      }
    );
  });

  it('can keep docs separate with multi-db when offline', () => {
    return withNamedTestDbsOrSkipUnlessUsingEmulator(
      persistence,
      ['db1', 'db2'],
      async ([db1, db2]) => {
        await disableNetwork(db1);
        await disableNetwork(db2);
        const data = { name: 'Rafi', email: 'abc@xyz.com' };

        const ref1 = await doc(collection(db1, 'users'));
        void setDoc(ref1, data);
        const snapshot = await getDocFromCache(ref1);
        expect(snapshot.exists()).to.be.ok;
        expect(snapshot.data()).to.be.deep.equals(data);

        const ref2 = await doc(collection(db2, 'users'));
        await expect(getDocFromCache(ref2)).to.eventually.rejectedWith(
          'Failed to get document from cache.'
        );
      }
    );
  });

  it('Cannot get document from cache with eager GC enabled.', () => {
    const initialData = { key: 'value' };
    return withTestDb(persistence.toEagerGc(), async db => {
      const docRef = doc(collection(db, 'test-collection'));
      await setDoc(docRef, initialData);
      await expect(getDocFromCache(docRef)).to.be.rejectedWith('Failed to get');
    });
  });

  it('Can get document from cache with Lru GC enabled.', () => {
    const initialData = { key: 'value' };
    return withTestDb(persistence.toLruGc(), async db => {
      const docRef = doc(collection(db, 'test-collection'));
      await setDoc(docRef, initialData);
      return getDocFromCache(docRef).then(doc => {
        expect(doc.exists()).to.be.true;
        expect(doc.metadata.fromCache).to.be.true;
        expect(doc.data()).to.deep.equal(initialData);
      });
    });
  });

  it('Lru GC is enabled by default.', () => {
    const initialData = { key: 'value' };
    return withTestDb(persistence, async db => {
      const docRef = doc(collection(db, 'test-collection'));
      await setDoc(docRef, initialData);
      return getDocFromCache(docRef).then(doc => {
        expect(doc.exists()).to.be.true;
        expect(doc.metadata.fromCache).to.be.true;
        expect(doc.data()).to.deep.equal(initialData);
      });
    });
  });

  describe('sort documents by DocumentId', () => {
    it('snapshot listener sorts query by DocumentId same way as get query', async () => {
      const testDocs = {
        'A': { a: 1 },
        'a': { a: 1 },
        'Aa': { a: 1 },
        '7': { a: 1 },
        '12': { a: 1 },
        '__id7__': { a: 1 },
        '__id12__': { a: 1 },
        '__id-2__': { a: 1 },
        '_id1__': { a: 1 },
        '__id1_': { a: 1 },
        '__id': { a: 1 },
        // largest long numbers
        '__id9223372036854775807__': { a: 1 },
        '__id9223372036854775806__': { a: 1 },
        // smallest long numbers
        '__id-9223372036854775808__': { a: 1 },
        '__id-9223372036854775807__': { a: 1 }
      };

      return withTestCollection(persistence, testDocs, async collectionRef => {
        const orderedQuery = query(collectionRef, orderBy(documentId()));
        const expectedDocs = [
          '__id-9223372036854775808__',
          '__id-9223372036854775807__',
          '__id-2__',
          '__id7__',
          '__id12__',
          '__id9223372036854775806__',
          '__id9223372036854775807__',
          '12',
          '7',
          'A',
          'Aa',
          '__id',
          '__id1_',
          '_id1__',
          'a'
        ];

        const getSnapshot = await getDocsFromServer(orderedQuery);
        expect(toIds(getSnapshot)).to.deep.equal(expectedDocs);

        const storeEvent = new EventsAccumulator<QuerySnapshot>();
        const unsubscribe = onSnapshot(orderedQuery, storeEvent.storeEvent);
        const watchSnapshot = await storeEvent.awaitEvent();
        expect(toIds(watchSnapshot)).to.deep.equal(expectedDocs);

        unsubscribe();
      });
    });

    it('snapshot listener sorts filtered query by DocumentId same way as get query', async () => {
      const testDocs = {
        'A': { a: 1 },
        'a': { a: 1 },
        'Aa': { a: 1 },
        '7': { a: 1 },
        '12': { a: 1 },
        '__id7__': { a: 1 },
        '__id12__': { a: 1 },
        '__id-2__': { a: 1 },
        '_id1__': { a: 1 },
        '__id1_': { a: 1 },
        '__id': { a: 1 },
        // largest long numbers
        '__id9223372036854775807__': { a: 1 },
        '__id9223372036854775806__': { a: 1 },
        // smallest long numbers
        '__id-9223372036854775808__': { a: 1 },
        '__id-9223372036854775807__': { a: 1 }
      };

      return withTestCollection(persistence, testDocs, async collectionRef => {
        const filteredQuery = query(
          collectionRef,
          orderBy(documentId()),
          where(documentId(), '>', '__id7__'),
          where(documentId(), '<=', 'Aa')
        );
        const expectedDocs = [
          '__id12__',
          '__id9223372036854775806__',
          '__id9223372036854775807__',
          '12',
          '7',
          'A',
          'Aa'
        ];

        const getSnapshot = await getDocsFromServer(filteredQuery);
        expect(toIds(getSnapshot)).to.deep.equal(expectedDocs);

        const storeEvent = new EventsAccumulator<QuerySnapshot>();
        const unsubscribe = onSnapshot(filteredQuery, storeEvent.storeEvent);
        const watchSnapshot = await storeEvent.awaitEvent();
        expect(toIds(watchSnapshot)).to.deep.equal(expectedDocs);
        unsubscribe();
      });
    });

    // eslint-disable-next-line no-restricted-properties
    (persistence.gc === 'lru' ? describe : describe.skip)('offline', () => {
      it('SDK orders query the same way online and offline', async () => {
        const testDocs = {
          'A': { a: 1 },
          'a': { a: 1 },
          'Aa': { a: 1 },
          '7': { a: 1 },
          '12': { a: 1 },
          '__id7__': { a: 1 },
          '__id12__': { a: 1 },
          '__id-2__': { a: 1 },
          '_id1__': { a: 1 },
          '__id1_': { a: 1 },
          '__id': { a: 1 },
          // largest long numbers
          '__id9223372036854775807__': { a: 1 },
          '__id9223372036854775806__': { a: 1 },
          // smallest long numbers
          '__id-9223372036854775808__': { a: 1 },
          '__id-9223372036854775807__': { a: 1 }
        };

        return withTestCollection(
          persistence,
          testDocs,
          async collectionRef => {
            const orderedQuery = query(collectionRef, orderBy(documentId()));
            let expectedDocs = [
              '__id-9223372036854775808__',
              '__id-9223372036854775807__',
              '__id-2__',
              '__id7__',
              '__id12__',
              '__id9223372036854775806__',
              '__id9223372036854775807__',
              '12',
              '7',
              'A',
              'Aa',
              '__id',
              '__id1_',
              '_id1__',
              'a'
            ];
            await checkOnlineAndOfflineResultsMatch(
              collectionRef,
              orderedQuery,
              ...expectedDocs
            );

            const filteredQuery = query(
              collectionRef,
              orderBy(documentId()),
              where(documentId(), '>', '__id7__'),
              where(documentId(), '<=', 'Aa')
            );
            expectedDocs = [
              '__id12__',
              '__id9223372036854775806__',
              '__id9223372036854775807__',
              '12',
              '7',
              'A',
              'Aa'
            ];
            await checkOnlineAndOfflineResultsMatch(
              collectionRef,
              filteredQuery,
              ...expectedDocs
            );
          }
        );
      });
    });
  });

  describe('Sort unicode strings', () => {
    const expectedDocs = [
      'b',
      'a',
      'h',
      'i',
      'c',
      'f',
      'e',
      'd',
      'g',
      'k',
      'j'
    ];
    it('snapshot listener sorts unicode strings the same as server', async () => {
      const testDocs = {
        'a': { value: 'Łukasiewicz' },
        'b': { value: 'Sierpiński' },
        'c': { value: '岩澤' },
        'd': { value: '🄟' },
        'e': { value: 'Ｐ' },
        'f': { value: '︒' },
        'g': { value: '🐵' },
        'h': { value: '你好' },
        'i': { value: '你顥' },
        'j': { value: '😁' },
        'k': { value: '😀' }
      };

      return withTestCollection(persistence, testDocs, async collectionRef => {
        const orderedQuery = query(collectionRef, orderBy('value'));

        const getSnapshot = await getDocsFromServer(orderedQuery);
        expect(toIds(getSnapshot)).to.deep.equal(expectedDocs);

        const storeEvent = new EventsAccumulator<QuerySnapshot>();
        const unsubscribe = onSnapshot(orderedQuery, storeEvent.storeEvent);
        const watchSnapshot = await storeEvent.awaitEvent();
        expect(toIds(watchSnapshot)).to.deep.equal(toIds(getSnapshot));

        unsubscribe();

        await checkOnlineAndOfflineResultsMatch(
          collectionRef,
          orderedQuery,
          ...expectedDocs
        );
      });
    });

    it('snapshot listener sorts unicode strings in array the same  as server', async () => {
      const testDocs = {
        'a': { value: ['Łukasiewicz'] },
        'b': { value: ['Sierpiński'] },
        'c': { value: ['岩澤'] },
        'd': { value: ['🄟'] },
        'e': { value: ['Ｐ'] },
        'f': { value: ['︒'] },
        'g': { value: ['🐵'] },
        'h': { value: ['你好'] },
        'i': { value: ['你顥'] },
        'j': { value: ['😁'] },
        'k': { value: ['😀'] }
      };

      return withTestCollection(persistence, testDocs, async collectionRef => {
        const orderedQuery = query(collectionRef, orderBy('value'));

        const getSnapshot = await getDocsFromServer(orderedQuery);
        expect(toIds(getSnapshot)).to.deep.equal(expectedDocs);

        const storeEvent = new EventsAccumulator<QuerySnapshot>();
        const unsubscribe = onSnapshot(orderedQuery, storeEvent.storeEvent);
        const watchSnapshot = await storeEvent.awaitEvent();
        expect(toIds(watchSnapshot)).to.deep.equal(toIds(getSnapshot));

        unsubscribe();

        await checkOnlineAndOfflineResultsMatch(
          collectionRef,
          orderedQuery,
          ...expectedDocs
        );
      });
    });

    it('snapshot listener sorts unicode strings in map the same as server', async () => {
      const testDocs = {
        'a': { value: { foo: 'Łukasiewicz' } },
        'b': { value: { foo: 'Sierpiński' } },
        'c': { value: { foo: '岩澤' } },
        'd': { value: { foo: '🄟' } },
        'e': { value: { foo: 'Ｐ' } },
        'f': { value: { foo: '︒' } },
        'g': { value: { foo: '🐵' } },
        'h': { value: { foo: '你好' } },
        'i': { value: { foo: '你顥' } },
        'j': { value: { foo: '😁' } },
        'k': { value: { foo: '😀' } }
      };

      return withTestCollection(persistence, testDocs, async collectionRef => {
        const orderedQuery = query(collectionRef, orderBy('value'));

        const getSnapshot = await getDocsFromServer(orderedQuery);
        expect(toIds(getSnapshot)).to.deep.equal(expectedDocs);

        const storeEvent = new EventsAccumulator<QuerySnapshot>();
        const unsubscribe = onSnapshot(orderedQuery, storeEvent.storeEvent);
        const watchSnapshot = await storeEvent.awaitEvent();
        expect(toIds(watchSnapshot)).to.deep.equal(toIds(getSnapshot));

        unsubscribe();

        await checkOnlineAndOfflineResultsMatch(
          collectionRef,
          orderedQuery,
          ...expectedDocs
        );
      });
    });

    it('snapshot listener sorts unicode strings in map key the same as server', async () => {
      const testDocs = {
        'a': { value: { 'Łukasiewicz': true } },
        'b': { value: { 'Sierpiński': true } },
        'c': { value: { '岩澤': true } },
        'd': { value: { '🄟': true } },
        'e': { value: { 'Ｐ': true } },
        'f': { value: { '︒': true } },
        'g': { value: { '🐵': true } },
        'h': { value: { '你好': true } },
        'i': { value: { '你顥': true } },
        'j': { value: { '😁': true } },
        'k': { value: { '😀': true } }
      };

      return withTestCollection(persistence, testDocs, async collectionRef => {
        const orderedQuery = query(collectionRef, orderBy('value'));

        const getSnapshot = await getDocsFromServer(orderedQuery);
        expect(toIds(getSnapshot)).to.deep.equal(expectedDocs);

        const storeEvent = new EventsAccumulator<QuerySnapshot>();
        const unsubscribe = onSnapshot(orderedQuery, storeEvent.storeEvent);
        const watchSnapshot = await storeEvent.awaitEvent();
        expect(toIds(watchSnapshot)).to.deep.equal(toIds(getSnapshot));

        unsubscribe();

        await checkOnlineAndOfflineResultsMatch(
          collectionRef,
          orderedQuery,
          ...expectedDocs
        );
      });
    });

    it('snapshot listener sorts unicode strings in document key the same as server', async () => {
      const testDocs = {
        'Łukasiewicz': { value: true },
        'Sierpiński': { value: true },
        '岩澤': { value: true },
        '🄟': { value: true },
        'Ｐ': { value: true },
        '︒': { value: true },
        '🐵': { value: true },
        '你好': { value: true },
        '你顥': { value: true },
        '😁': { value: true },
        '😀': { value: true }
      };

      return withTestCollection(persistence, testDocs, async collectionRef => {
        const orderedQuery = query(collectionRef, orderBy(documentId()));

        const getSnapshot = await getDocsFromServer(orderedQuery);
        const expectedDocs = [
          'Sierpiński',
          'Łukasiewicz',
          '你好',
          '你顥',
          '岩澤',
          '︒',
          'Ｐ',
          '🄟',
          '🐵',
          '😀',
          '😁'
        ];
        expect(toIds(getSnapshot)).to.deep.equal(expectedDocs);

        const storeEvent = new EventsAccumulator<QuerySnapshot>();
        const unsubscribe = onSnapshot(orderedQuery, storeEvent.storeEvent);
        const watchSnapshot = await storeEvent.awaitEvent();
        expect(toIds(watchSnapshot)).to.deep.equal(toIds(getSnapshot));

        unsubscribe();

        await checkOnlineAndOfflineResultsMatch(
          collectionRef,
          orderedQuery,
          ...expectedDocs
        );
      });
    });

    // eslint-disable-next-line no-restricted-properties
    (persistence.storage === 'indexeddb' ? it.skip : it)(
      'snapshot listener sorts unicode strings in document key the same as server with persistence',
      async () => {
        const testDocs = {
          'Łukasiewicz': { value: true },
          'Sierpiński': { value: true },
          '岩澤': { value: true },
          '🄟': { value: true },
          'Ｐ': { value: true },
          '︒': { value: true },
          '🐵': { value: true },
          '你好': { value: true },
          '你顥': { value: true },
          '😁': { value: true },
          '😀': { value: true }
        };

        return withTestCollection(
          persistence,
          testDocs,
          async collectionRef => {
            const orderedQuery = query(collectionRef, orderBy('value'));

            const getSnapshot = await getDocsFromServer(orderedQuery);
            expect(toIds(getSnapshot)).to.deep.equal([
              'Sierpiński',
              'Łukasiewicz',
              '你好',
              '你顥',
              '岩澤',
              '︒',
              'Ｐ',
              '🄟',
              '🐵',
              '😀',
              '😁'
            ]);

            const storeEvent = new EventsAccumulator<QuerySnapshot>();
            const unsubscribe = onSnapshot(orderedQuery, storeEvent.storeEvent);
            const watchSnapshot = await storeEvent.awaitEvent();
            // TODO: IndexedDB sorts string lexicographically, and misses the document with ID '🄟','🐵'
            expect(toIds(watchSnapshot)).to.deep.equal(toIds(getSnapshot));

            unsubscribe();
          }
        );
      }
    );
  });
});
