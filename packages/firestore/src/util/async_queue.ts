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

import { assert, fail } from './assert';
import * as log from './log';
import { AnyDuringMigration, AnyJs } from './misc';

import { Deferred } from './promise';

const LOG_TAG = 'AsyncQueue';

export class AsyncQueue {
  // The last promise in the queue.
  private tail: Promise<AnyJs | void> = Promise.resolve();

  // The number of ops that are queued to be run in the future (i.e. they had a
  // delay that has not yet elapsed).
  private queuedOperations : number[] = [];

  // visible for testing
  failure: Error;

  // Flag set while there's an outstanding AsyncQueue operation, used for
  // assertion sanity-checks.
  private operationInProgress = false;

  /**
   * Adds a new operation to the queue. Returns a promise that will be resolved
   * when the promise returned by the new operation is (with its value).
   *
   * Can optionally specify a delay (in milliseconds) to wait before queuing the
   * operation.
   */
  schedule<T>(op: () => Promise<T>, delay?: number): Promise<T> {
    if (this.failure) {
      fail('AsyncQueue is already failed: ' + this.failure.message);
    }

    if ((delay || 0) > 0) {
      const deferred = new Deferred<T>();
      const nextOperationIndex = this.queuedOperations.length;
      const queuedHandle = window.setTimeout(() => {
        this.scheduleInternal(() => {
          return op().then(result => {
            deferred.resolve(result);
          });
        });
        this.queuedOperations.splice(nextOperationIndex, 1);
      }, delay);
      this.queuedOperations[nextOperationIndex] = queuedHandle;
      return deferred.promise;
    } else {
      return this.scheduleInternal(op);
    }
  }

  private scheduleInternal<T>(op: () => Promise<T>): Promise<T> {
    this.tail = this.tail.then(() => {
      this.operationInProgress = true;
      return op()
        .catch(error => {
          this.failure = error;
          this.operationInProgress = false;
          log.error('INTERNAL UNHANDLED ERROR: ', error.stack || error.message);
          throw error;
        })
        .then(() => {
          this.operationInProgress = false;
        });
    });
    return this.tail as AnyDuringMigration;
  }

  /**
   * Verifies there's an operation currently in-progress on the AsyncQueue.
   * Unfortunately we can't verify that the running code is in the promise chain
   * of that operation, so this isn't a foolproof check, but it should be enough
   * to catch some bugs.
   */
  verifyOperationInProgress(): void {
    assert(
      this.operationInProgress,
      'verifyOpInProgress() called when no op in progress on this queue.'
    );
  }

  drain(): Promise<void> {
    let cancelledCount = 0;
    this.queuedOperations.forEach(handle => {
      window.clearTimeout(handle);
      ++cancelledCount;
    });
    log.debug(LOG_TAG, `Cancelled ${cancelledCount} pending operations during queue drain.`);
    this.queuedOperations = [];
    return this.schedule(() => Promise.resolve(undefined));
  }
}
