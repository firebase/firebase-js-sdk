import { validateArgCount, validateCallback } from "../../utils/validation";
import { validatePathString } from "../core/util/validation";
import { Path } from "../core/util/Path";
import { exportPropGetter } from "../core/util/util";
import { PriorityIndex } from "../core/snap/IndexFactory";

/**
 * Class representing a firebase data snapshot.  It wraps a SnapshotNode and
 * surfaces the public methods (val, forEach, etc.) we want to expose.
 *
 * @constructor
 * @param {!fb.core.snap.Node} node A SnapshotNode to wrap.
 * @param {!Firebase} ref The ref of the location this snapshot came from.
 * @param {!fb.core.snap.Index} index The iteration order for this snapshot
 */
export const DataSnapshot = function(node, ref, index) {
  /**
   * @private
   * @const
   * @type {!fb.core.snap.Node}
   */
  this.node_ = node;

  /**
   * @private
   * @type {!Firebase}
   * @const
   */
  this.query_ = ref;

  /**
   * @const
   * @type {!fb.core.snap.Index}
   * @private
   */
  this.index_ = index;
};


/**
 * Retrieves the snapshot contents as JSON.  Returns null if the snapshot is
 * empty.
 *
 * @return {*} JSON representation of the DataSnapshot contents, or null if empty.
 */
DataSnapshot.prototype.val = function() {
  validateArgCount('Firebase.DataSnapshot.val', 0, 0, arguments.length);
  return this.node_.val();
};

/**
 * Returns the snapshot contents as JSON, including priorities of node.  Suitable for exporting
 * the entire node contents.
 * @return {*} JSON representation of the DataSnapshot contents, or null if empty.
 */
DataSnapshot.prototype.exportVal = function() {
  validateArgCount('Firebase.DataSnapshot.exportVal', 0, 0, arguments.length);
  return this.node_.val(true);
};

// Do not create public documentation. This is intended to make JSON serialization work but is otherwise unnecessary
// for end-users
DataSnapshot.prototype.toJSON = function() {
  // Optional spacer argument is unnecessary because we're depending on recursion rather than stringifying the content
  validateArgCount('Firebase.DataSnapshot.toJSON', 0, 1, arguments.length);
  return this.exportVal();
};

/**
 * Returns whether the snapshot contains a non-null value.
 *
 * @return {boolean} Whether the snapshot contains a non-null value, or is empty.
 */
DataSnapshot.prototype.exists = function() {
  validateArgCount('Firebase.DataSnapshot.exists', 0, 0, arguments.length);
  return !this.node_.isEmpty();
};

/**
 * Returns a DataSnapshot of the specified child node's contents.
 *
 * @param {!string} childPathString Path to a child.
 * @return {!DataSnapshot} DataSnapshot for child node.
 */
DataSnapshot.prototype.child = function(childPathString) {
  validateArgCount('Firebase.DataSnapshot.child', 0, 1, arguments.length);
  // Ensure the childPath is a string (can be a number)
  childPathString = String(childPathString);
  validatePathString('Firebase.DataSnapshot.child', 1, childPathString, false);

  var childPath = new Path(childPathString);
  var childRef = this.query_.child(childPath);
  return new DataSnapshot(this.node_.getChild(childPath), childRef, PriorityIndex);
};

/**
 * Returns whether the snapshot contains a child at the specified path.
 *
 * @param {!string} childPathString Path to a child.
 * @return {boolean} Whether the child exists.
 */
DataSnapshot.prototype.hasChild = function(childPathString) {
  validateArgCount('Firebase.DataSnapshot.hasChild', 1, 1, arguments.length);
  validatePathString('Firebase.DataSnapshot.hasChild', 1, childPathString, false);

  var childPath = new Path(childPathString);
  return !this.node_.getChild(childPath).isEmpty();
};

/**
 * Returns the priority of the object, or null if no priority was set.
 *
 * @return {string|number|null} The priority.
 */
DataSnapshot.prototype.getPriority = function() {
  validateArgCount('Firebase.DataSnapshot.getPriority', 0, 0, arguments.length);

  // typecast here because we never return deferred values or internal priorities (MAX_PRIORITY)
  return /**@type {string|number|null} */ (this.node_.getPriority().val());
};

/**
 * Iterates through child nodes and calls the specified action for each one.
 *
 * @param {function(!DataSnapshot)} action Callback function to be called
 * for each child.
 * @return {boolean} True if forEach was canceled by action returning true for
 * one of the child nodes.
 */
DataSnapshot.prototype.forEach = function(action) {
  validateArgCount('Firebase.DataSnapshot.forEach', 1, 1, arguments.length);
  validateCallback('Firebase.DataSnapshot.forEach', 1, action, false);

  if (this.node_.isLeafNode())
    return false;

  var childrenNode = /** @type {!fb.core.snap.ChildrenNode} */ (this.node_);
  var self = this;
  // Sanitize the return value to a boolean. ChildrenNode.forEachChild has a weird return type...
  return !!childrenNode.forEachChild(this.index_, function(key, node) {
    return action(new DataSnapshot(node, self.query_.child(key), PriorityIndex));
  });
};

/**
 * Returns whether this DataSnapshot has children.
 * @return {boolean} True if the DataSnapshot contains 1 or more child nodes.
 */
DataSnapshot.prototype.hasChildren = function() {
  validateArgCount('Firebase.DataSnapshot.hasChildren', 0, 0, arguments.length);

  if (this.node_.isLeafNode())
    return false;
  else
    return !this.node_.isEmpty();
};

/**
 * @return {?string} The key of the location this snapshot's data came from.
 */
DataSnapshot.prototype.getKey = function() {
  validateArgCount('Firebase.DataSnapshot.key', 0, 0, arguments.length);

  return this.query_.getKey();
};
exportPropGetter(DataSnapshot.prototype, 'key', DataSnapshot.prototype.getKey);


/**
 * Returns the number of children for this DataSnapshot.
 * @return {number} The number of children that this DataSnapshot contains.
 */
DataSnapshot.prototype.numChildren = function() {
  validateArgCount('Firebase.DataSnapshot.numChildren', 0, 0, arguments.length);

  return this.node_.numChildren();
};

/**
 * @return {Firebase} The Firebase reference for the location this snapshot's data came from.
 */
DataSnapshot.prototype.getRef = function() {
  validateArgCount('Firebase.DataSnapshot.ref', 0, 0, arguments.length);

  return this.query_;
};
exportPropGetter(DataSnapshot.prototype, 'ref', DataSnapshot.prototype.getRef);
