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
goog.provide('fb.api.DataSnapshot');
goog.require('fb.core.snap');
goog.require('fb.core.util.SortedMap');
goog.require('fb.core.util.validation');


/**
 * Class representing a firebase data snapshot.  It wraps a SnapshotNode and
 * surfaces the public methods (val, forEach, etc.) we want to expose.
 *
 * @constructor
 * @param {!fb.core.snap.Node} node A SnapshotNode to wrap.
 * @param {!Firebase} ref The ref of the location this snapshot came from.
 * @param {!fb.core.snap.Index} index The iteration order for this snapshot
 */
fb.api.DataSnapshot = function(node, ref, index) {
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
fb.api.DataSnapshot.prototype.val = function() {
  fb.util.validation.validateArgCount('Firebase.DataSnapshot.val', 0, 0, arguments.length);
  return this.node_.val();
};
goog.exportProperty(fb.api.DataSnapshot.prototype, 'val', fb.api.DataSnapshot.prototype.val);


/**
 * Returns the snapshot contents as JSON, including priorities of node.  Suitable for exporting
 * the entire node contents.
 * @return {*} JSON representation of the DataSnapshot contents, or null if empty.
 */
fb.api.DataSnapshot.prototype.exportVal = function() {
  fb.util.validation.validateArgCount('Firebase.DataSnapshot.exportVal', 0, 0, arguments.length);
  return this.node_.val(true);
};
goog.exportProperty(fb.api.DataSnapshot.prototype, 'exportVal', fb.api.DataSnapshot.prototype.exportVal);


// Do not create public documentation. This is intended to make JSON serialization work but is otherwise unnecessary
// for end-users
fb.api.DataSnapshot.prototype.toJSON = function() {
  // Optional spacer argument is unnecessary because we're depending on recursion rather than stringifying the content
  fb.util.validation.validateArgCount('Firebase.DataSnapshot.toJSON', 0, 1, arguments.length);
  return this.exportVal();
};
goog.exportProperty(fb.api.DataSnapshot.prototype, 'toJSON', fb.api.DataSnapshot.prototype.toJSON);

/**
 * Returns whether the snapshot contains a non-null value.
 *
 * @return {boolean} Whether the snapshot contains a non-null value, or is empty.
 */
fb.api.DataSnapshot.prototype.exists = function() {
  fb.util.validation.validateArgCount('Firebase.DataSnapshot.exists', 0, 0, arguments.length);
  return !this.node_.isEmpty();
};
goog.exportProperty(fb.api.DataSnapshot.prototype, 'exists', fb.api.DataSnapshot.prototype.exists);


/**
 * Returns a DataSnapshot of the specified child node's contents.
 *
 * @param {!string} childPathString Path to a child.
 * @return {!fb.api.DataSnapshot} DataSnapshot for child node.
 */
fb.api.DataSnapshot.prototype.child = function(childPathString) {
  fb.util.validation.validateArgCount('Firebase.DataSnapshot.child', 0, 1, arguments.length);
  if (goog.isNumber(childPathString))
    childPathString = String(childPathString);
  fb.core.util.validation.validatePathString('Firebase.DataSnapshot.child', 1, childPathString, false);

  var childPath = new fb.core.util.Path(childPathString);
  var childRef = this.query_.child(childPath);
  return new fb.api.DataSnapshot(this.node_.getChild(childPath), childRef, fb.core.snap.PriorityIndex);
};
goog.exportProperty(fb.api.DataSnapshot.prototype, 'child', fb.api.DataSnapshot.prototype.child);


/**
 * Returns whether the snapshot contains a child at the specified path.
 *
 * @param {!string} childPathString Path to a child.
 * @return {boolean} Whether the child exists.
 */
fb.api.DataSnapshot.prototype.hasChild = function(childPathString) {
  fb.util.validation.validateArgCount('Firebase.DataSnapshot.hasChild', 1, 1, arguments.length);
  fb.core.util.validation.validatePathString('Firebase.DataSnapshot.hasChild', 1, childPathString, false);

  var childPath = new fb.core.util.Path(childPathString);
  return !this.node_.getChild(childPath).isEmpty();
};
goog.exportProperty(fb.api.DataSnapshot.prototype, 'hasChild', fb.api.DataSnapshot.prototype.hasChild);


/**
 * Returns the priority of the object, or null if no priority was set.
 *
 * @return {string|number|null} The priority.
 */
fb.api.DataSnapshot.prototype.getPriority = function() {
  fb.util.validation.validateArgCount('Firebase.DataSnapshot.getPriority', 0, 0, arguments.length);

  // typecast here because we never return deferred values or internal priorities (MAX_PRIORITY)
  return /**@type {string|number|null} */ (this.node_.getPriority().val());
};
goog.exportProperty(fb.api.DataSnapshot.prototype, 'getPriority', fb.api.DataSnapshot.prototype.getPriority);


/**
 * Iterates through child nodes and calls the specified action for each one.
 *
 * @param {function(!fb.api.DataSnapshot)} action Callback function to be called
 * for each child.
 * @return {boolean} True if forEach was canceled by action returning true for
 * one of the child nodes.
 */
fb.api.DataSnapshot.prototype.forEach = function(action) {
  fb.util.validation.validateArgCount('Firebase.DataSnapshot.forEach', 1, 1, arguments.length);
  fb.util.validation.validateCallback('Firebase.DataSnapshot.forEach', 1, action, false);

  if (this.node_.isLeafNode())
    return false;

  var childrenNode = /** @type {!fb.core.snap.ChildrenNode} */ (this.node_);
  var self = this;
  // Sanitize the return value to a boolean. ChildrenNode.forEachChild has a weird return type...
  return !!childrenNode.forEachChild(this.index_, function(key, node) {
    return action(new fb.api.DataSnapshot(node, self.query_.child(key), fb.core.snap.PriorityIndex));
  });
};
goog.exportProperty(fb.api.DataSnapshot.prototype, 'forEach', fb.api.DataSnapshot.prototype.forEach);


/**
 * Returns whether this DataSnapshot has children.
 * @return {boolean} True if the DataSnapshot contains 1 or more child nodes.
 */
fb.api.DataSnapshot.prototype.hasChildren = function() {
  fb.util.validation.validateArgCount('Firebase.DataSnapshot.hasChildren', 0, 0, arguments.length);

  if (this.node_.isLeafNode())
    return false;
  else
    return !this.node_.isEmpty();
};
goog.exportProperty(fb.api.DataSnapshot.prototype, 'hasChildren', fb.api.DataSnapshot.prototype.hasChildren);


/**
 * @return {?string} The key of the location this snapshot's data came from.
 */
fb.api.DataSnapshot.prototype.getKey = function() {
  fb.util.validation.validateArgCount('Firebase.DataSnapshot.key', 0, 0, arguments.length);

  return this.query_.getKey();
};
fb.core.util.exportPropGetter(fb.api.DataSnapshot.prototype, 'key', fb.api.DataSnapshot.prototype.getKey);


/**
 * Returns the number of children for this DataSnapshot.
 * @return {number} The number of children that this DataSnapshot contains.
 */
fb.api.DataSnapshot.prototype.numChildren = function() {
  fb.util.validation.validateArgCount('Firebase.DataSnapshot.numChildren', 0, 0, arguments.length);

  return this.node_.numChildren();
};
goog.exportProperty(fb.api.DataSnapshot.prototype, 'numChildren', fb.api.DataSnapshot.prototype.numChildren);


/**
 * @return {Firebase} The Firebase reference for the location this snapshot's data came from.
 */
fb.api.DataSnapshot.prototype.getRef = function() {
  fb.util.validation.validateArgCount('Firebase.DataSnapshot.ref', 0, 0, arguments.length);

  return this.query_;
};
fb.core.util.exportPropGetter(fb.api.DataSnapshot.prototype, 'ref', fb.api.DataSnapshot.prototype.getRef);
