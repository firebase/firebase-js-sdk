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
import { AnyJs } from './misc';
import { Deferred, CancelablePromise } from './promise';
import { Code, FirestoreError } from './error';

// tslint:disable-next-line:no-any Accept any return type from setTimeout().
type TimerHandle = any;

/**
 * Represents an operation scheduled to be run in the future on an AsyncQueue.
 *
 * It is created via DelayedOperation.createAndSchedule().
 *
 * Supports cancellation (via cancel()) and early execution (via skipDelay()).
 */
class DelayedOperation<T> implements CancelablePromise<T> {
  // handle for use with clearTimeout(), or null if the operation has been
  // executed or canceled already.
  private timerHandle: TimerHandle | null;

  private readonly deferred = new Deferred<T>();

  private constructor(
    private asyncQueue: AsyncQueue,
    private op: () => Promise<T>
  ) {}

  /**
   * Creates and returns a DelayedOperation that has been scheduled to be
   * executed on the provided asyncQueue after the provided delayMs.
   */
  static createAndSchedule<T>(
    asyncQueue: AsyncQueue,
    op: () => Promise<T>,
    delayMs: number
  ): DelayedOperation<T> {
    const delayedOp = new DelayedOperation(asyncQueue, op);
    delayedOp.start(delayMs);
    return delayedOp;
  }

  /**
   * Starts the timer. This is called immediately after construction by
   * createAndSchedule().
   */
  private start(delayMs: number): void {
    this.timerHandle = setTimeout(() => this.handleDelayElapsed(), delayMs);
  }

  /**
   * Queues the operation to run immediately (if it hasn't already been run or
   * canceled).
   */
  skipDelay(): void {
    return this.handleDelayElapsed();
  }

  /**
   * Cancels the operation if it hasn't already been executed or canceled. The
   * promise will be rejected.
   *
   * As long as the operation has not yet been run, calling cancel() provides a
   * guarantee that the operation will not be run.
   */
  cancel(reason?: string): void {
    if (this.timerHandle !== null) {
      this.clearTimeout();
      this.deferred.reject(
        new FirestoreError(
          Code.CANCELLED,
          'Operation cancelled' + (reason ? ': ' + reason : '')
        )
      );
    }
  }

  // Promise implementation.
  readonly [Symbol.toStringTag]: 'Promise';
  then = this.deferred.promise.then.bind(this.deferred.promise);
  catch = this.deferred.promise.catch.bind(this.deferred.promise);

  private handleDelayElapsed(): void {
    this.asyncQueue.schedule(() => {
      if (this.timerHandle !== null) {
        this.clearTimeout();
        return this.op().then(result => {
          return this.deferred.resolve(result);
        });
      } else {
        return Promise.resolve();
      }
    });
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
  ): CancelablePromise<T> {
    this.verifyNotFailed();

    const delayedOp = DelayedOperation.createAndSchedule(this, op, delayMs);
    this.delayedOperations.push(delayedOp);

    delayedOp.catch(err => {}).then(() => {
      // NOTE: indexOf / slice are O(n), but delayedOperations is expected to be small.
      const index = this.delayedOperations.indexOf(delayedOp);
      assert(index >= 0, 'Delayed operation not found.');
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
        delayedOp.skipDelay();
      } else {
        delayedOp.cancel('shutdown');
      }
    });
    return this.schedule(() => Promise.resolve());
  }
}
