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
goog.provide('fb.core.view.filter.NodeFilter');
goog.require('fb.core.view.ChildChangeAccumulator');
goog.require('fb.core.view.CompleteChildSource');

/**
 * NodeFilter is used to update nodes and complete children of nodes while applying queries on the fly and keeping
 * track of any child changes. This class does not track value changes as value changes depend on more
 * than just the node itself. Different kind of queries require different kind of implementations of this interface.
 * @interface
 */
fb.core.view.filter.NodeFilter = function() { };

/**
 * Update a single complete child in the snap. If the child equals the old child in the snap, this is a no-op.
 * The method expects an indexed snap.
 *
 * @param {!fb.core.snap.Node} snap
 * @param {string} key
 * @param {!fb.core.snap.Node} newChild
 * @param {!fb.core.util.Path} affectedPath
 * @param {!fb.core.view.CompleteChildSource} source
 * @param {?fb.core.view.ChildChangeAccumulator} optChangeAccumulator
 * @return {!fb.core.snap.Node}
 */
fb.core.view.filter.NodeFilter.prototype.updateChild = function(snap, key, newChild, affectedPath, source,
                                                                optChangeAccumulator) {};

/**
 * Update a node in full and output any resulting change from this complete update.
 *
 * @param {!fb.core.snap.Node} oldSnap
 * @param {!fb.core.snap.Node} newSnap
 * @param {?fb.core.view.ChildChangeAccumulator} optChangeAccumulator
 * @return {!fb.core.snap.Node}
 */
fb.core.view.filter.NodeFilter.prototype.updateFullNode = function(oldSnap, newSnap, optChangeAccumulator) { };

/**
 * Update the priority of the root node
 *
 * @param {!fb.core.snap.Node} oldSnap
 * @param {!fb.core.snap.Node} newPriority
 * @return {!fb.core.snap.Node}
 */
fb.core.view.filter.NodeFilter.prototype.updatePriority = function(oldSnap, newPriority) { };

/**
 * Returns true if children might be filtered due to query criteria
 *
 * @return {boolean}
 */
fb.core.view.filter.NodeFilter.prototype.filtersNodes = function() { };

/**
 * Returns the index filter that this filter uses to get a NodeFilter that doesn't filter any children.
 * @return {!fb.core.view.filter.NodeFilter}
 */
fb.core.view.filter.NodeFilter.prototype.getIndexedFilter = function() { };

/**
 * Returns the index that this filter uses
 * @return {!fb.core.snap.Index}
 */
fb.core.view.filter.NodeFilter.prototype.getIndex = function() { };
