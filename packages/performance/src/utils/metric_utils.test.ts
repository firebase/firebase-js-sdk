/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF unknown KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect } from 'chai';

import { isValidMetricName } from './metric_utils';
import {
  FIRST_PAINT_COUNTER_NAME,
  FIRST_CONTENTFUL_PAINT_COUNTER_NAME,
  FIRST_INPUT_DELAY_COUNTER_NAME
} from '../constants';
import '../../test/setup';

describe('Firebase Performance > metric_utils', () => {
  describe('#isValidMetricName', () => {
    it('returns true when name is valid', () => {
      expect(isValidMetricName('validCustom_Metric_Name')).to.be.true;
    });

    it('returns false when name is blank', () => {
      expect(isValidMetricName('')).to.be.false;
    });

    it('returns false when name is too long', () => {
      const longMetricName =
        'too_long_metric_name_over_one_hundred_characters_too_long_metric_name_over_one_' +
        'hundred_characters_too';
      expect(isValidMetricName(longMetricName)).to.be.false;
    });

    it('returns false when name starts with a reserved prefix', () => {
      expect(isValidMetricName('_invalidMetricName')).to.be.false;
    });

    it('returns true for first paint metric', () => {
      expect(
        isValidMetricName(FIRST_PAINT_COUNTER_NAME, '_wt_http://example.com')
      ).to.be.true;
    });

    it('returns true for first contentful paint metric', () => {
      expect(
        isValidMetricName(
          FIRST_CONTENTFUL_PAINT_COUNTER_NAME,
          '_wt_http://example.com'
        )
      ).to.be.true;
    });

    it('returns true for first input delay metric', () => {
      expect(
        isValidMetricName(
          FIRST_INPUT_DELAY_COUNTER_NAME,
          '_wt_http://example.com'
        )
      ).to.be.true;
    });

    it('returns false if first paint metric name is used outside of page load traces', () => {
      expect(isValidMetricName(FIRST_PAINT_COUNTER_NAME, 'some_randome_trace'))
        .to.be.false;
    });

    it('returns false if first contentful paint metric name is used outside of page load traces', () => {
      expect(
        isValidMetricName(
          FIRST_CONTENTFUL_PAINT_COUNTER_NAME,
          'some_randome_trace'
        )
      ).to.be.false;
    });

    it('returns false if first input delay metric name is used outside of page load traces', () => {
      expect(
        isValidMetricName(FIRST_INPUT_DELAY_COUNTER_NAME, 'some_randome_trace')
      ).to.be.false;
    });
  });
});
