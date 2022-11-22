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

import { debugAssert } from '../util/assert';

export class BloomFilter {
  private readonly bitSize: number;

  constructor(
    private readonly bitmap: Uint8Array,
    padding: number,
    private readonly hashCount: number
  ) {
    debugAssert(padding >= 0, 'Padding is negative.');
    this.bitSize = this.bitmap.length * 8 - padding;
    debugAssert(this.bitSize >= 0, 'Bitmap size is negative.');
    debugAssert(this.hashCount >= 0, 'Hash count is negative.');
  }

  getBitSize(): number {
    return this.bitSize;
  }

  mightContain(document: string): boolean {
    // Empty bitmap should always return false on membership check
    if (this.bitSize === 0) {
      return false;
    }
    // If document name is an empty string, return false
    if (!document) {
      return false;
    }

    // Hash the string using md5
    const md5 = new Md5();
    md5.update(document);
    const encodedBytes: Uint8Array = new Uint8Array(md5.digest());

    // Interpret the hashed value as two 64-bit chunks as unsigned integers, encoded using 2’s
    // complement using little endian.
    const dataView = new DataView(encodedBytes.buffer);
    const firstUint32 = dataView.getUint32(0, /* littleEndian= */ true);
    const secondUint32 = dataView.getUint32(4, /* littleEndian= */ true);
    const thirdUint32 = dataView.getUint32(8, /* littleEndian= */ true);
    const fourthUint32 = dataView.getUint32(12, /* littleEndian= */ true);
    const hash1 = new Integer([firstUint32, secondUint32], 0);
    const hash2 = new Integer([thirdUint32, fourthUint32], 0);

    for (let i = 0; i < this.hashCount; i++) {
      // Calculate hashed value h(i) = h1 + (i * h2), wrap if hash value overflow
      let combinedHash = hash1.add(hash2.multiply(Integer.fromNumber(i)));
      combinedHash = combinedHash.modulo(Integer.fromNumber(Math.pow(2, 64)));

      // To retrieve bit n, calculate: (bitmap[n / 8] & (0x01 << (n % 8))).
      const module = Number(
        combinedHash.modulo(Integer.fromNumber(this.bitSize))
      );
      const byte = this.bitmap[Math.floor(module / 8)];

      if (!(byte & (0x01 << module % 8))) {
        return false;
      }
    }
    return true;
  }
}
