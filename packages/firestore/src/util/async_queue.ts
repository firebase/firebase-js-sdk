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

import { isIndexedDbTransactionError } from '../local/simple_db';

import { Code, FirestoreError } from './error';
import { logError } from './log';
import { Deferred } from './promise';

const LOG_TAG = 'AsyncQueue';

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
   * @param asyncQueue - The queue to schedule the operation on.
   * @param id - A Timer ID identifying the type of operation this is.
   * @param delayMs - The delay (ms) before the operation should be scheduled.
   * @param op - The operation to run.
   * @param removalCallback - A callback to be called synchronously once the
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

export interface AsyncQueue {
  // Is this AsyncQueue being shut down? If true, this instance will not enqueue
  // any new operations, Promises from enqueue requests will not resolve.
  readonly isShuttingDown: boolean;

  /**
   * Adds a new operation to the queue without waiting for it to complete (i.e.
   * we ignore the Promise result).
   */
  enqueueAndForget<T extends unknown>(op: () => Promise<T>): void;

  /**
   * Regardless if the queue has initialized shutdown, adds a new operation to the
   * queue without waiting for it to complete (i.e. we ignore the Promise result).
   */
  enqueueAndForgetEvenWhileRestricted<T extends unknown>(
    op: () => Promise<T>
  ): void;

  /**
   * Initialize the shutdown of this queue. Once this method is called, the
   * only possible way to request running an operation is through
   * `enqueueEvenWhileRestricted()`.
   *
   * @param purgeExistingTasks Whether already enqueued tasked should be
   * rejected (unless enqueued wih `enqueueEvenWhileRestricted()`). Defaults
   * to false.
   */
  enterRestrictedMode(purgeExistingTasks?: boolean): void;

  /**
   * Adds a new operation to the queue. Returns a promise that will be resolved
   * when the promise returned by the new operation is (with its value).
   */
  enqueue<T extends unknown>(op: () => Promise<T>): Promise<T>;

  /**
   * Enqueue a retryable operation.
   *
   * A retryable operation is rescheduled with backoff if it fails with a
   * IndexedDbTransactionError (the error type used by SimpleDb). All
   * retryable operations are executed in order and only run if all prior
   * operations were retried successfully.
   */
  enqueueRetryable(op: () => Promise<void>): void;

  /**
   * Schedules an operation to be queued on the AsyncQueue once the specified
   * `delayMs` has elapsed. The returned DelayedOperation can be used to cancel
   * or fast-forward the operation prior to its running.
   */
  enqueueAfterDelay<T extends unknown>(
    timerId: TimerId,
    delayMs: number,
    op: () => Promise<T>
  ): DelayedOperation<T>;

  /**
   * Verifies there's an operation currently in-progress on the AsyncQueue.
   * Unfortunately we can't verify that the running code is in the promise chain
   * of that operation, so this isn't a foolproof check, but it should be enough
   * to catch some bugs.
   */
  verifyOperationInProgress(): void;
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
