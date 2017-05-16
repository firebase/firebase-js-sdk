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
goog.provide('fb.core.view.ChildChangeAccumulator');
goog.require('fb.core.util');
goog.require('fb.core.view.Change');
goog.require('fb.util.obj');
goog.require('goog.object');



/**
 * @constructor
 */
fb.core.view.ChildChangeAccumulator = function() {
  /**
   * @type {!Object.<string, !fb.core.view.Change>}
   * @private
   */
  this.changeMap_ = { };
};


/**
 * @param {!fb.core.view.Change} change
 */
fb.core.view.ChildChangeAccumulator.prototype.trackChildChange = function(change) {
  var Change = fb.core.view.Change;
  var type = change.type;
  var childKey = /** @type {!string} */ (change.childName);
  fb.core.util.assert(type == fb.core.view.Change.CHILD_ADDED ||
      type == fb.core.view.Change.CHILD_CHANGED ||
      type == fb.core.view.Change.CHILD_REMOVED, 'Only child changes supported for tracking');
  fb.core.util.assert(childKey !== '.priority', 'Only non-priority child changes can be tracked.');
  var oldChange = fb.util.obj.get(this.changeMap_, childKey);
  if (oldChange) {
    var oldType = oldChange.type;
    if (type == Change.CHILD_ADDED && oldType == Change.CHILD_REMOVED) {
      this.changeMap_[childKey] = Change.childChangedChange(childKey, change.snapshotNode, oldChange.snapshotNode);
    } else if (type == Change.CHILD_REMOVED && oldType == Change.CHILD_ADDED) {
      delete this.changeMap_[childKey];
    } else if (type == Change.CHILD_REMOVED && oldType == Change.CHILD_CHANGED) {
      this.changeMap_[childKey] = Change.childRemovedChange(childKey,
          /** @type {!fb.core.snap.Node} */ (oldChange.oldSnap));
    } else if (type == Change.CHILD_CHANGED && oldType == Change.CHILD_ADDED) {
      this.changeMap_[childKey] = Change.childAddedChange(childKey, change.snapshotNode);
    } else if (type == Change.CHILD_CHANGED && oldType == Change.CHILD_CHANGED) {
      this.changeMap_[childKey] = Change.childChangedChange(childKey, change.snapshotNode,
          /** @type {!fb.core.snap.Node} */ (oldChange.oldSnap));
    } else {
      throw fb.core.util.assertionError('Illegal combination of changes: ' + change + ' occurred after ' + oldChange);
    }
  } else {
    this.changeMap_[childKey] = change;
  }
};


/**
 * @return {!Array.<!fb.core.view.Change>}
 */
fb.core.view.ChildChangeAccumulator.prototype.getChanges = function() {
  return goog.object.getValues(this.changeMap_);
};
