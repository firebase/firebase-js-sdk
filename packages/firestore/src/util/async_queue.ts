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

import { debugAssert, fail } from './assert';
import { Code, FirestoreError } from './error';
import { logDebug, logError } from './log';
import { Deferred } from './promise';
import { ExponentialBackoff } from '../remote/backoff';
import { PlatformSupport } from '../platform/platform';
import { isIndexedDbTransactionError } from '../local/simple_db';

const LOG_TAG = 'AsyncQueue';

// Accept any return type from setTimeout().
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TimerHandle = any;

/**
 * Wellknown "timer" IDs used when scheduling delayed operations on the
 * AsyncQueue. These IDs can then be used from tests to check for the presence
 * of operations or to run them early.
 *
 * The string values are used when encoding these timer IDs in JSON spec tests.
 */
export const enum TimerId {
  /** All can be used with runDelayedOperationsEarly() to run all timers. */
  All = 'all',

  /**
   * The following 4 timers are used in persistent_stream.ts for the listen and
   * write streams. The "Idle" timer is used to close the stream due to
   * inactivity. The "ConnectionBackoff" timer is used to restart a stream once
   * the appropriate backoff delay has elapsed.
   */
  ListenStreamIdle = 'listen_stream_idle',
  ListenStreamConnectionBackoff = 'listen_stream_connection_backoff',
  WriteStreamIdle = 'write_stream_idle',
  WriteStreamConnectionBackoff = 'write_stream_connection_backoff',

  /**
   * A timer used in online_state_tracker.ts to transition from
   * OnlineState.Unknown to Offline after a set timeout, rather than waiting
   * indefinitely for success or failure.
   */
  OnlineStateTimeout = 'online_state_timeout',

  /**
   * A timer used to update the client metadata in IndexedDb, which is used
   * to determine the primary leaseholder.
   */
  ClientMetadataRefresh = 'client_metadata_refresh',

  /** A timer used to periodically attempt LRU Garbage collection */
  LruGarbageCollection = 'lru_garbage_collection',

  /**
   * A timer used to retry transactions. Since there can be multiple concurrent
   * transactions, multiple of these may be in the queue at a given time.
   */
  TransactionRetry = 'transaction_retry',

  /**
   * A timer used to retry operations scheduled via retryable AsyncQueue
   * operations.
   */
  AsyncQueueRetry = 'async_queue_retry'
}

/**
 * Represents an operation scheduled to be run in the future on an AsyncQueue.
 *
 * It is created via DelayedOperation.createAndSchedule().
 *
 * Supports cancellation (via cancel()) and early execution (via skipDelay()).
 *
 * Note: We implement `PromiseLike` instead of `Promise`, as the `Promise` type
 * in newer versions of TypeScript defines `finally`, which is not available in
 * IE.
 */
export class DelayedOperation<T extends unknown> implements PromiseLike<T> {
  // handle for use with clearTimeout(), or null if the operation has been
  // executed or canceled already.
  private timerHandle: TimerHandle | null;

  private readonly deferred = new Deferred<T>();

  private constructor(
    private readonly asyncQueue: AsyncQueue,
    readonly timerId: TimerId,
    readonly targetTimeMs: number,
    private readonly op: () => Promise<T>,
    private readonly removalCallback: (op: DelayedOperation<T>) => void
  ) {
    // It's normal for the deferred promise to be canceled (due to cancellation)
    // and so we attach a dummy catch callback to avoid
    // 'UnhandledPromiseRejectionWarning' log spam.
    this.deferred.promise.catch(err => {});
  }

  /**
   * Creates and returns a DelayedOperation that has been scheduled to be
   * executed on the provided asyncQueue after the provided delayMs.
   *
   * @param asyncQueue The queue to schedule the operation on.
   * @param id A Timer ID identifying the type of operation this is.
   * @param delayMs The delay (ms) before the operation should be scheduled.
   * @param op The operation to run.
   * @param removalCallback A callback to be called synchronously once the
   *   operation is executed or canceled, notifying the AsyncQueue to remove it
   *   from its delayedOperations list.
   *   PORTING NOTE: This exists to prevent making removeDelayedOperation() and
   *   the DelayedOperation class public.
   */
  static createAndSchedule<R extends unknown>(
    asyncQueue: AsyncQueue,
    timerId: TimerId,
    delayMs: number,
    op: () => Promise<R>,
    removalCallback: (op: DelayedOperation<R>) => void
  ): DelayedOperation<R> {
    const targetTime = Date.now() + delayMs;
    const delayedOp = new DelayedOperation(
      asyncQueue,
      timerId,
      targetTime,
      op,
      removalCallback
    );
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

  then = this.deferred.promise.then.bind(this.deferred.promise);

  private handleDelayElapsed(): void {
    this.asyncQueue.enqueueAndForget(() => {
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

  private clearTimeout(): void {
    if (this.timerHandle !== null) {
      this.removalCallback(this);
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
  }
}

export class AsyncQueue {
  // The last promise in the queue.
  private tail: Promise<unknown> = Promise.resolve();

  // The last retryable operation. Retryable operation are run in order and
  // retried with backoff.
  private retryableTail: Promise<void> = Promise.resolve();

  // Is this AsyncQueue being shut down? Once it is set to true, it will not
  // be changed again.
  private _isShuttingDown: boolean = false;

  // Operations scheduled to be queued in the future. Operations are
  // automatically removed after they are run or canceled.
  private delayedOperations: Array<DelayedOperation<unknown>> = [];

  // visible for testing
  failure: Error | null = null;

  // Flag set while there's an outstanding AsyncQueue operation, used for
  // assertion sanity-checks.
  private operationInProgress = false;

  // List of TimerIds to fast-forward delays for.
  private timerIdsToSkip: TimerId[] = [];

  // Backoff timer used to schedule retries for retryable operations
  private backoff = new ExponentialBackoff(this, TimerId.AsyncQueueRetry);

  // Visibility handler that triggers an immediate retry of all retryable
  // operations. Meant to speed up recovery when we regain file system access
  // after page comes into foreground.
  private visibilityHandler = (): void => this.backoff.skipBackoff();

  constructor() {
    const window = PlatformSupport.getPlatform().window;
    if (window && typeof window.addEventListener === 'function') {
      window.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  // Is this AsyncQueue being shut down? If true, this instance will not enqueue
  // any new operations, Promises from enqueue requests will not resolve.
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

  /**
   * Regardless if the queue has initialized shutdown, adds a new operation to the
   * queue without waiting for it to complete (i.e. we ignore the Promise result).
   */
  enqueueAndForgetEvenAfterShutdown<T extends unknown>(
    op: () => Promise<T>
  ): void {
    this.verifyNotFailed();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.enqueueInternal(op);
  }

  /**
   * Regardless if the queue has initialized shutdown, adds a new operation to the
   * queue.
   */
  private enqueueEvenAfterShutdown<T extends unknown>(
    op: () => Promise<T>
  ): Promise<T> {
    this.verifyNotFailed();
    return this.enqueueInternal(op);
  }

  /**
   * Adds a new operation to the queue and initialize the shut down of this queue.
   * Returns a promise that will be resolved when the promise returned by the new
   * operation is (with its value).
   * Once this method is called, the only possible way to request running an operation
   * is through `enqueueAndForgetEvenAfterShutdown`.
   */
  async enqueueAndInitiateShutdown(op: () => Promise<void>): Promise<void> {
    this.verifyNotFailed();
    if (!this._isShuttingDown) {
      this._isShuttingDown = true;
      const window = PlatformSupport.getPlatform().window;
      if (window) {
        window.removeEventListener('visibilitychange', this.visibilityHandler);
      }
      await this.enqueueEvenAfterShutdown(op);
    }
  }

  /**
   * Adds a new operation to the queue. Returns a promise that will be resolved
   * when the promise returned by the new operation is (with its value).
   */
  enqueue<T extends unknown>(op: () => Promise<T>): Promise<T> {
    this.verifyNotFailed();
    if (this._isShuttingDown) {
      // Return a Promise which never resolves.
      return new Promise<T>(resolve => {});
    }
    return this.enqueueInternal(op);
  }

  /**
   * Enqueue a retryable operation.
   *
   * A retryable operation is rescheduled with backoff if it fails with a
   * IndexedDbTransactionError (the error type used by SimpleDb). All
   * retryable operations are executed in order and only run if all prior
   * operations were retried successfully.
   */
  enqueueRetryable(op: () => Promise<void>): void {
    this.verifyNotFailed();

    if (this._isShuttingDown) {
      return;
    }

    this.retryableTail = this.retryableTail.then(() => {
      const deferred = new Deferred<void>();
      const retryingOp = async (): Promise<void> => {
        try {
          await op();
          deferred.resolve();
          this.backoff.reset();
        } catch (e) {
          if (isIndexedDbTransactionError(e)) {
            logDebug(LOG_TAG, 'Operation failed with retryable error: ' + e);
            this.backoff.backoffAndRun(retryingOp);
          } else {
            deferred.resolve();
            throw e; // Failure will be handled by AsyncQueue
          }
        }
      };
      this.enqueueAndForget(retryingOp);
      return deferred.promise;
    });
  }

  private enqueueInternal<T extends unknown>(op: () => Promise<T>): Promise<T> {
    const newTail = this.tail.then(() => {
      this.operationInProgress = true;
      return op()
        .catch((error: FirestoreError) => {
          this.failure = error;
          this.operationInProgress = false;
          const message = error.stack || error.message || '';
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

  /**
   * Schedules an operation to be queued on the AsyncQueue once the specified
   * `delayMs` has elapsed. The returned DelayedOperation can be used to cancel
   * or fast-forward the operation prior to its running.
   */
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
   * @param lastTimerId Delayed operations up to and including this TimerId will
   *  be drained. Pass TimerId.All to run all delayed operations.
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

/**
 * Returns a FirestoreError that can be surfaced to the user if the provided
 * error is an IndexedDbTransactionError. Re-throws the error otherwise.
 */
export function wrapInUserErrorIfRecoverable(
  e: Error,
  msg: string
): FirestoreError {
  logError(LOG_TAG, `${msg}: ${e}`);
  if (isIndexedDbTransactionError(e)) {
    return new FirestoreError(Code.UNAVAILABLE, `${msg}: ${e}`);
  } else {
    throw e;
  }
}
