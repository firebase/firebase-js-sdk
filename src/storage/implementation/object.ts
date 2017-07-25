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

/**
 * @fileoverview Contains methods for working with objects.
 */
export function contains(obj: Object, prop: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function forEach<T>(
  obj: { [key: string]: T },
  f: (p1: string, p2: T) => void
) {
  for (let key in obj) {
    if (contains(obj, key)) {
      f(key, obj[key]);
    }
  }
}

export function clone<T>(obj?: { [key: string]: any } | null): T {
  if (obj == null) {
    return {} as T;
  }

  let c: { [name: string]: any } = {};
  forEach(obj, function(key, val) {
    c[key] = val;
  });
  return c as T;
}
