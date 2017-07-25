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

export type Comparator<K> = (key1: K, key2: K) => number;

/**
 * An iterator over an LLRBNode.
 */
export class SortedMapIterator<K, V, T> {
  /** @private
   * @type {Array.<!LLRBNode>}
   */
  private nodeStack_: (LLRBNode<K, V> | LLRBEmptyNode<K, V>)[] = [];

  /**
   * @template K, V, T
   * @param {LLRBNode|LLRBEmptyNode} node Node to iterate.
   * @param {?K} startKey
   * @param {function(K, K): number} comparator
   * @param {boolean} isReverse_ Whether or not to iterate in reverse
   * @param {(function(K, V):T)=} resultGenerator_
   */
  constructor(
    node: LLRBNode<K, V> | LLRBEmptyNode<K, V>,
    startKey: K | null,
    comparator: Comparator<K>,
    private isReverse_: boolean,
    private resultGenerator_: ((k: K, v: V) => T) | null = null
  ) {
    let cmp = 1;
    while (!node.isEmpty()) {
      node = node as LLRBNode<K, V>;
      cmp = startKey ? comparator(node.key, startKey) : 1;
      // flip the comparison if we're going in reverse
      if (isReverse_) cmp *= -1;

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

  getNext(): T {
    if (this.nodeStack_.length === 0) return null;

    let node = this.nodeStack_.pop();
    let result: T;
    if (this.resultGenerator_)
      result = this.resultGenerator_(node.key, node.value);
    else result = { key: node.key, value: node.value } as any;

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

  hasNext(): boolean {
    return this.nodeStack_.length > 0;
  }

  peek(): T {
    if (this.nodeStack_.length === 0) return null;

    const node = this.nodeStack_[this.nodeStack_.length - 1];
    if (this.resultGenerator_) {
      return this.resultGenerator_(node.key, node.value);
    } else {
      return { key: node.key, value: node.value } as any;
    }
  }
}

/**
 * Represents a node in a Left-leaning Red-Black tree.
 */
export class LLRBNode<K, V> {
  color: boolean;
  left: LLRBNode<K, V> | LLRBEmptyNode<K, V>;
  right: LLRBNode<K, V> | LLRBEmptyNode<K, V>;

  /**
   * @template K, V
   * @param {!K} key Key associated with this node.
   * @param {!V} value Value associated with this node.
   * @param {?boolean} color Whether this node is red.
   * @param {?(LLRBNode|LLRBEmptyNode)=} left Left child.
   * @param {?(LLRBNode|LLRBEmptyNode)=} right Right child.
   */
  constructor(
    public key: K,
    public value: V,
    color: boolean | null,
    left?: LLRBNode<K, V> | LLRBEmptyNode<K, V> | null,
    right?: LLRBNode<K, V> | LLRBEmptyNode<K, V> | null
  ) {
    this.color = color != null ? color : LLRBNode.RED;
    this.left =
      left != null ? left : SortedMap.EMPTY_NODE as LLRBEmptyNode<K, V>;
    this.right =
      right != null ? right : SortedMap.EMPTY_NODE as LLRBEmptyNode<K, V>;
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
  copy(
    key: K | null,
    value: V | null,
    color: boolean | null,
    left: LLRBNode<K, V> | LLRBEmptyNode<K, V> | null,
    right: LLRBNode<K, V> | LLRBEmptyNode<K, V> | null
  ): LLRBNode<K, V> {
    return new LLRBNode(
      key != null ? key : this.key,
      value != null ? value : this.value,
      color != null ? color : this.color,
      left != null ? left : this.left,
      right != null ? right : this.right
    );
  }

  /**
   * @return {number} The total number of nodes in the tree.
   */
  count(): number {
    return this.left.count() + 1 + this.right.count();
  }

  /**
   * @return {boolean} True if the tree is empty.
   */
  isEmpty(): boolean {
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
  inorderTraversal(action: (k: K, v: V) => any): boolean {
    return (
      this.left.inorderTraversal(action) ||
      action(this.key, this.value) ||
      this.right.inorderTraversal(action)
    );
  }

  /**
   * Traverses the tree in reverse key order and calls the specified action function
   * for each node.
   *
   * @param {function(!Object, !Object)} action Callback function to be called for each
   * node.  If it returns true, traversal is aborted.
   * @return {*} True if traversal was aborted.
   */
  reverseTraversal(action: (k: K, v: V) => void): boolean {
    return (
      this.right.reverseTraversal(action) ||
      action(this.key, this.value) ||
      this.left.reverseTraversal(action)
    );
  }

  /**
   * @return {!Object} The minimum node in the tree.
   * @private
   */
  private min_(): LLRBNode<K, V> {
    if (this.left.isEmpty()) {
      return this;
    } else {
      return (this.left as LLRBNode<K, V>).min_();
    }
  }

  /**
   * @return {!K} The maximum key in the tree.
   */
  minKey(): K {
    return this.min_().key;
  }

  /**
   * @return {!K} The maximum key in the tree.
   */
  maxKey(): K {
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
   * @param {Comparator} comparator Comparator.
   * @return {!LLRBNode} New tree, with the key/value added.
   */
  insert(key: K, value: V, comparator: Comparator<K>): LLRBNode<K, V> {
    let cmp, n;
    n = this;
    cmp = comparator(key, n.key);
    if (cmp < 0) {
      n = n.copy(null, null, null, n.left.insert(key, value, comparator), null);
    } else if (cmp === 0) {
      n = n.copy(null, value, null, null, null);
    } else {
      n = n.copy(
        null,
        null,
        null,
        null,
        n.right.insert(key, value, comparator)
      );
    }
    return n.fixUp_();
  }

  /**
   * @private
   * @return {!LLRBNode|LLRBEmptyNode} New tree, with the minimum key removed.
   */
  private removeMin_(): LLRBNode<K, V> | LLRBEmptyNode<K, V> {
    if (this.left.isEmpty()) {
      return SortedMap.EMPTY_NODE as LLRBEmptyNode<K, V>;
    }
    let n: LLRBNode<K, V> = this;
    if (!n.left.isRed_() && !n.left.left.isRed_()) n = n.moveRedLeft_();
    n = n.copy(null, null, null, (n.left as LLRBNode<K, V>).removeMin_(), null);
    return n.fixUp_();
  }

  /**
   * @param {!Object} key The key of the item to remove.
   * @param {Comparator} comparator Comparator.
   * @return {!LLRBNode|LLRBEmptyNode} New tree, with the specified item removed.
   */
  remove(
    key: K,
    comparator: Comparator<K>
  ): LLRBNode<K, V> | LLRBEmptyNode<K, V> {
    let n, smallest;
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
          return SortedMap.EMPTY_NODE as LLRBEmptyNode<K, V>;
        } else {
          smallest = (n.right as LLRBNode<K, V>).min_();
          n = n.copy(
            smallest.key,
            smallest.value,
            null,
            null,
            (n.right as LLRBNode<K, V>).removeMin_()
          );
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
  isRed_(): boolean {
    return this.color;
  }

  /**
   * @private
   * @return {!LLRBNode} New tree after performing any needed rotations.
   */
  private fixUp_(): LLRBNode<K, V> {
    let n = this as any;
    if (n.right.isRed_() && !n.left.isRed_()) n = n.rotateLeft_();
    if (n.left.isRed_() && n.left.left.isRed_()) n = n.rotateRight_();
    if (n.left.isRed_() && n.right.isRed_()) n = n.colorFlip_();
    return n;
  }

  /**
   * @private
   * @return {!LLRBNode} New tree, after moveRedLeft.
   */
  private moveRedLeft_(): LLRBNode<K, V> {
    let n = this.colorFlip_();
    if (n.right.left.isRed_()) {
      n = n.copy(
        null,
        null,
        null,
        null,
        (n.right as LLRBNode<K, V>).rotateRight_()
      );
      n = n.rotateLeft_();
      n = n.colorFlip_();
    }
    return n;
  }

  /**
   * @private
   * @return {!LLRBNode} New tree, after moveRedRight.
   */
  private moveRedRight_(): LLRBNode<K, V> {
    let n = this.colorFlip_();
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
  private rotateLeft_(): LLRBNode<K, V> {
    const nl = this.copy(null, null, LLRBNode.RED, null, this.right.left);
    return this.right.copy(null, null, this.color, nl, null) as LLRBNode<K, V>;
  }

  /**
   * @private
   * @return {!LLRBNode} New tree, after rotateRight.
   */
  private rotateRight_(): LLRBNode<K, V> {
    const nr = this.copy(null, null, LLRBNode.RED, this.left.right, null);
    return this.left.copy(null, null, this.color, null, nr) as LLRBNode<K, V>;
  }

  /**
   * @private
   * @return {!LLRBNode} New tree, after colorFlip.
   */
  private colorFlip_(): LLRBNode<K, V> {
    const left = this.left.copy(null, null, !this.left.color, null, null);
    const right = this.right.copy(null, null, !this.right.color, null, null);
    return this.copy(null, null, !this.color, left, right);
  }

  /**
   * For testing.
   *
   * @private
   * @return {boolean} True if all is well.
   */
  private checkMaxDepth_(): boolean {
    const blackDepth = this.check_();
    return Math.pow(2.0, blackDepth) <= this.count() + 1;
  }

  /**
   * @private
   * @return {number} Not sure what this returns exactly. :-).
   */
  check_(): number {
    let blackDepth;
    if (this.isRed_() && this.left.isRed_()) {
      throw new Error(
        'Red node has red child(' + this.key + ',' + this.value + ')'
      );
    }
    if (this.right.isRed_()) {
      throw new Error(
        'Right child of (' + this.key + ',' + this.value + ') is red'
      );
    }
    blackDepth = this.left.check_();
    if (blackDepth !== this.right.check_()) {
      throw new Error('Black depths differ');
    } else {
      return blackDepth + (this.isRed_() ? 0 : 1);
    }
  }
}

/**
 * Represents an empty node (a leaf node in the Red-Black Tree).
 */
export class LLRBEmptyNode<K, V> {
  key: K;
  value: V;
  left: LLRBNode<K, V> | LLRBEmptyNode<K, V>;
  right: LLRBNode<K, V> | LLRBEmptyNode<K, V>;
  color: boolean;

  /**
   * Returns a copy of the current node.
   *
   * @return {!LLRBEmptyNode} The node copy.
   */
  copy(
    key: K | null,
    value: V | null,
    color: boolean | null,
    left: LLRBNode<K, V> | LLRBEmptyNode<K, V> | null,
    right: LLRBNode<K, V> | LLRBEmptyNode<K, V> | null
  ): LLRBEmptyNode<K, V> {
    return this;
  }

  /**
   * Returns a copy of the tree, with the specified key/value added.
   *
   * @param {!K} key Key to be added.
   * @param {!V} value Value to be added.
   * @param {Comparator} comparator Comparator.
   * @return {!LLRBNode} New tree, with item added.
   */
  insert(key: K, value: V, comparator: Comparator<K>): LLRBNode<K, V> {
    return new LLRBNode(key, value, null);
  }

  /**
   * Returns a copy of the tree, with the specified key removed.
   *
   * @param {!K} key The key to remove.
   * @param {Comparator} comparator Comparator.
   * @return {!LLRBEmptyNode} New tree, with item removed.
   */
  remove(key: K, comparator: Comparator<K>): LLRBEmptyNode<K, V> {
    return this;
  }

  /**
   * @return {number} The total number of nodes in the tree.
   */
  count(): number {
    return 0;
  }

  /**
   * @return {boolean} True if the tree is empty.
   */
  isEmpty(): boolean {
    return true;
  }

  /**
   * Traverses the tree in key order and calls the specified action function
   * for each node.
   *
   * @param {function(!K, !V):*} action Callback function to be called for each
   * node.  If it returns true, traversal is aborted.
   * @return {boolean} True if traversal was aborted.
   */
  inorderTraversal(action: (k: K, v: V) => any): boolean {
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
  reverseTraversal(action: (k: K, v: V) => void): boolean {
    return false;
  }

  /**
   * @return {null}
   */
  minKey(): null {
    return null;
  }

  /**
   * @return {null}
   */
  maxKey(): null {
    return null;
  }

  /**
   * @private
   * @return {number} Not sure what this returns exactly. :-).
   */
  check_(): number {
    return 0;
  }

  /**
   * @private
   * @return {boolean} Whether this node is red.
   */
  isRed_() {
    return false;
  }
}

/**
 * An immutable sorted map implementation, based on a Left-leaning Red-Black
 * tree.
 */
export class SortedMap<K, V> {
  /**
   * Always use the same empty node, to reduce memory.
   * @const
   */
  static EMPTY_NODE = new LLRBEmptyNode();

  /**
   * @template K, V
   * @param {function(K, K):number} comparator_ Key comparator.
   * @param {LLRBNode=} root_ (Optional) Root node for the map.
   */
  constructor(
    private comparator_: Comparator<K>,
    private root_:
      | LLRBNode<K, V>
      | LLRBEmptyNode<K, V> = SortedMap.EMPTY_NODE as LLRBEmptyNode<K, V>
  ) {}

  /**
   * Returns a copy of the map, with the specified key/value added or replaced.
   * (TODO: We should perhaps rename this method to 'put')
   *
   * @param {!K} key Key to be added.
   * @param {!V} value Value to be added.
   * @return {!SortedMap.<K, V>} New map, with item added.
   */
  insert(key: K, value: V): SortedMap<K, V> {
    return new SortedMap(
      this.comparator_,
      this.root_
        .insert(key, value, this.comparator_)
        .copy(null, null, LLRBNode.BLACK, null, null)
    );
  }

  /**
   * Returns a copy of the map, with the specified key removed.
   *
   * @param {!K} key The key to remove.
   * @return {!SortedMap.<K, V>} New map, with item removed.
   */
  remove(key: K): SortedMap<K, V> {
    return new SortedMap(
      this.comparator_,
      this.root_
        .remove(key, this.comparator_)
        .copy(null, null, LLRBNode.BLACK, null, null)
    );
  }

  /**
   * Returns the value of the node with the given key, or null.
   *
   * @param {!K} key The key to look up.
   * @return {?V} The value of the node with the given key, or null if the
   * key doesn't exist.
   */
  get(key: K): V | null {
    let cmp;
    let node = this.root_;
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
  getPredecessorKey(key: K): K | null {
    let cmp,
      node = this.root_,
      rightParent = null;
    while (!node.isEmpty()) {
      cmp = this.comparator_(key, node.key);
      if (cmp === 0) {
        if (!node.left.isEmpty()) {
          node = node.left;
          while (!node.right.isEmpty()) node = node.right;
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

    throw new Error(
      'Attempted to find predecessor key for a nonexistent key.  What gives?'
    );
  }

  /**
   * @return {boolean} True if the map is empty.
   */
  isEmpty(): boolean {
    return this.root_.isEmpty();
  }

  /**
   * @return {number} The total number of nodes in the map.
   */
  count(): number {
    return this.root_.count();
  }

  /**
   * @return {?K} The minimum key in the map.
   */
  minKey(): K | null {
    return this.root_.minKey();
  }

  /**
   * @return {?K} The maximum key in the map.
   */
  maxKey(): K | null {
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
  inorderTraversal(action: (k: K, v: V) => any): boolean {
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
  reverseTraversal(action: (k: K, v: V) => void): boolean {
    return this.root_.reverseTraversal(action);
  }

  /**
   * Returns an iterator over the SortedMap.
   * @template T
   * @param {(function(K, V):T)=} resultGenerator
   * @return {SortedMapIterator.<K, V, T>} The iterator.
   */
  getIterator<T>(
    resultGenerator?: (k: K, v: V) => T
  ): SortedMapIterator<K, V, T> {
    return new SortedMapIterator(
      this.root_,
      null,
      this.comparator_,
      false,
      resultGenerator
    );
  }

  getIteratorFrom<T>(
    key: K,
    resultGenerator?: (k: K, v: V) => T
  ): SortedMapIterator<K, V, T> {
    return new SortedMapIterator(
      this.root_,
      key,
      this.comparator_,
      false,
      resultGenerator
    );
  }

  getReverseIteratorFrom<T>(
    key: K,
    resultGenerator?: (k: K, v: V) => T
  ): SortedMapIterator<K, V, T> {
    return new SortedMapIterator(
      this.root_,
      key,
      this.comparator_,
      true,
      resultGenerator
    );
  }

  getReverseIterator<T>(
    resultGenerator?: (k: K, v: V) => T
  ): SortedMapIterator<K, V, T> {
    return new SortedMapIterator(
      this.root_,
      null,
      this.comparator_,
      true,
      resultGenerator
    );
  }
}
