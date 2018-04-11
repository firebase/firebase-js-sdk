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

import { use } from 'chai';

/**
 * @file This file provides a helper function to add a matcher that matches
 * based on an objects isEqual method.  If the isEqual method is present one
 * either object it is used to determine equality, else mocha's default isEqual
 * implementation is used.
 */

function customDeepEqual(left, right): boolean {
  /**
   * START: Custom compare logic
   */
  if (left && typeof left.isEqual === 'function') return left.isEqual(right);
  if (right && typeof right.isEqual === 'function') return right.isEqual(left);
  /**
   * END: Custom compare logic
   */
  if (left === right) return true;
  if (
    typeof left === 'number' &&
    typeof right === 'number' &&
    isNaN(left) &&
    isNaN(right)
  ) {
    return true;
  }
  if (typeof left !== typeof right) return false; // needed for structurally different objects
  if (Object(left) !== left) return false; // primitive values
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
    if (!customDeepEqual(left[key], right[key])) return false;
  }
  return true;
}

/** The original equality function passed in by chai(). */
let originalFunction = null;

export function addEqualityMatcher(): void {
  let isActive = true;

  before(() => {
    use((chai, utils) => {
      const Assertion = chai.Assertion;

      const assertEql = _super => {
        originalFunction = originalFunction || _super;
        return function(...args): void {
          if (isActive) {
            const [right, msg] = args;
            utils.flag(this, 'message', msg);
            const left = utils.flag(this, 'object');

            chai.assert(
              customDeepEqual(left, right),
              'expected #{act} to roughly deeply equal #{exp}',
              'expected #{act} to not roughly deeply equal #{exp}',
              left,
              right,
              true
            );
          } else {
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
