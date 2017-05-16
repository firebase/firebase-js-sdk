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
goog.provide('fb.core.SnapshotHolder');


/**
 * Mutable object which basically just stores a reference to the "latest" immutable snapshot.
 *
 * @constructor
 */
fb.core.SnapshotHolder = function() {
  /** @private */
  this.rootNode_ = fb.core.snap.EMPTY_NODE;
};

/**
 * @param {!fb.core.util.Path} path
 * @return {!fb.core.snap.Node}
 */
fb.core.SnapshotHolder.prototype.getNode = function(path) {
  return this.rootNode_.getChild(path);
};

/**
 * @param {!fb.core.util.Path} path
 * @param {!fb.core.snap.Node} newSnapshotNode
 */
fb.core.SnapshotHolder.prototype.updateSnapshot = function(path, newSnapshotNode) {
  this.rootNode_ = this.rootNode_.updateChild(path, newSnapshotNode);
};

if (goog.DEBUG) {
  /**
   * @return {!string}
   */
  fb.core.SnapshotHolder.prototype.toString = function() {
    return this.rootNode_.toString();
  };
}
