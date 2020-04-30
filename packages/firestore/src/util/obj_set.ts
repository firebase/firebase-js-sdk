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

import { Equatable } from './misc';
import { ObjectMap } from './obj_map';

type Entry<K, V> = [K, V];

/**
 * A set implementation that uses strings as keys. Objects must implement the
 * Equatable interface and must be immutable. Entries in the set are stored
 * together with the key being produced from the mapKeyFn. This set
 * automatically handles collisions of keys.
 */
export class ObjectSet<ValueType extends Equatable<ValueType>> {
  private backingMap: ObjectMap<ValueType, ValueType>;

  constructor(private mapKeyFn: (key: ValueType) => string) {
    this.backingMap = new ObjectMap<ValueType, ValueType>(mapKeyFn);
  }

  has(value: ValueType): boolean {
    return this.backingMap.has(value);
  }

  delete(value: ValueType): void {
    this.backingMap.delete(value);
  }

  add(value: ValueType): void {
    this.backingMap.set(value, value);
  }

  forEach(fn: (val: ValueType) => void): void {
    this.backingMap.forEach(v => {
      fn(v);
    });
  }

  isEmpty(): boolean {
    return this.backingMap.isEmpty();
  }

  isEqual(fields: ObjectSet<ValueType>) : boolean {
    return this.backingMap.isEqual(fields.backingMap);
  }
}
