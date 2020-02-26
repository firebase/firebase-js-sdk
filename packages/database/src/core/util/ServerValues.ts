/**
 * @license
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
import { SyncTree } from '../SyncTree';
import { Indexable } from './misc';

/**
 * Generate placeholders for deferred values.
 * @param {?Object} values
 * @return {!Object}
 */
export const generateWithValues = function(
  values: {
    [k: string]: unknown;
  } | null
): { [k: string]: unknown } {
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
  value: { [k: string]: unknown } | string | number | boolean,
  existing: Node,
  serverValues: { [k: string]: unknown }
): string | number | boolean {
  if (!value || typeof value !== 'object') {
    return value as string | number | boolean;
  }
  assert('.sv' in value, 'Unexpected leaf node or priority contents');

  if (typeof value['.sv'] === 'string') {
    return resolveScalarDeferredValue(value['.sv'], existing, serverValues);
  } else if (typeof value['.sv'] === 'object') {
    return resolveComplexDeferredValue(value['.sv'], existing, serverValues);
  } else {
    assert(false, 'Unexpected server value: ' + JSON.stringify(value, null, 2));
  }
};

const resolveScalarDeferredValue = function(
  op: string,
  existing: Node,
  serverValues: { [k: string]: unknown }
): string | number | boolean {
  switch (op) {
    case 'timestamp':
      return serverValues['timestamp'] as string | number | boolean;
    default:
      assert(false, 'Unexpected server value: ' + op);
  }
};

const resolveComplexDeferredValue = function(
  op: object,
  existing: Node,
  unused: { [k: string]: unknown }
): string | number | boolean {
  if (!op.hasOwnProperty('increment')) {
    assert(false, 'Unexpected server value: ' + JSON.stringify(op, null, 2));
  }
  const delta = op['increment'];
  if (typeof delta !== 'number') {
    assert(false, 'Unexpected increment value: ' + delta);
  }

  // Incrementing a non-number sets the value to the incremented amount
  if (!existing.isLeafNode()) {
    return delta;
  }

  const leaf = existing as LeafNode;
  const existingVal = leaf.getValue();
  if (typeof existingVal !== 'number') {
    return delta;
  }

  // No need to do over/underflow arithmetic here because JS only handles floats under the covers
  return existingVal + delta;
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
  syncTree: SyncTree,
  serverValues: Indexable
): SparseSnapshotTree {
  const resolvedTree = new SparseSnapshotTree();
  tree.forEachTree(new Path(''), (path, node) => {
    const existing = syncTree.calcCompleteEventCache(path);
    assert(
      existing !== null && typeof existing !== 'undefined',
      'Expected ChildrenNode.EMPTY_NODE for nulls'
    );
    resolvedTree.remember(
      path,
      resolveDeferredValueSnapshot(node, existing, serverValues)
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
  existing: Node,
  serverValues: Indexable
): Node {
  const rawPri = node.getPriority().val() as
    | Indexable
    | boolean
    | null
    | number
    | string;
  const priority = resolveDeferredValue(
    rawPri,
    existing.getPriority(),
    serverValues
  );
  let newNode: Node;

  if (node.isLeafNode()) {
    const leafNode = node as LeafNode;
    const value = resolveDeferredValue(
      leafNode.getValue(),
      existing,
      serverValues
    );
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
    childrenNode.forEachChild(PRIORITY_INDEX, (childName, childNode) => {
      const newChildNode = resolveDeferredValueSnapshot(
        childNode,
        existing.getImmediateChild(childName),
        serverValues
      );
      if (newChildNode !== childNode) {
        newNode = newNode.updateImmediateChild(childName, newChildNode);
      }
    });
    return newNode;
  }
};
