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
goog.provide('fb.core.SparseSnapshotTree');
goog.require('fb.core.snap.Node');
goog.require('fb.core.snap.PriorityIndex');
goog.require('fb.core.util.CountedSet');
goog.require('fb.core.util.Path');

/**
 * Helper class to store a sparse set of snapshots.
 *
 * @constructor
 */
fb.core.SparseSnapshotTree = function() {
  /**
   * @private
   * @type {fb.core.snap.Node}
   */
   this.value_ = null;

  /**
   * @private
   * @type {fb.core.util.CountedSet}
   */
   this.children_ = null;
};

/**
 * Gets the node stored at the given path if one exists.
 *
 * @param {!fb.core.util.Path} path Path to look up snapshot for.
 * @return {?fb.core.snap.Node} The retrieved node, or null.
 */
fb.core.SparseSnapshotTree.prototype.find = function(path) {
  if (this.value_ != null) {
    return this.value_.getChild(path);
  } else if (!path.isEmpty() && this.children_ != null) {
    var childKey = path.getFront();
    path = path.popFront();
    if (this.children_.contains(childKey)) {
      var childTree = this.children_.get(childKey);
      return childTree.find(path);
    } else {
      return null;
    }
  } else {
    return null;
  }
};


/**
 * Stores the given node at the specified path. If there is already a node
 * at a shallower path, it merges the new data into that snapshot node.
 *
 * @param {!fb.core.util.Path} path Path to look up snapshot for.
 * @param {!fb.core.snap.Node} data The new data, or null.
 */
fb.core.SparseSnapshotTree.prototype.remember = function(path, data) {
  if (path.isEmpty()) {
    this.value_ = data;
    this.children_ = null;
  } else if (this.value_ !== null) {
    this.value_ = this.value_.updateChild(path, data);
  } else {
    if (this.children_ == null) {
      this.children_ = new fb.core.util.CountedSet();
    }

    var childKey = path.getFront();
    if (!this.children_.contains(childKey)) {
      this.children_.add(childKey, new fb.core.SparseSnapshotTree());
    }

    var child = this.children_.get(childKey);
    path = path.popFront();
    child.remember(path, data);
  }
};


/**
 * Purge the data at path from the cache.
 *
 * @param {!fb.core.util.Path} path Path to look up snapshot for.
 * @return {boolean} True if this node should now be removed.
 */
fb.core.SparseSnapshotTree.prototype.forget = function(path) {
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
        var value = this.value_;
        this.value_ = null;

        var self = this;
        value.forEachChild(fb.core.snap.PriorityIndex, function(key, tree) {
          self.remember(new fb.core.util.Path(key), tree);
        });

        return this.forget(path);
      }
    } else if (this.children_ !== null) {
      var childKey = path.getFront();
      path = path.popFront();
      if (this.children_.contains(childKey)) {
        var safeToRemove = this.children_.get(childKey).forget(path);
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
};

/**
 * Recursively iterates through all of the stored tree and calls the
 * callback on each one.
 *
 * @param {!fb.core.util.Path} prefixPath Path to look up node for.
 * @param {!Function} func The function to invoke for each tree.
 */
fb.core.SparseSnapshotTree.prototype.forEachTree = function(prefixPath, func) {
  if (this.value_ !== null) {
    func(prefixPath, this.value_);
  } else {
    this.forEachChild(function(key, tree) {
      var path = new fb.core.util.Path(prefixPath.toString() + '/' + key);
      tree.forEachTree(path, func);
    });
  }
};


/**
 * Iterates through each immediate child and triggers the callback.
 *
 * @param {!Function} func The function to invoke for each child.
 */
fb.core.SparseSnapshotTree.prototype.forEachChild = function(func) {
  if (this.children_ !== null) {
    this.children_.each(function(key, tree) {
      func(key, tree);
    });
  }
};
