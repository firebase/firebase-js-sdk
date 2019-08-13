/**
 * @license
 * Copyright 2019 Google Inc.
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

import { Deferred } from '../util/promise';
import { TimerId, AsyncQueue } from '../util/async_queue';
import { ExponentialBackoff } from '../remote/backoff';
import { Transaction } from './transaction';
import { RemoteStore } from '../remote/remote_store';
import { isNullOrUndefined } from '../util/types';
import { isPermanentError } from '../remote/rpc_error';
import { FirestoreError } from '../util/error';

const RETRY_COUNT = 5;

/**
 * TransactionRunner encapsulates the logic needed to run and retry transactions
 * with backoff.
 */
export class TransactionRunner<T> {
  private retries = RETRY_COUNT;
  private backoff: ExponentialBackoff;

  constructor(
    private readonly asyncQueue: AsyncQueue,
    private readonly remoteStore: RemoteStore,
    private readonly updateFunction: (transaction: Transaction) => Promise<T>,
    private readonly deferred: Deferred<T>
  ) {
    this.backoff = new ExponentialBackoff(
      this.asyncQueue,
      TimerId.RetryTransaction
    );
  }

  /** Runs the transaction and sets the result on deferred. */
  run(): void {
    this.runWithBackOff();
  }

  private runWithBackOff(): void {
    this.backoff.backoffAndRun(async () => {
      const transaction = this.remoteStore.createTransaction();
      const userPromise = this.tryRunUpdateFunction(transaction);
      if (userPromise) {
        userPromise
          .then(result => {
            this.asyncQueue.enqueueAndForget(() => {
              return transaction
                .commit()
                .then(() => {
                  this.deferred.resolve(result);
                })
                .catch(error => {
                  this.handleTransactionError(error);
                });
            });
          })
          .catch(error => {
            this.handleTransactionError(error);
          });
      }
    });
  }

  private tryRunUpdateFunction(transaction: Transaction): Promise<T> | null {
    try {
      const userPromise = this.updateFunction(transaction);
      if (
        isNullOrUndefined(userPromise) ||
        !userPromise.catch ||
        !userPromise.then
      ) {
        this.deferred.reject(
          Error('Transaction callback must return a Promise')
        );
        return null;
      }
      return userPromise;
    } catch (error) {
      // Do not retry errors thrown by user provided updateFunction.
      this.deferred.reject(error);
      return null;
    }
  }

  private handleTransactionError(error: Error): void {
    if (this.retries > 0 && this.isRetryableTransactionError(error)) {
      this.retries -= 1;
      this.asyncQueue.enqueueAndForget(() => {
        this.runWithBackOff();
        return Promise.resolve();
      });
    } else {
      this.deferred.reject(error);
    }
  }

  private isRetryableTransactionError(error: Error): boolean {
    if (error.name === 'FirebaseError') {
      // In transactions, the backend will fail outdated reads with FAILED_PRECONDITION and
      // non-matching document versions with ABORTED. These errors should be retried.
      const code = (error as FirestoreError).code;
      return (
        code === 'aborted' ||
        code === 'failed-precondition' ||
        !isPermanentError(code)
      );
    }
    return false;
  }
}
