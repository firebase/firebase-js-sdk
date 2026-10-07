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
 * Duck-typed interface for objects that have an isEqual() method.
 *
 * Note: This is copied from src/util/misc.ts to avoid importing private types.
 */
export interface Equatable<T> {
  isEqual(other: T): boolean;
}

/**
 * Custom equals override for types that have a free-standing equals functions
 *  (such as `queryEquals()`).
 */
export interface CustomMatcher<T> {
  equalsFn: (left: T, right: T) => boolean;
  // eslint-disable-next-line @typescript-eslint/ban-types
  forType: Function;
}

/**
 * @file This file provides a helper function to add a matcher that matches
 * based on an objects isEqual method.  If the isEqual method is present one
 * either object it is used to determine equality, else mocha's default isEqual
 * implementation is used.
 */

function customDeepEqual(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customMatchers: Array<CustomMatcher<any>>,
  left: unknown,
  right: unknown
): boolean {
  for (const customMatcher of customMatchers) {
    if (
      left instanceof customMatcher.forType &&
      right instanceof customMatcher.forType
    ) {
      return customMatcher.equalsFn(left, right);
    }
  }
  // Delegate to asymmetric matchers (e.g. `expect.anything()`, `expect.objectContaining()`).
  if (
    typeof right === 'object' &&
    right !== null &&
    'asymmetricMatch' in right &&
    typeof (right as { asymmetricMatch: unknown }).asymmetricMatch ===
      'function'
  ) {
    return (
      right as { asymmetricMatch: (v: unknown) => boolean }
    ).asymmetricMatch(left);
  }
  if (left && typeof left === 'object' && right && typeof right === 'object') {
    // The `isEqual` check below returns true if firestore-exp types are
    // compared with API types from Firestore classic. We do want to
    // differentiate between these types in our tests to ensure that the we do
    // not return firestore-exp types in the classic SDK.
    const leftObj = left as Record<string, unknown>;
    const rightObj = right as Record<string, unknown>;
    if (
      leftObj.constructor.name === rightObj.constructor.name &&
      leftObj.constructor !== rightObj.constructor
    ) {
      return false;
    }
  }
  if (typeof left === 'object' && left && 'isEqual' in left) {
    return (left as Equatable<unknown>).isEqual(right);
  }
  if (typeof right === 'object' && right && 'isEqual' in right) {
    return (right as Equatable<unknown>).isEqual(left);
  }
  if (left === right) {
    if (left === 0.0 && right === 0.0) {
      // Firestore treats -0.0 and +0.0 as not equals, even though JavaScript
      // treats them as equal by default. Implemented based on MDN's Object.is()
      // polyfill.
      return 1 / left === 1 / right;
    } else {
      return true;
    }
  }
  if (
    typeof left === 'number' &&
    typeof right === 'number' &&
    isNaN(left) &&
    isNaN(right)
  ) {
    return true;
  }
  if (typeof left !== typeof right) {
    return false;
  } // needed for structurally different objects
  if (Object(left) !== left || Object(right) !== right) {
    return false;
  } // primitive values
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keys = Object.keys(left as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (keys.length !== Object.keys(right as any).length) {
    return false;
  }
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!Object.prototype.hasOwnProperty.call(right, key)) {
      return false;
    }
    if (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      !customDeepEqual(customMatchers, (left as any)[key], (right as any)[key])
    ) {
      return false;
    }
  }
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const activeMatcherSets: Array<Array<CustomMatcher<any>>> = [];
let vitestTesterRegistered = false;

export function addEqualityMatcher(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...customMatchers: Array<CustomMatcher<any>>
): void {
  if (!vitestTesterRegistered) {
    vitestTesterRegistered = true;
    expect.addEqualityTesters([
      (left: unknown, right: unknown) => {
        if (activeMatcherSets.length === 0) {
          return undefined;
        }
        const mergedMatchers = activeMatcherSets.flat();
        return customDeepEqual(mergedMatchers, left, right);
      }
    ]);
  }

  beforeAll(() => {
    activeMatcherSets.push(customMatchers);
  });

  afterAll(() => {
    const idx = activeMatcherSets.lastIndexOf(customMatchers);
    if (idx !== -1) {
      activeMatcherSets.splice(idx, 1);
    }
  });
}
