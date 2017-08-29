/**
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
import { SortedMap, LLRBNode } from '../src/core/util/SortedMap';
import { shuffle } from './helpers/util';

// Many of these were adapted from the mugs source code.
// http://mads379.github.com/mugs/
describe('SortedMap Tests', function() {
  const defaultCmp = function(a, b) {
    if (a === b) {
      return 0;
    } else if (a < b) {
      return -1;
    } else {
      return 1;
    }
  };

  it('Create node', function() {
    const map = new SortedMap(defaultCmp).insert('key', 'value');
    expect((map as any).root_.left.isEmpty()).to.equal(true);
    expect((map as any).root_.right.isEmpty()).to.equal(true);
  });

  it('You can search a map for a specific key', function() {
    const map = new SortedMap(defaultCmp).insert(1, 1).insert(2, 2);
    expect(map.get(1)).to.equal(1);
    expect(map.get(2)).to.equal(2);
    expect(map.get(3)).to.equal(null);
  });

  it('You can insert a new key/value pair into the tree', function() {
    const map = new SortedMap(defaultCmp).insert(1, 1).insert(2, 2);
    expect((map as any).root_.key).to.equal(2);
    expect((map as any).root_.left.key).to.equal(1);
  });

  it('You can remove a key/value pair from the map', function() {
    const map = new SortedMap(defaultCmp).insert(1, 1).insert(2, 2);
    const newMap = map.remove(1);
    expect(newMap.get(2)).to.equal(2);
    expect(newMap.get(1)).to.equal(null);
  });

  it('More removals', function() {
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
    expect(m3.count()).to.equal(9);
    expect(m3.get(1)).to.equal(null);
    expect(m3.get(3)).to.equal(null);
    expect(m3.get(7)).to.equal(null);
    expect(m3.get(20)).to.equal(20);
  });

  it('Removal bug', function() {
    const map = new SortedMap(defaultCmp)
      .insert(1, 1)
      .insert(2, 2)
      .insert(3, 3);

    const m1 = map.remove(2);
    expect(m1.get(1)).to.equal(1);
    expect(m1.get(3)).to.equal(3);
  });

  it('Test increasing', function() {
    const total = 100;
    let item;
    let map = new SortedMap(defaultCmp).insert(1, 1);
    for (item = 2; item < total; item++) {
      map = map.insert(item, item);
    }
    expect((map as any).root_.checkMaxDepth_()).to.equal(true);
    for (item = 2; item < total; item++) {
      map = map.remove(item);
    }
    expect((map as any).root_.checkMaxDepth_()).to.equal(true);
  });

  it('The structure should be valid after insertion (1)', function() {
    const map = new SortedMap(defaultCmp)
      .insert(1, 1)
      .insert(2, 2)
      .insert(3, 3);

    expect((map as any).root_.key).to.equal(2);
    expect((map as any).root_.left.key).to.equal(1);
    expect((map as any).root_.right.key).to.equal(3);
  });

  it('The structure should be valid after insertion (2)', function() {
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

    expect(map.count()).to.equal(12);
    expect((map as any).root_.checkMaxDepth_()).to.equal(true);
  });

  it('Rotate left leaves the tree in a valid state', function() {
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
    expect(node2.count()).to.equal(5);
    expect(node2.checkMaxDepth_()).to.equal(true);
  });

  it('Rotate right leaves the tree in a valid state', function() {
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
    expect(node2.count()).to.equal(5);
    expect(node2.key).to.equal(4);
    expect(node2.left.key).to.equal(2);
    expect(node2.right.key).to.equal(7);
    expect(node2.right.left.key).to.equal(5);
    expect(node2.right.right.key).to.equal(8);
  });

  it('The structure should be valid after insertion (3)', function() {
    const map = new SortedMap(defaultCmp)
      .insert(1, 1)
      .insert(50, 50)
      .insert(3, 3)
      .insert(4, 4)
      .insert(7, 7)
      .insert(9, 9);

    expect(map.count()).to.equal(6);
    expect((map as any).root_.checkMaxDepth_()).to.equal(true);

    const m2 = map.insert(20, 20).insert(18, 18).insert(2, 2);

    expect(m2.count()).to.equal(9);
    expect((m2 as any).root_.checkMaxDepth_()).to.equal(true);

    const m3 = m2.insert(71, 71).insert(42, 42).insert(88, 88);

    expect(m3.count()).to.equal(12);
    expect((m3 as any).root_.checkMaxDepth_()).to.equal(true);
  });

  it('you can overwrite a value', function() {
    const map = new SortedMap(defaultCmp).insert(10, 10).insert(10, 8);
    expect(map.get(10)).to.equal(8);
  });

  it('removing the last element returns an empty map', function() {
    const map = new SortedMap(defaultCmp).insert(10, 10).remove(10);
    expect(map.isEmpty()).to.equal(true);
  });

  it('empty .get()', function() {
    const empty = new SortedMap(defaultCmp);
    expect(empty.get('something')).to.equal(null);
  });

  it('empty .count()', function() {
    const empty = new SortedMap(defaultCmp);
    expect(empty.count()).to.equal(0);
  });

  it('empty .remove()', function() {
    const empty = new SortedMap(defaultCmp);
    expect(empty.remove('something').count()).to.equal(0);
  });

  it('.reverseTraversal() works.', function() {
    const map = new SortedMap(defaultCmp)
      .insert(1, 1)
      .insert(5, 5)
      .insert(3, 3)
      .insert(2, 2)
      .insert(4, 4);
    let next = 5;
    map.reverseTraversal(function(key, value) {
      expect(key).to.equal(next);
      next--;
    });
    expect(next).to.equal(0);
  });

  it('insertion and removal of 100 items in random order.', function() {
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
      expect((map as any).root_.checkMaxDepth_()).to.equal(true);
    }
    expect(map.count()).to.equal(N);

    // Ensure order is correct.
    let next = 0;
    map.inorderTraversal(function(key, value) {
      expect(key).to.equal(next);
      expect(value).to.equal(next);
      next++;
    });
    expect(next).to.equal(N);

    for (let i = 0; i < N; i++) {
      expect((map as any).root_.checkMaxDepth_()).to.equal(true);
      map = map.remove(toRemove[i]);
    }
    expect(map.count()).to.equal(0);
  });

  // A little perf test for convenient benchmarking.
  xit('Perf', function() {
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

  xit('Perf: Insertion and removal with various # of items.', function() {
    const verifyTraversal = function(map, max) {
      let next = 0;
      map.inorderTraversal(function(key, value) {
        expect(key).to.equal(next);
        expect(value).to.equal(next);
        next++;
      });
      expect(next).to.equal(max);
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

  xit(
    'Perf: Comparison with {}: Insertion and removal with various # of items.',
    function() {
      const verifyTraversal = function(tree, max) {
        const keys = [];
        for (const k in tree) keys.push(k);

        keys.sort();
        expect(keys.length).to.equal(max);
        for (let i = 0; i < max; i++) expect(tree[i]).to.equal(i);
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
    }
  );

  it('SortedMapIterator empty test.', function() {
    const map = new SortedMap(defaultCmp);
    const iterator = map.getIterator();
    expect(iterator.getNext()).to.equal(null);
  });

  it('SortedMapIterator test with 10 items.', function() {
    const items = [];
    for (let i = 0; i < 10; i++) items.push(i);
    shuffle(items);

    let map = new SortedMap(defaultCmp);
    for (let i = 0; i < 10; i++) map = map.insert(items[i], items[i]);

    const iterator = map.getIterator();
    let n,
      expected = 0;
    while ((n = iterator.getNext()) !== null) {
      expect(n.key).to.equal(expected);
      expect(n.value).to.equal(expected);
      expected++;
    }
    expect(expected).to.equal(10);
  });

  it('SortedMap.getPredecessorKey works.', function() {
    const map = new SortedMap(defaultCmp)
      .insert(1, 1)
      .insert(50, 50)
      .insert(3, 3)
      .insert(4, 4)
      .insert(7, 7)
      .insert(9, 9);

    expect(map.getPredecessorKey(1)).to.equal(null);
    expect(map.getPredecessorKey(3)).to.equal(1);
    expect(map.getPredecessorKey(4)).to.equal(3);
    expect(map.getPredecessorKey(7)).to.equal(4);
    expect(map.getPredecessorKey(9)).to.equal(7);
    expect(map.getPredecessorKey(50)).to.equal(9);
  });
});
