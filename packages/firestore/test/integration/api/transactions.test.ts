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

import {
  DocumentData,
  FieldPath,
  QueryDocumentSnapshot,
  Transaction,
  collection,
  deleteDoc,
  doc,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  FirestoreError,
  getDoc,
  runTransaction,
  setDoc
} from '../util/firebase_export';
import { apiDescribe, withTestDb } from '../util/helpers';

apiDescribe('Database transactions', persistence => {
  type TransactionStage = (
    transaction: Transaction,
    docRef: DocumentReference
  ) => void;

  /**
   * The transaction stages that follow are postfixed by numbers to indicate the
   * calling order. For example, calling `set1()` followed by `set2()` should
   * result in the document being set to the value specified by `set2()`.
   */
  async function delete1(
    transaction: Transaction,
    docRef: DocumentReference
  ): Promise<void> {
    transaction.delete(docRef);
  }

  async function update1(
    transaction: Transaction,
    docRef: DocumentReference
  ): Promise<void> {
    transaction.update(docRef, { foo: 'bar1' });
  }

  async function update2(
    transaction: Transaction,
    docRef: DocumentReference
  ): Promise<void> {
    transaction.update(docRef, { foo: 'bar2' });
  }

  async function set1(
    transaction: Transaction,
    docRef: DocumentReference
  ): Promise<void> {
    transaction.set(docRef, { foo: 'bar1' });
  }

  async function set2(
    transaction: Transaction,
    docRef: DocumentReference
  ): Promise<void> {
    transaction.set(docRef, { foo: 'bar2' });
  }

  async function get(
    transaction: Transaction,
    docRef: DocumentReference
  ): Promise<void> {
    await transaction.get(docRef);
  }

  enum FromDocumentType {
    // The operation will be performed on a document that exists.
    EXISTING = 'existing',
    // The operation will be performed on a document that has never existed.
    NON_EXISTENT = 'non_existent',
    // The operation will be performed on a document that existed, but was
    // deleted.
    DELETED = 'deleted'
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
    constructor(readonly db: Firestore) {}

    private docRef!: DocumentReference;
    private fromDocumentType: FromDocumentType = FromDocumentType.NON_EXISTENT;
    private stages: TransactionStage[] = [];

    withExistingDoc(): this {
      this.fromDocumentType = FromDocumentType.EXISTING;
      return this;
    }

    withNonexistentDoc(): this {
      this.fromDocumentType = FromDocumentType.NON_EXISTENT;
      return this;
    }

    withDeletedDoc(): this {
      this.fromDocumentType = FromDocumentType.DELETED;
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
        const snapshot = await getDoc(this.docRef);
        expect(snapshot.exists()).to.equal(true);
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
        const snapshot = await getDoc(this.docRef);
        expect(snapshot.exists()).to.equal(false);
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
        expect((err as FirestoreError).code).to.equal(expected);
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
      this.docRef = doc(collection(this.db, 'tester-docref'));
      switch (this.fromDocumentType) {
        case FromDocumentType.EXISTING:
          await setDoc(this.docRef, { foo: 'bar0' });
          break;
        case FromDocumentType.NON_EXISTENT:
          // Nothing to do; document does not exist.
          break;
        case FromDocumentType.DELETED:
          await setDoc(this.docRef, { foo: 'bar0' });
          await deleteDoc(this.docRef);
          break;
        default:
          throw new Error(`invalid fromDocumentType: ${this.fromDocumentType}`);
      }
    }

    private async runTransaction(): Promise<void> {
      await runTransaction(this.db, async transaction => {
        for (const stage of this.stages) {
          await stage(transaction, this.docRef);
        }
      });
    }

    private cleanupTester(): void {
      this.stages = [];
      // Set the docRef to something else to lose the original reference.
      this.docRef = doc(collection(this.db, 'reset'));
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
    return withTestDb(persistence, async db => {
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
  }).timeout(10000);

  it('runs transactions after getting nonexistent document', async () => {
    return withTestDb(persistence, async db => {
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
  }).timeout(10000);

  // This test is identical to the test above, except that withNonexistentDoc()
  // is replaced by withDeletedDoc(), to guard against regression of
  // https://github.com/firebase/firebase-js-sdk/issues/5871, where transactions
  // would incorrectly fail with FAILED_PRECONDITION when operations were
  // performed on a deleted document (rather than a nonexistent document).
  it('runs transactions after getting a deleted document', async () => {
    return withTestDb(persistence, async db => {
      const tt = new TransactionTester(db);

      await tt.withDeletedDoc().run(get, delete1, delete1).expectNoDoc();
      await tt
        .withDeletedDoc()
        .run(get, delete1, update2)
        .expectError('invalid-argument');
      await tt
        .withDeletedDoc()
        .run(get, delete1, set2)
        .expectDoc({ foo: 'bar2' });

      await tt
        .withDeletedDoc()
        .run(get, update1, delete1)
        .expectError('invalid-argument');
      await tt
        .withDeletedDoc()
        .run(get, update1, update2)
        .expectError('invalid-argument');
      await tt
        .withDeletedDoc()
        .run(get, update1, set1)
        .expectError('invalid-argument');

      await tt.withDeletedDoc().run(get, set1, delete1).expectNoDoc();
      await tt
        .withDeletedDoc()
        .run(get, set1, update2)
        .expectDoc({ foo: 'bar2' });
      await tt.withDeletedDoc().run(get, set1, set2).expectDoc({ foo: 'bar2' });
    });
  }).timeout(10000);

  it('runs transactions on existing document', async () => {
    return withTestDb(persistence, async db => {
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

  it('runs transactions on nonexistent document', async () => {
    return withTestDb(persistence, async db => {
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
    return withTestDb(persistence, db => {
      const docRef = doc(collection(db, 'towns'));
      return runTransaction(db, async transaction => {
        transaction.set(docRef, { a: 'b', nested: { a: 'b' } }).set(
          docRef,
          { c: 'd', nested: { c: 'd' } },
          {
            merge: true
          }
        );
      })
        .then(() => getDoc(docRef))
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

    return withTestDb(persistence, db => {
      const docRef = doc(collection(db, 'counters'));
      return runTransaction(db, async transaction => {
        transaction.set(docRef, initialData);
        transaction.update(
          docRef,
          'owner.name',
          'Sebastian',
          new FieldPath('is.admin'),
          true
        );
      })
        .then(() => getDoc(docRef))
        .then(docSnapshot => {
          expect(docSnapshot.exists).to.be.ok;
          expect(docSnapshot.data()).to.deep.equal(finalData);
        });
    });
  });

  it('retry when a document that was read without being written changes', () => {
    return withTestDb(persistence, db => {
      const doc1 = doc(collection(db, 'counters'));
      const doc2 = doc(collection(db, 'counters'));
      let tries = 0;
      return setDoc(doc1, {
        count: 15
      })
        .then(() => {
          return runTransaction(db, transaction => {
            ++tries;

            // Get the first doc.
            return (
              transaction
                .get(doc1)
                // Do a write outside of the transaction. The first time the
                // transaction is tried, this will bump the version, which
                // will cause the write to doc2 to fail. The second time, it
                // will be a no-op and not bump the version.
                .then(() => setDoc(doc1, { count: 1234 }))
                // Now try to update the other doc from within the
                // transaction.
                // This should fail once, because we read 15 earlier.
                .then(() => transaction.set(doc2, { count: 16 }))
            );
          });
        })
        .then(async () => {
          const snapshot = await getDoc(doc1);
          expect(tries).to.equal(2);
          expect(snapshot.data()!['count']).to.equal(1234);
        });
    });
  });

  it('cannot read after writing and does not commit', () => {
    return withTestDb(persistence, async db => {
      const docRef = doc(collection(db, '00000-anything'));
      await setDoc(docRef, { foo: 'baz' });
      await runTransaction(db, async transaction => {
        transaction.set(docRef, { foo: 'bar' });
        return transaction.get(docRef);
      })
        .then(() => {
          expect.fail('transaction should fail');
        })
        .catch((err: FirestoreError) => {
          expect(err).to.exist;
          expect(err.code).to.equal('invalid-argument');
          expect(err.message).to.contain(
            'Firestore transactions require all reads to be executed'
          );
        });

      const postSnap = await getDoc(docRef);
      expect(postSnap.get('foo')).to.equal('baz');
    });
  });

  it('cannot read after writing and does not commit, even if the user transaction does not bubble up the error', () => {
    return withTestDb(persistence, async db => {
      const docRef = doc(collection(db, '00000-anything'));
      await setDoc(docRef, { foo: 'baz' });
      await runTransaction(db, async transaction => {
        transaction.set(docRef, { foo: 'bar' });

        // The following statement `transaction.get(...)` is problematic because
        // it occurs after `transaction.set(...)`. In previous versions of the
        // SDK this un-awaited `transaction.get(...)` failed but the transaction
        // still committed successfully. This regression test ensures that the
        // commit will fail even if the code does not await
        // `transaction.get(...)`.
        // eslint-disable-next-line
        transaction.get(docRef);
      })
        .then(() => {
          expect.fail('transaction should fail');
        })
        .catch((err: FirestoreError) => {
          expect(err).to.exist;
          expect(err.code).to.equal('invalid-argument');
          expect(err.message).to.contain(
            'Firestore transactions require all reads to be executed'
          );
        });

      const postSnap = await getDoc(docRef);
      expect(postSnap.get('foo')).to.equal('baz');
    });
  });

  it(
    'cannot read nonexistent document then update, even if ' +
      'document is written after the read',
    () => {
      return withTestDb(persistence, db => {
        return runTransaction(db, transaction => {
          const docRef = doc(collection(db, 'nonexistent'));
          return (
            transaction
              // Get and update a document that doesn't exist so that the transaction fails.
              .get(docRef)
              // Do a write outside of the transaction.
              .then(() => setDoc(docRef, { count: 1234 }))
              // Now try to update the doc from within the transaction. This
              // should fail, because the document didn't exist at the start
              // of the transaction.
              .then(() => transaction.update(docRef, { count: 16 }))
          );
        })
          .then(() => expect.fail('transaction should fail'))
          .catch((err: FirestoreError) => {
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
        const fn = ((txn: Transaction) => badReturn) as any;
        return withTestDb(persistence, db => {
          return runTransaction(db, fn)
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
    return withTestDb(persistence, db => {
      const docRef = doc(collection(db, 'foo'));
      const docRef2 = doc(collection(db, 'foo'));
      return setDoc(docRef, { foo: 'bar' })
        .then(() =>
          runTransaction(db, async txn => {
            await txn.get(docRef2);
            return txn.get(docRef);
          })
        )
        .then(snapshot => {
          expect(snapshot).to.exist;
          expect(snapshot.data()!['foo']).to.equal('bar');
        });
    });
  });

  it('does not retry on permanent errors', () => {
    return withTestDb(persistence, db => {
      let counter = 0;
      return runTransaction(db, transaction => {
        // Make a transaction that should fail with a permanent error.
        counter++;
        const docRef = doc(collection(db, 'nonexistent'));
        return (
          transaction
            // Get and update a document that doesn't exist so that the transaction fails.
            .get(docRef)
            .then(() => transaction.update(docRef, { count: 16 }))
        );
      })
        .then(() => expect.fail('transaction should fail'))
        .catch((err: FirestoreError) => {
          expect(err.code).to.equal('invalid-argument');
          expect(counter).to.equal(1);
        });
    });
  });

  it('retries when document already exists', () => {
    return withTestDb(persistence, async db => {
      let retryCounter = 0;
      const docRef = doc(collection(db, 'nonexistent'));

      await runTransaction(db, async transaction => {
        ++retryCounter;
        const snap = await transaction.get(docRef);

        if (retryCounter === 1) {
          expect(snap.exists()).to.be.false;
          // On the first attempt, create a doc before transaction.set(), so that
          // the transaction fails with "already-exists" error, and retries.
          await setDoc(docRef, { count: 1 });
        }

        transaction.set(docRef, { count: 2 });
      });
      expect(retryCounter).to.equal(2);
      const snap = await getDoc(docRef);
      expect(snap.get('count')).to.equal(2);
    });
  });

  it('are successful with no transaction operations', () => {
    return withTestDb(persistence, db => runTransaction(db, async () => {}));
  });

  it('are cancelled on rejected promise', () => {
    return withTestDb(persistence, db => {
      const docRef = doc(collection(db, 'towns'));
      let counter = 0;
      return runTransaction(db, transaction => {
        counter++;
        transaction.set(docRef, { foo: 'bar' });
        return Promise.reject('no');
      })
        .then(() => expect.fail('transaction should fail'))
        .catch(err => {
          expect(err).to.exist;
          expect(err).to.equal('no');
          expect(counter).to.equal(1);
          return getDoc(docRef);
        })
        .then(snapshot => {
          expect((snapshot as DocumentSnapshot).exists()).to.equal(false);
        });
    });
  });

  it('are cancelled on throw', () => {
    return withTestDb(persistence, db => {
      const docRef = doc(collection(db, 'towns'));
      const failure = new Error('no');
      let count = 0;
      return runTransaction(db, transaction => {
        count++;
        transaction.set(docRef, { foo: 'bar' });
        throw failure;
      })
        .then(() => expect.fail('transaction should fail'))
        .catch(err => {
          expect(err).to.exist;
          expect(err).to.equal(failure);
          expect(count).to.equal(1);
          return getDoc(docRef);
        })
        .then(snapshot => {
          expect(snapshot.exists()).to.equal(false);
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

    it('for Transaction.set<T>() and Transaction.get<T>()', () => {
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
        return setDoc(docRef, new Post('post', 'author')).then(() => {
          return runTransaction(db, async transaction => {
            const snapshot = await transaction.get(docRef);
            expect(snapshot.data()!.byline()).to.equal('post, by author');
            transaction.set(docRef, new Post('new post', 'author'));
          }).then(async () => {
            const snapshot = await getDoc(docRef);
            expect(snapshot.data()!.byline()).to.equal('new post, by author');
          });
        });
      });
    });
  });
});
