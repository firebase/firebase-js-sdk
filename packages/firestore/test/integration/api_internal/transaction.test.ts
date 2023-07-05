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

import { expect } from 'chai';

import { FirestoreError } from '../../../src';
import { DEFAULT_TRANSACTION_OPTIONS } from '../../../src/core/transaction_options';
import { TimerId } from '../../../src/util/async_queue';
import { Deferred } from '../../util/promise';
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  setDoc,
  TransactionOptions
} from '../util/firebase_export';
import { apiDescribe, withTestDb } from '../util/helpers';
import { asyncQueue } from '../util/internal_helpers';

apiDescribe('Database transactions (with internal API)', persistence => {
  it('should increment transactionally', async () => {
    // A set of concurrent transactions.
    const transactionPromises: Array<Promise<void>> = [];
    const readPromises: Array<Promise<void>> = [];
    // A barrier to make sure every transaction reaches the same spot.
    const barrier = new Deferred<void>();
    let started = 0;

    await withTestDb(persistence, async db => {
      asyncQueue(db).skipDelaysForTimerId(TimerId.TransactionRetry);
      const docRef = doc(collection(db, 'counters'));
      await setDoc(docRef, { count: 5 });
      // Make 3 transactions that will all increment.
      for (let i = 0; i < 3; i++) {
        const resolveRead = new Deferred<void>();
        readPromises.push(resolveRead.promise);
        transactionPromises.push(
          runTransaction(db, async transaction => {
            const snapshot = await transaction.get(docRef);
            expect(snapshot).to.exist;
            started += 1;
            resolveRead.resolve();
            await barrier.promise;
            transaction.set(docRef, {
              count: snapshot.data()!['count'] + 1
            });
          })
        );
      }

      // Let all of the transactions fetch the old value and stop once.
      await Promise.all(readPromises);

      // Let all of the transactions continue and wait for them to
      // finish.
      expect(started).to.equal(3);
      barrier.resolve();
      await Promise.all(transactionPromises);

      // Now all transaction should be completed, so check the result.
      const snapshot = await getDoc(docRef);
      expect(snapshot).to.exist;
      expect(snapshot.data()!['count']).to.equal(8);
    });
  });

  it('should update transactionally', async () => {
    // A set of concurrent transactions.
    const transactionPromises: Array<Promise<void>> = [];
    const readPromises: Array<Promise<void>> = [];
    // A barrier to make sure every transaction reaches the same spot.
    const barrier = new Deferred<void>();
    let counter = 0;

    await withTestDb(persistence, async db => {
      asyncQueue(db).skipDelaysForTimerId(TimerId.TransactionRetry);
      const docRef = doc(collection(db, 'counters'));
      await setDoc(docRef, {
        count: 5,
        other: 'yes'
      });
      // Make 3 transactions that will all increment.
      for (let i = 0; i < 3; i++) {
        const resolveRead = new Deferred<void>();
        readPromises.push(resolveRead.promise);
        transactionPromises.push(
          runTransaction(db, async transaction => {
            const snapshot = await transaction.get(docRef);
            expect(snapshot).to.exist;
            counter += 1;
            resolveRead.resolve();
            await barrier.promise;
            await transaction.update(docRef, {
              count: snapshot.data()!['count'] + 1
            });
          })
        );
      }

      // Let all of the transactions fetch the old value and stop once.
      await Promise.all(readPromises);

      // Let all of the transactions continue and wait for them to
      // finish. There should be 3 initial transaction runs.
      expect(counter).to.equal(3);
      barrier.resolve();
      await Promise.all(transactionPromises);

      // Now all transaction should be completed, so check the result.
      // There should be a maximum of 3 retries: once for the 2nd update,
      // and twice for the 3rd update.
      expect(counter).to.be.lessThan(7);
      const snapshot = await getDoc(docRef);
      expect(snapshot).to.exist;
      expect(snapshot.data()!['count']).to.equal(8);
      expect(snapshot.data()!['other']).to.equal('yes');
    });
  });

  it('should fail transaction (maxAttempts: default) when reading a doc twice with different versions', async () => {
    await withTestDb(persistence, async db => {
      asyncQueue(db).skipDelaysForTimerId(TimerId.TransactionRetry);
      const docRef = doc(collection(db, 'counters'));
      let counter = 0;
      await setDoc(docRef, { count: 15 });
      try {
        await runTransaction(db, async transaction => {
          counter++;
          // Get the docRef once.
          await transaction.get(docRef);
          // Do a write outside of the transaction. Because the transaction
          // will retry, set the document to a different value each time.
          await setDoc(docRef, { count: 1234 + counter });
          // Get the docRef again in the transaction with the new
          // version.
          await transaction.get(docRef);
          // Now try to update the docRef from within the transaction.
          // This should fail, because we read 15 earlier.
          await transaction.set(docRef, { count: 16 });
        });
        expect.fail('transaction should fail');
      } catch (e) {
        const err = e as FirestoreError;
        expect(err).to.exist;
        expect(err.code).to.equal('aborted');
      }
      const snapshot = await getDoc(docRef);
      expect(snapshot.data()!['count']).to.equal(1234 + counter);
      expect(counter).to.equal(DEFAULT_TRANSACTION_OPTIONS.maxAttempts);
    });
  });

  it('should fail transaction (maxAttempts: 1) when reading a doc twice with different versions', async () => {
    await withTestDb(persistence, async db => {
      asyncQueue(db).skipDelaysForTimerId(TimerId.TransactionRetry);
      const docRef = doc(collection(db, 'counters'));
      const options: TransactionOptions = {
        maxAttempts: 1
      };
      let counter = 0;
      await setDoc(docRef, { count: 15 });
      try {
        await runTransaction(
          db,
          async transaction => {
            counter++;
            // Get the docRef once.
            await transaction.get(docRef);
            // Do a write outside of the transaction. Because the transaction
            // will retry, set the document to a different value each time.
            await setDoc(docRef, { count: 1234 + counter });
            // Get the docRef again in the transaction with the new
            // version.
            await transaction.get(docRef);
            // Now try to update the docRef from within the transaction.
            // This should fail, because we read 15 earlier.
            await transaction.set(docRef, { count: 16 });
          },
          options
        );
        expect.fail('transaction should fail');
      } catch (e) {
        const err = e as FirestoreError;
        expect(err).to.exist;
        expect(err.code).to.equal('aborted');
      }
      const snapshot = await getDoc(docRef);
      expect(snapshot.data()!['count']).to.equal(1234 + counter);
      expect(counter).to.equal(options.maxAttempts);
    });
  });
});
