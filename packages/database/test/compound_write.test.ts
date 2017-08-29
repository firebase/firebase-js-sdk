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
import { ChildrenNode } from '../src/core/snap/ChildrenNode';
import { CompoundWrite } from '../src/core/CompoundWrite';
import { LeafNode } from '../src/core/snap/LeafNode';
import { NamedNode } from '../src/core/snap/Node';
import { nodeFromJSON } from '../src/core/snap/nodeFromJSON';
import { Path } from '../src/core/util/Path';

describe('CompoundWrite Tests', function() {
  const LEAF_NODE = nodeFromJSON('leaf-node');
  const PRIO_NODE = nodeFromJSON('prio');
  const CHILDREN_NODE = nodeFromJSON({
    'child-1': 'value-1',
    'child-2': 'value-2'
  });
  const EMPTY_NODE = ChildrenNode.EMPTY_NODE;

  function assertNodeGetsCorrectPriority(compoundWrite, node, priority) {
    if (node.isEmpty()) {
      expect(compoundWrite.apply(node)).to.equal(EMPTY_NODE);
    } else {
      expect(compoundWrite.apply(node)).to.deep.equal(
        node.updatePriority(priority)
      );
    }
  }

  function assertNodesEqual(expected, actual) {
    expect(actual.equals(expected)).to.be.true;
  }

  it('Empty merge is empty', function() {
    expect(CompoundWrite.Empty.isEmpty()).to.be.true;
  });

  it('CompoundWrite with priority update is not empty.', function() {
    expect(
      CompoundWrite.Empty.addWrite(new Path('.priority'), PRIO_NODE).isEmpty()
    ).to.be.false;
  });

  it('CompoundWrite with update is not empty.', function() {
    expect(
      CompoundWrite.Empty.addWrite(new Path('foo/bar'), LEAF_NODE).isEmpty()
    ).to.be.false;
  });

  it('CompoundWrite with root update is not empty.', function() {
    expect(CompoundWrite.Empty.addWrite(Path.Empty, LEAF_NODE).isEmpty()).to.be
      .false;
  });

  it('CompoundWrite with empty root update is not empty.', function() {
    expect(CompoundWrite.Empty.addWrite(Path.Empty, EMPTY_NODE).isEmpty()).to.be
      .false;
  });

  it('CompoundWrite with root priority update, child write is not empty.', function() {
    let compoundWrite = CompoundWrite.Empty.addWrite(
      new Path('.priority'),
      PRIO_NODE
    );
    expect(compoundWrite.childCompoundWrite(new Path('.priority')).isEmpty()).to
      .be.false;
  });

  it('Applies leaf overwrite', function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(Path.Empty, LEAF_NODE);
    expect(compoundWrite.apply(EMPTY_NODE)).to.equal(LEAF_NODE);
  });

  it('Applies children overwrite', function() {
    let compoundWrite = CompoundWrite.Empty;
    const childNode = EMPTY_NODE.updateImmediateChild('child', LEAF_NODE);
    compoundWrite = compoundWrite.addWrite(Path.Empty, childNode);
    expect(compoundWrite.apply(EMPTY_NODE)).to.equal(childNode);
  });

  it('Adds child node', function() {
    let compoundWrite = CompoundWrite.Empty;
    const expected = EMPTY_NODE.updateImmediateChild('child', LEAF_NODE);
    compoundWrite = compoundWrite.addWrite(new Path('child'), LEAF_NODE);
    assertNodesEqual(expected, compoundWrite.apply(EMPTY_NODE));
  });

  it('Adds deep child node', function() {
    let compoundWrite = CompoundWrite.Empty;
    const path = new Path('deep/deep/node');
    const expected = EMPTY_NODE.updateChild(path, LEAF_NODE);
    compoundWrite = compoundWrite.addWrite(path, LEAF_NODE);
    expect(compoundWrite.apply(EMPTY_NODE)).to.deep.equal(expected);
  });

  it('shallow update removes deep update', function() {
    let compoundWrite = CompoundWrite.Empty;
    const updateOne = nodeFromJSON('new-foo-value');
    const updateTwo = nodeFromJSON('baz-value');
    const updateThree = nodeFromJSON({ foo: 'foo-value', bar: 'bar-value' });
    compoundWrite = compoundWrite.addWrite(new Path('child-1/foo'), updateOne);
    compoundWrite = compoundWrite.addWrite(new Path('child-1/baz'), updateTwo);
    compoundWrite = compoundWrite.addWrite(new Path('child-1'), updateThree);
    const expectedChildOne = {
      foo: 'foo-value',
      bar: 'bar-value'
    };
    const expected = CHILDREN_NODE.updateImmediateChild(
      'child-1',
      nodeFromJSON(expectedChildOne)
    );
    assertNodesEqual(expected, compoundWrite.apply(CHILDREN_NODE));
  });

  it('child priority updates empty priority on child write', function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(
      new Path('child-1/.priority'),
      EMPTY_NODE
    );
    const node = new LeafNode('foo', PRIO_NODE);
    assertNodeGetsCorrectPriority(
      compoundWrite.childCompoundWrite(new Path('child-1')),
      node,
      EMPTY_NODE
    );
  });

  it('deep priority set works on empty node when other set is available', function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(
      new Path('foo/.priority'),
      PRIO_NODE
    );
    compoundWrite = compoundWrite.addWrite(new Path('foo/child'), LEAF_NODE);
    const node = compoundWrite.apply(EMPTY_NODE);
    assertNodesEqual(PRIO_NODE, node.getChild(new Path('foo')).getPriority());
  });

  it('child merge looks into update node', function() {
    let compoundWrite = CompoundWrite.Empty;
    const update = nodeFromJSON({ foo: 'foo-value', bar: 'bar-value' });
    compoundWrite = compoundWrite.addWrite(Path.Empty, update);
    assertNodesEqual(
      nodeFromJSON('foo-value'),
      compoundWrite.childCompoundWrite(new Path('foo')).apply(EMPTY_NODE)
    );
  });

  it('child merge removes node on deeper paths', function() {
    let compoundWrite = CompoundWrite.Empty;
    const update = nodeFromJSON({ foo: 'foo-value', bar: 'bar-value' });
    compoundWrite = compoundWrite.addWrite(Path.Empty, update);
    assertNodesEqual(
      EMPTY_NODE,
      compoundWrite
        .childCompoundWrite(new Path('foo/not/existing'))
        .apply(LEAF_NODE)
    );
  });

  it('child merge with empty path is same merge', function() {
    let compoundWrite = CompoundWrite.Empty;
    const update = nodeFromJSON({ foo: 'foo-value', bar: 'bar-value' });
    compoundWrite = compoundWrite.addWrite(Path.Empty, update);
    expect(compoundWrite.childCompoundWrite(Path.Empty)).to.equal(
      compoundWrite
    );
  });

  it('root update removes root priority', function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('.priority'), PRIO_NODE);
    compoundWrite = compoundWrite.addWrite(Path.Empty, nodeFromJSON('foo'));
    assertNodesEqual(nodeFromJSON('foo'), compoundWrite.apply(EMPTY_NODE));
  });

  it('deep update removes priority there', function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(
      new Path('foo/.priority'),
      PRIO_NODE
    );
    compoundWrite = compoundWrite.addWrite(
      new Path('foo'),
      nodeFromJSON('bar')
    );
    const expected = nodeFromJSON({ foo: 'bar' });
    assertNodesEqual(expected, compoundWrite.apply(EMPTY_NODE));
  });

  it('adding updates at path works', function() {
    let compoundWrite = CompoundWrite.Empty;
    const updates = {
      foo: nodeFromJSON('foo-value'),
      bar: nodeFromJSON('bar-value')
    };
    compoundWrite = compoundWrite.addWrites(new Path('child-1'), updates);

    const expectedChildOne = {
      foo: 'foo-value',
      bar: 'bar-value'
    };
    const expected = CHILDREN_NODE.updateImmediateChild(
      'child-1',
      nodeFromJSON(expectedChildOne)
    );
    assertNodesEqual(expected, compoundWrite.apply(CHILDREN_NODE));
  });

  it('adding updates at root works', function() {
    let compoundWrite = CompoundWrite.Empty;
    const updates = {
      'child-1': nodeFromJSON('new-value-1'),
      'child-2': EMPTY_NODE,
      'child-3': nodeFromJSON('value-3')
    };
    compoundWrite = compoundWrite.addWrites(Path.Empty, updates);

    const expected = {
      'child-1': 'new-value-1',
      'child-3': 'value-3'
    };
    assertNodesEqual(
      nodeFromJSON(expected),
      compoundWrite.apply(CHILDREN_NODE)
    );
  });

  it('child write of root priority works', function() {
    let compoundWrite = CompoundWrite.Empty.addWrite(
      new Path('.priority'),
      PRIO_NODE
    );
    assertNodesEqual(
      PRIO_NODE,
      compoundWrite.childCompoundWrite(new Path('.priority')).apply(EMPTY_NODE)
    );
  });

  it('complete children only returns complete overwrites', function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('child-1'), LEAF_NODE);
    expect(compoundWrite.getCompleteChildren()).to.deep.equal([
      new NamedNode('child-1', LEAF_NODE)
    ]);
  });

  it('complete children only returns empty overwrites', function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('child-1'), EMPTY_NODE);
    expect(compoundWrite.getCompleteChildren()).to.deep.equal([
      new NamedNode('child-1', EMPTY_NODE)
    ]);
  });

  it('complete children doesnt return deep overwrites', function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(
      new Path('child-1/deep/path'),
      LEAF_NODE
    );
    expect(compoundWrite.getCompleteChildren()).to.deep.equal([]);
  });

  it('complete children return all complete children but no incomplete', function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(
      new Path('child-1/deep/path'),
      LEAF_NODE
    );
    compoundWrite = compoundWrite.addWrite(new Path('child-2'), LEAF_NODE);
    compoundWrite = compoundWrite.addWrite(new Path('child-3'), EMPTY_NODE);
    const expected = {
      'child-2': LEAF_NODE,
      'child-3': EMPTY_NODE
    };
    const actual = {};
    const completeChildren = compoundWrite.getCompleteChildren();
    for (let i = 0; i < completeChildren.length; i++) {
      actual[completeChildren[i].name] = completeChildren[i].node;
    }
    expect(actual).to.deep.equal(expected);
  });

  it('complete children return all children for root set', function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(Path.Empty, CHILDREN_NODE);

    const expected = {
      'child-1': nodeFromJSON('value-1'),
      'child-2': nodeFromJSON('value-2')
    };

    const actual = {};
    const completeChildren = compoundWrite.getCompleteChildren();
    for (let i = 0; i < completeChildren.length; i++) {
      actual[completeChildren[i].name] = completeChildren[i].node;
    }
    expect(actual).to.deep.equal(expected);
  });

  it('empty merge has no shadowing write', function() {
    expect(CompoundWrite.Empty.hasCompleteWrite(Path.Empty)).to.be.false;
  });

  it('compound write with empty root has shadowing write', function() {
    let compoundWrite = CompoundWrite.Empty.addWrite(Path.Empty, EMPTY_NODE);
    expect(compoundWrite.hasCompleteWrite(Path.Empty)).to.be.true;
    expect(compoundWrite.hasCompleteWrite(new Path('child'))).to.be.true;
  });

  it('compound write with  root has shadowing write', function() {
    let compoundWrite = CompoundWrite.Empty.addWrite(Path.Empty, LEAF_NODE);
    expect(compoundWrite.hasCompleteWrite(Path.Empty)).to.be.true;
    expect(compoundWrite.hasCompleteWrite(new Path('child'))).to.be.true;
  });

  it('compound write with deep update has shadowing write', function() {
    let compoundWrite = CompoundWrite.Empty.addWrite(
      new Path('deep/update'),
      LEAF_NODE
    );
    expect(compoundWrite.hasCompleteWrite(Path.Empty)).to.be.false;
    expect(compoundWrite.hasCompleteWrite(new Path('deep'))).to.be.false;
    expect(compoundWrite.hasCompleteWrite(new Path('deep/update'))).to.be.true;
  });

  it('compound write with priority update has shadowing write', function() {
    let compoundWrite = CompoundWrite.Empty.addWrite(
      new Path('.priority'),
      PRIO_NODE
    );
    expect(compoundWrite.hasCompleteWrite(Path.Empty)).to.be.false;
    expect(compoundWrite.hasCompleteWrite(new Path('.priority'))).to.be.true;
  });

  it('updates can be removed', function() {
    let compoundWrite = CompoundWrite.Empty;
    const update = nodeFromJSON({ foo: 'foo-value', bar: 'bar-value' });
    compoundWrite = compoundWrite.addWrite(new Path('child-1'), update);
    compoundWrite = compoundWrite.removeWrite(new Path('child-1'));
    assertNodesEqual(CHILDREN_NODE, compoundWrite.apply(CHILDREN_NODE));
  });

  it('deep removes has no effect on overlaying set', function() {
    let compoundWrite = CompoundWrite.Empty;
    const updateOne = nodeFromJSON({ foo: 'foo-value', bar: 'bar-value' });
    const updateTwo = nodeFromJSON('baz-value');
    const updateThree = nodeFromJSON('new-foo-value');
    compoundWrite = compoundWrite.addWrite(new Path('child-1'), updateOne);
    compoundWrite = compoundWrite.addWrite(new Path('child-1/baz'), updateTwo);
    compoundWrite = compoundWrite.addWrite(
      new Path('child-1/foo'),
      updateThree
    );
    compoundWrite = compoundWrite.removeWrite(new Path('child-1/foo'));
    const expectedChildOne = {
      foo: 'new-foo-value',
      bar: 'bar-value',
      baz: 'baz-value'
    };
    const expected = CHILDREN_NODE.updateImmediateChild(
      'child-1',
      nodeFromJSON(expectedChildOne)
    );
    assertNodesEqual(expected, compoundWrite.apply(CHILDREN_NODE));
  });

  it('remove at path without set is without effect', function() {
    let compoundWrite = CompoundWrite.Empty;
    const updateOne = nodeFromJSON({ foo: 'foo-value', bar: 'bar-value' });
    const updateTwo = nodeFromJSON('baz-value');
    const updateThree = nodeFromJSON('new-foo-value');
    compoundWrite = compoundWrite.addWrite(new Path('child-1'), updateOne);
    compoundWrite = compoundWrite.addWrite(new Path('child-1/baz'), updateTwo);
    compoundWrite = compoundWrite.addWrite(
      new Path('child-1/foo'),
      updateThree
    );
    compoundWrite = compoundWrite.removeWrite(new Path('child-2'));
    const expectedChildOne = {
      foo: 'new-foo-value',
      bar: 'bar-value',
      baz: 'baz-value'
    };
    const expected = CHILDREN_NODE.updateImmediateChild(
      'child-1',
      nodeFromJSON(expectedChildOne)
    );
    assertNodesEqual(expected, compoundWrite.apply(CHILDREN_NODE));
  });

  it('can remove priority', function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('.priority'), PRIO_NODE);
    compoundWrite = compoundWrite.removeWrite(new Path('.priority'));
    assertNodeGetsCorrectPriority(compoundWrite, LEAF_NODE, EMPTY_NODE);
  });

  it('removing only affects removed path', function() {
    let compoundWrite = CompoundWrite.Empty;
    const updates = {
      'child-1': nodeFromJSON('new-value-1'),
      'child-2': EMPTY_NODE,
      'child-3': nodeFromJSON('value-3')
    };
    compoundWrite = compoundWrite.addWrites(Path.Empty, updates);
    compoundWrite = compoundWrite.removeWrite(new Path('child-2'));

    const expected = {
      'child-1': 'new-value-1',
      'child-2': 'value-2',
      'child-3': 'value-3'
    };
    assertNodesEqual(
      nodeFromJSON(expected),
      compoundWrite.apply(CHILDREN_NODE)
    );
  });

  it('remove removes all deeper sets', function() {
    let compoundWrite = CompoundWrite.Empty;
    const updateTwo = nodeFromJSON('baz-value');
    const updateThree = nodeFromJSON('new-foo-value');
    compoundWrite = compoundWrite.addWrite(new Path('child-1/baz'), updateTwo);
    compoundWrite = compoundWrite.addWrite(
      new Path('child-1/foo'),
      updateThree
    );
    compoundWrite = compoundWrite.removeWrite(new Path('child-1'));
    assertNodesEqual(CHILDREN_NODE, compoundWrite.apply(CHILDREN_NODE));
  });

  it('remove at root also removes priority', function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(
      Path.Empty,
      new LeafNode('foo', PRIO_NODE)
    );
    compoundWrite = compoundWrite.removeWrite(Path.Empty);
    const node = nodeFromJSON('value');
    assertNodeGetsCorrectPriority(compoundWrite, node, EMPTY_NODE);
  });

  it('updating priority doesnt overwrite leaf node', function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(Path.Empty, LEAF_NODE);
    compoundWrite = compoundWrite.addWrite(
      new Path('child/.priority'),
      PRIO_NODE
    );
    assertNodesEqual(LEAF_NODE, compoundWrite.apply(EMPTY_NODE));
  });

  it("updating empty node doesn't overwrite leaf node", function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(Path.Empty, LEAF_NODE);
    compoundWrite = compoundWrite.addWrite(new Path('child'), EMPTY_NODE);
    assertNodesEqual(LEAF_NODE, compoundWrite.apply(EMPTY_NODE));
  });

  it('Overwrites existing child', function() {
    let compoundWrite = CompoundWrite.Empty;
    const path = new Path('child-1');
    compoundWrite = compoundWrite.addWrite(path, LEAF_NODE);
    expect(compoundWrite.apply(CHILDREN_NODE)).to.deep.equal(
      CHILDREN_NODE.updateImmediateChild(path.getFront(), LEAF_NODE)
    );
  });

  it('Updates existing child', function() {
    let compoundWrite = CompoundWrite.Empty;
    const path = new Path('child-1/foo');
    compoundWrite = compoundWrite.addWrite(path, LEAF_NODE);
    expect(compoundWrite.apply(CHILDREN_NODE)).to.deep.equal(
      CHILDREN_NODE.updateChild(path, LEAF_NODE)
    );
  });

  it("Doesn't update priority on empty node.", function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('.priority'), PRIO_NODE);
    assertNodeGetsCorrectPriority(compoundWrite, EMPTY_NODE, EMPTY_NODE);
  });

  it('Updates priority on node', function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('.priority'), PRIO_NODE);
    const node = nodeFromJSON('value');
    assertNodeGetsCorrectPriority(compoundWrite, node, PRIO_NODE);
  });

  it('Updates priority of child', function() {
    let compoundWrite = CompoundWrite.Empty;
    const path = new Path('child-1/.priority');
    compoundWrite = compoundWrite.addWrite(path, PRIO_NODE);
    assertNodesEqual(
      CHILDREN_NODE.updateChild(path, PRIO_NODE),
      compoundWrite.apply(CHILDREN_NODE)
    );
  });

  it("Doesn't update priority of nonexistent child.", function() {
    let compoundWrite = CompoundWrite.Empty;
    const path = new Path('child-3/.priority');
    compoundWrite = compoundWrite.addWrite(path, PRIO_NODE);
    assertNodesEqual(CHILDREN_NODE, compoundWrite.apply(CHILDREN_NODE));
  });

  it('Deep update existing updates', function() {
    let compoundWrite = CompoundWrite.Empty;
    const updateOne = nodeFromJSON({ foo: 'foo-value', bar: 'bar-value' });
    const updateTwo = nodeFromJSON('baz-value');
    const updateThree = nodeFromJSON('new-foo-value');
    compoundWrite = compoundWrite.addWrite(new Path('child-1'), updateOne);
    compoundWrite = compoundWrite.addWrite(new Path('child-1/baz'), updateTwo);
    compoundWrite = compoundWrite.addWrite(
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
    assertNodesEqual(expected, compoundWrite.apply(CHILDREN_NODE));
  });

  it("child priority doesn't update empty node priority on child merge", function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(
      new Path('child-1/.priority'),
      PRIO_NODE
    );
    assertNodeGetsCorrectPriority(
      compoundWrite.childCompoundWrite(new Path('child-1')),
      EMPTY_NODE,
      EMPTY_NODE
    );
  });

  it('Child priority updates priority on child write', function() {
    let compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(
      new Path('child-1/.priority'),
      PRIO_NODE
    );
    const node = nodeFromJSON('value');
    assertNodeGetsCorrectPriority(
      compoundWrite.childCompoundWrite(new Path('child-1')),
      node,
      PRIO_NODE
    );
  });
});
