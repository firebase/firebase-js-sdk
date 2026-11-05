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

import { murmurHash3, utf8Encode } from './murmurhash3';
import { SESSION_SAMPLING_HASH_BUCKETS } from '../constants';

/**
 * The server's hash of each input, as an unsigned 32-bit integer. The first group are commonly
 * used MurmurHash3 (x86, 32-bit) test strings.
 */
const SERVER_VECTORS: Array<[string, number]> = [
  ['', 0x00000000],
  ['k', 0xcfbda5d1],
  ['hell', 0xa167dbf3],
  ['hello', 0x248bfa47],
  ['http://www.google.com/', 0x3d41b97c],
  ['The quick brown fox jumps over the lazy dog', 0x2e4ff723],
  ['ABCDefGHI\u0799', 0xb5a4be05],
  ['毎月１日,毎週月曜日', 0xfc5ba834],
  ['surrogate pair: \ud83d\udcb0', 0x8a5c3699],
  // Session IDs are UUIDs (see generateUuid).
  ['00000000-0000-0000-0000-000000000000', 0x16a8edd4],
  ['ffffffff-ffff-4fff-bfff-ffffffffffff', 0x6fc8878c],
  ['90a59e19-d6fb-4575-8b76-569f6847a2e3', 0x1f0bc3f4],
  ['5edcc73d-6979-47cf-bcfe-263aa27ac6b3', 0x605a47dc],
  ['27706b31-6f3c-47f0-990f-89e97553e4ca', 0xfe814b19],
  ['d31b5456-dea6-4dff-b708-dfd2a2675b0f', 0x8ffb7277],
  // The lowest and highest code points of each UTF-8 length (1 to 4 bytes).
  ['\u0000', 0x514e28b7],
  ['\u007f', 0x5589d599],
  ['\u0080', 0x4b961288],
  ['\u07ff', 0x8ca7f27d],
  ['\u0800', 0x7aa3d41f],
  ['\uffff', 0x3f4aff5c],
  ['\u{10000}', 0x61c178ff],
  ['\u{10ffff}', 0x2bc506da],
  // Around the surrogates, and U+FFFD, which TextEncoder writes for an unpaired surrogate.
  ['\ud7ff', 0x43e3f269],
  ['\ue000', 0x1ae2e2da],
  ['\ufffd', 0xb69ca6c1],
  // Unpaired surrogates, which the server encodes as `?`.
  ['a\ud800\ud800z', 0x85614bf1],
  ['\ud800', 0x96615806],
  ['\udc00', 0x96615806],
  ['abc\ud83d', 0x8ddebe21],
  ['\udcb0abc', 0xde2791cf],
  ['\udc00\ud800', 0x4c9282c2],
  ['\ud800\ud83d\udcb0', 0x88141137],
  ['\ud83d\udcb0\udcb0', 0x33fd4d9a]
];

describe('murmurHash3', () => {
  it('hashes every input like the server', () => {
    const actual = SERVER_VECTORS.map(([input]) => [input, murmurHash3(input)]);
    expect(actual).toEqual(SERVER_VECTORS);
  });

  /**
   * The server makes the same decision for these session IDs, so their buckets must never change.
   */
  it("matches the server's session sampling buckets", () => {
    const bucket = (sessionId: string): number =>
      murmurHash3(sessionId) % SESSION_SAMPLING_HASH_BUCKETS;
    expect(bucket('test-session-3')).toBe(1184);
    expect(bucket('test-session-1')).toBe(6018);
    expect(bucket('sëssion-ü')).toBe(8828);
  });

  it('honors the seed', () => {
    expect(murmurHash3('', 1)).toBe(0x514e28b7);
    expect(murmurHash3('hello', 1)).not.toBe(murmurHash3('hello', 0));
  });

  it('always returns an unsigned 32-bit integer', () => {
    for (let i = 0; i < 1000; i++) {
      const hash = murmurHash3(`session-${i}`);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe('utf8Encode', () => {
  it('encodes every Unicode code point exactly like TextEncoder', () => {
    let input = '';
    for (let codePoint = 0; codePoint <= 0x10ffff; codePoint++) {
      if (codePoint < 0xd800 || codePoint > 0xdfff) {
        input += String.fromCodePoint(codePoint);
      }
    }
    const expected = new TextEncoder().encode(input);
    const actual = utf8Encode(input);
    expect(actual.length).toBe(expected.length);
    expect(actual.findIndex((byte, i) => byte !== expected[i])).toBe(-1);
  });

  it('writes `?` for each unpaired surrogate', () => {
    // Two unpaired high surrogates.
    expect(Array.from(utf8Encode('a\ud800\ud800z'))).toEqual([
      0x61, 0x3f, 0x3f, 0x7a
    ]);
    // A leading low surrogate, a valid pair (U+1F4B0), and a trailing high surrogate.
    expect(Array.from(utf8Encode('\udc00\ud83d\udcb0\ud83d'))).toEqual([
      0x3f, 0xf0, 0x9f, 0x92, 0xb0, 0x3f
    ]);
  });
});
