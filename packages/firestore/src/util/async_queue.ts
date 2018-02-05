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

/** External Result of scheduling a delayed operation. */
export interface DelayedOperationResult<T> {
  /** A promise that will resolve once the operation has been run. */
  promise: Promise<T>;

  /**
   * Prevents the operation from running and rejects the promise with a
   * Code.CANCELLED error.
   */
  cancel(): void;
}

/**
 * Represents an operation scheduled to be run in the future.
 *
 * Created via DelayedOperation.createAndSchedule().
 * Supports cancellation (via cancel()) and early execution (via scheduleNow()).
 */
class DelayedOperation<T> implements DelayedOperationResult<T> {
  // tslint:disable-next-line:no-any Accept any return type from setTimeout().
  private timerHandle: any;
  private readonly deferred = new Deferred<T>();
  /** true if the operation has not been executed or cancelled yet. */
  private pending = true;

  static createAndSchedule<T>(
    asyncQueue: AsyncQueue,
    op: () => Promise<T>,
    delayMs: number
  ) {
    const delayedOp = new DelayedOperation(op);
    delayedOp.timerHandle = setTimeout(
      () => delayedOp.scheduleNow(asyncQueue),
      delayMs
    );
    return delayedOp;
  }

  private constructor(private op: () => Promise<T>) {}

  get promise(): Promise<T> {
    return this.deferred.promise;
  }

  /**
   * Schedules the operation to run on the provided AsyncQueue if it has not
   * already been run or cancelled.
   */
  scheduleNow(asyncQueue: AsyncQueue): void {
    this.clearTimeout();
    asyncQueue.schedule(this.runIfNecessary.bind(this));
  }

  cancel(reason?: string): void {
    if (this.pending) {
      this.pending = false;
      this.clearTimeout();
      this.deferred.reject(
        new FirestoreError(
          Code.CANCELLED,
          'Operation cancelled' + (reason ? ': ' + reason : '')
        )
      );
    }
  }

  private runIfNecessary(): Promise<void> {
    if (this.pending) {
      this.pending = false;
      return this.op().then(result => {
        return this.deferred.resolve(result);
      });
    }
  }

  private clearTimeout() {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
  }
}

export class AsyncQueue {
  // The last promise in the queue.
  private tail: Promise<AnyJs | void> = Promise.resolve();

  // A list with timeout handles and their respective deferred promises.
  // Contains an entry for each operation that is queued to run in the future
  // (i.e. it has a delay that has not yet elapsed).
  private delayedOperations: Array<DelayedOperation<AnyJs>> = [];

  // The number of operations that are queued to be run in the future (i.e. they
  // have a delay that has not yet elapsed). Used for testing.
  get delayedOperationsCount() {
    return this.delayedOperations.length;
  }

  // visible for testing
  failure: Error;

  // Flag set while there's an outstanding AsyncQueue operation, used for
  // assertion sanity-checks.
  private operationInProgress = false;

  /**
   * Adds a new operation to the queue. Returns a promise that will be resolved
   * when the promise returned by the new operation is (with its value).
   */
  schedule<T>(op: () => Promise<T>): Promise<T> {
    this.verifyNotFailed();
    const newTail = this.tail.then(() => {
      this.operationInProgress = true;
      return op()
        .catch(error => {
          this.failure = error;
          this.operationInProgress = false;
          const message = error.stack || error.message || '';
          log.error('INTERNAL UNHANDLED ERROR: ', message);

          // Escape the promise chain and throw the error globally so that
          // e.g. any global crash reporting library detects and reports it.
          // (but not for simulated errors in our tests since this breaks mocha)
          if (message.indexOf('Firestore Test Simulated Error') < 0) {
            setTimeout(() => {
              throw error;
            }, 0);
          }

          // Re-throw the error so that this.tail becomes a rejected Promise and
          // all further attempts to chain (via .then) will just short-circuit
          // and return the rejected Promise.
          throw error;
        })
        .then(result => {
          this.operationInProgress = false;
          return result;
        });
    });
    this.tail = newTail;
    return newTail;
  }

  /**
   * Schedules an operation to be run on the AsyncQueue once the specified
   * `delayMs` has elapsed. The returned DelayedOperationResult can be
   * used to cancel the operation prior to its running.
   */
  scheduleWithDelay<T>(
    op: () => Promise<T>,
    delayMs: number
  ): DelayedOperationResult<T> {
    this.verifyNotFailed();

    const delayedOp = DelayedOperation.createAndSchedule(this, op, delayMs);
    const index = this.delayedOperations.push(delayedOp);

    delayedOp.promise.catch(err => {}).then(() => {
      this.delayedOperations.slice(index, 1);
    });
    return delayedOp;
  }

  private verifyNotFailed(): void {
    if (this.failure) {
      fail(
        'AsyncQueue is already failed: ' +
          (this.failure.stack || this.failure.message)
      );
    }
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
   * Waits until all currently scheduled tasks are finished executing. Tasks
   * scheduled with a delay can be rejected or queued for immediate execution.
   */
  drain(executeDelayedTasks: boolean): Promise<void> {
    this.delayedOperations.forEach(delayedOp => {
      if (executeDelayedTasks) {
        delayedOp.scheduleNow(this);
      } else {
        delayedOp.cancel('shutdown');
      }
    });
    this.delayedOperations = [];
    return this.schedule(() => Promise.resolve());
  }
}
