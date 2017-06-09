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

import { Path } from "./util/Path";
import { CountedSet } from "./util/CountedSet";
import { PriorityIndex } from "./snap/Index";

/**
 * Helper class to store a sparse set of snapshots.
 *
 * @constructor
 */
export class SparseSnapshotTree {
  private value = null;
  private children = null;

  /**
   * Gets the node stored at the given path if one exists.
   *
   * @param {!Path} path Path to look up snapshot for.
   * @return {?fb.core.snap.Node} The retrieved node, or null.
   */
  find(path) {
    if (this.value != null) {
      return this.value.getChild(path);
    } else if (!path.isEmpty() && this.children != null) {
      var childKey = path.getFront();
      path = path.popFront();
      if (this.children.contains(childKey)) {
        var childTree = this.children.get(childKey);
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
   * @param {!fb.core.snap.Node} data The new data, or null.
   */
  remember(path, data) {
    if (path.isEmpty()) {
      this.value = data;
      this.children = null;
    } else if (this.value !== null) {
      this.value = this.value.updateChild(path, data);
    } else {
      if (this.children == null) {
        this.children = new CountedSet();
      }

      var childKey = path.getFront();
      if (!this.children.contains(childKey)) {
        this.children.add(childKey, new SparseSnapshotTree());
      }

      var child = this.children.get(childKey);
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
  forget(path) {
    if (path.isEmpty()) {
      this.value = null;
      this.children = null;
      return true;
    } else {
      if (this.value !== null) {
        if (this.value.isLeafNode()) {
          // We're trying to forget a node that doesn't exist
          return false;
        } else {
          var value = this.value;
          this.value = null;

          var self = this;
          value.forEachChild(PriorityIndex, function(key, tree) {
            self.remember(new Path(key), tree);
          });

          return this.forget(path);
        }
      } else if (this.children !== null) {
        var childKey = path.getFront();
        path = path.popFront();
        if (this.children.contains(childKey)) {
          var safeToRemove = this.children.get(childKey).forget(path);
          if (safeToRemove) {
            this.children.remove(childKey);
          }
        }

        if (this.children.isEmpty()) {
          this.children = null;
          return true;
        } else {
          return false;
        }

      } else {
        return true;
      }
    }
  };
  /**
   * Recursively iterates through all of the stored tree and calls the
   * callback on each one.
   *
   * @param {!Path} prefixPath Path to look up node for.
   * @param {!Function} func The function to invoke for each tree.
   */
  forEachTree(prefixPath, func) {
    if (this.value !== null) {
      func(prefixPath, this.value);
    } else {
      this.forEachChild(function(key, tree) {
        var path = new Path(prefixPath.toString() + '/' + key);
        tree.forEachTree(path, func);
      });
    }
  };


  /**
   * Iterates through each immediate child and triggers the callback.
   *
   * @param {!Function} func The function to invoke for each child.
   */
  forEachChild(func) {
    if (this.children !== null) {
      this.children.each(function(key, tree) {
        func(key, tree);
      });
    }
  };
}

