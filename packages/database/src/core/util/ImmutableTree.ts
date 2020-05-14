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

import { SortedMap } from './SortedMap';
import { Path } from './Path';
import { stringCompare, each } from './util';

let emptyChildrenSingleton: SortedMap<string, ImmutableTree<null>>;

/**
 * Singleton empty children collection.
 *
 * @const
 * @type {!SortedMap.<string, !ImmutableTree.<?>>}
 */
const EmptyChildren = (): SortedMap<string, ImmutableTree<null>> => {
  if (!emptyChildrenSingleton) {
    emptyChildrenSingleton = new SortedMap<string, ImmutableTree<null>>(
      stringCompare
    );
  }
  return emptyChildrenSingleton;
};

/**
 * A tree with immutable elements.
 */
export class ImmutableTree<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static Empty = new ImmutableTree<any>(null);

  /**
   * @template T
   * @param {!Object.<string, !T>} obj
   * @return {!ImmutableTree.<!T>}
   */
  static fromObject<T>(obj: { [k: string]: T }): ImmutableTree<T> {
    let tree: ImmutableTree<T> = ImmutableTree.Empty;
    each(obj, (childPath: string, childSnap: T) => {
      tree = tree.set(new Path(childPath), childSnap);
    });
    return tree;
  }

  /**
   * @template T
   * @param {?T} value
   * @param {SortedMap.<string, !ImmutableTree.<T>>=} children
   */
  constructor(
    public readonly value: T | null,
    public readonly children: SortedMap<
      string,
      ImmutableTree<T>
    > = EmptyChildren()
  ) {}

  /**
   * True if the value is empty and there are no children
   * @return {boolean}
   */
  isEmpty(): boolean {
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
  findRootMostMatchingPathAndValue(
    relativePath: Path,
    predicate: (a: T) => boolean
  ): { path: Path; value: T } | null {
    if (this.value != null && predicate(this.value)) {
      return { path: Path.Empty, value: this.value };
    } else {
      if (relativePath.isEmpty()) {
        return null;
      } else {
        const front = relativePath.getFront();
        const child = this.children.get(front);
        if (child !== null) {
          const childExistingPathAndValue = child.findRootMostMatchingPathAndValue(
            relativePath.popFront(),
            predicate
          );
          if (childExistingPathAndValue != null) {
            const fullPath = new Path(front).child(
              childExistingPathAndValue.path
            );
            return { path: fullPath, value: childExistingPathAndValue.value };
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
  findRootMostValueAndPath(
    relativePath: Path
  ): { path: Path; value: T } | null {
    return this.findRootMostMatchingPathAndValue(relativePath, () => true);
  }

  /**
   * @param {!Path} relativePath
   * @return {!ImmutableTree.<T>} The subtree at the given path
   */
  subtree(relativePath: Path): ImmutableTree<T> {
    if (relativePath.isEmpty()) {
      return this;
    } else {
      const front = relativePath.getFront();
      const childTree = this.children.get(front);
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
  set(relativePath: Path, toSet: T | null): ImmutableTree<T> {
    if (relativePath.isEmpty()) {
      return new ImmutableTree(toSet, this.children);
    } else {
      const front = relativePath.getFront();
      const child = this.children.get(front) || ImmutableTree.Empty;
      const newChild = child.set(relativePath.popFront(), toSet);
      const newChildren = this.children.insert(front, newChild);
      return new ImmutableTree(this.value, newChildren);
    }
  }

  /**
   * Removes the value at the specified path.
   *
   * @param {!Path} relativePath Path to value to remove.
   * @return {!ImmutableTree.<T>} Resulting tree.
   */
  remove(relativePath: Path): ImmutableTree<T> {
    if (relativePath.isEmpty()) {
      if (this.children.isEmpty()) {
        return ImmutableTree.Empty;
      } else {
        return new ImmutableTree(null, this.children);
      }
    } else {
      const front = relativePath.getFront();
      const child = this.children.get(front);
      if (child) {
        const newChild = child.remove(relativePath.popFront());
        let newChildren;
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
  get(relativePath: Path): T | null {
    if (relativePath.isEmpty()) {
      return this.value;
    } else {
      const front = relativePath.getFront();
      const child = this.children.get(front);
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
  setTree(relativePath: Path, newTree: ImmutableTree<T>): ImmutableTree<T> {
    if (relativePath.isEmpty()) {
      return newTree;
    } else {
      const front = relativePath.getFront();
      const child = this.children.get(front) || ImmutableTree.Empty;
      const newChild = child.setTree(relativePath.popFront(), newTree);
      let newChildren;
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
  fold<V>(fn: (path: Path, value: T, children: { [k: string]: V }) => V): V {
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
  private fold_<V>(
    pathSoFar: Path,
    fn: (path: Path, value: T | null, children: { [k: string]: V }) => V
  ): V {
    const accum: { [k: string]: V } = {};
    this.children.inorderTraversal(
      (childKey: string, childTree: ImmutableTree<T>) => {
        accum[childKey] = childTree.fold_(pathSoFar.child(childKey), fn);
      }
    );
    return fn(pathSoFar, this.value, accum);
  }

  /**
   * Find the first matching value on the given path. Return the result of applying f to it.
   * @template V
   * @param {!Path} path
   * @param {!function(!Path, !T):?V} f
   * @return {?V}
   */
  findOnPath<V>(path: Path, f: (path: Path, value: T) => V | null): V | null {
    return this.findOnPath_(path, Path.Empty, f);
  }

  private findOnPath_<V>(
    pathToFollow: Path,
    pathSoFar: Path,
    f: (path: Path, value: T) => V | null
  ): V | null {
    const result = this.value ? f(pathSoFar, this.value) : false;
    if (result) {
      return result;
    } else {
      if (pathToFollow.isEmpty()) {
        return null;
      } else {
        const front = pathToFollow.getFront()!;
        const nextChild = this.children.get(front);
        if (nextChild) {
          return nextChild.findOnPath_(
            pathToFollow.popFront(),
            pathSoFar.child(front),
            f
          );
        } else {
          return null;
        }
      }
    }
  }

  /**
   *
   * @param {!Path} path
   * @param {!function(!Path, !T)} f
   * @returns {!ImmutableTree.<T>}
   */
  foreachOnPath(
    path: Path,
    f: (path: Path, value: T) => void
  ): ImmutableTree<T> {
    return this.foreachOnPath_(path, Path.Empty, f);
  }

  private foreachOnPath_(
    pathToFollow: Path,
    currentRelativePath: Path,
    f: (path: Path, value: T) => void
  ): ImmutableTree<T> {
    if (pathToFollow.isEmpty()) {
      return this;
    } else {
      if (this.value) {
        f(currentRelativePath, this.value);
      }
      const front = pathToFollow.getFront();
      const nextChild = this.children.get(front);
      if (nextChild) {
        return nextChild.foreachOnPath_(
          pathToFollow.popFront(),
          currentRelativePath.child(front),
          f
        );
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
  foreach(f: (path: Path, value: T) => void) {
    this.foreach_(Path.Empty, f);
  }

  private foreach_(
    currentRelativePath: Path,
    f: (path: Path, value: T) => void
  ) {
    this.children.inorderTraversal((childName, childTree) => {
      childTree.foreach_(currentRelativePath.child(childName), f);
    });
    if (this.value) {
      f(currentRelativePath, this.value);
    }
  }

  /**
   *
   * @param {function(string, !T)} f
   */
  foreachChild(f: (name: string, value: T) => void) {
    this.children.inorderTraversal(
      (childName: string, childTree: ImmutableTree<T>) => {
        if (childTree.value) {
          f(childName, childTree.value);
        }
      }
    );
  }
}
