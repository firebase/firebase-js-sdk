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
// @ts-ignore
import md5 from 'crypto-js/md5';

export class BloomFilter {
  private readonly bitSize: number;

  constructor(
    private readonly bitmap: Uint8Array,
    padding: number,
    private readonly hashCount: number
  ) {
    this.bitSize = this.bitmap.length * 8 - padding;
  }

  getBitSize(): number {
    return this.bitSize;
  }

  mightContain(document: string): boolean {
    // Hash the string using md5
    const md5HashResult = md5HashString(document);
    const encodedBytes: Uint8Array = md5HashToBytes(md5HashResult.words);
    // Interpret the hashed value as two 64-bit chunks as unsigned integers, encoded using 2’s
    // complement using little endian.
    const dataView = new DataView(encodedBytes.buffer);
    const hash1 = dataView.getBigUint64(0, /* littleEndian= */ true);
    const hash2 = dataView.getBigUint64(8, /* littleEndian= */ true);

    for (let i = 0; i < this.hashCount; i++) {
      // Calculate hashed value h(i) = h1 + (i * h2), wrap if hash value overflow
      let combinedHash = hash1 + BigInt(i) * hash2;
      combinedHash = BigInt.asUintN(64, combinedHash);

      // To retrieve bit n, calculate: (bitmap[n / 8] & (0x01 << (n % 8))).
      const module = Number(combinedHash % BigInt(this.bitSize));
      const byte = this.bitmap[Math.floor(module / 8)];

      if (!(byte & (0x01 << module % 8))) {
        return false;
      }
    }
    return true;
  }
}

//replace with google library later
export function md5HashString(document: string): {
  words: number[];
  sigBytes: number;
} {
  return md5(document);
}

// Crypt0-js.md5 does not have digest function to convert the result to a byte array, so doing it
// manually.
// This can be removed if we end up using goog libray, as their md5.digest() will return byte array
export function md5HashToBytes(words: number[]): Uint8Array {
  const hexChars = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    const bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    hexChars[i] = bite;
  }
  return hexChars;
}
