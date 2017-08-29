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

import { assert } from '@firebase/util';
import { Path } from './Path';
import { SparseSnapshotTree } from '../SparseSnapshotTree';
import { LeafNode } from '../snap/LeafNode';
import { nodeFromJSON } from '../snap/nodeFromJSON';
import { PRIORITY_INDEX } from '../snap/indexes/PriorityIndex';
import { Node } from '../snap/Node';
import { ChildrenNode } from '../snap/ChildrenNode';

/**
 * Generate placeholders for deferred values.
 * @param {?Object} values
 * @return {!Object}
 */
export const generateWithValues = function(values: {
  [k: string]: any;
} | null): { [k: string]: any } {
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
export const resolveDeferredValue = function(
  value: { [k: string]: any } | string | number | boolean,
  serverValues: { [k: string]: any }
): string | number | boolean {
  if (!value || typeof value !== 'object') {
    return value as string | number | boolean;
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
export const resolveDeferredValueTree = function(
  tree: SparseSnapshotTree,
  serverValues: Object
): SparseSnapshotTree {
  const resolvedTree = new SparseSnapshotTree();
  tree.forEachTree(new Path(''), function(path, node) {
    resolvedTree.remember(
      path,
      resolveDeferredValueSnapshot(node, serverValues)
    );
  });
  return resolvedTree;
};

/**
 * Recursively replace all deferred values and priorities in the node with the
 * specified generated replacement values.  If there are no server values in the node,
 * it'll be returned as-is.
 * @param {!Node} node
 * @param {!Object} serverValues
 * @return {!Node}
 */
export const resolveDeferredValueSnapshot = function(
  node: Node,
  serverValues: Object
): Node {
  const rawPri = node.getPriority().val() as
    | object
    | boolean
    | null
    | number
    | string;
  const priority = resolveDeferredValue(rawPri, serverValues);
  let newNode: Node;

  if (node.isLeafNode()) {
    const leafNode = node as LeafNode;
    const value = resolveDeferredValue(leafNode.getValue(), serverValues);
    if (
      value !== leafNode.getValue() ||
      priority !== leafNode.getPriority().val()
    ) {
      return new LeafNode(value, nodeFromJSON(priority));
    } else {
      return node;
    }
  } else {
    const childrenNode = node as ChildrenNode;
    newNode = childrenNode;
    if (priority !== childrenNode.getPriority().val()) {
      newNode = newNode.updatePriority(new LeafNode(priority));
    }
    childrenNode.forEachChild(PRIORITY_INDEX, function(childName, childNode) {
      const newChildNode = resolveDeferredValueSnapshot(
        childNode,
        serverValues
      );
      if (newChildNode !== childNode) {
        newNode = newNode.updateImmediateChild(childName, newChildNode);
      }
    });
    return newNode;
  }
};
