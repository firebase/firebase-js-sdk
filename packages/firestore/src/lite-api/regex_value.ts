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
 * Represents a regular expression type in Firestore documents.
 *
 * @class RegexValue
 */
export class RegexValue {
  constructor(readonly pattern: string, readonly options: string) {}

  /**
   * Returns true if this `RegexValue` is equal to the provided one.
   *
   * @param other - The `RegexValue` to compare against.
   * @return 'true' if this `RegexValue` is equal to the provided one.
   */
  isEqual(other: RegexValue): boolean {
    return this.pattern === other.pattern && this.options === other.options;
  }
}
