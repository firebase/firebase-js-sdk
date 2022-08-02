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

import { EventAccumulator } from '../../database/test/helpers/EventAccumulator';
import { Reference } from '../src/api/Reference';

import { eventTestHelper } from './helpers/events';
import { getRandomNode } from './helpers/util';

describe('Order Tests', () => {
  // Kind of a hack, but a lot of these tests are written such that they'll fail if run before we're
  // connected to Firebase because they do a bunch of sets and then a listen and assume that they'll
  // arrive in that order.  But if we aren't connected yet, the "reconnection" code will send them
  // in the opposite order.
  beforeEach(() => {
    return new Promise<void>(resolve => {
      const ref = getRandomNode() as Reference;
      let connected = false;
      ref.root.child('.info/connected').on('value', s => {
        connected = s.val() === true;
        if (connected) {
          resolve();
        }
      });
    });
  });

  it('Push a bunch of data, enumerate it back; ensure order is correct.', async () => {
    const node = getRandomNode() as Reference;
    for (let i = 0; i < 10; i++) {
      node.push().set(i);
    }

    const snap = await node.once('value');

    let expected = 0;
    snap.forEach(child => {
      expect(child.val()).to.equal(expected);
      expected++;
    });
    expect(expected).to.equal(10);
  });

  it('Push a bunch of paths, then write; ensure order is correct.', async () => {
    const node = getRandomNode() as Reference;
    const paths = [];
    // Push them first to try to call push() multiple times in the same ms.
    for (let i = 0; i < 20; i++) {
      paths[i] = node.push();
    }
    for (let i = 0; i < 20; i++) {
      paths[i].set(i);
    }

    const snap = await node.once('value');

    let expected = 0;
    snap.forEach(child => {
      expect(child.val()).to.equal(expected);
      expected++;
    });
    expect(expected).to.equal(20);
  });

  it('Push a bunch of data, reconnect, read it back; ensure order is chronological.', async () => {
    const nodePair = getRandomNode(2) as Reference[];
    let expected;

    const node = nodePair[0];
    let nodesSet = 0;
    for (let i = 0; i < 10; i++) {
      node.push().set(i, () => {
        ++nodesSet;
      });
    }

    // read it back locally and make sure it's correct.
    const snap = await node.once('value');

    expected = 0;
    snap.forEach(child => {
      expect(child.val()).to.equal(expected);
      expected++;
    });
    expect(expected).to.equal(10);

    // read it back
    let readSnap;
    const ea = new EventAccumulator(() => readSnap);
    nodePair[1].on('value', snap => {
      readSnap = snap;
      ea.addEvent();
    });

    await ea.promise;

    expected = 0;
    readSnap.forEach(child => {
      expect(child.val()).to.equal(expected);
      expected++;
    });
    expect(expected).to.equal(10);
  });

  it('Push a bunch of data with explicit priority, reconnect, read it back; ensure order is correct.', async () => {
    const nodePair = getRandomNode(2) as Reference[];
    let expected;

    const node = nodePair[0];
    let nodesSet = 0;
    for (let i = 0; i < 10; i++) {
      const pushedNode = node.push();
      pushedNode.setWithPriority(i, 10 - i, () => {
        ++nodesSet;
      });
    }

    // read it back locally and make sure it's correct.
    const snap = await node.once('value');
    expected = 9;
    snap.forEach(child => {
      expect(child.val()).to.equal(expected);
      expected--;
    });
    expect(expected).to.equal(-1);

    // local SETs are visible immediately, but the second node is in a separate repo, so it is considered remote.
    // We need confirmation that the server has gotten all the data before we can expect to receive it all

    // read it back
    let readSnap;
    const ea = new EventAccumulator(() => readSnap);
    nodePair[1].on('value', snap => {
      readSnap = snap;
      ea.addEvent();
    });
    await ea.promise;

    expected = 9;
    readSnap.forEach(child => {
      expect(child.val()).to.equal(expected);
      expected--;
    });
    expect(expected).to.equal(-1);
  });

  it('Push data with exponential priority and ensure order is correct.', async () => {
    const nodePair = getRandomNode(2) as Reference[];
    let expected;

    const node = nodePair[0];
    let nodesSet = 0;
    for (let i = 0; i < 10; i++) {
      const pushedNode = node.push();
      pushedNode.setWithPriority(
        i,
        111111111111111111111111111111 / Math.pow(10, i),
        () => {
          ++nodesSet;
        }
      );
    }

    // read it back locally and make sure it's correct.
    const snap = await node.once('value');
    expected = 9;
    snap.forEach(child => {
      expect(child.val()).to.equal(expected);
      expected--;
    });
    expect(expected).to.equal(-1);

    // read it back
    let readSnap;
    const ea = new EventAccumulator(() => readSnap);
    nodePair[1].on('value', snap => {
      readSnap = snap;
      ea.addEvent();
    });

    await ea.promise;

    expected = 9;
    readSnap.forEach(child => {
      expect(child.val()).to.equal(expected);
      expected--;
    });
    expect(expected).to.equal(-1);
  });

  it("Verify nodes without values aren't enumerated.", async () => {
    const node = getRandomNode() as Reference;
    node.child('foo');
    node.child('bar').set('test');

    let items = 0;
    const snap = await node.once('value');
    snap.forEach(child => {
      items++;
      expect(child.key).to.equal('bar');
    });

    expect(items).to.equal(1);
  });

  it.skip('Receive child_moved event when priority changes.', async () => {
    const node = getRandomNode() as Reference;

    // const ea = new EventAccumulator(() => eventHelper.watchesInitializedWaiter);

    const eventHelper = eventTestHelper([
      [node, ['child_added', 'a']],
      [node, ['value', '']],
      [node, ['child_added', 'b']],
      [node, ['value', '']],
      [node, ['child_added', 'c']],
      [node, ['value', '']],
      [node, ['child_moved', 'a']],
      [node, ['child_changed', 'a']],
      [node, ['value', '']]
    ]);

    // await ea.promise;

    node.child('a').setWithPriority('first', 1);
    node.child('b').setWithPriority('second', 5);
    node.child('c').setWithPriority('third', 10);

    expect(eventHelper.waiter()).to.equal(false);

    node.child('a').setPriority(15);

    expect(eventHelper.waiter()).to.equal(true);
  });

  it.skip('Can reset priority to null.', async () => {
    const node = getRandomNode() as Reference;

    node.child('a').setWithPriority('a', 1);
    node.child('b').setWithPriority('b', 2);

    // const ea = new EventAccumulator(() => eventHelper.waiter());
    const eventHelper = eventTestHelper([
      [node, ['child_added', 'a']],
      [node, ['child_added', 'b']],
      [node, ['value', '']]
    ]);

    // await ea.promise;

    eventHelper.addExpectedEvents([
      [node, ['child_moved', 'b']],
      [node, ['child_changed', 'b']],
      [node, ['value', '']]
    ]);

    node.child('b').setPriority(null);
    expect(eventHelper.waiter()).to.equal(true);

    expect((await node.once('value')).child('b').getPriority()).to.equal(null);
  });

  it('Inserting a node under a leaf node preserves its priority.', () => {
    const node = getRandomNode() as Reference;

    let snap = null;
    node.on('value', s => {
      snap = s;
    });

    node.setWithPriority('a', 10);
    node.child('deeper').set('deeper');
    expect(snap.getPriority()).to.equal(10);
  });

  it('Verify order of mixed numbers / strings / no priorities.', async () => {
    const nodePair = getRandomNode(2) as Reference[];
    const nodeAndPriorities = [
      'alpha42',
      'zed',
      'noPriorityC',
      null,
      'num41',
      500,
      'noPriorityB',
      null,
      'num80',
      4000.1,
      'num50',
      4000,
      'num10',
      24,
      'alpha41',
      'zed',
      'alpha20',
      'horse',
      'num20',
      123,
      'num70',
      4000.01,
      'noPriorityA',
      null,
      'alpha30',
      'tree',
      'num30',
      300,
      'num60',
      4000.001,
      'alpha10',
      '0horse',
      'num42',
      500,
      'alpha40',
      'zed',
      'num40',
      500
    ];

    let setsCompleted = 0;
    for (let i = 0; i < nodeAndPriorities.length; i++) {
      const n = nodePair[0].child(nodeAndPriorities[i++] as string);
      n.setWithPriority(1, nodeAndPriorities[i], () => {
        setsCompleted++;
      });
    }

    const expectedOutput =
      'noPriorityA, noPriorityB, noPriorityC, num10, num20, num30, num40, num41, num42, num50, num60, num70, num80, alpha10, alpha20, alpha30, alpha40, alpha41, alpha42, ';

    const snap = await nodePair[0].once('value');

    let output = '';
    snap.forEach(n => {
      output += n.key + ', ';
    });

    expect(output).to.equal(expectedOutput);

    let eventsFired = false;
    output = '';
    nodePair[1].on('value', snap => {
      snap.forEach(n => {
        output += n.key + ', ';
      });
      expect(output).to.equal(expectedOutput);
      eventsFired = true;
    });
  });

  it('Verify order of integer keys.', async () => {
    const ref = getRandomNode() as Reference;
    const keys = ['foo', 'bar', '03', '0', '100', '20', '5', '3', '003', '9'];

    let setsCompleted = 0;
    for (let i = 0; i < keys.length; i++) {
      const child = ref.child(keys[i]);
      child.set(true, () => {
        setsCompleted++;
      });
    }

    const expectedOutput = '0, 3, 03, 003, 5, 9, 20, 100, bar, foo, ';

    const snap = await ref.once('value');
    let output = '';
    snap.forEach(n => {
      output += n.key + ', ';
    });

    expect(output).to.equal(expectedOutput);
  });

  it('Ensure prevName is correct on child_added event.', () => {
    const node = getRandomNode() as Reference;

    let added = '';
    node.on('child_added', (snap, prevName) => {
      added += snap.key + ' ' + prevName + ', ';
    });

    node.set({ a: 1, b: 2, c: 3 });

    expect(added).to.equal('a null, b a, c b, ');
  });

  it('Ensure prevName is correct when adding new nodes.', () => {
    const node = getRandomNode() as Reference;

    let added = '';
    node.on('child_added', (snap, prevName) => {
      added += snap.key + ' ' + prevName + ', ';
    });

    node.set({ b: 2, c: 3, d: 4 });

    expect(added).to.equal('b null, c b, d c, ');

    added = '';
    node.child('a').set(1);
    expect(added).to.equal('a null, ');

    added = '';
    node.child('e').set(5);
    expect(added).to.equal('e d, ');
  });

  it('Ensure prevName is correct when adding new nodes with JSON.', () => {
    const node = getRandomNode() as Reference;

    let added = '';
    node.on('child_added', (snap, prevName) => {
      added += snap.key + ' ' + prevName + ', ';
    });

    node.set({ b: 2, c: 3, d: 4 });

    expect(added).to.equal('b null, c b, d c, ');

    added = '';
    node.set({ a: 1, b: 2, c: 3, d: 4 });
    expect(added).to.equal('a null, ');

    added = '';
    node.set({ a: 1, b: 2, c: 3, d: 4, e: 5 });
    expect(added).to.equal('e d, ');
  });

  it('Ensure prevName is correct when moving nodes.', () => {
    const node = getRandomNode() as Reference;

    let moved = '';
    node.on('child_moved', (snap, prevName) => {
      moved += snap.key + ' ' + prevName + ', ';
    });

    node.child('a').setWithPriority('a', 1);
    node.child('b').setWithPriority('b', 2);
    node.child('c').setWithPriority('c', 3);
    node.child('d').setWithPriority('d', 4);

    node.child('d').setPriority(0);
    expect(moved).to.equal('d null, ');

    moved = '';
    node.child('a').setPriority(4);
    expect(moved).to.equal('a c, ');

    moved = '';
    node.child('c').setPriority(0.5);
    expect(moved).to.equal('c d, ');
  });

  it('Ensure prevName is correct when moving nodes by setting whole JSON.', () => {
    const node = getRandomNode() as Reference;

    let moved = '';
    node.on('child_moved', (snap, prevName) => {
      moved += snap.key + ' ' + prevName + ', ';
    });

    node.set({
      a: { '.value': 'a', '.priority': 1 },
      b: { '.value': 'b', '.priority': 2 },
      c: { '.value': 'c', '.priority': 3 },
      d: { '.value': 'd', '.priority': 4 }
    });

    node.set({
      d: { '.value': 'd', '.priority': 0 },
      a: { '.value': 'a', '.priority': 1 },
      b: { '.value': 'b', '.priority': 2 },
      c: { '.value': 'c', '.priority': 3 }
    });
    expect(moved).to.equal('d null, ');

    moved = '';
    node.set({
      d: { '.value': 'd', '.priority': 0 },
      b: { '.value': 'b', '.priority': 2 },
      c: { '.value': 'c', '.priority': 3 },
      a: { '.value': 'a', '.priority': 4 }
    });
    expect(moved).to.equal('a c, ');

    moved = '';
    node.set({
      d: { '.value': 'd', '.priority': 0 },
      c: { '.value': 'c', '.priority': 0.5 },
      b: { '.value': 'b', '.priority': 2 },
      a: { '.value': 'a', '.priority': 4 }
    });
    expect(moved).to.equal('c d, ');
  });

  it('Case 595: Should not get child_moved event when deleting prioritized grandchild.', () => {
    const f = getRandomNode() as Reference;
    let moves = 0;
    f.on('child_moved', () => {
      moves++;
    });

    f.child('test/foo').setWithPriority(42, '5');
    f.child('test/foo2').setWithPriority(42, '10');
    f.child('test/foo').remove();
    f.child('test/foo2').remove();

    expect(moves).to.equal(0, 'Should *not* have received any move events.');
  });

  it('Can set value with priority of 0.', () => {
    const f = getRandomNode() as Reference;

    let snap = null;
    f.on('value', s => {
      snap = s;
    });

    f.setWithPriority('test', 0);

    expect(snap.getPriority()).to.equal(0);
  });

  it('Can set object with priority of 0.', () => {
    const f = getRandomNode() as Reference;

    let snap = null;
    f.on('value', s => {
      snap = s;
    });

    f.setWithPriority({ x: 'test', y: 7 }, 0);

    expect(snap.getPriority()).to.equal(0);
  });

  it('Case 2003: Should get child_moved for any priority change, regardless of whether it affects ordering.', () => {
    const f = getRandomNode() as Reference;
    const moved = [];
    f.on('child_moved', snap => {
      moved.push(snap.key);
    });
    f.set({
      a: { '.value': 'a', '.priority': 0 },
      b: { '.value': 'b', '.priority': 1 },
      c: { '.value': 'c', '.priority': 2 },
      d: { '.value': 'd', '.priority': 3 }
    });

    expect(moved).to.deep.equal([]);
    f.child('b').setWithPriority('b', 1.5);
    expect(moved).to.deep.equal(['b']);
  });

  it('Case 2003: Should get child_moved for any priority change, regardless of whether it affects ordering (2).', () => {
    const f = getRandomNode() as Reference;
    const moved = [];
    f.on('child_moved', snap => {
      moved.push(snap.key);
    });
    f.set({
      a: { '.value': 'a', '.priority': 0 },
      b: { '.value': 'b', '.priority': 1 },
      c: { '.value': 'c', '.priority': 2 },
      d: { '.value': 'd', '.priority': 3 }
    });

    expect(moved).to.deep.equal([]);
    f.set({
      a: { '.value': 'a', '.priority': 0 },
      b: { '.value': 'b', '.priority': 1.5 },
      c: { '.value': 'c', '.priority': 2 },
      d: { '.value': 'd', '.priority': 3 }
    });
    expect(moved).to.deep.equal(['b']);
  });
});
