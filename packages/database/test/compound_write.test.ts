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

import {
  CompoundWrite,
  compoundWriteAddWrite,
  compoundWriteAddWrites,
  compoundWriteApply,
  compoundWriteChildCompoundWrite,
  compoundWriteGetCompleteChildren,
  compoundWriteHasCompleteWrite,
  compoundWriteIsEmpty,
  compoundWriteRemoveWrite
} from '../src/core/CompoundWrite';
import { ChildrenNode } from '../src/core/snap/ChildrenNode';
import { LeafNode } from '../src/core/snap/LeafNode';
import { NamedNode } from '../src/core/snap/Node';
import { nodeFromJSON } from '../src/core/snap/nodeFromJSON';
import { newEmptyPath, Path, pathGetFront } from '../src/core/util/Path';

describe('CompoundWrite Tests', () => {
  const LEAF_NODE = nodeFromJSON('leaf-node');
  const PRIO_NODE = nodeFromJSON('prio');
  const CHILDREN_NODE = nodeFromJSON({
    'child-1': 'value-1',
    'child-2': 'value-2'
  });
  const EMPTY_NODE = ChildrenNode.EMPTY_NODE;

  function assertNodeGetsCorrectPriority(compoundWrite, node, priority) {
    if (node.isEmpty()) {
      expect(compoundWriteApply(compoundWrite, node)).to.equal(EMPTY_NODE);
    } else {
      expect(compoundWriteApply(compoundWrite, node)).to.deep.equal(
        node.updatePriority(priority)
      );
    }
  }

  function assertNodesEqual(expected, actual) {
    expect(actual.equals(expected)).to.be.true;
  }

  it('Empty merge is empty', () => {
    expect(compoundWriteIsEmpty(CompoundWrite.empty())).to.be.true;
  });

  it('CompoundWrite with priority update is not empty.', () => {
    expect(
      compoundWriteIsEmpty(
        compoundWriteAddWrite(
          CompoundWrite.empty(),
          new Path('.priority'),
          PRIO_NODE
        )
      )
    ).to.be.false;
  });

  it('CompoundWrite with update is not empty.', () => {
    expect(
      compoundWriteIsEmpty(
        compoundWriteAddWrite(
          CompoundWrite.empty(),
          new Path('foo/bar'),
          LEAF_NODE
        )
      )
    ).to.be.false;
  });

  it('CompoundWrite with root update is not empty.', () => {
    expect(
      compoundWriteIsEmpty(
        compoundWriteAddWrite(CompoundWrite.empty(), newEmptyPath(), LEAF_NODE)
      )
    ).to.be.false;
  });

  it('CompoundWrite with empty root update is not empty.', () => {
    expect(
      compoundWriteIsEmpty(
        compoundWriteAddWrite(CompoundWrite.empty(), newEmptyPath(), EMPTY_NODE)
      )
    ).to.be.false;
  });

  it('CompoundWrite with root priority update, child write is not empty.', () => {
    const compoundWrite = compoundWriteAddWrite(
      CompoundWrite.empty(),
      new Path('.priority'),
      PRIO_NODE
    );
    expect(
      compoundWriteIsEmpty(
        compoundWriteChildCompoundWrite(compoundWrite, new Path('.priority'))
      )
    ).to.be.false;
  });

  it('Applies leaf overwrite', () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      newEmptyPath(),
      LEAF_NODE
    );
    expect(compoundWriteApply(compoundWrite, EMPTY_NODE)).to.equal(LEAF_NODE);
  });

  it('Applies children overwrite', () => {
    let compoundWrite = CompoundWrite.empty();
    const childNode = EMPTY_NODE.updateImmediateChild('child', LEAF_NODE);
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      newEmptyPath(),
      childNode
    );
    expect(compoundWriteApply(compoundWrite, EMPTY_NODE)).to.equal(childNode);
  });

  it('Adds child node', () => {
    let compoundWrite = CompoundWrite.empty();
    const expected = EMPTY_NODE.updateImmediateChild('child', LEAF_NODE);
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child'),
      LEAF_NODE
    );
    assertNodesEqual(expected, compoundWriteApply(compoundWrite, EMPTY_NODE));
  });

  it('Adds deep child node', () => {
    let compoundWrite = CompoundWrite.empty();
    const path = new Path('deep/deep/node');
    const expected = EMPTY_NODE.updateChild(path, LEAF_NODE);
    compoundWrite = compoundWriteAddWrite(compoundWrite, path, LEAF_NODE);
    expect(compoundWriteApply(compoundWrite, EMPTY_NODE)).to.deep.equal(
      expected
    );
  });

  it('shallow update removes deep update', () => {
    let compoundWrite = CompoundWrite.empty();
    const updateOne = nodeFromJSON('new-foo-value');
    const updateTwo = nodeFromJSON('baz-value');
    const updateThree = nodeFromJSON({ foo: 'foo-value', bar: 'bar-value' });
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1/foo'),
      updateOne
    );
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1/baz'),
      updateTwo
    );
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1'),
      updateThree
    );
    const expectedChildOne = {
      foo: 'foo-value',
      bar: 'bar-value'
    };
    const expected = CHILDREN_NODE.updateImmediateChild(
      'child-1',
      nodeFromJSON(expectedChildOne)
    );
    assertNodesEqual(
      expected,
      compoundWriteApply(compoundWrite, CHILDREN_NODE)
    );
  });

  it('child priority updates empty priority on child write', () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1/.priority'),
      EMPTY_NODE
    );
    const node = new LeafNode('foo', PRIO_NODE);
    assertNodeGetsCorrectPriority(
      compoundWriteChildCompoundWrite(compoundWrite, new Path('child-1')),
      node,
      EMPTY_NODE
    );
  });

  it('deep priority set works on empty node when other set is available', () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('foo/.priority'),
      PRIO_NODE
    );
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('foo/child'),
      LEAF_NODE
    );
    const node = compoundWriteApply(compoundWrite, EMPTY_NODE);
    assertNodesEqual(PRIO_NODE, node.getChild(new Path('foo')).getPriority());
  });

  it('child merge looks into update node', () => {
    let compoundWrite = CompoundWrite.empty();
    const update = nodeFromJSON({ foo: 'foo-value', bar: 'bar-value' });
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      newEmptyPath(),
      update
    );
    assertNodesEqual(
      nodeFromJSON('foo-value'),
      compoundWriteApply(
        compoundWriteChildCompoundWrite(compoundWrite, new Path('foo')),
        EMPTY_NODE
      )
    );
  });

  it('child merge removes node on deeper paths', () => {
    let compoundWrite = CompoundWrite.empty();
    const update = nodeFromJSON({ foo: 'foo-value', bar: 'bar-value' });
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      newEmptyPath(),
      update
    );
    assertNodesEqual(
      EMPTY_NODE,
      compoundWriteApply(
        compoundWriteChildCompoundWrite(
          compoundWrite,
          new Path('foo/not/existing')
        ),
        LEAF_NODE
      )
    );
  });

  it('child merge with empty path is same merge', () => {
    let compoundWrite = CompoundWrite.empty();
    const update = nodeFromJSON({ foo: 'foo-value', bar: 'bar-value' });
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      newEmptyPath(),
      update
    );
    expect(
      compoundWriteChildCompoundWrite(compoundWrite, newEmptyPath())
    ).to.equal(compoundWrite);
  });

  it('root update removes root priority', () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('.priority'),
      PRIO_NODE
    );
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      newEmptyPath(),
      nodeFromJSON('foo')
    );
    assertNodesEqual(
      nodeFromJSON('foo'),
      compoundWriteApply(compoundWrite, EMPTY_NODE)
    );
  });

  it('deep update removes priority there', () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('foo/.priority'),
      PRIO_NODE
    );
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('foo'),
      nodeFromJSON('bar')
    );
    const expected = nodeFromJSON({ foo: 'bar' });
    assertNodesEqual(expected, compoundWriteApply(compoundWrite, EMPTY_NODE));
  });

  it('adding updates at path works', () => {
    let compoundWrite = CompoundWrite.empty();
    const updates = {
      foo: nodeFromJSON('foo-value'),
      bar: nodeFromJSON('bar-value')
    };
    compoundWrite = compoundWriteAddWrites(
      compoundWrite,
      new Path('child-1'),
      updates
    );

    const expectedChildOne = {
      foo: 'foo-value',
      bar: 'bar-value'
    };
    const expected = CHILDREN_NODE.updateImmediateChild(
      'child-1',
      nodeFromJSON(expectedChildOne)
    );
    assertNodesEqual(
      expected,
      compoundWriteApply(compoundWrite, CHILDREN_NODE)
    );
  });

  it('adding updates at root works', () => {
    let compoundWrite = CompoundWrite.empty();
    const updates = {
      'child-1': nodeFromJSON('new-value-1'),
      'child-2': EMPTY_NODE,
      'child-3': nodeFromJSON('value-3')
    };
    compoundWrite = compoundWriteAddWrites(
      compoundWrite,
      newEmptyPath(),
      updates
    );

    const expected = {
      'child-1': 'new-value-1',
      'child-3': 'value-3'
    };
    assertNodesEqual(
      nodeFromJSON(expected),
      compoundWriteApply(compoundWrite, CHILDREN_NODE)
    );
  });

  it('child write of root priority works', () => {
    const compoundWrite = compoundWriteAddWrite(
      CompoundWrite.empty(),
      new Path('.priority'),
      PRIO_NODE
    );
    assertNodesEqual(
      PRIO_NODE,
      compoundWriteApply(
        compoundWriteChildCompoundWrite(compoundWrite, new Path('.priority')),
        EMPTY_NODE
      )
    );
  });

  it('complete children only returns complete overwrites', () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1'),
      LEAF_NODE
    );
    expect(compoundWriteGetCompleteChildren(compoundWrite)).to.deep.equal([
      new NamedNode('child-1', LEAF_NODE)
    ]);
  });

  it('complete children only returns empty overwrites', () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1'),
      EMPTY_NODE
    );
    expect(compoundWriteGetCompleteChildren(compoundWrite)).to.deep.equal([
      new NamedNode('child-1', EMPTY_NODE)
    ]);
  });

  it('complete children doesnt return deep overwrites', () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1/deep/path'),
      LEAF_NODE
    );
    expect(compoundWriteGetCompleteChildren(compoundWrite)).to.deep.equal([]);
  });

  it('complete children return all complete children but no incomplete', () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1/deep/path'),
      LEAF_NODE
    );
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-2'),
      LEAF_NODE
    );
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-3'),
      EMPTY_NODE
    );
    const expected = {
      'child-2': LEAF_NODE,
      'child-3': EMPTY_NODE
    };
    const actual = {};
    const completeChildren = compoundWriteGetCompleteChildren(compoundWrite);
    for (let i = 0; i < completeChildren.length; i++) {
      actual[completeChildren[i].name] = completeChildren[i].node;
    }
    expect(actual).to.deep.equal(expected);
  });

  it('complete children return all children for root set', () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      newEmptyPath(),
      CHILDREN_NODE
    );

    const expected = {
      'child-1': nodeFromJSON('value-1'),
      'child-2': nodeFromJSON('value-2')
    };

    const actual = {};
    const completeChildren = compoundWriteGetCompleteChildren(compoundWrite);
    for (let i = 0; i < completeChildren.length; i++) {
      actual[completeChildren[i].name] = completeChildren[i].node;
    }
    expect(actual).to.deep.equal(expected);
  });

  it('empty merge has no shadowing write', () => {
    expect(compoundWriteHasCompleteWrite(CompoundWrite.empty(), newEmptyPath()))
      .to.be.false;
  });

  it('compound write with empty root has shadowing write', () => {
    const compoundWrite = compoundWriteAddWrite(
      CompoundWrite.empty(),
      newEmptyPath(),
      EMPTY_NODE
    );
    expect(compoundWriteHasCompleteWrite(compoundWrite, newEmptyPath())).to.be
      .true;
    expect(compoundWriteHasCompleteWrite(compoundWrite, new Path('child'))).to
      .be.true;
  });

  it('compound write with  root has shadowing write', () => {
    const compoundWrite = compoundWriteAddWrite(
      CompoundWrite.empty(),
      newEmptyPath(),
      LEAF_NODE
    );
    expect(compoundWriteHasCompleteWrite(compoundWrite, newEmptyPath())).to.be
      .true;
    expect(compoundWriteHasCompleteWrite(compoundWrite, new Path('child'))).to
      .be.true;
  });

  it('compound write with deep update has shadowing write', () => {
    const compoundWrite = compoundWriteAddWrite(
      CompoundWrite.empty(),
      new Path('deep/update'),
      LEAF_NODE
    );
    expect(compoundWriteHasCompleteWrite(compoundWrite, newEmptyPath())).to.be
      .false;
    expect(compoundWriteHasCompleteWrite(compoundWrite, new Path('deep'))).to.be
      .false;
    expect(
      compoundWriteHasCompleteWrite(compoundWrite, new Path('deep/update'))
    ).to.be.true;
  });

  it('compound write with priority update has shadowing write', () => {
    const compoundWrite = compoundWriteAddWrite(
      CompoundWrite.empty(),
      new Path('.priority'),
      PRIO_NODE
    );
    expect(compoundWriteHasCompleteWrite(compoundWrite, newEmptyPath())).to.be
      .false;
    expect(compoundWriteHasCompleteWrite(compoundWrite, new Path('.priority')))
      .to.be.true;
  });

  it('updates can be removed', () => {
    let compoundWrite = CompoundWrite.empty();
    const update = nodeFromJSON({ foo: 'foo-value', bar: 'bar-value' });
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1'),
      update
    );
    compoundWrite = compoundWriteRemoveWrite(
      compoundWrite,
      new Path('child-1')
    );
    assertNodesEqual(
      CHILDREN_NODE,
      compoundWriteApply(compoundWrite, CHILDREN_NODE)
    );
  });

  it('deep removes has no effect on overlaying set', () => {
    let compoundWrite = CompoundWrite.empty();
    const updateOne = nodeFromJSON({ foo: 'foo-value', bar: 'bar-value' });
    const updateTwo = nodeFromJSON('baz-value');
    const updateThree = nodeFromJSON('new-foo-value');
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1'),
      updateOne
    );
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1/baz'),
      updateTwo
    );
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1/foo'),
      updateThree
    );
    compoundWrite = compoundWriteRemoveWrite(
      compoundWrite,
      new Path('child-1/foo')
    );
    const expectedChildOne = {
      foo: 'new-foo-value',
      bar: 'bar-value',
      baz: 'baz-value'
    };
    const expected = CHILDREN_NODE.updateImmediateChild(
      'child-1',
      nodeFromJSON(expectedChildOne)
    );
    assertNodesEqual(
      expected,
      compoundWriteApply(compoundWrite, CHILDREN_NODE)
    );
  });

  it('remove at path without set is without effect', () => {
    let compoundWrite = CompoundWrite.empty();
    const updateOne = nodeFromJSON({ foo: 'foo-value', bar: 'bar-value' });
    const updateTwo = nodeFromJSON('baz-value');
    const updateThree = nodeFromJSON('new-foo-value');
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1'),
      updateOne
    );
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1/baz'),
      updateTwo
    );
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1/foo'),
      updateThree
    );
    compoundWrite = compoundWriteRemoveWrite(
      compoundWrite,
      new Path('child-2')
    );
    const expectedChildOne = {
      foo: 'new-foo-value',
      bar: 'bar-value',
      baz: 'baz-value'
    };
    const expected = CHILDREN_NODE.updateImmediateChild(
      'child-1',
      nodeFromJSON(expectedChildOne)
    );
    assertNodesEqual(
      expected,
      compoundWriteApply(compoundWrite, CHILDREN_NODE)
    );
  });

  it('can remove priority', () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('.priority'),
      PRIO_NODE
    );
    compoundWrite = compoundWriteRemoveWrite(
      compoundWrite,
      new Path('.priority')
    );
    assertNodeGetsCorrectPriority(compoundWrite, LEAF_NODE, EMPTY_NODE);
  });

  it('removing only affects removed path', () => {
    let compoundWrite = CompoundWrite.empty();
    const updates = {
      'child-1': nodeFromJSON('new-value-1'),
      'child-2': EMPTY_NODE,
      'child-3': nodeFromJSON('value-3')
    };
    compoundWrite = compoundWriteAddWrites(
      compoundWrite,
      newEmptyPath(),
      updates
    );
    compoundWrite = compoundWriteRemoveWrite(
      compoundWrite,
      new Path('child-2')
    );

    const expected = {
      'child-1': 'new-value-1',
      'child-2': 'value-2',
      'child-3': 'value-3'
    };
    assertNodesEqual(
      nodeFromJSON(expected),
      compoundWriteApply(compoundWrite, CHILDREN_NODE)
    );
  });

  it('remove removes all deeper sets', () => {
    let compoundWrite = CompoundWrite.empty();
    const updateTwo = nodeFromJSON('baz-value');
    const updateThree = nodeFromJSON('new-foo-value');
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1/baz'),
      updateTwo
    );
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1/foo'),
      updateThree
    );
    compoundWrite = compoundWriteRemoveWrite(
      compoundWrite,
      new Path('child-1')
    );
    assertNodesEqual(
      CHILDREN_NODE,
      compoundWriteApply(compoundWrite, CHILDREN_NODE)
    );
  });

  it('remove at root also removes priority', () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      newEmptyPath(),
      new LeafNode('foo', PRIO_NODE)
    );
    compoundWrite = compoundWriteRemoveWrite(compoundWrite, newEmptyPath());
    const node = nodeFromJSON('value');
    assertNodeGetsCorrectPriority(compoundWrite, node, EMPTY_NODE);
  });

  it('updating priority doesnt overwrite leaf node', () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      newEmptyPath(),
      LEAF_NODE
    );
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child/.priority'),
      PRIO_NODE
    );
    assertNodesEqual(LEAF_NODE, compoundWriteApply(compoundWrite, EMPTY_NODE));
  });

  it("updating empty node doesn't overwrite leaf node", () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      newEmptyPath(),
      LEAF_NODE
    );
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child'),
      EMPTY_NODE
    );
    assertNodesEqual(LEAF_NODE, compoundWriteApply(compoundWrite, EMPTY_NODE));
  });

  it('Overwrites existing child', () => {
    let compoundWrite = CompoundWrite.empty();
    const path = new Path('child-1');
    compoundWrite = compoundWriteAddWrite(compoundWrite, path, LEAF_NODE);
    expect(compoundWriteApply(compoundWrite, CHILDREN_NODE)).to.deep.equal(
      CHILDREN_NODE.updateImmediateChild(pathGetFront(path), LEAF_NODE)
    );
  });

  it('Updates existing child', () => {
    let compoundWrite = CompoundWrite.empty();
    const path = new Path('child-1/foo');
    compoundWrite = compoundWriteAddWrite(compoundWrite, path, LEAF_NODE);
    expect(compoundWriteApply(compoundWrite, CHILDREN_NODE)).to.deep.equal(
      CHILDREN_NODE.updateChild(path, LEAF_NODE)
    );
  });

  it("Doesn't update priority on empty node.", () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('.priority'),
      PRIO_NODE
    );
    assertNodeGetsCorrectPriority(compoundWrite, EMPTY_NODE, EMPTY_NODE);
  });

  it('Updates priority on node', () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('.priority'),
      PRIO_NODE
    );
    const node = nodeFromJSON('value');
    assertNodeGetsCorrectPriority(compoundWrite, node, PRIO_NODE);
  });

  it('Updates priority of child', () => {
    let compoundWrite = CompoundWrite.empty();
    const path = new Path('child-1/.priority');
    compoundWrite = compoundWriteAddWrite(compoundWrite, path, PRIO_NODE);
    assertNodesEqual(
      CHILDREN_NODE.updateChild(path, PRIO_NODE),
      compoundWriteApply(compoundWrite, CHILDREN_NODE)
    );
  });

  it("Doesn't update priority of nonexistent child.", () => {
    let compoundWrite = CompoundWrite.empty();
    const path = new Path('child-3/.priority');
    compoundWrite = compoundWriteAddWrite(compoundWrite, path, PRIO_NODE);
    assertNodesEqual(
      CHILDREN_NODE,
      compoundWriteApply(compoundWrite, CHILDREN_NODE)
    );
  });

  it('Deep update existing updates', () => {
    let compoundWrite = CompoundWrite.empty();
    const updateOne = nodeFromJSON({ foo: 'foo-value', bar: 'bar-value' });
    const updateTwo = nodeFromJSON('baz-value');
    const updateThree = nodeFromJSON('new-foo-value');
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1'),
      updateOne
    );
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1/baz'),
      updateTwo
    );
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1/foo'),
      updateThree
    );
    const expectedChildOne = {
      foo: 'new-foo-value',
      bar: 'bar-value',
      baz: 'baz-value'
    };
    const expected = CHILDREN_NODE.updateImmediateChild(
      'child-1',
      nodeFromJSON(expectedChildOne)
    );
    assertNodesEqual(
      expected,
      compoundWriteApply(compoundWrite, CHILDREN_NODE)
    );
  });

  it("child priority doesn't update empty node priority on child merge", () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1/.priority'),
      PRIO_NODE
    );
    assertNodeGetsCorrectPriority(
      compoundWriteChildCompoundWrite(compoundWrite, new Path('child-1')),
      EMPTY_NODE,
      EMPTY_NODE
    );
  });

  it('Child priority updates priority on child write', () => {
    let compoundWrite = CompoundWrite.empty();
    compoundWrite = compoundWriteAddWrite(
      compoundWrite,
      new Path('child-1/.priority'),
      PRIO_NODE
    );
    const node = nodeFromJSON('value');
    assertNodeGetsCorrectPriority(
      compoundWriteChildCompoundWrite(compoundWrite, new Path('child-1')),
      node,
      PRIO_NODE
    );
  });
});
