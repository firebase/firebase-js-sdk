/**
 * @fileoverview Implementation of an immutable SortedMap using a Left-leaning
 * Red-Black Tree, adapted from the implementation in Mugs
 * (http://mads379.github.com/mugs/) by Mads Hartmann Jensen
 * (mads379@gmail.com).
 *
 * Original paper on Left-leaning Red-Black Trees:
 *   http://www.cs.princeton.edu/~rs/talks/LLRB/LLRB.pdf
 *
 * Invariant 1: No red node has a red child
 * Invariant 2: Every leaf path has the same number of black nodes
 * Invariant 3: Only the left child can be red (left leaning)
 */


// TODO: There are some improvements I'd like to make to improve memory / perf:
//  * Create two prototypes, LLRedNode and LLBlackNode, instead of storing a
//    color property in every node.
// TODO: It would also be good (and possibly necessary) to create a base
// interface for LLRBNode and LLRBEmptyNode.


/**
 * An iterator over an LLRBNode.
 */
export class SortedMapIterator {
  /** @private
   * @type {?function(!K, !V): T}
   */
  resultGenerator_;
  isReverse_;

  /** @private
   * @type {Array.<!LLRBNode>}
   */
  nodeStack_: Array<LLRBNode>;

  /**
   * @template K, V, T
   * @param {LLRBNode|LLRBEmptyNode} node Node to iterate.
   * @param {?K} startKey
   * @param {function(K, K): number} comparator
   * @param {boolean} isReverse Whether or not to iterate in reverse
   * @param {(function(K, V):T)=} opt_resultGenerator
   */
  constructor(node, startKey, comparator, isReverse, opt_resultGenerator?) {
    /** @private
     * @type {?function(!K, !V): T}
     */
    this.resultGenerator_ = opt_resultGenerator || null;
    this.isReverse_ = isReverse;

    /** @private
     * @type {Array.<!LLRBNode>}
     */
    this.nodeStack_ = [];

    var cmp = 1;
    while (!node.isEmpty()) {
      cmp = startKey ? comparator(node.key, startKey) : 1;
      // flip the comparison if we're going in reverse
      if (isReverse) cmp *= -1;

      if (cmp < 0) {
        // This node is less than our start key. ignore it
        if (this.isReverse_) {
          node = node.left;
        } else {
          node = node.right;
        }
      } else if (cmp === 0) {
        // This node is exactly equal to our start key. Push it on the stack, but stop iterating;
        this.nodeStack_.push(node);
        break;
      } else {
        // This node is greater than our start key, add it to the stack and move to the next one
        this.nodeStack_.push(node);
        if (this.isReverse_) {
          node = node.right;
        } else {
          node = node.left;
        }
      }
    }
  }

  getNext() {
    if (this.nodeStack_.length === 0)
      return null;

    var node = this.nodeStack_.pop(), result;
    if (this.resultGenerator_)
      result = this.resultGenerator_(node.key, node.value);
    else
      result = {key: node.key, value: node.value};

    if (this.isReverse_) {
      node = node.left;
      while (!node.isEmpty()) {
        this.nodeStack_.push(node);
        node = node.right;
      }
    } else {
      node = node.right;
      while (!node.isEmpty()) {
        this.nodeStack_.push(node);
        node = node.left;
      }
    }

    return result;
  }

  hasNext() {
    return this.nodeStack_.length > 0;
  }

  peek() {
    if (this.nodeStack_.length === 0)
      return null;

    var node = this.nodeStack_[this.nodeStack_.length - 1];
    if (this.resultGenerator_) {
      return this.resultGenerator_(node.key, node.value);
    } else {
      return { key: node.key, value: node.value };
    }
  }
}; // end SortedMapIterator


/**
 * Represents a node in a Left-leaning Red-Black tree.
 */
export class LLRBNode {
  key;
  value;
  color;
  left;
  right;

  /**
   * @template K, V
   * @param {!K} key Key associated with this node.
   * @param {!V} value Value associated with this node.
   * @param {?boolean} color Whether this node is red.
   * @param {?(LLRBNode|LLRBEmptyNode)=} opt_left Left child.
   * @param {?(LLRBNode|LLRBEmptyNode)=} opt_right Right child.
   */
  constructor(key, value, color, opt_left?, opt_right?) {
    this.key = key;
    this.value = value;
    this.color = color != null ? color : LLRBNode.RED;
    this.left = opt_left != null ? opt_left : SortedMap.EMPTY_NODE_;
    this.right = opt_right != null ? opt_right : SortedMap.EMPTY_NODE_;
  }

  static RED = true;
  static BLACK = false;

  /**
   * Returns a copy of the current node, optionally replacing pieces of it.
   *
   * @param {?K} key New key for the node, or null.
   * @param {?V} value New value for the node, or null.
   * @param {?boolean} color New color for the node, or null.
   * @param {?LLRBNode|LLRBEmptyNode} left New left child for the node, or null.
   * @param {?LLRBNode|LLRBEmptyNode} right New right child for the node, or null.
   * @return {!LLRBNode} The node copy.
   */
  copy(key, value, color, left, right) {
    return new LLRBNode(
        (key != null) ? key : this.key,
        (value != null) ? value : this.value,
        (color != null) ? color : this.color,
        (left != null) ? left : this.left,
        (right != null) ? right : this.right);
  }

  /**
   * @return {number} The total number of nodes in the tree.
   */
  count() {
    return this.left.count() + 1 + this.right.count();
  }

  /**
   * @return {boolean} True if the tree is empty.
   */
  isEmpty() {
    return false;
  }

  /**
   * Traverses the tree in key order and calls the specified action function
   * for each node.
   *
   * @param {function(!K, !V):*} action Callback function to be called for each
   *   node.  If it returns true, traversal is aborted.
   * @return {*} The first truthy value returned by action, or the last falsey
   *   value returned by action
   */
  inorderTraversal(action) {
    return this.left.inorderTraversal(action) ||
        action(this.key, this.value) ||
        this.right.inorderTraversal(action);
  }

  /**
   * Traverses the tree in reverse key order and calls the specified action function
   * for each node.
   *
   * @param {function(!Object, !Object)} action Callback function to be called for each
   * node.  If it returns true, traversal is aborted.
   * @return {*} True if traversal was aborted.
   */
  reverseTraversal(action) {
    return this.right.reverseTraversal(action) ||
        action(this.key, this.value) ||
        this.left.reverseTraversal(action);
  }

  /**
   * @return {!Object} The minimum node in the tree.
   * @private
   */
  min_() {
    if (this.left.isEmpty()) {
      return this;
    } else {
      return this.left.min_();
    }
  }

  /**
   * @return {!K} The maximum key in the tree.
   */
  minKey() {
    return this.min_().key;
  }

  /**
   * @return {!K} The maximum key in the tree.
   */
  maxKey() {
    if (this.right.isEmpty()) {
      return this.key;
    } else {
      return this.right.maxKey();
    }
  }

  /**
   *
   * @param {!Object} key Key to insert.
   * @param {!Object} value Value to insert.
   * @param {fb.Comparator} comparator Comparator.
   * @return {!LLRBNode} New tree, with the key/value added.
   */
  insert(key, value, comparator) {
    var cmp, n;
    n = this;
    cmp = comparator(key, n.key);
    if (cmp < 0) {
      n = n.copy(null, null, null, n.left.insert(key, value, comparator), null);
    } else if (cmp === 0) {
      n = n.copy(null, value, null, null, null);
    } else {
      n = n.copy(null, null, null, null, n.right.insert(key, value, comparator));
    }
    return n.fixUp_();
  }

  /**
   * @private
   * @return {!LLRBNode|LLRBEmptyNode} New tree, with the minimum key removed.
   */
  removeMin_() {
    var n;
    if (this.left.isEmpty()) {
      return SortedMap.EMPTY_NODE_;
    }
    n = this;
    if (!n.left.isRed_() && !n.left.left.isRed_())
      n = n.moveRedLeft_();
    n = n.copy(null, null, null, n.left.removeMin_(), null);
    return n.fixUp_();
  }

  /**
   * @param {!Object} key The key of the item to remove.
   * @param {fb.Comparator} comparator Comparator.
   * @return {!LLRBNode|LLRBEmptyNode} New tree, with the specified item removed.
   */
  remove(key, comparator) {
    var n, smallest;
    n = this;
    if (comparator(key, n.key) < 0) {
      if (!n.left.isEmpty() && !n.left.isRed_() && !n.left.left.isRed_()) {
        n = n.moveRedLeft_();
      }
      n = n.copy(null, null, null, n.left.remove(key, comparator), null);
    } else {
      if (n.left.isRed_()) n = n.rotateRight_();
      if (!n.right.isEmpty() && !n.right.isRed_() && !n.right.left.isRed_()) {
        n = n.moveRedRight_();
      }
      if (comparator(key, n.key) === 0) {
        if (n.right.isEmpty()) {
          return SortedMap.EMPTY_NODE_;
        } else {
          smallest = n.right.min_();
          n = n.copy(smallest.key, smallest.value, null, null,
                     n.right.removeMin_());
        }
      }
      n = n.copy(null, null, null, null, n.right.remove(key, comparator));
    }
    return n.fixUp_();
  }

  /**
   * @private
   * @return {boolean} Whether this is a RED node.
   */
  isRed_() {
    return this.color;
  }

  /**
   * @private
   * @return {!LLRBNode} New tree after performing any needed rotations.
   */
  fixUp_() {
    var n = <any>this;
    if (n.right.isRed_() && !n.left.isRed_()) n = n.rotateLeft_();
    if (n.left.isRed_() && n.left.left.isRed_()) n = n.rotateRight_();
    if (n.left.isRed_() && n.right.isRed_()) n = n.colorFlip_();
    return n;
  }

  /**
   * @private
   * @return {!LLRBNode} New tree, after moveRedLeft.
   */
  moveRedLeft_() {
    var n = this.colorFlip_();
    if (n.right.left.isRed_()) {
      n = n.copy(null, null, null, null, n.right.rotateRight_());
      n = n.rotateLeft_();
      n = n.colorFlip_();
    }
    return n;
  }

  /**
   * @private
   * @return {!LLRBNode} New tree, after moveRedRight.
   */
  moveRedRight_() {
    var n = this.colorFlip_();
    if (n.left.left.isRed_()) {
      n = n.rotateRight_();
      n = n.colorFlip_();
    }
    return n;
  }

  /**
   * @private
   * @return {!LLRBNode} New tree, after rotateLeft.
   */
  rotateLeft_() {
    var nl;
    nl = this.copy(null, null, LLRBNode.RED, null, this.right.left);
    return this.right.copy(null, null, this.color, nl, null);
  }

  /**
   * @private
   * @return {!LLRBNode} New tree, after rotateRight.
   */
  rotateRight_() {
    var nr;
    nr = this.copy(null, null, LLRBNode.RED, this.left.right, null);
    return this.left.copy(null, null, this.color, null, nr);
  }

  /**
   * @private
   * @return {!LLRBNode} New tree, after colorFlip.
   */
  colorFlip_() {
    var left, right;
    left = this.left.copy(null, null, !this.left.color, null, null);
    right = this.right.copy(null, null, !this.right.color, null, null);
    return this.copy(null, null, !this.color, left, right);
  }

  /**
   * For testing.
   *
   * @private
   * @return {boolean} True if all is well.
   */
  checkMaxDepth_() {
    var blackDepth;
    blackDepth = this.check_();
    if (Math.pow(2.0, blackDepth) <= this.count() + 1) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * @private
   * @return {number} Not sure what this returns exactly. :-).
   */
  check_() {
    var blackDepth;
    if (this.isRed_() && this.left.isRed_()) {
      throw new Error('Red node has red child(' + this.key + ',' +
                      this.value + ')');
    }
    if (this.right.isRed_()) {
      throw new Error('Right child of (' + this.key + ',' +
                      this.value + ') is red');
    }
    blackDepth = this.left.check_();
    if (blackDepth !== this.right.check_()) {
      throw new Error('Black depths differ');
    } else {
      return blackDepth + (this.isRed_() ? 0 : 1);
    }
  }
}; // end LLRBNode


/**
 * Represents an empty node (a leaf node in the Red-Black Tree).
 */
export class LLRBEmptyNode {
  /**
   * @template K, V
   */
  constructor() {}

  /**
   * Returns a copy of the current node.
   *
   * @return {!LLRBEmptyNode} The node copy.
   */
  copy() {
    return this;
  }

  /**
   * Returns a copy of the tree, with the specified key/value added.
   *
   * @param {!K} key Key to be added.
   * @param {!V} value Value to be added.
   * @param {fb.Comparator} comparator Comparator.
   * @return {!LLRBNode} New tree, with item added.
   */
  insert(key, value, comparator) {
    return new LLRBNode(key, value, null);
  }

  /**
   * Returns a copy of the tree, with the specified key removed.
   *
   * @param {!K} key The key to remove.
   * @return {!LLRBEmptyNode} New tree, with item removed.
   */
  remove(key, comparator) {
    return this;
  }

  /**
   * @return {number} The total number of nodes in the tree.
   */
  count() {
    return 0;
  }

  /**
   * @return {boolean} True if the tree is empty.
   */
  isEmpty() {
    return true;
  }

  /**
   * Traverses the tree in key order and calls the specified action function
   * for each node.
   *
   * @param {function(!K, !V)} action Callback function to be called for each
   * node.  If it returns true, traversal is aborted.
   * @return {boolean} True if traversal was aborted.
   */
  inorderTraversal(action) {
    return false;
  }

  /**
   * Traverses the tree in reverse key order and calls the specified action function
   * for each node.
   *
   * @param {function(!K, !V)} action Callback function to be called for each
   * node.  If it returns true, traversal is aborted.
   * @return {boolean} True if traversal was aborted.
   */
  reverseTraversal(action) {
    return false;
  }

  /**
   * @return {null}
   */
  minKey() {
    return null;
  }

  /**
   * @return {null}
   */
  maxKey() {
    return null;
  }

  /**
   * @private
   * @return {number} Not sure what this returns exactly. :-).
   */
  check_() { return 0; }

  /**
   * @private
   * @return {boolean} Whether this node is red.
   */
  isRed_() { return false; }
}; // end LLRBEmptyNode

/**
 * An immutable sorted map implementation, based on a Left-leaning Red-Black
 * tree.
 */
export class SortedMap {
  /** @private */
  comparator_;

  /** @private */
  root_;

  /**
   * Always use the same empty node, to reduce memory.
   * @private
   * @const
   */
  static EMPTY_NODE_ = new LLRBEmptyNode();

  /**
   * @template K, V
   * @param {function(K, K):number} comparator Key comparator.
   * @param {LLRBNode=} opt_root (Optional) Root node for the map.
   */
  constructor(comparator, opt_root?) {
    /** @private */
    this.comparator_ = comparator;

    /** @private */
    this.root_ = opt_root ? opt_root : SortedMap.EMPTY_NODE_;
  }

  /**
   * Returns a copy of the map, with the specified key/value added or replaced.
   * (TODO: We should perhaps rename this method to 'put')
   *
   * @param {!K} key Key to be added.
   * @param {!V} value Value to be added.
   * @return {!SortedMap.<K, V>} New map, with item added.
   */
  insert(key, value) {
    return new SortedMap(
        this.comparator_,
        this.root_.insert(key, value, this.comparator_)
            .copy(null, null, LLRBNode.BLACK, null, null));
  }

  /**
   * Returns a copy of the map, with the specified key removed.
   *
   * @param {!K} key The key to remove.
   * @return {!SortedMap.<K, V>} New map, with item removed.
   */
  remove(key) {
    return new SortedMap(
        this.comparator_,
        this.root_.remove(key, this.comparator_)
            .copy(null, null, LLRBNode.BLACK, null, null));
  }

  /**
   * Returns the value of the node with the given key, or null.
   *
   * @param {!K} key The key to look up.
   * @return {?V} The value of the node with the given key, or null if the
   * key doesn't exist.
   */
  get(key) {
    var cmp;
    var node = this.root_;
    while (!node.isEmpty()) {
      cmp = this.comparator_(key, node.key);
      if (cmp === 0) {
        return node.value;
      } else if (cmp < 0) {
        node = node.left;
      } else if (cmp > 0) {
        node = node.right;
      }
    }
    return null;
  }

  /**
   * Returns the key of the item *before* the specified key, or null if key is the first item.
   * @param {K} key The key to find the predecessor of
   * @return {?K} The predecessor key.
   */
  getPredecessorKey(key) {
    var cmp, node = this.root_, rightParent = null;
    while (!node.isEmpty()) {
      cmp = this.comparator_(key, node.key);
      if (cmp === 0) {
        if (!node.left.isEmpty()) {
          node = node.left;
          while (!node.right.isEmpty())
            node = node.right;
          return node.key;
        } else if (rightParent) {
          return rightParent.key;
        } else {
          return null; // first item.
        }
      } else if (cmp < 0) {
        node = node.left;
      } else if (cmp > 0) {
        rightParent = node;
        node = node.right;
      }
    }

    throw new Error('Attempted to find predecessor key for a nonexistent key.  What gives?');
  }

  /**
   * @return {boolean} True if the map is empty.
   */
  isEmpty() {
    return this.root_.isEmpty();
  }

  /**
   * @return {number} The total number of nodes in the map.
   */
  count() {
    return this.root_.count();
  }

  /**
   * @return {?K} The minimum key in the map.
   */
  minKey() {
    return this.root_.minKey();
  }

  /**
   * @return {?K} The maximum key in the map.
   */
  maxKey() {
    return this.root_.maxKey();
  }

  /**
   * Traverses the map in key order and calls the specified action function
   * for each key/value pair.
   *
   * @param {function(!K, !V):*} action Callback function to be called
   * for each key/value pair.  If action returns true, traversal is aborted.
   * @return {*} The first truthy value returned by action, or the last falsey
   *   value returned by action
   */
  inorderTraversal(action) {
    return this.root_.inorderTraversal(action);
  }

  /**
   * Traverses the map in reverse key order and calls the specified action function
   * for each key/value pair.
   *
   * @param {function(!Object, !Object)} action Callback function to be called
   * for each key/value pair.  If action returns true, traversal is aborted.
   * @return {*} True if the traversal was aborted.
   */
  reverseTraversal(action) {
    return this.root_.reverseTraversal(action);
  }

  /**
   * Returns an iterator over the SortedMap.
   * @template T
   * @param {(function(K, V):T)=} opt_resultGenerator
   * @return {SortedMapIterator.<K, V, T>} The iterator.
   */
  getIterator(opt_resultGenerator) {
    return new SortedMapIterator(this.root_,
                                              null,
                                              this.comparator_,
                                              false,
                                              opt_resultGenerator);
  }

  getIteratorFrom(key, opt_resultGenerator) {
    return new SortedMapIterator(this.root_,
                                              key,
                                              this.comparator_,
                                              false,
                                              opt_resultGenerator);
  }

  getReverseIteratorFrom(key, opt_resultGenerator) {
    return new SortedMapIterator(this.root_,
                                              key,
                                              this.comparator_,
                                              true,
                                              opt_resultGenerator);
  }

  getReverseIterator(opt_resultGenerator) {
    return new SortedMapIterator(this.root_,
                                              null,
                                              this.comparator_,
                                              true,
                                              opt_resultGenerator);
  }
}; // end SortedMap