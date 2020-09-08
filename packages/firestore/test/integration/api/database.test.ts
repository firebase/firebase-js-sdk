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

import * as chaiAsPromised from 'chai-as-promised';

import * as firestore from '@firebase/firestore-types';
import { expect, use } from 'chai';

import { Deferred } from '@firebase/util';
import { EventsAccumulator } from '../util/events_accumulator';
import * as firebaseExport from '../util/firebase_export';
import {
  apiDescribe,
  notEqualOp,
  notInOp,
  withTestCollection,
  withTestDb,
  withTestDbs,
  withTestDoc,
  withTestDocAndInitialData
} from '../util/helpers';
import { DEFAULT_SETTINGS } from '../util/settings';

use(chaiAsPromised);

const newTestFirestore = firebaseExport.newTestFirestore;
const usesFunctionalApi = firebaseExport.usesFunctionalApi;
const Timestamp = firebaseExport.Timestamp;
const FieldPath = firebaseExport.FieldPath;
const FieldValue = firebaseExport.FieldValue;

const MEMORY_ONLY_BUILD =
  typeof process !== 'undefined' &&
  process.env?.INCLUDE_FIRESTORE_PERSISTENCE === 'false';

apiDescribe('Database', (persistence: boolean) => {
  it('can set a document', () => {
    return withTestDoc(persistence, docRef => {
      return docRef.set({
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
      const ref = db.collection('foo').doc();
      // Auto IDs are 20 characters long
      expect(ref.id.length).to.equal(20);
    });
  });

  it('can delete a document', () => {
    // TODO(#1865): This test fails with node:persistence against Prod
    return withTestDoc(persistence, docRef => {
      return docRef
        .set({ foo: 'bar' })
        .then(() => {
          return docRef.get();
        })
        .then(doc => {
          expect(doc.data()).to.deep.equal({ foo: 'bar' });
          return docRef.delete();
        })
        .then(() => {
          return docRef.get();
        })
        .then(doc => {
          expect(doc.exists).to.equal(false);
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
      return doc
        .set(initialData)
        .then(() => doc.update(updateData))
        .then(() => doc.get())
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.be.ok;
          expect(docSnapshot.data()).to.deep.equal(finalData);
        });
    });
  });

  it('can retrieve document that does not exist', () => {
    return withTestDoc(persistence, doc => {
      return doc.get().then(snapshot => {
        expect(snapshot.exists).to.equal(false);
        expect(snapshot.data()).to.equal(undefined);
        expect(snapshot.get('foo')).to.equal(undefined);
      });
    });
  });

  // eslint-disable-next-line no-restricted-properties
  (persistence ? it : it.skip)('can update an unknown document', () => {
    return withTestDbs(persistence, 2, async ([reader, writer]) => {
      const writerRef = writer.collection('collection').doc();
      const readerRef = reader.collection('collection').doc(writerRef.id);
      await writerRef.set({ a: 'a' });
      await readerRef.update({ b: 'b' });
      await writerRef
        .get({ source: 'cache' })
        .then(doc => expect(doc.exists).to.be.true);
      await readerRef.get({ source: 'cache' }).then(
        () => {
          expect.fail('Expected cache miss');
        },
        err => expect(err.code).to.be.equal('unavailable')
      );
      await writerRef
        .get()
        .then(doc => expect(doc.data()).to.deep.equal({ a: 'a', b: 'b' }));
      await readerRef
        .get()
        .then(doc => expect(doc.data()).to.deep.equal({ a: 'a', b: 'b' }));
    });
  });

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
      return doc
        .set(initialData)
        .then(() => doc.set(mergeData, { merge: true }))
        .then(() => doc.get())
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
        time: FieldValue.serverTimestamp(),
        nested: { time: FieldValue.serverTimestamp() }
      };
      return doc
        .set(initialData)
        .then(() => doc.set(mergeData, { merge: true }))
        .then(() => doc.get())
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
      const accumulator = new EventsAccumulator<firestore.DocumentSnapshot>();
      const unsubscribe = doc.onSnapshot(accumulator.storeEvent);
      await accumulator
        .awaitEvent()
        .then(() => doc.set({}))
        .then(() => accumulator.awaitEvent())
        .then(docSnapshot => expect(docSnapshot.data()).to.be.deep.equal({}))
        .then(() => doc.set({ a: {} }, { mergeFields: ['a'] }))
        .then(() => accumulator.awaitEvent())
        .then(docSnapshot =>
          expect(docSnapshot.data()).to.be.deep.equal({ a: {} })
        )
        .then(() => doc.set({ b: {} }, { merge: true }))
        .then(() => accumulator.awaitEvent())
        .then(docSnapshot =>
          expect(docSnapshot.data()).to.be.deep.equal({ a: {}, b: {} })
        )
        .then(() => doc.get({ source: 'server' }))
        .then(docSnapshot => {
          expect(docSnapshot.data()).to.be.deep.equal({ a: {}, b: {} });
        });

      unsubscribe();
    });
  });

  it('update with empty object replaces all fields', () => {
    return withTestDoc(persistence, async doc => {
      await doc.set({ a: 'a' });
      await doc.update('a', {});
      const docSnapshot = await doc.get();
      expect(docSnapshot.data()).to.be.deep.equal({ a: {} });
    });
  });

  it('merge with empty object replaces all fields', () => {
    return withTestDoc(persistence, async doc => {
      await doc.set({ a: 'a' });
      await doc.set({ 'a': {} }, { merge: true });
      const docSnapshot = await doc.get();
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
        foo: FieldValue.delete(),
        nested: { foo: FieldValue.delete() }
      };
      const finalData = {
        untouched: true,
        nested: { untouched: true }
      };
      return doc
        .set(initialData)
        .then(() => doc.set(mergeData, { merge: true }))
        .then(() => doc.get())
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
        foo: FieldValue.delete(),
        inner: { foo: FieldValue.delete() },
        nested: {
          untouched: FieldValue.delete(),
          foo: FieldValue.delete()
        }
      };
      const finalData = {
        untouched: true,
        inner: {},
        nested: { untouched: true }
      };
      return doc
        .set(initialData)
        .then(() =>
          doc.set(mergeData, { mergeFields: ['foo', 'inner', 'nested.foo'] })
        )
        .then(() => doc.get())
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
        foo: FieldValue.serverTimestamp(),
        inner: { foo: FieldValue.serverTimestamp() },
        nested: { foo: FieldValue.serverTimestamp() }
      };
      return doc
        .set(initialData)
        .then(() =>
          doc.set(mergeData, { mergeFields: ['foo', 'inner', 'nested.foo'] })
        )
        .then(() => doc.get())
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
      return doc
        .set(initialData)
        .then(() => doc.set(mergeData, { merge: true }))
        .then(() => doc.get())
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.be.ok;
          expect(docSnapshot.data()).to.deep.equal(finalData);
        });
    });
  });

  it("can't specify a field mask for a missing field using set", () => {
    return withTestDoc(persistence, async docRef => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        docRef.set(
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
      await docRef.set(
        { desc: 'NewDescription', owner: 'Sebastian' },
        { mergeFields: ['owner'] }
      );
      const result = await docRef.get();
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
      await docRef.set(
        { desc: FieldValue.delete(), owner: 'Sebastian' },
        { mergeFields: ['owner'] }
      );
      const result = await docRef.get();
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
      await docRef.set(
        {
          desc: FieldValue.serverTimestamp(),
          owner: 'Sebastian'
        },
        { mergeFields: ['owner'] }
      );
      const result = await docRef.get();
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
      await docRef.set(
        { desc: 'NewDescription', owner: 'Sebastian' },
        { mergeFields: [] }
      );
      const result = await docRef.get();
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
      await docRef.set(
        {
          desc: 'NewDescription',
          owner: { name: 'Sebastian', email: 'new@xyz.com' }
        },
        { mergeFields: ['owner.name', 'owner', 'owner'] }
      );
      const result = await docRef.get();
      expect(result.data()).to.deep.equal(finalData);
    });
  });

  it('cannot update nonexistent document', () => {
    return withTestDoc(persistence, doc => {
      return doc
        .update({ owner: 'abc' })
        .then(
          () => Promise.reject('update should have failed.'),
          err => {
            expect(err.message).to.exist;
            // TODO: Change this to just match "no document to update" once the
            // backend response is consistent.
            expect(err.message).to.match(/no (document|entity) to update/i);
            expect(err.code).to.equal('not-found');
          }
        )
        .then(() => doc.get())
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.equal(false);
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
        'owner.email': FieldValue.delete()
      };
      const finalData = {
        desc: 'Description',
        owner: { name: 'Jonny' }
      };
      return doc
        .set(initialData)
        .then(() => doc.update(updateData))
        .then(() => doc.get())
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
      return doc
        .set(initialData)
        .then(() =>
          doc.update('owner.name', 'Sebastian', new FieldPath('is.admin'), true)
        )
        .then(() => doc.get())
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.be.ok;
          expect(docSnapshot.data()).to.deep.equal(finalData);
        });
    });
  });

  it('can specify updated field multiple times', () => {
    return withTestDoc(persistence, doc => {
      return doc
        .set({})
        .then(() => doc.update('field', 100, new FieldPath('field'), 200))
        .then(() => doc.get())
        .then(docSnap => {
          expect(docSnap.data()).to.deep.equal({ field: 200 });
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
          expect(() => doc.set(val as any)).to.throw();
          // Intentionally passing bad types.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expect(() => doc.update(val as any)).to.throw();
        });
      });
    }
  });

  it('CollectionRef.add() resolves with resulting DocumentRef.', () => {
    return withTestCollection(persistence, {}, coll => {
      return coll
        .add({ foo: 1 })
        .then(docRef => docRef.get())
        .then(docSnap => {
          expect(docSnap.data()).to.deep.equal({ foo: 1 });
        });
    });
  });

  it('onSnapshotsInSync fires after listeners are in sync', () => {
    const testDocs = {
      a: { foo: 1 }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      let events: string[] = [];
      const gotInitialSnapshot = new Deferred<void>();
      const doc = coll.doc('a');

      doc.onSnapshot(snap => {
        events.push('doc');
        gotInitialSnapshot.resolve();
      });
      await gotInitialSnapshot.promise;
      events = [];

      const done = new Deferred<void>();
      doc.firestore.onSnapshotsInSync(() => {
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

      await doc.set({ foo: 3 });
      await done.promise;
    });
  });

  apiDescribe('Queries are validated client-side', (persistence: boolean) => {
    // NOTE: Failure cases are validated in validation_test.ts

    it('same inequality fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          coll.where('x', '>=', 32).where('x', '<=', 'cat')
        ).not.to.throw();
      });
    });

    it('inequality and equality on different fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          coll.where('x', '>=', 32).where('y', '==', 'cat')
        ).not.to.throw();
      });
    });

    it('inequality and array-contains on different fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          coll.where('x', '>=', 32).where('y', 'array-contains', 'cat')
        ).not.to.throw();
      });
    });

    it('inequality and IN on different fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          coll.where('x', '>=', 32).where('y', 'in', [1, 2])
        ).not.to.throw();
      });
    });

    it('inequality and NOT_IN on different fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          coll.where('x', '>=', 32).where('y', notInOp, [1, 2])
        ).not.to.throw();
      });
    });

    it('inequality and array-contains-any on different fields works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          coll.where('x', '>=', 32).where('y', 'array-contains-any', [1, 2])
        ).not.to.throw();
      });
    });

    it('inequality same as orderBy works.', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() => coll.where('x', '>', 32).orderBy('x')).not.to.throw();
        expect(() => coll.orderBy('x').where('x', '>', 32)).not.to.throw();
      });
    });

    it('!= same as orderBy works.', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          coll.where('x', notEqualOp, 32).orderBy('x')
        ).not.to.throw();
        expect(() =>
          coll.orderBy('x').where('x', notEqualOp, 32)
        ).not.to.throw();
      });
    });

    it('inequality same as first orderBy works.', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          coll.where('x', '>', 32).orderBy('x').orderBy('y')
        ).not.to.throw();
        expect(() =>
          coll.orderBy('x').where('x', '>', 32).orderBy('y')
        ).not.to.throw();
      });
    });

    it('!= same as first orderBy works.', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          coll.where('x', notEqualOp, 32).orderBy('x').orderBy('y')
        ).not.to.throw();
        expect(() =>
          coll.orderBy('x').where('x', notEqualOp, 32).orderBy('y')
        ).not.to.throw();
      });
    });

    it('equality different than orderBy works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() => coll.orderBy('x').where('y', '==', 'cat')).not.to.throw();
      });
    });

    it('array-contains different than orderBy works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          coll.orderBy('x').where('y', 'array-contains', 'cat')
        ).not.to.throw();
      });
    });

    it('IN different than orderBy works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() => coll.orderBy('x').where('y', 'in', [1, 2])).not.to.throw();
      });
    });

    it('NOT_IN different than orderBy works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          coll.orderBy('x').where('y', notInOp, [1, 2])
        ).not.to.throw();
      });
    });

    it('array-contains-any different than orderBy works', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() =>
          coll.orderBy('x').where('y', 'array-contains-any', [1, 2])
        ).not.to.throw();
      });
    });
  });

  it('DocumentSnapshot events for non existent document', () => {
    return withTestCollection(persistence, {}, col => {
      const doc = col.doc();
      const storeEvent = new EventsAccumulator<firestore.DocumentSnapshot>();
      doc.onSnapshot(storeEvent.storeEvent);
      return storeEvent.awaitEvent().then(snap => {
        expect(snap.exists).to.be.false;
        expect(snap.data()).to.equal(undefined);
        return storeEvent.assertNoAdditionalEvents();
      });
    });
  });

  it('DocumentSnapshot events for add data to document', () => {
    return withTestCollection(persistence, {}, col => {
      const doc = col.doc();
      const storeEvent = new EventsAccumulator<firestore.DocumentSnapshot>();
      doc.onSnapshot({ includeMetadataChanges: true }, storeEvent.storeEvent);
      return storeEvent
        .awaitEvent()
        .then(snap => {
          expect(snap.exists).to.be.false;
          expect(snap.data()).to.equal(undefined);
        })
        .then(() => doc.set({ a: 1 }))
        .then(() => storeEvent.awaitEvent())
        .then(snap => {
          expect(snap.exists).to.be.true;
          expect(snap.data()).to.deep.equal({ a: 1 });
          expect(snap.metadata.hasPendingWrites).to.be.true;
        })
        .then(() => storeEvent.awaitEvent())
        .then(snap => {
          expect(snap.exists).to.be.true;
          expect(snap.data()).to.deep.equal({ a: 1 });
          expect(snap.metadata.hasPendingWrites).to.be.false;
        })
        .then(() => storeEvent.assertNoAdditionalEvents());
    });
  });

  it('DocumentSnapshot events for change data in document', () => {
    const initialData = { a: 1 };
    const changedData = { b: 2 };

    return withTestCollection(persistence, { key1: initialData }, col => {
      const doc = col.doc('key1');
      const storeEvent = new EventsAccumulator<firestore.DocumentSnapshot>();
      doc.onSnapshot({ includeMetadataChanges: true }, storeEvent.storeEvent);
      return storeEvent
        .awaitEvent()
        .then(snap => {
          expect(snap.data()).to.deep.equal(initialData);
          expect(snap.metadata.hasPendingWrites).to.be.false;
        })
        .then(() => doc.set(changedData))
        .then(() => storeEvent.awaitEvent())
        .then(snap => {
          expect(snap.data()).to.deep.equal(changedData);
          expect(snap.metadata.hasPendingWrites).to.be.true;
        })
        .then(() => storeEvent.awaitEvent())
        .then(snap => {
          expect(snap.data()).to.deep.equal(changedData);
          expect(snap.metadata.hasPendingWrites).to.be.false;
        })
        .then(() => storeEvent.assertNoAdditionalEvents());
    });
  });

  it('DocumentSnapshot events for delete data in document', () => {
    const initialData = { a: 1 };

    return withTestCollection(persistence, { key1: initialData }, col => {
      const doc = col.doc('key1');
      const storeEvent = new EventsAccumulator<firestore.DocumentSnapshot>();
      doc.onSnapshot({ includeMetadataChanges: true }, storeEvent.storeEvent);
      return storeEvent
        .awaitEvent()
        .then(snap => {
          expect(snap.exists).to.be.true;
          expect(snap.data()).to.deep.equal(initialData);
          expect(snap.metadata.hasPendingWrites).to.be.false;
        })
        .then(() => doc.delete())
        .then(() => storeEvent.awaitEvent())
        .then(snap => {
          expect(snap.exists).to.be.false;
          expect(snap.data()).to.equal(undefined);
          expect(snap.metadata.hasPendingWrites).to.be.false;
        })
        .then(() => storeEvent.assertNoAdditionalEvents());
    });
  });

  it('Listen can be called multiple times', () => {
    return withTestCollection(persistence, {}, coll => {
      const doc = coll.doc();
      const deferred1 = new Deferred<void>();
      const deferred2 = new Deferred<void>();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      doc.set({ foo: 'bar' }).then(() => {
        doc.onSnapshot(snap => {
          deferred1.resolve();
          doc.onSnapshot(snap => {
            deferred2.resolve();
          });
        });
      });
      return Promise.all([deferred1.promise, deferred2.promise]).then(() => {});
    });
  });

  it('Metadata only changes are not fired when no options provided', () => {
    return withTestDoc(persistence, docRef => {
      const secondUpdateFound = new Deferred();
      let count = 0;
      const unlisten = docRef.onSnapshot(doc => {
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
      docRef.set({ a: 1 }).then(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        docRef.set({ b: 1 });
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
        const queryForRejection = db.collection('a/__badpath__/b');
        queryForRejection.onSnapshot(
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
        const queryForRejection = db.collection('a/__badpath__/b');
        queryForRejection.onSnapshot(
          () => {},
          (err: Error) => {
            expect(err.name).to.exist;
            expect(err.message).to.exist;
            queryForRejection.onSnapshot(
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
        const queryForRejection = db.collection('a/__badpath__/b');
        await queryForRejection.get().then(
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
        const queryForRejection = db.collection('a/__badpath__/b');
        return queryForRejection
          .get()
          .then(
            () => {
              expect.fail('Promise resolved even though error was expected.');
            },
            err => {
              expect(err.name).to.exist;
              expect(err.message).to.exist;
            }
          )
          .then(() => queryForRejection.get())
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
      expect(db.doc('foo/bar').firestore).to.equal(db);
    });
  });

  it('exposes "firestore" on query references.', () => {
    return withTestDb(persistence, async db => {
      expect(db.collection('foo').limit(5).firestore).to.equal(db);
    });
  });

  it('can compare DocumentReference instances with isEqual().', () => {
    return withTestDb(persistence, firestore => {
      return withTestDb(persistence, async otherFirestore => {
        const docRef = firestore.doc('foo/bar');
        expect(docRef.isEqual(firestore.doc('foo/bar'))).to.be.true;
        expect(docRef.collection('baz').parent!.isEqual(docRef)).to.be.true;

        expect(firestore.doc('foo/BAR').isEqual(docRef)).to.be.false;

        expect(otherFirestore.doc('foo/bar').isEqual(docRef)).to.be.false;
      });
    });
  });

  it('can compare Query instances with isEqual().', () => {
    return withTestDb(persistence, firestore => {
      return withTestDb(persistence, async otherFirestore => {
        const query = firestore
          .collection('foo')
          .orderBy('bar')
          .where('baz', '==', 42);
        const query2 = firestore
          .collection('foo')
          .orderBy('bar')
          .where('baz', '==', 42);
        expect(query.isEqual(query2)).to.be.true;

        const query3 = firestore
          .collection('foo')
          .orderBy('BAR')
          .where('baz', '==', 42);
        expect(query.isEqual(query3)).to.be.false;

        const query4 = otherFirestore
          .collection('foo')
          .orderBy('bar')
          .where('baz', '==', 42);
        expect(query4.isEqual(query)).to.be.false;
      });
    });
  });

  it('can traverse collections and documents.', () => {
    return withTestDb(persistence, async db => {
      const expected = 'a/b/c/d';
      // doc path from root Firestore.
      expect(db.doc('a/b/c/d').path).to.deep.equal(expected);
      // collection path from root Firestore.
      expect(db.collection('a/b/c').doc('d').path).to.deep.equal(expected);
      // doc path from CollectionReference.
      expect(db.collection('a').doc('b/c/d').path).to.deep.equal(expected);
      // collection path from DocumentReference.
      expect(db.doc('a/b').collection('c/d/e').path).to.deep.equal(
        expected + '/e'
      );
    });
  });

  it('can traverse collection and document parents.', () => {
    return withTestDb(persistence, async db => {
      let collection = db.collection('a/b/c');
      expect(collection.path).to.deep.equal('a/b/c');

      const doc = collection.parent!;
      expect(doc.path).to.deep.equal('a/b');

      collection = doc.parent;
      expect(collection.path).to.equal('a');

      const nullDoc = collection.parent;
      expect(nullDoc).to.equal(null);
    });
  });

  it('can queue writes while offline', () => {
    return withTestDoc(persistence, docRef => {
      const firestore = docRef.firestore;

      return firestore
        .disableNetwork()
        .then(() => {
          return Promise.all([
            docRef.set({ foo: 'bar' }),
            firestore.enableNetwork()
          ]);
        })
        .then(() => docRef.get())
        .then(doc => {
          expect(doc.data()).to.deep.equal({ foo: 'bar' });
        });
    });
  });

  // eslint-disable-next-line no-restricted-properties
  (persistence ? it : it.skip)('offline writes are sent after restart', () => {
    return withTestDoc(persistence, async docRef => {
      const firestore = docRef.firestore;

      const app = firestore.app;
      const name = app.name;
      const options = app.options;

      await firestore.disableNetwork();

      // We are merely adding to the cache.
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      docRef.set({ foo: 'bar' });

      await app.delete();

      const firestore2 = newTestFirestore(
        options.projectId,
        name,
        DEFAULT_SETTINGS
      );
      await firestore2.enablePersistence();
      await firestore2.waitForPendingWrites();
      const doc = await firestore2.doc(docRef.path).get();

      expect(doc.exists).to.be.true;
      expect(doc.metadata.hasPendingWrites).to.be.false;
    });
  });

  it('rejects subsequent method calls after terminate() is called', async () => {
    return withTestDb(persistence, db => {
      return db.INTERNAL.delete().then(() => {
        expect(() => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          db.disableNetwork();
        }).to.throw('The client has already been terminated.');
      });
    });
  });

  it('can call terminate() multiple times', async () => {
    return withTestDb(persistence, async db => {
      await db.terminate();
      await db.terminate();
    });
  });

  // eslint-disable-next-line no-restricted-properties
  (MEMORY_ONLY_BUILD ? it : it.skip)(
    'recovers when persistence is missing',
    async () => {
      await withTestDbs(/* persistence */ false, 2, async dbs => {
        for (let i = 0; i < 2; ++i) {
          const db = dbs[i];

          try {
            await (i === 0 ? db.enablePersistence() : db.clearPersistence());
            expect.fail(
              'Persistence operation should fail for memory-only build'
            );
          } catch (err) {
            expect(err.code).to.equal('failed-precondition');
            expect(err.message).to.match(
              /You are using the memory-only build of Firestore./
            );
          }

          // Verify client functionality after failed call
          await db.doc('coll/doc').get();
        }
      });
    }
  );

  // eslint-disable-next-line no-restricted-properties
  (persistence ? it : it.skip)(
    'maintains persistence after restarting app',
    async () => {
      await withTestDoc(persistence, async docRef => {
        await docRef.set({ foo: 'bar' });
        const app = docRef.firestore.app;
        const name = app.name;
        const options = app.options;

        await app.delete();

        const firestore2 = newTestFirestore(options.projectId, name);
        await firestore2.enablePersistence();
        const docRef2 = firestore2.doc(docRef.path);
        const docSnap2 = await docRef2.get({ source: 'cache' });
        expect(docSnap2.exists).to.be.true;
      });
    }
  );

  // eslint-disable-next-line no-restricted-properties
  (persistence ? it : it.skip)(
    'can clear persistence if the client has been terminated',
    async () => {
      await withTestDoc(persistence, async docRef => {
        const firestore = docRef.firestore;
        await docRef.set({ foo: 'bar' });
        const app = docRef.firestore.app;
        const name = app.name;
        const options = app.options;

        await app.delete();
        await firestore.clearPersistence();
        const firestore2 = newTestFirestore(options.projectId, name);
        await firestore2.enablePersistence();
        const docRef2 = firestore2.doc(docRef.path);
        await expect(
          docRef2.get({ source: 'cache' })
        ).to.eventually.be.rejectedWith('Failed to get document from cache.');
      });
    }
  );

  // eslint-disable-next-line no-restricted-properties
  (persistence ? it : it.skip)(
    'can clear persistence if the client has not been initialized',
    async () => {
      await withTestDoc(persistence, async docRef => {
        await docRef.set({ foo: 'bar' });
        const app = docRef.firestore.app;
        const name = app.name;
        const options = app.options;

        await app.delete();
        const firestore2 = newTestFirestore(options.projectId, name);
        await firestore2.clearPersistence();
        await firestore2.enablePersistence();
        const docRef2 = firestore2.doc(docRef.path);
        await expect(
          docRef2.get({ source: 'cache' })
        ).to.eventually.be.rejectedWith('Failed to get document from cache.');
      });
    }
  );

  // eslint-disable-next-line no-restricted-properties
  (persistence ? it : it.skip)(
    'cannot clear persistence if the client has been initialized',
    async () => {
      await withTestDoc(persistence, async docRef => {
        const firestore = docRef.firestore;
        const expectedError =
          'Persistence can only be cleared before a Firestore instance is ' +
          'initialized or after it is terminated.';
        if (usesFunctionalApi()) {
          // The modular API throws an exception rather than rejecting the
          // Promise, which matches our overall handling of API call violations.
          expect(() => firestore.clearPersistence()).to.throw(expectedError);
        } else {
          await expect(
            firestore.clearPersistence()
          ).to.eventually.be.rejectedWith(expectedError);
        }
      });
    }
  );

  it('can get documents while offline', async () => {
    await withTestDoc(persistence, async docRef => {
      const firestore = docRef.firestore;

      await firestore.disableNetwork();
      await expect(docRef.get()).to.eventually.be.rejectedWith(
        'Failed to get document because the client is offline.'
      );

      const writePromise = docRef.set({ foo: 'bar' });
      const doc = await docRef.get();
      expect(doc.metadata.fromCache).to.be.true;

      await firestore.enableNetwork();
      await writePromise;

      const doc2 = await docRef.get();
      expect(doc2.metadata.fromCache).to.be.false;
      expect(doc2.data()).to.deep.equal({ foo: 'bar' });
    });
  });

  it('can enable and disable networking', () => {
    return withTestDb(persistence, async db => {
      // There's not currently a way to check if networking is in fact disabled,
      // so for now just test that the method is well-behaved and doesn't throw.
      await db.enableNetwork();
      await db.enableNetwork();
      await db.disableNetwork();
      await db.disableNetwork();
      await db.enableNetwork();
    });
  });

  it('can start a new instance after shut down', async () => {
    return withTestDoc(persistence, async docRef => {
      const firestore = docRef.firestore;
      await firestore.terminate();

      const newFirestore = newTestFirestore(
        firestore.app.options.projectId,
        firestore.app
      );
      expect(newFirestore).to.not.equal(firestore);

      // New instance functions.
      newFirestore.settings(DEFAULT_SETTINGS);
      await newFirestore.doc(docRef.path).set({ foo: 'bar' });
      const doc = await newFirestore.doc(docRef.path).get();
      expect(doc.data()).to.deep.equal({ foo: 'bar' });
    });
  });

  it('new operation after termination should throw', async () => {
    await withTestDoc(persistence, async docRef => {
      const firestore = docRef.firestore;
      await firestore.terminate();

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        firestore.doc(docRef.path).set({ foo: 'bar' });
      }).to.throw('The client has already been terminated.');
    });
  });

  it('calling terminate multiple times should proceed', async () => {
    await withTestDoc(persistence, async docRef => {
      const firestore = docRef.firestore;
      await firestore.terminate();
      await firestore.terminate();

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        firestore.doc(docRef.path).set({ foo: 'bar' });
      }).to.throw();
    });
  });

  it('can unlisten queries after termination', async () => {
    return withTestDoc(persistence, async docRef => {
      const firestore = docRef.firestore;
      const accumulator = new EventsAccumulator<firestore.DocumentSnapshot>();
      const unsubscribe = docRef.onSnapshot(accumulator.storeEvent);
      await accumulator.awaitEvent();
      await firestore.terminate();

      // This should proceed without error.
      unsubscribe();
      // Multiple calls should proceed as well.
      unsubscribe();
    });
  });

  it('can wait for pending writes', async () => {
    await withTestDoc(persistence, async docRef => {
      const firestore = docRef.firestore;
      // Prevent pending writes receiving acknowledgement.
      await firestore.disableNetwork();

      const pendingWrites = docRef.set({ foo: 'bar' });
      const awaitPendingWrites = firestore.waitForPendingWrites();

      // pending writes can receive acknowledgements now.
      await firestore.enableNetwork();
      await pendingWrites;
      await awaitPendingWrites;
    });
  });

  it('waiting for pending writes resolves immediately when offline and no pending writes', async () => {
    await withTestDoc(persistence, async docRef => {
      const firestore = docRef.firestore;
      // Prevent pending writes receiving acknowledgement.
      await firestore.disableNetwork();

      // `awaitsPendingWrites` is created when there is no pending writes, it will resolve
      // immediately even if we are offline.
      await firestore.waitForPendingWrites();
    });
  });

  // PORTING NOTE: These tests are for FirestoreDataConverter support and apply
  // only to web.
  apiDescribe('withConverter() support', (persistence: boolean) => {
    class Post {
      constructor(readonly title: string, readonly author: string) {}
      byline(): string {
        return this.title + ', by ' + this.author;
      }
    }

    const postConverter = {
      toFirestore(post: Post): firestore.DocumentData {
        return { title: post.title, author: post.author };
      },
      fromFirestore(
        snapshot: firestore.QueryDocumentSnapshot,
        options: firestore.SnapshotOptions
      ): Post {
        const data = snapshot.data(options);
        return new Post(data.title, data.author);
      }
    };

    const postConverterMerge = {
      toFirestore(
        post: Partial<Post>,
        options?: firestore.SetOptions
      ): firestore.DocumentData {
        if (options && (options.merge || options.mergeFields)) {
          expect(post).to.not.be.an.instanceof(Post);
        } else {
          expect(post).to.be.an.instanceof(Post);
        }
        const result: firestore.DocumentData = {};
        if (post.title) {
          result.title = post.title;
        }
        if (post.author) {
          result.author = post.author;
        }
        return result;
      },
      fromFirestore(
        snapshot: firestore.QueryDocumentSnapshot,
        options: firestore.SnapshotOptions
      ): Post {
        const data = snapshot.data();
        return new Post(data.title, data.author);
      }
    };

    it('for DocumentReference.withConverter()', () => {
      return withTestDb(persistence, async db => {
        const docRef = db
          .collection('posts')
          .doc()
          .withConverter(postConverter);

        await docRef.set(new Post('post', 'author'));
        const postData = await docRef.get();
        const post = postData.data();
        expect(post).to.not.equal(undefined);
        expect(post!.byline()).to.equal('post, by author');
      });
    });

    it('for CollectionReference.withConverter()', () => {
      return withTestDb(persistence, async db => {
        const coll = db.collection('posts').withConverter(postConverter);

        const docRef = await coll.add(new Post('post', 'author'));
        const postData = await docRef.get();
        const post = postData.data();
        expect(post).to.not.equal(undefined);
        expect(post!.byline()).to.equal('post, by author');
      });
    });

    it('for Query.withConverter()', () => {
      return withTestDb(persistence, async db => {
        await db
          .doc('postings/post1')
          .set({ title: 'post1', author: 'author1' });
        await db
          .doc('postings/post2')
          .set({ title: 'post2', author: 'author2' });
        const posts = await db
          .collectionGroup('postings')
          .withConverter(postConverter)
          .get();
        expect(posts.size).to.equal(2);
        expect(posts.docs[0].data()!.byline()).to.equal('post1, by author1');
      });
    });

    it('requires the correct converter for Partial usage', async () => {
      return withTestDb(persistence, async db => {
        const ref = db
          .collection('posts')
          .doc('some-post')
          .withConverter(postConverter);
        await ref.set(new Post('walnut', 'author'));
        const batch = db.batch();
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
        const ref = db
          .collection('posts')
          .doc()
          .withConverter(postConverterMerge);
        await ref.set(new Post('walnut', 'author'));
        const batch = db.batch();
        batch.set(ref, { title: 'olive' }, { merge: true });
        await batch.commit();
        const doc = await ref.get();
        expect(doc.get('title')).to.equal('olive');
        expect(doc.get('author')).to.equal('author');
      });
    });

    it('WriteBatch.set() supports partials with mergeFields', async () => {
      return withTestDb(persistence, async db => {
        const ref = db
          .collection('posts')
          .doc()
          .withConverter(postConverterMerge);
        await ref.set(new Post('walnut', 'author'));
        const batch = db.batch();
        batch.set(
          ref,
          { title: 'olive', author: 'writer' },
          { mergeFields: ['title'] }
        );
        await batch.commit();
        const doc = await ref.get();
        expect(doc.get('title')).to.equal('olive');
        expect(doc.get('author')).to.equal('author');
      });
    });

    it('Transaction.set() supports partials with merge', async () => {
      return withTestDb(persistence, async db => {
        const ref = db
          .collection('posts')
          .doc()
          .withConverter(postConverterMerge);
        await ref.set(new Post('walnut', 'author'));
        await db.runTransaction(async tx => {
          tx.set(ref, { title: 'olive' }, { merge: true });
        });
        const doc = await ref.get();
        expect(doc.get('title')).to.equal('olive');
        expect(doc.get('author')).to.equal('author');
      });
    });

    it('Transaction.set() supports partials with mergeFields', async () => {
      return withTestDb(persistence, async db => {
        const ref = db
          .collection('posts')
          .doc()
          .withConverter(postConverterMerge);
        await ref.set(new Post('walnut', 'author'));
        await db.runTransaction(async tx => {
          tx.set(
            ref,
            { title: 'olive', author: 'person' },
            { mergeFields: ['title'] }
          );
        });
        const doc = await ref.get();
        expect(doc.get('title')).to.equal('olive');
        expect(doc.get('author')).to.equal('author');
      });
    });

    it('DocumentReference.set() supports partials with merge', async () => {
      return withTestDb(persistence, async db => {
        const ref = db
          .collection('posts')
          .doc()
          .withConverter(postConverterMerge);
        await ref.set(new Post('walnut', 'author'));
        await ref.set({ title: 'olive' }, { merge: true });
        const doc = await ref.get();
        expect(doc.get('title')).to.equal('olive');
        expect(doc.get('author')).to.equal('author');
      });
    });

    it('DocumentReference.set() supports partials with mergeFields', async () => {
      return withTestDb(persistence, async db => {
        const ref = db
          .collection('posts')
          .doc()
          .withConverter(postConverterMerge);
        await ref.set(new Post('walnut', 'author'));
        await ref.set(
          { title: 'olive', author: 'writer' },
          { mergeFields: ['title'] }
        );
        const doc = await ref.get();
        expect(doc.get('title')).to.equal('olive');
        expect(doc.get('author')).to.equal('author');
      });
    });

    it('calls DocumentSnapshot.data() with specified SnapshotOptions', () => {
      return withTestDb(persistence, async db => {
        const docRef = db.doc('some/doc').withConverter({
          toFirestore(post: Post): firestore.DocumentData {
            return { title: post.title, author: post.author };
          },
          fromFirestore(
            snapshot: firestore.QueryDocumentSnapshot,
            options: firestore.SnapshotOptions
          ): Post {
            // Check that options were passed in properly.
            expect(options).to.deep.equal({ serverTimestamps: 'estimate' });

            const data = snapshot.data(options);
            return new Post(data.title, data.author);
          }
        });

        await docRef.set(new Post('post', 'author'));
        const postData = await docRef.get();
        postData.data({ serverTimestamps: 'estimate' });
      });
    });

    it('drops the converter when calling CollectionReference<T>.parent()', () => {
      return withTestDb(persistence, async db => {
        const postsCollection = db
          .collection('users/user1/posts')
          .withConverter(postConverter);

        const usersCollection = postsCollection.parent;
        expect(usersCollection!.isEqual(db.doc('users/user1'))).to.be.true;
      });
    });

    it('checks converter when comparing with isEqual()', () => {
      return withTestDb(persistence, async db => {
        const postConverter2 = { ...postConverter };

        const postsCollection = db
          .collection('users/user1/posts')
          .withConverter(postConverter);
        const postsCollection2 = db
          .collection('users/user1/posts')
          .withConverter(postConverter2);
        expect(postsCollection.isEqual(postsCollection2)).to.be.false;

        const docRef = db.doc('some/doc').withConverter(postConverter);
        const docRef2 = db.doc('some/doc').withConverter(postConverter2);
        expect(docRef.isEqual(docRef2)).to.be.false;
      });
    });
  });
});
