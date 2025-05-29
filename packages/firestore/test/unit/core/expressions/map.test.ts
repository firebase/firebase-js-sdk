/**
 * @license
 * Copyright 2025 Google LLC
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

import { constant, mapGet } from '../../../../src/lite-api/expressions';
import { constantMap } from '../../../util/pipelines';
import { EvaluateResult } from '../../../../src/core/expressions';
import { evaluateToResult, evaluateToValue, expectEqual } from './utils';

describe('Map Functions', () => {
  describe('mapGet', () => {
    it('get_existingKey_returnsValue', () => {
      const map = { a: 1, b: 2, c: 3 };
      expectEqual(evaluateToValue(mapGet(constantMap(map), 'b')), constant(2));
    });

    it('get_missingKey_returnsUnset', () => {
      const map = { a: 1, b: 2, c: 3 };
      expect(evaluateToResult(mapGet(constantMap(map), 'd'))).to.deep.equal(
        EvaluateResult.newUnset()
      );
    });

    it('get_emptyMap_returnsUnset', () => {
      const map = {};
      expect(evaluateToResult(mapGet(constantMap(map), 'd'))).to.deep.equal(
        EvaluateResult.newUnset()
      );
    });

    it('get_wrongMapType_returnsError', () => {
      const map = 'not a map';
      expect(evaluateToValue(mapGet(constant(map), 'd'))).to.be.undefined;
    });

    // it('get_wrongKeyType_returnsError', () => {
    //   const map = {a: 1, b: 2, c: 3};
    //   expect(evaluate(mapGet(constantMap(map), constant(42)))).to.be.undefined;
    // });
  }); // end describe('mapGet')
});
