/**
 * @license
 * Copyright 2020 Google LLC
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
 * An immutable object representing an array of bytes.
 */
export class Bytes {
  _byteString: ByteString;

  /** @hideconstructor */
  constructor(byteString: ByteString) {
    this._byteString = byteString;
  }

  /**
   * Creates a new `Bytes` object from the given Base64 string, converting it to
   * bytes.
   *
   * @param base64 - The Base64 string used to create the `Bytes` object.
   */
  static fromBase64String(base64: string): Bytes {
    try {
      return new Bytes(ByteString.fromBase64String(base64));
    } catch (e) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Failed to construct data from Base64 string: ' + e
      );
    }
  }

  /**
   * Creates a new `Bytes` object from the given Uint8Array.
   *
   * @param array - The Uint8Array used to create the `Bytes` object.
   */
  static fromUint8Array(array: Uint8Array): Bytes {
    return new Bytes(ByteString.fromUint8Array(array));
  }

  /**
   * Returns the underlying bytes as a Base64-encoded string.
   *
   * @returns The Base64-encoded string created from the `Bytes` object.
   */
  toBase64(): string {
    return this._byteString.toBase64();
  }

  /**
   * Returns the underlying bytes in a new `Uint8Array`.
   *
   * @returns The Uint8Array created from the `Bytes` object.
   */
  toUint8Array(): Uint8Array {
    return this._byteString.toUint8Array();
  }

  /**
   * Returns a string representation of the `Bytes` object.
   *
   * @returns A string representation of the `Bytes` object.
   */
  toString(): string {
    return 'Bytes(base64: ' + this.toBase64() + ')';
  }

  /**
   * Returns true if this `Bytes` object is equal to the provided one.
   *
   * @param other - The `Bytes` object to compare against.
   * @returns true if this `Bytes` object is equal to the provided one.
   */
  isEqual(other: Bytes): boolean {
    return this._byteString.isEqual(other._byteString);
  }
}
