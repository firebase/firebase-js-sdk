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

import {
  newEmptyPath,
  Path,
  pathChild,
  pathGetFront,
  pathIsEmpty,
  pathPopFront
} from './Path';
import { SortedMap } from './SortedMap';
import { each, stringCompare } from './util';

let emptyChildrenSingleton: SortedMap<string, ImmutableTree<null>>;

/**
 * Singleton empty children collection.
 *
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
  static fromObject<T>(obj: { [k: string]: T }): ImmutableTree<T> {
    let tree: ImmutableTree<T> = new ImmutableTree<T>(null);
    each(obj, (childPath: string, childSnap: T) => {
      tree = tree.set(new Path(childPath), childSnap);
    });
    return tree;
  }

  constructor(
    public readonly value: T | null,
    public readonly children: SortedMap<
      string,
      ImmutableTree<T>
    > = EmptyChildren()
  ) {}

  /**
   * True if the value is empty and there are no children
   */
  isEmpty(): boolean {
    return this.value === null && this.children.isEmpty();
  }

  /**
   * Given a path and predicate, return the first node and the path to that node
   * where the predicate returns true.
   *
   * TODO Do a perf test -- If we're creating a bunch of `{path: value:}`
   * objects on the way back out, it may be better to pass down a pathSoFar obj.
   *
   * @param relativePath - The remainder of the path
   * @param predicate - The predicate to satisfy to return a node
   */
  findRootMostMatchingPathAndValue(
    relativePath: Path,
    predicate: (a: T) => boolean
  ): { path: Path; value: T } | null {
    if (this.value != null && predicate(this.value)) {
      return { path: newEmptyPath(), value: this.value };
    } else {
      if (pathIsEmpty(relativePath)) {
        return null;
      } else {
        const front = pathGetFront(relativePath);
        const child = this.children.get(front);
        if (child !== null) {
          const childExistingPathAndValue = child.findRootMostMatchingPathAndValue(
            pathPopFront(relativePath),
            predicate
          );
          if (childExistingPathAndValue != null) {
            const fullPath = pathChild(
              new Path(front),
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
   */
  findRootMostValueAndPath(
    relativePath: Path
  ): { path: Path; value: T } | null {
    return this.findRootMostMatchingPathAndValue(relativePath, () => true);
  }

  /**
   * @returns The subtree at the given path
   */
  subtree(relativePath: Path): ImmutableTree<T> {
    if (pathIsEmpty(relativePath)) {
      return this;
    } else {
      const front = pathGetFront(relativePath);
      const childTree = this.children.get(front);
      if (childTree !== null) {
        return childTree.subtree(pathPopFront(relativePath));
      } else {
        return new ImmutableTree<T>(null);
      }
    }
  }

  /**
   * Sets a value at the specified path.
   *
   * @param relativePath - Path to set value at.
   * @param toSet - Value to set.
   * @returns Resulting tree.
   */
  set(relativePath: Path, toSet: T | null): ImmutableTree<T> {
    if (pathIsEmpty(relativePath)) {
      return new ImmutableTree(toSet, this.children);
    } else {
      const front = pathGetFront(relativePath);
      const child = this.children.get(front) || new ImmutableTree<T>(null);
      const newChild = child.set(pathPopFront(relativePath), toSet);
      const newChildren = this.children.insert(front, newChild);
      return new ImmutableTree(this.value, newChildren);
    }
  }

  /**
   * Removes the value at the specified path.
   *
   * @param relativePath - Path to value to remove.
   * @returns Resulting tree.
   */
  remove(relativePath: Path): ImmutableTree<T> {
    if (pathIsEmpty(relativePath)) {
      if (this.children.isEmpty()) {
        return new ImmutableTree<T>(null);
      } else {
        return new ImmutableTree(null, this.children);
      }
    } else {
      const front = pathGetFront(relativePath);
      const child = this.children.get(front);
      if (child) {
        const newChild = child.remove(pathPopFront(relativePath));
        let newChildren;
        if (newChild.isEmpty()) {
          newChildren = this.children.remove(front);
        } else {
          newChildren = this.children.insert(front, newChild);
        }
        if (this.value === null && newChildren.isEmpty()) {
          return new ImmutableTree<T>(null);
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
   * @param relativePath - Path to get value for.
   * @returns Value at path, or null.
   */
  get(relativePath: Path): T | null {
    if (pathIsEmpty(relativePath)) {
      return this.value;
    } else {
      const front = pathGetFront(relativePath);
      const child = this.children.get(front);
      if (child) {
        return child.get(pathPopFront(relativePath));
      } else {
        return null;
      }
    }
  }

  /**
   * Replace the subtree at the specified path with the given new tree.
   *
   * @param relativePath - Path to replace subtree for.
   * @param newTree - New tree.
   * @returns Resulting tree.
   */
  setTree(relativePath: Path, newTree: ImmutableTree<T>): ImmutableTree<T> {
    if (pathIsEmpty(relativePath)) {
      return newTree;
    } else {
      const front = pathGetFront(relativePath);
      const child = this.children.get(front) || new ImmutableTree<T>(null);
      const newChild = child.setTree(pathPopFront(relativePath), newTree);
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
   */
  fold<V>(fn: (path: Path, value: T, children: { [k: string]: V }) => V): V {
    return this.fold_(newEmptyPath(), fn);
  }

  /**
   * Recursive helper for public-facing fold() method
   */
  private fold_<V>(
    pathSoFar: Path,
    fn: (path: Path, value: T | null, children: { [k: string]: V }) => V
  ): V {
    const accum: { [k: string]: V } = {};
    this.children.inorderTraversal(
      (childKey: string, childTree: ImmutableTree<T>) => {
        accum[childKey] = childTree.fold_(pathChild(pathSoFar, childKey), fn);
      }
    );
    return fn(pathSoFar, this.value, accum);
  }

  /**
   * Find the first matching value on the given path. Return the result of applying f to it.
   */
  findOnPath<V>(path: Path, f: (path: Path, value: T) => V | null): V | null {
    return this.findOnPath_(path, newEmptyPath(), f);
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
      if (pathIsEmpty(pathToFollow)) {
        return null;
      } else {
        const front = pathGetFront(pathToFollow)!;
        const nextChild = this.children.get(front);
        if (nextChild) {
          return nextChild.findOnPath_(
            pathPopFront(pathToFollow),
            pathChild(pathSoFar, front),
            f
          );
        } else {
          return null;
        }
      }
    }
  }

  foreachOnPath(
    path: Path,
    f: (path: Path, value: T) => void
  ): ImmutableTree<T> {
    return this.foreachOnPath_(path, newEmptyPath(), f);
  }

  private foreachOnPath_(
    pathToFollow: Path,
    currentRelativePath: Path,
    f: (path: Path, value: T) => void
  ): ImmutableTree<T> {
    if (pathIsEmpty(pathToFollow)) {
      return this;
    } else {
      if (this.value) {
        f(currentRelativePath, this.value);
      }
      const front = pathGetFront(pathToFollow);
      const nextChild = this.children.get(front);
      if (nextChild) {
        return nextChild.foreachOnPath_(
          pathPopFront(pathToFollow),
          pathChild(currentRelativePath, front),
          f
        );
      } else {
        return new ImmutableTree<T>(null);
      }
    }
  }

  /**
   * Calls the given function for each node in the tree that has a value.
   *
   * @param f - A function to be called with the path from the root of the tree to
   * a node, and the value at that node. Called in depth-first order.
   */
  foreach(f: (path: Path, value: T) => void) {
    this.foreach_(newEmptyPath(), f);
  }

  private foreach_(
    currentRelativePath: Path,
    f: (path: Path, value: T) => void
  ) {
    this.children.inorderTraversal((childName, childTree) => {
      childTree.foreach_(pathChild(currentRelativePath, childName), f);
    });
    if (this.value) {
      f(currentRelativePath, this.value);
    }
  }

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
