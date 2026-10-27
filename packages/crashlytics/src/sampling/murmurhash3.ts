/**
 * @license
 * Copyright 2026 Google LLC
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

const C1 = 0xcc9e2d51;
const C2 = 0x1b873593;

/**
 * Encodes a string as UTF-8 bytes. Uses `TextEncoder` when available and falls back to a
 * minimal manual encoder otherwise.
 */
function utf8Encode(input: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(input);
  }
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let codePoint = input.charCodeAt(i);
    // Combine surrogate pairs into a single code point.
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < input.length) {
      const next = input.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00);
        i++;
      }
    }
    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    }
  }
  return Uint8Array.from(bytes);
}

function rotl32(value: number, bits: number): number {
  return (value << bits) | (value >>> (32 - bits));
}

function mixK1(k1: number): number {
  k1 = Math.imul(k1, C1);
  k1 = rotl32(k1, 15);
  return Math.imul(k1, C2);
}

/**
 * MurmurHash3 (x86, 32-bit variant) of the UTF-8 encoding of `input`.
 *
 * This is the same function as Guava's `Hashing.murmur3_32_fixed().hashString(input, UTF_8)`,
 * which the Firebase Telemetry backend uses to re-evaluate session sampling decisions. Any change
 * here must be mirrored on the server, otherwise device and server decisions diverge.
 *
 * @param input - The string to hash.
 * @param seed - Optional 32-bit seed. Defaults to `0`.
 * @returns The hash as an unsigned 32-bit integer.
 *
 * @internal
 */
export function murmurHash3(input: string, seed = 0): number {
  const data = utf8Encode(input);
  const length = data.length;
  const blockCount = length >>> 2;
  let h1 = seed >>> 0;

  for (let block = 0; block < blockCount; block++) {
    const i = block * 4;
    const k1 =
      data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24);
    h1 ^= mixK1(k1);
    h1 = rotl32(h1, 13);
    h1 = (Math.imul(h1, 5) + 0xe6546b64) | 0;
  }

  const tailIndex = blockCount * 4;
  const remaining = length & 3;
  if (remaining > 0) {
    let k1 = 0;
    if (remaining >= 3) {
      k1 ^= data[tailIndex + 2] << 16;
    }
    if (remaining >= 2) {
      k1 ^= data[tailIndex + 1] << 8;
    }
    k1 ^= data[tailIndex];
    h1 ^= mixK1(k1);
  }

  h1 ^= length;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}
