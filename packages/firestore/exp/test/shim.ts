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

import * as legacy from '@firebase/firestore-types';

import { FieldPath as FieldPathExp, Bytes as BytesExp } from '../../exp/index';
import { Compat } from '../../src/compat/compat';

export { GeoPoint, Timestamp } from '../index';

/* eslint-disable @typescript-eslint/no-explicit-any */

// This module defines a shim layer that implements the legacy API on top
// of the experimental SDK. This shim is used to run integration tests against
// both SDK versions.

export class FieldPath
  extends Compat<FieldPathExp>
  implements legacy.FieldPath {
  constructor(...fieldNames: string[]) {
    super(new FieldPathExp(...fieldNames));
  }

  static documentId(): FieldPath {
    return new FieldPath('__name__');
  }

  isEqual(other: FieldPath): boolean {
    throw new Error('isEqual() is not supported in shim');
  }
}

export class Blob extends Compat<BytesExp> implements legacy.Blob {
  static fromBase64String(base64: string): Blob {
    return new Blob(BytesExp.fromBase64String(base64));
  }

  static fromUint8Array(array: Uint8Array): Blob {
    return new Blob(BytesExp.fromUint8Array(array));
  }

  toBase64(): string {
    return this._delegate.toBase64();
  }

  toUint8Array(): Uint8Array {
    return this._delegate.toUint8Array();
  }

  isEqual(other: Blob): boolean {
    return this._delegate.isEqual(other._delegate);
  }
}
