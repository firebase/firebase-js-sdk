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
goog.provide('fb.core.view.CacheNode');

/**
 * A cache node only stores complete children. Additionally it holds a flag whether the node can be considered fully
 * initialized in the sense that we know at one point in time this represented a valid state of the world, e.g.
 * initialized with data from the server, or a complete overwrite by the client. The filtered flag also tracks
 * whether a node potentially had children removed due to a filter.
 *
 * @param {!fb.core.snap.Node} node
 * @param {boolean} fullyInitialized
 * @param {boolean} filtered
 * @constructor
 */
fb.core.view.CacheNode = function(node, fullyInitialized, filtered) {
  /**
   * @type {!fb.core.snap.Node}
   * @private
   */
  this.node_ = node;

  /**
   * @type {boolean}
   * @private
   */
  this.fullyInitialized_ = fullyInitialized;

  /**
   * @type {boolean}
   * @private
   */
  this.filtered_ = filtered;
};

/**
 * Returns whether this node was fully initialized with either server data or a complete overwrite by the client
 * @return {boolean}
 */
fb.core.view.CacheNode.prototype.isFullyInitialized = function() {
  return this.fullyInitialized_;
};

/**
 * Returns whether this node is potentially missing children due to a filter applied to the node
 * @return {boolean}
 */
fb.core.view.CacheNode.prototype.isFiltered = function() {
  return this.filtered_;
};

/**
 * @param {!fb.core.util.Path} path
 * @return {boolean}
 */
fb.core.view.CacheNode.prototype.isCompleteForPath = function(path) {
  if (path.isEmpty()) {
    return this.isFullyInitialized() && !this.filtered_;
  } else {
    var childKey = path.getFront();
    return this.isCompleteForChild(childKey);
  }
};

/**
 * @param {!string} key
 * @return {boolean}
 */
fb.core.view.CacheNode.prototype.isCompleteForChild = function(key) {
  return (this.isFullyInitialized() && !this.filtered_) || this.node_.hasChild(key);
};

/**
 * @return {!fb.core.snap.Node}
 */
fb.core.view.CacheNode.prototype.getNode = function() {
  return this.node_;
};
