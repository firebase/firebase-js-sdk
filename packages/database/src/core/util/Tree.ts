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

import { contains, safeGet } from '@firebase/util';

import { Path, pathGetFront, pathPopFront } from './Path';
import { each } from './util';

/**
 * Node in a Tree.
 */
export interface TreeNode<T> {
  // TODO: Consider making accessors that create children and value lazily or
  // separate Internal / Leaf 'types'.
  children: Record<string, TreeNode<T>>;
  childCount: number;
  value?: T;
}

/**
 * A light-weight tree, traversable by path.  Nodes can have both values and children.
 * Nodes are not enumerated (by forEachChild) unless they have a value or non-empty
 * children.
 */
export class Tree<T> {
  /**
   * @param name - Optional name of the node.
   * @param parent - Optional parent node.
   * @param node - Optional node to wrap.
   */
  constructor(
    readonly name: string = '',
    readonly parent: Tree<T> | null = null,
    public node: TreeNode<T> = { children: {}, childCount: 0 }
  ) {}
}

/**
 * Returns a sub-Tree for the given path.
 *
 * @param pathObj - Path to look up.
 * @returns Tree for path.
 */
export function treeSubTree<T>(tree: Tree<T>, pathObj: string | Path): Tree<T> {
  // TODO: Require pathObj to be Path?
  let path = pathObj instanceof Path ? pathObj : new Path(pathObj);
  let child = tree,
    next = pathGetFront(path);
  while (next !== null) {
    const childNode = safeGet(child.node.children, next) || {
      children: {},
      childCount: 0
    };
    child = new Tree<T>(next, child, childNode);
    path = pathPopFront(path);
    next = pathGetFront(path);
  }

  return child;
}

/**
 * Returns the data associated with this tree node.
 *
 * @returns The data or null if no data exists.
 */
export function treeGetValue<T>(tree: Tree<T>): T | undefined {
  return tree.node.value;
}

/**
 * Sets data to this tree node.
 *
 * @param value - Value to set.
 */
export function treeSetValue<T>(tree: Tree<T>, value: T | undefined): void {
  tree.node.value = value;
  treeUpdateParents(tree);
}

/**
 * @returns Whether the tree has any children.
 */
export function treeHasChildren<T>(tree: Tree<T>): boolean {
  return tree.node.childCount > 0;
}

/**
 * @returns Whethe rthe tree is empty (no value or children).
 */
export function treeIsEmpty<T>(tree: Tree<T>): boolean {
  return treeGetValue(tree) === undefined && !treeHasChildren(tree);
}

/**
 * Calls action for each child of this tree node.
 *
 * @param action - Action to be called for each child.
 */
export function treeForEachChild<T>(
  tree: Tree<T>,
  action: (tree: Tree<T>) => void
): void {
  each(tree.node.children, (child: string, childTree: TreeNode<T>) => {
    action(new Tree<T>(child, tree, childTree));
  });
}

/**
 * Does a depth-first traversal of this node's descendants, calling action for each one.
 *
 * @param action - Action to be called for each child.
 * @param includeSelf - Whether to call action on this node as well. Defaults to
 *   false.
 * @param childrenFirst - Whether to call action on children before calling it on
 *   parent.
 */
export function treeForEachDescendant<T>(
  tree: Tree<T>,
  action: (tree: Tree<T>) => void,
  includeSelf?: boolean,
  childrenFirst?: boolean
): void {
  if (includeSelf && !childrenFirst) {
    action(tree);
  }

  treeForEachChild(tree, child => {
    treeForEachDescendant(child, action, true, childrenFirst);
  });

  if (includeSelf && childrenFirst) {
    action(tree);
  }
}

/**
 * Calls action on each ancestor node.
 *
 * @param action - Action to be called on each parent; return
 *   true to abort.
 * @param includeSelf - Whether to call action on this node as well.
 * @returns true if the action callback returned true.
 */
export function treeForEachAncestor<T>(
  tree: Tree<T>,
  action: (tree: Tree<T>) => unknown,
  includeSelf?: boolean
): boolean {
  let node = includeSelf ? tree : tree.parent;
  while (node !== null) {
    if (action(node)) {
      return true;
    }
    node = node.parent;
  }
  return false;
}

/**
 * Does a depth-first traversal of this node's descendants.  When a descendant with a value
 * is found, action is called on it and traversal does not continue inside the node.
 * Action is *not* called on this node.
 *
 * @param action - Action to be called for each child.
 */
export function treeForEachImmediateDescendantWithValue<T>(
  tree: Tree<T>,
  action: (tree: Tree<T>) => void
): void {
  treeForEachChild(tree, child => {
    if (treeGetValue(child) !== undefined) {
      action(child);
    } else {
      treeForEachImmediateDescendantWithValue(child, action);
    }
  });
}

/**
 * @returns The path of this tree node, as a Path.
 */
export function treeGetPath<T>(tree: Tree<T>) {
  return new Path(
    tree.parent === null
      ? tree.name
      : treeGetPath(tree.parent) + '/' + tree.name
  );
}

/**
 * Adds or removes this child from its parent based on whether it's empty or not.
 */
function treeUpdateParents<T>(tree: Tree<T>) {
  if (tree.parent !== null) {
    treeUpdateChild(tree.parent, tree.name, tree);
  }
}

/**
 * Adds or removes the passed child to this tree node, depending on whether it's empty.
 *
 * @param childName - The name of the child to update.
 * @param child - The child to update.
 */
function treeUpdateChild<T>(tree: Tree<T>, childName: string, child: Tree<T>) {
  const childEmpty = treeIsEmpty(child);
  const childExists = contains(tree.node.children, childName);
  if (childEmpty && childExists) {
    delete tree.node.children[childName];
    tree.node.childCount--;
    treeUpdateParents(tree);
  } else if (!childEmpty && !childExists) {
    tree.node.children[childName] = child.node;
    tree.node.childCount++;
    treeUpdateParents(tree);
  }
}
