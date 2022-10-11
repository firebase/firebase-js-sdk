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

import { decodeBase64, encodeBase64 } from '../platform/base64';

import { primitiveComparator } from './misc';

/**
 * Immutable class that represents a "proto" byte string.
 *
 * Proto byte strings can either be Base64-encoded strings or Uint8Arrays when
 * sent on the wire. This class abstracts away this differentiation by holding
 * the proto byte string in a common class that must be converted into a string
 * before being sent as a proto.
 * @internal
 */
export class ByteString {
  static readonly EMPTY_BYTE_STRING = new ByteString('');

  private constructor(private readonly binaryString: string) {}

  static fromBase64String(base64: string): ByteString {
    const binaryString = decodeBase64(base64);
    return new ByteString(binaryString);
  }

  static fromUint8Array(array: Uint8Array): ByteString {
    // TODO(indexing); Remove the copy of the byte string here as this method
    // is frequently called during indexing.
    const binaryString = binaryStringFromUint8Array(array);
    return new ByteString(binaryString);
  }

  [Symbol.iterator](): Iterator<number> {
    let i = 0;
    return {
      next: () => {
        if (i < this.binaryString.length) {
          return { value: this.binaryString.charCodeAt(i++), done: false };
        } else {
          return { value: undefined, done: true };
        }
      }
    };
  }

  toBase64(): string {
    return encodeBase64(this.binaryString);
  }

  toUint8Array(): Uint8Array {
    return uint8ArrayFromBinaryString(this.binaryString);
  }

  approximateByteSize(): number {
    return this.binaryString.length * 2;
  }

  compareTo(other: ByteString): number {
    return primitiveComparator(this.binaryString, other.binaryString);
  }

  isEqual(other: ByteString): boolean {
    return this.binaryString === other.binaryString;
  }
}

/**
 * Helper function to convert an Uint8array to a binary string.
 */
export function binaryStringFromUint8Array(array: Uint8Array): string {
  let binaryString = '';
  for (let i = 0; i < array.length; ++i) {
    binaryString += String.fromCharCode(array[i]);
  }
  return binaryString;
}

/**
 * Helper function to convert a binary string to an Uint8Array.
 */
export function uint8ArrayFromBinaryString(binaryString: string): Uint8Array {
  const buffer = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    buffer[i] = binaryString.charCodeAt(i);
  }
  return buffer;
}
