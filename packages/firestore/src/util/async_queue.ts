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
import { Code, FirestoreError } from './error';

export class AsyncQueue {
  // The last promise in the queue.
  private tail: Promise<AnyJs | void> = Promise.resolve();

  // A list with timeout handles and their respective deferred promises.
  // Contains an entry for each operation that is queued to run future (i.e. it
  // has a delay that has not yet elapsed). Prior to cleanup, this list may also
  // contain entries that have already been run (in which case `handle` is
  // null).
  private delayedOperations: {
    // tslint:disable-next-line:no-any Accept any return type from setTimeout().
    handle: any;
    deferred: Deferred<AnyJs | void>;
  }[] = [];

  // The number of operations that are queued to be run in the future (i.e. they
  // have a delay that has not yet elapsed). Unlike `delayedOperations`, this
  // is guaranteed to only contain operations that have not yet been run.
  private delayedOperationsCount = 0;

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
      this.delayedOperationsCount++;
      const deferred = new Deferred<T>();
      const opIndex = this.delayedOperations.length;
      const handle = setTimeout(() => {
        this.scheduleInternal(() => {
          return op().then(result => {
            deferred.resolve(result);
          });
        });
        this.delayedOperationsCount--;
        if (this.delayedOperationsCount > 0) {
          this.delayedOperations[opIndex].handle = null;
        } else {
          this.delayedOperations = [];
        }
      }, delay);
      this.delayedOperations[opIndex] = { handle, deferred };
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

  /**
   * Waits for tasks that are scheduled for immediate execution and rejects any
   * tasks that are pending with a non-zero delay.
   */
  drain(): Promise<void> {
    this.delayedOperations.forEach(entry => {
      if (entry.handle) {
        clearTimeout(entry.handle);
        entry.deferred.reject(
          new FirestoreError(Code.CANCELLED, 'Operation cancelled by shutdown')
        );
      }
    });
    this.delayedOperations = [];
    return this.schedule(() => Promise.resolve());
  }
}
