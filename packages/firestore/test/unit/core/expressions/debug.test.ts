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

import {
  ComparisonValueTestData,
  errorExpr,
  evaluateToValue,
  UNSET_VALUE
} from './utils';
import {
  constant,
  exists,
  field,
  isError,
  not
} from '../../../../src/lite-api/expressions';
import { canonifyExpr } from '../../../../src/core/pipeline-util';
import {
  FALSE_VALUE,
  isNullValue,
  TRUE_VALUE
} from '../../../../src/model/values';
import { constantArray, constantMap } from '../../../util/pipelines';

describe('Debugging Functions', () => {
  describe('exists', () => {
    it('anythingButUnset_returnsTrue', () => {
      ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
        expect(
          evaluateToValue(exists(v)),
          `exists(${canonifyExpr(v)})`
        ).to.deep.equal(TRUE_VALUE);
      });
    });

    it('null_returnsTrue', () => {
      expect(evaluateToValue(exists(constant(null)))).to.deep.equal(TRUE_VALUE);
    });

    it('error_returnsError', () => {
      expect(evaluateToValue(exists(errorExpr()))).to.be.undefined;
    });

    it('unset_withNotExists_returnsTrue', () => {
      const functionExpr = exists(UNSET_VALUE);
      expect(evaluateToValue(not(functionExpr))).to.deep.equal(TRUE_VALUE);
    });

    it('unset_returnsFalse', () => {
      expect(evaluateToValue(exists(UNSET_VALUE))).to.deep.equal(FALSE_VALUE);
    });

    it('emptyArray_returnsTrue', () => {
      expect(evaluateToValue(exists(constantArray([])))).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('emptyMap_returnsTrue', () => {
      expect(evaluateToValue(exists(constantMap({})))).to.deep.equal(
        TRUE_VALUE
      );
    });
  });

  describe('isError', () => {
    it('error_returnsTrue', () => {
      // errorExpr() simulates an expression evaluation error
      expect(evaluateToValue(isError(errorExpr()))).to.deep.equal(TRUE_VALUE);
    });

    it('field_missing_returnsFalse', () => {
      // Evaluate with context that does *not* contain 'target'
      expect(
        evaluateToValue(isError(field('target')), { someOtherField: 1 })
      ).to.deep.equal(FALSE_VALUE);
    });

    it('non_error_returnsFalse', () => {
      expect(evaluateToValue(isError(constant(42)))).to.deep.equal(FALSE_VALUE);
    });

    it('explicit_null_returnsFalse', () => {
      // constant(null) evaluates to the NullValue proto
      expect(evaluateToValue(isError(constant(null)))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('unset_returnsFalse', () => {
      // UNSET_VALUE represents reading a non-existent field, which is not an error itself.
      expect(evaluateToValue(isError(UNSET_VALUE))).to.deep.equal(FALSE_VALUE);
    });

    // Note: The Java 'divideByZero_returnsTrue' is covered by 'error_returnsTrue'
    // using errorExpr() which simulates a general evaluation error.

    it('anythingButError_returnsFalse', () => {
      ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
        expect(
          evaluateToValue(isError(v)),
          `isError(${canonifyExpr(v)})`
        ).to.deep.equal(FALSE_VALUE);
      });
      // Also test explicit null and integer 0 which might not be in the main list
      expect(evaluateToValue(isError(constant(null)))).to.deep.equal(
        FALSE_VALUE
      );
      expect(evaluateToValue(isError(constant(0)))).to.deep.equal(FALSE_VALUE);
    });
  });
});
