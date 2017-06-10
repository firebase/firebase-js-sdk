import { SortedMap } from "./SortedMap";
import { Path } from "./Path";
import { stringCompare } from "./util";
import { forEach } from "../../../utils/obj";

/**
 * A tree with immutable elements.
 */
export class ImmutableTree {
  value;
  children;
  
  static Empty = new ImmutableTree(null);

  /**
   * Singleton empty children collection.
   *
   * @const
   * @type {!SortedMap.<string, !ImmutableTree.<?>>}
   * @private
   */
  static get EmptyChildren_() {
    return new SortedMap(stringCompare)
  }

  /**
   * @template T
   * @param {!Object.<string, !T>} obj
   * @return {!ImmutableTree.<!T>}
   */
  static fromObject(obj) {
    var tree = ImmutableTree.Empty;
    forEach(obj, function(childSnap, childPath) {
      tree = tree.set(new Path(childPath), childSnap);
    });
    return tree;
  }

  /**
   * @template T
   * @param {?T} value
   * @param {SortedMap.<string, !ImmutableTree.<T>>=} opt_children
   */
  constructor(value, opt_children?) {
    /**
     * @const
     * @type {?T}
     */
    this.value = value;

    /**
     * @const
     * @type {!SortedMap.<string, !ImmutableTree.<T>>}
     */
    this.children = opt_children || ImmutableTree.EmptyChildren_;
  }

  /**
   * True if the value is empty and there are no children
   * @return {boolean}
   */
  isEmpty() {
    return this.value === null && this.children.isEmpty();
  }

  /**
   * Given a path and predicate, return the first node and the path to that node
   * where the predicate returns true.
   *
   * TODO Do a perf test -- If we're creating a bunch of {path: value:} objects
   * on the way back out, it may be better to pass down a pathSoFar obj.
   *
   * @param {!Path} relativePath The remainder of the path
   * @param {function(T):boolean} predicate The predicate to satisfy to return a
   *   node
   * @return {?{path:!Path, value:!T}}
   */
  findRootMostMatchingPathAndValue(relativePath, predicate) {
    if (this.value != null && predicate(this.value)) {
      return {path: Path.Empty, value: this.value};
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
            var fullPath = new Path(front)
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
  }

  /**
   * Find, if it exists, the shortest subpath of the given path that points a defined
   * value in the tree
   * @param {!Path} relativePath
   * @return {?{path: !Path, value: !T}}
   */
  findRootMostValueAndPath(relativePath) {
    return this.findRootMostMatchingPathAndValue(relativePath, function() { return true; });
  }

  /**
   * @param {!Path} relativePath
   * @return {!ImmutableTree.<T>} The subtree at the given path
   */
  subtree(relativePath) {
    if (relativePath.isEmpty()) {
      return this;
    } else {
      var front = relativePath.getFront();
      var childTree = this.children.get(front);
      if (childTree !== null) {
        return childTree.subtree(relativePath.popFront());
      } else {
        return ImmutableTree.Empty;
      }
    }
  }

  /**
   * Sets a value at the specified path.
   *
   * @param {!Path} relativePath Path to set value at.
   * @param {?T} toSet Value to set.
   * @return {!ImmutableTree.<T>} Resulting tree.
   */
  set(relativePath, toSet) {
    if (relativePath.isEmpty()) {
      return new ImmutableTree(toSet, this.children);
    } else {
      var front = relativePath.getFront();
      var child = this.children.get(front) || ImmutableTree.Empty;
      var newChild = child.set(relativePath.popFront(), toSet);
      var newChildren = this.children.insert(front, newChild);
      return new ImmutableTree(this.value, newChildren);
    }
  }

  /**
   * Removes the value at the specified path.
   *
   * @param {!Path} relativePath Path to value to remove.
   * @return {!ImmutableTree.<T>} Resulting tree.
   */
  remove(relativePath) {
    if (relativePath.isEmpty()) {
      if (this.children.isEmpty()) {
        return ImmutableTree.Empty;
      } else {
        return new ImmutableTree(null, this.children);
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
          return ImmutableTree.Empty;
        } else {
          return new ImmutableTree(this.value, newChildren);
        }
      } else {
        return this;
      }
    }
  }

  /**
   * Gets a value from the tree.
   *
   * @param {!Path} relativePath Path to get value for.
   * @return {?T} Value at path, or null.
   */
  get(relativePath) {
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
  }

  /**
   * Replace the subtree at the specified path with the given new tree.
   *
   * @param {!Path} relativePath Path to replace subtree for.
   * @param {!ImmutableTree} newTree New tree.
   * @return {!ImmutableTree} Resulting tree.
   */
  setTree(relativePath, newTree) {
    if (relativePath.isEmpty()) {
      return newTree;
    } else {
      var front = relativePath.getFront();
      var child = this.children.get(front) || ImmutableTree.Empty;
      var newChild = child.setTree(relativePath.popFront(), newTree);
      var newChildren;
      if (newChild.isEmpty()) {
        newChildren = this.children.remove(front);
      } else {
        newChildren = this.children.insert(front, newChild);
      }
      return new ImmutableTree(this.value, newChildren);
    }
  }

  /**
   * Performs a depth first fold on this tree. Transforms a tree into a single
   * value, given a function that operates on the path to a node, an optional
   * current value, and a map of child names to folded subtrees
   * @template V
   * @param {function(Path, ?T, Object.<string, V>):V} fn
   * @return {V}
   */
  fold(fn) {
    return this.fold_(Path.Empty, fn);
  }

  /**
   * Recursive helper for public-facing fold() method
   * @template V
   * @param {!Path} pathSoFar
   * @param {function(Path, ?T, Object.<string, V>):V} fn
   * @return {V}
   * @private
   */
  fold_(pathSoFar, fn) {
    var accum = {};
    this.children.inorderTraversal(function(childKey, childTree) {
      accum[childKey] = childTree.fold_(pathSoFar.child(childKey), fn);
    });
    return fn(pathSoFar, this.value, accum);
  }

  /**
   * Find the first matching value on the given path. Return the result of applying f to it.
   * @template V
   * @param {!Path} path
   * @param {!function(!Path, !T):?V} f
   * @return {?V}
   */
  findOnPath(path, f) {
    return this.findOnPath_(path, Path.Empty, f);
  }

  findOnPath_(pathToFollow, pathSoFar, f) {
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
  }

  foreachOnPath(path, f) {
    return this.foreachOnPath_(path, Path.Empty, f);
  }

  foreachOnPath_(pathToFollow, currentRelativePath, f) {
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
        return ImmutableTree.Empty;
      }
    }
  }

  /**
   * Calls the given function for each node in the tree that has a value.
   *
   * @param {function(!Path, !T)} f A function to be called with
   *   the path from the root of the tree to a node, and the value at that node.
   *   Called in depth-first order.
   */
  foreach(f) {
    this.foreach_(Path.Empty, f);
  }

  foreach_(currentRelativePath, f) {
    this.children.inorderTraversal(function(childName, childTree) {
      childTree.foreach_(currentRelativePath.child(childName), f);
    });
    if (this.value) {
      f(currentRelativePath, this.value);
    }
  }

  foreachChild(f) {
    this.children.inorderTraversal(function(childName, childTree) {
      if (childTree.value) {
        f(childName, childTree.value);
      }
    });
  }
}; // end ImmutableTree
