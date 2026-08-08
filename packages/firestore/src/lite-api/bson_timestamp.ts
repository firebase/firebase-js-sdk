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
 * Represents a BSON Timestamp type in Firestore documents.
 *
 * @class BsonTimestamp
 */
export class BsonTimestamp {
  constructor(readonly seconds: number, readonly increment: number) {
    // Make sure 'seconds' and 'increment' are in the range of a 32-bit unsigned integer.
    if (seconds < 0 || seconds > 4294967295) {
      throw new Error(
        "BsonTimestamp 'seconds' must be in the range of a 32-bit unsigned integer."
      );
    }
    if (increment < 0 || increment > 4294967295) {
      throw new Error(
        "BsonTimestamp 'increment' must be in the range of a 32-bit unsigned integer."
      );
    }
  }

  /**
   * Returns true if this `BsonTimestamp` is equal to the provided one.
   *
   * @param other -  The `BsonTimestamp` to compare against.
   * @return 'true' if this `BsonTimestamp` is equal to the provided one.
   */
  isEqual(other: BsonTimestamp): boolean {
    return this.seconds === other.seconds && this.increment === other.increment;
  }
}
