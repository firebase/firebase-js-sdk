/**
 * @license
 * Copyright 2023 Google LLC
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
 * Experimental options to configure the Firestore SDK.
 *
 * Note: This interface is "experimental" and is subject to change.
 *
 * See `FirestoreSettings.experimental`.
 */
export interface ExperimentalOptions {
  /**
   * The maximum amount of time, in milliseconds, to wait before sending a
   * Firestore "write" request to the backend. If `undefined` then do not delay
   * at all.
   *
   * A delay can be useful because it enables the in-memory "write pipeline" to
   * gather together multiple write requests and send them in a single HTTP
   * request to the backend, rather than one HTTP request per write request, as
   * is done when by default, or when this property is `undefined`. Note that
   * there is a hardcoded limit to the number of write requests that are sent at
   * once, so setting a very large value for this property will not necessarily
   * cause _all_ write requests to be sent in a single HTTP request; however, it
   * _could_ greatly reduce the number of distinct HTTP requests that are used.
   *
   * The value must be an integer value strictly greater than zero and less than
   * or equal to 10000 (10 seconds). A value of `200` is a good starting point
   * to minimize write latency yet still enable some amount of batching.
   *
   * See https://github.com/firebase/firebase-js-sdk/issues/5971 for rationale
   * and background information that motivated this option.
   */
  sendWriteRequestsDelayMs?: number;
}

/**
 * Compares two `ExperimentalOptions` objects for equality.
 */
export function experimentalOptionsEqual(
  options1: ExperimentalOptions,
  options2: ExperimentalOptions
): boolean {
  return (
    options1.sendWriteRequestsDelayMs === options2.sendWriteRequestsDelayMs
  );
}

/**
 * Creates and returns a new `ExperimentalOptions` with the same
 * option values as the given instance.
 */
export function cloneExperimentalOptions(
  options: ExperimentalOptions
): ExperimentalOptions {
  const clone: ExperimentalOptions = {};

  if (options.sendWriteRequestsDelayMs !== undefined) {
    clone.sendWriteRequestsDelayMs = options.sendWriteRequestsDelayMs;
  }

  return clone;
}
