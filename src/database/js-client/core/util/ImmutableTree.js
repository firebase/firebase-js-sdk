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
goog.provide('fb.core.util.ImmutableTree');

goog.require('fb.core.util');
goog.require('fb.core.util.Path');
goog.require('fb.core.util.SortedMap');
goog.require('fb.util.json');
goog.require('fb.util.obj');
goog.require('goog.object');


/**
 * A tree with immutable elements.
 */
fb.core.util.ImmutableTree = goog.defineClass(null, {
  /**
   * @template T
   * @param {?T} value
   * @param {fb.core.util.SortedMap.<string, !fb.core.util.ImmutableTree.<T>>=} opt_children
   */
  constructor: function(value, opt_children) {
    /**
     * @const
     * @type {?T}
     */
    this.value = value;

    /**
     * @const
     * @type {!fb.core.util.SortedMap.<string, !fb.core.util.ImmutableTree.<T>>}
     */
    this.children = opt_children || fb.core.util.ImmutableTree.EmptyChildren_;
  },

  statics: {
    /**
     * Singleton empty children collection.
     *
     * @const
     * @type {!fb.core.util.SortedMap.<string, !fb.core.util.ImmutableTree.<?>>}
     * @private
     */
    EmptyChildren_: new fb.core.util.SortedMap(fb.core.util.stringCompare),

    /**
     * @template T
     * @param {!Object.<string, !T>} obj
     * @return {!fb.core.util.ImmutableTree.<!T>}
     */
    fromObject: function(obj) {
      var tree = fb.core.util.ImmutableTree.Empty;
      goog.object.forEach(obj, function(childSnap, childPath) {
        tree = tree.set(new fb.core.util.Path(childPath), childSnap);
      });
      return tree;
    }
  },

  /**
   * True if the value is empty and there are no children
   * @return {boolean}
   */
  isEmpty: function() {
    return this.value === null && this.children.isEmpty();
  },

  /**
   * Given a path and predicate, return the first node and the path to that node
   * where the predicate returns true.
   *
   * TODO Do a perf test -- If we're creating a bunch of {path: value:} objects
   * on the way back out, it may be better to pass down a pathSoFar obj.
   *
   * @param {!fb.core.util.Path} relativePath The remainder of the path
   * @param {function(T):boolean} predicate The predicate to satisfy to return a
   *   node
   * @return {?{path:!fb.core.util.Path, value:!T}}
   */
  findRootMostMatchingPathAndValue: function(relativePath, predicate) {
    if (this.value != null && predicate(this.value)) {
      return {path: fb.core.util.Path.Empty, value: this.value};
    } else {
      if (relativePath.isEmpty()) {
        return null;
      } else {
        var front = relativePath.getFront();
        var child = this.children.get(front);
        if (child !== null) {
          var childExistingPathAndValue =
              child.findRootMostMatchingPathAndValue(relativePath.popFront(),
                                                     predicate);
          if (childExistingPathAndValue != null) {
            var fullPath = new fb.core.util.Path(front)
                .child(childExistingPathAndValue.path);
            return {path: fullPath, value: childExistingPathAndValue.value};
          } else {
            return null;
          }
        } else {
          return null;
        }
      }
    }
  },

  /**
   * Find, if it exists, the shortest subpath of the given path that points a defined
   * value in the tree
   * @param {!fb.core.util.Path} relativePath
   * @return {?{path: !fb.core.util.Path, value: !T}}
   */
  findRootMostValueAndPath: function(relativePath) {
    return this.findRootMostMatchingPathAndValue(relativePath, function() { return true; });
  },

  /**
   * @param {!fb.core.util.Path} relativePath
   * @return {!fb.core.util.ImmutableTree.<T>} The subtree at the given path
   */
  subtree: function(relativePath) {
    if (relativePath.isEmpty()) {
      return this;
    } else {
      var front = relativePath.getFront();
      var childTree = this.children.get(front);
      if (childTree !== null) {
        return childTree.subtree(relativePath.popFront());
      } else {
        return fb.core.util.ImmutableTree.Empty;
      }
    }
  },

  /**
   * Sets a value at the specified path.
   *
   * @param {!fb.core.util.Path} relativePath Path to set value at.
   * @param {?T} toSet Value to set.
   * @return {!fb.core.util.ImmutableTree.<T>} Resulting tree.
   */
  set: function(relativePath, toSet) {
    if (relativePath.isEmpty()) {
      return new fb.core.util.ImmutableTree(toSet, this.children);
    } else {
      var front = relativePath.getFront();
      var child = this.children.get(front) || fb.core.util.ImmutableTree.Empty;
      var newChild = child.set(relativePath.popFront(), toSet);
      var newChildren = this.children.insert(front, newChild);
      return new fb.core.util.ImmutableTree(this.value, newChildren);
    }
  },

  /**
   * Removes the value at the specified path.
   *
   * @param {!fb.core.util.Path} relativePath Path to value to remove.
   * @return {!fb.core.util.ImmutableTree.<T>} Resulting tree.
   */
  remove: function(relativePath) {
    if (relativePath.isEmpty()) {
      if (this.children.isEmpty()) {
        return fb.core.util.ImmutableTree.Empty;
      } else {
        return new fb.core.util.ImmutableTree(null, this.children);
      }
    } else {
      var front = relativePath.getFront();
      var child = this.children.get(front);
      if (child) {
        var newChild = child.remove(relativePath.popFront());
        var newChildren;
        if (newChild.isEmpty()) {
          newChildren = this.children.remove(front);
        } else {
          newChildren = this.children.insert(front, newChild);
        }
        if (this.value === null && newChildren.isEmpty()) {
          return fb.core.util.ImmutableTree.Empty;
        } else {
          return new fb.core.util.ImmutableTree(this.value, newChildren);
        }
      } else {
        return this;
      }
    }
  },

  /**
   * Gets a value from the tree.
   *
   * @param {!fb.core.util.Path} relativePath Path to get value for.
   * @return {?T} Value at path, or null.
   */
  get: function(relativePath) {
    if (relativePath.isEmpty()) {
      return this.value;
    } else {
      var front = relativePath.getFront();
      var child = this.children.get(front);
      if (child) {
        return child.get(relativePath.popFront());
      } else {
        return null;
      }
    }
  },

  /**
   * Replace the subtree at the specified path with the given new tree.
   *
   * @param {!fb.core.util.Path} relativePath Path to replace subtree for.
   * @param {!fb.core.util.ImmutableTree} newTree New tree.
   * @return {!fb.core.util.ImmutableTree} Resulting tree.
   */
  setTree: function(relativePath, newTree) {
    if (relativePath.isEmpty()) {
      return newTree;
    } else {
      var front = relativePath.getFront();
      var child = this.children.get(front) || fb.core.util.ImmutableTree.Empty;
      var newChild = child.setTree(relativePath.popFront(), newTree);
      var newChildren;
      if (newChild.isEmpty()) {
        newChildren = this.children.remove(front);
      } else {
        newChildren = this.children.insert(front, newChild);
      }
      return new fb.core.util.ImmutableTree(this.value, newChildren);
    }
  },

  /**
   * Performs a depth first fold on this tree. Transforms a tree into a single
   * value, given a function that operates on the path to a node, an optional
   * current value, and a map of child names to folded subtrees
   * @template V
   * @param {function(fb.core.util.Path, ?T, Object.<string, V>):V} fn
   * @return {V}
   */
  fold: function(fn) {
    return this.fold_(fb.core.util.Path.Empty, fn);
  },

  /**
   * Recursive helper for public-facing fold() method
   * @template V
   * @param {!fb.core.util.Path} pathSoFar
   * @param {function(fb.core.util.Path, ?T, Object.<string, V>):V} fn
   * @return {V}
   * @private
   */
  fold_: function(pathSoFar, fn) {
    var accum = {};
    this.children.inorderTraversal(function(childKey, childTree) {
      accum[childKey] = childTree.fold_(pathSoFar.child(childKey), fn);
    });
    return fn(pathSoFar, this.value, accum);
  },

  /**
   * Find the first matching value on the given path. Return the result of applying f to it.
   * @template V
   * @param {!fb.core.util.Path} path
   * @param {!function(!fb.core.util.Path, !T):?V} f
   * @return {?V}
   */
  findOnPath: function(path, f) {
    return this.findOnPath_(path, fb.core.util.Path.Empty, f);
  },

  findOnPath_: function(pathToFollow, pathSoFar, f) {
    var result = this.value ? f(pathSoFar, this.value) : false;
    if (result) {
      return result;
    } else {
      if (pathToFollow.isEmpty()) {
        return null;
      } else {
        var front = pathToFollow.getFront();
        var nextChild = this.children.get(front);
        if (nextChild) {
          return nextChild.findOnPath_(pathToFollow.popFront(), pathSoFar.child(front), f);
        } else {
          return null;
        }
      }
    }
  },

  foreachOnPath: function(path, f) {
    return this.foreachOnPath_(path, fb.core.util.Path.Empty, f);
  },

  foreachOnPath_: function(pathToFollow, currentRelativePath, f) {
    if (pathToFollow.isEmpty()) {
      return this;
    } else {
      if (this.value) {
        f(currentRelativePath, this.value);
      }
      var front = pathToFollow.getFront();
      var nextChild = this.children.get(front);
      if (nextChild) {
        return nextChild.foreachOnPath_(pathToFollow.popFront(),
                                        currentRelativePath.child(front), f);
      } else {
        return fb.core.util.ImmutableTree.Empty;
      }
    }
  },

  /**
   * Calls the given function for each node in the tree that has a value.
   *
   * @param {function(!fb.core.util.Path, !T)} f A function to be called with
   *   the path from the root of the tree to a node, and the value at that node.
   *   Called in depth-first order.
   */
  foreach: function(f) {
    this.foreach_(fb.core.util.Path.Empty, f);
  },

  foreach_: function(currentRelativePath, f) {
    this.children.inorderTraversal(function(childName, childTree) {
      childTree.foreach_(currentRelativePath.child(childName), f);
    });
    if (this.value) {
      f(currentRelativePath, this.value);
    }
  },

  foreachChild: function(f) {
    this.children.inorderTraversal(function(childName, childTree) {
      if (childTree.value) {
        f(childName, childTree.value);
      }
    });
  }
}); // end fb.core.util.ImmutableTree


/**
 * @const
 */
fb.core.util.ImmutableTree.Empty = new fb.core.util.ImmutableTree(null);


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  fb.core.util.ImmutableTree.prototype.toString = function() {
    var json = {};
    this.foreach(function(relativePath, value) {
      var pathString = relativePath.toString();
      json[pathString] = value.toString();
    });
    return fb.util.json.stringify(json);
  };
}
