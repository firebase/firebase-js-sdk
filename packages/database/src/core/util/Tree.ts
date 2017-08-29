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

import { assert } from '@firebase/util';
import { Path } from './Path';
import { forEach, contains, safeGet } from '@firebase/util';

/**
 * Node in a Tree.
 */
export class TreeNode<T> {
  // TODO: Consider making accessors that create children and value lazily or
  // separate Internal / Leaf 'types'.
  children: { [name: string]: TreeNode<T> } = {};
  childCount = 0;
  value: T | null = null;
}

/**
 * A light-weight tree, traversable by path.  Nodes can have both values and children.
 * Nodes are not enumerated (by forEachChild) unless they have a value or non-empty
 * children.
 */
export class Tree<T> {
  /**
   * @template T
   * @param {string=} name_ Optional name of the node.
   * @param {Tree=} parent_ Optional parent node.
   * @param {TreeNode=} node_ Optional node to wrap.
   */
  constructor(
    private name_: string = '',
    private parent_: Tree<T> | null = null,
    private node_: TreeNode<T> = new TreeNode<T>()
  ) {}

  /**
   * Returns a sub-Tree for the given path.
   *
   * @param {!(string|Path)} pathObj Path to look up.
   * @return {!Tree.<T>} Tree for path.
   */
  subTree(pathObj: string | Path): Tree<T> {
    // TODO: Require pathObj to be Path?
    let path = pathObj instanceof Path ? pathObj : new Path(pathObj);
    let child = this as any,
      next;
    while ((next = path.getFront()) !== null) {
      const childNode = safeGet(child.node_.children, next) || new TreeNode();
      child = new Tree(next, child, childNode);
      path = path.popFront();
    }

    return child;
  }

  /**
   * Returns the data associated with this tree node.
   *
   * @return {?T} The data or null if no data exists.
   */
  getValue(): T | null {
    return this.node_.value;
  }

  /**
   * Sets data to this tree node.
   *
   * @param {!T} value Value to set.
   */
  setValue(value: T) {
    assert(typeof value !== 'undefined', 'Cannot set value to undefined');
    this.node_.value = value;
    this.updateParents_();
  }

  /**
   * Clears the contents of the tree node (its value and all children).
   */
  clear() {
    this.node_.value = null;
    this.node_.children = {};
    this.node_.childCount = 0;
    this.updateParents_();
  }

  /**
   * @return {boolean} Whether the tree has any children.
   */
  hasChildren(): boolean {
    return this.node_.childCount > 0;
  }

  /**
   * @return {boolean} Whether the tree is empty (no value or children).
   */
  isEmpty(): boolean {
    return this.getValue() === null && !this.hasChildren();
  }

  /**
   * Calls action for each child of this tree node.
   *
   * @param {function(!Tree.<T>)} action Action to be called for each child.
   */
  forEachChild(action: (tree: Tree<T>) => void) {
    forEach(this.node_.children, (child: string, childTree: TreeNode<T>) => {
      action(new Tree<T>(child, this, childTree));
    });
  }

  /**
   * Does a depth-first traversal of this node's descendants, calling action for each one.
   *
   * @param {function(!Tree.<T>)} action Action to be called for each child.
   * @param {boolean=} includeSelf Whether to call action on this node as well. Defaults to
   *   false.
   * @param {boolean=} childrenFirst Whether to call action on children before calling it on
   *   parent.
   */
  forEachDescendant(
    action: (tree: Tree<T>) => void,
    includeSelf?: boolean,
    childrenFirst?: boolean
  ) {
    if (includeSelf && !childrenFirst) action(this);

    this.forEachChild(function(child) {
      child.forEachDescendant(action, /*includeSelf=*/ true, childrenFirst);
    });

    if (includeSelf && childrenFirst) action(this);
  }

  /**
   * Calls action on each ancestor node.
   *
   * @param {function(!Tree.<T>)} action Action to be called on each parent; return
   *   true to abort.
   * @param {boolean=} includeSelf Whether to call action on this node as well.
   * @return {boolean} true if the action callback returned true.
   */
  forEachAncestor(
    action: (tree: Tree<T>) => void,
    includeSelf?: boolean
  ): boolean {
    let node = includeSelf ? this : this.parent();
    while (node !== null) {
      if (action(node)) {
        return true;
      }
      node = node.parent();
    }
    return false;
  }

  /**
   * Does a depth-first traversal of this node's descendants.  When a descendant with a value
   * is found, action is called on it and traversal does not continue inside the node.
   * Action is *not* called on this node.
   *
   * @param {function(!Tree.<T>)} action Action to be called for each child.
   */
  forEachImmediateDescendantWithValue(action: (tree: Tree<T>) => void) {
    this.forEachChild(function(child) {
      if (child.getValue() !== null) action(child);
      else child.forEachImmediateDescendantWithValue(action);
    });
  }

  /**
   * @return {!Path} The path of this tree node, as a Path.
   */
  path(): Path {
    return new Path(
      this.parent_ === null
        ? this.name_
        : this.parent_.path() + '/' + this.name_
    );
  }

  /**
   * @return {string} The name of the tree node.
   */
  name(): string {
    return this.name_;
  }

  /**
   * @return {?Tree} The parent tree node, or null if this is the root of the tree.
   */
  parent(): Tree<T> | null {
    return this.parent_;
  }

  /**
   * Adds or removes this child from its parent based on whether it's empty or not.
   *
   * @private
   */
  private updateParents_() {
    if (this.parent_ !== null) this.parent_.updateChild_(this.name_, this);
  }

  /**
   * Adds or removes the passed child to this tree node, depending on whether it's empty.
   *
   * @param {string} childName The name of the child to update.
   * @param {!Tree.<T>} child The child to update.
   * @private
   */
  private updateChild_(childName: string, child: Tree<T>) {
    const childEmpty = child.isEmpty();
    const childExists = contains(this.node_.children, childName);
    if (childEmpty && childExists) {
      delete this.node_.children[childName];
      this.node_.childCount--;
      this.updateParents_();
    } else if (!childEmpty && !childExists) {
      this.node_.children[childName] = child.node_;
      this.node_.childCount++;
      this.updateParents_();
    }
  }
}
