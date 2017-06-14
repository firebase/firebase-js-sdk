import { assert } from "../../../utils/assert";
import { Path } from "./Path";
import { forEach, contains } from '../../../utils/obj'

/**
 * Node in a Tree.
 */
export class TreeNode {
  children;
  childCount;
  value;

  constructor() {
    // TODO: Consider making accessors that create children and value lazily or
    // separate Internal / Leaf 'types'.
    this.children = { };
    this.childCount = 0;
    this.value = null;
  }
}; // end TreeNode


/**
 * A light-weight tree, traversable by path.  Nodes can have both values and children.
 * Nodes are not enumerated (by forEachChild) unless they have a value or non-empty
 * children.
 */
export class Tree {
  name_;
  parent_;
  node_;

  /**
   * @template T
   * @param {string=} opt_name Optional name of the node.
   * @param {Tree=} opt_parent Optional parent node.
   * @param {TreeNode=} opt_node Optional node to wrap.
   */
  constructor(opt_name?, opt_parent?, opt_node?) {
    this.name_ = opt_name ? opt_name : '';
    this.parent_ = opt_parent ? opt_parent : null;
    this.node_ = opt_node ? opt_node : new TreeNode();
  }

  /**
   * Returns a sub-Tree for the given path.
   *
   * @param {!(string|Path)} pathObj Path to look up.
   * @return {!Tree.<T>} Tree for path.
   */
  subTree(pathObj) {
    // TODO: Require pathObj to be Path?
    var path = (pathObj instanceof Path) ?
        pathObj : new Path(pathObj);
    var child = <any>this, next;
    while ((next = path.getFront()) !== null) {
      var childNode = child.node_.children[next] || new TreeNode();
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
  getValue() {
    return this.node_.value;
  }

  /**
   * Sets data to this tree node.
   *
   * @param {!T} value Value to set.
   */
  setValue(value) {
    assert(typeof value !== 'undefined', 'Cannot set value to undefined');
    this.node_.value = value;
    this.updateParents_();
  }

  /**
   * Clears the contents of the tree node (its value and all children).
   */
  clear() {
    this.node_.value = null;
    this.node_.children = { };
    this.node_.childCount = 0;
    this.updateParents_();
  }

  /**
   * @return {boolean} Whether the tree has any children.
   */
  hasChildren() {
    return this.node_.childCount > 0;
  }

  /**
   * @return {boolean} Whether the tree is empty (no value or children).
   */
  isEmpty() {
    return this.getValue() === null && !this.hasChildren();
  }

  /**
   * Calls action for each child of this tree node.
   *
   * @param {function(!Tree.<T>)} action Action to be called for each child.
   */
  forEachChild(action) {
    var self = this;
    forEach(this.node_.children, function(child, childTree) {
      action(new Tree(child, self, childTree));
    });
  }

  /**
   * Does a depth-first traversal of this node's descendants, calling action for each one.
   *
   * @param {function(!Tree.<T>)} action Action to be called for each child.
   * @param {boolean=} opt_includeSelf Whether to call action on this node as well. Defaults to
   *   false.
   * @param {boolean=} opt_childrenFirst Whether to call action on children before calling it on
   *   parent.
   */
  forEachDescendant(action, opt_includeSelf, opt_childrenFirst) {
    if (opt_includeSelf && !opt_childrenFirst)
      action(this);

    this.forEachChild(function(child) {
      child.forEachDescendant(action, /*opt_includeSelf=*/true, opt_childrenFirst);
    });

    if (opt_includeSelf && opt_childrenFirst)
      action(this);
  }

  /**
   * Calls action on each ancestor node.
   *
   * @param {function(!Tree.<T>)} action Action to be called on each parent; return
   *   true to abort.
   * @param {boolean=} opt_includeSelf Whether to call action on this node as well.
   * @return {boolean} true if the action callback returned true.
   */
  forEachAncestor(action, opt_includeSelf) {
    var node = opt_includeSelf ? this : this.parent();
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
  forEachImmediateDescendantWithValue(action) {
    this.forEachChild(function(child) {
      if (child.getValue() !== null)
        action(child);
      else
        child.forEachImmediateDescendantWithValue(action);
    });
  }

  /**
   * @return {!Path} The path of this tree node, as a Path.
   */
  path() {
    return new Path(this.parent_ === null ?
        this.name_ : this.parent_.path() + '/' + this.name_);
  }

  /**
   * @return {string} The name of the tree node.
   */
  name() {
    return this.name_;
  }

  /**
   * @return {?Tree} The parent tree node, or null if this is the root of the tree.
   */
  parent() {
    return this.parent_;
  }

  /**
   * Adds or removes this child from its parent based on whether it's empty or not.
   *
   * @private
   */
  updateParents_() {
    if (this.parent_ !== null)
      this.parent_.updateChild_(this.name_, this);
  }

  /**
   * Adds or removes the passed child to this tree node, depending on whether it's empty.
   *
   * @param {string} childName The name of the child to update.
   * @param {!Tree.<T>} child The child to update.
   * @private
   */
  updateChild_(childName, child) {
    var childEmpty = child.isEmpty();
    var childExists = contains(this.node_.children, childName);
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
}; // end Tree
