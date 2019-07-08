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
import { Deferred } from '../../util/promise';
import firebase from '../util/firebase_export';
import * as integrationHelpers from '../util/helpers';

const apiDescribe = integrationHelpers.apiDescribe;

apiDescribe('Database transactions', (persistence: boolean) => {
  // TODO(klimt): Test that transactions don't see latency compensation
  // changes, using the other kind of integration test.
  // We currently require every document read to also be written.
  it('get documents', () => {
    return integrationHelpers.withTestDb(persistence, db => {
      const doc = db.collection('spaces').doc();
      return doc
        .set({
          foo: 1,
          desc: 'Stuff related to Firestore project...',
          owner: 'Jonny'
        })
        .then(() => {
          return (
            db
              .runTransaction(transaction => {
                return transaction.get(doc);
              })
              // We currently require every document read to also be
              // written.
              // TODO(b/34879758): Add this check back once we drop that.
              // .then((snapshot) => {
              //   expect(snapshot).to.exist;
              //   expect(snapshot.data()['owner']).to.equal('Jonny');
              // });
              .then(() => expect.fail('transaction should fail'))
              .catch(err => {
                expect(err).to.exist;
                expect(err.message).to.contain(
                  'Every document read in a transaction must also be' +
                    ' written'
                );
              })
          );
        });
    });
  });

  it('delete documents', () => {
    return integrationHelpers.withTestDb(persistence, db => {
      const doc = db.collection('towns').doc();
      return doc
        .set({ foo: 'bar' })
        .then(() => {
          return doc.get();
        })
        .then(snapshot => {
          expect(snapshot).to.exist;
          expect(snapshot.data()!['foo']).to.equal('bar');
          return db.runTransaction(async transaction => {
            transaction.delete(doc);
          });
        })
        .then(() => {
          return doc.get();
        })
        .then(snapshot => {
          expect(snapshot.exists).to.equal(false);
        });
    });
  });

  it('get nonexistent document then create', () => {
    return integrationHelpers.withTestDb(persistence, db => {
      const docRef = db.collection('towns').doc();
      return db
        .runTransaction(transaction => {
          return transaction.get(docRef).then(docSnap => {
            expect(docSnap.exists).to.equal(false);
            transaction.set(docRef, { foo: 'bar' });
          });
        })
        .then(() => {
          return docRef.get();
        })
        .then(snapshot => {
          expect(snapshot.exists).to.equal(true);
          expect(snapshot.data()).to.deep.equal({ foo: 'bar' });
        });
    });
  });

  it('get nonexistent document then fail patch', () => {
    return integrationHelpers.withTestDb(persistence, db => {
      const docRef = db.collection('towns').doc();
      return db
        .runTransaction(transaction => {
          return transaction.get(docRef).then(docSnap => {
            expect(docSnap.exists).to.equal(false);
            transaction.update(docRef, { foo: 'bar' });
          });
        })
        .then(() => expect.fail('transaction should fail'))
        .catch((err: firestore.FirestoreError) => {
          expect(err).to.exist;
          expect(err.code).to.equal('invalid-argument');
        });
    });
  });

  it("can't delete document then patch", () => {
    return integrationHelpers.withTestDb(persistence, db => {
      const docRef = db.collection('towns').doc();
      return docRef.set({ foo: 'bar' }).then(() => {
        return db
          .runTransaction(transaction => {
            return transaction.get(docRef).then(docSnap => {
              expect(docSnap.exists).to.equal(true);
              transaction.delete(docRef);
              // Since we deleted the doc, the update will fail
              transaction.update(docRef, { foo: 'new-bar' });
            });
          })
          .catch((err: firestore.FirestoreError) => {
            expect(err).to.exist;
            // This is the error surfaced by the backend.
            expect(err.code).to.equal('invalid-argument');
          });
      });
    });
  });

  it("can't delete document then set", () => {
    return integrationHelpers.withTestDb(persistence, db => {
      const docRef = db.collection('towns').doc();
      return docRef.set({ foo: 'bar' }).then(() => {
        return db
          .runTransaction(transaction => {
            return transaction.get(docRef).then(docSnap => {
              expect(docSnap.exists).to.equal(true);
              transaction.delete(docRef);
              // TODO(dimond): In theory this should work, but it's complex to
              // make it work, so instead we just let the transaction fail and
              // verify it's unsupported for now
              transaction.set(docRef, { foo: 'new-bar' });
            });
          })
          .then(() => expect.fail('transaction should fail'))
          .catch(err => {
            expect(err).to.exist;
            // This is the error surfaced by the backend.
            expect((err as firestore.FirestoreError).code).to.equal(
              'invalid-argument'
            );
          });
      });
    });
  });

  it('write document twice', () => {
    return integrationHelpers.withTestDb(persistence, db => {
      const doc = db.collection('towns').doc();
      return db
        .runTransaction(async transaction => {
          transaction.set(doc, { a: 'b' }).set(doc, { c: 'd' });
        })
        .then(() => {
          return doc.get();
        })
        .then(snapshot => {
          expect(snapshot.exists).to.equal(true);
          expect(snapshot.data()).to.deep.equal({ c: 'd' });
        });
    });
  });

  it('set document with merge', () => {
    return integrationHelpers.withTestDb(persistence, db => {
      const doc = db.collection('towns').doc();
      return db
        .runTransaction(async transaction => {
          transaction.set(doc, { a: 'b', nested: { a: 'b' } }).set(
            doc,
            { c: 'd', nested: { c: 'd' } },
            {
              merge: true
            }
          );
        })
        .then(() => {
          return doc.get();
        })
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

  it('increment transactionally', () => {
    // A set of concurrent transactions.
    const transactionPromises: Array<Promise<void>> = [];
    const readPromises: Array<Promise<void>> = [];
    // A barrier to make sure every transaction reaches the same spot.
    const barrier = new Deferred();
    let started = 0;

    return integrationHelpers.withTestDb(persistence, db => {
      const doc = db.collection('counters').doc();
      return doc
        .set({
          count: 5
        })
        .then(() => {
          // Make 3 transactions that will all increment.
          for (let i = 0; i < 3; i++) {
            const resolveRead = new Deferred<void>();
            readPromises.push(resolveRead.promise);
            transactionPromises.push(
              db.runTransaction(transaction => {
                return transaction.get(doc).then(snapshot => {
                  expect(snapshot).to.exist;
                  started = started + 1;
                  resolveRead.resolve();
                  return barrier.promise.then(() => {
                    transaction.set(doc, {
                      count: snapshot.data()!['count'] + 1
                    });
                  });
                });
              })
            );
          }

          // Let all of the transactions fetch the old value and stop once.
          return Promise.all(readPromises);
        })
        .then(() => {
          // Let all of the transactions continue and wait for them to
          // finish.
          expect(started).to.equal(3);
          barrier.resolve();
          return Promise.all(transactionPromises);
        })
        .then(() => {
          // Now all transaction should be completed, so check the result.
          return doc.get();
        })
        .then(snapshot => {
          expect(snapshot).to.exist;
          expect(snapshot.data()!['count']).to.equal(8);
        });
    });
  });

  it('update transactionally', () => {
    // A set of concurrent transactions.
    const transactionPromises: Array<Promise<void>> = [];
    const readPromises: Array<Promise<void>> = [];
    // A barrier to make sure every transaction reaches the same spot.
    const barrier = new Deferred();
    let started = 0;

    return integrationHelpers.withTestDb(persistence, db => {
      const doc = db.collection('counters').doc();
      return doc
        .set({
          count: 5,
          other: 'yes'
        })
        .then(() => {
          // Make 3 transactions that will all increment.
          for (let i = 0; i < 3; i++) {
            const resolveRead = new Deferred<void>();
            readPromises.push(resolveRead.promise);
            transactionPromises.push(
              db.runTransaction(transaction => {
                return transaction.get(doc).then(snapshot => {
                  expect(snapshot).to.exist;
                  started = started + 1;
                  resolveRead.resolve();
                  return barrier.promise.then(() => {
                    transaction.update(doc, {
                      count: snapshot.data()!['count'] + 1
                    });
                  });
                });
              })
            );
          }

          // Let all of the transactions fetch the old value and stop once.
          return Promise.all(readPromises);
        })
        .then(() => {
          // Let all of the transactions continue and wait for them to
          // finish.
          expect(started).to.equal(3);
          barrier.resolve();
          return Promise.all(transactionPromises);
        })
        .then(() => {
          // Now all transaction should be completed, so check the result.
          return doc.get();
        })
        .then(snapshot => {
          expect(snapshot).to.exist;
          expect(snapshot.data()!['count']).to.equal(8);
          expect(snapshot.data()!['other']).to.equal('yes');
        });
    });
  });

  it('can update nested fields transactionally', () => {
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
      return db
        .runTransaction(async transaction => {
          transaction.set(doc, initialData);
          transaction.update(
            doc,
            'owner.name',
            'Sebastian',
            new firebase.firestore!.FieldPath('is.admin'),
            true
          );
        })
        .then(() => doc.get())
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.be.ok;
          expect(docSnapshot.data()).to.deep.equal(finalData);
        });
    });
  });

  it('handle reading one doc and writing another', () => {
    return integrationHelpers.withTestDb(persistence, db => {
      const doc1 = db.collection('counters').doc();
      const doc2 = db.collection('counters').doc();
      // let tries = 0;
      return (
        doc1
          .set({
            count: 15
          })
          .then(() => {
            return db.runTransaction(transaction => {
              // ++tries;

              // Get the first doc.
              return (
                transaction
                  .get(doc1)
                  // Do a write outside of the transaction. The first time the
                  // transaction is tried, this will bump the version, which
                  // will cause the write to doc2 to fail. The second time, it
                  // will be a no-op and not bump the version.
                  .then(() => doc1.set({ count: 1234 }))
                  // Now try to update the other doc from within the
                  // transaction.
                  // This should fail once, because we read 15 earlier.
                  .then(() => transaction.set(doc2, { count: 16 }))
              );
            });
          })
          // We currently require every document read to also be written.
          // TODO(b/34879758): Add this check back once we drop that.
          // .then(() => doc1.get())
          // .then(snapshot => {
          //   expect(tries).to.equal(2);
          //   expect(snapshot.data()['count']).to.equal(1234);
          //   return doc2.get();
          // })
          // .then(snapshot => expect(snapshot.data()['count']).to.equal(16));
          .then(() => expect.fail('transaction should fail'))
          .catch(err => {
            expect(err).to.exist;
            expect(err.message).to.contain(
              'Every document read in a transaction must also be ' + 'written'
            );
          })
      );
    });
  });

  it('handle reading a doc twice with different versions', () => {
    return integrationHelpers.withTestDb(persistence, db => {
      const doc = db.collection('counters').doc();
      return doc
        .set({
          count: 15
        })
        .then(() => {
          return db.runTransaction(transaction => {
            // Get the doc once.
            return (
              transaction
                .get(doc)
                // Do a write outside of the transaction.
                .then(() => doc.set({ count: 1234 }))
                // Get the doc again in the transaction with the new
                // version.
                .then(() => transaction.get(doc))
                // Now try to update the doc from within the transaction.
                // This should fail, because we read 15 earlier.
                .then(() => transaction.set(doc, { count: 16 }))
            );
          });
        })
        .then(() => expect.fail('transaction should fail'))
        .catch(err => {
          expect(err).to.exist;
          expect((err as firestore.FirestoreError).code).to.equal('aborted');
        })
        .then(() => doc.get())
        .then(snapshot => {
          expect(snapshot.data()!['count']).to.equal(1234);
        });
    });
  });

  it('cannot read after writing', () => {
    return integrationHelpers.withTestDb(persistence, db => {
      return db
        .runTransaction(transaction => {
          const doc = db.collection('anything').doc();
          transaction.set(doc, { foo: 'bar' });
          return transaction.get(doc);
        })
        .then(() => {
          expect.fail('transaction should fail');
        })
        .catch((err: firestore.FirestoreError) => {
          expect(err).to.exist;
          expect(err.code).to.equal('invalid-argument');
          expect(err.message).to.contain(
            'Firestore transactions require all reads to be executed'
          );
        });
    });
  });

  it(
    'cannot read non-existent document then update, even if ' +
      'document is written after the read',
    () => {
      return integrationHelpers.withTestDb(persistence, db => {
        let counter = 0;
        return db
          .runTransaction(transaction => {
            counter += 1;
            const doc = db.collection('nonexistent' + counter).doc();
            return (
              transaction
                // Get and update a document that doesn't exist so that the transaction fails.
                .get(doc)
                // Do a write outside of the transaction.
                .then(() => doc.set({ count: counter }))
                // Now try to update the doc from within the transaction. This
                // should fail, because the document didn't exist at the start
                // of the transaction.
                .then(() => transaction.update(doc, { count: 1234 }))
            );
          })
          .then(() => expect.fail('transaction should fail'))
          .catch(err => {
            expect(err).to.exist;
            expect((err as firestore.FirestoreError).code).to.equal(
              'invalid-argument'
            );
            expect(err.message).to.contain(
              "Can't update a document that doesn't exist."
            );
          });
      });
    }
  );

  describe('must return a promise:', () => {
    const noop = (): void => {
      /* -_- */
    };
    const badReturns = [
      undefined,
      null,
      5,
      {},
      { then: noop, noCatch: noop },
      { noThen: noop, catch: noop }
    ];

    for (const badReturn of badReturns) {
      it(badReturn + ' is rejected', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, Intentionally returning bad type.
        const fn = ((txn: firestore.Transaction) => badReturn) as any;
        return integrationHelpers.withTestDb(persistence, db => {
          return db
            .runTransaction(fn)
            .then(() => expect.fail('transaction should fail'))
            .catch(err => {
              expect(err).to.exist;
              expect(err.message).to.contain(
                'Transaction callback must return a Promise'
              );
            });
        });
      });
    }
  });

  it('cannot have a get without mutations', () => {
    return integrationHelpers.withTestDb(persistence, db => {
      const docRef = db.collection('foo').doc();
      return (
        docRef
          .set({ foo: 'bar' })
          .then(() => {
            return db.runTransaction(txn => {
              return txn.get(docRef);
            });
          })
          // We currently require every document read to also be written.
          // TODO(b/34879758): Add this check back once we drop that.
          // .then((snapshot) => {
          //   expect(snapshot).to.exist;
          //   expect(snapshot.data()['foo']).to.equal('bar');
          // });
          .then(() => expect.fail('transaction should fail'))
          .catch((err: firestore.FirestoreError) => {
            expect(err).to.exist;
            expect(err.code).to.equal('invalid-argument');
            expect(err.message).to.contain(
              'Every document read in a transaction must also be ' + 'written'
            );
          })
      );
    });
  });

  it('are successful with no transaction operations', () => {
    return integrationHelpers.withTestDb(persistence, db => {
      return db.runTransaction(async txn => {});
    });
  });

  it('are cancelled on rejected promise', () => {
    return integrationHelpers.withTestDb(persistence, db => {
      const doc = db.collection('towns').doc();
      let count = 0;
      return db
        .runTransaction(transaction => {
          count++;
          transaction.set(doc, { foo: 'bar' });
          return Promise.reject('no');
        })
        .then(() => expect.fail('transaction should fail'))
        .catch(err => {
          expect(err).to.exist;
          expect(err).to.equal('no');
          expect(count).to.equal(1);
          return doc.get();
        })
        .then(snapshot => {
          expect((snapshot as firestore.DocumentSnapshot).exists).to.equal(
            false
          );
        });
    });
  });

  it('are cancelled on throw', () => {
    return integrationHelpers.withTestDb(persistence, db => {
      const doc = db.collection('towns').doc();
      const failure = new Error('no');
      let count = 0;
      return db
        .runTransaction(transaction => {
          count++;
          transaction.set(doc, { foo: 'bar' });
          throw failure;
        })
        .then(() => expect.fail('transaction should fail'))
        .catch(err => {
          expect(err).to.exist;
          expect(err).to.equal(failure);
          expect(count).to.equal(1);
          return doc.get();
        })
        .then(snapshot => {
          expect((snapshot as firestore.DocumentSnapshot).exists).to.equal(
            false
          );
        });
    });
  });
});
