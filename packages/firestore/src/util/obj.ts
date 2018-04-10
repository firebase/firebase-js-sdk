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

import { assert } from './assert';

export interface Dict<V> {
  [stringKey: string]: V;
  [numberKey: number]: V;
}

export function contains<V>(obj: Dict<V>, key: string | number): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function get<V>(obj: Dict<V>, key: string | number): V | null {
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : null;
}

export function size<V>(obj: Dict<V>): number {
  let count = 0;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      count++;
    }
  }
  return count;
}

/** Returns the given value if it's defined or the defaultValue otherwise. */
export function defaulted<V>(value: V | undefined, defaultValue: V): V {
  return value !== undefined ? value : defaultValue;
}

export function forEachNumber<V>(
  obj: Dict<V>,
  fn: (key: number, val: V) => void
): void {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const num = Number(key);
      if (!isNaN(num)) {
        fn(num, obj[key]);
      }
    }
  }
}

export function forEach<V>(
  obj: Dict<V>,
  fn: (key: string, val: V) => void
): void {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      fn(key, obj[key]);
    }
  }
}

export function lookupOrInsert<V>(
  obj: Dict<V>,
  key: string | number,
  valFn: () => V
): V {
  if (!contains(obj, key)) {
    obj[key] = valFn();
  }
  return obj[key];
}

export function isEmpty<V>(obj: Dict<V>): boolean {
  assert(
    obj != null && typeof obj === 'object',
    'isEmpty() expects object parameter.'
  );
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return false;
    }
  }
  return true;
}

export function shallowCopy<V>(obj: Dict<V>): Dict<V> {
  assert(
    obj && typeof obj === 'object',
    'shallowCopy() expects object parameter.'
  );
  const result: Dict<V> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key];
    }
  }
  return result;
}
