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

import { PromiseImpl as Promise } from '../../utils/promise';

import { assert, fail } from './assert';
import * as log from './log';
import { AnyDuringMigration, AnyJs } from './misc';

import { Deferred } from './promise';

export class AsyncQueue {
  // The last promise in the queue.
  private tail: Promise<AnyJs | void> = Promise.resolve();

  // The number of ops that are queued to be run in the future (i.e. they had a
  // delay that has not yet elapsed).
  private delayedOpCount = 0;

  // visible for testing
  failure: Error;

  // Flag set while there's an outstanding AsyncQueue operation, used for
  // assertion sanity-checks.
  private operationInProgress = false;

  /**
   * Adds a new operation to the queue. Returns a promise that will be resolved
   * when the promise returned by the new operation is (with its value).
   *
   * Can optionally specify a delay to wait before queuing the operation.
   */
  schedule<T>(op: () => Promise<T>, delay?: number): Promise<T> {
    if (this.failure) {
      fail('AsyncQueue is already failed: ' + this.failure.message);
    }

    if ((delay || 0) > 0) {
      this.delayedOpCount++;
      const deferred = new Deferred<T>();
      setTimeout(() => {
        this.scheduleInternal(() => {
          return op().then(result => {
            deferred.resolve(result);
          });
        });
        this.delayedOpCount--; // decrement once it's actually queued.
      }, delay);
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
    // TODO(mikelehen): This should perhaps also drain items that are queued to
    // run in the future (perhaps by artificially running them early), but since
    // no tests need that yet, I didn't bother for now.
    assert(this.delayedOpCount === 0, "draining doesn't handle delayed ops.");
    return this.schedule(() => Promise.resolve(undefined));
  }
}
