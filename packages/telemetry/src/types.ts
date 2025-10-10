/**
 * @license
 * Copyright 2025 Google LLC
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
 * An interface for classes that provide dynamic headers.
 *
 * Classes that implement this interface can be used to supply custom headers for logging.
 *
 * @internal
 */
export interface DynamicHeaderProvider {
  /**
   * Returns a record of headers to be added to a request.
   *
   * @returns A {@link Promise} that resolves to a {@link Record<string, string>} of header
   * key-value pairs, or null if no headers are to be added.
   */
  getHeader(): Promise<Record<string, string> | null>;
}
