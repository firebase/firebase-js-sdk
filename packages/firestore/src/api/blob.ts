/**
 * @license
 * Copyright 2017 Google LLC
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

import { PlatformSupport } from '../platform/platform';
import { Code, FirestoreError } from '../util/error';
import {
  invalidClassError,
  validateArgType,
  validateExactNumberOfArgs
} from '../util/input_validation';
import { ByteString } from '../util/byte_string';

/** Helper function to assert Uint8Array is available at runtime. */
function assertUint8ArrayAvailable(): void {
  if (typeof Uint8Array === 'undefined') {
    throw new FirestoreError(
      Code.UNIMPLEMENTED,
      'Uint8Arrays are not available in this environment.'
    );
  }
}

/** Helper function to assert Base64 functions are available at runtime. */
function assertBase64Available(): void {
  if (!PlatformSupport.getPlatform().base64Available) {
    throw new FirestoreError(
      Code.UNIMPLEMENTED,
      'Blobs are unavailable in Firestore in this environment.'
    );
  }
}

/**
 * Immutable class holding a blob (binary data).
 * This class is directly exposed in the public API.
 *
 * Note that while you can't hide the constructor in JavaScript code, we are
 * using the hack above to make sure no-one outside this module can call it.
 */
export class Blob {
  // Prefix with underscore to signal that we consider this not part of the
  // public API and to prevent it from showing up for autocompletion.
  _byteString: ByteString;

  constructor(byteString: ByteString) {
    assertBase64Available();
    this._byteString = byteString;
  }

  static fromBase64String(base64: string): Blob {
    validateExactNumberOfArgs('Blob.fromBase64String', arguments, 1);
    validateArgType('Blob.fromBase64String', 'string', 1, base64);
    assertBase64Available();
    try {
      return new Blob(ByteString.fromBase64String(base64));
    } catch (e) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Failed to construct Blob from Base64 string: ' + e
      );
    }
  }

  static fromUint8Array(array: Uint8Array): Blob {
    validateExactNumberOfArgs('Blob.fromUint8Array', arguments, 1);
    assertUint8ArrayAvailable();
    if (!(array instanceof Uint8Array)) {
      throw invalidClassError('Blob.fromUint8Array', 'Uint8Array', 1, array);
    }
    return new Blob(ByteString.fromUint8Array(array));
  }

  toBase64(): string {
    validateExactNumberOfArgs('Blob.toBase64', arguments, 0);
    assertBase64Available();
    return this._byteString.toBase64();
  }

  toUint8Array(): Uint8Array {
    validateExactNumberOfArgs('Blob.toUint8Array', arguments, 0);
    assertUint8ArrayAvailable();
    return this._byteString.toUint8Array();
  }

  toString(): string {
    return 'Blob(base64: ' + this.toBase64() + ')';
  }

  isEqual(other: Blob): boolean {
    return this._byteString.isEqual(other._byteString);
  }
}
