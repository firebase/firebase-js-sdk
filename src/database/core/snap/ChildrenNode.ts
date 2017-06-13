import { assert } from "../../../utils/assert";
import { 
  sha1,
  MAX_NAME,
  MIN_NAME
} from "../util/util";
import { SortedMap } from "../util/SortedMap";
import { Node, NamedNode } from "./Node";
import { 
  validatePriorityNode, 
  priorityHashText,
} from "./snap";
import { PRIORITY_INDEX } from "./indexes/PriorityIndex";
import { KEY_INDEX } from "./indexes/KeyIndex";
import { IndexMap } from "./IndexMap";
import { NAME_COMPARATOR } from "./comparators";

// TODO: For memory savings, don't store priorityNode_ if it's empty.

let EMPTY_NODE;

/**
 * ChildrenNode is a class for storing internal nodes in a DataSnapshot
 * (i.e. nodes with children).  It implements Node and stores the
 * list of children in the children property, sorted by child name.
 *
 * @constructor
 * @implements {Node}
 * @param {!SortedMap.<string, !Node>} children List of children
 * of this node..
 * @param {?Node} priorityNode The priority of this node (as a snapshot node).
 * @param {!IndexMap} indexMap
 */
export class ChildrenNode implements Node {
  children_;
  priorityNode_;
  indexMap_;
  lazyHash_;
  
  static get EMPTY_NODE() {
    return EMPTY_NODE || (EMPTY_NODE = new ChildrenNode(new SortedMap(NAME_COMPARATOR), null, IndexMap.Default));
  }

  constructor(children, priorityNode, indexMap) {
    /**
     * @private
     * @const
     * @type {!SortedMap.<!string, !Node>}
     */
    this.children_ = children;

    /**
     * Note: The only reason we allow null priority is to for EMPTY_NODE, since we can't use
     * EMPTY_NODE as the priority of EMPTY_NODE.  We might want to consider making EMPTY_NODE its own
     * class instead of an empty ChildrenNode.
     *
     * @private
     * @const
     * @type {?Node}
     */
    this.priorityNode_ = priorityNode;
    if (this.priorityNode_) {
      validatePriorityNode(this.priorityNode_);
    }

    if (children.isEmpty()) {
      assert(!this.priorityNode_ || this.priorityNode_.isEmpty(), 'An empty node cannot have a priority');
    }

    /**
     *
     * @type {!IndexMap}
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
  isLeafNode() {
    return false;
  };

  /** @inheritDoc */
  getPriority() {
    return this.priorityNode_ || EMPTY_NODE;
  };

  /** @inheritDoc */
  updatePriority(newPriorityNode) {
    if (this.children_.isEmpty()) {
      // Don't allow priorities on empty nodes
      return this;
    } else {
      return new ChildrenNode(this.children_, newPriorityNode, this.indexMap_);
    }
  };

  /** @inheritDoc */
  getImmediateChild(childName) {
    // Hack to treat priority as a regular child
    if (childName === '.priority') {
      return this.getPriority();
    } else {
      var child = this.children_.get(childName);
      return child === null ? EMPTY_NODE : child;
    }
  };

  /** @inheritDoc */
  getChild(path) {
    var front = path.getFront();
    if (front === null)
      return this;

    return this.getImmediateChild(front).getChild(path.popFront());
  };

  /** @inheritDoc */
  hasChild(childName) {
    return this.children_.get(childName) !== null;
  };

  /** @inheritDoc */
  updateImmediateChild(childName, newChildNode) {
    assert(newChildNode, 'We should always be passing snapshot nodes');
    if (childName === '.priority') {
      return this.updatePriority(newChildNode);
    } else {
      var namedNode = new NamedNode(childName, newChildNode);
      var newChildren, newIndexMap, newPriority;
      if (newChildNode.isEmpty()) {
        newChildren = this.children_.remove(childName);
        newIndexMap = this.indexMap_.removeFromIndexes(namedNode, this.children_
        );
      } else {
        newChildren = this.children_.insert(childName, newChildNode);
        newIndexMap = this.indexMap_.addToIndexes(namedNode, this.children_);
      }

      newPriority = newChildren.isEmpty() ? EMPTY_NODE : this.priorityNode_;
      return new ChildrenNode(newChildren, newPriority, newIndexMap);
    }
  };

  /** @inheritDoc */
  updateChild(path, newChildNode) {
    var front = path.getFront();
    if (front === null) {
      return newChildNode;
    } else {
      assert(path.getFront() !== '.priority' || path.getLength() === 1,
          '.priority must be the last token in a path');
      var newImmediateChild = this.getImmediateChild(front).
        updateChild(path.popFront(), newChildNode);
      return this.updateImmediateChild(front, newImmediateChild);
    }
  };

  /** @inheritDoc */
  isEmpty() {
    return this.children_.isEmpty();
  };

  /** @inheritDoc */
  numChildren() {
    return this.children_.count();
  };

  /**
   * @private
   * @type {RegExp}
   */
  static INTEGER_REGEXP_ = /^(0|[1-9]\d*)$/;

  /** @inheritDoc */
  val(opt_exportFormat) {
    if (this.isEmpty())
      return null;

    var obj = { };
    var numKeys = 0, maxKey = 0, allIntegerKeys = true;
    this.forEachChild(PRIORITY_INDEX, function(key, childNode) {
      obj[key] = childNode.val(opt_exportFormat);

      numKeys++;
      if (allIntegerKeys && ChildrenNode.INTEGER_REGEXP_.test(key)) {
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
  hash() {
    if (this.lazyHash_ === null) {
      var toHash = '';
      if (!this.getPriority().isEmpty())
        toHash += 'priority:' + priorityHashText(
            /**@type {(!string|!number)} */ (this.getPriority().val())) + ':';

      this.forEachChild(PRIORITY_INDEX, function(key, childNode) {
        var childHash = childNode.hash();
        if (childHash !== '')
          toHash += ':' + key + ':' + childHash;
      });

      this.lazyHash_ = (toHash === '') ? '' : sha1(toHash);
    }
    return this.lazyHash_;
  };


  /** @inheritDoc */
  getPredecessorChildName(childName, childNode, index) {
    var idx = this.resolveIndex_(index);
    if (idx) {
      var predecessor = idx.getPredecessorKey(new NamedNode(childName, childNode));
      return predecessor ? predecessor.name : null;
    } else {
      return this.children_.getPredecessorKey(childName);
    }
  };

  /**
   * @param {!fb.core.snap.Index} indexDefinition
   * @return {?string}
   */
  getFirstChildName(indexDefinition) {
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
   * @return {?NamedNode}
   */
  getFirstChild(indexDefinition) {
    var minKey = this.getFirstChildName(indexDefinition);
    if (minKey) {
      return new NamedNode(minKey, this.children_.get(minKey));
    } else {
      return null;
    }
  };

  /**
   * Given an index, return the key name of the largest value we have, according to that index
   * @param {!fb.core.snap.Index} indexDefinition
   * @return {?string}
   */
  getLastChildName(indexDefinition) {
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
   * @return {?NamedNode}
   */
  getLastChild(indexDefinition) {
    var maxKey = this.getLastChildName(indexDefinition);
    if (maxKey) {
      return new NamedNode(maxKey, this.children_.get(maxKey));
    } else {
      return null;
    }
  };


  /**
   * @inheritDoc
   */
  forEachChild(index, action) {
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
   * @return {SortedMapIterator}
   */
  getIterator(indexDefinition) {
    return this.getIteratorFrom(indexDefinition.minPost(), indexDefinition);
  };

  /**
   *
   * @param {!NamedNode} startPost
   * @param {!fb.core.snap.Index} indexDefinition
   * @return {!SortedMapIterator}
   */
  getIteratorFrom(startPost, indexDefinition) {
    var idx = this.resolveIndex_(indexDefinition);
    if (idx) {
      return idx.getIteratorFrom(startPost, function(key) { return key; });
    } else {
      var iterator = this.children_.getIteratorFrom(startPost.name, NamedNode.Wrap);
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
   * @return {!SortedMapIterator}
   */
  getReverseIterator(indexDefinition) {
    return this.getReverseIteratorFrom(indexDefinition.maxPost(), indexDefinition);
  };

  /**
   * @param {!NamedNode} endPost
   * @param {!fb.core.snap.Index} indexDefinition
   * @return {!SortedMapIterator}
   */
  getReverseIteratorFrom(endPost, indexDefinition) {
    var idx = this.resolveIndex_(indexDefinition);
    if (idx) {
      return idx.getReverseIteratorFrom(endPost, function(key) { return key; });
    } else {
      var iterator = this.children_.getReverseIteratorFrom(endPost.name, NamedNode.Wrap);
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
  compareTo(other) {
    if (this.isEmpty()) {
      if (other.isEmpty()) {
        return 0;
      } else {
        return -1;
      }
    } else if (other.isLeafNode() || other.isEmpty()) {
      return 1;
    } else if (other === MAX_NODE) {
      return -1;
    } else {
      // Must be another node with children.
      return 0;
    }
  };

  /**
   * @inheritDoc
   */
  withIndex(indexDefinition) {
    if (indexDefinition === KEY_INDEX || this.indexMap_.hasIndex(indexDefinition)) {
      return this;
    } else {
      var newIndexMap = this.indexMap_.addIndex(indexDefinition, this.children_);
      return new ChildrenNode(this.children_, this.priorityNode_, newIndexMap);
    }
  };

  /**
   * @inheritDoc
   */
  isIndexed(index) {
    return index === KEY_INDEX || this.indexMap_.hasIndex(index);
  };

  /**
   * @inheritDoc
   */
  equals(other) {
    if (other === this) {
      return true;
    }
    else if (other.isLeafNode()) {
      return false;
    } else {
      var otherChildrenNode = /** @type {!ChildrenNode} */ (other);
      if (!this.getPriority().equals(otherChildrenNode.getPriority())) {
        return false;
      } else if (this.children_.count() === otherChildrenNode.children_.count()) {
        var thisIter = this.getIterator(PRIORITY_INDEX);
        var otherIter = otherChildrenNode.getIterator(PRIORITY_INDEX);
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
   * @return {?SortedMap.<NamedNode, Node>}
   */
  resolveIndex_(indexDefinition) {
    if (indexDefinition === KEY_INDEX) {
      return null;
    } else {
      return this.indexMap_.get(indexDefinition.toString());
    }
  };

}

/**
 * @constructor
 * @extends {ChildrenNode}
 * @private
 */
export class MaxNode extends ChildrenNode { 
  constructor() {
    super(new SortedMap(NAME_COMPARATOR), ChildrenNode.EMPTY_NODE, IndexMap.Default);
  }

  compareTo(other) {
    if (other === this) {
      return 0;
    } else {
      return 1;
    }
  };


  equals(other) {
    // Not that we every compare it, but MAX_NODE is only ever equal to itself
    return other === this;
  };


  getPriority() {
    return this;
  };


  getImmediateChild(childName) {
    return ChildrenNode.EMPTY_NODE;
  };


  isEmpty() {
    return false;
  };
}

/**
 * Marker that will sort higher than any other snapshot.
 * @type {!MAX_NODE}
 * @const
 */
export const MAX_NODE = new MaxNode();

/**
 * Document NamedNode extensions
 */
declare module './Node' {
  interface NamedNode {
    MIN: NamedNode,
    MAX: NamedNode
  }
}

Object.defineProperties(NamedNode, {
  MIN: {
    value: new NamedNode(MIN_NAME, ChildrenNode.EMPTY_NODE)
  },
  MAX: {
    value: new NamedNode(MAX_NAME, MAX_NODE)
  }
});