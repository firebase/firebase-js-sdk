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

import { nameCompare, MAX_NAME } from '../../util/util';
import { LeafNode } from '../LeafNode';
import { NamedNode, Node } from '../Node';

import { Index } from './Index';

let nodeFromJSON: (a: unknown) => Node;
let MAX_NODE: Node;

export function setNodeFromJSON(val: (a: unknown) => Node) {
  nodeFromJSON = val;
}

export function setMaxNode(val: Node) {
  MAX_NODE = val;
}

export class PriorityIndex extends Index {
  compare(a: NamedNode, b: NamedNode): number {
    const aPriority = a.node.getPriority();
    const bPriority = b.node.getPriority();
    const indexCmp = aPriority.compareTo(bPriority);
    if (indexCmp === 0) {
      return nameCompare(a.name, b.name);
    } else {
      return indexCmp;
    }
  }
  isDefinedOn(node: Node): boolean {
    return !node.getPriority().isEmpty();
  }
  indexedValueChanged(oldNode: Node, newNode: Node): boolean {
    return !oldNode.getPriority().equals(newNode.getPriority());
  }
  minPost(): NamedNode {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (NamedNode as any).MIN;
  }
  maxPost(): NamedNode {
    return new NamedNode(MAX_NAME, new LeafNode('[PRIORITY-POST]', MAX_NODE));
  }

  makePost(indexValue: unknown, name: string): NamedNode {
    const priorityNode = nodeFromJSON(indexValue);
    return new NamedNode(name, new LeafNode('[PRIORITY-POST]', priorityNode));
  }

  /**
   * @returns String representation for inclusion in a query spec
   */
  toString(): string {
    return '.priority';
  }
}

export const PRIORITY_INDEX = new PriorityIndex();
