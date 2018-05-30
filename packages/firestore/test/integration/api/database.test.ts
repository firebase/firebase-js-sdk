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
import * as firestore from '@firebase/firestore-types';

import { Deferred } from '../../util/promise';
import firebase from '../util/firebase_export';
import {
  apiDescribe,
  arrayContainsOp,
  withTestCollection,
  withTestDb,
  withTestDoc,
  withTestDocAndInitialData
} from '../util/helpers';
import { query } from '../../util/api_helpers';

const Timestamp = firebase.firestore.Timestamp;

apiDescribe('Database', persistence => {
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
        time: firebase.firestore.FieldValue.serverTimestamp(),
        nested: { time: firebase.firestore.FieldValue.serverTimestamp() }
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

  it('can delete field using merge', () => {
    return withTestDoc(persistence, doc => {
      const initialData = {
        untouched: true,
        foo: 'bar',
        nested: { untouched: true, foo: 'bar' }
      };
      const mergeData = {
        foo: firebase.firestore.FieldValue.delete(),
        nested: { foo: firebase.firestore.FieldValue.delete() }
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
        foo: firebase.firestore.FieldValue.delete(),
        inner: { foo: firebase.firestore.FieldValue.delete() },
        nested: {
          untouched: firebase.firestore.FieldValue.delete(),
          foo: firebase.firestore.FieldValue.delete()
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
        foo: firebase.firestore.FieldValue.serverTimestamp(),
        inner: { foo: firebase.firestore.FieldValue.serverTimestamp() },
        nested: { foo: firebase.firestore.FieldValue.serverTimestamp() }
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
        { desc: firebase.firestore.FieldValue.delete(), owner: 'Sebastian' },
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
          desc: firebase.firestore.FieldValue.serverTimestamp(),
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
          (err: firestore.FirestoreError) => {
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

  it('can update nested fields', () => {
    const FieldPath = firebase.firestore.FieldPath;

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

  describe('documents: ', () => {
    const invalidDocValues = [undefined, null, 0, 'foo', ['a'], new Date()];
    for (const val of invalidDocValues) {
      it('set/update should reject: ' + val, () => {
        return withTestDoc(persistence, async doc => {
          // tslint:disable-next-line:no-any Intentionally passing bad types.
          expect(() => doc.set(val as any)).to.throw();
          // tslint:disable-next-line:no-any Intentionally passing bad types.
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

  apiDescribe('Queries are validated client-side', persistence => {
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
          coll.where('x', '>=', 32).where('y', arrayContainsOp, 'cat')
        ).not.to.throw();
      });
    });

    it('inequality same as orderBy works.', () => {
      return withTestCollection(persistence, {}, async coll => {
        expect(() => coll.where('x', '>', 32).orderBy('x')).not.to.throw();
        expect(() => coll.orderBy('x').where('x', '>', 32)).not.to.throw();
      });
    });

    it('inequality same as first orderBy works.', () => {
      return withTestCollection(persistence, {}, async coll => {
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
          coll.orderBy('x').where('y', arrayContainsOp, 'cat')
        ).not.to.throw();
      });
    });
  });

  it('Listen can be called multiple times', () => {
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

  it('Local document events are fired with hasLocalChanges=true.', () => {
    return withTestDoc(persistence, docRef => {
      let gotLocalDocEvent = false;
      const remoteDocEventDeferred = new Deferred();
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

      docRef.set({ a: 1 }).then(() => {
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
  // tslint:disable-next-line:ban
  describe.skip('Listens are rejected remotely:', () => {
    const queryForRejection = query('foo');

    it('will reject listens', () => {
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

    it('will reject same listens twice in a row', () => {
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

    it('will reject gets', () => {
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

    it('will reject gets twice in a row', () => {
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
        .then(() => queryForRejection.get())
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
        expect(docRef.collection('baz').parent.isEqual(docRef)).to.be.true;

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

  it('can get documents while offline', () => {
    return withTestDoc(persistence, docRef => {
      const firestore = docRef.firestore;

      return firestore.disableNetwork().then(() => {
        const writePromise = docRef.set({ foo: 'bar' });

        return docRef
          .get()
          .then(doc => {
            expect(doc.metadata.fromCache).to.be.true;
            return firestore.enableNetwork();
          })
          .then(() => writePromise)
          .then(() => docRef.get())
          .then(doc => {
            expect(doc.metadata.fromCache).to.be.false;
            expect(doc.data()).to.deep.equal({ foo: 'bar' });
          });
      });
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
});
