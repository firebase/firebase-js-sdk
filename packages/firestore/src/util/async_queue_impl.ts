/**
 * @license
 * Copyright 2020 Google LLC
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

import { isIndexedDbTransactionError } from '../local/simple_db';
import { getDocument } from '../platform/dom';
import { ExponentialBackoff } from '../remote/backoff';

import { debugAssert, fail } from './assert';
import { AsyncQueue, DelayedOperation, TimerId } from './async_queue';
import { FirestoreError } from './error';
import { logDebug, logError } from './log';
import { Deferred } from './promise';

const LOG_TAG = 'AsyncQueue';

export class AsyncQueueImpl implements AsyncQueue {
  // The last promise in the queue.
  private tail: Promise<unknown> = Promise.resolve();

  // A list of retryable operations. Retryable operations are run in order and
  // retried with backoff.
  private retryableOps: Array<() => Promise<void>> = [];

  // Is this AsyncQueue being shut down? Once it is set to true, it will not
  // be changed again.
  private _isShuttingDown: boolean = false;

  // Operations scheduled to be queued in the future. Operations are
  // automatically removed after they are run or canceled.
  private delayedOperations: Array<DelayedOperation<unknown>> = [];

  // visible for testing
  failure: FirestoreError | null = null;

  // Flag set while there's an outstanding AsyncQueue operation, used for
  // assertion sanity-checks.
  private operationInProgress = false;

  // Enabled during shutdown on Safari to prevent future access to IndexedDB.
  private skipNonRestrictedTasks = false;

  // List of TimerIds to fast-forward delays for.
  private timerIdsToSkip: TimerId[] = [];

  // Backoff timer used to schedule retries for retryable operations
  private backoff = new ExponentialBackoff(this, TimerId.AsyncQueueRetry);

  // Visibility handler that triggers an immediate retry of all retryable
  // operations. Meant to speed up recovery when we regain file system access
  // after page comes into foreground.
  private visibilityHandler: () => void = () => {
    const document = getDocument();
    if (document) {
      logDebug(
        LOG_TAG,
        'Visibility state changed to ' + document.visibilityState
      );
    }
    this.backoff.skipBackoff();
  };

  constructor() {
    const document = getDocument();
    if (document && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  get isShuttingDown(): boolean {
    return this._isShuttingDown;
  }

  /**
   * Adds a new operation to the queue without waiting for it to complete (i.e.
   * we ignore the Promise result).
   */
  enqueueAndForget<T extends unknown>(op: () => Promise<T>): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.enqueue(op);
  }

  enqueueAndForgetEvenWhileRestricted<T extends unknown>(
    op: () => Promise<T>
  ): void {
    this.verifyNotFailed();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.enqueueInternal(op);
  }

  enterRestrictedMode(purgeExistingTasks?: boolean): void {
    if (!this._isShuttingDown) {
      this._isShuttingDown = true;
      this.skipNonRestrictedTasks = purgeExistingTasks || false;
      const document = getDocument();
      if (document && typeof document.removeEventListener === 'function') {
        document.removeEventListener(
          'visibilitychange',
          this.visibilityHandler
        );
      }
    }
  }

  enqueue<T extends unknown>(op: () => Promise<T>): Promise<T> {
    this.verifyNotFailed();
    if (this._isShuttingDown) {
      // Return a Promise which never resolves.
      return new Promise<T>(() => {});
    }

    // Create a deferred Promise that we can return to the callee. This
    // allows us to return a "hanging Promise" only to the callee and still
    // advance the queue even when the operation is not run.
    const task = new Deferred<T>();
    return this.enqueueInternal<unknown>(() => {
      if (this._isShuttingDown && this.skipNonRestrictedTasks) {
        // We do not resolve 'task'
        return Promise.resolve();
      }

      op().then(task.resolve, task.reject);
      return task.promise;
    }).then(() => task.promise);
  }

  enqueueRetryable(op: () => Promise<void>): void {
    this.enqueueAndForget(() => {
      this.retryableOps.push(op);
      return this.retryNextOp();
    });
  }

  /**
   * Runs the next operation from the retryable queue. If the operation fails,
   * reschedules with backoff.
   */
  private async retryNextOp(): Promise<void> {
    if (this.retryableOps.length === 0) {
      return;
    }

    try {
      await this.retryableOps[0]();
      this.retryableOps.shift();
      this.backoff.reset();
    } catch (e) {
      if (isIndexedDbTransactionError(e as Error)) {
        logDebug(LOG_TAG, 'Operation failed with retryable error: ' + e);
      } else {
        throw e; // Failure will be handled by AsyncQueue
      }
    }

    if (this.retryableOps.length > 0) {
      // If there are additional operations, we re-schedule `retryNextOp()`.
      // This is necessary to run retryable operations that failed during
      // their initial attempt since we don't know whether they are already
      // enqueued. If, for example, `op1`, `op2`, `op3` are enqueued and `op1`
      // needs to  be re-run, we will run `op1`, `op1`, `op2` using the
      // already enqueued calls to `retryNextOp()`. `op3()` will then run in the
      // call scheduled here.
      // Since `backoffAndRun()` cancels an existing backoff and schedules a
      // new backoff on every call, there is only ever a single additional
      // operation in the queue.
      this.backoff.backoffAndRun(() => this.retryNextOp());
    }
  }

  private enqueueInternal<T extends unknown>(op: () => Promise<T>): Promise<T> {
    const newTail = this.tail.then(() => {
      this.operationInProgress = true;
      return op()
        .catch((error: FirestoreError) => {
          this.failure = error;
          this.operationInProgress = false;
          const message = getMessageOrStack(error);
          logError('INTERNAL UNHANDLED ERROR: ', message);

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

  enqueueAfterDelay<T extends unknown>(
    timerId: TimerId,
    delayMs: number,
    op: () => Promise<T>
  ): DelayedOperation<T> {
    this.verifyNotFailed();

    debugAssert(
      delayMs >= 0,
      `Attempted to schedule an operation with a negative delay of ${delayMs}`
    );

    // Fast-forward delays for timerIds that have been overriden.
    if (this.timerIdsToSkip.indexOf(timerId) > -1) {
      delayMs = 0;
    }

    const delayedOp = DelayedOperation.createAndSchedule<T>(
      this,
      timerId,
      delayMs,
      op,
      removedOp =>
        this.removeDelayedOperation(removedOp as DelayedOperation<unknown>)
    );
    this.delayedOperations.push(delayedOp as DelayedOperation<unknown>);
    return delayedOp;
  }

  private verifyNotFailed(): void {
    if (this.failure) {
      fail('AsyncQueue is already failed: ' + getMessageOrStack(this.failure));
    }
  }

  verifyOperationInProgress(): void {
    debugAssert(
      this.operationInProgress,
      'verifyOpInProgress() called when no op in progress on this queue.'
    );
  }

  /**
   * Waits until all currently queued tasks are finished executing. Delayed
   * operations are not run.
   */
  async drain(): Promise<void> {
    // Operations in the queue prior to draining may have enqueued additional
    // operations. Keep draining the queue until the tail is no longer advanced,
    // which indicates that no more new operations were enqueued and that all
    // operations were executed.
    let currentTail: Promise<unknown>;
    do {
      currentTail = this.tail;
      await currentTail;
    } while (currentTail !== this.tail);
  }

  /**
   * For Tests: Determine if a delayed operation with a particular TimerId
   * exists.
   */
  containsDelayedOperation(timerId: TimerId): boolean {
    for (const op of this.delayedOperations) {
      if (op.timerId === timerId) {
        return true;
      }
    }
    return false;
  }

  /**
   * For Tests: Runs some or all delayed operations early.
   *
   * @param lastTimerId - Delayed operations up to and including this TimerId
   * will be drained. Pass TimerId.All to run all delayed operations.
   * @returns a Promise that resolves once all operations have been run.
   */
  runAllDelayedOperationsUntil(lastTimerId: TimerId): Promise<void> {
    // Note that draining may generate more delayed ops, so we do that first.
    return this.drain().then(() => {
      // Run ops in the same order they'd run if they ran naturally.
      this.delayedOperations.sort((a, b) => a.targetTimeMs - b.targetTimeMs);

      for (const op of this.delayedOperations) {
        op.skipDelay();
        if (lastTimerId !== TimerId.All && op.timerId === lastTimerId) {
          break;
        }
      }

      return this.drain();
    });
  }

  /**
   * For Tests: Skip all subsequent delays for a timer id.
   */
  skipDelaysForTimerId(timerId: TimerId): void {
    this.timerIdsToSkip.push(timerId);
  }

  /** Called once a DelayedOperation is run or canceled. */
  private removeDelayedOperation(op: DelayedOperation<unknown>): void {
    // NOTE: indexOf / slice are O(n), but delayedOperations is expected to be small.
    const index = this.delayedOperations.indexOf(op);
    debugAssert(index >= 0, 'Delayed operation not found.');
    this.delayedOperations.splice(index, 1);
  }
}

export function newAsyncQueue(): AsyncQueue {
  return new AsyncQueueImpl();
}

/**
 * Chrome includes Error.message in Error.stack. Other browsers do not.
 * This returns expected output of message + stack when available.
 * @param error - Error or FirestoreError
 */
function getMessageOrStack(error: Error): string {
  let message = error.message || '';
  if (error.stack) {
    if (error.stack.includes(error.message)) {
      message = error.stack;
    } else {
      message = error.message + '\n' + error.stack;
    }
  }
  return message;
}
