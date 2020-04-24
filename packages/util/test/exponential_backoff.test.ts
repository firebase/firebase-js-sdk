/**
 * @license
 * Copyright 2019 Google LLC
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

import { expect } from 'chai';
import {
  calculateBackoffMillis,
  MAX_VALUE_MILLIS,
  RANDOM_FACTOR
} from '../src/exponential_backoff';

describe('ExponentialBackoff', () => {
  // Based on
  // https://github.com/google/closure-library/blob/master/closure/goog/math/exponentialbackoff_test.js#L102
  describe('backoff', () => {
    it('increments count and calculates backoff millis', () => {
      function getMinBackoff(baseValue: number): number {
        return Math.round(baseValue - baseValue * RANDOM_FACTOR);
      }

      function getMaxBackoff(baseValue: number): number {
        return Math.round(baseValue + baseValue * RANDOM_FACTOR);
      }

      // Deviation from Closure: starts from zero exponent.
      expect(calculateBackoffMillis(0)).to.be.within(
        getMinBackoff(1000),
        getMaxBackoff(1000)
      );

      expect(calculateBackoffMillis(1)).to.be.within(
        getMinBackoff(2000),
        getMaxBackoff(2000)
      );

      expect(calculateBackoffMillis(2)).to.be.within(
        getMinBackoff(4000),
        getMaxBackoff(4000)
      );

      expect(calculateBackoffMillis(4)).to.be.within(
        getMinBackoff(8000),
        MAX_VALUE_MILLIS
      );

      expect(calculateBackoffMillis(5)).to.be.within(
        getMinBackoff(16000),
        MAX_VALUE_MILLIS
      );
    });
  });
});
