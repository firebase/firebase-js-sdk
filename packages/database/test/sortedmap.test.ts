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

import { SortedMap, LLRBNode } from '../src/core/util/SortedMap';

import { shuffle } from './helpers/util';

// Many of these were adapted from the mugs source code.
// http://mads379.github.com/mugs/
describe('SortedMap Tests', () => {
  const defaultCmp = function (a, b) {
    if (a === b) {
      return 0;
    } else if (a < b) {
      return -1;
    } else {
      return 1;
    }
  };

  it('Create node', () => {
    const map = new SortedMap(defaultCmp).insert('key', 'value');
    expect((map as any).root_.left.isEmpty()).toBe(true);
    expect((map as any).root_.right.isEmpty()).toBe(true);
  });

  it('You can search a map for a specific key', () => {
    const map = new SortedMap(defaultCmp).insert(1, 1).insert(2, 2);
    expect(map.get(1)).toBe(1);
    expect(map.get(2)).toBe(2);
    expect(map.get(3)).toBe(null);
  });

  it('You can insert a new key/value pair into the tree', () => {
    const map = new SortedMap(defaultCmp).insert(1, 1).insert(2, 2);
    expect((map as any).root_.key).toBe(2);
    expect((map as any).root_.left.key).toBe(1);
  });

  it('You can remove a key/value pair from the map', () => {
    const map = new SortedMap(defaultCmp).insert(1, 1).insert(2, 2);
    const newMap = map.remove(1);
    expect(newMap.get(2)).toBe(2);
    expect(newMap.get(1)).toBe(null);
  });

  it('More removals', () => {
    const map = new SortedMap(defaultCmp)
      .insert(1, 1)
      .insert(50, 50)
      .insert(3, 3)
      .insert(4, 4)
      .insert(7, 7)
      .insert(9, 9)
      .insert(20, 20)
      .insert(18, 18)
      .insert(2, 2)
      .insert(71, 71)
      .insert(42, 42)
      .insert(88, 88);

    const m1 = map.remove(7);
    const m2 = m1.remove(3);
    const m3 = m2.remove(1);
    expect(m3.count()).toBe(9);
    expect(m3.get(1)).toBe(null);
    expect(m3.get(3)).toBe(null);
    expect(m3.get(7)).toBe(null);
    expect(m3.get(20)).toBe(20);
  });

  it('Removal bug', () => {
    const map = new SortedMap(defaultCmp)
      .insert(1, 1)
      .insert(2, 2)
      .insert(3, 3);

    const m1 = map.remove(2);
    expect(m1.get(1)).toBe(1);
    expect(m1.get(3)).toBe(3);
  });

  it('Test increasing', () => {
    const total = 100;
    let item;
    let map = new SortedMap(defaultCmp).insert(1, 1);
    for (item = 2; item < total; item++) {
      map = map.insert(item, item);
    }
    expect((map as any).root_.checkMaxDepth_()).toBe(true);
    for (item = 2; item < total; item++) {
      map = map.remove(item);
    }
    expect((map as any).root_.checkMaxDepth_()).toBe(true);
  });

  it('The structure should be valid after insertion (1)', () => {
    const map = new SortedMap(defaultCmp)
      .insert(1, 1)
      .insert(2, 2)
      .insert(3, 3);

    expect((map as any).root_.key).toBe(2);
    expect((map as any).root_.left.key).toBe(1);
    expect((map as any).root_.right.key).toBe(3);
  });

  it('The structure should be valid after insertion (2)', () => {
    const map = new SortedMap(defaultCmp)
      .insert(1, 1)
      .insert(2, 2)
      .insert(3, 3)
      .insert(4, 4)
      .insert(5, 5)
      .insert(6, 6)
      .insert(7, 7)
      .insert(8, 8)
      .insert(9, 9)
      .insert(10, 10)
      .insert(11, 11)
      .insert(12, 12);

    expect(map.count()).toBe(12);
    expect((map as any).root_.checkMaxDepth_()).toBe(true);
  });

  it('Rotate left leaves the tree in a valid state', () => {
    const node = new LLRBNode(
      4,
      4,
      false,
      new LLRBNode(2, 2, false, null, null),
      new LLRBNode(
        7,
        7,
        true,
        new LLRBNode(5, 5, false, null, null),
        new LLRBNode(8, 8, false, null, null)
      )
    );

    const node2 = (node as any).rotateLeft_();
    expect(node2.count()).toBe(5);
    expect(node2.checkMaxDepth_()).toBe(true);
  });

  it('Rotate right leaves the tree in a valid state', () => {
    const node = new LLRBNode(
      7,
      7,
      false,
      new LLRBNode(
        4,
        4,
        true,
        new LLRBNode(2, 2, false, null, null),
        new LLRBNode(5, 5, false, null, null)
      ),
      new LLRBNode(8, 8, false, null, null)
    );

    const node2 = (node as any).rotateRight_();
    expect(node2.count()).toBe(5);
    expect(node2.key).toBe(4);
    expect(node2.left.key).toBe(2);
    expect(node2.right.key).toBe(7);
    expect(node2.right.left.key).toBe(5);
    expect(node2.right.right.key).toBe(8);
  });

  it('The structure should be valid after insertion (3)', () => {
    const map = new SortedMap(defaultCmp)
      .insert(1, 1)
      .insert(50, 50)
      .insert(3, 3)
      .insert(4, 4)
      .insert(7, 7)
      .insert(9, 9);

    expect(map.count()).toBe(6);
    expect((map as any).root_.checkMaxDepth_()).toBe(true);

    const m2 = map.insert(20, 20).insert(18, 18).insert(2, 2);

    expect(m2.count()).toBe(9);
    expect((m2 as any).root_.checkMaxDepth_()).toBe(true);

    const m3 = m2.insert(71, 71).insert(42, 42).insert(88, 88);

    expect(m3.count()).toBe(12);
    expect((m3 as any).root_.checkMaxDepth_()).toBe(true);
  });

  it('you can overwrite a value', () => {
    const map = new SortedMap(defaultCmp).insert(10, 10).insert(10, 8);
    expect(map.get(10)).toBe(8);
  });

  it('removing the last element returns an empty map', () => {
    const map = new SortedMap(defaultCmp).insert(10, 10).remove(10);
    expect(map.isEmpty()).toBe(true);
  });

  it('empty .get()', () => {
    const empty = new SortedMap(defaultCmp);
    expect(empty.get('something')).toBe(null);
  });

  it('empty .count()', () => {
    const empty = new SortedMap(defaultCmp);
    expect(empty.count()).toBe(0);
  });

  it('empty .remove()', () => {
    const empty = new SortedMap(defaultCmp);
    expect(empty.remove('something').count()).toBe(0);
  });

  it('.reverseTraversal() works.', () => {
    const map = new SortedMap(defaultCmp)
      .insert(1, 1)
      .insert(5, 5)
      .insert(3, 3)
      .insert(2, 2)
      .insert(4, 4);
    let next = 5;
    map.reverseTraversal((key, value) => {
      expect(key).toBe(next);
      next--;
    });
    expect(next).toBe(0);
  });

  it('insertion and removal of 100 items in random order.', () => {
    const N = 100;
    const toInsert = [],
      toRemove = [];
    for (let i = 0; i < N; i++) {
      toInsert.push(i);
      toRemove.push(i);
    }

    shuffle(toInsert);
    shuffle(toRemove);

    let map = new SortedMap(defaultCmp);

    for (let i = 0; i < N; i++) {
      map = map.insert(toInsert[i], toInsert[i]);
      expect((map as any).root_.checkMaxDepth_()).toBe(true);
    }
    expect(map.count()).toBe(N);

    // Ensure order is correct.
    let next = 0;
    map.inorderTraversal((key, value) => {
      expect(key).toBe(next);
      expect(value).toBe(next);
      next++;
    });
    expect(next).toBe(N);

    for (let i = 0; i < N; i++) {
      expect((map as any).root_.checkMaxDepth_()).toBe(true);
      map = map.remove(toRemove[i]);
    }
    expect(map.count()).toBe(0);
  });

  // A little perf test for convenient benchmarking.
  it.skip('Perf', () => {
    for (let j = 0; j < 5; j++) {
      let map = new SortedMap(defaultCmp);
      const start = new Date().getTime();
      for (let i = 0; i < 50000; i++) {
        map = map.insert(i, i);
      }

      for (let i = 0; i < 50000; i++) {
        map = map.remove(i);
      }
      const end = new Date().getTime();
      // console.log(end-start);
    }
  });

  it.skip('Perf: Insertion and removal with various # of items.', () => {
    const verifyTraversal = function (map, max) {
      let next = 0;
      map.inorderTraversal((key, value) => {
        expect(key).toBe(next);
        expect(value).toBe(next);
        next++;
      });
      expect(next).toBe(max);
    };

    for (let N = 10; N <= 100000; N *= 10) {
      const toInsert = [],
        toRemove = [];
      for (let i = 0; i < N; i++) {
        toInsert.push(i);
        toRemove.push(i);
      }

      shuffle(toInsert);
      shuffle(toRemove);

      let map = new SortedMap(defaultCmp);

      const start = new Date().getTime();
      for (let i = 0; i < N; i++) {
        map = map.insert(toInsert[i], toInsert[i]);
      }

      // Ensure order is correct.
      verifyTraversal(map, N);

      for (let i = 0; i < N; i++) {
        map = map.remove(toRemove[i]);
      }

      const elapsed = new Date().getTime() - start;
      // console.log(N + ": " +elapsed);
    }
  });

  it.skip('Perf: Comparison with {}: Insertion and removal with various # of items.', () => {
    const verifyTraversal = function (tree, max) {
      const keys = [];
      for (const k of Object.keys(tree)) {
        keys.push(k);
      }

      keys.sort();
      expect(keys.length).toBe(max);
      for (let i = 0; i < max; i++) {
        expect(tree[i]).toBe(i);
      }
    };

    for (let N = 10; N <= 100000; N *= 10) {
      const toInsert = [],
        toRemove = [];
      for (let i = 0; i < N; i++) {
        toInsert.push(i);
        toRemove.push(i);
      }

      shuffle(toInsert);
      shuffle(toRemove);

      const tree = {};

      const start = new Date().getTime();
      for (let i = 0; i < N; i++) {
        tree[i] = i;
      }

      // Ensure order is correct.
      //verifyTraversal(tree, N);

      for (let i = 0; i < N; i++) {
        delete tree[i];
      }

      const elapsed = new Date().getTime() - start;
      // console.log(N + ": " +elapsed);
    }
  });

  it('SortedMapIterator empty test.', () => {
    const map = new SortedMap(defaultCmp);
    const iterator = map.getIterator();
    expect(iterator.getNext()).toBe(null);
  });

  it('SortedMapIterator test with 10 items.', () => {
    const items = [];
    for (let i = 0; i < 10; i++) {
      items.push(i);
    }
    shuffle(items);

    let map = new SortedMap(defaultCmp);
    for (let i = 0; i < 10; i++) {
      map = map.insert(items[i], items[i]);
    }

    const iterator = map.getIterator();
    let n = iterator.getNext() as any,
      expected = 0;
    while (n !== null) {
      expect(n.key).toBe(expected);
      expect(n.value).toBe(expected);
      expected++;
      n = iterator.getNext();
    }
    expect(expected).toBe(10);
  });

  it('SortedMap.getPredecessorKey works.', () => {
    const map = new SortedMap(defaultCmp)
      .insert(1, 1)
      .insert(50, 50)
      .insert(3, 3)
      .insert(4, 4)
      .insert(7, 7)
      .insert(9, 9);

    expect(map.getPredecessorKey(1)).toBe(null);
    expect(map.getPredecessorKey(3)).toBe(1);
    expect(map.getPredecessorKey(4)).toBe(3);
    expect(map.getPredecessorKey(7)).toBe(4);
    expect(map.getPredecessorKey(9)).toBe(7);
    expect(map.getPredecessorKey(50)).toBe(9);
  });
});
