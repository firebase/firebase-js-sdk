/**
 * @license
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
import { Code, FirestoreError } from './error';
import * as log from './log';
import { CancelablePromise, Deferred } from './promise';

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
export enum TimerId {
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
  LruGarbageCollection = 'lru_garbage_collection'
}

/**
 * Represents an operation scheduled to be run in the future on an AsyncQueue.
 *
 * It is created via DelayedOperation.createAndSchedule().
 *
 * Supports cancellation (via cancel()) and early execution (via skipDelay()).
 */
class DelayedOperation<T extends unknown> implements CancelablePromise<T> {
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

  // Promise implementation.
  readonly [Symbol.toStringTag]: 'Promise';
  then = this.deferred.promise.then.bind(this.deferred.promise);
  catch = this.deferred.promise.catch.bind(this.deferred.promise);

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

  // Operations scheduled to be queued in the future. Operations are
  // automatically removed after they are run or canceled.
  private delayedOperations: Array<DelayedOperation<unknown>> = [];

  // visible for testing
  failure: Error;

  // Flag set while there's an outstanding AsyncQueue operation, used for
  // assertion sanity-checks.
  private operationInProgress = false;

  /**
   * Adds a new operation to the queue without waiting for it to complete (i.e.
   * we ignore the Promise result).
   */
  enqueueAndForget<T extends unknown>(op: () => Promise<T>): void {
    // tslint:disable-next-line:no-floating-promises
    this.enqueue(op);
  }

  /**
   * Adds a new operation to the queue. Returns a promise that will be resolved
   * when the promise returned by the new operation is (with its value).
   */
  enqueue<T extends unknown>(op: () => Promise<T>): Promise<T> {
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
   * Schedules an operation to be queued on the AsyncQueue once the specified
   * `delayMs` has elapsed. The returned CancelablePromise can be used to cancel
   * the operation prior to its running.
   */
  enqueueAfterDelay<T extends unknown>(
    timerId: TimerId,
    delayMs: number,
    op: () => Promise<T>
  ): CancelablePromise<T> {
    this.verifyNotFailed();

    assert(
      delayMs >= 0,
      `Attempted to schedule an operation with a negative delay of ${delayMs}`
    );

    // While not necessarily harmful, we currently don't expect to have multiple
    // ops with the same timer id in the queue, so defensively reject them.
    assert(
      !this.containsDelayedOperation(timerId),
      `Attempted to schedule multiple operations with timer id ${timerId}.`
    );

    const delayedOp = DelayedOperation.createAndSchedule<unknown>(
      this,
      timerId,
      delayMs,
      op,
      op => this.removeDelayedOperation(op)
    );
    this.delayedOperations.push(delayedOp);

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
   * Waits until all currently queued tasks are finished executing. Delayed
   * operations are not run.
   */
  drain(): Promise<void> {
    return this.enqueue(() => Promise.resolve());
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
   *  be drained. Throws if no such operation exists. Pass TimerId.All to run
   *  all delayed operations.
   * @returns a Promise that resolves once all operations have been run.
   */
  runDelayedOperationsEarly(lastTimerId: TimerId): Promise<void> {
    // Note that draining may generate more delayed ops, so we do that first.
    return this.drain().then(() => {
      assert(
        lastTimerId === TimerId.All ||
          this.containsDelayedOperation(lastTimerId),
        `Attempted to drain to missing operation ${lastTimerId}`
      );

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

  /** Called once a DelayedOperation is run or canceled. */
  private removeDelayedOperation(op: DelayedOperation<unknown>): void {
    // NOTE: indexOf / slice are O(n), but delayedOperations is expected to be small.
    const index = this.delayedOperations.indexOf(op);
    assert(index >= 0, 'Delayed operation not found.');
    this.delayedOperations.splice(index, 1);
  }
}
