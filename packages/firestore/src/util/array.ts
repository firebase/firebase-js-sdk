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
 * Returns true iff the array contains any value matching the predicate
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

/**
 * Compares two array for equality using comparator. The method computes the
 * intersection and invokes `onAdd` for every element that is in `after` but not
 * `before`. `onRemove` is invoked for every element in `before` but missing
 * from `after`.
 *
 * The method creates a copy of both `before` and `after` and runs in O(n log
 * n), where n is the size of the two lists.
 *
 * @param before - The elements that exist in the original array.
 * @param after - The elements to diff against the original array.
 * @param comparator - The comparator for the elements in before and after.
 * @param onAdd - A function to invoke for every element that is part of `
 * after` but not `before`.
 * @param onRemove - A function to invoke for every element that is part of
 * `before` but not `after`.
 */
export function diffArrays<T>(
  before: T[],
  after: T[],
  comparator: (l: T, r: T) => number,
  onAdd: (entry: T) => void,
  onRemove: (entry: T) => void
): void {
  before = [...before];
  after = [...after];
  before.sort(comparator);
  after.sort(comparator);

  const bLen = before.length;
  const aLen = after.length;
  let a = 0;
  let b = 0;
  while (a < aLen && b < bLen) {
    const cmp = comparator(before[b], after[a]);
    if (cmp < 0) {
      // The element was removed if the next element in our ordered
      // walkthrough is only in `before`.
      onRemove(before[b++]);
    } else if (cmp > 0) {
      // The element was added if the next element in our ordered walkthrough
      // is only in `after`.
      onAdd(after[a++]);
    } else {
      a++;
      b++;
    }
  }
  while (a < aLen) {
    onAdd(after[a++]);
  }
  while (b < bLen) {
    onRemove(before[b++]);
  }
}

/**
 * Verifies equality for an array of objects using the `isEqual` interface.
 *
 * @private
 * @internal
 * @param left Array of objects supporting `isEqual`.
 * @param right Array of objects supporting `isEqual`.
 * @return True if arrays are equal.
 */
export function isArrayEqual<T extends { isEqual: (t: T) => boolean }>(
  left: T[],
  right: T[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; ++i) {
    if (!left[i].isEqual(right[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Verifies equality for an array of primitives.
 *
 * @private
 * @internal
 * @param left Array of primitives.
 * @param right Array of primitives.
 * @return True if arrays are equal.
 */
export function isPrimitiveArrayEqual<T extends number | string>(
  left: T[],
  right: T[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; ++i) {
    if (left[i] !== right[i]) {
      return false;
    }
  }

  return true;
}
