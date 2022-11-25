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

export class BloomFilter {
  readonly size: number;

  constructor(
    private readonly bitmap: Uint8Array,
    padding: number,
    private readonly hashCount: number
  ) {
    if (this.bitmap.length === 0) {
      debugAssert(
        padding === 0,
        'A valid empty bloom filter should have 0 padding.'
      );
    }
    this.size = this.bitmap.length * 8 - padding;
    debugAssert(padding >= 0, 'Padding is negative.');
    debugAssert(this.size >= 0, 'Bitmap size is negative.');
    // Only empty bloom filter can have 0 hash count
    debugAssert(
      this.bitmap.length === 0 || this.hashCount > 0,
      'Hash count is 0 or negative'
    );
  }

  mightContain(value: string): boolean {
    // Empty bitmap should always return false on membership check
    if (this.size === 0) {
      return false;
    }

    // Hash the string using md5
    const md5 = new Md5();
    const encodedValue = newTextEncoder().encode(value);
    md5.update(encodedValue);
    const encodedBytes = new Uint8Array(md5.digest());

    // Interpret the hashed value as two 64-bit chunks as unsigned integers, encoded using 2’s
    // complement using little endian.
    const dataView = new DataView(encodedBytes.buffer);
    const firstUint32 = dataView.getUint32(0, /* littleEndian= */ true);
    const secondUint32 = dataView.getUint32(4, /* littleEndian= */ true);
    const thirdUint32 = dataView.getUint32(8, /* littleEndian= */ true);
    const fourthUint32 = dataView.getUint32(12, /* littleEndian= */ true);
    const hash1 = new Integer([firstUint32, secondUint32], 0);
    const hash2 = new Integer([thirdUint32, fourthUint32], 0);

    const sizeInInteger = Integer.fromNumber(this.size);
    const max64BitInteger = Integer.fromNumber(Math.pow(2, 64));

    for (let i = 0; i < this.hashCount; i++) {
      // Calculate hashed value h(i) = h1 + (i * h2), wrap if hash value overflow
      let combinedHash = hash1.add(hash2.multiply(Integer.fromNumber(i)));
      if (combinedHash.compare(max64BitInteger) === 1) {
        combinedHash = new Integer(
          [combinedHash.getBits(0), combinedHash.getBits(1)],
          0
        );
      }
      // To retrieve bit n, calculate: (bitmap[n / 8] & (0x01 << (n % 8))).
      const modulo = Number(combinedHash.modulo(sizeInInteger));
      const byte = this.bitmap[Math.floor(modulo / 8)];

      if (!(byte & (0x01 << modulo % 8))) {
        return false;
      }
    }

    return true;
  }
}
