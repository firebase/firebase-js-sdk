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
goog.provide('fb.core.view.Change');
goog.provide('fb.core.view.Change.CHILD_ADDED');
goog.provide('fb.core.view.Change.CHILD_CHANGED');
goog.provide('fb.core.view.Change.CHILD_MOVED');
goog.provide('fb.core.view.Change.CHILD_REMOVED');
goog.provide('fb.core.view.Change.VALUE');



/**
 * @constructor
 * @struct
 * @param {!string} type The event type
 * @param {!fb.core.snap.Node} snapshotNode The data
 * @param {string=} opt_childName The name for this child, if it's a child event
 * @param {fb.core.snap.Node=} opt_oldSnap Used for intermediate processing of child changed events
 * @param {string=} opt_prevName The name for the previous child, if applicable
 */
fb.core.view.Change = function(type, snapshotNode, opt_childName, opt_oldSnap, opt_prevName) {
  this.type = type;
  this.snapshotNode = snapshotNode;
  this.childName = opt_childName;
  this.oldSnap = opt_oldSnap;
  this.prevName = opt_prevName;
};


/**
 * @param {!fb.core.snap.Node} snapshot
 * @return {!fb.core.view.Change}
 */
fb.core.view.Change.valueChange = function(snapshot) {
  return new fb.core.view.Change(fb.core.view.Change.VALUE, snapshot);
};


/**
 * @param {string} childKey
 * @param {!fb.core.snap.Node} snapshot
 * @return {!fb.core.view.Change}
 */
fb.core.view.Change.childAddedChange = function(childKey, snapshot) {
  return new fb.core.view.Change(fb.core.view.Change.CHILD_ADDED, snapshot, childKey);
};


/**
 * @param {string} childKey
 * @param {!fb.core.snap.Node} snapshot
 * @return {!fb.core.view.Change}
 */
fb.core.view.Change.childRemovedChange = function(childKey, snapshot) {
  return new fb.core.view.Change(fb.core.view.Change.CHILD_REMOVED, snapshot, childKey);
};


/**
 * @param {string} childKey
 * @param {!fb.core.snap.Node} newSnapshot
 * @param {!fb.core.snap.Node} oldSnapshot
 * @return {!fb.core.view.Change}
 */
fb.core.view.Change.childChangedChange = function(childKey, newSnapshot, oldSnapshot) {
  return new fb.core.view.Change(fb.core.view.Change.CHILD_CHANGED, newSnapshot, childKey, oldSnapshot);
};


/**
 * @param {string} childKey
 * @param {!fb.core.snap.Node} snapshot
 * @return {!fb.core.view.Change}
 */
fb.core.view.Change.childMovedChange = function(childKey, snapshot) {
  return new fb.core.view.Change(fb.core.view.Change.CHILD_MOVED, snapshot, childKey);
};


/**
 * @param {string} prevName
 * @return {!fb.core.view.Change}
 */
fb.core.view.Change.prototype.changeWithPrevName = function(prevName) {
  return new fb.core.view.Change(this.type, this.snapshotNode, this.childName, this.oldSnap, prevName);
};


//event types
/** Event type for a child added */
fb.core.view.Change.CHILD_ADDED = 'child_added';


/** Event type for a child removed */
fb.core.view.Change.CHILD_REMOVED = 'child_removed';


/** Event type for a child changed */
fb.core.view.Change.CHILD_CHANGED = 'child_changed';


/** Event type for a child moved */
fb.core.view.Change.CHILD_MOVED = 'child_moved';


/** Event type for a value change */
fb.core.view.Change.VALUE = 'value';
