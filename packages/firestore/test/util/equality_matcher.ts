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

import { use } from 'chai';
import { Equatable } from '../../src/util/misc';

/**
 * @file This file provides a helper function to add a matcher that matches
 * based on an objects isEqual method.  If the isEqual method is present one
 * either object it is used to determine equality, else mocha's default isEqual
 * implementation is used.
 */

function customDeepEqual(left: unknown, right: unknown): boolean {
  /**
   * START: Custom compare logic
   */
  if (typeof left === 'object' && left && 'isEqual' in left) {
    return (left as Equatable<unknown>).isEqual(right);
  }
  if (typeof right === 'object' && right && 'isEqual' in right) {
    return (right as Equatable<unknown>).isEqual(left);
  }
  /**
   * END: Custom compare logic
   */
  if (left === right) {
    return true;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!customDeepEqual((left as any)[key], (right as any)[key])) {
      return false;
    }
  }
  return true;
}

/** The original equality function passed in by chai(). */
let originalFunction: ((r: unknown, l: unknown) => boolean) | null = null;

export function addEqualityMatcher(): void {
  let isActive = true;

  before(() => {
    use((chai, utils) => {
      const Assertion = chai.Assertion;

      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      const assertEql = (_super: (r: unknown, l: unknown) => boolean) => {
        originalFunction = originalFunction || _super;
        return function(...args: unknown[]): void {
          if (isActive) {
            const [expected, msg] = args;
            utils.flag(this, 'message', msg);
            const actual = utils.flag(this, 'object');

            const assertion = new chai.Assertion();
            utils.transferFlags(this, assertion, /*includeAll=*/ true);
            // NOTE: Unlike the top-level chai assert() method, Assertion.assert()
            // takes the expected value before the actual value.
            assertion.assert(
              customDeepEqual(actual, expected),
              'expected #{act} to roughly deeply equal #{exp}',
              'expected #{act} to not roughly deeply equal #{exp}',
              expected,
              actual,
              /*showDiff=*/ true
            );
          } else if (originalFunction) {
            originalFunction.apply(this, args);
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
