/**
 * @license
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

import { assert } from '@firebase/util';
import { sha1, MAX_NAME, MIN_NAME } from '../util/util';
import { SortedMap, SortedMapIterator } from '../util/SortedMap';
import { Node, NamedNode } from './Node';
import { validatePriorityNode, priorityHashText, setMaxNode } from './snap';
import {
  PRIORITY_INDEX,
  setMaxNode as setPriorityMaxNode
} from './indexes/PriorityIndex';
import { KEY_INDEX, KeyIndex } from './indexes/KeyIndex';
import { IndexMap } from './IndexMap';
import { LeafNode } from './LeafNode';
import { NAME_COMPARATOR } from './comparators';
import { Index } from './indexes/Index';
import { Path } from '../util/Path';

export interface ChildrenNodeConstructor {
  new (
    children_: SortedMap<string, Node>,
    priorityNode_: Node | null,
    indexMap_: IndexMap
  ): ChildrenNode;
  EMPTY_NODE: ChildrenNode;
}

// TODO: For memory savings, don't store priorityNode_ if it's empty.

let EMPTY_NODE: ChildrenNode;

/**
 * ChildrenNode is a class for storing internal nodes in a DataSnapshot
 * (i.e. nodes with children).  It implements Node and stores the
 * list of children in the children property, sorted by child name.
 *
 * @constructor
 * @implements {Node}
 */
export class ChildrenNode implements Node {
  private lazyHash_: string | null = null;

  static get EMPTY_NODE(): ChildrenNode {
    return (
      EMPTY_NODE ||
      (EMPTY_NODE = new ChildrenNode(
        new SortedMap<string, Node>(NAME_COMPARATOR),
        null,
        IndexMap.Default
      ))
    );
  }

  /**
   *
   * @param {!SortedMap.<string, !Node>} children_ List of children
   * of this node..
   * @param {?Node} priorityNode_ The priority of this node (as a snapshot node).
   * @param {!IndexMap} indexMap_
   */
  constructor(
    private readonly children_: SortedMap<string, Node>,
    private readonly priorityNode_: Node | null,
    private indexMap_: IndexMap
  ) {
    /**
     * Note: The only reason we allow null priority is for EMPTY_NODE, since we can't use
     * EMPTY_NODE as the priority of EMPTY_NODE.  We might want to consider making EMPTY_NODE its own
     * class instead of an empty ChildrenNode.
     */
    if (this.priorityNode_) {
      validatePriorityNode(this.priorityNode_);
    }

    if (this.children_.isEmpty()) {
      assert(
        !this.priorityNode_ || this.priorityNode_.isEmpty(),
        'An empty node cannot have a priority'
      );
    }
  }

  /** @inheritDoc */
  isLeafNode(): boolean {
    return false;
  }

  /** @inheritDoc */
  getPriority(): Node {
    return this.priorityNode_ || EMPTY_NODE;
  }

  /** @inheritDoc */
  updatePriority(newPriorityNode: Node): Node {
    if (this.children_.isEmpty()) {
      // Don't allow priorities on empty nodes
      return this;
    } else {
      return new ChildrenNode(this.children_, newPriorityNode, this.indexMap_);
    }
  }

  /** @inheritDoc */
  getImmediateChild(childName: string): Node {
    // Hack to treat priority as a regular child
    if (childName === '.priority') {
      return this.getPriority();
    } else {
      const child = this.children_.get(childName);
      return child === null ? EMPTY_NODE : child;
    }
  }

  /** @inheritDoc */
  getChild(path: Path): Node {
    const front = path.getFront();
    if (front === null) return this;

    return this.getImmediateChild(front).getChild(path.popFront());
  }

  /** @inheritDoc */
  hasChild(childName: string): boolean {
    return this.children_.get(childName) !== null;
  }

  /** @inheritDoc */
  updateImmediateChild(childName: string, newChildNode: Node): Node {
    assert(newChildNode, 'We should always be passing snapshot nodes');
    if (childName === '.priority') {
      return this.updatePriority(newChildNode);
    } else {
      const namedNode = new NamedNode(childName, newChildNode);
      let newChildren, newIndexMap, newPriority;
      if (newChildNode.isEmpty()) {
        newChildren = this.children_.remove(childName);
        newIndexMap = this.indexMap_.removeFromIndexes(
          namedNode,
          this.children_
        );
      } else {
        newChildren = this.children_.insert(childName, newChildNode);
        newIndexMap = this.indexMap_.addToIndexes(namedNode, this.children_);
      }

      newPriority = newChildren.isEmpty() ? EMPTY_NODE : this.priorityNode_;
      return new ChildrenNode(newChildren, newPriority, newIndexMap);
    }
  }

  /** @inheritDoc */
  updateChild(path: Path, newChildNode: Node): Node {
    const front = path.getFront();
    if (front === null) {
      return newChildNode;
    } else {
      assert(
        path.getFront() !== '.priority' || path.getLength() === 1,
        '.priority must be the last token in a path'
      );
      const newImmediateChild = this.getImmediateChild(front).updateChild(
        path.popFront(),
        newChildNode
      );
      return this.updateImmediateChild(front, newImmediateChild);
    }
  }

  /** @inheritDoc */
  isEmpty(): boolean {
    return this.children_.isEmpty();
  }

  /** @inheritDoc */
  numChildren(): number {
    return this.children_.count();
  }

  /**
   * @private
   * @type {RegExp}
   */
  private static INTEGER_REGEXP_ = /^(0|[1-9]\d*)$/;

  /** @inheritDoc */
  val(exportFormat?: boolean): object {
    if (this.isEmpty()) return null;

    const obj: { [k: string]: unknown } = {};
    let numKeys = 0,
      maxKey = 0,
      allIntegerKeys = true;
    this.forEachChild(PRIORITY_INDEX, function(key: string, childNode: Node) {
      obj[key] = childNode.val(exportFormat);

      numKeys++;
      if (allIntegerKeys && ChildrenNode.INTEGER_REGEXP_.test(key)) {
        maxKey = Math.max(maxKey, Number(key));
      } else {
        allIntegerKeys = false;
      }
    });

    if (!exportFormat && allIntegerKeys && maxKey < 2 * numKeys) {
      // convert to array.
      const array: unknown[] = [];
      for (let key in obj) array[(key as any) as number] = obj[key];

      return array;
    } else {
      if (exportFormat && !this.getPriority().isEmpty()) {
        obj['.priority'] = this.getPriority().val();
      }
      return obj;
    }
  }

  /** @inheritDoc */
  hash(): string {
    if (this.lazyHash_ === null) {
      let toHash = '';
      if (!this.getPriority().isEmpty())
        toHash +=
          'priority:' +
          priorityHashText(this.getPriority().val() as string | number) +
          ':';

      this.forEachChild(PRIORITY_INDEX, function(key, childNode) {
        const childHash = childNode.hash();
        if (childHash !== '') toHash += ':' + key + ':' + childHash;
      });

      this.lazyHash_ = toHash === '' ? '' : sha1(toHash);
    }
    return this.lazyHash_;
  }

  /** @inheritDoc */
  getPredecessorChildName(
    childName: string,
    childNode: Node,
    index: Index
  ): string {
    const idx = this.resolveIndex_(index);
    if (idx) {
      const predecessor = idx.getPredecessorKey(
        new NamedNode(childName, childNode)
      );
      return predecessor ? predecessor.name : null;
    } else {
      return this.children_.getPredecessorKey(childName);
    }
  }

  /**
   * @param {!Index} indexDefinition
   * @return {?string}
   */
  getFirstChildName(indexDefinition: Index): string | null {
    const idx = this.resolveIndex_(indexDefinition);
    if (idx) {
      const minKey = idx.minKey();
      return minKey && minKey.name;
    } else {
      return this.children_.minKey();
    }
  }

  /**
   * @param {!Index} indexDefinition
   * @return {?NamedNode}
   */
  getFirstChild(indexDefinition: Index): NamedNode | null {
    const minKey = this.getFirstChildName(indexDefinition);
    if (minKey) {
      return new NamedNode(minKey, this.children_.get(minKey));
    } else {
      return null;
    }
  }

  /**
   * Given an index, return the key name of the largest value we have, according to that index
   * @param {!Index} indexDefinition
   * @return {?string}
   */
  getLastChildName(indexDefinition: Index): string | null {
    const idx = this.resolveIndex_(indexDefinition);
    if (idx) {
      const maxKey = idx.maxKey();
      return maxKey && maxKey.name;
    } else {
      return this.children_.maxKey();
    }
  }

  /**
   * @param {!Index} indexDefinition
   * @return {?NamedNode}
   */
  getLastChild(indexDefinition: Index): NamedNode | null {
    const maxKey = this.getLastChildName(indexDefinition);
    if (maxKey) {
      return new NamedNode(maxKey, this.children_.get(maxKey));
    } else {
      return null;
    }
  }

  /**
   * @inheritDoc
   */
  forEachChild(
    index: Index,
    action: (key: string, node: Node) => boolean | void
  ): boolean {
    const idx = this.resolveIndex_(index);
    if (idx) {
      return idx.inorderTraversal(function(wrappedNode) {
        return action(wrappedNode.name, wrappedNode.node);
      });
    } else {
      return this.children_.inorderTraversal(action);
    }
  }

  /**
   * @param {!Index} indexDefinition
   * @return {SortedMapIterator}
   */
  getIterator(
    indexDefinition: Index
  ): SortedMapIterator<string | NamedNode, Node, NamedNode> {
    return this.getIteratorFrom(indexDefinition.minPost(), indexDefinition);
  }

  /**
   *
   * @param {!NamedNode} startPost
   * @param {!Index} indexDefinition
   * @return {!SortedMapIterator}
   */
  getIteratorFrom(
    startPost: NamedNode,
    indexDefinition: Index
  ): SortedMapIterator<string | NamedNode, Node, NamedNode> {
    const idx = this.resolveIndex_(indexDefinition);
    if (idx) {
      return idx.getIteratorFrom(startPost, key => key);
    } else {
      const iterator = this.children_.getIteratorFrom(
        startPost.name,
        NamedNode.Wrap
      );
      let next = iterator.peek();
      while (next != null && indexDefinition.compare(next, startPost) < 0) {
        iterator.getNext();
        next = iterator.peek();
      }
      return iterator;
    }
  }

  /**
   * @param {!Index} indexDefinition
   * @return {!SortedMapIterator}
   */
  getReverseIterator(
    indexDefinition: Index
  ): SortedMapIterator<string | NamedNode, Node, NamedNode> {
    return this.getReverseIteratorFrom(
      indexDefinition.maxPost(),
      indexDefinition
    );
  }

  /**
   * @param {!NamedNode} endPost
   * @param {!Index} indexDefinition
   * @return {!SortedMapIterator}
   */
  getReverseIteratorFrom(
    endPost: NamedNode,
    indexDefinition: Index
  ): SortedMapIterator<string | NamedNode, Node, NamedNode> {
    const idx = this.resolveIndex_(indexDefinition);
    if (idx) {
      return idx.getReverseIteratorFrom(endPost, function(key) {
        return key;
      });
    } else {
      const iterator = this.children_.getReverseIteratorFrom(
        endPost.name,
        NamedNode.Wrap
      );
      let next = iterator.peek();
      while (next != null && indexDefinition.compare(next, endPost) > 0) {
        iterator.getNext();
        next = iterator.peek();
      }
      return iterator;
    }
  }

  /**
   * @inheritDoc
   */
  compareTo(other: ChildrenNode): number {
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
  }

  /**
   * @inheritDoc
   */
  withIndex(indexDefinition: Index): Node {
    if (
      indexDefinition === KEY_INDEX ||
      this.indexMap_.hasIndex(indexDefinition)
    ) {
      return this;
    } else {
      const newIndexMap = this.indexMap_.addIndex(
        indexDefinition,
        this.children_
      );
      return new ChildrenNode(this.children_, this.priorityNode_, newIndexMap);
    }
  }

  /**
   * @inheritDoc
   */
  isIndexed(index: Index): boolean {
    return index === KEY_INDEX || this.indexMap_.hasIndex(index);
  }

  /**
   * @inheritDoc
   */
  equals(other: Node): boolean {
    if (other === this) {
      return true;
    } else if (other.isLeafNode()) {
      return false;
    } else {
      const otherChildrenNode = other as ChildrenNode;
      if (!this.getPriority().equals(otherChildrenNode.getPriority())) {
        return false;
      } else if (
        this.children_.count() === otherChildrenNode.children_.count()
      ) {
        const thisIter = this.getIterator(PRIORITY_INDEX);
        const otherIter = otherChildrenNode.getIterator(PRIORITY_INDEX);
        let thisCurrent = thisIter.getNext();
        let otherCurrent = otherIter.getNext();
        while (thisCurrent && otherCurrent) {
          if (
            thisCurrent.name !== otherCurrent.name ||
            !thisCurrent.node.equals(otherCurrent.node)
          ) {
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
  }

  /**
   * Returns a SortedMap ordered by index, or null if the default (by-key) ordering can be used
   * instead.
   *
   * @private
   * @param {!Index} indexDefinition
   * @return {?SortedMap.<NamedNode, Node>}
   */
  private resolveIndex_(
    indexDefinition: Index
  ): SortedMap<NamedNode, Node> | null {
    if (indexDefinition === KEY_INDEX) {
      return null;
    } else {
      return this.indexMap_.get(indexDefinition.toString());
    }
  }
}

/**
 * @constructor
 * @extends {ChildrenNode}
 * @private
 */
export class MaxNode extends ChildrenNode {
  constructor() {
    super(
      new SortedMap<string, Node>(NAME_COMPARATOR),
      ChildrenNode.EMPTY_NODE,
      IndexMap.Default
    );
  }

  compareTo(other: Node): number {
    if (other === this) {
      return 0;
    } else {
      return 1;
    }
  }

  equals(other: Node): boolean {
    // Not that we every compare it, but MAX_NODE is only ever equal to itself
    return other === this;
  }

  getPriority(): MaxNode {
    return this;
  }

  getImmediateChild(childName: string): ChildrenNode {
    return ChildrenNode.EMPTY_NODE;
  }

  isEmpty(): boolean {
    return false;
  }
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
    MIN: NamedNode;
    MAX: NamedNode;
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

/**
 * Reference Extensions
 */
KeyIndex.__EMPTY_NODE = ChildrenNode.EMPTY_NODE;
LeafNode.__childrenNodeConstructor = ChildrenNode;
setMaxNode(MAX_NODE);
setPriorityMaxNode(MAX_NODE);
