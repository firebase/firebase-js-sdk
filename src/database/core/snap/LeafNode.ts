import { assert } from '../../../utils/assert'
import { 
  doubleToIEEE754String,
  sha1
} from "../util/util";
import {
  priorityHashText,
  validatePriorityNode
} from "./snap";
import { Node } from "./Node";

let __childrenNodeConstructor;

/**
 * LeafNode is a class for storing leaf nodes in a DataSnapshot.  It
 * implements Node and stores the value of the node (a string,
 * number, or boolean) accessible via getValue().
 */
export class LeafNode implements Node {
  static set __childrenNodeConstructor(val) {
    __childrenNodeConstructor = val;
  }
  static get __childrenNodeConstructor() {
    return __childrenNodeConstructor;
  }

  value_;
  priorityNode_;
  lazyHash_;
  /**
   * @implements {Node}
   * @param {!(string|number|boolean|Object)} value The value to store in this leaf node.
   *                                         The object type is possible in the event of a deferred value
   * @param {!Node=} opt_priorityNode The priority of this node.
   */
  constructor(value, opt_priorityNode?) {
    /**
     * @private
     * @const
     * @type {!(string|number|boolean|Object)}
     */
    this.value_ = value;
    assert(this.value_ !== undefined && this.value_ !== null,
        "LeafNode shouldn't be created with null/undefined value.");

    /**
     * @private
     * @const
     * @type {!Node}
     */
    this.priorityNode_ = opt_priorityNode || LeafNode.__childrenNodeConstructor.EMPTY_NODE;
    validatePriorityNode(this.priorityNode_);

    this.lazyHash_ = null;
  }

  /**
   * The sort order for comparing leaf nodes of different types. If two leaf nodes have
   * the same type, the comparison falls back to their value
   * @type {Array.<!string>}
   * @const
   */
  static get VALUE_TYPE_ORDER() {
    return ['object', 'boolean', 'number', 'string'];
  }

  /** @inheritDoc */
  isLeafNode() { 
    return true; 
  }

  /** @inheritDoc */
  getPriority() {
    return this.priorityNode_;
  }

  /** @inheritDoc */
  updatePriority(newPriorityNode) {
    return new LeafNode(this.value_, newPriorityNode);
  }

  /** @inheritDoc */
  getImmediateChild(childName) {
    // Hack to treat priority as a regular child
    if (childName === '.priority') {
      return this.priorityNode_;
    } else {
      return LeafNode.__childrenNodeConstructor.EMPTY_NODE;
    }
  }

  /** @inheritDoc */
  getChild(path) {
    if (path.isEmpty()) {
      return this;
    } else if (path.getFront() === '.priority') {
      return this.priorityNode_;
    } else {
      return LeafNode.__childrenNodeConstructor.EMPTY_NODE;
    }
  }

  /**
   * @inheritDoc
   */
  hasChild() {
    return false;
  }

  /** @inheritDoc */
  getPredecessorChildName(childName, childNode) {
    return null;
  }

  /** @inheritDoc */
  updateImmediateChild(childName, newChildNode) {
    if (childName === '.priority') {
      return this.updatePriority(newChildNode);
    } else if (newChildNode.isEmpty() && childName !== '.priority') {
      return this;
    } else {
      return LeafNode.__childrenNodeConstructor.EMPTY_NODE
          .updateImmediateChild(childName, newChildNode)
          .updatePriority(this.priorityNode_);
    }
  }

  /** @inheritDoc */
  updateChild(path, newChildNode) {
    var front = path.getFront();
    if (front === null) {
      return newChildNode;
    } else if (newChildNode.isEmpty() && front !== '.priority') {
      return this;
    } else {
      assert(front !== '.priority' || path.getLength() === 1,
          '.priority must be the last token in a path');

      return this.updateImmediateChild(front, LeafNode.__childrenNodeConstructor.EMPTY_NODE.updateChild(path.popFront(), newChildNode));
    }
  }

  /** @inheritDoc */
  isEmpty() {
    return false;
  }

  /** @inheritDoc */
  numChildren() {
    return 0;
  }

  /** @inheritDoc */
  forEachChild(index, action) {
    return false;
  }

  /**
   * @inheritDoc
   */
  val(opt_exportFormat) {
    if (opt_exportFormat && !this.getPriority().isEmpty())
      return { '.value': this.getValue(), '.priority' : this.getPriority().val() };
    else
      return this.getValue();
  }

  /** @inheritDoc */
  hash() {
    if (this.lazyHash_ === null) {
      var toHash = '';
      if (!this.priorityNode_.isEmpty())
        toHash += 'priority:' + priorityHashText(
            /** @type {(number|string)} */ (this.priorityNode_.val())) + ':';

      var type = typeof this.value_;
      toHash += type + ':';
      if (type === 'number') {
        toHash += doubleToIEEE754String(/** @type {number} */ (this.value_));
      } else {
        toHash += this.value_;
      }
      this.lazyHash_ = sha1(toHash);
    }
    return /**@type {!string} */ (this.lazyHash_);
  }

  /**
   * Returns the value of the leaf node.
   * @return {Object|string|number|boolean} The value of the node.
   */
  getValue() {
    return this.value_;
  }

  /**
   * @inheritDoc
   */
  compareTo(other) {
    if (other === LeafNode.__childrenNodeConstructor.EMPTY_NODE) {
      return 1;
    } else if (other instanceof LeafNode.__childrenNodeConstructor) {
      return -1;
    } else {
      assert(other.isLeafNode(), 'Unknown node type');
      return this.compareToLeafNode_(/** @type {!LeafNode} */ (other));
    }
  }

  /**
   * Comparison specifically for two leaf nodes
   * @param {!LeafNode} otherLeaf
   * @return {!number}
   * @private
   */
  compareToLeafNode_(otherLeaf) {
    var otherLeafType = typeof otherLeaf.value_;
    var thisLeafType = typeof this.value_;
    var otherIndex = LeafNode.VALUE_TYPE_ORDER.indexOf(otherLeafType);
    var thisIndex = LeafNode.VALUE_TYPE_ORDER.indexOf(thisLeafType);
    assert(otherIndex >= 0, 'Unknown leaf type: ' + otherLeafType);
    assert(thisIndex >= 0, 'Unknown leaf type: ' + thisLeafType);
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
  }

  /**
   * @inheritDoc
   */
  withIndex() {
    return this;
  }

  /**
   * @inheritDoc
   */
  isIndexed() {
    return true;
  }

  /**
   * @inheritDoc
   */
  equals(other) {
    /**
     * @inheritDoc
     */
    if (other === this) {
      return true;
    }
    else if (other.isLeafNode()) {
      var otherLeaf = /** @type {!LeafNode} */ (other);
      return this.value_ === otherLeaf.value_ && this.priorityNode_.equals(otherLeaf.priorityNode_);
    } else {
      return false;
    }
  }
}; // end LeafNode