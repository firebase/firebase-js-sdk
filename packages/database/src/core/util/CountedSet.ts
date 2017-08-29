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

import { isEmpty, getCount, forEach, contains } from '@firebase/util';

/**
 * Implements a set with a count of elements.
 *
 * @template K, V
 */
export class CountedSet<K, V> {
  set: { [k: string]: V } = {};

  /**
   * @param {!K} item
   * @param {V} val
   */
  add(item: K, val: V) {
    this.set[item as any] = val !== null ? val : true as any;
  }

  /**
   * @param {!K} key
   * @return {boolean}
   */
  contains(key: K) {
    return contains(this.set, key);
  }

  /**
   * @param {!K} item
   * @return {V}
   */
  get(item: K): V | void {
    return this.contains(item) ? this.set[item as any] : undefined;
  }

  /**
   * @param {!K} item
   */
  remove(item: K) {
    delete this.set[item as any];
  }

  /**
   * Deletes everything in the set
   */
  clear() {
    this.set = {};
  }

  /**
   * True if there's nothing in the set
   * @return {boolean}
   */
  isEmpty(): boolean {
    return isEmpty(this.set);
  }

  /**
   * @return {number} The number of items in the set
   */
  count(): number {
    return getCount(this.set);
  }

  /**
   * Run a function on each k,v pair in the set
   * @param {function(K, V)} fn
   */
  each(fn: (k: K, v: V) => void) {
    forEach(this.set, (k: K, v: V) => fn(k, v));
  }

  /**
   * Mostly for debugging
   * @return {Array.<K>} The keys present in this CountedSet
   */
  keys(): K[] {
    const keys: K[] = [];
    forEach(this.set, (k: K) => {
      keys.push(k);
    });
    return keys;
  }
}
