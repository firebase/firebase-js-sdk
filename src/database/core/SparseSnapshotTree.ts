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

import { Path } from './util/Path';
import { PRIORITY_INDEX } from './snap/indexes/PriorityIndex';
import { CountedSet } from './util/CountedSet';
import { Node } from './snap/Node';

/**
 * Helper class to store a sparse set of snapshots.
 *
 * @constructor
 */
export class SparseSnapshotTree {
  /**
   * @private
   * @type {Node}
   */
  private value_: Node | null = null;

  /**
   * @private
   * @type {CountedSet}
   */
  private children_: CountedSet<string, SparseSnapshotTree> | null = null;

  /**
   * Gets the node stored at the given path if one exists.
   *
   * @param {!Path} path Path to look up snapshot for.
   * @return {?Node} The retrieved node, or null.
   */
  find(path: Path): Node | null {
    if (this.value_ != null) {
      return this.value_.getChild(path);
    } else if (!path.isEmpty() && this.children_ != null) {
      const childKey = path.getFront();
      path = path.popFront();
      if (this.children_.contains(childKey)) {
        const childTree = this.children_.get(childKey) as SparseSnapshotTree;
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
   * @param {!Path} path Path to look up snapshot for.
   * @param {!Node} data The new data, or null.
   */
  remember(path: Path, data: Node) {
    if (path.isEmpty()) {
      this.value_ = data;
      this.children_ = null;
    } else if (this.value_ !== null) {
      this.value_ = this.value_.updateChild(path, data);
    } else {
      if (this.children_ == null) {
        this.children_ = new CountedSet<string, SparseSnapshotTree>();
      }

      const childKey = path.getFront();
      if (!this.children_.contains(childKey)) {
        this.children_.add(childKey, new SparseSnapshotTree());
      }

      const child = this.children_.get(childKey) as SparseSnapshotTree;
      path = path.popFront();
      child.remember(path, data);
    }
  }

  /**
   * Purge the data at path from the cache.
   *
   * @param {!Path} path Path to look up snapshot for.
   * @return {boolean} True if this node should now be removed.
   */
  forget(path: Path): boolean {
    if (path.isEmpty()) {
      this.value_ = null;
      this.children_ = null;
      return true;
    } else {
      if (this.value_ !== null) {
        if (this.value_.isLeafNode()) {
          // We're trying to forget a node that doesn't exist
          return false;
        } else {
          const value = this.value_;
          this.value_ = null;

          const self = this;
          value.forEachChild(PRIORITY_INDEX, function(key, tree) {
            self.remember(new Path(key), tree);
          });

          return this.forget(path);
        }
      } else if (this.children_ !== null) {
        const childKey = path.getFront();
        path = path.popFront();
        if (this.children_.contains(childKey)) {
          const safeToRemove = (this.children_.get(
            childKey
          ) as SparseSnapshotTree).forget(path);
          if (safeToRemove) {
            this.children_.remove(childKey);
          }
        }

        if (this.children_.isEmpty()) {
          this.children_ = null;
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    }
  }

  /**
   * Recursively iterates through all of the stored tree and calls the
   * callback on each one.
   *
   * @param {!Path} prefixPath Path to look up node for.
   * @param {!Function} func The function to invoke for each tree.
   */
  forEachTree(prefixPath: Path, func: (a: Path, b: Node) => any) {
    if (this.value_ !== null) {
      func(prefixPath, this.value_);
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
   * @param {!Function} func The function to invoke for each child.
   */
  forEachChild(func: (a: string, b: SparseSnapshotTree) => void) {
    if (this.children_ !== null) {
      this.children_.each((key, tree) => {
        func(key, tree);
      });
    }
  }
}
