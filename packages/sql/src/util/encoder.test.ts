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

import { expect } from 'vitest';

import { deepSortKeysForObj } from './encoder';

describe('deepSortKeysForObj', () => {
  it('returns primitives, null, and undefined unchanged', () => {
    expect(deepSortKeysForObj(null)).toBeNull();
    expect(deepSortKeysForObj(undefined)).toBeUndefined();
    expect(deepSortKeysForObj(123)).toBe(123);
    expect(deepSortKeysForObj('test')).toBe('test');
    expect(deepSortKeysForObj(true)).toBe(true);
  });

  it('recursively sorts nested object keys across multiple levels', () => {
    const input = {
      z: { y: 1, x: 2 },
      a: { c: 3, b: { e: 5, d: 4 } }
    };
    const sorted = deepSortKeysForObj(input) as Record<string, unknown>;
    expect(Object.keys(sorted)).toEqual(['a', 'z']);
    expect(Object.keys(sorted.a as Record<string, unknown>)).toEqual([
      'b',
      'c'
    ]);
    expect(
      Object.keys(
        (sorted.a as Record<string, unknown>).b as Record<string, unknown>
      )
    ).toEqual(['d', 'e']);
    expect(Object.keys(sorted.z as Record<string, unknown>)).toEqual([
      'x',
      'y'
    ]);
  });

  it('recursively sorts objects within arrays', () => {
    const input = [
      { z: 1, a: 2 },
      { y: 3, x: 4 }
    ];
    const sorted = deepSortKeysForObj(input) as Array<Record<string, unknown>>;
    expect(Object.keys(sorted[0])).toEqual(['a', 'z']);
    expect(Object.keys(sorted[1])).toEqual(['x', 'y']);
  });

  it('produces identical JSON strings regardless of key insertion order', () => {
    const obj1 = {
      service: 'orders',
      location: 'us-central1',
      headers: { 'X-B': '2', 'X-A': '1' }
    };
    const obj2 = {
      headers: { 'X-A': '1', 'X-B': '2' },
      location: 'us-central1',
      service: 'orders'
    };

    const json1 = JSON.stringify(deepSortKeysForObj(obj1));
    const json2 = JSON.stringify(deepSortKeysForObj(obj2));
    expect(json1).toBe(json2);
  });

  it('does not pollute Object.prototype when input contains prototype keys', () => {
    const maliciousPayload = JSON.parse(
      '{"__proto__":{"polluted":true},"a":1}'
    );
    const sorted = deepSortKeysForObj(maliciousPayload);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(JSON.stringify(sorted)).toBe(
      '{"__proto__":{"polluted":true},"a":1}'
    );
  });
});
