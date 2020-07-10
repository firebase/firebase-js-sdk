/**
 * @license
 * Copyright 2017 Google LLC
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

/* It's critical for performance that we do not calculate actual values from a SyncTree
 * unless and until the value is needed. Because we expose both a SyncTree and Node
 * version of deferred value resolution, we ned a wrapper class that will let us share
 * code.
 *
 * @see https://github.com/firebase/firebase-js-sdk/issues/2487
 */
interface ValueProvider {
  getImmediateChild(childName: string): ValueProvider;
  node(): Node;
}

class ExistingValueProvider implements ValueProvider {
  constructor(readonly node_: Node) {}

  getImmediateChild(childName: string): ValueProvider {
    const child = this.node_.getImmediateChild(childName);
    return new ExistingValueProvider(child);
  }

  node(): Node {
    return this.node_;
  }
}

class DeferredValueProvider implements ValueProvider {
  private syncTree_: SyncTree;
  private path_: Path;

  constructor(syncTree: SyncTree, path: Path) {
    this.syncTree_ = syncTree;
    this.path_ = path;
  }

  getImmediateChild(childName: string): ValueProvider {
    const childPath = this.path_.child(childName);
    return new DeferredValueProvider(this.syncTree_, childPath);
  }

  node(): Node {
    return this.syncTree_.calcCompleteEventCache(this.path_);
  }
}

/**
 * Generate placeholders for deferred values.
 * @param {?Object} values
 * @return {!Object}
 */
export const generateWithValues = function (
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
export const resolveDeferredLeafValue = function (
  value: { [k: string]: unknown } | string | number | boolean,
  existingVal: ValueProvider,
  serverValues: { [k: string]: unknown }
): string | number | boolean {
  if (!value || typeof value !== 'object') {
    return value as string | number | boolean;
  }
  assert('.sv' in value, 'Unexpected leaf node or priority contents');

  if (typeof value['.sv'] === 'string') {
    return resolveScalarDeferredValue(value['.sv'], existingVal, serverValues);
  } else if (typeof value['.sv'] === 'object') {
    return resolveComplexDeferredValue(value['.sv'], existingVal, serverValues);
  } else {
    assert(false, 'Unexpected server value: ' + JSON.stringify(value, null, 2));
  }
};

const resolveScalarDeferredValue = function (
  op: string,
  existing: ValueProvider,
  serverValues: { [k: string]: unknown }
): string | number | boolean {
  switch (op) {
    case 'timestamp':
      return serverValues['timestamp'] as string | number | boolean;
    default:
      assert(false, 'Unexpected server value: ' + op);
  }
};

const resolveComplexDeferredValue = function (
  op: object,
  existing: ValueProvider,
  unused: { [k: string]: unknown }
): string | number | boolean {
  if (!op.hasOwnProperty('increment')) {
    assert(false, 'Unexpected server value: ' + JSON.stringify(op, null, 2));
  }
  const delta = op['increment'];
  if (typeof delta !== 'number') {
    assert(false, 'Unexpected increment value: ' + delta);
  }

  const existingNode = existing.node();
  assert(
    existingNode !== null && typeof existingNode !== 'undefined',
    'Expected ChildrenNode.EMPTY_NODE for nulls'
  );

  // Incrementing a non-number sets the value to the incremented amount
  if (!existingNode.isLeafNode()) {
    return delta;
  }

  const leaf = existingNode as LeafNode;
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
 * @param {!Path} path path to which write is relative
 * @param {!Node} node new data written at path
 * @param {!SyncTree} syncTree current data
 * @param {!Object} serverValues
 * @return {!SparseSnapshotTree}
 */
export const resolveDeferredValueTree = function (
  path: Path,
  node: Node,
  syncTree: SyncTree,
  serverValues: Indexable
): Node {
  return resolveDeferredValue(
    node,
    new DeferredValueProvider(syncTree, path),
    serverValues
  );
};

/**
 * Recursively replace all deferred values and priorities in the node with the
 * specified generated replacement values.  If there are no server values in the node,
 * it'll be returned as-is.
 * @param {!Node} node
 * @param {!Object} serverValues
 * @return {!Node}
 */
export const resolveDeferredValueSnapshot = function (
  node: Node,
  existing: Node,
  serverValues: Indexable
): Node {
  return resolveDeferredValue(
    node,
    new ExistingValueProvider(existing),
    serverValues
  );
};

function resolveDeferredValue(
  node: Node,
  existingVal: ValueProvider,
  serverValues: Indexable
): Node {
  const rawPri = node.getPriority().val() as
    | Indexable
    | boolean
    | null
    | number
    | string;
  const priority = resolveDeferredLeafValue(
    rawPri,
    existingVal.getImmediateChild('.priority'),
    serverValues
  );
  let newNode: Node;

  if (node.isLeafNode()) {
    const leafNode = node as LeafNode;
    const value = resolveDeferredLeafValue(
      leafNode.getValue(),
      existingVal,
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
      const newChildNode = resolveDeferredValue(
        childNode,
        existingVal.getImmediateChild(childName),
        serverValues
      );
      if (newChildNode !== childNode) {
        newNode = newNode.updateImmediateChild(childName, newChildNode);
      }
    });
    return newNode;
  }
}
