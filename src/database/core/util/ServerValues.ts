import { assert } from "../../../utils/assert";
import { Path } from "./Path";
import { SparseSnapshotTree } from "../SparseSnapshotTree";
import { LeafNode } from "../snap/LeafNode";
import { nodeFromJSON } from "../snap/nodeFromJSON";
import { PriorityIndex } from "../snap/IndexFactory";
/**
 * Generate placeholders for deferred values.
 * @param {?Object} values
 * @return {!Object}
 */
export const generateWithValues = function(values) {
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
export const resolveDeferredValue = function(value, serverValues) {
  if (!value || (typeof value !== 'object')) {
    return /** @type {(string|number|boolean)} */ (value);
  } else {
    assert('.sv' in value, 'Unexpected leaf node or priority contents');
    return serverValues[value['.sv']];
  }
};


/**
 * Recursively replace all deferred values and priorities in the tree with the
 * specified generated replacement values.
 * @param {!SparseSnapshotTree} tree
 * @param {!Object} serverValues
 * @return {!SparseSnapshotTree}
 */
export const resolveDeferredValueTree = function(tree, serverValues) {
  var resolvedTree = new SparseSnapshotTree();
  tree.forEachTree(new Path(''), function(path, node) {
    resolvedTree.remember(path, resolveDeferredValueSnapshot(node, serverValues));
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
export const resolveDeferredValueSnapshot = function(node, serverValues) {
  var rawPri = /** @type {Object|boolean|null|number|string} */ (node.getPriority().val()),
      priority = resolveDeferredValue(rawPri, serverValues),
      newNode;

  if (node.isLeafNode()) {
    var leafNode = /** @type {!LeafNode} */ (node);
    var value = resolveDeferredValue(leafNode.getValue(), serverValues);
    if (value !== leafNode.getValue() || priority !== leafNode.getPriority().val()) {
      return new LeafNode(value, nodeFromJSON(priority));
    } else {
      return node;
    }
  } else {
    var childrenNode = /** @type {!fb.core.snap.ChildrenNode} */ (node);
    newNode = childrenNode;
    if (priority !== childrenNode.getPriority().val()) {
      newNode = newNode.updatePriority(new LeafNode(priority));
    }
    childrenNode.forEachChild(PriorityIndex, function(childName, childNode) {
      var newChildNode = resolveDeferredValueSnapshot(childNode, serverValues);
      if (newChildNode !== childNode) {
        newNode = newNode.updateImmediateChild(childName, newChildNode);
      }
    });
    return newNode;
  }
};
