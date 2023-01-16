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

import { debugAssert } from './assert';

export interface Dict<V> {
  [stringKey: string]: V;
}

export function objectSize(obj: object): number {
  let count = 0;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      count++;
    }
  }
  return count;
}

export function forEach<V>(
  obj: Dict<V> | undefined,
  fn: (key: string, val: V) => void
): void {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      fn(key, obj[key]);
    }
  }
}

export function mapToArray<V, R>(
  obj: Dict<V>,
  fn: (element: V, key: string, obj: Dict<V>) => R
): R[] {
  const result: R[] = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result.push(fn(obj[key], key, obj));
    }
  }
  return result;
}

export function isEmpty<V>(obj: Dict<V>): boolean {
  debugAssert(
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
