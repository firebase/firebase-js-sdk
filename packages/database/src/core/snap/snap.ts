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
import { doubleToIEEE754String } from '../util/util';
import { contains } from '@firebase/util';
import { Node } from './Node';

let MAX_NODE: Node;

export function setMaxNode(val: Node) {
  MAX_NODE = val;
}

/**
 * @param {(!string|!number)} priority
 * @return {!string}
 */
export const priorityHashText = function(priority: string | number): string {
  if (typeof priority === 'number')
    return 'number:' + doubleToIEEE754String(priority);
  else return 'string:' + priority;
};

/**
 * Validates that a priority snapshot Node is valid.
 *
 * @param {!Node} priorityNode
 */
export const validatePriorityNode = function(priorityNode: Node) {
  if (priorityNode.isLeafNode()) {
    const val = priorityNode.val();
    assert(
      typeof val === 'string' ||
        typeof val === 'number' ||
        (typeof val === 'object' &&
          contains(val as { [key: string]: unknown }, '.sv')),
      'Priority must be a string or number.'
    );
  } else {
    assert(
      priorityNode === MAX_NODE || priorityNode.isEmpty(),
      'priority of unexpected type.'
    );
  }
  // Don't call getPriority() on MAX_NODE to avoid hitting assertion.
  assert(
    priorityNode === MAX_NODE || priorityNode.getPriority().isEmpty(),
    "Priority nodes can't have a priority of their own."
  );
};
