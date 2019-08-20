/**
 * @license
 * Copyright 2019 Google Inc.
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

import { isValidCustomMetricName } from './metric_utils';

import '../../test/setup';

describe('Firebase Performance > metric_utils', () => {
  describe('#isValidCustomMetricName', () => {
    it('returns true when name is valid', () => {
      expect(isValidCustomMetricName('validCustom_Metric_Name')).to.be.true;
    });

    it('returns false when name is blank', () => {
      expect(isValidCustomMetricName('')).to.be.false;
    });

    it('returns false when name is too long', () => {
      const longMetricName =
        'too_long_metric_name_over_one_hundred_characters_too_long_metric_name_over_one_' +
        'hundred_characters_too';
      expect(isValidCustomMetricName(longMetricName)).to.be.false;
    });

    it('returns false when name starts with a reserved prefix', () => {
      expect(isValidCustomMetricName('_invalidMetricName')).to.be.false;
    });
  });
});
