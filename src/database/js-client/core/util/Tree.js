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
goog.provide('fb.core.util.Tree');

goog.require('fb.core.util');
goog.require('fb.core.util.Path');
goog.require('fb.util.obj');
goog.require('goog.object');


/**
 * Node in a Tree.
 */
fb.core.util.TreeNode = goog.defineClass(null, {
  constructor: function() {
    // TODO: Consider making accessors that create children and value lazily or
    // separate Internal / Leaf 'types'.
    this.children = { };
    this.childCount = 0;
    this.value = null;
  }
}); // end fb.core.util.TreeNode


/**
 * A light-weight tree, traversable by path.  Nodes can have both values and children.
 * Nodes are not enumerated (by forEachChild) unless they have a value or non-empty
 * children.
 */
fb.core.util.Tree = goog.defineClass(null, {
  /**
   * @template T
   * @param {string=} opt_name Optional name of the node.
   * @param {fb.core.util.Tree=} opt_parent Optional parent node.
   * @param {fb.core.util.TreeNode=} opt_node Optional node to wrap.
   */
  constructor: function(opt_name, opt_parent, opt_node) {
    this.name_ = opt_name ? opt_name : '';
    this.parent_ = opt_parent ? opt_parent : null;
    this.node_ = opt_node ? opt_node : new fb.core.util.TreeNode();
  },

  /**
   * Returns a sub-Tree for the given path.
   *
   * @param {!(string|fb.core.util.Path)} pathObj Path to look up.
   * @return {!fb.core.util.Tree.<T>} Tree for path.
   */
  subTree: function(pathObj) {
    // TODO: Require pathObj to be Path?
    var path = (pathObj instanceof fb.core.util.Path) ?
        pathObj : new fb.core.util.Path(pathObj);
    var child = this, next;
    while ((next = path.getFront()) !== null) {
      var childNode = fb.util.obj.get(child.node_.children, next) || new fb.core.util.TreeNode();
      child = new fb.core.util.Tree(next, child, childNode);
      path = path.popFront();
    }

    return child;
  },

  /**
   * Returns the data associated with this tree node.
   *
   * @return {?T} The data or null if no data exists.
   */
  getValue: function() {
    return this.node_.value;
  },

  /**
   * Sets data to this tree node.
   *
   * @param {!T} value Value to set.
   */
  setValue: function(value) {
    fb.core.util.assert(typeof value !== 'undefined', 'Cannot set value to undefined');
    this.node_.value = value;
    this.updateParents_();
  },

  /**
   * Clears the contents of the tree node (its value and all children).
   */
  clear: function() {
    this.node_.value = null;
    this.node_.children = { };
    this.node_.childCount = 0;
    this.updateParents_();
  },

  /**
   * @return {boolean} Whether the tree has any children.
   */
  hasChildren: function() {
    return this.node_.childCount > 0;
  },

  /**
   * @return {boolean} Whether the tree is empty (no value or children).
   */
  isEmpty: function() {
    return this.getValue() === null && !this.hasChildren();
  },

  /**
   * Calls action for each child of this tree node.
   *
   * @param {function(!fb.core.util.Tree.<T>)} action Action to be called for each child.
   */
  forEachChild: function(action) {
    var self = this;
    goog.object.forEach(this.node_.children, function(childTree, child) {
      action(new fb.core.util.Tree(child, self, childTree));
    });
  },

  /**
   * Does a depth-first traversal of this node's descendants, calling action for each one.
   *
   * @param {function(!fb.core.util.Tree.<T>)} action Action to be called for each child.
   * @param {boolean=} opt_includeSelf Whether to call action on this node as well. Defaults to
   *   false.
   * @param {boolean=} opt_childrenFirst Whether to call action on children before calling it on
   *   parent.
   */
  forEachDescendant: function(action, opt_includeSelf, opt_childrenFirst) {
    if (opt_includeSelf && !opt_childrenFirst)
      action(this);

    this.forEachChild(function(child) {
      child.forEachDescendant(action, /*opt_includeSelf=*/true, opt_childrenFirst);
    });

    if (opt_includeSelf && opt_childrenFirst)
      action(this);
  },

  /**
   * Calls action on each ancestor node.
   *
   * @param {function(!fb.core.util.Tree.<T>)} action Action to be called on each parent; return
   *   true to abort.
   * @param {boolean=} opt_includeSelf Whether to call action on this node as well.
   * @return {boolean} true if the action callback returned true.
   */
  forEachAncestor: function(action, opt_includeSelf) {
    var node = opt_includeSelf ? this : this.parent();
    while (node !== null) {
      if (action(node)) {
        return true;
      }
      node = node.parent();
    }
    return false;
  },

  /**
   * Does a depth-first traversal of this node's descendants.  When a descendant with a value
   * is found, action is called on it and traversal does not continue inside the node.
   * Action is *not* called on this node.
   *
   * @param {function(!fb.core.util.Tree.<T>)} action Action to be called for each child.
   */
  forEachImmediateDescendantWithValue: function(action) {
    this.forEachChild(function(child) {
      if (child.getValue() !== null)
        action(child);
      else
        child.forEachImmediateDescendantWithValue(action);
    });
  },

  /**
   * @return {!fb.core.util.Path} The path of this tree node, as a Path.
   */
  path: function() {
    return new fb.core.util.Path(this.parent_ === null ?
        this.name_ : this.parent_.path() + '/' + this.name_);
  },

  /**
   * @return {string} The name of the tree node.
   */
  name: function() {
    return this.name_;
  },

  /**
   * @return {?fb.core.util.Tree} The parent tree node, or null if this is the root of the tree.
   */
  parent: function() {
    return this.parent_;
  },

  /**
   * Adds or removes this child from its parent based on whether it's empty or not.
   *
   * @private
   */
  updateParents_: function() {
    if (this.parent_ !== null)
      this.parent_.updateChild_(this.name_, this);
  },

  /**
   * Adds or removes the passed child to this tree node, depending on whether it's empty.
   *
   * @param {string} childName The name of the child to update.
   * @param {!fb.core.util.Tree.<T>} child The child to update.
   * @private
   */
  updateChild_: function(childName, child) {
    var childEmpty = child.isEmpty();
    var childExists = fb.util.obj.contains(this.node_.children, childName);
    if (childEmpty && childExists) {
      delete (this.node_.children[childName]);
      this.node_.childCount--;
      this.updateParents_();
    }
    else if (!childEmpty && !childExists) {
      this.node_.children[childName] = child.node_;
      this.node_.childCount++;
      this.updateParents_();
    }
  }
}); // end fb.core.util.Tree
