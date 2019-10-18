/**
 * @license
 * Copyright 2019 Google Inc.
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
import { ObjectMap } from './obj_map';

/**
 * A set implementation that stores immutable objects implementing the
 * Equatable interface. Entries in the map are stored together with the
 * key being produced from the `keyFn`. This implementation handles collisions
 * of keys by checking both `keyFn` and `isEqual` of the entries.
 */
export class ObjectSet<EntryType extends Equatable<EntryType>> {
  /**
   * All features are delegated to an inner `ObjectMap`.
   */
  private inner: ObjectMap<EntryType, string>;

  constructor(private keyFn: (key: EntryType) => string) {
    this.inner = new ObjectMap<EntryType, string>(keyFn);
  }

  /** Whether the given entry exists in the set. */
  has(entry: EntryType): boolean {
    return this.inner.has(entry);
  }

  /** Put this entry in the map. */
  add(entry: EntryType): void {
    this.inner.set(entry, 'VALUE');
  }

  /**
   * Remove this entry from the set. Returns true if anything was deleted.
   */
  delete(entry: EntryType): boolean {
    return this.inner.delete(entry);
  }

  forEach(fn: (entry: EntryType) => void): void {
    this.inner.forEach((entry, _) => fn(entry));
  }

  toArray(): EntryType[] {
    const result: EntryType[] = [];
    this.forEach(entry => {
      result.push(entry);
    });
    return result;
  }

  isEmpty(): boolean {
    return this.inner.isEmpty();
  }
}
