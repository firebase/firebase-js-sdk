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
goog.provide('fb.core.snap.ChildrenNode');
goog.require('fb.core.snap.IndexMap');
goog.require('fb.core.snap.LeafNode');
goog.require('fb.core.snap.NamedNode');
goog.require('fb.core.snap.Node');
goog.require('fb.core.snap.PriorityIndex');
goog.require('fb.core.snap.comparators');
goog.require('fb.core.util');
goog.require('fb.core.util.SortedMap');

// TODO: For memory savings, don't store priorityNode_ if it's empty.

/**
 * ChildrenNode is a class for storing internal nodes in a DataSnapshot
 * (i.e. nodes with children).  It implements Node and stores the
 * list of children in the children property, sorted by child name.
 *
 * @constructor
 * @implements {fb.core.snap.Node}
 * @param {!fb.core.util.SortedMap.<string, !fb.core.snap.Node>} children List of children
 * of this node..
 * @param {?fb.core.snap.Node} priorityNode The priority of this node (as a snapshot node).
 * @param {!fb.core.snap.IndexMap} indexMap
 */
fb.core.snap.ChildrenNode = function(children, priorityNode, indexMap) {
  /**
   * @private
   * @const
   * @type {!fb.core.util.SortedMap.<!string, !fb.core.snap.Node>}
   */
  this.children_ = children;

  /**
   * Note: The only reason we allow null priority is to for EMPTY_NODE, since we can't use
   * EMPTY_NODE as the priority of EMPTY_NODE.  We might want to consider making EMPTY_NODE its own
   * class instead of an empty ChildrenNode.
   *
   * @private
   * @const
   * @type {?fb.core.snap.Node}
   */
  this.priorityNode_ = priorityNode;
  if (this.priorityNode_) {
    fb.core.snap.validatePriorityNode(this.priorityNode_);
  }

  if (children.isEmpty()) {
    fb.core.util.assert(!this.priorityNode_ || this.priorityNode_.isEmpty(), 'An empty node cannot have a priority');
  }

  /**
   *
   * @type {!fb.core.snap.IndexMap}
   * @private
   */
  this.indexMap_ = indexMap;

  /**
   *
   * @type {?string}
   * @private
   */
  this.lazyHash_ = null;
};


/** @inheritDoc */
fb.core.snap.ChildrenNode.prototype.isLeafNode = function() {
  return false;
};


/** @inheritDoc */
fb.core.snap.ChildrenNode.prototype.getPriority = function() {
  return this.priorityNode_ || fb.core.snap.EMPTY_NODE;
};


/** @inheritDoc */
fb.core.snap.ChildrenNode.prototype.updatePriority = function(newPriorityNode) {
  if (this.children_.isEmpty()) {
    // Don't allow priorities on empty nodes
    return this;
  } else {
    return new fb.core.snap.ChildrenNode(this.children_, newPriorityNode, this.indexMap_);
  }
};

/** @inheritDoc */
fb.core.snap.ChildrenNode.prototype.getImmediateChild = function(childName) {
  // Hack to treat priority as a regular child
  if (childName === '.priority') {
    return this.getPriority();
  } else {
    var child = this.children_.get(childName);
    return child === null ? fb.core.snap.EMPTY_NODE : child;
  }
};


/** @inheritDoc */
fb.core.snap.ChildrenNode.prototype.getChild = function(path) {
  var front = path.getFront();
  if (front === null)
    return this;

  return this.getImmediateChild(front).getChild(path.popFront());
};

/** @inheritDoc */
fb.core.snap.ChildrenNode.prototype.hasChild = function(childName) {
  return this.children_.get(childName) !== null;
};

/** @inheritDoc */
fb.core.snap.ChildrenNode.prototype.updateImmediateChild = function(childName, newChildNode) {
  fb.core.util.assert(newChildNode, 'We should always be passing snapshot nodes');
  if (childName === '.priority') {
    return this.updatePriority(newChildNode);
  } else {
    var namedNode = new fb.core.snap.NamedNode(childName, newChildNode);
    var newChildren, newIndexMap, newPriority;
    if (newChildNode.isEmpty()) {
      newChildren = this.children_.remove(childName);
      newIndexMap = this.indexMap_.removeFromIndexes(namedNode, this.children_
      );
    } else {
      newChildren = this.children_.insert(childName, newChildNode);
      newIndexMap = this.indexMap_.addToIndexes(namedNode, this.children_);
    }

    newPriority = newChildren.isEmpty() ? fb.core.snap.EMPTY_NODE : this.priorityNode_;
    return new fb.core.snap.ChildrenNode(newChildren, newPriority, newIndexMap);
  }
};


/** @inheritDoc */
fb.core.snap.ChildrenNode.prototype.updateChild = function(path, newChildNode) {
  var front = path.getFront();
  if (front === null) {
    return newChildNode;
  } else {
    fb.core.util.assert(path.getFront() !== '.priority' || path.getLength() === 1,
        '.priority must be the last token in a path');
    var newImmediateChild = this.getImmediateChild(front).
      updateChild(path.popFront(), newChildNode);
    return this.updateImmediateChild(front, newImmediateChild);
  }
};

/** @inheritDoc */
fb.core.snap.ChildrenNode.prototype.isEmpty = function() {
  return this.children_.isEmpty();
};


/** @inheritDoc */
fb.core.snap.ChildrenNode.prototype.numChildren = function() {
  return this.children_.count();
};


/**
 * @private
 * @type {RegExp}
 */
fb.core.snap.ChildrenNode.INTEGER_REGEXP_ = /^(0|[1-9]\d*)$/;

/** @inheritDoc */
fb.core.snap.ChildrenNode.prototype.val = function(opt_exportFormat) {
  if (this.isEmpty())
    return null;

  var obj = { };
  var numKeys = 0, maxKey = 0, allIntegerKeys = true;
  this.forEachChild(fb.core.snap.PriorityIndex, function(key, childNode) {
    obj[key] = childNode.val(opt_exportFormat);

    numKeys++;
    if (allIntegerKeys && fb.core.snap.ChildrenNode.INTEGER_REGEXP_.test(key)) {
      maxKey = Math.max(maxKey, Number(key));
    } else {
      allIntegerKeys = false;
    }
  });

  if (!opt_exportFormat && allIntegerKeys && maxKey < 2 * numKeys) {
    // convert to array.
    var array = [];
    for (var key in obj)
      array[key] = obj[key];

    return array;
  } else {
    if (opt_exportFormat && !this.getPriority().isEmpty()) {
      obj['.priority'] = this.getPriority().val();
    }
    return obj;
  }
};


/** @inheritDoc */
fb.core.snap.ChildrenNode.prototype.hash = function() {
  if (this.lazyHash_ === null) {
    var toHash = '';
    if (!this.getPriority().isEmpty())
      toHash += 'priority:' + fb.core.snap.priorityHashText(
          /**@type {(!string|!number)} */ (this.getPriority().val())) + ':';

    this.forEachChild(fb.core.snap.PriorityIndex, function(key, childNode) {
      var childHash = childNode.hash();
      if (childHash !== '')
        toHash += ':' + key + ':' + childHash;
    });

    this.lazyHash_ = (toHash === '') ? '' : fb.core.util.sha1(toHash);
  }
  return this.lazyHash_;
};


/** @inheritDoc */
fb.core.snap.ChildrenNode.prototype.getPredecessorChildName = function(childName, childNode, index) {
  var idx = this.resolveIndex_(index);
  if (idx) {
    var predecessor = idx.getPredecessorKey(new fb.core.snap.NamedNode(childName, childNode));
    return predecessor ? predecessor.name : null;
  } else {
    return this.children_.getPredecessorKey(childName);
  }
};

/**
 * @param {!fb.core.snap.Index} indexDefinition
 * @return {?string}
 */
fb.core.snap.ChildrenNode.prototype.getFirstChildName = function(indexDefinition) {
  var idx = this.resolveIndex_(indexDefinition);
  if (idx) {
    var minKey = idx.minKey();
    return minKey && minKey.name;
  } else {
    return this.children_.minKey();
  }
};

/**
 * @param {!fb.core.snap.Index} indexDefinition
 * @return {?fb.core.snap.NamedNode}
 */
fb.core.snap.ChildrenNode.prototype.getFirstChild = function(indexDefinition) {
  var minKey = this.getFirstChildName(indexDefinition);
  if (minKey) {
    return new fb.core.snap.NamedNode(minKey, this.children_.get(minKey));
  } else {
    return null;
  }
};

/**
 * Given an index, return the key name of the largest value we have, according to that index
 * @param {!fb.core.snap.Index} indexDefinition
 * @return {?string}
 */
fb.core.snap.ChildrenNode.prototype.getLastChildName = function(indexDefinition) {
  var idx = this.resolveIndex_(indexDefinition);
  if (idx) {
    var maxKey = idx.maxKey();
    return maxKey && maxKey.name;
  } else {
    return this.children_.maxKey();
  }
};

/**
 * @param {!fb.core.snap.Index} indexDefinition
 * @return {?fb.core.snap.NamedNode}
 */
fb.core.snap.ChildrenNode.prototype.getLastChild = function(indexDefinition) {
  var maxKey = this.getLastChildName(indexDefinition);
  if (maxKey) {
    return new fb.core.snap.NamedNode(maxKey, this.children_.get(maxKey));
  } else {
    return null;
  }
};


/**
 * @inheritDoc
 */
fb.core.snap.ChildrenNode.prototype.forEachChild = function(index, action) {
  var idx = this.resolveIndex_(index);
  if (idx) {
    return idx.inorderTraversal(function(wrappedNode) {
      return action(wrappedNode.name, wrappedNode.node);
    });
  } else {
    return this.children_.inorderTraversal(action);
  }
};

/**
 * @param {!fb.core.snap.Index} indexDefinition
 * @return {fb.core.util.SortedMapIterator}
 */
fb.core.snap.ChildrenNode.prototype.getIterator = function(indexDefinition) {
  return this.getIteratorFrom(indexDefinition.minPost(), indexDefinition);
};

/**
 *
 * @param {!fb.core.snap.NamedNode} startPost
 * @param {!fb.core.snap.Index} indexDefinition
 * @return {!fb.core.util.SortedMapIterator}
 */
fb.core.snap.ChildrenNode.prototype.getIteratorFrom = function(startPost, indexDefinition) {
  var idx = this.resolveIndex_(indexDefinition);
  if (idx) {
    return idx.getIteratorFrom(startPost, function(key) { return key; });
  } else {
    var iterator = this.children_.getIteratorFrom(startPost.name, fb.core.snap.NamedNode.Wrap);
    var next = iterator.peek();
    while (next != null && indexDefinition.compare(next, startPost) < 0) {
      iterator.getNext();
      next = iterator.peek();
    }
    return iterator;
  }
};

/**
 * @param {!fb.core.snap.Index} indexDefinition
 * @return {!fb.core.util.SortedMapIterator}
 */
fb.core.snap.ChildrenNode.prototype.getReverseIterator = function(indexDefinition) {
  return this.getReverseIteratorFrom(indexDefinition.maxPost(), indexDefinition);
};

/**
 * @param {!fb.core.snap.NamedNode} endPost
 * @param {!fb.core.snap.Index} indexDefinition
 * @return {!fb.core.util.SortedMapIterator}
 */
fb.core.snap.ChildrenNode.prototype.getReverseIteratorFrom = function(endPost, indexDefinition) {
  var idx = this.resolveIndex_(indexDefinition);
  if (idx) {
    return idx.getReverseIteratorFrom(endPost, function(key) { return key; });
  } else {
    var iterator = this.children_.getReverseIteratorFrom(endPost.name, fb.core.snap.NamedNode.Wrap);
    var next = iterator.peek();
    while (next != null && indexDefinition.compare(next, endPost) > 0) {
      iterator.getNext();
      next = iterator.peek();
    }
    return iterator;
  }
};

/**
 * @inheritDoc
 */
fb.core.snap.ChildrenNode.prototype.compareTo = function(other) {
  if (this.isEmpty()) {
    if (other.isEmpty()) {
      return 0;
    } else {
      return -1;
    }
  } else if (other.isLeafNode() || other.isEmpty()) {
    return 1;
  } else if (other === fb.core.snap.MAX_NODE) {
    return -1;
  } else {
    // Must be another node with children.
    return 0;
  }
};

/**
 * @inheritDoc
 */
fb.core.snap.ChildrenNode.prototype.withIndex = function(indexDefinition) {
  if (indexDefinition === fb.core.snap.KeyIndex || this.indexMap_.hasIndex(indexDefinition)) {
    return this;
  } else {
    var newIndexMap = this.indexMap_.addIndex(indexDefinition, this.children_);
    return new fb.core.snap.ChildrenNode(this.children_, this.priorityNode_, newIndexMap);
  }
};

/**
 * @inheritDoc
 */
fb.core.snap.ChildrenNode.prototype.isIndexed = function(index) {
  return index === fb.core.snap.KeyIndex || this.indexMap_.hasIndex(index);
};

/**
 * @inheritDoc
 */
fb.core.snap.ChildrenNode.prototype.equals = function(other) {
  if (other === this) {
    return true;
  }
  else if (other.isLeafNode()) {
    return false;
  } else {
    var otherChildrenNode = /** @type {!fb.core.snap.ChildrenNode} */ (other);
    if (!this.getPriority().equals(otherChildrenNode.getPriority())) {
      return false;
    } else if (this.children_.count() === otherChildrenNode.children_.count()) {
      var thisIter = this.getIterator(fb.core.snap.PriorityIndex);
      var otherIter = otherChildrenNode.getIterator(fb.core.snap.PriorityIndex);
      var thisCurrent = thisIter.getNext();
      var otherCurrent = otherIter.getNext();
      while (thisCurrent && otherCurrent) {
        if (thisCurrent.name !== otherCurrent.name || !thisCurrent.node.equals(otherCurrent.node)) {
          return false;
        }
        thisCurrent = thisIter.getNext();
        otherCurrent = otherIter.getNext();
      }
      return thisCurrent === null && otherCurrent === null;
    } else {
      return false;
    }
  }
};


/**
 * Returns a SortedMap ordered by index, or null if the default (by-key) ordering can be used
 * instead.
 *
 * @private
 * @param {!fb.core.snap.Index} indexDefinition
 * @return {?fb.core.util.SortedMap.<fb.core.snap.NamedNode, fb.core.snap.Node>}
 */
fb.core.snap.ChildrenNode.prototype.resolveIndex_ = function(indexDefinition) {
  if (indexDefinition === fb.core.snap.KeyIndex) {
    return null;
  } else {
    return this.indexMap_.get(indexDefinition.toString());
  }
};


if (goog.DEBUG) {
  /**
   * Returns a string representation of the node.
   * @return {string} String representation.
   */
  fb.core.snap.ChildrenNode.prototype.toString = function() {
    return fb.util.json.stringify(this.val(true));
  };
}


