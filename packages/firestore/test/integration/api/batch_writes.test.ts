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

import { EventsAccumulator } from '../util/events_accumulator';
import {
  collection,
  getDoc,
  setDoc,
  writeBatch,
  doc,
  DocumentData,
  DocumentSnapshot,
  onSnapshot,
  QuerySnapshot,
  serverTimestamp,
  FieldPath,
  Timestamp,
  QueryDocumentSnapshot
} from '../util/firebase_export';
import {
  apiDescribe,
  toDataArray,
  withTestCollection,
  withTestDb,
  withTestDoc
} from '../util/helpers';

apiDescribe('Database batch writes', persistence => {
  it('supports empty batches', () => {
    return withTestDb(persistence, db => {
      return writeBatch(db).commit();
    });
  });

  it('can set documents', () => {
    return withTestDoc(persistence, (doc, db) => {
      return writeBatch(db)
        .set(doc, { foo: 'bar' })
        .commit()
        .then(() => getDoc(doc))
        .then(snapshot => {
          expect(snapshot.exists()).to.equal(true);
          expect(snapshot.data()).to.deep.equal({ foo: 'bar' });
        });
    });
  });

  it('can set documents with merge', () => {
    return withTestDoc(persistence, (doc, db) => {
      return writeBatch(db)
        .set(doc, { a: 'b', nested: { a: 'b' } }, { merge: true })
        .commit()
        .then(() => {
          return writeBatch(db)
            .set(doc, { c: 'd', nested: { c: 'd' } }, { merge: true })
            .commit();
        })
        .then(() => getDoc(doc))
        .then(snapshot => {
          expect(snapshot.exists()).to.equal(true);
          expect(snapshot.data()).to.deep.equal({
            a: 'b',
            c: 'd',
            nested: { a: 'b', c: 'd' }
          });
        });
    });
  });

  it('can update documents', () => {
    return withTestDoc(persistence, (doc, db) => {
      return setDoc(doc, { foo: 'bar' })
        .then(() => writeBatch(db).update(doc, { baz: 42 }).commit())
        .then(() => getDoc(doc))
        .then(snapshot => {
          expect(snapshot.exists()).to.equal(true);
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

    return withTestDb(persistence, db => {
      const docRef = doc(collection(db, 'counters'));
      return writeBatch(db)
        .set(docRef, initialData)
        .update(
          docRef,
          'owner.name',
          'Sebastian',
          new FieldPath('is.admin'),
          true
        )
        .commit()
        .then(() => getDoc(docRef))
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.be.ok;
          expect(docSnapshot.data()).to.deep.equal(finalData);
        });
    });
  });

  it('can delete documents', () => {
    // TODO(#1865): This test fails with node:persistence against Prod
    return withTestDoc(persistence, (doc, db) => {
      return setDoc(doc, { foo: 'bar' })
        .then(() => getDoc(doc))
        .then(snapshot => {
          expect(snapshot.exists()).to.equal(true);
        })
        .then(() => writeBatch(db).delete(doc).commit())
        .then(() => getDoc(doc))
        .then(snapshot => {
          expect(snapshot.exists()).to.equal(false);
        });
    });
  });

  it('commit atomically, raising correct events', () => {
    return withTestCollection(persistence, {}, (collection, db) => {
      const docA = doc(collection, 'a');
      const docB = doc(collection, 'b');
      const accumulator = new EventsAccumulator<QuerySnapshot>();
      const unsubscribe = onSnapshot(
        collection,
        { includeMetadataChanges: true },
        accumulator.storeEvent
      );
      return accumulator
        .awaitEvent()
        .then(initialSnap => {
          expect(initialSnap.docs.length).to.equal(0);

          // Atomically write two documents.
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          writeBatch(db).set(docA, { a: 1 }).set(docB, { b: 2 }).commit();

          return accumulator.awaitEvent();
        })
        .then(localSnap => {
          expect(localSnap.metadata.hasPendingWrites).to.equal(true);
          expect(toDataArray(localSnap)).to.deep.equal([{ a: 1 }, { b: 2 }]);
          return accumulator.awaitEvent();
        })
        .then(serverSnap => {
          expect(serverSnap.metadata.hasPendingWrites).to.equal(false);
          expect(toDataArray(serverSnap)).to.deep.equal([{ a: 1 }, { b: 2 }]);
          unsubscribe();
        });
    });
  });

  it('fail atomically, raising correct events', () => {
    return withTestCollection(persistence, {}, (collection, db) => {
      const docA = doc(collection, 'a');
      const docB = doc(collection, 'b');
      const accumulator = new EventsAccumulator<QuerySnapshot>();
      const unsubscribe = onSnapshot(
        collection,
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
          batchCommitPromise = writeBatch(db)
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
          expect(toDataArray(localSnap)).to.deep.equal([{ a: 1 }]);

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
            expect(err.code).to.equal('not-found');
            unsubscribe();
          }
        );
    });
  });

  it('write the same server timestamp across writes', () => {
    return withTestCollection(persistence, {}, (collection, db) => {
      const docA = doc(collection, 'a');
      const docB = doc(collection, 'b');
      const accumulator = new EventsAccumulator<QuerySnapshot>();
      const unsubscribe = onSnapshot(
        collection,
        { includeMetadataChanges: true },
        accumulator.storeEvent
      );
      return accumulator
        .awaitEvent()
        .then(initialSnap => {
          expect(initialSnap.docs.length).to.equal(0);

          // Atomically write 2 documents with server timestamps.
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          writeBatch(db)
            .set(docA, {
              when: serverTimestamp()
            })
            .set(docB, {
              when: serverTimestamp()
            })
            .commit();

          return accumulator.awaitEvent();
        })
        .then(localSnap => {
          expect(localSnap.metadata.hasPendingWrites).to.equal(true);
          expect(localSnap.docs.length).to.equal(2);
          expect(toDataArray(localSnap)).to.deep.equal([
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
    });
  });

  it('can write the same document multiple times', () => {
    return withTestDoc(persistence, (doc, db) => {
      const accumulator = new EventsAccumulator<DocumentSnapshot>();
      const unsubscribe = onSnapshot(
        doc,
        { includeMetadataChanges: true },
        accumulator.storeEvent
      );
      return accumulator
        .awaitEvent()
        .then(initialSnap => {
          expect(initialSnap.exists()).to.equal(false);
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          writeBatch(db)
            .delete(doc)
            .set(doc, { a: 1, b: 1, when: 'when' })
            .update(doc, {
              b: 2,
              when: serverTimestamp()
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

  // PORTING NOTE: These tests are for FirestoreDataConverter support and apply
  // only to web.
  apiDescribe('withConverter() support', persistence => {
    class Post {
      constructor(readonly title: string, readonly author: string) {}
      byline(): string {
        return this.title + ', by ' + this.author;
      }
    }

    it('for WriteBatch.set<T>()', () => {
      return withTestDb(persistence, db => {
        const docRef = doc(collection(db, 'posts')).withConverter({
          toFirestore(post: Post): DocumentData {
            return { title: post.title, author: post.author };
          },
          fromFirestore(snapshot: QueryDocumentSnapshot): Post {
            const data = snapshot.data();
            return new Post(data.title, data.author);
          }
        });
        return writeBatch(db)
          .set(docRef, new Post('post', 'author'))
          .commit()
          .then(() => getDoc(docRef))
          .then(snapshot => {
            expect(snapshot.exists()).to.equal(true);
            expect(snapshot.data()!.byline()).to.deep.equal('post, by author');
          });
      });
    });
  });
});
