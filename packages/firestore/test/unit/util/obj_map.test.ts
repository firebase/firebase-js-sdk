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

import { ObjectMap } from '../../../src/util/obj_map';

class TestKey {
  constructor(
    private id: number,
    private equalityKey: number
  ) {}

  get mapKey(): string {
    return 'id:' + this.id;
  }

  isEqual(other: TestKey): boolean {
    return this.equalityKey === other.equalityKey;
  }
}

describe('ObjectMap', () => {
  it('can get/put/delete values', () => {
    const map = new ObjectMap<TestKey, string>(
      o => o.mapKey,
      (l, r) => l.isEqual(r)
    );
    const k1 = new TestKey(4, 4);
    const k2 = new TestKey(5, 5);
    const k3 = new TestKey(6, 6);
    const k4 = new TestKey(-12354, -12354);
    const k5 = new TestKey(-12354, -12354);
    expect(map.get(k1)).toBe(undefined);
    expect(map.get(k2)).toBe(undefined);
    expect(map.size()).toBe(0);
    map.set(k1, 'fob');
    expect(map.size()).toBe(1);
    expect(map.get(k1)).toBe('fob');
    expect(map.get(k2)).toBe(undefined);
    map.set(k1, 'foo');
    expect(map.size()).toBe(1);
    expect(map.get(k1)).toBe('foo');
    expect(map.get(k2)).toBe(undefined);
    map.set(k2, 'bar');
    expect(map.size()).toBe(2);
    expect(map.get(k1)).toBe('foo');
    expect(map.get(k2)).toBe('bar');
    expect(map.delete(k3)).toBe(false);
    expect(map.size()).toBe(2);
    expect(map.get(k1)).toBe('foo');
    expect(map.get(k2)).toBe('bar');
    expect(map.delete(k1)).toBe(true);
    expect(map.size()).toBe(1);
    expect(map.get(k1)).toBe(undefined);
    expect(map.get(k2)).toBe('bar');
    expect(map.delete(k2)).toBe(true);
    expect(map.size()).toBe(0);
    expect(map.get(k1)).toBe(undefined);
    expect(map.get(k2)).toBe(undefined);
    map.set(k4, 'baz');
    expect(map.size()).toBe(1);
    expect(map.get(k4)).toBe('baz');
    expect(map.get(k5)).toBe('baz');
    map.set(k5, 'boo');
    expect(map.size()).toBe(1);
    expect(map.get(k4)).toBe('boo');
    expect(map.get(k5)).toBe('boo');
    expect(map.delete(k5)).toBe(true);
    expect(map.size()).toBe(0);
    expect(map.get(k4)).toBe(undefined);
    expect(map.get(k5)).toBe(undefined);
  });

  it('can handle collisions', () => {
    const map = new ObjectMap<TestKey, string>(
      o => o.mapKey,
      (l, r) => l.isEqual(r)
    );
    // These all have the same ids, but are different entities.
    const k1 = new TestKey(4, 4);
    const k2 = new TestKey(4, 5);
    const k3 = new TestKey(4, 6);

    expect(map.size()).toBe(0);
    expect(map.get(k1)).toBe(undefined);
    expect(map.get(k2)).toBe(undefined);
    expect(map.get(k3)).toBe(undefined);

    map.set(k1, 'foo');

    expect(map.size()).toBe(1);
    expect(map.get(k1)).toBe('foo');
    expect(map.get(k2)).toBe(undefined);
    expect(map.get(k3)).toBe(undefined);

    map.set(k1, 'bar');

    expect(map.size()).toBe(1);
    expect(map.get(k1)).toBe('bar');
    expect(map.get(k2)).toBe(undefined);
    expect(map.get(k3)).toBe(undefined);

    map.set(k2, 'baz');

    expect(map.size()).toBe(2);
    expect(map.get(k1)).toBe('bar');
    expect(map.get(k2)).toBe('baz');
    expect(map.get(k3)).toBe(undefined);

    expect(map.delete(k3)).toBe(false);
    expect(map.size()).toBe(2);
    expect(map.delete(k2)).toBe(true);
    expect(map.size()).toBe(1);

    expect(map.get(k1)).toBe('bar');
    expect(map.get(k2)).toBe(undefined);
    expect(map.get(k3)).toBe(undefined);

    expect(map.delete(k1)).toBe(true);
    expect(map.size()).toBe(0);

    expect(map.get(k1)).toBe(undefined);
    expect(map.get(k2)).toBe(undefined);
    expect(map.get(k3)).toBe(undefined);
  });
});
