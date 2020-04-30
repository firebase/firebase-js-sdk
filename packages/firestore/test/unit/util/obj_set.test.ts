/**
 * @license
 * Copyright 2017 Google Inc.
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
import { ObjectSet } from '../../../src/util/obj_set';

class TestEntry {
  constructor(private id: number, private equalityKey: number) {}

  get mapKey(): string {
    return 'id:' + this.id;
  }

  isEqual(other: TestEntry): boolean {
    return this.equalityKey === other.equalityKey;
  }
}

describe('ObjectSet', () => {
  it('can add/delete values', () => {
    const set = new ObjectSet<TestEntry>(o => o.mapKey);
    const entry = new TestEntry(1, 1);
    expect(set.has(entry)).to.be.false;
    set.add(entry);
    expect(set.has(entry)).to.be.true;
    set.delete(entry);
    expect(set.has(entry)).to.be.false;
  });

  it('can handle collisions', () => {
    const map = new ObjectSet<TestEntry>(o => o.mapKey);
    // These all have the same ids, but are different entities.
    const e1 = new TestEntry(1, 1);
    const e2 = new TestEntry(1, 2);

    expect(map.has(e1)).to.be.false;
    expect(map.has(e2)).to.be.false;

    map.add(e1);

    expect(map.has(e1)).to.be.true;
    expect(map.has(e2)).to.be.false;

    map.add(e2);

    expect(map.has(e1)).to.be.true;
    expect(map.has(e2)).to.be.true;

    map.delete(e1);

    expect(map.has(e1)).to.be.false;
    expect(map.has(e2)).to.be.true;
  });
});
