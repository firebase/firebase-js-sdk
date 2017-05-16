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
goog.provide('fb.core.snap.IndexMap');
goog.require('fb.core.snap.Index');
goog.require('fb.core.util');

/**
 *
 * @param {Object.<string, fb.core.snap.Index.FallbackType|fb.core.util.SortedMap.<fb.core.snap.NamedNode, fb.core.snap.Node>>} indexes
 * @param {Object.<string, fb.core.snap.Index>} indexSet
 * @constructor
 */
fb.core.snap.IndexMap = function(indexes, indexSet) {
  this.indexes_ = indexes;
  this.indexSet_ = indexSet;
};

/**
 *
 * @param {!string} indexKey
 * @return {?fb.core.util.SortedMap.<fb.core.snap.NamedNode, fb.core.snap.Node>}
 */
fb.core.snap.IndexMap.prototype.get = function(indexKey) {
  var sortedMap = fb.util.obj.get(this.indexes_, indexKey);
  if (!sortedMap) throw new Error('No index defined for ' + indexKey);

  if (sortedMap === fb.core.snap.Index.Fallback) {
    // The index exists, but it falls back to just name comparison. Return null so that the calling code uses the
    // regular child map
    return null;
  } else {
    return sortedMap;
  }
};

/**
 * @param {!fb.core.snap.Index} indexDefinition
 * @return {boolean}
 */
fb.core.snap.IndexMap.prototype.hasIndex = function(indexDefinition) {
  return goog.object.contains(this.indexSet_, indexDefinition.toString());
};

/**
 * @param {!fb.core.snap.Index} indexDefinition
 * @param {!fb.core.util.SortedMap.<string, !fb.core.snap.Node>} existingChildren
 * @return {!fb.core.snap.IndexMap}
 */
fb.core.snap.IndexMap.prototype.addIndex = function(indexDefinition, existingChildren) {
  fb.core.util.assert(indexDefinition !== fb.core.snap.KeyIndex,
      "KeyIndex always exists and isn't meant to be added to the IndexMap.");
  var childList = [];
  var sawIndexedValue = false;
  var iter = existingChildren.getIterator(fb.core.snap.NamedNode.Wrap);
  var next = iter.getNext();
  while (next) {
    sawIndexedValue = sawIndexedValue || indexDefinition.isDefinedOn(next.node);
    childList.push(next);
    next = iter.getNext();
  }
  var newIndex;
  if (sawIndexedValue) {
    newIndex = fb.core.snap.buildChildSet(childList, indexDefinition.getCompare());
  } else {
    newIndex = fb.core.snap.Index.Fallback;
  }
  var indexName = indexDefinition.toString();
  var newIndexSet = goog.object.clone(this.indexSet_);
  newIndexSet[indexName] = indexDefinition;
  var newIndexes = goog.object.clone(this.indexes_);
  newIndexes[indexName] = newIndex;
  return new fb.core.snap.IndexMap(newIndexes, newIndexSet);
};


/**
 * Ensure that this node is properly tracked in any indexes that we're maintaining
 * @param {!fb.core.snap.NamedNode} namedNode
 * @param {!fb.core.util.SortedMap.<string, !fb.core.snap.Node>} existingChildren
 * @return {!fb.core.snap.IndexMap}
 */
fb.core.snap.IndexMap.prototype.addToIndexes = function(namedNode, existingChildren) {
  var self = this;
  var newIndexes = goog.object.map(this.indexes_, function(indexedChildren, indexName) {
    var index = fb.util.obj.get(self.indexSet_, indexName);
    fb.core.util.assert(index, 'Missing index implementation for ' + indexName);
    if (indexedChildren === fb.core.snap.Index.Fallback) {
      // Check to see if we need to index everything
      if (index.isDefinedOn(namedNode.node)) {
        // We need to build this index
        var childList = [];
        var iter = existingChildren.getIterator(fb.core.snap.NamedNode.Wrap);
        var next = iter.getNext();
        while (next) {
          if (next.name != namedNode.name) {
            childList.push(next);
          }
          next = iter.getNext();
        }
        childList.push(namedNode);
        return fb.core.snap.buildChildSet(childList, index.getCompare());
      } else {
        // No change, this remains a fallback
        return fb.core.snap.Index.Fallback;
      }
    } else {
      var existingSnap = existingChildren.get(namedNode.name);
      var newChildren = indexedChildren;
      if (existingSnap) {
        newChildren = newChildren.remove(new fb.core.snap.NamedNode(namedNode.name, existingSnap));
      }
      return newChildren.insert(namedNode, namedNode.node);
    }
  });
  return new fb.core.snap.IndexMap(newIndexes, this.indexSet_);
};

/**
 * Create a new IndexMap instance with the given value removed
 * @param {!fb.core.snap.NamedNode} namedNode
 * @param {!fb.core.util.SortedMap.<string, !fb.core.snap.Node>} existingChildren
 * @return {!fb.core.snap.IndexMap}
 */
fb.core.snap.IndexMap.prototype.removeFromIndexes = function(namedNode, existingChildren) {
  var newIndexes = goog.object.map(this.indexes_, function(indexedChildren) {
    if (indexedChildren === fb.core.snap.Index.Fallback) {
      // This is the fallback. Just return it, nothing to do in this case
      return indexedChildren;
    } else {
      var existingSnap = existingChildren.get(namedNode.name);
      if (existingSnap) {
        return indexedChildren.remove(new fb.core.snap.NamedNode(namedNode.name, existingSnap));
      } else {
        // No record of this child
        return indexedChildren;
      }
    }
  });
  return new fb.core.snap.IndexMap(newIndexes, this.indexSet_);
};

/**
 * The default IndexMap for nodes without a priority
 * @type {!fb.core.snap.IndexMap}
 * @const
 */
fb.core.snap.IndexMap.Default = new fb.core.snap.IndexMap(
    {'.priority': fb.core.snap.Index.Fallback},
    {'.priority': fb.core.snap.PriorityIndex}
);
