import { expect } from "chai";
import { 
  SortedMap,
  LLRBNode
} from "../../src/database/core/util/SortedMap";
import { shuffle } from "./helpers/util";


// Many of these were adapted from the mugs source code.
// http://mads379.github.com/mugs/
describe("SortedMap Tests", function() {
  var defaultCmp = function(a, b) {
    if (a === b) {
      return 0;
    } else if (a < b) {
      return -1;
    } else {
      return 1;
    }
  };

  it("Create node", function() {
    var map = new SortedMap(defaultCmp).insert("key", "value");
    expect(map.root_.left.isEmpty()).to.equal(true);
    expect(map.root_.right.isEmpty()).to.equal(true);
  });

  it("You can search a map for a specific key", function() {
    var map = new SortedMap(defaultCmp).insert(1,1).insert(2,2);
    expect(map.get(1)).to.equal(1);
    expect(map.get(2)).to.equal(2);
    expect(map.get(3)).to.equal(null);
  });

  it("You can insert a new key/value pair into the tree", function() {
    var map = new SortedMap(defaultCmp).insert(1,1).insert(2,2);
    expect(map.root_.key).to.equal(2);
    expect(map.root_.left.key).to.equal(1);
  });

  it("You can remove a key/value pair from the map",function() {
    var map = new SortedMap(defaultCmp).insert(1,1).insert(2,2);
    var newMap = map.remove(1);
    expect(newMap.get(2)).to.equal(2);
    expect(newMap.get(1)).to.equal(null);
  });

  it("More removals",function(){
    var map = new SortedMap(defaultCmp)
        .insert(1,1)
        .insert(50,50)
        .insert(3,3)
        .insert(4,4)
        .insert(7,7)
        .insert(9,9)
        .insert(20,20)
        .insert(18,18)
        .insert(2,2)
        .insert(71,71)
        .insert(42,42)
        .insert(88,88);

    var m1 = map.remove(7);
    var m2 = m1.remove(3);
    var m3 = m2.remove(1);
    expect(m3.count()).to.equal(9);
    expect(m3.get(1)).to.equal(null);
    expect(m3.get(3)).to.equal(null);
    expect(m3.get(7)).to.equal(null);
    expect(m3.get(20)).to.equal(20);
  });

  it("Removal bug", function() {
    var map = new SortedMap(defaultCmp)
        .insert(1, 1)
        .insert(2, 2)
        .insert(3, 3);

    var m1 = map.remove(2);
    expect(m1.get(1)).to.equal(1);
    expect(m1.get(3)).to.equal(3);
  });

  it("Test increasing", function(){
    var total = 100;
    var item;
    var map = new SortedMap(defaultCmp).insert(1,1);
    for (item = 2; item < total ; item++) {
      map = map.insert(item,item);
    }
    expect(map.root_.checkMaxDepth_()).to.equal(true);
    for (item = 2; item < total ; item++) {
      map = map.remove(item);
    }
    expect(map.root_.checkMaxDepth_()).to.equal(true);
  });

  it("The structure should be valid after insertion (1)",function(){
    var map = new SortedMap(defaultCmp).insert(1,1).insert(2,2).insert(3,3);

    expect(map.root_.key).to.equal(2);
    expect(map.root_.left.key).to.equal(1);
    expect(map.root_.right.key).to.equal(3);
  });

  it("The structure should be valid after insertion (2)",function(){
    var map = new SortedMap(defaultCmp)
        .insert(1,1)
        .insert(2,2)
        .insert(3,3)
        .insert(4,4)
        .insert(5,5)
        .insert(6,6)
        .insert(7,7)
        .insert(8,8)
        .insert(9,9)
        .insert(10,10)
        .insert(11,11)
        .insert(12,12);

    expect(map.count()).to.equal(12);
    expect(map.root_.checkMaxDepth_()).to.equal(true);
  });

  it("Rotate left leaves the tree in a valid state",function(){
    var node = new LLRBNode(4,4,false,
        new LLRBNode(2,2,false,null, null),
        new LLRBNode(7,7,true,
            new LLRBNode(5,5,false,null,null),
            new LLRBNode(8,8,false,null,null)));

    var node2 = node.rotateLeft_();
    expect(node2.count()).to.equal(5);
    expect(node2.checkMaxDepth_()).to.equal(true);
  });

  it("Rotate right leaves the tree in a valid state", function(){
    var node = new LLRBNode(7,7,false,
        new LLRBNode(4,4,true,
            new LLRBNode(2,2,false, null, null),
            new LLRBNode(5,5,false, null, null)),
        new LLRBNode(8,8,false, null, null));

    var node2 = node.rotateRight_();
    expect(node2.count()).to.equal(5);
    expect(node2.key).to.equal(4);
    expect(node2.left.key).to.equal(2);
    expect(node2.right.key).to.equal(7);
    expect(node2.right.left.key).to.equal(5);
    expect(node2.right.right.key).to.equal(8);
  });

  it("The structure should be valid after insertion (3)",function(){
    var map = new SortedMap(defaultCmp)
        .insert(1,1)
        .insert(50,50)
        .insert(3,3)
        .insert(4,4)
        .insert(7,7)
        .insert(9,9);

    expect(map.count()).to.equal(6);
    expect(map.root_.checkMaxDepth_()).to.equal(true);

    var m2 = map
        .insert(20,20)
        .insert(18,18)
        .insert(2,2);

    expect(m2.count()).to.equal(9);
    expect(m2.root_.checkMaxDepth_()).to.equal(true);

    var m3 = m2
        .insert(71,71)
        .insert(42,42)
        .insert(88,88);

    expect(m3.count()).to.equal(12);
    expect(m3.root_.checkMaxDepth_()).to.equal(true);
  });

  it("you can overwrite a value",function(){
    var map = new SortedMap(defaultCmp).insert(10,10).insert(10,8);
    expect(map.get(10)).to.equal(8);
  });

  it("removing the last element returns an empty map",function() {
    var map = new SortedMap(defaultCmp).insert(10,10).remove(10);
    expect(map.isEmpty()).to.equal(true);
  });

  it("empty .get()",function() {
    var empty = new SortedMap(defaultCmp);
    expect(empty.get("something")).to.equal(null);
  });

  it("empty .count()",function() {
    var empty = new SortedMap(defaultCmp);
    expect(empty.count()).to.equal(0);
  });

  it("empty .remove()",function() {
    var empty = new SortedMap(defaultCmp);
    expect(empty.remove("something").count()).to.equal(0);
  });

  it(".reverseTraversal() works.", function() {
    var map = new SortedMap(defaultCmp).insert(1, 1).insert(5, 5).insert(3, 3).insert(2, 2).insert(4, 4);
    var next = 5;
    map.reverseTraversal(function(key, value) {
      expect(key).to.equal(next);
      next--;
    });
    expect(next).to.equal(0);
  });

  it("insertion and removal of 100 items in random order.", function() {
    var N = 100;
    var toInsert = [], toRemove = [];
    for(var i = 0; i < N; i++) {
      toInsert.push(i);
      toRemove.push(i);
    }

    shuffle(toInsert);
    shuffle(toRemove);

    var map = new SortedMap(defaultCmp);

    for (i = 0 ; i < N ; i++ ) {
      map = map.insert(toInsert[i], toInsert[i]);
      expect(map.root_.checkMaxDepth_()).to.equal(true);
    }
    expect(map.count()).to.equal(N);

    // Ensure order is correct.
    var next = 0;
    map.inorderTraversal(function(key, value) {
      expect(key).to.equal(next);
      expect(value).to.equal(next);
      next++;
    });
    expect(next).to.equal(N);

    for (i = 0 ; i < N ; i++ ) {
      expect(map.root_.checkMaxDepth_()).to.equal(true);
      map = map.remove(toRemove[i]);
    }
    expect(map.count()).to.equal(0);
  });

  // A little perf test for convenient benchmarking.
  xit("Perf", function() {
    for(var j = 0; j < 5; j++) {
      var map = new SortedMap(defaultCmp);
      var start = new Date().getTime();
      for(var i = 0; i < 50000; i++) {
        map = map.insert(i, i);
      }

      for(var i = 0; i < 50000; i++) {
        map = map.remove(i);
      }
      var end = new Date().getTime();
      // console.log(end-start);
    }
  });

  xit("Perf: Insertion and removal with various # of items.", function() {
    var verifyTraversal = function(map, max) {
      var next = 0;
      map.inorderTraversal(function(key, value) {
        expect(key).to.equal(next);
        expect(value).to.equal(next);
        next++;
      });
      expect(next).to.equal(max);
    };

    for(var N = 10; N <= 100000; N *= 10) {
      var toInsert = [], toRemove = [];
      for(var i = 0; i < N; i++) {
        toInsert.push(i);
        toRemove.push(i);
      }

      shuffle(toInsert);
      shuffle(toRemove);

      var map = new SortedMap(defaultCmp);

      var start = new Date().getTime();
      for (i = 0 ; i < N ; i++ ) {
        map = map.insert(toInsert[i], toInsert[i]);
      }

      // Ensure order is correct.
      verifyTraversal(map, N);

      for (i = 0 ; i < N ; i++ ) {
        map = map.remove(toRemove[i]);
      }

      var elapsed = new Date().getTime() - start;
      // console.log(N + ": " +elapsed);
    }
  });

  xit("Perf: Comparison with {}: Insertion and removal with various # of items.", function() {
    var verifyTraversal = function(tree, max) {
      var keys = [];
      for(var k in tree)
        keys.push(k);

      keys.sort();
      expect(keys.length).to.equal(max);
      for(var i = 0; i < max; i++)
        expect(tree[i]).to.equal(i);
    };

    for(var N = 10; N <= 100000; N *= 10) {
      var toInsert = [], toRemove = [];
      for(var i = 0; i < N; i++) {
        toInsert.push(i);
        toRemove.push(i);
      }

      shuffle(toInsert);
      shuffle(toRemove);

      var tree = { };

      var start = new Date().getTime();
      for (i = 0 ; i < N ; i++ ) {
        tree[i] = i;
      }

      // Ensure order is correct.
      //verifyTraversal(tree, N);

      for (i = 0 ; i < N ; i++ ) {
        delete tree[i];
      }

      var elapsed = (new Date().getTime()) - start;
      // console.log(N + ": " +elapsed);
    }
  });

  it("SortedMapIterator empty test.", function() {
    var map = new SortedMap(defaultCmp);
    var iterator = map.getIterator();
    expect(iterator.getNext()).to.equal(null);
  });

  it("SortedMapIterator test with 10 items.", function() {
    var items = [];
    for(var i = 0; i < 10; i++)
      items.push(i);
    shuffle(items);

    var map = new SortedMap(defaultCmp);
    for(i = 0; i < 10; i++)
      map = map.insert(items[i], items[i]);

    var iterator = map.getIterator();
    var n, expected = 0;
    while ((n = iterator.getNext()) !== null) {
      expect(n.key).to.equal(expected);
      expect(n.value).to.equal(expected);
      expected++;
    }
    expect(expected).to.equal(10);
  });

  it("SortedMap.getPredecessorKey works.", function() {
    var map = new SortedMap(defaultCmp)
        .insert(1,1)
        .insert(50,50)
        .insert(3,3)
        .insert(4,4)
        .insert(7,7)
        .insert(9,9);

    expect(map.getPredecessorKey(1)).to.equal(null);
    expect(map.getPredecessorKey(3)).to.equal(1);
    expect(map.getPredecessorKey(4)).to.equal(3);
    expect(map.getPredecessorKey(7)).to.equal(4);
    expect(map.getPredecessorKey(9)).to.equal(7);
    expect(map.getPredecessorKey(50)).to.equal(9);
  });
});
