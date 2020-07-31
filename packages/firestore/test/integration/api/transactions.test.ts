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

import * as firestore from '@firebase/firestore-types';
import { expect } from 'chai';
import * as firebaseExport from '../util/firebase_export';
import * as integrationHelpers from '../util/helpers';

const FieldPath = firebaseExport.FieldPath;

const apiDescribe = integrationHelpers.apiDescribe;
apiDescribe('Database transactions', (persistence: boolean) => {
  type TransactionStage = (
    transaction: firestore.Transaction,
    docRef: firestore.DocumentReference
  ) => void;

  /**
   * The transaction stages that follow are postfixed by numbers to indicate the
   * calling order. For example, calling `set1()` followed by `set2()` should
   * result in the document being set to the value specified by `set2()`.
   */
  async function delete1(
    transaction: firestore.Transaction,
    docRef: firestore.DocumentReference
  ): Promise<void> {
    transaction.delete(docRef);
  }

  async function update1(
    transaction: firestore.Transaction,
    docRef: firestore.DocumentReference
  ): Promise<void> {
    transaction.update(docRef, { foo: 'bar1' });
  }

  async function update2(
    transaction: firestore.Transaction,
    docRef: firestore.DocumentReference
  ): Promise<void> {
    transaction.update(docRef, { foo: 'bar2' });
  }

  async function set1(
    transaction: firestore.Transaction,
    docRef: firestore.DocumentReference
  ): Promise<void> {
    transaction.set(docRef, { foo: 'bar1' });
  }

  async function set2(
    transaction: firestore.Transaction,
    docRef: firestore.DocumentReference
  ): Promise<void> {
    transaction.set(docRef, { foo: 'bar2' });
  }

  async function get(
    transaction: firestore.Transaction,
    docRef: firestore.DocumentReference
  ): Promise<void> {
    await transaction.get(docRef);
  }

  /**
   * Used for testing that all possible combinations of executing transactions
   * result in the desired document value or error.
   *
   * `run()`, `withExistingDoc()`, and `withNonexistentDoc()` don't actually do
   * anything except assign variables into the TransactionTester.
   *
   * `expectDoc()`, `expectNoDoc()`, and `expectError()` will trigger the
   * transaction to run and assert that the end result matches the input.
   */
  class TransactionTester {
    constructor(readonly db: firestore.FirebaseFirestore) {}

    private docRef!: firestore.DocumentReference;
    private fromExistingDoc: boolean = false;
    private stages: TransactionStage[] = [];

    withExistingDoc(): this {
      this.fromExistingDoc = true;
      return this;
    }

    withNonexistentDoc(): this {
      this.fromExistingDoc = false;
      return this;
    }

    run(...stages: TransactionStage[]): this {
      this.stages = stages;
      return this;
    }

    async expectDoc(expected: object): Promise<void> {
      try {
        await this.prepareDoc();
        await this.runTransaction();
        const snapshot = await this.docRef.get();
        expect(snapshot.exists).to.equal(true);
        expect(snapshot.data()).to.deep.equal(expected);
      } catch (err) {
        expect.fail(
          'Expected the sequence (' +
            this.listStages(this.stages) +
            ') to succeed, but got ' +
            err
        );
      }
      this.cleanupTester();
    }

    async expectNoDoc(): Promise<void> {
      try {
        await this.prepareDoc();
        await this.runTransaction();
        const snapshot = await this.docRef.get();
        expect(snapshot.exists).to.equal(false);
      } catch (err) {
        expect.fail(
          'Expected the sequence (' +
            this.listStages(this.stages) +
            ') to succeed, but got ' +
            err
        );
      }
      this.cleanupTester();
    }

    async expectError(expected: string): Promise<void> {
      let succeeded = false;
      try {
        await this.prepareDoc();
        await this.runTransaction();
        succeeded = true;
      } catch (err) {
        expect((err as firestore.FirestoreError).code).to.equal(expected);
      }
      if (succeeded) {
        expect.fail(
          'Expected the sequence (' +
            this.listStages(this.stages) +
            ') to fail with the error ' +
            expected
        );
      }
      this.cleanupTester();
    }

    private async prepareDoc(): Promise<void> {
      this.docRef = this.db.collection('tester-docref').doc();
      if (this.fromExistingDoc) {
        await this.docRef.set({ foo: 'bar0' });
      }
    }

    private async runTransaction(): Promise<void> {
      await this.db.runTransaction(async transaction => {
        for (const stage of this.stages) {
          await stage(transaction, this.docRef);
        }
      });
    }

    private cleanupTester(): void {
      this.stages = [];
      // Set the docRef to something else to lose the original reference.
      this.docRef = this.db.collection('reset').doc();
    }

    private listStages(stages: TransactionStage[]): string {
      const seqList: string[] = [];
      for (const stage of stages) {
        if (stage === delete1) {
          seqList.push('delete');
        } else if (stage === update1 || stage === update2) {
          seqList.push('update');
        } else if (stage === set1 || stage === set2) {
          seqList.push('set');
        } else if (stage === get) {
          seqList.push('get');
        } else {
          throw new Error('Stage not recognized.');
        }
      }
      return seqList.join(', ');
    }
  }

  it('runs transactions after getting existing document', async () => {
    return integrationHelpers.withTestDb(persistence, async db => {
      const tt = new TransactionTester(db);

      await tt.withExistingDoc().run(get, delete1, delete1).expectNoDoc();
      await tt
        .withExistingDoc()
        .run(get, delete1, update2)
        .expectError('invalid-argument');
      await tt
        .withExistingDoc()
        .run(get, delete1, set2)
        .expectDoc({ foo: 'bar2' });

      await tt.withExistingDoc().run(get, update1, delete1).expectNoDoc();
      await tt
        .withExistingDoc()
        .run(get, update1, update2)
        .expectDoc({ foo: 'bar2' });
      await tt
        .withExistingDoc()
        .run(get, update1, set2)
        .expectDoc({ foo: 'bar2' });

      await tt.withExistingDoc().run(get, set1, delete1).expectNoDoc();
      await tt
        .withExistingDoc()
        .run(get, set1, update2)
        .expectDoc({ foo: 'bar2' });
      await tt
        .withExistingDoc()
        .run(get, set1, set2)
        .expectDoc({ foo: 'bar2' });
    });
  });

  it('runs transactions after getting non-existent document', async () => {
    return integrationHelpers.withTestDb(persistence, async db => {
      const tt = new TransactionTester(db);

      await tt.withNonexistentDoc().run(get, delete1, delete1).expectNoDoc();
      await tt
        .withNonexistentDoc()
        .run(get, delete1, update2)
        .expectError('invalid-argument');
      await tt
        .withNonexistentDoc()
        .run(get, delete1, set2)
        .expectDoc({ foo: 'bar2' });

      await tt
        .withNonexistentDoc()
        .run(get, update1, delete1)
        .expectError('invalid-argument');
      await tt
        .withNonexistentDoc()
        .run(get, update1, update2)
        .expectError('invalid-argument');
      await tt
        .withNonexistentDoc()
        .run(get, update1, set1)
        .expectError('invalid-argument');

      await tt.withNonexistentDoc().run(get, set1, delete1).expectNoDoc();
      await tt
        .withNonexistentDoc()
        .run(get, set1, update2)
        .expectDoc({ foo: 'bar2' });
      await tt
        .withNonexistentDoc()
        .run(get, set1, set2)
        .expectDoc({ foo: 'bar2' });
    });
  });

  it('runs transactions on existing document', async () => {
    return integrationHelpers.withTestDb(persistence, async db => {
      const tt = new TransactionTester(db);

      await tt.withExistingDoc().run(delete1, delete1).expectNoDoc();
      await tt
        .withExistingDoc()
        .run(delete1, update2)
        .expectError('invalid-argument');
      await tt.withExistingDoc().run(delete1, set2).expectDoc({ foo: 'bar2' });

      await tt.withExistingDoc().run(update1, delete1).expectNoDoc();
      await tt
        .withExistingDoc()
        .run(update1, update2)
        .expectDoc({ foo: 'bar2' });
      await tt.withExistingDoc().run(update1, set2).expectDoc({ foo: 'bar2' });

      await tt.withExistingDoc().run(set1, delete1).expectNoDoc();
      await tt.withExistingDoc().run(set1, update2).expectDoc({ foo: 'bar2' });
      await tt.withExistingDoc().run(set1, set2).expectDoc({ foo: 'bar2' });
    });
  });

  it('runs transactions on non-existent document', async () => {
    return integrationHelpers.withTestDb(persistence, async db => {
      const tt = new TransactionTester(db);

      await tt.withNonexistentDoc().run(delete1, delete1).expectNoDoc();
      await tt
        .withNonexistentDoc()
        .run(delete1, update2)
        .expectError('invalid-argument');
      await tt
        .withNonexistentDoc()
        .run(delete1, set2)
        .expectDoc({ foo: 'bar2' });

      await tt
        .withNonexistentDoc()
        .run(update1, delete1)
        .expectError('not-found');
      await tt
        .withNonexistentDoc()
        .run(update1, update2)
        .expectError('not-found');
      await tt.withNonexistentDoc().run(update1, set1).expectError('not-found');

      await tt.withNonexistentDoc().run(set1, delete1).expectNoDoc();
      await tt
        .withNonexistentDoc()
        .run(set1, update2)
        .expectDoc({ foo: 'bar2' });
      await tt.withNonexistentDoc().run(set1, set2).expectDoc({ foo: 'bar2' });
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
            new FieldPath('is.admin'),
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

  it('retry when a document that was read without being written changes', () => {
    return integrationHelpers.withTestDb(persistence, db => {
      const doc1 = db.collection('counters').doc();
      const doc2 = db.collection('counters').doc();
      let tries = 0;
      return doc1
        .set({
          count: 15
        })
        .then(() => {
          return db.runTransaction(transaction => {
            ++tries;

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
        .then(async () => {
          const snapshot = await doc1.get();
          expect(tries).to.equal(2);
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
        return db
          .runTransaction(transaction => {
            const doc = db.collection('nonexistent').doc();
            return (
              transaction
                // Get and update a document that doesn't exist so that the transaction fails.
                .get(doc)
                // Do a write outside of the transaction.
                .then(() => doc.set({ count: 1234 }))
                // Now try to update the doc from within the transaction. This
                // should fail, because the document didn't exist at the start
                // of the transaction.
                .then(() => transaction.update(doc, { count: 16 }))
            );
          })
          .then(() => expect.fail('transaction should fail'))
          .catch((err: firestore.FirestoreError) => {
            expect(err).to.exist;
            expect(err.code).to.equal('invalid-argument');
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
        // Intentionally returning bad type.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  it('can have gets without mutations', () => {
    return integrationHelpers.withTestDb(persistence, db => {
      const docRef = db.collection('foo').doc();
      const docRef2 = db.collection('foo').doc();
      return docRef
        .set({ foo: 'bar' })
        .then(() => {
          return db.runTransaction(async txn => {
            await txn.get(docRef2);
            return txn.get(docRef);
          });
        })
        .then(snapshot => {
          expect(snapshot).to.exist;
          expect(snapshot.data()!['foo']).to.equal('bar');
        });
    });
  });

  it('does not retry on permanent errors', () => {
    return integrationHelpers.withTestDb(persistence, db => {
      let counter = 0;
      return db
        .runTransaction(transaction => {
          // Make a transaction that should fail with a permanent error.
          counter++;
          const doc = db.collection('nonexistent').doc();
          return (
            transaction
              // Get and update a document that doesn't exist so that the transaction fails.
              .get(doc)
              .then(() => transaction.update(doc, { count: 16 }))
          );
        })
        .then(() => expect.fail('transaction should fail'))
        .catch((err: firestore.FirestoreError) => {
          expect(err.code).to.equal('invalid-argument');
          expect(counter).to.equal(1);
        });
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
      let counter = 0;
      return db
        .runTransaction(transaction => {
          counter++;
          transaction.set(doc, { foo: 'bar' });
          return Promise.reject('no');
        })
        .then(() => expect.fail('transaction should fail'))
        .catch(err => {
          expect(err).to.exist;
          expect(err).to.equal('no');
          expect(counter).to.equal(1);
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

  // PORTING NOTE: These tests are for FirestoreDataConverter support and apply
  // only to web.
  apiDescribe('withConverter() support', (persistence: boolean) => {
    class Post {
      constructor(readonly title: string, readonly author: string) {}
      byline(): string {
        return this.title + ', by ' + this.author;
      }
    }

    it('for Transaction.set<T>() and Transaction.get<T>()', () => {
      return integrationHelpers.withTestDb(persistence, db => {
        const docRef = db
          .collection('posts')
          .doc()
          .withConverter({
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
          });
        return docRef.set(new Post('post', 'author')).then(() => {
          return db
            .runTransaction(async transaction => {
              const snapshot = await transaction.get(docRef);
              expect(snapshot.data()!.byline()).to.equal('post, by author');
              transaction.set(docRef, new Post('new post', 'author'));
            })
            .then(async () => {
              const snapshot = await docRef.get();
              expect(snapshot.data()!.byline()).to.equal('new post, by author');
            });
        });
      });
    });
  });
});
