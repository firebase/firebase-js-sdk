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

import * as log from '../util/log';
import { Deferred } from '../util/promise';

const LOG_TAG = 'ExponentialBackoff';

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
  private currentBaseMs: number;

  constructor(
    /**
     * The initial delay (used as the base delay on the first retry attempt).
     * Note that jitter will still be applied, so the actual delay could be as
     * little as 0.5*initialDelayMs.
     */
    private readonly initialDelayMs: number,
    /**
     * The multiplier to use to determine the extended base delay after each
     * attempt.
     */
    private readonly backoffFactor: number,
    /**
     * The maximum base delay after which no further backoff is performed.
     * Note that jitter will still be applied, so the actual delay could be as
     * much as 1.5*maxDelayMs.
     */
    private readonly maxDelayMs: number
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
   * delay for any subsequent attempts.
   */
  backoffAndWait(): Promise<void> {
    const def = new Deferred<void>();

    // First schedule using the current base (which may be 0 and should be
    // honored as such).
    const delayWithJitterMs = this.currentBaseMs + this.jitterDelayMs();
    if (this.currentBaseMs > 0) {
      log.debug(
        LOG_TAG,
        `Backing off for ${delayWithJitterMs} ms ` +
          `(base delay: ${this.currentBaseMs} ms)`
      );
    }
    setTimeout(() => {
      def.resolve();
    }, delayWithJitterMs);

    // Apply backoff factor to determine next delay and ensure it is within
    // bounds.
    this.currentBaseMs *= this.backoffFactor;
    if (this.currentBaseMs < this.initialDelayMs) {
      this.currentBaseMs = this.initialDelayMs;
    }
    if (this.currentBaseMs > this.maxDelayMs) {
      this.currentBaseMs = this.maxDelayMs;
    }

    return def.promise;
  }

  /** Returns a random value in the range [-currentBaseMs/2, currentBaseMs/2] */
  private jitterDelayMs(): number {
    return (Math.random() - 0.5) * this.currentBaseMs;
  }
}
