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
 * Represents a BSON ObjectId type in Firestore documents.
 *
 * @class BsonObjectId
 */
export class BsonObjectId {
  constructor(readonly value: string) {}

  /**
   * Returns true if this `BsonObjectId` is equal to the provided one.
   *
   * @param other - The `BsonObjectId` to compare against.
   * @return 'true' if this `BsonObjectId` is equal to the provided one.
   */
  isEqual(other: BsonObjectId): boolean {
    return this.value === other.value;
  }
}
