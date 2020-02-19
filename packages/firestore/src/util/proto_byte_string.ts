/**
 * @license
 * Copyright 2020 Google LLC.
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

/**
 * Immutable class that represents a "proto" byte string.
 *
 * Proto byte strings can either be base64 strings or Uint8Arrays when sent
 * on the wire, but they are always typed to string. This class abstracts away
 * this differentiation by holding the proto byte string in a common class that
 * must be converted into a string before being sent as a proto.
 */
export class ProtoByteString {
  private _binaryString: string;

  private constructor(binaryString: string) {
    this._binaryString = binaryString;
  }

  static fromBase64String(base64: string): ProtoByteString {
    const binaryString = PlatformSupport.getPlatform().atob(base64);
    return new ProtoByteString(binaryString);
  }

  static fromUint8Array(array: Uint8Array): ProtoByteString {
    const binaryString = binaryStringFromUint8Array(array);
    return new ProtoByteString(binaryString);
  }

  toBase64(): string {
    return PlatformSupport.getPlatform().btoa(this._binaryString);
  }

  toUint8Array(): Uint8Array {
    const buffer = Uint8ArrayFromBinaryString(this._binaryString);
    return buffer;
  }

  approximateByteSize(): number {
    return this._binaryString.length * 2;
  }

  isEqual(other: ProtoByteString): boolean {
    return this._binaryString === other._binaryString;
  }
}

/**
 * Helper function to convert an Uint8array to a binary string.
 */
export function binaryStringFromUint8Array(array: Uint8Array): string {
  // We can't call array.map directly because it expects the return type to
  // be a Uint8Array, whereas we can convert it to a regular array by invoking
  // map on the Array prototype.
  return Array.prototype.map
    .call(array, (char: number) => {
      return String.fromCharCode(char);
    })
    .join('');
}

/**
 * Helper function to convert a binary string to an Uint8Array.
 */
export function Uint8ArrayFromBinaryString(binaryString: string): Uint8Array {
  const buffer = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    buffer[i] = binaryString.charCodeAt(i);
  }
  return buffer;
}

/**
 * Returns an empty ProtoByteString.
 */
export function emptyByteString(): ProtoByteString {
  return ProtoByteString.fromBase64String('');
}
