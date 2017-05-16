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
goog.provide('fb.core.view.ViewCache');
goog.require('fb.core.view.CacheNode');
goog.require('fb.core.snap');

/**
 * Stores the data we have cached for a view.
 *
 * serverSnap is the cached server data, eventSnap is the cached event data (server data plus any local writes).
 *
 * @param {!fb.core.view.CacheNode} eventCache
 * @param {!fb.core.view.CacheNode} serverCache
 * @constructor
 */
fb.core.view.ViewCache = function(eventCache, serverCache) {
  /**
   * @const
   * @type {!fb.core.view.CacheNode}
   * @private
   */
  this.eventCache_ = eventCache;

  /**
   * @const
   * @type {!fb.core.view.CacheNode}
   * @private
   */
  this.serverCache_ = serverCache;
};

/**
 * @const
 * @type {fb.core.view.ViewCache}
 */
fb.core.view.ViewCache.Empty = new fb.core.view.ViewCache(
    new fb.core.view.CacheNode(fb.core.snap.EMPTY_NODE, /*fullyInitialized=*/false, /*filtered=*/false),
    new fb.core.view.CacheNode(fb.core.snap.EMPTY_NODE, /*fullyInitialized=*/false, /*filtered=*/false)
);

/**
 * @param {!fb.core.snap.Node} eventSnap
 * @param {boolean} complete
 * @param {boolean} filtered
 * @return {!fb.core.view.ViewCache}
 */
fb.core.view.ViewCache.prototype.updateEventSnap = function(eventSnap, complete, filtered) {
  return new fb.core.view.ViewCache(new fb.core.view.CacheNode(eventSnap, complete, filtered), this.serverCache_);
};

/**
 * @param {!fb.core.snap.Node} serverSnap
 * @param {boolean} complete
 * @param {boolean} filtered
 * @return {!fb.core.view.ViewCache}
 */
fb.core.view.ViewCache.prototype.updateServerSnap = function(serverSnap, complete, filtered) {
  return new fb.core.view.ViewCache(this.eventCache_, new fb.core.view.CacheNode(serverSnap, complete, filtered));
};

/**
 * @return {!fb.core.view.CacheNode}
 */
fb.core.view.ViewCache.prototype.getEventCache = function() {
  return this.eventCache_;
};

/**
 * @return {?fb.core.snap.Node}
 */
fb.core.view.ViewCache.prototype.getCompleteEventSnap = function() {
  return (this.eventCache_.isFullyInitialized()) ? this.eventCache_.getNode() : null;
};

/**
 * @return {!fb.core.view.CacheNode}
 */
fb.core.view.ViewCache.prototype.getServerCache = function() {
  return this.serverCache_;
};

/**
 * @return {?fb.core.snap.Node}
 */
fb.core.view.ViewCache.prototype.getCompleteServerSnap = function() {
  return this.serverCache_.isFullyInitialized() ? this.serverCache_.getNode() : null;
};
