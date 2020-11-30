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

import { use } from 'chai';

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
  if (left && typeof left === 'object' && right && typeof right === 'object') {
    // The `isEqual` check below returns true if firestore-exp types are
    // compared with API types from Firestore classic. We do want to
    // differentiate between these types in our tests to ensure that the we do
    // not return firestore-exp types in the classic SDK.
    let leftObj = left as Record<string, unknown>;
    let rightObj = right as Record<string, unknown>;
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
  if (Object(left) !== left) {
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

/** The original equality function passed in by chai(). */
let originalFunction: ((r: unknown, l: unknown) => boolean) | null = null;

export function addEqualityMatcher(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...customMatchers: Array<CustomMatcher<any>>
): void {
  let isActive = true;

  before(() => {
    use((chai, utils) => {
      const Assertion = chai.Assertion;

      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      const assertEql = (_super: (r: unknown, l: unknown) => boolean) => {
        originalFunction = originalFunction || _super;
        return function (
          this: Chai.Assertion,
          expected?: unknown,
          msg?: unknown
        ): void {
          if (isActive) {
            utils.flag(this, 'message', msg);
            const actual = utils.flag(this, 'object');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const assertion = new (chai.Assertion as any)();
            utils.transferFlags(this, assertion, /*includeAll=*/ true);
            // NOTE: Unlike the top-level chai assert() method, Assertion.assert()
            // takes the expected value before the actual value.
            assertion.assert(
              customDeepEqual(customMatchers, actual, expected),
              'expected #{act} to roughly deeply equal #{exp}',
              'expected #{act} to not roughly deeply equal #{exp}',
              expected,
              actual,
              /*showDiff=*/ true
            );
          } else if (originalFunction) {
            originalFunction.call(this, expected, msg);
          }
        };
      };

      Assertion.overwriteMethod('eql', assertEql);
      Assertion.overwriteMethod('eqls', assertEql);
    });
  });

  after(() => {
    isActive = false;
  });
}
