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

/**
 * Returns true iff the array contains the value using strong equality.
 */
export function includes<T>(array: T[], value: T): boolean {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === value) {
      return true;
    }
  }
  return false;
}

/**
 * Returns true iff the array contains any value mathching the predicate
 */
export function some<T>(array: T[], predicate: (t: T) => boolean): boolean {
  for (let i = 0; i < array.length; i++) {
    if (predicate(array[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Calls predicate function for each item in the array until the predicate
 * returns true, at which point the index of that item is returned.  If the
 * predicate does not return true for any item, null is returned.
 */
export function findIndex<A>(
  array: A[],
  predicate: (value: A) => boolean
): number | null {
  for (let i = 0; i < array.length; i++) {
    if (predicate(array[i])) {
      return i;
    }
  }
  return null;
}
