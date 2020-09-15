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
 * WITHOUT WARRANTIES OR CONDITIONS OF unknown KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect } from 'chai';

import { mergeStrings } from './string_merger';
import { FirebaseError } from '@firebase/util';
// import { ERROR_FACTORY, ErrorCode } from './errors';
import '../../test/setup';

describe('Firebase Performance > string_merger', () => {
  describe('#mergeStrings', () => {
    it('Throws exception when string length has | diff | > 1', () => {
      // const expectedError = ERROR_FACTORY.create(ErrorCode.INVALID_STRING_MERGER_PARAMETER);
      expect(() => mergeStrings('', '123')).to.throw(
        FirebaseError,
        'performance/invalid String merger input'
      );
    });

    it('returns empty string when both inputs are empty', () => {
      expect(mergeStrings('', '')).equal('');
    });

    it('returns merge result string when both inputs have same length', () => {
      expect(mergeStrings('12345', 'abcde')).equal('1a2b3c4d5e');
    });

    it('returns merge result string when input length diff == 1', () => {
      expect(() => mergeStrings('1234', 'abcde')).to.throw(
        FirebaseError,
        'performance/invalid String merger input'
      );
    });

    it('returns merge result string when input length diff == -1', () => {
      expect(mergeStrings('12345', 'abcd')).equal('1a2b3c4d5');
    });
  });
});
