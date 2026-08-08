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
 * Represents a 32-bit integer type in Firestore documents.
 *
 * @class Int32Value
 */
export class Int32Value {
  constructor(readonly value: number) {}

  /**
   * Returns true if this `Int32Value` is equal to the provided one.
   *
   * @param other - The `Int32Value` to compare against.
   * @return 'true' if this `Int32Value` is equal to the provided one.
   */
  isEqual(other: Int32Value): boolean {
    return this.value === other.value;
  }
}
