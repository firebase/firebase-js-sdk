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

interface BitSequence {
  bitmap: string;
  padding: number;
}

export class BloomFilter {
  private readonly bitmap: string;
  private readonly bitSize: number;

  constructor(bits: BitSequence, private readonly hashCount: number) {
    this.bitmap = bits.bitmap;
    this.bitSize = this.bitmap.length * 8 - bits.padding;
  }

  getBitSize(): number {
    return this.bitSize;
  }

  mightContain(document: string): boolean {
    // Hash the string using md5
    const hash64: string = md5HashStringToHex(document);
    // Interpret those two 64-bit chunks as unsigned integers, encoded using 2’s
    // complement using little endian.
    let hash1 = '0x' + hash64.slice(0, 16);
    let hash2 = '0x' + hash64.slice(16);
    if (isLittleEndian()) {
      hash1 = changeEndianess(hash1);
      hash2 = changeEndianess(hash2);
    }

    for (let i = 0; i < this.hashCount; i++) {
      // Calculate hashed value h(i) = h1 + (i * h2), wrap if hash value overflow
      let combinedHash = BigInt(hash1) + BigInt(i) * BigInt(hash2);
      combinedHash = BigInt.asUintN(64, combinedHash);

      // To retrieve bit n, calculate: (bitmap[n / 8] & (0x01 << (n % 8))).
      const module = Number(combinedHash % BigInt(this.bitSize));
      const byte = this.bitmap.charCodeAt(Math.floor(module / 8));
      console.log(byte & (0x01 << module % 8));

      if (!(byte & (0x01 << module % 8))) {
        return false;
      }
    }
    return true;
  }
}

export function md5HashStringToHex(document: string): string {
  return md5(document).toString();
}

// Recommended code from mdn web docs:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView#endianness
export function isLittleEndian(): boolean {
  const buffer = new ArrayBuffer(2);
  new DataView(buffer).setInt16(0, 256, true /* littleEndian */);
  return new Int16Array(buffer)[0] === 256;
}

// Reverse a string representation of hexadecimal by bytes
export function changeEndianess(value: string): string {
  if (value.length % 2) {
    value = '0' + value;
  }
  if (value.startsWith('0x')) {
    value = value.slice(2);
  }
  let result = '';
  for (let i = value.length - 2; i >= 0; i = i - 2) {
    result += value.substring(i, i + 2);
  }
  return '0x' + result;
}
