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
goog.provide('fb.core.view.CompleteChildSource');


/**
 * Since updates to filtered nodes might require nodes to be pulled in from "outside" the node, this interface
 * can help to get complete children that can be pulled in.
 * A class implementing this interface takes potentially multiple sources (e.g. user writes, server data from
 * other views etc.) to try it's best to get a complete child that might be useful in pulling into the view.
 *
 * @interface
 */
fb.core.view.CompleteChildSource = function() { };

/**
 * @param {!string} childKey
 * @return {?fb.core.snap.Node}
 */
fb.core.view.CompleteChildSource.prototype.getCompleteChild = function(childKey) { };

/**
 * @param {!fb.core.snap.Index} index
 * @param {!fb.core.snap.NamedNode} child
 * @param {boolean} reverse
 * @return {?fb.core.snap.NamedNode}
 */
fb.core.view.CompleteChildSource.prototype.getChildAfterChild = function(index, child, reverse) { };


/**
 * An implementation of CompleteChildSource that never returns any additional children
 *
 * @private
 * @constructor
 * @implements fb.core.view.CompleteChildSource
 */
fb.core.view.NoCompleteChildSource_ = function() {
};

/**
 * @inheritDoc
 */
fb.core.view.NoCompleteChildSource_.prototype.getCompleteChild = function() {
  return null;
};

/**
 * @inheritDoc
 */
fb.core.view.NoCompleteChildSource_.prototype.getChildAfterChild = function() {
  return null;
};

/**
 * Singleton instance.
 * @const
 * @type {!fb.core.view.CompleteChildSource}
 */
fb.core.view.NO_COMPLETE_CHILD_SOURCE = new fb.core.view.NoCompleteChildSource_();


/**
 * An implementation of CompleteChildSource that uses a WriteTree in addition to any other server data or
 * old event caches available to calculate complete children.
 *
 * @param {!fb.core.WriteTreeRef} writes
 * @param {!fb.core.view.ViewCache} viewCache
 * @param {?fb.core.snap.Node} optCompleteServerCache
 *
 * @constructor
 * @implements fb.core.view.CompleteChildSource
 */
fb.core.view.WriteTreeCompleteChildSource = function(writes, viewCache, optCompleteServerCache) {
  /**
   * @type {!fb.core.WriteTreeRef}
   * @private
   */
  this.writes_ = writes;

  /**
   * @type {!fb.core.view.ViewCache}
   * @private
   */
  this.viewCache_ = viewCache;

  /**
   * @type {?fb.core.snap.Node}
   * @private
   */
  this.optCompleteServerCache_ = optCompleteServerCache;
};

/**
 * @inheritDoc
 */
fb.core.view.WriteTreeCompleteChildSource.prototype.getCompleteChild = function(childKey) {
  var node = this.viewCache_.getEventCache();
  if (node.isCompleteForChild(childKey)) {
    return node.getNode().getImmediateChild(childKey);
  } else {
    var serverNode = this.optCompleteServerCache_ != null ?
        new fb.core.view.CacheNode(this.optCompleteServerCache_, true, false) : this.viewCache_.getServerCache();
    return this.writes_.calcCompleteChild(childKey, serverNode);
  }
};

/**
 * @inheritDoc
 */
fb.core.view.WriteTreeCompleteChildSource.prototype.getChildAfterChild = function(index, child, reverse) {
  var completeServerData = this.optCompleteServerCache_ != null ? this.optCompleteServerCache_ :
      this.viewCache_.getCompleteServerSnap();
  var nodes = this.writes_.calcIndexedSlice(completeServerData, child, 1, reverse, index);
  if (nodes.length === 0) {
    return null;
  } else {
    return nodes[0];
  }
};
