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
import { _allSettled } from './promise';

describe('platform_browser/messagechannel/promise', () => {
  describe('_allSettled', () => {
    it('should work with a single successfull promise', async () => {
      const result = await _allSettled([Promise.resolve('foo')]);
      expect(result).to.have.deep.members([
        {
          fulfilled: true,
          value: 'foo'
        }
      ]);
    });

    it('should work with a failed promise', async () => {
      const result = await _allSettled([Promise.reject('bar')]);
      expect(result).to.have.deep.members([
        {
          fulfilled: false,
          reason: 'bar'
        }
      ]);
    });

    it('should work with mixed promises', async () => {
      const result = await _allSettled([
        Promise.resolve('foo'),
        Promise.reject('bar')
      ]);
      expect(result).to.have.deep.members([
        {
          fulfilled: true,
          value: 'foo'
        },
        {
          fulfilled: false,
          reason: 'bar'
        }
      ]);
    });
  });
});
