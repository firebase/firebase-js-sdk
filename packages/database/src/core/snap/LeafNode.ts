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

import { assert } from '@firebase/util';
import { doubleToIEEE754String, sha1 } from '../util/util';
import { priorityHashText, validatePriorityNode } from './snap';
import { Node } from './Node';
import { Path } from '../util/Path';
import { Index } from './indexes/Index';
import { ChildrenNodeConstructor } from './ChildrenNode';
import { Indexable } from '../util/misc';

let __childrenNodeConstructor: ChildrenNodeConstructor;

/**
 * LeafNode is a class for storing leaf nodes in a DataSnapshot.  It
 * implements Node and stores the value of the node (a string,
 * number, or boolean) accessible via getValue().
 */
export class LeafNode implements Node {
  static set __childrenNodeConstructor(val: ChildrenNodeConstructor) {
    __childrenNodeConstructor = val;
  }

  static get __childrenNodeConstructor() {
    return __childrenNodeConstructor;
  }

  /**
   * The sort order for comparing leaf nodes of different types. If two leaf nodes have
   * the same type, the comparison falls back to their value
   * @type {Array.<!string>}
   * @const
   */
  static VALUE_TYPE_ORDER = ['object', 'boolean', 'number', 'string'];

  private lazyHash_: string | null = null;

  /**
   * @implements {Node}
   * @param {!(string|number|boolean|Object)} value_ The value to store in this leaf node.
   *                                         The object type is possible in the event of a deferred value
   * @param {!Node=} priorityNode_ The priority of this node.
   */
  constructor(
    private readonly value_: string | number | boolean | Indexable,
    private priorityNode_: Node = LeafNode.__childrenNodeConstructor.EMPTY_NODE
  ) {
    assert(
      this.value_ !== undefined && this.value_ !== null,
      "LeafNode shouldn't be created with null/undefined value."
    );

    validatePriorityNode(this.priorityNode_);
  }

  /** @inheritDoc */
  isLeafNode(): boolean {
    return true;
  }

  /** @inheritDoc */
  getPriority(): Node {
    return this.priorityNode_;
  }

  /** @inheritDoc */
  updatePriority(newPriorityNode: Node): Node {
    return new LeafNode(this.value_, newPriorityNode);
  }

  /** @inheritDoc */
  getImmediateChild(childName: string): Node {
    // Hack to treat priority as a regular child
    if (childName === '.priority') {
      return this.priorityNode_;
    } else {
      return LeafNode.__childrenNodeConstructor.EMPTY_NODE;
    }
  }

  /** @inheritDoc */
  getChild(path: Path): Node {
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
  hasChild(): boolean {
    return false;
  }

  /** @inheritDoc */
  getPredecessorChildName(childName: string, childNode: Node): null {
    return null;
  }

  /** @inheritDoc */
  updateImmediateChild(childName: string, newChildNode: Node): Node {
    if (childName === '.priority') {
      return this.updatePriority(newChildNode);
    } else if (newChildNode.isEmpty() && childName !== '.priority') {
      return this;
    } else {
      return LeafNode.__childrenNodeConstructor.EMPTY_NODE.updateImmediateChild(
        childName,
        newChildNode
      ).updatePriority(this.priorityNode_);
    }
  }

  /** @inheritDoc */
  updateChild(path: Path, newChildNode: Node): Node {
    const front = path.getFront();
    if (front === null) {
      return newChildNode;
    } else if (newChildNode.isEmpty() && front !== '.priority') {
      return this;
    } else {
      assert(
        front !== '.priority' || path.getLength() === 1,
        '.priority must be the last token in a path'
      );

      return this.updateImmediateChild(
        front,
        LeafNode.__childrenNodeConstructor.EMPTY_NODE.updateChild(
          path.popFront(),
          newChildNode
        )
      );
    }
  }

  /** @inheritDoc */
  isEmpty(): boolean {
    return false;
  }

  /** @inheritDoc */
  numChildren(): number {
    return 0;
  }

  /** @inheritDoc */
  forEachChild(index: Index, action: (s: string, n: Node) => void): boolean {
    return false;
  }

  /**
   * @inheritDoc
   */
  val(exportFormat?: boolean): {} {
    if (exportFormat && !this.getPriority().isEmpty()) {
      return {
        '.value': this.getValue(),
        '.priority': this.getPriority().val()
      };
    } else {
      return this.getValue();
    }
  }

  /** @inheritDoc */
  hash(): string {
    if (this.lazyHash_ === null) {
      let toHash = '';
      if (!this.priorityNode_.isEmpty()) {
        toHash +=
          'priority:' +
          priorityHashText(this.priorityNode_.val() as number | string) +
          ':';
      }

      const type = typeof this.value_;
      toHash += type + ':';
      if (type === 'number') {
        toHash += doubleToIEEE754String(this.value_ as number);
      } else {
        toHash += this.value_;
      }
      this.lazyHash_ = sha1(toHash);
    }
    return this.lazyHash_;
  }

  /**
   * Returns the value of the leaf node.
   * @return {Object|string|number|boolean} The value of the node.
   */
  getValue(): Indexable | string | number | boolean {
    return this.value_;
  }

  /**
   * @inheritDoc
   */
  compareTo(other: Node): number {
    if (other === LeafNode.__childrenNodeConstructor.EMPTY_NODE) {
      return 1;
    } else if (other instanceof LeafNode.__childrenNodeConstructor) {
      return -1;
    } else {
      assert(other.isLeafNode(), 'Unknown node type');
      return this.compareToLeafNode_(other as LeafNode);
    }
  }

  /**
   * Comparison specifically for two leaf nodes
   * @param {!LeafNode} otherLeaf
   * @return {!number}
   * @private
   */
  private compareToLeafNode_(otherLeaf: LeafNode): number {
    const otherLeafType = typeof otherLeaf.value_;
    const thisLeafType = typeof this.value_;
    const otherIndex = LeafNode.VALUE_TYPE_ORDER.indexOf(otherLeafType);
    const thisIndex = LeafNode.VALUE_TYPE_ORDER.indexOf(thisLeafType);
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
  withIndex(): Node {
    return this;
  }

  /**
   * @inheritDoc
   */
  isIndexed(): boolean {
    return true;
  }

  /**
   * @inheritDoc
   */
  equals(other: Node): boolean {
    /**
     * @inheritDoc
     */
    if (other === this) {
      return true;
    } else if (other.isLeafNode()) {
      const otherLeaf = other as LeafNode;
      return (
        this.value_ === otherLeaf.value_ &&
        this.priorityNode_.equals(otherLeaf.priorityNode_)
      );
    } else {
      return false;
    }
  }
}
