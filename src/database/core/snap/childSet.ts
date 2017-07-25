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

import { LLRBNode } from '../util/SortedMap';
import { SortedMap } from '../util/SortedMap';
import { NamedNode } from './Node';

const LOG_2 = Math.log(2);

/**
 * @constructor
 */
class Base12Num {
  count: number;
  private current_: number;
  private bits_: number;

  /**
   * @param {number} length
   */
  constructor(length: number) {
    const logBase2 = (num: number) =>
      parseInt((Math.log(num) / LOG_2) as any, 10);
    const bitMask = (bits: number) => parseInt(Array(bits + 1).join('1'), 2);
    this.count = logBase2(length + 1);
    this.current_ = this.count - 1;
    const mask = bitMask(this.count);
    this.bits_ = (length + 1) & mask;
  }

  /**
   * @return {boolean}
   */
  nextBitIsOne(): boolean {
    //noinspection JSBitwiseOperatorUsage
    const result = !(this.bits_ & (0x1 << this.current_));
    this.current_--;
    return result;
  }
}

/**
 * Takes a list of child nodes and constructs a SortedSet using the given comparison
 * function
 *
 * Uses the algorithm described in the paper linked here:
 * http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.46.1458
 *
 * @template K, V
 * @param {Array.<!NamedNode>} childList Unsorted list of children
 * @param {function(!NamedNode, !NamedNode):number} cmp The comparison method to be used
 * @param {(function(NamedNode):K)=} keyFn An optional function to extract K from a node wrapper, if K's
 *                                                        type is not NamedNode
 * @param {(function(K, K):number)=} mapSortFn An optional override for comparator used by the generated sorted map
 * @return {SortedMap.<K, V>}
 */
export const buildChildSet = function<K, V>(
  childList: NamedNode[],
  cmp: (a: NamedNode, b: NamedNode) => number,
  keyFn?: (a: NamedNode) => K,
  mapSortFn?: (a: K, b: K) => number
): SortedMap<K, V> {
  childList.sort(cmp);

  const buildBalancedTree = function(
    low: number,
    high: number
  ): LLRBNode<K, V> | null {
    const length = high - low;
    let namedNode: NamedNode;
    let key: K;
    if (length == 0) {
      return null;
    } else if (length == 1) {
      namedNode = childList[low];
      key = keyFn ? keyFn(namedNode) : (namedNode as any) as K;
      return new LLRBNode(
        key,
        (namedNode.node as any) as V,
        LLRBNode.BLACK,
        null,
        null
      );
    } else {
      const middle = parseInt((length / 2) as any, 10) + low;
      const left = buildBalancedTree(low, middle);
      const right = buildBalancedTree(middle + 1, high);
      namedNode = childList[middle];
      key = keyFn ? keyFn(namedNode) : (namedNode as any) as K;
      return new LLRBNode(
        key,
        (namedNode.node as any) as V,
        LLRBNode.BLACK,
        left,
        right
      );
    }
  };

  const buildFrom12Array = function(base12: Base12Num): LLRBNode<K, V> {
    let node: LLRBNode<K, V> = null;
    let root = null;
    let index = childList.length;

    const buildPennant = function(chunkSize: number, color: boolean) {
      const low = index - chunkSize;
      const high = index;
      index -= chunkSize;
      const childTree = buildBalancedTree(low + 1, high);
      const namedNode = childList[low];
      const key: K = keyFn ? keyFn(namedNode) : (namedNode as any) as K;
      attachPennant(
        new LLRBNode(key, (namedNode.node as any) as V, color, null, childTree)
      );
    };

    const attachPennant = function(pennant: LLRBNode<K, V>) {
      if (node) {
        node.left = pennant;
        node = pennant;
      } else {
        root = pennant;
        node = pennant;
      }
    };

    for (let i = 0; i < base12.count; ++i) {
      const isOne = base12.nextBitIsOne();
      // The number of nodes taken in each slice is 2^(arr.length - (i + 1))
      const chunkSize = Math.pow(2, base12.count - (i + 1));
      if (isOne) {
        buildPennant(chunkSize, LLRBNode.BLACK);
      } else {
        // current == 2
        buildPennant(chunkSize, LLRBNode.BLACK);
        buildPennant(chunkSize, LLRBNode.RED);
      }
    }
    return root;
  };

  const base12 = new Base12Num(childList.length);
  const root = buildFrom12Array(base12);

  return new SortedMap<K, V>(mapSortFn || (cmp as any), root);
};
