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
goog.provide('fb.core.snap.LeafNode');
goog.require('fb.core.snap.Node');
goog.require('fb.core.util');

// TODO: For memory savings, don't store priorityNode_ if it's null.


/**
 * LeafNode is a class for storing leaf nodes in a DataSnapshot.  It
 * implements Node and stores the value of the node (a string,
 * number, or boolean) accessible via getValue().
 */
fb.core.snap.LeafNode = goog.defineClass(null, {
  /**
   * @implements {fb.core.snap.Node}
   * @param {!(string|number|boolean|Object)} value The value to store in this leaf node.
   *                                         The object type is possible in the event of a deferred value
   * @param {!fb.core.snap.Node=} opt_priorityNode The priority of this node.
   */
  constructor: function(value, opt_priorityNode) {
    /**
     * @private
     * @const
     * @type {!(string|number|boolean|Object)}
     */
    this.value_ = value;
    fb.core.util.assert(goog.isDef(this.value_) && this.value_ !== null,
        "LeafNode shouldn't be created with null/undefined value.");

    /**
     * @private
     * @const
     * @type {!fb.core.snap.Node}
     */
    this.priorityNode_ = opt_priorityNode || fb.core.snap.EMPTY_NODE;
    fb.core.snap.validatePriorityNode(this.priorityNode_);

    this.lazyHash_ = null;
  },

  statics: {
    /**
     * The sort order for comparing leaf nodes of different types. If two leaf nodes have
     * the same type, the comparison falls back to their value
     * @type {Array.<!string>}
     * @const
     */
    VALUE_TYPE_ORDER: ['object', 'boolean', 'number', 'string']
  },

  /** @inheritDoc */
  isLeafNode: function() { return true; },

  /** @inheritDoc */
  getPriority: function() {
    return this.priorityNode_;
  },

  /** @inheritDoc */
  updatePriority: function(newPriorityNode) {
    return new fb.core.snap.LeafNode(this.value_, newPriorityNode);
  },

  /** @inheritDoc */
  getImmediateChild: function(childName) {
    // Hack to treat priority as a regular child
    if (childName === '.priority') {
      return this.priorityNode_;
    } else {
      return fb.core.snap.EMPTY_NODE;
    }
  },

  /** @inheritDoc */
  getChild: function(path) {
    if (path.isEmpty()) {
      return this;
    } else if (path.getFront() === '.priority') {
      return this.priorityNode_;
    } else {
      return fb.core.snap.EMPTY_NODE;
    }
  },

  /**
   * @inheritDoc
   */
  hasChild: function() {
    return false;
  },

  /** @inheritDoc */
  getPredecessorChildName: function(childName, childNode) {
    return null;
  },

  /** @inheritDoc */
  updateImmediateChild: function(childName, newChildNode) {
    if (childName === '.priority') {
      return this.updatePriority(newChildNode);
    } else if (newChildNode.isEmpty() && childName !== '.priority') {
      return this;
    } else {
      return fb.core.snap.EMPTY_NODE
          .updateImmediateChild(childName, newChildNode)
          .updatePriority(this.priorityNode_);
    }
  },

  /** @inheritDoc */
  updateChild: function(path, newChildNode) {
    var front = path.getFront();
    if (front === null) {
      return newChildNode;
    } else if (newChildNode.isEmpty() && front !== '.priority') {
      return this;
    } else {
      fb.core.util.assert(front !== '.priority' || path.getLength() === 1,
          '.priority must be the last token in a path');

      return this.updateImmediateChild(front,
                                       fb.core.snap.EMPTY_NODE.updateChild(path.popFront(),
                                                                           newChildNode));
    }
  },

  /** @inheritDoc */
  isEmpty: function() {
    return false;
  },

  /** @inheritDoc */
  numChildren: function() {
    return 0;
  },

  /** @inheritDoc */
  forEachChild: function(index, action) {
    return false;
  },

  /**
   * @inheritDoc
   */
  val: function(opt_exportFormat) {
    if (opt_exportFormat && !this.getPriority().isEmpty())
      return { '.value': this.getValue(), '.priority' : this.getPriority().val() };
    else
      return this.getValue();
  },

  /** @inheritDoc */
  hash: function() {
    if (this.lazyHash_ === null) {
      var toHash = '';
      if (!this.priorityNode_.isEmpty())
        toHash += 'priority:' + fb.core.snap.priorityHashText(
            /** @type {(number|string)} */ (this.priorityNode_.val())) + ':';

      var type = typeof this.value_;
      toHash += type + ':';
      if (type === 'number') {
        toHash += fb.core.util.doubleToIEEE754String(/** @type {number} */ (this.value_));
      } else {
        toHash += this.value_;
      }
      this.lazyHash_ = fb.core.util.sha1(toHash);
    }
    return /**@type {!string} */ (this.lazyHash_);
  },

  /**
   * Returns the value of the leaf node.
   * @return {Object|string|number|boolean} The value of the node.
   */
  getValue: function() {
    return this.value_;
  },

  /**
   * @inheritDoc
   */
  compareTo: function(other) {
    if (other === fb.core.snap.EMPTY_NODE) {
      return 1;
    } else if (other instanceof fb.core.snap.ChildrenNode) {
      return -1;
    } else {
      fb.core.util.assert(other.isLeafNode(), 'Unknown node type');
      return this.compareToLeafNode_(/** @type {!fb.core.snap.LeafNode} */ (other));
    }
  },

  /**
   * Comparison specifically for two leaf nodes
   * @param {!fb.core.snap.LeafNode} otherLeaf
   * @return {!number}
   * @private
   */
  compareToLeafNode_: function(otherLeaf) {
    var otherLeafType = typeof otherLeaf.value_;
    var thisLeafType = typeof this.value_;
    var otherIndex = goog.array.indexOf(fb.core.snap.LeafNode.VALUE_TYPE_ORDER, otherLeafType);
    var thisIndex = goog.array.indexOf(fb.core.snap.LeafNode.VALUE_TYPE_ORDER, thisLeafType);
    fb.core.util.assert(otherIndex >= 0, 'Unknown leaf type: ' + otherLeafType);
    fb.core.util.assert(thisIndex >= 0, 'Unknown leaf type: ' + thisLeafType);
    if (otherIndex === thisIndex) {
      // Same type, compare values
      if (thisLeafType === 'object') {
        // Deferred value nodes are all equal, but we should also never get to this point...
        return 0;
      } else {
        // Note that this works because true > false, all others are number or string comparisons
        if (this.value_ < otherLeaf.value_) {
          return -1;
        } else if (this.value_ === otherLeaf.value_) {
          return 0;
        } else {
          return 1;
        }
      }
    } else {
      return thisIndex - otherIndex;
    }
  },

  /**
   * @inheritDoc
   */
  withIndex: function() {
    return this;
  },

  /**
   * @inheritDoc
   */
  isIndexed: function() {
    return true;
  },

  /**
   * @inheritDoc
   */
  equals: function(other) {
    /**
     * @inheritDoc
     */
    if (other === this) {
      return true;
    }
    else if (other.isLeafNode()) {
      var otherLeaf = /** @type {!fb.core.snap.LeafNode} */ (other);
      return this.value_ === otherLeaf.value_ && this.priorityNode_.equals(otherLeaf.priorityNode_);
    } else {
      return false;
    }
  }
}); // end fb.core.snap.LeafNode


if (goog.DEBUG) {
  /**
   * Converts the leaf node to a string.
   * @return {string} String representation of the node.
   */
  fb.core.snap.LeafNode.prototype.toString = function() {
    return fb.util.json.stringify(this.val(true));
  };
}
