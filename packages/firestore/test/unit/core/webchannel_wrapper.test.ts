/**
 * @license
 * Copyright 2022 Google LLC
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

// Add some unit tests for classes exported from @firebase/webchannel-wrapper.
// These tests are mostly to ensure that the exported classes correctly map to
// underlying functionality from google-closure-library.

import { Integer } from '@firebase/webchannel-wrapper';
import { expect } from 'chai';

// TODO: REMOVE ONLY()
describe.only('Integer', () => {
  it('constructor should create distinct instances', () => {
    const instance1 = new Integer([1], 0);
    const instance2 = new Integer([1], 0);
    expect(instance1).is.instanceof(Integer);
    expect(instance2).is.instanceof(Integer);
    expect(instance1).is.not.equal(instance2);
  });
  it('constructor should construct 1 and -1, 2 and -2', () => {
    const positiveOne = new Integer([1], 0);
    expect(positiveOne.toNumber()).equals(1);
    const negativeOne = new Integer([-1], -1);
    expect(negativeOne.toNumber()).equals(-1);
    const positiveTwo = new Integer([2], 0);
    expect(positiveTwo.toNumber()).equals(2);
    const negativeTwo = new Integer([-2], -1);
    expect(negativeTwo.toNumber()).equals(-2);
  });
});
