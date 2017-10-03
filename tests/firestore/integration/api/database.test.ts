/**
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

import { expect } from 'chai';
import * as firestore from 'firestore';

import { Deferred } from '../../../../src/firestore/util/promise';
import { asyncIt } from '../../util/helpers';
import firebase from '../util/firebase_export';
import { apiDescribe, withTestCollection, withTestDb } from '../util/helpers';
import { PromiseImpl as Promise } from '../../../../src/utils/promise';

apiDescribe('Database', persistence => {
  asyncIt('can set a document', () => {
    return withTestDb(persistence, db => {
      return db.doc('rooms/Eros').set({
        desc: 'Stuff related to Eros project...',
        owner: {
          name: 'Jonny',
          title: 'scallywag'
        }
      });
    });
  });

  asyncIt('doc() will auto generate an ID', () => {
    return withTestDb(persistence, db => {
      const ref = db.collection('foo').doc();
      // Auto IDs are 20 characters long
      expect(ref.id.length).to.equal(20);
      return Promise.resolve();
    });
  });

  asyncIt('can delete a document', () => {
    return withTestDb(persistence, db => {
      const docRef = db.doc('rooms/Eros');
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

  asyncIt('can update existing document', () => {
    return withTestDb(persistence, db => {
      const doc = db.doc('rooms/Eros');
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

  asyncIt('can merge data with an existing document using set', () => {
    return withTestDb(persistence, db => {
      const doc = db.doc('rooms/Eros');
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

  asyncIt('can merge server timestamps', () => {
    return withTestDb(persistence, db => {
      const doc = db.doc('rooms/Eros');
      const initialData = {
        updated: false
      };
      const mergeData = {
        time: firebase.firestore.FieldValue.serverTimestamp()
      };
      return doc
        .set(initialData)
        .then(() => doc.set(mergeData, { merge: true }))
        .then(() => doc.get())
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.be.ok;
          expect(docSnapshot.get('updated')).to.be.false;
          expect(docSnapshot.get('time')).to.be.a('Date');
        });
    });
  });

  asyncIt('can replace an array by merging using set', () => {
    return withTestDb(persistence, db => {
      const doc = db.doc('rooms/Eros');
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

  asyncIt('cannot update nonexistent document', () => {
    return withTestDb(persistence, db => {
      const doc = db.collection('rooms').doc();
      return doc
        .update({ owner: 'abc' })
        .then(
          () => Promise.reject('update should have failed.'),
          (err: firestore.FirestoreError) => {
            expect(err.message).to.exist;
            expect(err.message).to.contain('no entity to update');
            expect(err.code).to.equal('not-found');
          }
        )
        .then(() => doc.get())
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.equal(false);
        });
    });
  });

  asyncIt('can delete a field with an update', () => {
    return withTestDb(persistence, db => {
      const doc = db.doc('rooms/Eros');
      const initialData = {
        desc: 'Description',
        owner: { name: 'Jonny', email: 'abc@xyz.com' }
      };
      const updateData = {
        'owner.email': firebase.firestore.FieldValue.delete()
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

  asyncIt('can update nested fields', () => {
    const FieldPath = firebase.firestore.FieldPath;

    return withTestDb(persistence, db => {
      const doc = db.doc('rooms/Eros');
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

  describe('documents: ', () => {
    const invalidDocValues = [undefined, null, 0, 'foo', ['a'], new Date()];
    for (const val of invalidDocValues) {
      asyncIt('set/update should reject: ' + val, () => {
        return withTestDb(persistence, db => {
          const doc = db.collection('rooms').doc();
          // tslint:disable-next-line:no-any Intentionally passing bad types.
          expect(() => doc.set(val as any)).to.throw();
          // tslint:disable-next-line:no-any Intentionally passing bad types.
          expect(() => doc.update(val as any)).to.throw();
          return Promise.resolve();
        });
      });
    }
  });

  asyncIt('CollectionRef.add() resolves with resulting DocumentRef.', () => {
    return withTestCollection(persistence, {}, coll => {
      return coll
        .add({ foo: 1 })
        .then(docRef => docRef.get())
        .then(docSnap => {
          expect(docSnap.data()).to.deep.equal({ foo: 1 });
        });
    });
  });

  apiDescribe('Queries are validated client-side', persistence => {
    // NOTE: Failure cases are validated in validation_test.ts

    asyncIt('same inequality fields works', () => {
      return withTestCollection(persistence, {}, coll => {
        expect(() =>
          coll.where('x', '>=', 32).where('x', '<=', 'cat')
        ).not.to.throw();
        return Promise.resolve();
      });
    });

    asyncIt('inequality and equality on different fields works', () => {
      return withTestCollection(persistence, {}, coll => {
        expect(() =>
          coll.where('x', '>=', 32).where('y', '==', 'cat')
        ).not.to.throw();
        return Promise.resolve();
      });
    });

    asyncIt('inequality same as orderBy works.', () => {
      return withTestCollection(persistence, {}, coll => {
        expect(() => coll.where('x', '>', 32).orderBy('x')).not.to.throw();
        expect(() => coll.orderBy('x').where('x', '>', 32)).not.to.throw();
        return Promise.resolve();
      });
    });

    asyncIt('inequality same as first orderBy works.', () => {
      return withTestCollection(persistence, {}, coll => {
        expect(() =>
          coll
            .where('x', '>', 32)
            .orderBy('x')
            .orderBy('y')
        ).not.to.throw();
        expect(() =>
          coll
            .orderBy('x')
            .where('x', '>', 32)
            .orderBy('y')
        ).not.to.throw();
        return Promise.resolve();
      });
    });
  });

  asyncIt('Listen can be called multiple times', () => {
    return withTestCollection(persistence, {}, coll => {
      const doc = coll.doc();
      const deferred1 = new Deferred<void>();
      const deferred2 = new Deferred<void>();
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

  asyncIt('Local document events are fired with hasLocalChanges=true.', () => {
    return withTestDb(persistence, db => {
      let gotLocalDocEvent = false;
      const remoteDocEventDeferred = new Deferred();
      const docRef = db.collection('rooms').doc();
      const unlisten = docRef.onSnapshot(
        { includeMetadataChanges: true },
        doc => {
          if (doc.exists) {
            expect(doc.data()).to.deep.equal({ a: 1 });
            if (doc.metadata.hasPendingWrites) {
              gotLocalDocEvent = true;
            } else {
              expect(gotLocalDocEvent).to.equal(true);
              remoteDocEventDeferred.resolve();
            }
          }
        }
      );

      docRef.set({ a: 1 });
      return remoteDocEventDeferred.promise.then(() => {
        unlisten();
      });
    });
  });

  asyncIt(
    'Metadata only changes are not fired when no options provided',
    () => {
      return withTestDb(persistence, db => {
        const secondUpdateFound = new Deferred();
        let count = 0;
        const docRef = db.collection('rooms').doc();
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

        docRef.set({ a: 1 }).then(() => {
          docRef.set({ b: 1 });
        });
        return secondUpdateFound.promise.then(() => {
          unlisten();
        });
      });
    }
  );

  // TODO(mikelehen): We need a way to create a query that will pass
  // client-side validation but fail remotely.  May need to wait until we
  // have security rules support or something?
  xdescribe('Listens are rejected remotely:', () => {
    let queryForRejection: firestore.Query;

    asyncIt('will reject listens', () => {
      const deferred = new Deferred();
      queryForRejection.onSnapshot(
        () => {},
        (err: Error) => {
          expect(err.name).to.exist;
          expect(err.message).to.exist;
          deferred.resolve();
        }
      );
      return deferred.promise;
    });

    asyncIt('will reject same listens twice in a row', () => {
      const deferred = new Deferred();
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
      return deferred.promise;
    });

    asyncIt('will reject gets', () => {
      return queryForRejection.get().then(
        () => {
          throw new Error('Promise resolved even though error was expected.');
        },
        err => {
          expect(err.name).to.exist;
          expect(err.message).to.exist;
        }
      );
    });

    asyncIt('will reject gets twice in a row', () => {
      return queryForRejection
        .get()
        .then(
          () => {
            throw new Error('Promise resolved even though error was expected.');
          },
          err => {
            expect(err.name).to.exist;
            expect(err.message).to.exist;
          }
        )
        .then(queryForRejection.get)
        .then(
          () => {
            throw new Error('Promise resolved even though error was expected.');
          },
          err => {
            expect(err.name).to.exist;
            expect(err.message).to.exist;
          }
        );
    });
  });

  asyncIt('exposes "database" on document references.', () => {
    return withTestDb(persistence, db => {
      expect(db.doc('foo/bar').firestore).to.equal(db);
      return Promise.resolve();
    });
  });

  asyncIt('exposes "database" on query references.', () => {
    return withTestDb(persistence, db => {
      expect(db.collection('foo').limit(5).firestore).to.equal(db);
      return Promise.resolve();
    });
  });

  asyncIt('can traverse collections and documents.', () => {
    return withTestDb(persistence, db => {
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
      return Promise.resolve();
    });
  });

  asyncIt('can traverse collection and document parents.', () => {
    return withTestDb(persistence, db => {
      let collection = db.collection('a/b/c');
      expect(collection.path).to.deep.equal('a/b/c');

      const doc = collection.parent!;
      expect(doc.path).to.deep.equal('a/b');

      collection = doc.parent;
      expect(collection.path).to.equal('a');

      const nullDoc = collection.parent;
      expect(nullDoc).to.equal(null);
      return Promise.resolve();
    });
  });
});
