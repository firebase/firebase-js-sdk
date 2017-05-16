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
goog.provide('fb.core.view.filter.IndexedFilter');
goog.require('fb.core.util');

/**
 * Doesn't really filter nodes but applies an index to the node and keeps track of any changes
 *
 * @constructor
 * @implements {fb.core.view.filter.NodeFilter}
 * @param {!fb.core.snap.Index} index
 */
fb.core.view.filter.IndexedFilter = function(index) {
  /**
   * @type {!fb.core.snap.Index}
   * @const
   * @private
   */
  this.index_ = index;
};

/**
 * @inheritDoc
 */
fb.core.view.filter.IndexedFilter.prototype.updateChild = function(snap, key, newChild, affectedPath, source,
                                                                   optChangeAccumulator) {
  var Change = fb.core.view.Change;
  fb.core.util.assert(snap.isIndexed(this.index_), 'A node must be indexed if only a child is updated');
  var oldChild = snap.getImmediateChild(key);
  // Check if anything actually changed.
  if (oldChild.getChild(affectedPath).equals(newChild.getChild(affectedPath))) {
    // There's an edge case where a child can enter or leave the view because affectedPath was set to null.
    // In this case, affectedPath will appear null in both the old and new snapshots.  So we need
    // to avoid treating these cases as "nothing changed."
    if (oldChild.isEmpty() == newChild.isEmpty()) {
      // Nothing changed.

      // This assert should be valid, but it's expensive (can dominate perf testing) so don't actually do it.
      //fb.core.util.assert(oldChild.equals(newChild), 'Old and new snapshots should be equal.');
      return snap;
    }
  }

  if (optChangeAccumulator != null) {
    if (newChild.isEmpty()) {
      if (snap.hasChild(key)) {
        optChangeAccumulator.trackChildChange(Change.childRemovedChange(key, oldChild));
      } else {
        fb.core.util.assert(snap.isLeafNode(), 'A child remove without an old child only makes sense on a leaf node');
      }
    } else if (oldChild.isEmpty()) {
      optChangeAccumulator.trackChildChange(Change.childAddedChange(key, newChild));
    } else {
      optChangeAccumulator.trackChildChange(Change.childChangedChange(key, newChild, oldChild));
    }
  }
  if (snap.isLeafNode() && newChild.isEmpty()) {
    return snap;
  } else {
    // Make sure the node is indexed
    return snap.updateImmediateChild(key, newChild).withIndex(this.index_);
  }
};

/**
 * @inheritDoc
 */
fb.core.view.filter.IndexedFilter.prototype.updateFullNode = function(oldSnap, newSnap, optChangeAccumulator) {
  var Change = fb.core.view.Change;
  if (optChangeAccumulator != null) {
    if (!oldSnap.isLeafNode()) {
      oldSnap.forEachChild(fb.core.snap.PriorityIndex, function(key, childNode) {
        if (!newSnap.hasChild(key)) {
          optChangeAccumulator.trackChildChange(Change.childRemovedChange(key, childNode));
        }
      });
    }
    if (!newSnap.isLeafNode()) {
      newSnap.forEachChild(fb.core.snap.PriorityIndex, function(key, childNode) {
        if (oldSnap.hasChild(key)) {
          var oldChild = oldSnap.getImmediateChild(key);
          if (!oldChild.equals(childNode)) {
            optChangeAccumulator.trackChildChange(Change.childChangedChange(key, childNode, oldChild));
          }
        } else {
          optChangeAccumulator.trackChildChange(Change.childAddedChange(key, childNode));
        }
      });
    }
  }
  return newSnap.withIndex(this.index_);
};

/**
 * @inheritDoc
 */
fb.core.view.filter.IndexedFilter.prototype.updatePriority = function(oldSnap, newPriority) {
  if (oldSnap.isEmpty()) {
    return fb.core.snap.EMPTY_NODE;
  } else {
    return oldSnap.updatePriority(newPriority);
  }
};

/**
 * @inheritDoc
 */
fb.core.view.filter.IndexedFilter.prototype.filtersNodes = function() {
  return false;
};

/**
 * @inheritDoc
 */
fb.core.view.filter.IndexedFilter.prototype.getIndexedFilter = function() {
  return this;
};

/**
 * @inheritDoc
 */
fb.core.view.filter.IndexedFilter.prototype.getIndex = function() {
  return this.index_;
};
