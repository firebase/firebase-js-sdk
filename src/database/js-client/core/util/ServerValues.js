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
goog.provide('fb.core.util.ServerValues');


/**
 * Generate placeholders for deferred values.
 * @param {?Object} values
 * @return {!Object}
 */
fb.core.util.ServerValues.generateWithValues = function(values) {
  values = values || {};
  values['timestamp'] = values['timestamp'] || new Date().getTime();
  return values;
};


/**
 * Value to use when firing local events. When writing server values, fire
 * local events with an approximate value, otherwise return value as-is.
 * @param {(Object|string|number|boolean)} value
 * @param {!Object} serverValues
 * @return {!(string|number|boolean)}
 */
fb.core.util.ServerValues.resolveDeferredValue = function(value, serverValues) {
  if (!value || (typeof value !== 'object')) {
    return /** @type {(string|number|boolean)} */ (value);
  } else {
    fb.core.util.assert('.sv' in value, 'Unexpected leaf node or priority contents');
    return serverValues[value['.sv']];
  }
};


/**
 * Recursively replace all deferred values and priorities in the tree with the
 * specified generated replacement values.
 * @param {!fb.core.SparseSnapshotTree} tree
 * @param {!Object} serverValues
 * @return {!fb.core.SparseSnapshotTree}
 */
fb.core.util.ServerValues.resolveDeferredValueTree = function(tree, serverValues) {
  var resolvedTree = new fb.core.SparseSnapshotTree();
  tree.forEachTree(new fb.core.util.Path(''), function(path, node) {
    resolvedTree.remember(path, fb.core.util.ServerValues.resolveDeferredValueSnapshot(node, serverValues));
  });
  return resolvedTree;
};


/**
 * Recursively replace all deferred values and priorities in the node with the
 * specified generated replacement values.  If there are no server values in the node,
 * it'll be returned as-is.
 * @param {!fb.core.snap.Node} node
 * @param {!Object} serverValues
 * @return {!fb.core.snap.Node}
 */
fb.core.util.ServerValues.resolveDeferredValueSnapshot = function(node, serverValues) {
  var rawPri = /** @type {Object|boolean|null|number|string} */ (node.getPriority().val()),
      priority = fb.core.util.ServerValues.resolveDeferredValue(rawPri, serverValues),
      newNode;

  if (node.isLeafNode()) {
    var leafNode = /** @type {!fb.core.snap.LeafNode} */ (node);
    var value = fb.core.util.ServerValues.resolveDeferredValue(leafNode.getValue(), serverValues);
    if (value !== leafNode.getValue() || priority !== leafNode.getPriority().val()) {
      return new fb.core.snap.LeafNode(value, fb.core.snap.NodeFromJSON(priority));
    } else {
      return node;
    }
  } else {
    var childrenNode = /** @type {!fb.core.snap.ChildrenNode} */ (node);
    newNode = childrenNode;
    if (priority !== childrenNode.getPriority().val()) {
      newNode = newNode.updatePriority(new fb.core.snap.LeafNode(priority));
    }
    childrenNode.forEachChild(fb.core.snap.PriorityIndex, function(childName, childNode) {
      var newChildNode = fb.core.util.ServerValues.resolveDeferredValueSnapshot(childNode, serverValues);
      if (newChildNode !== childNode) {
        newNode = newNode.updateImmediateChild(childName, newChildNode);
      }
    });
    return newNode;
  }
};
