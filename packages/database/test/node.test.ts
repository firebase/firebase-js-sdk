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

import { ChildrenNode } from '../src/core/snap/ChildrenNode';
import { NAME_COMPARATOR } from '../src/core/snap/comparators';
import { PRIORITY_INDEX } from '../src/core/snap/indexes/PriorityIndex';
import { IndexMap } from '../src/core/snap/IndexMap';
import { LeafNode } from '../src/core/snap/LeafNode';
import { Node } from '../src/core/snap/Node';
import { nodeFromJSON } from '../src/core/snap/nodeFromJSON';
import { newEmptyPath, Path } from '../src/core/util/Path';
import { SortedMap } from '../src/core/util/SortedMap';

describe('Node Tests', () => {
  const DEFAULT_INDEX = PRIORITY_INDEX;

  it('Create leaf nodes of various types.', () => {
    let x = new LeafNode(5, new LeafNode(42));
    expect(x.getValue()).toBe(5);
    expect(x.getPriority().val()).toBe(42);
    expect(x.isLeafNode()).toBe(true);

    x = new LeafNode('test');
    expect(x.getValue()).toBe('test');
    x = new LeafNode(true);
    expect(x.getValue()).toBe(true);
  });

  it('LeafNode.updatePriority returns a new leaf node without changing the old.', () => {
    const x = new LeafNode('test', new LeafNode(42));
    const y = x.updatePriority(new LeafNode(187));

    // old node is the same.
    expect(x.getValue()).toBe('test');
    expect(x.getPriority().val()).toBe(42);

    // new node has the new priority but the old value.
    expect((y as any).getValue()).toBe('test');
    expect(y.getPriority().val()).toBe(187);
  });

  it('LeafNode.updateImmediateChild returns a new children node.', () => {
    const x = new LeafNode('test', new LeafNode(42));
    const y = x.updateImmediateChild('test', new LeafNode('foo'));

    expect(y.isLeafNode()).toBe(false);
    expect(y.getPriority().val()).toBe(42);
    expect((y.getImmediateChild('test') as LeafNode).getValue()).toBe('foo');
  });

  it('LeafNode.getImmediateChild returns an empty node.', () => {
    const x = new LeafNode('test');
    expect(x.getImmediateChild('foo')).toBe(ChildrenNode.EMPTY_NODE);
  });

  it('LeafNode.getChild returns an empty node.', () => {
    const x = new LeafNode('test');
    expect(x.getChild(new Path('foo/bar'))).toBe(ChildrenNode.EMPTY_NODE);
  });

  it('ChildrenNode.updatePriority returns a new internal node without changing the old.', () => {
    const x = ChildrenNode.EMPTY_NODE.updateImmediateChild(
      'child',
      new LeafNode(5)
    );
    const children = (x as any).children_;
    const y = x.updatePriority(new LeafNode(17));
    expect((y as any).children_).toBe((x as any).children_);
    expect((x as any).children_).toBe(children);
    expect(x.getPriority().val()).toBe(null);
    expect(y.getPriority().val()).toBe(17);
  });

  it('ChildrenNode.updateImmediateChild returns a new internal node with the new child, without changing the old.', () => {
    const children = new SortedMap<string, Node>(NAME_COMPARATOR);
    const x = new ChildrenNode(
      children,
      ChildrenNode.EMPTY_NODE,
      IndexMap.Default
    );
    const newValue = new LeafNode('new value');
    const y = x.updateImmediateChild('test', newValue);
    expect((x as any).children_).toBe(children);
    expect((y as any).children_.get('test')).toBe(newValue);
  });

  it('ChildrenNode.updateChild returns a new internal node with the new child, without changing the old.', () => {
    const children = new SortedMap<string, Node>(NAME_COMPARATOR);
    const x = new ChildrenNode(
      children,
      ChildrenNode.EMPTY_NODE,
      IndexMap.Default
    );
    const newValue = new LeafNode('new value');
    const y = x.updateChild(new Path('test/foo'), newValue);
    expect((x as any).children_).toBe(children);
    expect(y.getChild(new Path('test/foo'))).toBe(newValue);
  });

  it('Node.hash() works correctly.', () => {
    const node = nodeFromJSON({
      intNode: 4,
      doubleNode: 4.5623,
      stringNode: 'hey guys',
      boolNode: true
    });

    // !!!NOTE!!! These hashes must match what the server generates.  If you change anything so these hashes change,
    // make sure you change the corresponding server code.
    expect(node.getImmediateChild('intNode').hash()).toBe(
      'eVih19a6ZDz3NL32uVBtg9KSgQY='
    );
    expect(node.getImmediateChild('doubleNode').hash()).toBe(
      'vf1CL0tIRwXXunHcG/irRECk3lY='
    );
    expect(node.getImmediateChild('stringNode').hash()).toBe(
      'CUNLXWpCVoJE6z7z1vE57lGaKAU='
    );
    expect(node.getImmediateChild('boolNode').hash()).toBe(
      'E5z61QM0lN/U2WsOnusszCTkR8M='
    );

    expect(node.hash()).toBe('6Mc4jFmNdrLVIlJJjz2/MakTK9I=');
  });

  it('Node.hash() works correctly with priorities.', () => {
    const node = nodeFromJSON({
      root: { c: { '.value': 99, '.priority': 'abc' }, '.priority': 'def' }
    });

    expect(node.hash()).toBe('Fm6tzN4CVEu5WxFDZUdTtqbTVaA=');
  });

  it('Node.hash() works correctly with number priorities.', () => {
    const node = nodeFromJSON({
      root: { c: { '.value': 99, '.priority': 42 }, '.priority': 3.14 }
    });

    expect(node.hash()).toBe('B15QCqrzCxrI5zz1y00arWqFRFg=');
  });

  it('Node.hash() stress...', () => {
    const node = nodeFromJSON({
      a: -1.7976931348623157e308,
      b: 1.7976931348623157e308,
      c: 'unicode ✔ 🐵 🌴 x͢',
      d: 3.1415926535897932384626433832795,
      e: {
        '.value': 12345678901234568,
        '.priority': '🐵'
      },
      '✔': 'foo',
      '.priority': '✔'
    });
    expect(node.getImmediateChild('a').hash()).toBe(
      '7HxgOBDEC92uQwhCuuvKA2rbXDA='
    );
    expect(node.getImmediateChild('b').hash()).toBe(
      '8R+ekVQmxs6ZWP0fdzFHxVeGnWo='
    );
    expect(node.getImmediateChild('c').hash()).toBe(
      'JoKoFUnbmg3/DlY70KaDWslfYPk='
    );
    expect(node.getImmediateChild('d').hash()).toBe(
      'Y41iC5+92GIqXfabOm33EanRI8s='
    );
    expect(node.getImmediateChild('e').hash()).toBe(
      '+E+Mxlqh5MhT+On05bjsZ6JaaxI='
    );
    expect(node.getImmediateChild('✔').hash()).toBe(
      'MRRL/+aA/uibaL//jghUpxXS/uY='
    );
    expect(node.hash()).toBe('CyC0OU8GSkOAKnsPjheWtWC0Yxo=');
  });

  it('ChildrenNode.getPredecessorChild works correctly.', () => {
    const node = nodeFromJSON({
      d: true,
      a: true,
      g: true,
      c: true,
      e: true
    });

    // HACK: Pass null instead of the actual childNode, since it's not actually needed.
    expect(node.getPredecessorChildName('a', null, DEFAULT_INDEX)).toBe(null);
    expect(node.getPredecessorChildName('c', null, DEFAULT_INDEX)).toBe('a');
    expect(node.getPredecessorChildName('d', null, DEFAULT_INDEX)).toBe('c');
    expect(node.getPredecessorChildName('e', null, DEFAULT_INDEX)).toBe('d');
    expect(node.getPredecessorChildName('g', null, DEFAULT_INDEX)).toBe('e');
  });

  it('SortedChildrenNode.getPredecessorChild works correctly.', () => {
    const node = nodeFromJSON({
      d: { '.value': true, '.priority': 22 },
      a: { '.value': true, '.priority': 25 },
      g: { '.value': true, '.priority': 19 },
      c: { '.value': true, '.priority': 23 },
      e: { '.value': true, '.priority': 21 }
    });

    expect(
      node.getPredecessorChildName(
        'a',
        node.getImmediateChild('a'),
        DEFAULT_INDEX
      )
    ).toBe('c');
    expect(
      node.getPredecessorChildName(
        'c',
        node.getImmediateChild('c'),
        DEFAULT_INDEX
      )
    ).toBe('d');
    expect(
      node.getPredecessorChildName(
        'd',
        node.getImmediateChild('d'),
        DEFAULT_INDEX
      )
    ).toBe('e');
    expect(
      node.getPredecessorChildName(
        'e',
        node.getImmediateChild('e'),
        DEFAULT_INDEX
      )
    ).toBe('g');
    expect(
      node.getPredecessorChildName(
        'g',
        node.getImmediateChild('g'),
        DEFAULT_INDEX
      )
    ).toBe(null);
  });

  it('SortedChildrenNode.updateImmediateChild works correctly.', () => {
    let node = nodeFromJSON({
      d: { '.value': true, '.priority': 22 },
      a: { '.value': true, '.priority': 25 },
      g: { '.value': true, '.priority': 19 },
      c: { '.value': true, '.priority': 23 },
      e: { '.value': true, '.priority': 21 },
      '.priority': 1000
    });

    node = node.updateImmediateChild('c', nodeFromJSON(false));
    expect((node.getImmediateChild('c') as LeafNode).getValue()).toBe(false);
    expect(node.getImmediateChild('c').getPriority().val()).toBe(null);
    expect(node.getPriority().val()).toBe(1000);
  });

  it('removing nodes correctly removes intermediate nodes with no remaining children', () => {
    const json = { a: { b: { c: 1 } } };
    const node = nodeFromJSON(json);
    const newNode = node.updateChild(
      new Path('a/b/c'),
      ChildrenNode.EMPTY_NODE
    );
    expect(newNode.isEmpty()).toBe(true);
  });

  it('removing nodes leaves intermediate nodes with other children', () => {
    const json = { a: { b: { c: 1 }, d: 2 } };
    const node = nodeFromJSON(json);
    const newNode = node.updateChild(
      new Path('a/b/c'),
      ChildrenNode.EMPTY_NODE
    );
    expect(newNode.isEmpty()).toBe(false);
    expect(newNode.getChild(new Path('a/b/c')).isEmpty()).toBe(true);
    expect(newNode.getChild(new Path('a/d')).val()).toBe(2);
  });

  it('removing nodes leaves other leaf nodes', () => {
    const json = { a: { b: { c: 1, d: 2 } } };
    const node = nodeFromJSON(json);
    const newNode = node.updateChild(
      new Path('a/b/c'),
      ChildrenNode.EMPTY_NODE
    );
    expect(newNode.isEmpty()).toBe(false);
    expect(newNode.getChild(new Path('a/b/c')).isEmpty()).toBe(true);
    expect(newNode.getChild(new Path('a/b/d')).val()).toBe(2);
  });

  it('removing nodes correctly removes the root', () => {
    let json = null;
    let node = nodeFromJSON(json);
    let newNode = node.updateChild(newEmptyPath(), ChildrenNode.EMPTY_NODE);
    expect(newNode.isEmpty()).toBe(true);

    json = { a: 1 };
    node = nodeFromJSON(json);
    newNode = node.updateChild(new Path('a'), ChildrenNode.EMPTY_NODE);
    expect(newNode.isEmpty()).toBe(true);
  });

  it('ignores null values', () => {
    const json = { a: 1, b: null };
    const node = nodeFromJSON(json);
    expect((node as any).children_.get('b')).toBe(null);
  });

  it('Leading zeroes in path are handled properly', () => {
    const json = { '1': 1, '01': 2, '001': 3 };
    const tree = nodeFromJSON(json);
    expect(tree.getChild(new Path('1')).val()).toBe(1);
    expect(tree.getChild(new Path('01')).val()).toBe(2);
    expect(tree.getChild(new Path('001')).val()).toBe(3);
  });

  it('Treats leading zeroes as objects, not array', () => {
    const json = { '3': 1, '03': 2 };
    const tree = nodeFromJSON(json);
    const val = tree.val();
    expect(val).toEqual(json);
  });

  it("Updating empty children doesn't overwrite leaf node", () => {
    const empty = ChildrenNode.EMPTY_NODE;
    const node = nodeFromJSON('value');
    expect(node).toEqual(node.updateChild(new Path('.priority'), empty));
    expect(node).toEqual(node.updateChild(new Path('child'), empty));
    expect(node).toEqual(node.updateChild(new Path('child/.priority'), empty));
    expect(node).toEqual(node.updateImmediateChild('child', empty));
    expect(node).toEqual(node.updateImmediateChild('.priority', empty));
  });
});
