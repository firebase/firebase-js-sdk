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

/** Immutable class holding binary data in the Lite and modular SDK. */
export class Bytes {
  _byteString: ByteString;

  constructor(byteString: ByteString) {
    this._byteString = byteString;
  }

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

  static fromUint8Array(array: Uint8Array): Bytes {
    return new Bytes(ByteString.fromUint8Array(array));
  }

  toBase64(): string {
    return this._byteString.toBase64();
  }

  toUint8Array(): Uint8Array {
    return this._byteString.toUint8Array();
  }

  toString(): string {
    return 'Bytes(base64: ' + this.toBase64() + ')';
  }

  isEqual(other: Bytes): boolean {
    return this._byteString.isEqual(other._byteString);
  }
}
