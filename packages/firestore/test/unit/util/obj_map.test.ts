/**
 * @license
 * Copyright 2017 Google LLC
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

import { expect } from 'chai';

import { ObjectMap } from '../../../src/util/obj_map';

class TestKey {
  constructor(private id: number, private equalityKey: number) {}

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
    expect(map.get(k1)).to.equal(undefined);
    expect(map.get(k2)).to.equal(undefined);
    map.set(k1, 'fob');
    expect(map.get(k1)).to.equal('fob');
    expect(map.get(k2)).to.equal(undefined);
    map.set(k1, 'foo');
    expect(map.get(k1)).to.equal('foo');
    expect(map.get(k2)).to.equal(undefined);
    map.set(k2, 'bar');
    expect(map.get(k1)).to.equal('foo');
    expect(map.get(k2)).to.equal('bar');
    expect(map.delete(k3)).to.equal(false);
    expect(map.get(k1)).to.equal('foo');
    expect(map.get(k2)).to.equal('bar');
    expect(map.delete(k1)).to.equal(true);
    expect(map.get(k1)).to.equal(undefined);
    expect(map.get(k2)).to.equal('bar');
    expect(map.delete(k2)).to.equal(true);
    expect(map.get(k1)).to.equal(undefined);
    expect(map.get(k2)).to.equal(undefined);
    map.set(k4, 'baz');
    expect(map.get(k4)).to.equal('baz');
    expect(map.get(k5)).to.equal('baz');
    map.set(k5, 'boo');
    expect(map.get(k4)).to.equal('boo');
    expect(map.get(k5)).to.equal('boo');
    expect(map.delete(k5)).to.equal(true);
    expect(map.get(k4)).to.equal(undefined);
    expect(map.get(k5)).to.equal(undefined);
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

    expect(map.get(k1)).to.equal(undefined);
    expect(map.get(k2)).to.equal(undefined);
    expect(map.get(k3)).to.equal(undefined);

    map.set(k1, 'foo');

    expect(map.get(k1)).to.equal('foo');
    expect(map.get(k2)).to.equal(undefined);
    expect(map.get(k3)).to.equal(undefined);

    map.set(k1, 'bar');

    expect(map.get(k1)).to.equal('bar');
    expect(map.get(k2)).to.equal(undefined);
    expect(map.get(k3)).to.equal(undefined);

    map.set(k2, 'baz');

    expect(map.get(k1)).to.equal('bar');
    expect(map.get(k2)).to.equal('baz');
    expect(map.get(k3)).to.equal(undefined);

    expect(map.delete(k3)).to.equal(false);
    expect(map.delete(k2)).to.equal(true);

    expect(map.get(k1)).to.equal('bar');
    expect(map.get(k2)).to.equal(undefined);
    expect(map.get(k3)).to.equal(undefined);

    expect(map.delete(k1)).to.equal(true);

    expect(map.get(k1)).to.equal(undefined);
    expect(map.get(k2)).to.equal(undefined);
    expect(map.get(k3)).to.equal(undefined);
  });
});
