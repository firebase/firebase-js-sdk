/**
 * @license
 * Copyright 2022 Google LLC
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
import { Md5, Integer } from '@firebase/webchannel-wrapper';

import { newTextEncoder } from '../platform/serializer';
import { debugAssert } from '../util/assert';

const MAX_64_BIT_UNSIGNED_INTEGER = Integer.fromNumber(Math.pow(2, 64));

export class BloomFilter {
  readonly size: number;
  private readonly sizeInInteger: Integer;

  constructor(
    private readonly bitmap: Uint8Array,
    padding: number,
    private readonly hashCount: number
  ) {
    debugAssert(padding >= 0 && padding < 8, `Invalid padding: ${padding}`);
    if (bitmap.length > 0) {
      debugAssert(this.hashCount > 0, `Invalid hash count: ${hashCount}`);
    } else {
      // Only empty bloom filter can have 0 hash count.
      debugAssert(this.hashCount >= 0, `Invalid hash count: ${hashCount}`);

      // Empty bloom filter should have 0 padding.
      debugAssert(
        padding === 0,
        `Invalid padding when bitmap length is 0: ${padding}`
      );
    }

    this.size = bitmap.length * 8 - padding;
    this.sizeInInteger = Integer.fromNumber(this.size);
  }

  // Hash a string using md5 hashing algorithm.
  private static getMd5HashValue(value: string): Uint8Array {
    const md5 = new Md5();
    const encodedValue = newTextEncoder().encode(value);
    md5.update(encodedValue);
    return new Uint8Array(md5.digest());
  }

  // Interpret the 16 bytes array as two 64-bit unsigned integers, encoded using 2’s
  // complement using little endian.
  private static get64BitUints(Bytes: Uint8Array): [Integer, Integer] {
    const dataView = new DataView(Bytes.buffer);
    const chunk1 = dataView.getUint32(0, /* littleEndian= */ true);
    const chunk2 = dataView.getUint32(4, /* littleEndian= */ true);
    const chunk3 = dataView.getUint32(8, /* littleEndian= */ true);
    const chunk4 = dataView.getUint32(12, /* littleEndian= */ true);
    const integer1 = new Integer([chunk1, chunk2], 0);
    const integer2 = new Integer([chunk3, chunk4], 0);
    return [integer1, integer2];
  }

  // Calculate the ith hash value based on the hashed 64bit integers,
  // and calculate its corresponding bit index in the bitmap to be checked.
  private getBitIndex(num1: Integer, num2: Integer, index: number): number {
    // Calculate hashed value h(i) = h1 + (i * h2).
    let hashValue = num1.add(num2.multiply(Integer.fromNumber(index)));
    // Wrap if hash value overflow 64bit.
    if (hashValue.compare(MAX_64_BIT_UNSIGNED_INTEGER) === 1) {
      hashValue = new Integer([hashValue.getBits(0), hashValue.getBits(1)], 0);
    }
    return hashValue.modulo(this.sizeInInteger).toNumber();
  }

  // Return whether the bit on the given index in the bitmap is set to 1.
  private isBitSet(index: number): boolean {
    // To retrieve bit n, calculate: (bitmap[n / 8] & (0x01 << (n % 8))).
    const byte = this.bitmap[Math.floor(index / 8)];
    return (byte & (0x01 << index % 8)) !== 0;
  }

  mightContain(value: string): boolean {
    // Empty bitmap and empty value should always return false on membership check.
    if (this.size === 0 || value === '') {
      return false;
    }

    const md5HashedValue = BloomFilter.getMd5HashValue(value);
    const [hash1, hash2] = BloomFilter.get64BitUints(md5HashedValue);
    for (let i = 0; i < this.hashCount; i++) {
      const index = this.getBitIndex(hash1, hash2, i);
      if (!this.isBitSet(index)) {
        return false;
      }
    }
    return true;
  }
}
