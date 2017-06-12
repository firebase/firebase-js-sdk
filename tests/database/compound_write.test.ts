import { expect } from "chai";
import { ChildrenNode } from "../../src/database/core/snap/ChildrenNode";
import { CompoundWrite } from "../../src/database/core/CompoundWrite";
import { LeafNode } from "../../src/database/core/snap/LeafNode";
import { NamedNode } from "../../src/database/core/snap/Node";
import { nodeFromJSON } from "../../src/database/core/snap/nodeFromJSON";
import { Path } from "../../src/database/core/util/Path";

describe.only('CompoundWrite Tests', function() {
  var LEAF_NODE = nodeFromJSON('leaf-node');
  var PRIO_NODE = nodeFromJSON('prio');
  var CHILDREN_NODE = nodeFromJSON({ 'child-1': 'value-1', 'child-2': 'value-2' });
  var EMPTY_NODE = ChildrenNode.EMPTY_NODE;

  function assertNodeGetsCorrectPriority(compoundWrite, node, priority) {
    if (node.isEmpty()) {
      expect(compoundWrite.apply(node)).to.be(EMPTY_NODE);
    } else {
      expect(compoundWrite.apply(node)).to.equal(node.updatePriority(priority));
    }
  }
  
  function assertNodesEqual(expected, actual) {
    expect(actual.equals(expected)).to.be.true;
  }

  it('Empty merge is empty', function() {
    expect(CompoundWrite.Empty.isEmpty()).to.be.true;
  });

  it('CompoundWrite with priority update is not empty.', function() {
    expect(CompoundWrite.Empty.addWrite(new Path('.priority'), PRIO_NODE).isEmpty()).to.be.false;
  });

  it('CompoundWrite with update is not empty.', function() {
    expect(CompoundWrite.Empty.addWrite(new Path('foo/bar'), LEAF_NODE).isEmpty()).to.be.false;
  });

  it('CompoundWrite with root update is not empty.', function() {
    expect(CompoundWrite.Empty.addWrite(Path.Empty, LEAF_NODE).isEmpty()).to.be.false;
  });

  it('CompoundWrite with empty root update is not empty.', function() {
    expect(CompoundWrite.Empty.addWrite(Path.Empty, EMPTY_NODE).isEmpty()).to.be.false;
  });

  it('CompoundWrite with root priority update, child write is not empty.', function() {
    var compoundWrite = CompoundWrite.Empty.addWrite(new Path('.priority'), PRIO_NODE);
    expect(compoundWrite.childCompoundWrite(new Path('.priority')).isEmpty()).to.be.false;
  });

  it('Applies leaf overwrite', function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(Path.Empty, LEAF_NODE);
    expect(compoundWrite.apply(EMPTY_NODE)).to.equal(LEAF_NODE);
  });

  it('Applies children overwrite', function() {
    var compoundWrite = CompoundWrite.Empty;
    var childNode = EMPTY_NODE.updateImmediateChild('child', LEAF_NODE);
    compoundWrite = compoundWrite.addWrite(Path.Empty, childNode);
    expect(compoundWrite.apply(EMPTY_NODE)).to.equal(childNode);
  });

  it('Adds child node', function() {
    var compoundWrite = CompoundWrite.Empty;
    var expected = EMPTY_NODE.updateImmediateChild('child', LEAF_NODE);
    compoundWrite = compoundWrite.addWrite(new Path('child'), LEAF_NODE);
    assertNodesEqual(expected, compoundWrite.apply(EMPTY_NODE));
  });

  it('Adds deep child node', function() {
    var compoundWrite = CompoundWrite.Empty;
    var path = new Path('deep/deep/node');
    var expected = EMPTY_NODE.updateChild(path, LEAF_NODE);
    compoundWrite = compoundWrite.addWrite(path, LEAF_NODE);
    expect(compoundWrite.apply(EMPTY_NODE)).to.equal(expected);
  });

  it('shallow update removes deep update', function() {
    var compoundWrite = CompoundWrite.Empty;
    var updateOne = nodeFromJSON('new-foo-value');
    var updateTwo = nodeFromJSON('baz-value');
    var updateThree = nodeFromJSON({'foo': 'foo-value', 'bar': 'bar-value' });
    compoundWrite = compoundWrite.addWrite(new Path('child-1/foo'), updateOne);
    compoundWrite = compoundWrite.addWrite(new Path('child-1/baz'), updateTwo);
    compoundWrite = compoundWrite.addWrite(new Path('child-1'), updateThree);
    var expectedChildOne = {
        'foo': 'foo-value',
        'bar': 'bar-value'
    };
    var expected = CHILDREN_NODE.updateImmediateChild('child-1',
        nodeFromJSON(expectedChildOne));
    assertNodesEqual(expected, compoundWrite.apply(CHILDREN_NODE));
  });

  it('child priority updates empty priority on child write', function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('child-1/.priority'), EMPTY_NODE);
    var node = new LeafNode('foo', PRIO_NODE);
    assertNodeGetsCorrectPriority(compoundWrite.childCompoundWrite(new Path('child-1')), node, EMPTY_NODE);
  });

  it('deep priority set works on empty node when other set is available', function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('foo/.priority'), PRIO_NODE);
    compoundWrite = compoundWrite.addWrite(new Path('foo/child'), LEAF_NODE);
    var node = compoundWrite.apply(EMPTY_NODE);
    assertNodesEqual(PRIO_NODE, node.getChild(new Path('foo')).getPriority());
  });

  it('child merge looks into update node', function() {
    var compoundWrite = CompoundWrite.Empty;
    var update = nodeFromJSON({ 'foo': 'foo-value', 'bar': 'bar-value'});
    compoundWrite = compoundWrite.addWrite(Path.Empty, update);
    assertNodesEqual(nodeFromJSON('foo-value'),
        compoundWrite.childCompoundWrite(new Path('foo')).apply(EMPTY_NODE));
  });

  it('child merge removes node on deeper paths', function() {
    var compoundWrite = CompoundWrite.Empty;
    var update = nodeFromJSON({ 'foo': 'foo-value', 'bar': 'bar-value' });
    compoundWrite = compoundWrite.addWrite(Path.Empty, update);
    assertNodesEqual(EMPTY_NODE, compoundWrite.childCompoundWrite(new Path('foo/not/existing')).apply(LEAF_NODE));
  });

  it('child merge with empty path is same merge', function() {
    var compoundWrite = CompoundWrite.Empty;
    var update = nodeFromJSON({ 'foo': 'foo-value', 'bar': 'bar-value' });
    compoundWrite = compoundWrite.addWrite(Path.Empty, update);
    expect(compoundWrite.childCompoundWrite(Path.Empty)).to.equal(compoundWrite);
  });

  it('root update removes root priority', function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('.priority'), PRIO_NODE);
    compoundWrite = compoundWrite.addWrite(Path.Empty, nodeFromJSON('foo'));
    assertNodesEqual(nodeFromJSON('foo'), compoundWrite.apply(EMPTY_NODE));
  });

  it('deep update removes priority there', function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('foo/.priority'), PRIO_NODE);
    compoundWrite = compoundWrite.addWrite(new Path('foo'), nodeFromJSON('bar'));
    var expected = nodeFromJSON({ 'foo': 'bar' });
    assertNodesEqual(expected, compoundWrite.apply(EMPTY_NODE));
  });

  it('adding updates at path works', function() {
    var compoundWrite = CompoundWrite.Empty;
    var updates = {
      'foo': nodeFromJSON('foo-value'),
      'bar': nodeFromJSON('bar-value')
    };
    compoundWrite = compoundWrite.addWrites(new Path('child-1'), updates);

    var expectedChildOne = {
        'foo': 'foo-value',
        'bar': 'bar-value'
    };
    var expected = CHILDREN_NODE.updateImmediateChild('child-1', nodeFromJSON(expectedChildOne));
    assertNodesEqual(expected, compoundWrite.apply(CHILDREN_NODE));
  });

  it('adding updates at root works', function() {
    var compoundWrite = CompoundWrite.Empty;
    var updates = {
      'child-1': nodeFromJSON('new-value-1'),
      'child-2': EMPTY_NODE,
      'child-3': nodeFromJSON('value-3')
    };
    compoundWrite = compoundWrite.addWrites(Path.Empty, updates);

    var expected = {
        'child-1': 'new-value-1',
        'child-3': 'value-3'
    };
    assertNodesEqual(nodeFromJSON(expected), compoundWrite.apply(CHILDREN_NODE));
  });

  it('child write of root priority works', function() {
    var compoundWrite = CompoundWrite.Empty.addWrite(new Path('.priority'), PRIO_NODE);
    assertNodesEqual(PRIO_NODE, compoundWrite.childCompoundWrite(new Path('.priority')).apply(EMPTY_NODE));
  });

  it('complete children only returns complete overwrites', function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('child-1'), LEAF_NODE);
    expect(compoundWrite.getCompleteChildren()).to.equal([new NamedNode('child-1', LEAF_NODE)]);
  });

  it('complete children only returns empty overwrites', function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('child-1'), EMPTY_NODE);
    expect(compoundWrite.getCompleteChildren()).to.equal([new NamedNode('child-1', EMPTY_NODE)]);
  });

  it('complete children doesnt return deep overwrites', function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('child-1/deep/path'), LEAF_NODE);
    expect(compoundWrite.getCompleteChildren()).to.equal([]);
  });

  it('complete children return all complete children but no incomplete', function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('child-1/deep/path'), LEAF_NODE);
    compoundWrite = compoundWrite.addWrite(new Path('child-2'), LEAF_NODE);
    compoundWrite = compoundWrite.addWrite(new Path('child-3'), EMPTY_NODE);
    var expected = {
      'child-2': LEAF_NODE,
      'child-3': EMPTY_NODE
    };
    var actual = { };
    var completeChildren = compoundWrite.getCompleteChildren();
    for (var i = 0; i < completeChildren.length; i++) {
      actual[completeChildren[i].name] = completeChildren[i].node;
    }
    expect(actual).to.equal(expected);
  });

  it('complete children return all children for root set', function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(Path.Empty, CHILDREN_NODE);

    var expected = {
      'child-1': nodeFromJSON('value-1'),
      'child-2': nodeFromJSON('value-2')
    };

    var actual = { };
    var completeChildren = compoundWrite.getCompleteChildren();
    for (var i = 0; i < completeChildren.length; i++) {
      actual[completeChildren[i].name] = completeChildren[i].node;
    }
    expect(actual).to.equal(expected);
  });

  it('empty merge has no shadowing write', function() {
    expect(CompoundWrite.Empty.hasCompleteWrite(Path.Empty)).to.be.false;
  });

  it('compound write with empty root has shadowing write', function() {
    var compoundWrite = CompoundWrite.Empty.addWrite(Path.Empty, EMPTY_NODE);
    expect(compoundWrite.hasCompleteWrite(Path.Empty)).to.be.true;
    expect(compoundWrite.hasCompleteWrite(new Path('child'))).to.be.true;
  });

  it('compound write with  root has shadowing write', function() {
    var compoundWrite = CompoundWrite.Empty.addWrite(Path.Empty, LEAF_NODE);
    expect(compoundWrite.hasCompleteWrite(Path.Empty)).to.be.true;
    expect(compoundWrite.hasCompleteWrite(new Path('child'))).to.be.true;
  });

  it('compound write with deep update has shadowing write', function() {
    var compoundWrite = CompoundWrite.Empty.addWrite(new Path('deep/update'), LEAF_NODE);
    expect(compoundWrite.hasCompleteWrite(Path.Empty)).to.be.false;
    expect(compoundWrite.hasCompleteWrite(new Path('deep'))).to.be.false;
    expect(compoundWrite.hasCompleteWrite(new Path('deep/update'))).to.be.true;
  });

  it('compound write with priority update has shadowing write', function() {
    var compoundWrite = CompoundWrite.Empty.addWrite(new Path('.priority'), PRIO_NODE);
    expect(compoundWrite.hasCompleteWrite(Path.Empty)).to.be.false;
    expect(compoundWrite.hasCompleteWrite(new Path('.priority'))).to.be.true;
  });

  it('updates can be removed', function() {
    var compoundWrite = CompoundWrite.Empty;
    var update = nodeFromJSON({ 'foo': 'foo-value', 'bar': 'bar-value' });
    compoundWrite = compoundWrite.addWrite(new Path('child-1'), update);
    compoundWrite = compoundWrite.removeWrite(new Path('child-1'));
    assertNodesEqual(CHILDREN_NODE, compoundWrite.apply(CHILDREN_NODE));
  });

  it('deep removes has no effect on overlaying set', function() {
    var compoundWrite = CompoundWrite.Empty;
    var updateOne = nodeFromJSON({ 'foo': 'foo-value', 'bar': 'bar-value' });
    var updateTwo = nodeFromJSON('baz-value');
    var updateThree = nodeFromJSON('new-foo-value');
    compoundWrite = compoundWrite.addWrite(new Path('child-1'), updateOne);
    compoundWrite = compoundWrite.addWrite(new Path('child-1/baz'), updateTwo);
    compoundWrite = compoundWrite.addWrite(new Path('child-1/foo'), updateThree);
    compoundWrite = compoundWrite.removeWrite(new Path('child-1/foo'));
    var expectedChildOne = {
        'foo': 'new-foo-value',
        'bar': 'bar-value',
        'baz': 'baz-value'
    };
    var expected = CHILDREN_NODE.updateImmediateChild('child-1', nodeFromJSON(expectedChildOne));
    assertNodesEqual(expected, compoundWrite.apply(CHILDREN_NODE));
  });

  it('remove at path without set is without effect', function() {
    var compoundWrite = CompoundWrite.Empty;
    var updateOne = nodeFromJSON({ 'foo': 'foo-value', 'bar': 'bar-value' });
    var updateTwo = nodeFromJSON('baz-value');
    var updateThree = nodeFromJSON('new-foo-value');
    compoundWrite = compoundWrite.addWrite(new Path('child-1'), updateOne);
    compoundWrite = compoundWrite.addWrite(new Path('child-1/baz'), updateTwo);
    compoundWrite = compoundWrite.addWrite(new Path('child-1/foo'), updateThree);
    compoundWrite = compoundWrite.removeWrite(new Path('child-2'));
    var expectedChildOne = {
        'foo': 'new-foo-value',
        'bar': 'bar-value',
        'baz': 'baz-value'
    };
    var expected = CHILDREN_NODE.updateImmediateChild('child-1', nodeFromJSON(expectedChildOne));
    assertNodesEqual(expected, compoundWrite.apply(CHILDREN_NODE));
  });

  it('can remove priority', function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('.priority'), PRIO_NODE);
    compoundWrite = compoundWrite.removeWrite(new Path('.priority'));
    assertNodeGetsCorrectPriority(compoundWrite, LEAF_NODE, EMPTY_NODE);
  });

  it('removing only affects removed path', function() {
    var compoundWrite = CompoundWrite.Empty;
    var updates = {
        'child-1': nodeFromJSON('new-value-1'),
        'child-2': EMPTY_NODE,
        'child-3': nodeFromJSON('value-3')
    };
    compoundWrite = compoundWrite.addWrites(Path.Empty, updates);
    compoundWrite = compoundWrite.removeWrite(new Path('child-2'));

    var expected = {
        'child-1': 'new-value-1',
        'child-2': 'value-2',
        'child-3': 'value-3'
    };
    assertNodesEqual(nodeFromJSON(expected), compoundWrite.apply(CHILDREN_NODE));
  });

  it('remove removes all deeper sets', function() {
    var compoundWrite = CompoundWrite.Empty;
    var updateTwo = nodeFromJSON('baz-value');
    var updateThree = nodeFromJSON('new-foo-value');
    compoundWrite = compoundWrite.addWrite(new Path('child-1/baz'), updateTwo);
    compoundWrite = compoundWrite.addWrite(new Path('child-1/foo'), updateThree);
    compoundWrite = compoundWrite.removeWrite(new Path('child-1'));
    assertNodesEqual(CHILDREN_NODE, compoundWrite.apply(CHILDREN_NODE));
  });

  it('remove at root also removes priority', function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(Path.Empty, new LeafNode('foo', PRIO_NODE));
    compoundWrite = compoundWrite.removeWrite(Path.Empty);
    var node = nodeFromJSON('value');
    assertNodeGetsCorrectPriority(compoundWrite, node, EMPTY_NODE);
  });

  it('updating priority doesnt overwrite leaf node', function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(Path.Empty, LEAF_NODE);
    compoundWrite = compoundWrite.addWrite(new Path('child/.priority'), PRIO_NODE);
    assertNodesEqual(LEAF_NODE, compoundWrite.apply(EMPTY_NODE));
  });

  it("updating empty node doesn't overwrite leaf node", function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(Path.Empty, LEAF_NODE);
    compoundWrite = compoundWrite.addWrite(new Path('child'), EMPTY_NODE);
    assertNodesEqual(LEAF_NODE, compoundWrite.apply(EMPTY_NODE));
  });

  it('Overwrites existing child', function() {
    var compoundWrite = CompoundWrite.Empty;
    var path = new Path('child-1');
    compoundWrite = compoundWrite.addWrite(path, LEAF_NODE);
    expect(compoundWrite.apply(CHILDREN_NODE)).to.equal(CHILDREN_NODE.updateImmediateChild(path.getFront(), LEAF_NODE));
  });

  it('Updates existing child', function() {
    var compoundWrite = CompoundWrite.Empty;
    var path = new Path('child-1/foo');
    compoundWrite = compoundWrite.addWrite(path, LEAF_NODE);
    expect(compoundWrite.apply(CHILDREN_NODE)).to.equal(CHILDREN_NODE.updateChild(path, LEAF_NODE));
  });

  it("Doesn't update priority on empty node.", function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('.priority'), PRIO_NODE);
    assertNodeGetsCorrectPriority(compoundWrite, EMPTY_NODE, EMPTY_NODE);
  });

  it('Updates priority on node', function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('.priority'), PRIO_NODE);
    var node = nodeFromJSON('value');
    assertNodeGetsCorrectPriority(compoundWrite, node, PRIO_NODE);
  });

  it('Updates priority of child', function() {
    var compoundWrite = CompoundWrite.Empty;
    var path = new Path('child-1/.priority');
    compoundWrite = compoundWrite.addWrite(path, PRIO_NODE);
    assertNodesEqual(CHILDREN_NODE.updateChild(path, PRIO_NODE), compoundWrite.apply(CHILDREN_NODE));
  });

  it("Doesn't update priority of nonexistent child.", function() {
    var compoundWrite = CompoundWrite.Empty;
    var path = new Path('child-3/.priority');
    compoundWrite = compoundWrite.addWrite(path, PRIO_NODE);
    assertNodesEqual(CHILDREN_NODE, compoundWrite.apply(CHILDREN_NODE));
  });

  it('Deep update existing updates', function() {
    var compoundWrite = CompoundWrite.Empty;
    var updateOne = nodeFromJSON({ 'foo': 'foo-value', 'bar': 'bar-value' });
    var updateTwo = nodeFromJSON('baz-value');
    var updateThree = nodeFromJSON('new-foo-value');
    compoundWrite = compoundWrite.addWrite(new Path('child-1'), updateOne);
    compoundWrite = compoundWrite.addWrite(new Path('child-1/baz'), updateTwo);
    compoundWrite = compoundWrite.addWrite(new Path('child-1/foo'), updateThree);
    var expectedChildOne = {
        'foo': 'new-foo-value',
        'bar': 'bar-value',
        'baz': 'baz-value'
    };
    var expected = CHILDREN_NODE.updateImmediateChild('child-1', nodeFromJSON(expectedChildOne));
    assertNodesEqual(expected, compoundWrite.apply(CHILDREN_NODE));
  });

  it("child priority doesn't update empty node priority on child merge", function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('child-1/.priority'), PRIO_NODE);
    assertNodeGetsCorrectPriority(compoundWrite.childCompoundWrite(new Path('child-1')), EMPTY_NODE, EMPTY_NODE);
  });

  it('Child priority updates priority on child write', function() {
    var compoundWrite = CompoundWrite.Empty;
    compoundWrite = compoundWrite.addWrite(new Path('child-1/.priority'), PRIO_NODE);
    var node = nodeFromJSON('value');
    assertNodeGetsCorrectPriority(compoundWrite.childCompoundWrite(new Path('child-1')), node, PRIO_NODE);
  });
});