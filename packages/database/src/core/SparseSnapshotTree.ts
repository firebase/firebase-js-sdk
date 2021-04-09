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

import { PRIORITY_INDEX } from './snap/indexes/PriorityIndex';
import { Node } from './snap/Node';
import { Path, pathGetFront, pathIsEmpty, pathPopFront } from './util/Path';

/**
 * Helper class to store a sparse set of snapshots.
 */
export interface SparseSnapshotTree {
  value: Node | null;
  readonly children: Map<string, SparseSnapshotTree>;
}

export function newSparseSnapshotTree(): SparseSnapshotTree {
  return {
    value: null,
    children: new Map()
  };
}

/**
 * Gets the node stored at the given path if one exists.
 * Only seems to be used in tests.
 *
 * @param path - Path to look up snapshot for.
 * @returns The retrieved node, or null.
 */
export function sparseSnapshotTreeFind(
  sparseSnapshotTree: SparseSnapshotTree,
  path: Path
): Node | null {
  if (sparseSnapshotTree.value != null) {
    return sparseSnapshotTree.value.getChild(path);
  } else if (!pathIsEmpty(path) && sparseSnapshotTree.children.size > 0) {
    const childKey = pathGetFront(path);
    path = pathPopFront(path);
    if (sparseSnapshotTree.children.has(childKey)) {
      const childTree = sparseSnapshotTree.children.get(childKey);
      return sparseSnapshotTreeFind(childTree, path);
    } else {
      return null;
    }
  } else {
    return null;
  }
}

/**
 * Stores the given node at the specified path. If there is already a node
 * at a shallower path, it merges the new data into that snapshot node.
 *
 * @param path - Path to look up snapshot for.
 * @param data - The new data, or null.
 */
export function sparseSnapshotTreeRemember(
  sparseSnapshotTree: SparseSnapshotTree,
  path: Path,
  data: Node
): void {
  if (pathIsEmpty(path)) {
    sparseSnapshotTree.value = data;
    sparseSnapshotTree.children.clear();
  } else if (sparseSnapshotTree.value !== null) {
    sparseSnapshotTree.value = sparseSnapshotTree.value.updateChild(path, data);
  } else {
    const childKey = pathGetFront(path);
    if (!sparseSnapshotTree.children.has(childKey)) {
      sparseSnapshotTree.children.set(childKey, newSparseSnapshotTree());
    }

    const child = sparseSnapshotTree.children.get(childKey);
    path = pathPopFront(path);
    sparseSnapshotTreeRemember(child, path, data);
  }
}

/**
 * Purge the data at path from the cache.
 *
 * @param path - Path to look up snapshot for.
 * @returns True if this node should now be removed.
 */
export function sparseSnapshotTreeForget(
  sparseSnapshotTree: SparseSnapshotTree,
  path: Path
): boolean {
  if (pathIsEmpty(path)) {
    sparseSnapshotTree.value = null;
    sparseSnapshotTree.children.clear();
    return true;
  } else {
    if (sparseSnapshotTree.value !== null) {
      if (sparseSnapshotTree.value.isLeafNode()) {
        // We're trying to forget a node that doesn't exist
        return false;
      } else {
        const value = sparseSnapshotTree.value;
        sparseSnapshotTree.value = null;

        value.forEachChild(PRIORITY_INDEX, (key, tree) => {
          sparseSnapshotTreeRemember(sparseSnapshotTree, new Path(key), tree);
        });

        return sparseSnapshotTreeForget(sparseSnapshotTree, path);
      }
    } else if (sparseSnapshotTree.children.size > 0) {
      const childKey = pathGetFront(path);
      path = pathPopFront(path);
      if (sparseSnapshotTree.children.has(childKey)) {
        const safeToRemove = sparseSnapshotTreeForget(
          sparseSnapshotTree.children.get(childKey),
          path
        );
        if (safeToRemove) {
          sparseSnapshotTree.children.delete(childKey);
        }
      }

      return sparseSnapshotTree.children.size === 0;
    } else {
      return true;
    }
  }
}

/**
 * Recursively iterates through all of the stored tree and calls the
 * callback on each one.
 *
 * @param prefixPath - Path to look up node for.
 * @param func - The function to invoke for each tree.
 */
export function sparseSnapshotTreeForEachTree(
  sparseSnapshotTree: SparseSnapshotTree,
  prefixPath: Path,
  func: (a: Path, b: Node) => unknown
): void {
  if (sparseSnapshotTree.value !== null) {
    func(prefixPath, sparseSnapshotTree.value);
  } else {
    sparseSnapshotTreeForEachChild(sparseSnapshotTree, (key, tree) => {
      const path = new Path(prefixPath.toString() + '/' + key);
      sparseSnapshotTreeForEachTree(tree, path, func);
    });
  }
}

/**
 * Iterates through each immediate child and triggers the callback.
 * Only seems to be used in tests.
 *
 * @param func - The function to invoke for each child.
 */
export function sparseSnapshotTreeForEachChild(
  sparseSnapshotTree: SparseSnapshotTree,
  func: (a: string, b: SparseSnapshotTree) => void
): void {
  sparseSnapshotTree.children.forEach((tree, key) => {
    func(key, tree);
  });
}
