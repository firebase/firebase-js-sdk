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
goog.provide('fb.core.snap');
goog.require('fb.core.snap.ChildrenNode');
goog.require('fb.core.snap.IndexMap');
goog.require('fb.core.snap.LeafNode');
goog.require('fb.core.util');


var USE_HINZE = true;

/**
 * Constructs a snapshot node representing the passed JSON and returns it.
 * @param {*} json JSON to create a node for.
 * @param {?string|?number=} opt_priority Optional priority to use.  This will be ignored if the
 * passed JSON contains a .priority property.
 * @return {!fb.core.snap.Node}
 */
fb.core.snap.NodeFromJSON = function(json, opt_priority) {
  if (json === null) {
    return fb.core.snap.EMPTY_NODE;
  }

  var priority = null;
  if (typeof json === 'object' && '.priority' in json) {
    priority = json['.priority'];
  } else if (typeof opt_priority !== 'undefined') {
    priority = opt_priority;
  }
  fb.core.util.assert(
    priority === null ||
      typeof priority === 'string' ||
      typeof priority === 'number' ||
      (typeof priority === 'object' && '.sv' in priority),
    'Invalid priority type found: ' + (typeof priority)
  );

  if (typeof json === 'object' && '.value' in json && json['.value'] !== null) {
    json = json['.value'];
  }

  // Valid leaf nodes include non-objects or server-value wrapper objects
  if (typeof json !== 'object' || '.sv' in json) {
    var jsonLeaf = /** @type {!(string|number|boolean|Object)} */ (json);
    return new fb.core.snap.LeafNode(jsonLeaf, fb.core.snap.NodeFromJSON(priority));
  }

  if (!(json instanceof Array) && USE_HINZE) {
    var children = [];
    var childrenHavePriority = false;
    var hinzeJsonObj = /** @type {!Object} */ (json);
    fb.util.obj.foreach(hinzeJsonObj, function(key, child) {
      if (typeof key !== 'string' || key.substring(0, 1) !== '.') { // Ignore metadata nodes
        var childNode = fb.core.snap.NodeFromJSON(hinzeJsonObj[key]);
        if (!childNode.isEmpty()) {
          childrenHavePriority = childrenHavePriority || !childNode.getPriority().isEmpty();
          children.push(new fb.core.snap.NamedNode(key, childNode));
        }
      }
    });

    if (children.length == 0) {
      return fb.core.snap.EMPTY_NODE;
    }

    var childSet = /**@type {!fb.core.util.SortedMap.<string, !fb.core.snap.Node>} */ (fb.core.snap.buildChildSet(
      children, fb.core.snap.NAME_ONLY_COMPARATOR, function(namedNode) { return namedNode.name; },
      fb.core.snap.NAME_COMPARATOR
    ));
    if (childrenHavePriority) {
      var sortedChildSet = fb.core.snap.buildChildSet(children, fb.core.snap.PriorityIndex.getCompare());
      return new fb.core.snap.ChildrenNode(childSet, fb.core.snap.NodeFromJSON(priority),
        new fb.core.snap.IndexMap({'.priority': sortedChildSet}, {'.priority': fb.core.snap.PriorityIndex}));
    } else {
      return new fb.core.snap.ChildrenNode(childSet, fb.core.snap.NodeFromJSON(priority),
          fb.core.snap.IndexMap.Default);
    }
  } else {
    var node = fb.core.snap.EMPTY_NODE;
    var jsonObj = /** @type {!Object} */ (json);
    goog.object.forEach(jsonObj, function(childData, key) {
      if (fb.util.obj.contains(jsonObj, key)) {
        if (key.substring(0, 1) !== '.') { // ignore metadata nodes.
          var childNode = fb.core.snap.NodeFromJSON(childData);
          if (childNode.isLeafNode() || !childNode.isEmpty())
            node = node.updateImmediateChild(key, childNode);
        }
      }
    });

    return node.updatePriority(fb.core.snap.NodeFromJSON(priority));
  }
};

var LOG_2 = Math.log(2);

/**
 * @param {number} length
 * @constructor
 */
fb.core.snap.Base12Num = function(length) {
  var logBase2 = function(num) {
    return parseInt(Math.log(num) / LOG_2, 10);
  };
  var bitMask = function(bits) {
    return parseInt(Array(bits + 1).join('1'), 2);
  };
  this.count = logBase2(length + 1);
  this.current_ = this.count - 1;
  var mask = bitMask(this.count);
  this.bits_ = (length + 1) & mask;
};

/**
 * @return {boolean}
 */
fb.core.snap.Base12Num.prototype.nextBitIsOne = function() {
  //noinspection JSBitwiseOperatorUsage
  var result = !(this.bits_ & (0x1 << this.current_));
  this.current_--;
  return result;
};

/**
 * Takes a list of child nodes and constructs a SortedSet using the given comparison
 * function
 *
 * Uses the algorithm described in the paper linked here:
 * http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.46.1458
 *
 * @template K, V
 * @param {Array.<!fb.core.snap.NamedNode>} childList Unsorted list of children
 * @param {function(!fb.core.snap.NamedNode, !fb.core.snap.NamedNode):number} cmp The comparison method to be used
 * @param {(function(fb.core.snap.NamedNode):K)=} keyFn An optional function to extract K from a node wrapper, if K's
 *                                                        type is not NamedNode
 * @param {(function(K, K):number)=} mapSortFn An optional override for comparator used by the generated sorted map
 * @return {fb.core.util.SortedMap.<K, V>}
 */
fb.core.snap.buildChildSet = function(childList, cmp, keyFn, mapSortFn) {
  childList.sort(cmp);

  var buildBalancedTree = function(low, high) {
    var length = high - low;
    if (length == 0) {
      return null;
    } else if (length == 1) {
      var namedNode = childList[low];
      var key = keyFn ? keyFn(namedNode) : namedNode;
      return new fb.LLRBNode(key, namedNode.node, fb.LLRBNode.BLACK, null, null);
    } else {
      var middle = parseInt(length / 2, 10) + low;
      var left = buildBalancedTree(low, middle);
      var right = buildBalancedTree(middle + 1, high);
      namedNode = childList[middle];
      key = keyFn ? keyFn(namedNode) : namedNode;
      return new fb.LLRBNode(key, namedNode.node, fb.LLRBNode.BLACK, left, right);
    }
  };

  var buildFrom12Array = function(base12) {
    var node = null;
    var root = null;
    var index = childList.length;

    var buildPennant = function(chunkSize, color) {
      var low = index - chunkSize;
      var high = index;
      index -= chunkSize;
      var childTree = buildBalancedTree(low + 1, high);
      var namedNode = childList[low];
      var key = keyFn ? keyFn(namedNode) : namedNode;
      attachPennant(new fb.LLRBNode(key, namedNode.node, color, null, childTree));
    };

    var attachPennant = function(pennant) {
      if (node) {
        node.left = pennant;
        node = pennant;
      } else {
        root = pennant;
        node = pennant;
      }
    };

    for (var i = 0; i < base12.count; ++i) {
      var isOne = base12.nextBitIsOne();
      // The number of nodes taken in each slice is 2^(arr.length - (i + 1))
      var chunkSize = Math.pow(2, base12.count - (i + 1));
      if (isOne) {
        buildPennant(chunkSize, fb.LLRBNode.BLACK);
      } else {
        // current == 2
        buildPennant(chunkSize, fb.LLRBNode.BLACK);
        buildPennant(chunkSize, fb.LLRBNode.RED);
      }
    }
    return root;
  };

  var base12 = new fb.core.snap.Base12Num(childList.length);
  var root = buildFrom12Array(base12);

  if (root !== null) {
    return new fb.core.util.SortedMap(mapSortFn || cmp, root);
  } else {
    return new fb.core.util.SortedMap(mapSortFn || cmp);
  }
};

/**
 * @param {(!string|!number)} priority
 * @return {!string}
 */
fb.core.snap.priorityHashText = function(priority) {
  if (typeof priority === 'number')
    return 'number:' + fb.core.util.doubleToIEEE754String(priority);
  else
    return 'string:' + priority;
};

/**
 * Validates that a priority snapshot Node is valid.
 *
 * @param {!fb.core.snap.Node} priorityNode
 */
fb.core.snap.validatePriorityNode = function(priorityNode) {
  if (priorityNode.isLeafNode()) {
    var val = priorityNode.val();
    fb.core.util.assert(typeof val === 'string' || typeof val === 'number' ||
            (typeof val === 'object' && fb.util.obj.contains(val, '.sv')),
        'Priority must be a string or number.');
  } else {
    fb.core.util.assert(priorityNode === fb.core.snap.MAX_NODE || priorityNode.isEmpty(),
        'priority of unexpected type.');
  }
  // Don't call getPriority() on MAX_NODE to avoid hitting assertion.
  fb.core.util.assert(priorityNode === fb.core.snap.MAX_NODE || priorityNode.getPriority().isEmpty(),
      "Priority nodes can't have a priority of their own.");
};

/**
 * Constant EMPTY_NODE used whenever somebody needs an empty node.
 * @const
 */
fb.core.snap.EMPTY_NODE = new fb.core.snap.ChildrenNode(
    new fb.core.util.SortedMap(fb.core.snap.NAME_COMPARATOR),
    null,
    fb.core.snap.IndexMap.Default
);

/**
 * @constructor
 * @extends {fb.core.snap.ChildrenNode}
 * @private
 */
fb.core.snap.MAX_NODE_ = function() {
  fb.core.snap.ChildrenNode.call(this,
      new fb.core.util.SortedMap(fb.core.snap.NAME_COMPARATOR),
      fb.core.snap.EMPTY_NODE,
      fb.core.snap.IndexMap.Default);
};
goog.inherits(fb.core.snap.MAX_NODE_, fb.core.snap.ChildrenNode);

/**
 * @inheritDoc
 */
fb.core.snap.MAX_NODE_.prototype.compareTo = function(other) {
  if (other === this) {
    return 0;
  } else {
    return 1;
  }
};

/**
 * @inheritDoc
 */
fb.core.snap.MAX_NODE_.prototype.equals = function(other) {
  // Not that we every compare it, but MAX_NODE_ is only ever equal to itself
  return other === this;
};

/**
 * @inheritDoc
 */
fb.core.snap.MAX_NODE_.prototype.getPriority = function() {
  return this;
};

/**
 * @inheritDoc
 */
fb.core.snap.MAX_NODE_.prototype.getImmediateChild = function(childName) {
  return fb.core.snap.EMPTY_NODE;
};

/**
 * @inheritDoc
 */
fb.core.snap.MAX_NODE_.prototype.isEmpty = function() {
  return false;
};

/**
 * Marker that will sort higher than any other snapshot.
 * @type {!fb.core.snap.MAX_NODE_}
 * @const
 */
fb.core.snap.MAX_NODE = new fb.core.snap.MAX_NODE_();
fb.core.snap.NamedNode.MIN = new fb.core.snap.NamedNode(fb.core.util.MIN_NAME, fb.core.snap.EMPTY_NODE);
fb.core.snap.NamedNode.MAX = new fb.core.snap.NamedNode(fb.core.util.MAX_NAME, fb.core.snap.MAX_NODE);
