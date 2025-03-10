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

import { ByteString } from '../util/byte_string';
import { Code, FirestoreError } from '../util/error';

/**
 * Represents a BSON Binary Data type in Firestore documents.
 *
 * @class BsonBinaryData
 */
export class BsonBinaryData {
  /** The subtype for the data */
  readonly subtype: number;

  /** The binary data as a byte array */
  readonly data: Uint8Array;

  constructor(subtype: number, data: Uint8Array) {
    if (subtype < 0 || subtype > 255) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'The subtype for BsonBinaryData must be a value in the inclusive [0, 255] range.'
      );
    }
    this.subtype = subtype;
    // Make a copy of the data.
    this.data = Uint8Array.from(data);
  }

  /**
   * Returns true if this `BsonBinaryData` is equal to the provided one.
   *
   * @param other - The `BsonBinaryData` to compare against.
   * @return 'true' if this `BsonBinaryData` is equal to the provided one.
   */
  isEqual(other: BsonBinaryData): boolean {
    return (
      this.subtype === other.subtype &&
      ByteString.fromUint8Array(this.data).isEqual(
        ByteString.fromUint8Array(other.data)
      )
    );
  }
}
