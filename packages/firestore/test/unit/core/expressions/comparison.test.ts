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

import { EvaluateResult } from '../../../../src/core/expressions';
import { canonifyExpr } from '../../../../src/core/pipeline-util';
import { constant, field } from '../../../../src/lite-api/expressions';
import { FALSE_VALUE, TRUE_VALUE } from '../../../../src/model/values';
import { constantArray, constantMap } from '../../../util/pipelines';

import {
  ComparisonValueTestData,
  ERROR_VALUE,
  errorExpr,
  evaluateToResult,
  evaluateToValue
} from './utils';

describe('Comparison Expressions', () => {
  describe('eq', () => {
    it('returns false for lessThan values', () => {
      ComparisonValueTestData.lessThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.equal(right)),
          `eq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns false for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.equal(right)),
          `eq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns false for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.equal(right)),
          `eq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_any_returnsNull', () => {
      ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
        expect(
          evaluateToResult(constant(null).equal(v)),
          `eq(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(EvaluateResult.newNull());
        expect(
          evaluateToResult(v.equal(constant(null))),
          `eq(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(EvaluateResult.newNull());
      });
    });

    it('null_null_returnsNull', () => {
      expect(
        evaluateToResult(constant(null).equal(constant(null)))
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('Null and missing evaluates to undefined (error)', () => {
      expect(evaluateToValue(constant(null).equal(field('not-exist')))).to.be
        .undefined;
    });

    it('nullInArray_equality', () => {
      expect(
        evaluateToValue(constantArray([null]).equal(constant(1)))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluateToValue(constantArray([null]).equal(constant('1')))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluateToResult(constantArray([null]).equal(constant(null)))
      ).to.be.deep.equal(EvaluateResult.newNull());
      expect(
        evaluateToValue(constantArray([null]).equal(constant(NaN)))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluateToValue(constantArray([null]).equal(constantArray([])))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluateToResult(constantArray([null]).equal(constantArray([NaN])))
      ).to.be.deep.equal(EvaluateResult.newNull());
      expect(
        evaluateToResult(constantArray([null]).equal(constantArray([null])))
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('nullInMap_equality_returnsNull', () => {
      expect(
        evaluateToResult(
          constantMap({ foo: null }).equal(constantMap({ foo: null }))
        )
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('null_missingInMap_equality_returnsFalse', () => {
      expect(
        evaluateToValue(constantMap({ foo: null }).equal(constant({})))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    describe('NaN tests', () => {
      it('nan_number_returnsFalse', () => {
        ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
          expect(
            evaluateToValue(constant(NaN).equal(v)),
            `eq(NaN, ${canonifyExpr(v)})`
          ).to.be.deep.equal(FALSE_VALUE);
          expect(
            evaluateToValue(v.equal(constant(NaN))),
            `eq(${canonifyExpr(v)}, NaN)`
          ).to.be.deep.equal(FALSE_VALUE);
        });
      });

      it('nan_nan_returnsFalse', () => {
        expect(
          evaluateToValue(constant(NaN).equal(constant(NaN)))
        ).to.be.deep.equal(FALSE_VALUE);
      });

      it('nan_otherType_returnsFalse', () => {
        ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
          // Exclude numeric values as they are already tested above
          if (!ComparisonValueTestData.NUMERIC_VALUES.includes(v)) {
            expect(
              evaluateToValue(constant(NaN).equal(v)),
              `eq(NaN, ${canonifyExpr(v)})`
            ).to.be.deep.equal(FALSE_VALUE);
            expect(
              evaluateToValue(v.equal(constant(NaN))),
              `eq(${canonifyExpr(v)}, NaN)`
            ).to.be.deep.equal(FALSE_VALUE);
          }
        });
      });

      it('nanInArray_equality_returnsFalse', () => {
        expect(
          evaluateToValue(constantArray([NaN]).equal(constantArray([NaN])))
        ).to.be.deep.equal(FALSE_VALUE);
      });

      it('nanInMap_equality_returnsFalse', () => {
        expect(
          evaluateToValue(
            constantMap({ foo: NaN }).equal(constantMap({ foo: NaN }))
          )
        ).to.be.deep.equal(FALSE_VALUE);
      });
    }); // end describe NaN tests

    describe('Array tests', () => {
      it('array_ambiguousNumerics', () => {
        expect(
          evaluateToValue(constantArray([1]).equal(constantArray([1.0])))
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    describe('Map tests', () => {
      it('map_ambiguousNumerics', () => {
        expect(
          evaluateToValue(
            constantMap({ foo: 1, bar: 42.0 }).equal(
              constantMap({ bar: 42, foo: 1.0 })
            )
          )
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    describe('Error tests', () => {
      it('error_any_returnsError', () => {
        ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
          expect(evaluateToValue(errorExpr().equal(v))).to.be.deep.equal(
            ERROR_VALUE
          );
          expect(evaluateToValue(v.equal(errorExpr()))).to.be.deep.equal(
            ERROR_VALUE
          );
        });
      });

      it('error_error_returnsError', () => {
        expect(
          evaluateToValue(errorExpr().equal(errorExpr()))
        ).to.be.deep.equal(ERROR_VALUE);
      });

      it('error_null_returnsError', () => {
        expect(
          evaluateToValue(errorExpr().equal(constant(null)))
        ).to.be.deep.equal(ERROR_VALUE);
      });
    }); // end describe Error tests
  });

  describe('gte', () => {
    it('returns false for lessThan values', () => {
      ComparisonValueTestData.lessThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.greaterThanOrEqual(right)),
          `gte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns true for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.greaterThanOrEqual(right)),
          `gte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns false for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.greaterThanOrEqual(right)),
          `gte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_any_returnsNull', () => {
      ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
        expect(
          evaluateToResult(constant(null).greaterThanOrEqual(v)),
          `gte(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(EvaluateResult.newNull());
        expect(
          evaluateToResult(v.greaterThanOrEqual(constant(null))),
          `gte(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(EvaluateResult.newNull());
      });
    });

    it('null_null_returnsTrue', () => {
      expect(
        evaluateToResult(constant(null).greaterThanOrEqual(constant(null)))
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('nan_number_returnsFalse', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(
          evaluateToValue(constant(NaN).greaterThanOrEqual(v)),
          `gte(NaN, ${canonifyExpr(v)})`
        ).to.be.deep.equal(FALSE_VALUE);
        expect(
          evaluateToValue(v.greaterThanOrEqual(constant(NaN))),
          `gte(${canonifyExpr(v)}, NaN)`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('nan_nan_returnsFalse', () => {
      expect(
        evaluateToValue(constant(NaN).greaterThanOrEqual(constant(NaN)))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('nanInArray_returnsFalse', () => {
      expect(
        evaluateToValue(
          constantArray([NaN]).greaterThanOrEqual(constantArray([NaN]))
        )
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      // Adapt as needed for references
      expect(
        evaluateToValue(field('not-exist').greaterThanOrEqual(constant(1)))
      ).to.be.undefined; // Or appropriate error handling
    });
  }); // end describe('gte')

  describe('gt', () => {
    it('returns false for equal values', () => {
      ComparisonValueTestData.equivalentValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.greaterThan(right)),
          `gt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns false for lessThan values', () => {
      ComparisonValueTestData.lessThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.greaterThan(right)),
          `gt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns true for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.greaterThan(right)),
          `gt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns false for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.greaterThan(right)),
          `gt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_any_returnsNull', () => {
      ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
        expect(
          evaluateToResult(constant(null).greaterThan(v)),
          `gt(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(EvaluateResult.newNull());
        expect(
          evaluateToResult(v.greaterThan(constant(null))),
          `gt(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(EvaluateResult.newNull());
      });
    });

    it('null_null_returnsFalse', () => {
      expect(
        evaluateToResult(constant(null).greaterThan(constant(null)))
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('nan_number_returnsFalse', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(evaluateToValue(constant(NaN).greaterThan(v))).to.be.deep.equal(
          FALSE_VALUE
        );
        expect(evaluateToValue(v.greaterThan(constant(NaN)))).to.be.deep.equal(
          FALSE_VALUE
        );
      });
    });

    it('nan_nan_returnsFalse', () => {
      expect(
        evaluateToValue(constant(NaN).greaterThan(constant(NaN)))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('nanInArray_returnsFalse', () => {
      expect(
        evaluateToValue(constantArray([NaN]).greaterThan(constantArray([NaN])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      // Adapt as needed for references
      expect(evaluateToValue(field('not-exist').greaterThan(constant(1)))).to.be
        .undefined; // Or appropriate error handling
    });
  }); // end describe('gt')

  describe('lte', () => {
    it('returns true for lessThan values', () => {
      ComparisonValueTestData.lessThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.lessThanOrEqual(right)),
          `lte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns false for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.lessThanOrEqual(right)),
          `lte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns false for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.lessThanOrEqual(right)),
          `lte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_any_returnsNull', () => {
      ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
        expect(
          evaluateToResult(constant(null).lessThanOrEqual(v)),
          `lte(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(EvaluateResult.newNull());
        expect(
          evaluateToResult(v.lessThanOrEqual(constant(null))),
          `lte(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(EvaluateResult.newNull());
      });
    });

    it('null_null_returnsNull', () => {
      expect(
        evaluateToResult(constant(null).lessThanOrEqual(constant(null)))
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('nan_number_returnsFalse', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(
          evaluateToValue(constant(NaN).lessThanOrEqual(v))
        ).to.be.deep.equal(FALSE_VALUE);
        expect(
          evaluateToValue(v.lessThanOrEqual(constant(NaN)))
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('nan_nan_returnsFalse', () => {
      expect(
        evaluateToValue(constant(NaN).lessThanOrEqual(constant(NaN)))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('nanInArray_returnsFalse', () => {
      expect(
        evaluateToValue(
          constantArray([NaN]).lessThanOrEqual(constantArray([NaN]))
        )
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      // Adapt as needed for references
      expect(evaluateToValue(field('not-exist').lessThanOrEqual(constant(1))))
        .to.be.undefined; // Or appropriate error handling
    });
  }); // end describe('lte')

  describe('lt', () => {
    it('returns false for equal values', () => {
      ComparisonValueTestData.equivalentValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.lessThan(right)),
          `lt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns true for lessThan values', () => {
      ComparisonValueTestData.lessThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.lessThan(right)),
          `lt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns false for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.lessThan(right)),
          `lt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns false for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.lessThan(right)),
          `lt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_any_returnsNull', () => {
      ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
        expect(
          evaluateToResult(constant(null).lessThan(v)),
          `lt(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(EvaluateResult.newNull());
        expect(
          evaluateToResult(v.lessThan(constant(null))),
          `lt(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(EvaluateResult.newNull());
      });
    });

    it('null_null_returnsNull', () => {
      expect(
        evaluateToResult(constant(null).lessThan(constant(null)))
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('nan_number_returnsFalse', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(evaluateToValue(constant(NaN).lessThan(v))).to.be.deep.equal(
          FALSE_VALUE
        );
        expect(evaluateToValue(v.lessThan(constant(NaN)))).to.be.deep.equal(
          FALSE_VALUE
        );
      });
    });

    it('nan_nan_returnsFalse', () => {
      expect(
        evaluateToValue(constant(NaN).lessThan(constant(NaN)))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('nanInArray_returnsFalse', () => {
      expect(
        evaluateToValue(constantArray([NaN]).lessThan(constantArray([NaN])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      // Adapt as needed for references
      expect(evaluateToValue(field('not-exist').lessThan(constant(1)))).to.be
        .undefined; // Or appropriate error handling
    });
  }); // end describe('lt')

  describe('neq', () => {
    it('returns true for lessThan values', () => {
      ComparisonValueTestData.lessThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.notEqual(right)),
          `neq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns true for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.notEqual(right)),
          `neq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns true for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(left.notEqual(right)),
          `neq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('null_any_returnsNull', () => {
      expect(
        evaluateToResult(constant(null).notEqual(constant(42)))
      ).to.be.deep.equal(EvaluateResult.newNull());
      expect(
        evaluateToResult(constant(null).notEqual(constant('matang')))
      ).to.be.deep.equal(EvaluateResult.newNull());
      expect(
        evaluateToResult(constant(null).notEqual(constant(true)))
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('null_null_returnsNull', () => {
      expect(
        evaluateToResult(constant(null).notEqual(constant(null)))
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('nan_number_returnsTrue', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(evaluateToValue(constant(NaN).notEqual(v))).to.be.deep.equal(
          TRUE_VALUE
        );
        expect(evaluateToValue(v.notEqual(constant(NaN)))).to.be.deep.equal(
          TRUE_VALUE
        );
      });
    });

    it('nan_nan_returnsTrue', () => {
      expect(
        evaluateToValue(constant(NaN).notEqual(constant(NaN)))
      ).to.be.deep.equal(TRUE_VALUE);
    });

    it('map_ambiguousNumerics', () => {
      expect(
        evaluateToValue(
          constantMap({ foo: 1, bar: 42.0 }).notEqual(
            constantMap({ foo: 1.0, bar: 42 })
          )
        )
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('array_ambiguousNumerics', () => {
      expect(
        evaluateToValue(constantArray([1]).notEqual(constantArray([1.0])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      expect(evaluateToValue(field('not-exist').notEqual(constant(1)))).to.be
        .undefined; // Or appropriate error handling
    });
  }); // end describe('neq')
});
