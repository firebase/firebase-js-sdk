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
goog.provide('fb.core.view.filter.RangedFilter');
goog.require('fb.core.view.filter.IndexedFilter');

/**
 * Filters nodes by range and uses an IndexFilter to track any changes after filtering the node
 *
 * @constructor
 * @implements {fb.core.view.filter.NodeFilter}
 * @param {!fb.core.view.QueryParams} params
 */
fb.core.view.filter.RangedFilter = function(params) {
  /**
   * @type {!fb.core.view.filter.IndexedFilter}
   * @const
   * @private
   */
  this.indexedFilter_ = new fb.core.view.filter.IndexedFilter(params.getIndex());

  /**
   * @const
   * @type {!fb.core.snap.Index}
   * @private
   */
  this.index_ = params.getIndex();

  /**
   * @const
   * @type {!fb.core.snap.NamedNode}
   * @private
   */
  this.startPost_ = this.getStartPost_(params);

  /**
   * @const
   * @type {!fb.core.snap.NamedNode}
   * @private
   */
  this.endPost_ = this.getEndPost_(params);
};

/**
 * @return {!fb.core.snap.NamedNode}
 */
fb.core.view.filter.RangedFilter.prototype.getStartPost = function() {
  return this.startPost_;
};

/**
 * @return {!fb.core.snap.NamedNode}
 */
fb.core.view.filter.RangedFilter.prototype.getEndPost = function() {
  return this.endPost_;
};

/**
 * @param {!fb.core.snap.NamedNode} node
 * @return {boolean}
 */
fb.core.view.filter.RangedFilter.prototype.matches = function(node) {
  return (this.index_.compare(this.getStartPost(), node) <= 0 && this.index_.compare(node, this.getEndPost()) <= 0);
};

/**
 * @inheritDoc
 */
fb.core.view.filter.RangedFilter.prototype.updateChild = function(snap, key, newChild, affectedPath, source,
                                                                  optChangeAccumulator) {
  if (!this.matches(new fb.core.snap.NamedNode(key, newChild))) {
    newChild = fb.core.snap.EMPTY_NODE;
  }
  return this.indexedFilter_.updateChild(snap, key, newChild, affectedPath, source, optChangeAccumulator);
};

/**
 * @inheritDoc
 */
fb.core.view.filter.RangedFilter.prototype.updateFullNode = function(oldSnap, newSnap, optChangeAccumulator) {
  if (newSnap.isLeafNode()) {
    // Make sure we have a children node with the correct index, not a leaf node;
    newSnap = fb.core.snap.EMPTY_NODE;
  }
  var filtered = newSnap.withIndex(this.index_);
  // Don't support priorities on queries
  filtered = filtered.updatePriority(fb.core.snap.EMPTY_NODE);
  var self = this;
  newSnap.forEachChild(fb.core.snap.PriorityIndex, function(key, childNode) {
    if (!self.matches(new fb.core.snap.NamedNode(key, childNode))) {
      filtered = filtered.updateImmediateChild(key, fb.core.snap.EMPTY_NODE);
    }
  });
  return this.indexedFilter_.updateFullNode(oldSnap, filtered, optChangeAccumulator);
};

/**
 * @inheritDoc
 */
fb.core.view.filter.RangedFilter.prototype.updatePriority = function(oldSnap, newPriority) {
  // Don't support priorities on queries
  return oldSnap;
};

/**
 * @inheritDoc
 */
fb.core.view.filter.RangedFilter.prototype.filtersNodes = function() {
  return true;
};

/**
 * @inheritDoc
 */
fb.core.view.filter.RangedFilter.prototype.getIndexedFilter = function() {
  return this.indexedFilter_;
};

/**
 * @inheritDoc
 */
fb.core.view.filter.RangedFilter.prototype.getIndex = function() {
  return this.index_;
};

/**
 * @param {!fb.core.view.QueryParams} params
 * @return {!fb.core.snap.NamedNode}
 * @private
 */
fb.core.view.filter.RangedFilter.prototype.getStartPost_ = function(params) {
  if (params.hasStart()) {
    var startName = params.getIndexStartName();
    return params.getIndex().makePost(params.getIndexStartValue(), startName);
  } else {
    return params.getIndex().minPost();
  }
};

/**
 * @param {!fb.core.view.QueryParams} params
 * @return {!fb.core.snap.NamedNode}
 * @private
 */
fb.core.view.filter.RangedFilter.prototype.getEndPost_ = function(params) {
  if (params.hasEnd()) {
    var endName = params.getIndexEndName();
    return params.getIndex().makePost(params.getIndexEndValue(), endName);
  } else {
    return params.getIndex().maxPost();
  }
};
