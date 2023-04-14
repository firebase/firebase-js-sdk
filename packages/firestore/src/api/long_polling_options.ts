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
 * Options for long polling when it is used.
 *
 * See `FirestoreSettings.experimentalAutoDetectLongPolling`,
 * `FirestoreSettings.experimentalForceLongPolling`, and
 * `FirestoreSettings.experimentalLongPollingOptions`.
 */
export interface ExperimentalLongPollingOptions {
  /**
   * The desired maximum timeout interval (in seconds) to complete a long
   * polling GET response. Valid values are integers between 5 and 30,
   * inclusive.
   *
   * By default, when long polling is used the "hanging GET" request sent by
   * the client times out after 30 seconds. To request a different timeout
   * from the server, set this setting with the desired timeout. This may be
   * useful, for example, if the buffering proxy that necessitated enabling
   * long polling in the first place has a shorter timeout for hanging GET
   * requests, in which case setting the long-polling timeout to a shorter
   * value, such as 25 seconds, may fix prematurely-closed hanging GET
   * requests.
   */
  idleHttpRequestTimeoutSeconds?: number;
}

/**
 * Compares two `ExperimentalLongPollingOptions` objects for equality.
 */
export function longPollingOptionsEqual(
  options1: ExperimentalLongPollingOptions,
  options2: ExperimentalLongPollingOptions
): boolean {
  return (
    options1?.idleHttpRequestTimeoutSeconds ===
    options2?.idleHttpRequestTimeoutSeconds
  );
}

/**
 * Creates and returns a new `ExperimentalLongPollingOptions` with the same
 * option values as the given instance.
 */
export function cloneLongPollingOptions(
  options: ExperimentalLongPollingOptions
): ExperimentalLongPollingOptions {
  const result: ExperimentalLongPollingOptions = {};
  if (options.idleHttpRequestTimeoutSeconds !== undefined) {
    result.idleHttpRequestTimeoutSeconds =
      options.idleHttpRequestTimeoutSeconds;
  }
  return result;
}
