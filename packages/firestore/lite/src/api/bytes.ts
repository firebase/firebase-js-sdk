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

import { Code, FirestoreError } from '../../../src/util/error';
import { ByteString } from '../../../src/util/byte_string';

/**
 * An immutable object representing an array of bytes.
 */
export class Bytes {
  _byteString: ByteString;

  constructor(byteString: ByteString) {
    this._byteString = byteString;
  }

  /**
   * Creates a new Blob from the given Base64 string, converting it to
   * bytes.
   *
   * @param base64 The Base64 string used to create the Blob object.
   */
  static fromBase64String(base64: string): Bytes {
    try {
      return new Bytes(ByteString.fromBase64String(base64));
    } catch (e) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Failed to construct Bytes from Base64 string: ' + e
      );
    }
  }

  /**
   * Creates a new Blob from the given Uint8Array.
   *
   * @param array The Uint8Array used to create the Blob object.
   */
  static fromUint8Array(array: Uint8Array): Bytes {
    return new Bytes(ByteString.fromUint8Array(array));
  }

  /**
   * Returns the bytes of a Blob as a Base64-encoded string.
   *
   * @return The Base64-encoded string created from the Blob object.
   */
  toBase64(): string {
    return this._byteString.toBase64();
  }

  /**
   * Returns the bytes of a Blob in a new Uint8Array.
   *
   * @return The Uint8Array created from the Blob object.
   */
  toUint8Array(): Uint8Array {
    return this._byteString.toUint8Array();
  }

  toString(): string {
    return 'Bytes(base64: ' + this.toBase64() + ')';
  }

  /**
   * Returns true if this `Blob` is equal to the provided one.
   *
   * @param other The `Blob` to compare against.
   * @return true if this `Blob` is equal to the provided one.
   */
  isEqual(other: Bytes): boolean {
    return this._byteString.isEqual(other._byteString);
  }
}
