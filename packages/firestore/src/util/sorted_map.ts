/**
 * @license
 * Copyright 2017 Google LLC
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

import { debugAssert, fail } from './assert';

/*
 * Implementation of an immutable SortedMap using a Left-leaning
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

export type Comparator<K> = (key1: K, key2: K) => number;

export interface Entry<K, V> {
  key: K;
  value: V;
}

// An immutable sorted map implementation, based on a Left-leaning Red-Black
// tree.
export class SortedMap<K, V> {
  // visible for testing
  root: LLRBNode<K, V> | LLRBEmptyNode<K, V>;

  constructor(
    public comparator: Comparator<K>,
    root?: LLRBNode<K, V> | LLRBEmptyNode<K, V>
  ) {
    this.root = root ? root : LLRBNode.EMPTY;
  }

  // Returns a copy of the map, with the specified key/value added or replaced.
  insert(key: K, value: V): SortedMap<K, V> {
    return new SortedMap<K, V>(
      this.comparator,
      this.root
        .insert(key, value, this.comparator)
        .copy(null, null, LLRBNode.BLACK, null, null)
    );
  }

  // Returns a copy of the map, with the specified key removed.
  remove(key: K): SortedMap<K, V> {
    return new SortedMap<K, V>(
      this.comparator,
      this.root
        .remove(key, this.comparator)
        .copy(null, null, LLRBNode.BLACK, null, null)
    );
  }

  // Returns the value of the node with the given key, or null.
  get(key: K): V | null {
    let node = this.root;
    while (!node.isEmpty()) {
      const cmp = this.comparator(key, node.key);
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

  // Returns the index of the element in this sorted map, or -1 if it doesn't
  // exist.
  indexOf(key: K): number {
    // Number of nodes that were pruned when descending right
    let prunedNodes = 0;
    let node = this.root;
    while (!node.isEmpty()) {
      const cmp = this.comparator(key, node.key);
      if (cmp === 0) {
        return prunedNodes + node.left.size;
      } else if (cmp < 0) {
        node = node.left;
      } else {
        // Count all nodes left of the node plus the node itself
        prunedNodes += node.left.size + 1;
        node = node.right;
      }
    }
    // Node not found
    return -1;
  }

  isEmpty(): boolean {
    return this.root.isEmpty();
  }

  // Returns the total number of nodes in the map.
  get size(): number {
    return this.root.size;
  }

  // Returns the minimum key in the map.
  minKey(): K | null {
    return this.root.minKey();
  }

  // Returns the maximum key in the map.
  maxKey(): K | null {
    return this.root.maxKey();
  }

  // Traverses the map in key order and calls the specified action function
  // for each key/value pair. If action returns true, traversal is aborted.
  // Returns the first truthy value returned by action, or the last falsey
  // value returned by action.
  inorderTraversal<T>(action: (k: K, v: V) => T): T {
    return (this.root as LLRBNode<K, V>).inorderTraversal(action);
  }

  forEach(fn: (k: K, v: V) => void): void {
    this.inorderTraversal((k, v) => {
      fn(k, v);
      return false;
    });
  }

  toString(): string {
    const descriptions: string[] = [];
    this.inorderTraversal((k, v) => {
      descriptions.push(`${k}:${v}`);
      return false;
    });
    return `{${descriptions.join(', ')}}`;
  }

  // Traverses the map in reverse key order and calls the specified action
  // function for each key/value pair. If action returns true, traversal is
  // aborted.
  // Returns the first truthy value returned by action, or the last falsey
  // value returned by action.
  reverseTraversal<T>(action: (k: K, v: V) => T): T {
    return (this.root as LLRBNode<K, V>).reverseTraversal(action);
  }

  // Returns an iterator over the SortedMap.
  getIterator(): SortedMapIterator<K, V> {
    return new SortedMapIterator<K, V>(this.root, null, this.comparator, false);
  }

  getIteratorFrom(key: K): SortedMapIterator<K, V> {
    return new SortedMapIterator<K, V>(this.root, key, this.comparator, false);
  }

  getReverseIterator(): SortedMapIterator<K, V> {
    return new SortedMapIterator<K, V>(this.root, null, this.comparator, true);
  }

  getReverseIteratorFrom(key: K): SortedMapIterator<K, V> {
    return new SortedMapIterator<K, V>(this.root, key, this.comparator, true);
  }
} // end SortedMap

// An iterator over an LLRBNode.
export class SortedMapIterator<K, V> {
  private isReverse: boolean;
  private nodeStack: Array<LLRBNode<K, V> | LLRBEmptyNode<K, V>>;

  constructor(
    node: LLRBNode<K, V> | LLRBEmptyNode<K, V>,
    startKey: K | null,
    comparator: Comparator<K>,
    isReverse: boolean
  ) {
    this.isReverse = isReverse;
    this.nodeStack = [];

    let cmp = 1;
    while (!node.isEmpty()) {
      cmp = startKey ? comparator(node.key, startKey) : 1;
      // flip the comparison if we're going in reverse
      if (startKey && isReverse) {
        cmp *= -1;
      }

      if (cmp < 0) {
        // This node is less than our start key. ignore it
        if (this.isReverse) {
          node = node.left;
        } else {
          node = node.right;
        }
      } else if (cmp === 0) {
        // This node is exactly equal to our start key. Push it on the stack,
        // but stop iterating;
        this.nodeStack.push(node);
        break;
      } else {
        // This node is greater than our start key, add it to the stack and move
        // to the next one
        this.nodeStack.push(node);
        if (this.isReverse) {
          node = node.right;
        } else {
          node = node.left;
        }
      }
    }
  }

  getNext(): Entry<K, V> {
    debugAssert(
      this.nodeStack.length > 0,
      'getNext() called on iterator when hasNext() is false.'
    );

    let node = this.nodeStack.pop()!;
    const result = { key: node.key, value: node.value };

    if (this.isReverse) {
      node = node.left;
      while (!node.isEmpty()) {
        this.nodeStack.push(node);
        node = node.right;
      }
    } else {
      node = node.right;
      while (!node.isEmpty()) {
        this.nodeStack.push(node);
        node = node.left;
      }
    }

    return result;
  }

  hasNext(): boolean {
    return this.nodeStack.length > 0;
  }

  peek(): Entry<K, V> | null {
    if (this.nodeStack.length === 0) {
      return null;
    }

    const node = this.nodeStack[this.nodeStack.length - 1];
    return { key: node.key, value: node.value };
  }
} // end SortedMapIterator

// Represents a node in a Left-leaning Red-Black tree.
export class LLRBNode<K, V> {
  readonly color: boolean;
  readonly left: LLRBNode<K, V> | LLRBEmptyNode<K, V>;
  readonly right: LLRBNode<K, V> | LLRBEmptyNode<K, V>;
  readonly size: number;

  // Empty node is shared between all LLRB trees.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static EMPTY: LLRBEmptyNode<any, any> = null as any;

  static RED = true;
  static BLACK = false;

  constructor(
    public key: K,
    public value: V,
    color?: boolean,
    left?: LLRBNode<K, V> | LLRBEmptyNode<K, V>,
    right?: LLRBNode<K, V> | LLRBEmptyNode<K, V>
  ) {
    this.color = color != null ? color : LLRBNode.RED;
    this.left = left != null ? left : LLRBNode.EMPTY;
    this.right = right != null ? right : LLRBNode.EMPTY;
    this.size = this.left.size + 1 + this.right.size;
  }

  // Returns a copy of the current node, optionally replacing pieces of it.
  copy(
    key: K | null,
    value: V | null,
    color: boolean | null,
    left: LLRBNode<K, V> | LLRBEmptyNode<K, V> | null,
    right: LLRBNode<K, V> | LLRBEmptyNode<K, V> | null
  ): LLRBNode<K, V> {
    return new LLRBNode<K, V>(
      key != null ? key : this.key,
      value != null ? value : this.value,
      color != null ? color : this.color,
      left != null ? left : this.left,
      right != null ? right : this.right
    );
  }

  isEmpty(): boolean {
    return false;
  }

  // Traverses the tree in key order and calls the specified action function
  // for each node. If action returns true, traversal is aborted.
  // Returns the first truthy value returned by action, or the last falsey
  // value returned by action.
  inorderTraversal<T>(action: (k: K, v: V) => T): T {
    return (
      (this.left as LLRBNode<K, V>).inorderTraversal(action) ||
      action(this.key, this.value) ||
      (this.right as LLRBNode<K, V>).inorderTraversal(action)
    );
  }

  // Traverses the tree in reverse key order and calls the specified action
  // function for each node. If action returns true, traversal is aborted.
  // Returns the first truthy value returned by action, or the last falsey
  // value returned by action.
  reverseTraversal<T>(action: (k: K, v: V) => T): T {
    return (
      (this.right as LLRBNode<K, V>).reverseTraversal(action) ||
      action(this.key, this.value) ||
      (this.left as LLRBNode<K, V>).reverseTraversal(action)
    );
  }

  // Returns the minimum node in the tree.
  private min(): LLRBNode<K, V> {
    if (this.left.isEmpty()) {
      return this;
    } else {
      return (this.left as LLRBNode<K, V>).min();
    }
  }

  // Returns the maximum key in the tree.
  minKey(): K | null {
    return this.min().key;
  }

  // Returns the maximum key in the tree.
  maxKey(): K | null {
    if (this.right.isEmpty()) {
      return this.key;
    } else {
      return this.right.maxKey();
    }
  }

  // Returns new tree, with the key/value added.
  insert(key: K, value: V, comparator: Comparator<K>): LLRBNode<K, V> {
    let n: LLRBNode<K, V> = this;
    const cmp = comparator(key, n.key);
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
    return n.fixUp();
  }

  private removeMin(): LLRBNode<K, V> | LLRBEmptyNode<K, V> {
    if (this.left.isEmpty()) {
      return LLRBNode.EMPTY;
    }
    let n: LLRBNode<K, V> = this;
    if (!n.left.isRed() && !n.left.left.isRed()) {
      n = n.moveRedLeft();
    }
    n = n.copy(null, null, null, (n.left as LLRBNode<K, V>).removeMin(), null);
    return n.fixUp();
  }

  // Returns new tree, with the specified item removed.
  remove(
    key: K,
    comparator: Comparator<K>
  ): LLRBNode<K, V> | LLRBEmptyNode<K, V> {
    let smallest: LLRBNode<K, V>;
    let n: LLRBNode<K, V> = this;
    if (comparator(key, n.key) < 0) {
      if (!n.left.isEmpty() && !n.left.isRed() && !n.left.left.isRed()) {
        n = n.moveRedLeft();
      }
      n = n.copy(null, null, null, n.left.remove(key, comparator), null);
    } else {
      if (n.left.isRed()) {
        n = n.rotateRight();
      }
      if (!n.right.isEmpty() && !n.right.isRed() && !n.right.left.isRed()) {
        n = n.moveRedRight();
      }
      if (comparator(key, n.key) === 0) {
        if (n.right.isEmpty()) {
          return LLRBNode.EMPTY;
        } else {
          smallest = (n.right as LLRBNode<K, V>).min();
          n = n.copy(
            smallest.key,
            smallest.value,
            null,
            null,
            (n.right as LLRBNode<K, V>).removeMin()
          );
        }
      }
      n = n.copy(null, null, null, null, n.right.remove(key, comparator));
    }
    return n.fixUp();
  }

  isRed(): boolean {
    return this.color;
  }

  // Returns new tree after performing any needed rotations.
  private fixUp(): LLRBNode<K, V> {
    let n: LLRBNode<K, V> = this;
    if (n.right.isRed() && !n.left.isRed()) {
      n = n.rotateLeft();
    }
    if (n.left.isRed() && n.left.left.isRed()) {
      n = n.rotateRight();
    }
    if (n.left.isRed() && n.right.isRed()) {
      n = n.colorFlip();
    }
    return n;
  }

  private moveRedLeft(): LLRBNode<K, V> {
    let n = this.colorFlip();
    if (n.right.left.isRed()) {
      n = n.copy(
        null,
        null,
        null,
        null,
        (n.right as LLRBNode<K, V>).rotateRight()
      );
      n = n.rotateLeft();
      n = n.colorFlip();
    }
    return n;
  }

  private moveRedRight(): LLRBNode<K, V> {
    let n = this.colorFlip();
    if (n.left.left.isRed()) {
      n = n.rotateRight();
      n = n.colorFlip();
    }
    return n;
  }

  private rotateLeft(): LLRBNode<K, V> {
    const nl = this.copy(null, null, LLRBNode.RED, null, this.right.left);
    return (this.right as LLRBNode<K, V>).copy(
      null,
      null,
      this.color,
      nl,
      null
    );
  }

  private rotateRight(): LLRBNode<K, V> {
    const nr = this.copy(null, null, LLRBNode.RED, this.left.right, null);
    return (this.left as LLRBNode<K, V>).copy(null, null, this.color, null, nr);
  }

  private colorFlip(): LLRBNode<K, V> {
    const left = this.left.copy(null, null, !this.left.color, null, null);
    const right = this.right.copy(null, null, !this.right.color, null, null);
    return this.copy(null, null, !this.color, left, right);
  }

  // For testing.
  checkMaxDepth(): boolean {
    const blackDepth = this.check();
    if (Math.pow(2.0, blackDepth) <= this.size + 1) {
      return true;
    } else {
      return false;
    }
  }

  // In a balanced RB tree, the black-depth (number of black nodes) from root to
  // leaves is equal on both sides.  This function verifies that or asserts.
  protected check(): number {
    if (this.isRed() && this.left.isRed()) {
      throw fail('Red node has red child(' + this.key + ',' + this.value + ')');
    }
    if (this.right.isRed()) {
      throw fail('Right child of (' + this.key + ',' + this.value + ') is red');
    }
    const blackDepth = (this.left as LLRBNode<K, V>).check();
    if (blackDepth !== (this.right as LLRBNode<K, V>).check()) {
      throw fail('Black depths differ');
    } else {
      return blackDepth + (this.isRed() ? 0 : 1);
    }
  }
} // end LLRBNode

// Represents an empty node (a leaf node in the Red-Black Tree).
export class LLRBEmptyNode<K, V> {
  get key(): never {
    throw fail('LLRBEmptyNode has no key.');
  }
  get value(): never {
    throw fail('LLRBEmptyNode has no value.');
  }
  get color(): never {
    throw fail('LLRBEmptyNode has no color.');
  }
  get left(): never {
    throw fail('LLRBEmptyNode has no left child.');
  }
  get right(): never {
    throw fail('LLRBEmptyNode has no right child.');
  }
  size = 0;

  // Returns a copy of the current node.
  copy(
    key: K | null,
    value: V | null,
    color: boolean | null,
    left: LLRBNode<K, V> | LLRBEmptyNode<K, V> | null,
    right: LLRBNode<K, V> | LLRBEmptyNode<K, V> | null
  ): LLRBEmptyNode<K, V> {
    return this;
  }

  // Returns a copy of the tree, with the specified key/value added.
  insert(key: K, value: V, comparator: Comparator<K>): LLRBNode<K, V> {
    return new LLRBNode<K, V>(key, value);
  }

  // Returns a copy of the tree, with the specified key removed.
  remove(key: K, comparator: Comparator<K>): LLRBEmptyNode<K, V> {
    return this;
  }

  isEmpty(): boolean {
    return true;
  }

  inorderTraversal(action: (k: K, v: V) => boolean): boolean {
    return false;
  }

  reverseTraversal(action: (k: K, v: V) => boolean): boolean {
    return false;
  }

  minKey(): K | null {
    return null;
  }

  maxKey(): K | null {
    return null;
  }

  isRed(): boolean {
    return false;
  }

  // For testing.
  checkMaxDepth(): boolean {
    return true;
  }

  protected check(): 0 {
    return 0;
  }
} // end LLRBEmptyNode

LLRBNode.EMPTY = new LLRBEmptyNode<unknown, unknown>();
