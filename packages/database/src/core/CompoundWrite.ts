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

import { ImmutableTree } from './util/ImmutableTree';
import { Path } from './util/Path';
import { forEach } from '@firebase/util';
import { Node, NamedNode } from './snap/Node';
import { PRIORITY_INDEX } from './snap/indexes/PriorityIndex';
import { assert } from '@firebase/util';
import { ChildrenNode } from './snap/ChildrenNode';

/**
 * This class holds a collection of writes that can be applied to nodes in unison. It abstracts away the logic with
 * dealing with priority writes and multiple nested writes. At any given path there is only allowed to be one write
 * modifying that path. Any write to an existing path or shadowing an existing path will modify that existing write
 * to reflect the write added.
 *
 * @constructor
 * @param {!ImmutableTree.<!Node>} writeTree
 */
export class CompoundWrite {
  constructor(private writeTree_: ImmutableTree<Node>) {}
  /**
   * @type {!CompoundWrite}
   */
  static Empty = new CompoundWrite(new ImmutableTree(null));

  /**
   * @param {!Path} path
   * @param {!Node} node
   * @return {!CompoundWrite}
   */
  addWrite(path: Path, node: Node): CompoundWrite {
    if (path.isEmpty()) {
      return new CompoundWrite(new ImmutableTree(node));
    } else {
      const rootmost = this.writeTree_.findRootMostValueAndPath(path);
      if (rootmost != null) {
        const rootMostPath = rootmost.path;
        let value = rootmost.value;
        const relativePath = Path.relativePath(rootMostPath, path);
        value = value.updateChild(relativePath, node);
        return new CompoundWrite(this.writeTree_.set(rootMostPath, value));
      } else {
        const subtree = new ImmutableTree(node);
        const newWriteTree = this.writeTree_.setTree(path, subtree);
        return new CompoundWrite(newWriteTree);
      }
    }
  }

  /**
   * @param {!Path} path
   * @param {!Object.<string, !Node>} updates
   * @return {!CompoundWrite}
   */
  addWrites(path: Path, updates: { [name: string]: Node }): CompoundWrite {
    let newWrite = this as CompoundWrite;
    forEach(updates, function(childKey: string, node: Node) {
      newWrite = newWrite.addWrite(path.child(childKey), node);
    });
    return newWrite;
  }

  /**
   * Will remove a write at the given path and deeper paths. This will <em>not</em> modify a write at a higher
   * location, which must be removed by calling this method with that path.
   *
   * @param {!Path} path The path at which a write and all deeper writes should be removed
   * @return {!CompoundWrite} The new CompoundWrite with the removed path
   */
  removeWrite(path: Path): CompoundWrite {
    if (path.isEmpty()) {
      return CompoundWrite.Empty;
    } else {
      const newWriteTree = this.writeTree_.setTree(path, ImmutableTree.Empty);
      return new CompoundWrite(newWriteTree);
    }
  }

  /**
   * Returns whether this CompoundWrite will fully overwrite a node at a given location and can therefore be
   * considered "complete".
   *
   * @param {!Path} path The path to check for
   * @return {boolean} Whether there is a complete write at that path
   */
  hasCompleteWrite(path: Path): boolean {
    return this.getCompleteNode(path) != null;
  }

  /**
   * Returns a node for a path if and only if the node is a "complete" overwrite at that path. This will not aggregate
   * writes from deeper paths, but will return child nodes from a more shallow path.
   *
   * @param {!Path} path The path to get a complete write
   * @return {?Node} The node if complete at that path, or null otherwise.
   */
  getCompleteNode(path: Path): Node | null {
    const rootmost = this.writeTree_.findRootMostValueAndPath(path);
    if (rootmost != null) {
      return this.writeTree_
        .get(rootmost.path)
        .getChild(Path.relativePath(rootmost.path, path));
    } else {
      return null;
    }
  }

  /**
   * Returns all children that are guaranteed to be a complete overwrite.
   *
   * @return {!Array.<NamedNode>} A list of all complete children.
   */
  getCompleteChildren(): Array<NamedNode> {
    const children: NamedNode[] = [];
    let node = this.writeTree_.value;
    if (node != null) {
      // If it's a leaf node, it has no children; so nothing to do.
      if (!node.isLeafNode()) {
        (node as ChildrenNode).forEachChild(PRIORITY_INDEX, function(
          childName,
          childNode
        ) {
          children.push(new NamedNode(childName, childNode));
        });
      }
    } else {
      this.writeTree_.children.inorderTraversal(function(childName, childTree) {
        if (childTree.value != null) {
          children.push(new NamedNode(childName, childTree.value));
        }
      });
    }
    return children;
  }

  /**
   * @param {!Path} path
   * @return {!CompoundWrite}
   */
  childCompoundWrite(path: Path): CompoundWrite {
    if (path.isEmpty()) {
      return this;
    } else {
      const shadowingNode = this.getCompleteNode(path);
      if (shadowingNode != null) {
        return new CompoundWrite(new ImmutableTree(shadowingNode));
      } else {
        return new CompoundWrite(this.writeTree_.subtree(path));
      }
    }
  }

  /**
   * Returns true if this CompoundWrite is empty and therefore does not modify any nodes.
   * @return {boolean} Whether this CompoundWrite is empty
   */
  isEmpty(): boolean {
    return this.writeTree_.isEmpty();
  }

  /**
   * Applies this CompoundWrite to a node. The node is returned with all writes from this CompoundWrite applied to the
   * node
   * @param {!Node} node The node to apply this CompoundWrite to
   * @return {!Node} The node with all writes applied
   */
  apply(node: Node): Node {
    return CompoundWrite.applySubtreeWrite_(Path.Empty, this.writeTree_, node);
  }

  /**
   * @param {!Path} relativePath
   * @param {!ImmutableTree.<!Node>} writeTree
   * @param {!Node} node
   * @return {!Node}
   * @private
   */
  private static applySubtreeWrite_ = function(
    relativePath: Path,
    writeTree: ImmutableTree<Node>,
    node: Node
  ): Node {
    if (writeTree.value != null) {
      // Since there a write is always a leaf, we're done here
      return node.updateChild(relativePath, writeTree.value);
    } else {
      let priorityWrite = null;
      writeTree.children.inorderTraversal(function(childKey, childTree) {
        if (childKey === '.priority') {
          // Apply priorities at the end so we don't update priorities for either empty nodes or forget
          // to apply priorities to empty nodes that are later filled
          assert(
            childTree.value !== null,
            'Priority writes must always be leaf nodes'
          );
          priorityWrite = childTree.value;
        } else {
          node = CompoundWrite.applySubtreeWrite_(
            relativePath.child(childKey),
            childTree,
            node
          );
        }
      });
      // If there was a priority write, we only apply it if the node is not empty
      if (!node.getChild(relativePath).isEmpty() && priorityWrite !== null) {
        node = node.updateChild(relativePath.child('.priority'), priorityWrite);
      }
      return node;
    }
  };
}
