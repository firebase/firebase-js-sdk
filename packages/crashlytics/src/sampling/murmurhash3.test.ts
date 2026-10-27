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

import { murmurHash3 } from './murmurhash3';
import { SESSION_SAMPLING_HASH_BUCKETS } from '../constants';

describe('murmurHash3', () => {
  it('matches the reference MurmurHash3 x86_32 vectors (seed 0)', () => {
    expect(murmurHash3('')).toBe(0);
    expect(murmurHash3('hello')).toBe(0x248bfa47);
    expect(murmurHash3('The quick brown fox jumps over the lazy dog')).toBe(
      0x2e4ff723
    );
  });

  it('honors the seed', () => {
    expect(murmurHash3('', 1)).toBe(0x514e28b7);
    expect(murmurHash3('hello', 1)).not.toBe(murmurHash3('hello', 0));
  });

  it('hashes the UTF-8 encoding of the input', () => {
    // "é" is 2 bytes in UTF-8 (0xC3 0xA9); the hash must differ from the Latin-1 single byte.
    expect(murmurHash3('é')).toBe(murmurHash3('\u00e9'));
    expect(murmurHash3('é')).not.toBe(murmurHash3('\u00c3\u00a9'));
    // Surrogate pairs (4-byte UTF-8) must not throw and must be stable.
    expect(murmurHash3('😀')).toBe(murmurHash3('😀'));
  });

  it('covers every tail length (0-3 trailing bytes)', () => {
    const hashes = new Set(['a', 'ab', 'abc', 'abcd', 'abcde'].map(murmurHash3));
    expect(hashes.size).toBe(5);
  });

  it('always returns an unsigned 32-bit integer', () => {
    for (let i = 0; i < 1000; i++) {
      const hash = murmurHash3(`session-${i}`);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
    }
  });

  /**
   * These session IDs and buckets are the test vectors of the backend's `SessionSamplingTest`
   * (google3/javatests/com/google/firebase/telemetry/common/sampling/SessionSamplingTest.kt),
   * which re-evaluates the same decision server-side. They must never change independently.
   */
  it('matches the backend session sampling buckets', () => {
    const bucket = (sessionId: string): number =>
      murmurHash3(sessionId) % SESSION_SAMPLING_HASH_BUCKETS;
    expect(bucket('test-session-3')).toBe(1184);
    expect(bucket('test-session-1')).toBe(6018);
    expect(bucket('sëssion-ü')).toBe(8828);
  });
});
