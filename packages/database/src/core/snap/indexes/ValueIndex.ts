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

import { nameCompare } from '../../util/util';
import { NamedNode, Node } from '../Node';
import { nodeFromJSON } from '../nodeFromJSON';

import { Index } from './Index';

export class ValueIndex extends Index {
  compare(a: NamedNode, b: NamedNode): number {
    const indexCmp = a.node.compareTo(b.node);
    if (indexCmp === 0) {
      return nameCompare(a.name, b.name);
    } else {
      return indexCmp;
    }
  }
  isDefinedOn(node: Node): boolean {
    return true;
  }
  indexedValueChanged(oldNode: Node, newNode: Node): boolean {
    return !oldNode.equals(newNode);
  }
  minPost(): NamedNode {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (NamedNode as any).MIN;
  }
  maxPost(): NamedNode {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (NamedNode as any).MAX;
  }

  makePost(indexValue: object, name: string): NamedNode {
    const valueNode = nodeFromJSON(indexValue);
    return new NamedNode(name, valueNode);
  }

  /**
   * @returns String representation for inclusion in a query spec
   */
  toString(): string {
    return '.value';
  }
}

export const VALUE_INDEX = new ValueIndex();
