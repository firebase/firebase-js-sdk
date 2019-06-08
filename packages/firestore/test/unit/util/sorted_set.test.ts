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
import { primitiveComparator } from '../../../src/util/misc';
import { SortedMap } from '../../../src/util/sorted_map';
import { SortedSet } from '../../../src/util/sorted_set';

import { expectSetToEqual } from '../../util/helpers';

describe('SortedSet', () => {
  it('keeps elements in the right order', () => {
    let set = new SortedSet<number>(primitiveComparator);

    set = set
      .add(4)
      .add(2)
      .add(-1)
      .add(0);

    expectSetToEqual(set, [-1, 0, 2, 4]);

    expect(set.first()).to.equal(-1);
    expect(set.last()).to.equal(4);

    expect(set.has(4)).to.equal(true);
    expect(set.has(2)).to.equal(true);
    expect(set.has(-1)).to.equal(true);
    expect(set.has(0)).to.equal(true);
  });

  it('adds and deletes elements', () => {
    let set = new SortedSet<number>(primitiveComparator)
      .add(5)
      .add(2)
      .add(1)
      .add(0)
      .delete(-1) // missing elem
      .delete(2);
    expectSetToEqual(set, [0, 1, 5]);

    set = set.delete(0);
    expectSetToEqual(set, [1, 5]);
  });

  it('updates elements', () => {
    let set = new SortedSet<{ key: number; value: string }>((left, right) =>
      primitiveComparator(left.key, right.key)
    );

    // This is a weird case where comparator returns 0 for two elements that
    // differ. Yet we should handle it correctly.

    set = set.add({ key: 1, value: 'old' });
    expectSetToEqual(set, [{ key: 1, value: 'old' }]);

    set = set.add({ key: 1, value: 'new' });
    expectSetToEqual(set, [{ key: 1, value: 'new' }]);
  });

  it('can iterate over all elements within a range', () => {
    const set = new SortedSet<number>(primitiveComparator)
      .add(0)
      .add(2)
      .add(5)
      .add(10)
      .add(12);

    const arr: number[] = [];
    set.forEachInRange([2, 10], elem => arr.push(elem));
    expect(arr).to.deep.equal([2, 5]);

    // Few cases that iterate over nothing.
    set.forEachInRange([2, 0], _elem => expect.fail());
    set.forEachInRange([-10, -5], _elem => expect.fail());
    set.forEachInRange([15, 18], _elem => expect.fail());
  });

  it('can iterate over all elements while condition', () => {
    const set = new SortedSet<number>(primitiveComparator)
      .add(0)
      .add(2)
      .add(5)
      .add(10)
      .add(12);

    let arr: number[] = [];
    const start = 2;
    set.forEachWhile(elem => {
      if (elem >= 10) {
        return false;
      } else {
        arr.push(elem);
        return true;
      }
    }, start);
    expect(arr).to.deep.equal([2, 5]);

    arr = [];
    set.forEachWhile(elem => {
      if (elem >= 10) {
        return false;
      } else {
        arr.push(elem);
        return true;
      }
    });
    expect(arr).to.deep.equal([0, 2, 5]);

    set.forEachWhile(_elem => {
      expect.fail();
      return true;
    }, 15);
  });

  it('can find element equal or greater to provided.', () => {
    const empty = new SortedSet<number>(primitiveComparator);
    const set = empty
      .add(0)
      .add(2)
      .add(5)
      .add(10)
      .add(12);

    expect(set.firstAfterOrEqual(2)).to.equal(2);
    expect(set.firstAfterOrEqual(3)).to.equal(5);
    expect(set.firstAfterOrEqual(13)).to.equal(null);
    expect(empty.firstAfterOrEqual(1)).to.equal(null);
  });

  it('can unionWith another set.', () => {
    const empty = new SortedSet<number>(primitiveComparator);
    const set = empty
      .add(0)
      .add(1)
      .add(2);
    const set2 = empty
      .add(2)
      .add(3)
      .add(4);
    const expected = empty
      .add(0)
      .add(1)
      .add(2)
      .add(3)
      .add(4);
    expect(set.unionWith(set2)).to.deep.equal(expected);
  });

  it('can build set from map keys.', () => {
    const empty = new SortedSet<number>(primitiveComparator);
    const map = new SortedMap<number, string>(primitiveComparator)
      .insert(0, 'zero')
      .insert(2, 'two')
      .insert(4, 'four');
    const set = SortedSet.fromMapKeys(map);
    expect(set).to.deep.equal(
      empty
        .add(0)
        .add(2)
        .add(4)
    );
  });

  it('returns indexes of elements', () => {
    const set = new SortedSet<number>(primitiveComparator)
      .add(-1)
      .add(5)
      .add(1)
      .add(2)
      .add(0);

    expect(set.indexOf(-1)).to.equal(0);
    expect(set.indexOf(0)).to.equal(1);
    expect(set.indexOf(1)).to.equal(2);
    expect(set.indexOf(2)).to.equal(3);
    expect(set.indexOf(3)).to.equal(-1);
    expect(set.indexOf(4)).to.equal(-1);
    expect(set.indexOf(5)).to.equal(4);
  });
});
