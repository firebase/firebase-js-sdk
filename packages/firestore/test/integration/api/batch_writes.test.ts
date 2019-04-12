/**
 * @license
 * Copyright 2017 Google Inc.
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

import * as firestore from '@firebase/firestore-types';
import { expect } from 'chai';

import { EventsAccumulator } from '../util/events_accumulator';
import firebase from '../util/firebase_export';
import * as integrationHelpers from '../util/helpers';

const apiDescribe = integrationHelpers.apiDescribe;
const Timestamp = firebase.firestore!.Timestamp;
const FieldValue = firebase.firestore!.FieldValue;

apiDescribe('Database batch writes', persistence => {
  it('supports empty batches', () => {
    return integrationHelpers.withTestDb(persistence, db => {
      return db.batch().commit();
    });
  });

  it('can set documents', () => {
    return integrationHelpers.withTestDoc(persistence, doc => {
      return doc.firestore
        .batch()
        .set(doc, { foo: 'bar' })
        .commit()
        .then(() => doc.get())
        .then(snapshot => {
          expect(snapshot.exists).to.equal(true);
          expect(snapshot.data()).to.deep.equal({ foo: 'bar' });
        });
    });
  });

  it('can set documents with merge', () => {
    return integrationHelpers.withTestDoc(persistence, doc => {
      return doc.firestore
        .batch()
        .set(doc, { a: 'b', nested: { a: 'b' } }, { merge: true })
        .commit()
        .then(() => {
          return doc.firestore
            .batch()
            .set(doc, { c: 'd', nested: { c: 'd' } }, { merge: true })
            .commit();
        })
        .then(() => doc.get())
        .then(snapshot => {
          expect(snapshot.exists).to.equal(true);
          expect(snapshot.data()).to.deep.equal({
            a: 'b',
            c: 'd',
            nested: { a: 'b', c: 'd' }
          });
        });
    });
  });

  it('can update documents', () => {
    return integrationHelpers.withTestDoc(persistence, doc => {
      return doc
        .set({ foo: 'bar' })
        .then(() =>
          doc.firestore
            .batch()
            .update(doc, { baz: 42 })
            .commit()
        )
        .then(() => doc.get())
        .then(snapshot => {
          expect(snapshot.exists).to.equal(true);
          expect(snapshot.data()).to.deep.equal({ foo: 'bar', baz: 42 });
        });
    });
  });

  it('can update nested fields', () => {
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

    return integrationHelpers.withTestDb(persistence, db => {
      const doc = db.collection('counters').doc();
      return doc.firestore
        .batch()
        .set(doc, initialData)
        .update(
          doc,
          'owner.name',
          'Sebastian',
          new firebase.firestore!.FieldPath('is.admin'),
          true
        )
        .commit()
        .then(() => doc.get())
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.be.ok;
          expect(docSnapshot.data()).to.deep.equal(finalData);
        });
    });
  });

  it('can delete documents', () => {
    return integrationHelpers.withTestDoc(persistence, doc => {
      return doc
        .set({ foo: 'bar' })
        .then(() => doc.get())
        .then(snapshot => {
          expect(snapshot.exists).to.equal(true);
        })
        .then(() =>
          doc.firestore
            .batch()
            .delete(doc)
            .commit()
        )
        .then(() => doc.get())
        .then(snapshot => {
          expect(snapshot.exists).to.equal(false);
        });
    });
  });

  it('commit atomically, raising correct events', () => {
    return integrationHelpers.withTestCollection(
      persistence,
      {},
      collection => {
        const docA = collection.doc('a');
        const docB = collection.doc('b');
        const accumulator = new EventsAccumulator<firestore.QuerySnapshot>();
        const unsubscribe = collection.onSnapshot(
          { includeMetadataChanges: true },
          accumulator.storeEvent
        );
        return accumulator
          .awaitEvent()
          .then(initialSnap => {
            expect(initialSnap.docs.length).to.equal(0);

            // Atomically write two documents.
            collection.firestore
              .batch()
              .set(docA, { a: 1 })
              .set(docB, { b: 2 })
              .commit();

            return accumulator.awaitEvent();
          })
          .then(localSnap => {
            expect(localSnap.metadata.hasPendingWrites).to.equal(true);
            expect(integrationHelpers.toDataArray(localSnap)).to.deep.equal([
              { a: 1 },
              { b: 2 }
            ]);
            return accumulator.awaitEvent();
          })
          .then(serverSnap => {
            expect(serverSnap.metadata.hasPendingWrites).to.equal(false);
            expect(integrationHelpers.toDataArray(serverSnap)).to.deep.equal([
              { a: 1 },
              { b: 2 }
            ]);
            unsubscribe();
          });
      }
    );
  });

  it('fail atomically, raising correct events', () => {
    return integrationHelpers.withTestCollection(
      persistence,
      {},
      collection => {
        const docA = collection.doc('a');
        const docB = collection.doc('b');
        const accumulator = new EventsAccumulator<firestore.QuerySnapshot>();
        const unsubscribe = collection.onSnapshot(
          { includeMetadataChanges: true },
          accumulator.storeEvent
        );
        let batchCommitPromise: Promise<void>;
        return accumulator
          .awaitEvent()
          .then(initialSnap => {
            expect(initialSnap.docs.length).to.equal(0);

            // Atomically write 1 document and update a nonexistent
            // document.
            batchCommitPromise = collection.firestore
              .batch()
              .set(docA, { a: 1 })
              .update(docB, { b: 2 })
              .commit();

            // Node logs warnings if you don't attach an error handler to a
            // Promise before it fails, so attach a dummy one here (we handle
            // the rejection for real below).
            batchCommitPromise.catch(err => {});

            return accumulator.awaitEvent();
          })
          .then(localSnap => {
            // Local event with the set document.
            expect(localSnap.metadata.hasPendingWrites).to.equal(true);
            expect(integrationHelpers.toDataArray(localSnap)).to.deep.equal([
              { a: 1 }
            ]);

            return accumulator.awaitEvent();
          })
          .then(serverSnap => {
            // Server event with the set reverted.
            expect(serverSnap.metadata.hasPendingWrites).to.equal(false);
            expect(serverSnap.docs.length).to.equal(0);

            return batchCommitPromise;
          })
          .then(
            () => {
              expect.fail('Batch commit should have failed.');
            },
            err => {
              expect(err.message).to.exist;
              // TODO: Change this to just match "no document to update" once
              // the backend response is consistent.
              expect(err.message).to.match(/no (document|entity) to update/i);
              expect(err.code).to.equal('not-found');
              unsubscribe();
            }
          );
      }
    );
  });

  it('write the same server timestamp across writes', () => {
    return integrationHelpers.withTestCollection(
      persistence,
      {},
      collection => {
        const docA = collection.doc('a');
        const docB = collection.doc('b');
        const accumulator = new EventsAccumulator<firestore.QuerySnapshot>();
        const unsubscribe = collection.onSnapshot(
          { includeMetadataChanges: true },
          accumulator.storeEvent
        );
        return accumulator
          .awaitEvent()
          .then(initialSnap => {
            expect(initialSnap.docs.length).to.equal(0);

            // Atomically write 2 documents with server timestamps.
            collection.firestore
              .batch()
              .set(docA, {
                when: FieldValue.serverTimestamp()
              })
              .set(docB, {
                when: FieldValue.serverTimestamp()
              })
              .commit();

            return accumulator.awaitEvent();
          })
          .then(localSnap => {
            expect(localSnap.metadata.hasPendingWrites).to.equal(true);
            expect(localSnap.docs.length).to.equal(2);
            expect(integrationHelpers.toDataArray(localSnap)).to.deep.equal([
              { when: null },
              { when: null }
            ]);

            return accumulator.awaitEvent();
          })
          .then(serverSnap => {
            expect(serverSnap.metadata.hasPendingWrites).to.equal(false);
            expect(serverSnap.docs.length).to.equal(2);
            const when = serverSnap.docs[0].data()['when'];
            expect(when).to.be.an.instanceof(Timestamp);
            expect(serverSnap.docs[1].data()['when']).to.deep.equal(when);
            const docChanges = serverSnap.docChanges({
              includeMetadataChanges: true
            });
            expect(docChanges[0].type).to.equal('modified');
            unsubscribe();
          });
      }
    );
  });

  it('can write the same document multiple times', () => {
    return integrationHelpers.withTestDoc(persistence, doc => {
      const accumulator = new EventsAccumulator<firestore.DocumentSnapshot>();
      const unsubscribe = doc.onSnapshot(
        { includeMetadataChanges: true },
        accumulator.storeEvent
      );
      return accumulator
        .awaitEvent()
        .then(initialSnap => {
          expect(initialSnap.exists).to.equal(false);

          doc.firestore
            .batch()
            .delete(doc)
            .set(doc, { a: 1, b: 1, when: 'when' })
            .update(doc, {
              b: 2,
              when: FieldValue.serverTimestamp()
            })
            .commit();

          return accumulator.awaitEvent();
        })
        .then(localSnap => {
          expect(localSnap.metadata.hasPendingWrites).to.equal(true);
          expect(localSnap.data()).to.deep.equal({ a: 1, b: 2, when: null });

          return accumulator.awaitEvent();
        })
        .then(serverSnap => {
          expect(serverSnap.metadata.hasPendingWrites).to.equal(false);
          const when = serverSnap.get('when');
          expect(when).to.be.an.instanceof(Timestamp);
          expect(serverSnap.data()).to.deep.equal({ a: 1, b: 2, when });
          unsubscribe();
        });
    });
  });
});
