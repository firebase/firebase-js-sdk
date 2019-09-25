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

import { Equatable } from './misc';
import * as objUtil from './obj';

type Entry<K, V> = [K, V];

/**
 * A map implementation that uses objects as keys. Objects must implement the
 * Equatable interface and must be immutable. Entries in the map are stored
 * together with the key being produced from the mapKeyFn. This map
 * automatically handles collisions of keys.
 */
export class ObjectMap<KeyType extends Equatable<KeyType>, ValueType> {
  /**
   * The inner map for a key -> value pair. Due to the possibility of
   * collisions we keep a list of entries that we do a linear search through
   * to find an actual match. Note that collisions should be rare, so we still
   * expect near constant time lookups in practice.
   */
  private inner: {
    [canonicalId: string]: Array<Entry<KeyType, ValueType>>;
  } = {};

  constructor(private mapKeyFn: (key: KeyType) => string) {}

  /** Get a value for this key, or undefined if it does not exist. */
  get(key: KeyType): ValueType | undefined {
    const id = this.mapKeyFn(key);
    const matches = this.inner[id];
    if (matches === undefined) {
      return undefined;
    }
    for (const [otherKey, value] of matches) {
      if (otherKey.isEqual(key)) {
        return value;
      }
    }
    return undefined;
  }

  has(key: KeyType): boolean {
    return this.get(key) !== undefined;
  }

  /** Put this key and value in the map. */
  set(key: KeyType, value: ValueType): void {
    const id = this.mapKeyFn(key);
    const matches = this.inner[id];
    if (matches === undefined) {
      this.inner[id] = [[key, value]];
      return;
    }
    for (let i = 0; i < matches.length; i++) {
      if (matches[i][0].isEqual(key)) {
        matches[i] = [key, value];
        return;
      }
    }
    matches.push([key, value]);
  }

  /**
   * Remove this key from the map. Returns a boolean if anything was deleted.
   */
  delete(key: KeyType): boolean {
    const id = this.mapKeyFn(key);
    const matches = this.inner[id];
    if (matches === undefined) {
      return false;
    }
    for (let i = 0; i < matches.length; i++) {
      if (matches[i][0].isEqual(key)) {
        if (matches.length === 1) {
          delete this.inner[id];
        } else {
          matches.splice(i, 1);
        }
        return true;
      }
    }
    return false;
  }

  forEach(fn: (key: KeyType, val: ValueType) => void): void {
    objUtil.forEach(this.inner, (_, entries) => {
      for (const [k, v] of entries) {
        fn(k, v);
      }
    });
  }

  isEmpty(): boolean {
    return objUtil.isEmpty(this.inner);
  }
}
