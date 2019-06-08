/**
 * @license
 * Copyright 2017 Google Inc.
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
import { makeConstructorPrivate } from '../util/api';
import { Code, FirestoreError } from '../util/error';
import {
  invalidClassError,
  validateArgType,
  validateExactNumberOfArgs
} from '../util/input_validation';
import { primitiveComparator } from '../util/misc';

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
  // Prefix with underscore to signal this is a private variable in JS and
  // prevent it showing up for autocompletion.
  // A binary string is a string with each char as Unicode code point in the
  // range of [0, 255], essentially simulating a byte array.
  private _binaryString: string;

  private constructor(binaryString: string) {
    assertBase64Available();
    this._binaryString = binaryString;
  }

  static fromBase64String(base64: string): Blob {
    validateExactNumberOfArgs('Blob.fromBase64String', arguments, 1);
    validateArgType('Blob.fromBase64String', 'string', 1, base64);
    assertBase64Available();
    try {
      const binaryString = PlatformSupport.getPlatform().atob(base64);
      return new Blob(binaryString);
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
    // We can't call array.map directly because it expects the return type to
    // be a Uint8Array, whereas we can convert it to a regular array by invoking
    // map on the Array prototype.
    const binaryString = Array.prototype.map
      .call(array, (char: number) => {
        return String.fromCharCode(char);
      })
      .join('');
    return new Blob(binaryString);
  }

  toBase64(): string {
    validateExactNumberOfArgs('Blob.toBase64', arguments, 0);
    assertBase64Available();
    return PlatformSupport.getPlatform().btoa(this._binaryString);
  }

  toUint8Array(): Uint8Array {
    validateExactNumberOfArgs('Blob.toUint8Array', arguments, 0);
    assertUint8ArrayAvailable();
    const buffer = new Uint8Array(this._binaryString.length);
    for (let i = 0; i < this._binaryString.length; i++) {
      buffer[i] = this._binaryString.charCodeAt(i);
    }
    return buffer;
  }

  toString(): string {
    return 'Blob(base64: ' + this.toBase64() + ')';
  }

  isEqual(other: Blob): boolean {
    return this._binaryString === other._binaryString;
  }

  /**
   * Actually private to JS consumers of our API, so this function is prefixed
   * with an underscore.
   */
  _compareTo(other: Blob): number {
    return primitiveComparator(this._binaryString, other._binaryString);
  }
}

// Public instance that disallows construction at runtime. This constructor is
// used when exporting Blob on firebase.firestore.Blob and will be called Blob
// publicly. Internally we still use Blob which has a type checked private
// constructor. Note that Blob and PublicBlob can be used interchangeably in
// instanceof checks.
// For our internal TypeScript code PublicBlob doesn't exist as a type, and so
// we need to use Blob as type and export it too.
// tslint:disable-next-line:variable-name We're treating this as a class name.
export const PublicBlob = makeConstructorPrivate(
  Blob,
  'Use Blob.fromUint8Array() or Blob.fromBase64String() instead.'
);
