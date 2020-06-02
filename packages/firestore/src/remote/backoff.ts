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

import { AsyncQueue, DelayedOperation, TimerId } from '../util/async_queue';
import { logDebug } from '../util/log';

const LOG_TAG = 'ExponentialBackoff';

/**
 * Initial backoff time in milliseconds after an error.
 * Set to 1s according to https://cloud.google.com/apis/design/errors.
 */
const DEFAULT_BACKOFF_INITIAL_DELAY_MS = 1000;

const DEFAULT_BACKOFF_FACTOR = 1.5;

/** Maximum backoff time in milliseconds */
const DEFAULT_BACKOFF_MAX_DELAY_MS = 60 * 1000;

/**
 * A helper for running delayed tasks following an exponential backoff curve
 * between attempts.
 *
 * Each delay is made up of a "base" delay which follows the exponential
 * backoff curve, and a +/- 50% "jitter" that is calculated and added to the
 * base delay. This prevents clients from accidentally synchronizing their
 * delays causing spikes of load to the backend.
 */
export class ExponentialBackoff {
  private currentBaseMs: number = 0;
  private timerPromise: DelayedOperation<void> | null = null;
  /** The last backoff attempt, as epoch milliseconds. */
  private lastAttemptTime = Date.now();

  constructor(
    /**
     * The AsyncQueue to run backoff operations on.
     */
    private readonly queue: AsyncQueue,
    /**
     * The ID to use when scheduling backoff operations on the AsyncQueue.
     */
    private readonly timerId: TimerId,
    /**
     * The initial delay (used as the base delay on the first retry attempt).
     * Note that jitter will still be applied, so the actual delay could be as
     * little as 0.5*initialDelayMs.
     */
    private readonly initialDelayMs: number = DEFAULT_BACKOFF_INITIAL_DELAY_MS,
    /**
     * The multiplier to use to determine the extended base delay after each
     * attempt.
     */
    private readonly backoffFactor: number = DEFAULT_BACKOFF_FACTOR,
    /**
     * The maximum base delay after which no further backoff is performed.
     * Note that jitter will still be applied, so the actual delay could be as
     * much as 1.5*maxDelayMs.
     */
    private readonly maxDelayMs: number = DEFAULT_BACKOFF_MAX_DELAY_MS
  ) {
    this.reset();
  }

  /**
   * Resets the backoff delay.
   *
   * The very next backoffAndWait() will have no delay. If it is called again
   * (i.e. due to an error), initialDelayMs (plus jitter) will be used, and
   * subsequent ones will increase according to the backoffFactor.
   */
  reset(): void {
    this.currentBaseMs = 0;
  }

  /**
   * Resets the backoff delay to the maximum delay (e.g. for use after a
   * RESOURCE_EXHAUSTED error).
   */
  resetToMax(): void {
    this.currentBaseMs = this.maxDelayMs;
  }

  /**
   * Returns a promise that resolves after currentDelayMs, and increases the
   * delay for any subsequent attempts. If there was a pending backoff operation
   * already, it will be canceled.
   */
  backoffAndRun(op: () => Promise<void>): void {
    // Cancel any pending backoff operation.
    this.cancel();

    // First schedule using the current base (which may be 0 and should be
    // honored as such).
    const desiredDelayWithJitterMs = Math.floor(
      this.currentBaseMs + this.jitterDelayMs()
    );

    // Guard against lastAttemptTime being in the future due to a clock change.
    const delaySoFarMs = Math.max(0, Date.now() - this.lastAttemptTime);

    // Guard against the backoff delay already being past.
    const remainingDelayMs = Math.max(
      0,
      desiredDelayWithJitterMs - delaySoFarMs
    );

    if (remainingDelayMs > 0) {
      logDebug(
        LOG_TAG,
        `Backing off for ${remainingDelayMs} ms ` +
          `(base delay: ${this.currentBaseMs} ms, ` +
          `delay with jitter: ${desiredDelayWithJitterMs} ms, ` +
          `last attempt: ${delaySoFarMs} ms ago)`
      );
    }

    this.timerPromise = this.queue.enqueueAfterDelay(
      this.timerId,
      remainingDelayMs,
      () => {
        this.lastAttemptTime = Date.now();
        return op();
      }
    );

    // Apply backoff factor to determine next delay and ensure it is within
    // bounds.
    this.currentBaseMs *= this.backoffFactor;
    if (this.currentBaseMs < this.initialDelayMs) {
      this.currentBaseMs = this.initialDelayMs;
    }
    if (this.currentBaseMs > this.maxDelayMs) {
      this.currentBaseMs = this.maxDelayMs;
    }
  }

  skipBackoff(): void {
    if (this.timerPromise !== null) {
      this.timerPromise.skipDelay();
      this.timerPromise = null;
    }
  }

  cancel(): void {
    if (this.timerPromise !== null) {
      this.timerPromise.cancel();
      this.timerPromise = null;
    }
  }

  /** Returns a random value in the range [-currentBaseMs/2, currentBaseMs/2] */
  private jitterDelayMs(): number {
    return (Math.random() - 0.5) * this.currentBaseMs;
  }
}
