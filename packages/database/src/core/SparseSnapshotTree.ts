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

import { Path } from './util/Path';
import { PRIORITY_INDEX } from './snap/indexes/PriorityIndex';
import { Node } from './snap/Node';

/**
 * Helper class to store a sparse set of snapshots.
 */
export class SparseSnapshotTree {
  private value: Node | null = null;

  private readonly children: Map<string, SparseSnapshotTree> = new Map();

  /**
   * Gets the node stored at the given path if one exists.
   *
   * @param path Path to look up snapshot for.
   * @return The retrieved node, or null.
   */
  find(path: Path): Node | null {
    if (this.value != null) {
      return this.value.getChild(path);
    } else if (!path.isEmpty() && this.children.size > 0) {
      const childKey = path.getFront();
      path = path.popFront();
      if (this.children.has(childKey)) {
        const childTree = this.children.get(childKey);
        return childTree.find(path);
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
   * @param path Path to look up snapshot for.
   * @param data The new data, or null.
   */
  remember(path: Path, data: Node) {
    if (path.isEmpty()) {
      this.value = data;
      this.children.clear();
    } else if (this.value !== null) {
      this.value = this.value.updateChild(path, data);
    } else {
      const childKey = path.getFront();
      if (!this.children.has(childKey)) {
        this.children.set(childKey, new SparseSnapshotTree());
      }

      const child = this.children.get(childKey);
      path = path.popFront();
      child.remember(path, data);
    }
  }

  /**
   * Purge the data at path from the cache.
   *
   * @param path Path to look up snapshot for.
   * @return True if this node should now be removed.
   */
  forget(path: Path): boolean {
    if (path.isEmpty()) {
      this.value = null;
      this.children.clear();
      return true;
    } else {
      if (this.value !== null) {
        if (this.value.isLeafNode()) {
          // We're trying to forget a node that doesn't exist
          return false;
        } else {
          const value = this.value;
          this.value = null;

          const self = this;
          value.forEachChild(PRIORITY_INDEX, (key, tree) => {
            self.remember(new Path(key), tree);
          });

          return this.forget(path);
        }
      } else if (this.children.size > 0) {
        const childKey = path.getFront();
        path = path.popFront();
        if (this.children.has(childKey)) {
          const safeToRemove = this.children.get(childKey).forget(path);
          if (safeToRemove) {
            this.children.delete(childKey);
          }
        }

        return this.children.size === 0;
      } else {
        return true;
      }
    }
  }

  /**
   * Recursively iterates through all of the stored tree and calls the
   * callback on each one.
   *
   * @param prefixPath Path to look up node for.
   * @param func The function to invoke for each tree.
   */
  forEachTree(prefixPath: Path, func: (a: Path, b: Node) => unknown) {
    if (this.value !== null) {
      func(prefixPath, this.value);
    } else {
      this.forEachChild((key, tree) => {
        const path = new Path(prefixPath.toString() + '/' + key);
        tree.forEachTree(path, func);
      });
    }
  }

  /**
   * Iterates through each immediate child and triggers the callback.
   *
   * @param func The function to invoke for each child.
   */
  forEachChild(func: (a: string, b: SparseSnapshotTree) => void) {
    this.children.forEach((tree, key) => {
      func(key, tree);
    });
  }
}
