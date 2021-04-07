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

import { ChildrenNode } from './snap/ChildrenNode';
import { PRIORITY_INDEX } from './snap/indexes/PriorityIndex';
import { NamedNode, Node } from './snap/Node';
import { ImmutableTree } from './util/ImmutableTree';
import {
  newEmptyPath,
  newRelativePath,
  Path,
  pathChild,
  pathIsEmpty
} from './util/Path';
import { each } from './util/util';

/**
 * This class holds a collection of writes that can be applied to nodes in unison. It abstracts away the logic with
 * dealing with priority writes and multiple nested writes. At any given path there is only allowed to be one write
 * modifying that path. Any write to an existing path or shadowing an existing path will modify that existing write
 * to reflect the write added.
 */
export class CompoundWrite {
  constructor(public writeTree_: ImmutableTree<Node>) {}

  static empty(): CompoundWrite {
    return new CompoundWrite(new ImmutableTree(null));
  }
}

export function compoundWriteAddWrite(
  compoundWrite: CompoundWrite,
  path: Path,
  node: Node
): CompoundWrite {
  if (pathIsEmpty(path)) {
    return new CompoundWrite(new ImmutableTree(node));
  } else {
    const rootmost = compoundWrite.writeTree_.findRootMostValueAndPath(path);
    if (rootmost != null) {
      const rootMostPath = rootmost.path;
      let value = rootmost.value;
      const relativePath = newRelativePath(rootMostPath, path);
      value = value.updateChild(relativePath, node);
      return new CompoundWrite(
        compoundWrite.writeTree_.set(rootMostPath, value)
      );
    } else {
      const subtree = new ImmutableTree(node);
      const newWriteTree = compoundWrite.writeTree_.setTree(path, subtree);
      return new CompoundWrite(newWriteTree);
    }
  }
}

export function compoundWriteAddWrites(
  compoundWrite: CompoundWrite,
  path: Path,
  updates: { [name: string]: Node }
): CompoundWrite {
  let newWrite = compoundWrite;
  each(updates, (childKey: string, node: Node) => {
    newWrite = compoundWriteAddWrite(newWrite, pathChild(path, childKey), node);
  });
  return newWrite;
}

/**
 * Will remove a write at the given path and deeper paths. This will <em>not</em> modify a write at a higher
 * location, which must be removed by calling this method with that path.
 *
 * @param compoundWrite - The CompoundWrite to remove.
 * @param path - The path at which a write and all deeper writes should be removed
 * @returns The new CompoundWrite with the removed path
 */
export function compoundWriteRemoveWrite(
  compoundWrite: CompoundWrite,
  path: Path
): CompoundWrite {
  if (pathIsEmpty(path)) {
    return CompoundWrite.empty();
  } else {
    const newWriteTree = compoundWrite.writeTree_.setTree(
      path,
      new ImmutableTree<Node>(null)
    );
    return new CompoundWrite(newWriteTree);
  }
}

/**
 * Returns whether this CompoundWrite will fully overwrite a node at a given location and can therefore be
 * considered "complete".
 *
 * @param compoundWrite - The CompoundWrite to check.
 * @param path - The path to check for
 * @returns Whether there is a complete write at that path
 */
export function compoundWriteHasCompleteWrite(
  compoundWrite: CompoundWrite,
  path: Path
): boolean {
  return compoundWriteGetCompleteNode(compoundWrite, path) != null;
}

/**
 * Returns a node for a path if and only if the node is a "complete" overwrite at that path. This will not aggregate
 * writes from deeper paths, but will return child nodes from a more shallow path.
 *
 * @param compoundWrite - The CompoundWrite to get the node from.
 * @param path - The path to get a complete write
 * @returns The node if complete at that path, or null otherwise.
 */
export function compoundWriteGetCompleteNode(
  compoundWrite: CompoundWrite,
  path: Path
): Node | null {
  const rootmost = compoundWrite.writeTree_.findRootMostValueAndPath(path);
  if (rootmost != null) {
    return compoundWrite.writeTree_
      .get(rootmost.path)
      .getChild(newRelativePath(rootmost.path, path));
  } else {
    return null;
  }
}

/**
 * Returns all children that are guaranteed to be a complete overwrite.
 *
 * @param compoundWrite - The CompoundWrite to get children from.
 * @returns A list of all complete children.
 */
export function compoundWriteGetCompleteChildren(
  compoundWrite: CompoundWrite
): NamedNode[] {
  const children: NamedNode[] = [];
  const node = compoundWrite.writeTree_.value;
  if (node != null) {
    // If it's a leaf node, it has no children; so nothing to do.
    if (!node.isLeafNode()) {
      (node as ChildrenNode).forEachChild(
        PRIORITY_INDEX,
        (childName, childNode) => {
          children.push(new NamedNode(childName, childNode));
        }
      );
    }
  } else {
    compoundWrite.writeTree_.children.inorderTraversal(
      (childName, childTree) => {
        if (childTree.value != null) {
          children.push(new NamedNode(childName, childTree.value));
        }
      }
    );
  }
  return children;
}

export function compoundWriteChildCompoundWrite(
  compoundWrite: CompoundWrite,
  path: Path
): CompoundWrite {
  if (pathIsEmpty(path)) {
    return compoundWrite;
  } else {
    const shadowingNode = compoundWriteGetCompleteNode(compoundWrite, path);
    if (shadowingNode != null) {
      return new CompoundWrite(new ImmutableTree(shadowingNode));
    } else {
      return new CompoundWrite(compoundWrite.writeTree_.subtree(path));
    }
  }
}

/**
 * Returns true if this CompoundWrite is empty and therefore does not modify any nodes.
 * @returns Whether this CompoundWrite is empty
 */
export function compoundWriteIsEmpty(compoundWrite: CompoundWrite): boolean {
  return compoundWrite.writeTree_.isEmpty();
}

/**
 * Applies this CompoundWrite to a node. The node is returned with all writes from this CompoundWrite applied to the
 * node
 * @param node - The node to apply this CompoundWrite to
 * @returns The node with all writes applied
 */
export function compoundWriteApply(
  compoundWrite: CompoundWrite,
  node: Node
): Node {
  return applySubtreeWrite(newEmptyPath(), compoundWrite.writeTree_, node);
}

function applySubtreeWrite(
  relativePath: Path,
  writeTree: ImmutableTree<Node>,
  node: Node
): Node {
  if (writeTree.value != null) {
    // Since there a write is always a leaf, we're done here
    return node.updateChild(relativePath, writeTree.value);
  } else {
    let priorityWrite = null;
    writeTree.children.inorderTraversal((childKey, childTree) => {
      if (childKey === '.priority') {
        // Apply priorities at the end so we don't update priorities for either empty nodes or forget
        // to apply priorities to empty nodes that are later filled
        assert(
          childTree.value !== null,
          'Priority writes must always be leaf nodes'
        );
        priorityWrite = childTree.value;
      } else {
        node = applySubtreeWrite(
          pathChild(relativePath, childKey),
          childTree,
          node
        );
      }
    });
    // If there was a priority write, we only apply it if the node is not empty
    if (!node.getChild(relativePath).isEmpty() && priorityWrite !== null) {
      node = node.updateChild(
        pathChild(relativePath, '.priority'),
        priorityWrite
      );
    }
    return node;
  }
}
