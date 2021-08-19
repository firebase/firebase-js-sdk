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

import { Bytes, FirestoreError, _isBase64Available } from '@firebase/firestore';
import { Compat } from '@firebase/util';

/** Helper function to assert Uint8Array is available at runtime. */
function assertUint8ArrayAvailable(): void {
  if (typeof Uint8Array === 'undefined') {
    throw new FirestoreError(
      'unimplemented',
      'Uint8Arrays are not available in this environment.'
    );
  }
}

/** Helper function to assert Base64 functions are available at runtime. */
function assertBase64Available(): void {
  if (!_isBase64Available()) {
    throw new FirestoreError(
      'unimplemented',
      'Blobs are unavailable in Firestore in this environment.'
    );
  }
}

/** Immutable class holding a blob (binary data) */
export class Blob implements Compat<Bytes> {
  constructor(readonly _delegate: Bytes) {}
  static fromBase64String(base64: string): Blob {
    assertBase64Available();
    return new Blob(Bytes.fromBase64String(base64));
  }

  static fromUint8Array(array: Uint8Array): Blob {
    assertUint8ArrayAvailable();
    return new Blob(Bytes.fromUint8Array(array));
  }

  toBase64(): string {
    assertBase64Available();
    return this._delegate.toBase64();
  }

  toUint8Array(): Uint8Array {
    assertUint8ArrayAvailable();
    return this._delegate.toUint8Array();
  }

  isEqual(other: Blob): boolean {
    return this._delegate.isEqual(other._delegate);
  }

  toString(): string {
    return 'Blob(base64: ' + this.toBase64() + ')';
  }
}
