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

import { Node, NamedNode } from '../Node';
import { MIN_NAME, MAX_NAME } from '../../util/util';
import { Comparator } from '../../util/SortedMap';

/**
 *
 * @constructor
 */
export abstract class Index {
  /**
   * @param {!NamedNode} a
   * @param {!NamedNode} b
   * @return {number}
   */
  abstract compare(a: NamedNode, b: NamedNode): number;

  /**
   * @param {!Node} node
   * @return {boolean}
   */
  abstract isDefinedOn(node: Node): boolean;

  /**
   * @return {function(!NamedNode, !NamedNode):number} A standalone comparison function for
   * this index
   */
  getCompare(): Comparator<NamedNode> {
    return this.compare.bind(this);
  }

  /**
   * Given a before and after value for a node, determine if the indexed value has changed. Even if they are different,
   * it's possible that the changes are isolated to parts of the snapshot that are not indexed.
   *
   * @param {!Node} oldNode
   * @param {!Node} newNode
   * @return {boolean} True if the portion of the snapshot being indexed changed between oldNode and newNode
   */
  indexedValueChanged(oldNode: Node, newNode: Node): boolean {
    const oldWrapped = new NamedNode(MIN_NAME, oldNode);
    const newWrapped = new NamedNode(MIN_NAME, newNode);
    return this.compare(oldWrapped, newWrapped) !== 0;
  }

  /**
   * @return {!NamedNode} a node wrapper that will sort equal to or less than
   * any other node wrapper, using this index
   */
  minPost(): NamedNode {
    return (NamedNode as any).MIN;
  }

  /**
   * @return {!NamedNode} a node wrapper that will sort greater than or equal to
   * any other node wrapper, using this index
   */
  abstract maxPost(): NamedNode;

  /**
   * @param {*} indexValue
   * @param {string} name
   * @return {!NamedNode}
   */
  abstract makePost(indexValue: any, name: string): NamedNode;

  /**
   * @return {!string} String representation for inclusion in a query spec
   */
  abstract toString(): string;
}
