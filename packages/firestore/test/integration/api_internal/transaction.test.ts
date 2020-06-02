/**
 * @license
 * Copyright 2019 Google LLC
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
import { TimerId } from '../../../src/util/async_queue';
import { Deferred } from '../../util/promise';
import * as integrationHelpers from '../util/helpers';
import { asyncQueue } from '../util/internal_helpers';

const apiDescribe = integrationHelpers.apiDescribe;

apiDescribe(
  'Database transactions (with internal API)',
  (persistence: boolean) => {
    it('increment transactionally', () => {
      // A set of concurrent transactions.
      const transactionPromises: Array<Promise<void>> = [];
      const readPromises: Array<Promise<void>> = [];
      // A barrier to make sure every transaction reaches the same spot.
      const barrier = new Deferred();
      let started = 0;

      return integrationHelpers.withTestDb(persistence, db => {
        asyncQueue(db).skipDelaysForTimerId(TimerId.TransactionRetry);
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
      let counter = 0;

      return integrationHelpers.withTestDb(persistence, db => {
        asyncQueue(db).skipDelaysForTimerId(TimerId.TransactionRetry);
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
                    counter = counter + 1;
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
            // finish. There should be 3 initial transaction runs.
            expect(counter).to.equal(3);
            barrier.resolve();
            return Promise.all(transactionPromises);
          })
          .then(() => {
            // Now all transaction should be completed, so check the result.
            // There should be a maximum of 3 retries: once for the 2nd update,
            // and twice for the 3rd update.
            expect(counter).to.be.lessThan(7);
            return doc.get();
          })
          .then(snapshot => {
            expect(snapshot).to.exist;
            expect(snapshot.data()!['count']).to.equal(8);
            expect(snapshot.data()!['other']).to.equal('yes');
          });
      });
    });

    it('handle reading a doc twice with different versions', () => {
      return integrationHelpers.withTestDb(persistence, db => {
        asyncQueue(db).skipDelaysForTimerId(TimerId.TransactionRetry);
        const doc = db.collection('counters').doc();
        let counter = 0;
        return doc
          .set({
            count: 15
          })
          .then(() => {
            return db.runTransaction(transaction => {
              counter++;
              // Get the doc once.
              return (
                transaction
                  .get(doc)
                  // Do a write outside of the transaction. Because the transaction
                  // will retry, set the document to a different value each time.
                  .then(() => doc.set({ count: 1234 + counter }))
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
            expect(snapshot.data()!['count']).to.equal(1234 + counter);
          });
      });
    });
  }
);
