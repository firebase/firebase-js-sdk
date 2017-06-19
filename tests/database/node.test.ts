import { expect } from "chai";
import { PRIORITY_INDEX } from "../../src/database/core/snap/indexes/PriorityIndex";
import { LeafNode } from "../../src/database/core/snap/LeafNode";
import { IndexMap } from "../../src/database/core/snap/IndexMap";
import { Path } from "../../src/database/core/util/Path";
import { SortedMap } from "../../src/database/core/util/SortedMap";
import { ChildrenNode } from "../../src/database/core/snap/ChildrenNode";
import { NAME_COMPARATOR } from "../../src/database/core/snap/comparators";
import { nodeFromJSON } from "../../src/database/core/snap/nodeFromJSON";

describe('Node Tests', function() {
  var DEFAULT_INDEX = PRIORITY_INDEX;

  it('Create leaf nodes of various types.', function() {
    var x = new LeafNode(5, new LeafNode(42));
    expect(x.getValue()).to.equal(5);
    expect(x.getPriority().val()).to.equal(42);
    expect(x.isLeafNode()).to.equal(true);

    x = new LeafNode('test');
    expect(x.getValue()).to.equal('test');
    x = new LeafNode(true);
    expect(x.getValue()).to.equal(true);
  });

  it("LeafNode.updatePriority returns a new leaf node without changing the old.", function() {
    var x = new LeafNode("test", new LeafNode(42));
    var y = x.updatePriority(new LeafNode(187));

    // old node is the same.
    expect(x.getValue()).to.equal("test");
    expect(x.getPriority().val()).to.equal(42);

    // new node has the new priority but the old value.
    expect(y.getValue()).to.equal("test");
    expect(y.getPriority().val()).to.equal(187);
  });

  it("LeafNode.updateImmediateChild returns a new children node.", function() {
    var x = new LeafNode("test", new LeafNode(42));
    var y = x.updateImmediateChild('test', new LeafNode("foo"));

    expect(y.isLeafNode()).to.equal(false);
    expect(y.getPriority().val()).to.equal(42);
    expect(y.getImmediateChild('test').getValue()).to.equal('foo');
  });

  it("LeafNode.getImmediateChild returns an empty node.", function() {
    var x = new LeafNode("test");
    expect(x.getImmediateChild('foo')).to.equal(ChildrenNode.EMPTY_NODE);
  });

  it("LeafNode.getChild returns an empty node.", function() {
    var x = new LeafNode('test');
    expect(x.getChild(new Path('foo/bar'))).to.equal(ChildrenNode.EMPTY_NODE);
  });

  it('ChildrenNode.updatePriority returns a new internal node without changing the old.', function() {
    var x = ChildrenNode.EMPTY_NODE.updateImmediateChild("child", new LeafNode(5));
    var children = x.children_;
    var y = x.updatePriority(new LeafNode(17));
    expect(y.children_).to.equal(x.children_);
    expect(x.children_).to.equal(children);
    expect(x.getPriority().val()).to.equal(null);
    expect(y.getPriority().val()).to.equal(17);
  });

  it('ChildrenNode.updateImmediateChild returns a new internal node with the new child, without changing the old.',
      function() {
    var children = new SortedMap(NAME_COMPARATOR);
    var x = new ChildrenNode(children, ChildrenNode.EMPTY_NODE, IndexMap.Default);
    var newValue = new LeafNode('new value');
    var y = x.updateImmediateChild('test', newValue);
    expect(x.children_).to.equal(children);
    expect(y.children_.get('test')).to.equal(newValue);
  });

  it("ChildrenNode.updateChild returns a new internal node with the new child, without changing the old.", function() {
    var children = new SortedMap(NAME_COMPARATOR);
    var x = new ChildrenNode(children, ChildrenNode.EMPTY_NODE, IndexMap.Default);
    var newValue = new LeafNode("new value");
    var y = x.updateChild(new Path('test/foo'), newValue);
    expect(x.children_).to.equal(children);
    expect(y.getChild(new Path('test/foo'))).to.equal(newValue);
  });

  it("Node.hash() works correctly.", function() {
    var node = nodeFromJSON({
      intNode:4,
      doubleNode:4.5623,
      stringNode:"hey guys",
      boolNode:true
    });

    // !!!NOTE!!! These hashes must match what the server generates.  If you change anything so these hashes change,
    // make sure you change the corresponding server code.
    expect(node.getImmediateChild("intNode").hash()).to.equal("eVih19a6ZDz3NL32uVBtg9KSgQY=");
    expect(node.getImmediateChild("doubleNode").hash()).to.equal("vf1CL0tIRwXXunHcG/irRECk3lY=");
    expect(node.getImmediateChild("stringNode").hash()).to.equal("CUNLXWpCVoJE6z7z1vE57lGaKAU=");
    expect(node.getImmediateChild("boolNode").hash()).to.equal("E5z61QM0lN/U2WsOnusszCTkR8M=");

    expect(node.hash()).to.equal("6Mc4jFmNdrLVIlJJjz2/MakTK9I=");
  });

  it("Node.hash() works correctly with priorities.", function() {
    var node = nodeFromJSON({
      root: {c: {'.value': 99, '.priority': 'abc'}, '.priority': 'def'}
    });

    expect(node.hash()).to.equal("Fm6tzN4CVEu5WxFDZUdTtqbTVaA=");
  });

  it("Node.hash() works correctly with number priorities.", function() {
    var node = nodeFromJSON({
      root: {c: {'.value': 99, '.priority': 42}, '.priority': 3.14}
    });

    expect(node.hash()).to.equal("B15QCqrzCxrI5zz1y00arWqFRFg=");
  });

  it("Node.hash() stress...", function() {
    var node = nodeFromJSON({
      a:-1.7976931348623157e+308,
      b:1.7976931348623157e+308,
      c:"unicode ✔ 🐵 🌴 x͢",
      d:3.14159265358979323846264338327950,
      e: {
        '.value': 12345678901234568,
        '.priority': "🐵"
      },
      "✔": "foo",
      '.priority':"✔"
    });
    expect(node.getImmediateChild('a').hash()).to.equal('7HxgOBDEC92uQwhCuuvKA2rbXDA=');
    expect(node.getImmediateChild('b').hash()).to.equal('8R+ekVQmxs6ZWP0fdzFHxVeGnWo=');
    expect(node.getImmediateChild('c').hash()).to.equal('JoKoFUnbmg3/DlY70KaDWslfYPk=');
    expect(node.getImmediateChild('d').hash()).to.equal('Y41iC5+92GIqXfabOm33EanRI8s=');
    expect(node.getImmediateChild('e').hash()).to.equal('+E+Mxlqh5MhT+On05bjsZ6JaaxI=');
    expect(node.getImmediateChild('✔').hash()).to.equal('MRRL/+aA/uibaL//jghUpxXS/uY=');
    expect(node.hash()).to.equal('CyC0OU8GSkOAKnsPjheWtWC0Yxo=');
  });

  it("ChildrenNode.getPredecessorChild works correctly.", function() {
    var node = nodeFromJSON({
      d: true, a: true, g: true, c: true, e: true
    });

    // HACK: Pass null instead of the actual childNode, since it's not actually needed.
    expect(node.getPredecessorChildName('a', null, DEFAULT_INDEX)).to.equal(null);
    expect(node.getPredecessorChildName('c', null, DEFAULT_INDEX)).to.equal('a');
    expect(node.getPredecessorChildName('d', null, DEFAULT_INDEX)).to.equal('c');
    expect(node.getPredecessorChildName('e', null, DEFAULT_INDEX)).to.equal('d');
    expect(node.getPredecessorChildName('g', null, DEFAULT_INDEX)).to.equal('e');
  });

  it("SortedChildrenNode.getPredecessorChild works correctly.", function() {
    var node = nodeFromJSON({
      d: { '.value': true, '.priority' : 22 },
      a: { '.value': true, '.priority' : 25 },
      g: { '.value': true, '.priority' : 19 },
      c: { '.value': true, '.priority' : 23 },
      e: { '.value': true, '.priority' : 21 }
    });

    expect(node.getPredecessorChildName('a', node.getImmediateChild('a'), DEFAULT_INDEX)).to.equal('c');
    expect(node.getPredecessorChildName('c', node.getImmediateChild('c'), DEFAULT_INDEX)).to.equal('d');
    expect(node.getPredecessorChildName('d', node.getImmediateChild('d'), DEFAULT_INDEX)).to.equal('e');
    expect(node.getPredecessorChildName('e', node.getImmediateChild('e'), DEFAULT_INDEX)).to.equal('g');
    expect(node.getPredecessorChildName('g', node.getImmediateChild('g'), DEFAULT_INDEX)).to.equal(null);
  });

  it("SortedChildrenNode.updateImmediateChild works correctly.", function() {
    var node = nodeFromJSON({
      d: { '.value': true, '.priority' : 22 },
      a: { '.value': true, '.priority' : 25 },
      g: { '.value': true, '.priority' : 19 },
      c: { '.value': true, '.priority' : 23 },
      e: { '.value': true, '.priority' : 21 },
      '.priority' : 1000
    });

    node = node.updateImmediateChild('c', nodeFromJSON(false));
    expect(node.getImmediateChild('c').getValue()).to.equal(false);
    expect(node.getImmediateChild('c').getPriority().val()).to.equal(null);
    expect(node.getPriority().val()).to.equal(1000);
  });

  it("removing nodes correctly removes intermediate nodes with no remaining children", function() {
    var json = {a: {b: {c: 1}}};
    var node = nodeFromJSON(json);
    var newNode = node.updateChild(new Path('a/b/c'), ChildrenNode.EMPTY_NODE);
    expect(newNode.isEmpty()).to.equal(true);
  });

  it("removing nodes leaves intermediate nodes with other children", function() {
    var json = {a: {b: {c: 1}, d: 2}};
    var node = nodeFromJSON(json);
    var newNode = node.updateChild(new Path('a/b/c'), ChildrenNode.EMPTY_NODE);
    expect(newNode.isEmpty()).to.equal(false);
    expect(newNode.getChild(new Path('a/b/c')).isEmpty()).to.equal(true);
    expect(newNode.getChild(new Path('a/d')).val()).to.equal(2);
  });

  it("removing nodes leaves other leaf nodes", function() {
    var json = {a: {b: {c: 1, d: 2}}};
    var node = nodeFromJSON(json);
    var newNode = node.updateChild(new Path('a/b/c'), ChildrenNode.EMPTY_NODE);
    expect(newNode.isEmpty()).to.equal(false);
    expect(newNode.getChild(new Path('a/b/c')).isEmpty()).to.equal(true);
    expect(newNode.getChild(new Path('a/b/d')).val()).to.equal(2);
  });

  it("removing nodes correctly removes the root", function() {
    var json = null;
    var node = nodeFromJSON(json);
    var newNode = node.updateChild(new Path(''), ChildrenNode.EMPTY_NODE);
    expect(newNode.isEmpty()).to.equal(true);

    json = {a: 1};
    node = nodeFromJSON(json);
    newNode = node.updateChild(new Path('a'), ChildrenNode.EMPTY_NODE);
    expect(newNode.isEmpty()).to.equal(true);
  });

  it("ignores null values", function() {
    var json = {a: 1, b: null};
    var node = nodeFromJSON(json);
    expect(node.children_.get('b')).to.equal(null);
  });

  it("Leading zeroes in path are handled properly", function() {
    var json = {"1": 1, "01": 2, "001": 3};
    var tree = nodeFromJSON(json);
    expect(tree.getChild(new Path("1")).val()).to.equal(1);
    expect(tree.getChild(new Path("01")).val()).to.equal(2);
    expect(tree.getChild(new Path("001")).val()).to.equal(3);
  });

  it("Treats leading zeroes as objects, not array", function() {
    var json = {"3": 1, "03": 2};
    var tree = nodeFromJSON(json);
    var val = tree.val();
    expect(val).to.deep.equal(json);
  });

  it("Updating empty children doesn't overwrite leaf node", function() {
    var empty = ChildrenNode.EMPTY_NODE;
    var node = nodeFromJSON("value");
    expect(node).to.deep.equal(node.updateChild(new Path(".priority"), empty));
    expect(node).to.deep.equal(node.updateChild(new Path("child"), empty));
    expect(node).to.deep.equal(node.updateChild(new Path("child/.priority"), empty));
    expect(node).to.deep.equal(node.updateImmediateChild("child", empty));
    expect(node).to.deep.equal(node.updateImmediateChild(".priority", empty));
  });
});
