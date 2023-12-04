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

import { newTextEncoder } from '../platform/text_serializer';

const MAX_64_BIT_UNSIGNED_INTEGER = new Integer([0xffffffff, 0xffffffff], 0);

// Hash a string using md5 hashing algorithm.
function getMd5HashValue(value: string): Uint8Array {
  const encodedValue = newTextEncoder().encode(value);
  const md5 = new Md5();
  md5.update(encodedValue);
  return new Uint8Array(md5.digest());
}

// Interpret the 16 bytes array as two 64-bit unsigned integers, encoded using
// 2’s complement using little endian.
function get64BitUints(Bytes: Uint8Array): [Integer, Integer] {
  const dataView = new DataView(Bytes.buffer);
  const chunk1 = dataView.getUint32(0, /* littleEndian= */ true);
  const chunk2 = dataView.getUint32(4, /* littleEndian= */ true);
  const chunk3 = dataView.getUint32(8, /* littleEndian= */ true);
  const chunk4 = dataView.getUint32(12, /* littleEndian= */ true);
  const integer1 = new Integer([chunk1, chunk2], 0);
  const integer2 = new Integer([chunk3, chunk4], 0);
  return [integer1, integer2];
}

export class BloomFilter {
  readonly bitCount: number;
  private readonly bitCountInInteger: Integer;

  constructor(
    readonly bitmap: Uint8Array,
    readonly padding: number,
    readonly hashCount: number
  ) {
    if (padding < 0 || padding >= 8) {
      throw new BloomFilterError(`Invalid padding: ${padding}`);
    }

    if (hashCount < 0) {
      throw new BloomFilterError(`Invalid hash count: ${hashCount}`);
    }

    if (bitmap.length > 0 && this.hashCount === 0) {
      // Only empty bloom filter can have 0 hash count.
      throw new BloomFilterError(`Invalid hash count: ${hashCount}`);
    }

    if (bitmap.length === 0 && padding !== 0) {
      // Empty bloom filter should have 0 padding.
      throw new BloomFilterError(
        `Invalid padding when bitmap length is 0: ${padding}`
      );
    }

    this.bitCount = bitmap.length * 8 - padding;
    // Set the bit count in Integer to avoid repetition in mightContain().
    this.bitCountInInteger = Integer.fromNumber(this.bitCount);
  }

  // Calculate the ith hash value based on the hashed 64bit integers,
  // and calculate its corresponding bit index in the bitmap to be checked.
  private getBitIndex(num1: Integer, num2: Integer, hashIndex: number): number {
    // Calculate hashed value h(i) = h1 + (i * h2).
    let hashValue = num1.add(num2.multiply(Integer.fromNumber(hashIndex)));
    // Wrap if hash value overflow 64bit.
    if (hashValue.compare(MAX_64_BIT_UNSIGNED_INTEGER) === 1) {
      hashValue = new Integer([hashValue.getBits(0), hashValue.getBits(1)], 0);
    }
    return hashValue.modulo(this.bitCountInInteger).toNumber();
  }

  // Return whether the bit on the given index in the bitmap is set to 1.
  private isBitSet(index: number): boolean {
    // To retrieve bit n, calculate: (bitmap[n / 8] & (0x01 << (n % 8))).
    const byte = this.bitmap[Math.floor(index / 8)];
    const offset = index % 8;
    return (byte & (0x01 << offset)) !== 0;
  }

  mightContain(value: string): boolean {
    // Empty bitmap should always return false on membership check.
    if (this.bitCount === 0) {
      return false;
    }
    const md5HashedValue = getMd5HashValue(value);
    const [hash1, hash2] = get64BitUints(md5HashedValue);
    for (let i = 0; i < this.hashCount; i++) {
      const index = this.getBitIndex(hash1, hash2, i);
      if (!this.isBitSet(index)) {
        return false;
      }
    }
    return true;
  }

  /** Create bloom filter for testing purposes only. */
  static create(
    bitCount: number,
    hashCount: number,
    contains: string[]
  ): BloomFilter {
    const padding = bitCount % 8 === 0 ? 0 : 8 - (bitCount % 8);
    const bitmap = new Uint8Array(Math.ceil(bitCount / 8));
    const bloomFilter = new BloomFilter(bitmap, padding, hashCount);
    contains.forEach(item => bloomFilter.insert(item));
    return bloomFilter;
  }

  private insert(value: string): void {
    if (this.bitCount === 0) {
      return;
    }

    const md5HashedValue = getMd5HashValue(value);
    const [hash1, hash2] = get64BitUints(md5HashedValue);
    for (let i = 0; i < this.hashCount; i++) {
      const index = this.getBitIndex(hash1, hash2, i);
      this.setBit(index);
    }
  }

  private setBit(index: number): void {
    const indexOfByte = Math.floor(index / 8);
    const offset = index % 8;
    this.bitmap[indexOfByte] |= 0x01 << offset;
  }
}

export class BloomFilterError extends Error {
  readonly name = 'BloomFilterError';
}
