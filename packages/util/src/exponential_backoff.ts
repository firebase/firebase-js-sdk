/**
 * @license
 * Copyright 2019 Google LLC
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

/**
 * The amount of milliseconds to exponentially increase.
 */
const DEFAULT_INTERVAL_MILLIS = 1000;

/**
 * The factor to backoff by.
 * Should be a number greater than 1.
 */
const DEFAULT_BACKOFF_FACTOR = 2;

/**
 * The maximum milliseconds to increase to.
 *
 * <p>Visible for testing
 */
export const MAX_VALUE_MILLIS = 4 * 60 * 60 * 1000; // Four hours, like iOS and Android.

/**
 * The percentage of backoff time to randomize by.
 * See
 * http://go/safe-client-behavior#step-1-determine-the-appropriate-retry-interval-to-handle-spike-traffic
 * for context.
 *
 * <p>Visible for testing
 */
export const RANDOM_FACTOR = 0.5;

/**
 * Based on the backoff method from
 * https://github.com/google/closure-library/blob/master/closure/goog/math/exponentialbackoff.js.
 * Extracted here so we don't need to pass metadata and a stateful ExponentialBackoff object around.
 */
export function calculateBackoffMillis(
  backoffCount: number,
  intervalMillis: number = DEFAULT_INTERVAL_MILLIS,
  backoffFactor: number = DEFAULT_BACKOFF_FACTOR
): number {
  // Calculates an exponentially increasing value.
  // Deviation: calculates value from count and a constant interval, so we only need to save value
  // and count to restore state.
  const currBaseValue = intervalMillis * Math.pow(backoffFactor, backoffCount);

  // A random "fuzz" to avoid waves of retries.
  // Deviation: randomFactor is required.
  const randomWait = Math.round(
    // A fraction of the backoff value to add/subtract.
    // Deviation: changes multiplication order to improve readability.
    RANDOM_FACTOR *
      currBaseValue *
      // A random float (rounded to int by Math.round above) in the range [-1, 1]. Determines
      // if we add or subtract.
      (Math.random() - 0.5) *
      2
  );

  // Limits backoff to max to avoid effectively permanent backoff.
  return Math.min(MAX_VALUE_MILLIS, currBaseValue + randomWait);
}
