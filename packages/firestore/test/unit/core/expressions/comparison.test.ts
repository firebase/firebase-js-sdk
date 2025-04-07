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
  constant,
  eq,
  field,
  gt,
  gte,
  lt,
  lte,
  neq
} from '../../../../src/lite-api/expressions';
import { canonifyExpr } from '../../../../src/core/pipeline-util';
import { FALSE_VALUE, TRUE_VALUE } from '../../../../src/model/values';
import { EvaluateResult } from '../../../../src/core/expressions';
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
          evaluateToValue(eq(left, right)),
          `eq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns false for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(eq(left, right)),
          `eq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns false for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(eq(left, right)),
          `eq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_any_returnsNull', () => {
      ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
        expect(
          evaluateToResult(eq(constant(null), v)),
          `eq(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(EvaluateResult.newNull());
        expect(
          evaluateToResult(eq(v, constant(null))),
          `eq(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(EvaluateResult.newNull());
      });
    });

    it('null_null_returnsNull', () => {
      expect(
        evaluateToResult(eq(constant(null), constant(null)))
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('Null and missing evaluates to undefined (error)', () => {
      expect(evaluateToValue(eq(constant(null), field('not-exist')))).to.be
        .undefined;
    });

    it('nullInArray_equality', () => {
      expect(
        evaluateToValue(eq(constantArray([null]), constant(1)))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluateToValue(eq(constantArray([null]), constant('1')))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluateToResult(eq(constantArray([null]), constant(null)))
      ).to.be.deep.equal(EvaluateResult.newNull());
      expect(
        evaluateToValue(eq(constantArray([null]), constant(NaN)))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluateToValue(eq(constantArray([null]), constantArray([])))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluateToResult(eq(constantArray([null]), constantArray([NaN])))
      ).to.be.deep.equal(EvaluateResult.newNull());
      expect(
        evaluateToResult(eq(constantArray([null]), constantArray([null])))
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('nullInMap_equality_returnsNull', () => {
      expect(
        evaluateToResult(
          eq(constantMap({ foo: null }), constantMap({ foo: null }))
        )
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('null_missingInMap_equality_returnsFalse', () => {
      expect(
        evaluateToValue(eq(constantMap({ foo: null }), constant({})))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    describe('NaN tests', () => {
      it('nan_number_returnsFalse', () => {
        ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
          expect(
            evaluateToValue(eq(constant(NaN), v)),
            `eq(NaN, ${canonifyExpr(v)})`
          ).to.be.deep.equal(FALSE_VALUE);
          expect(
            evaluateToValue(eq(v, constant(NaN))),
            `eq(${canonifyExpr(v)}, NaN)`
          ).to.be.deep.equal(FALSE_VALUE);
        });
      });

      it('nan_nan_returnsFalse', () => {
        expect(
          evaluateToValue(eq(constant(NaN), constant(NaN)))
        ).to.be.deep.equal(FALSE_VALUE);
      });

      it('nan_otherType_returnsFalse', () => {
        ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
          // Exclude numeric values as they are already tested above
          if (!ComparisonValueTestData.NUMERIC_VALUES.includes(v)) {
            expect(
              evaluateToValue(eq(constant(NaN), v)),
              `eq(NaN, ${canonifyExpr(v)})`
            ).to.be.deep.equal(FALSE_VALUE);
            expect(
              evaluateToValue(eq(v, constant(NaN))),
              `eq(${canonifyExpr(v)}, NaN)`
            ).to.be.deep.equal(FALSE_VALUE);
          }
        });
      });

      it('nanInArray_equality_returnsFalse', () => {
        expect(
          evaluateToValue(eq(constantArray([NaN]), constantArray([NaN])))
        ).to.be.deep.equal(FALSE_VALUE);
      });

      it('nanInMap_equality_returnsFalse', () => {
        expect(
          evaluateToValue(
            eq(constantMap({ foo: NaN }), constantMap({ foo: NaN }))
          )
        ).to.be.deep.equal(FALSE_VALUE);
      });
    }); // end describe NaN tests

    describe('Array tests', () => {
      it('array_ambiguousNumerics', () => {
        expect(
          evaluateToValue(eq(constantArray([1]), constantArray([1.0])))
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    describe('Map tests', () => {
      it('map_ambiguousNumerics', () => {
        expect(
          evaluateToValue(
            eq(
              constantMap({ foo: 1, bar: 42.0 }),
              constantMap({ bar: 42, foo: 1.0 })
            )
          )
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    describe('Error tests', () => {
      it('error_any_returnsError', () => {
        ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
          expect(evaluateToValue(eq(errorExpr(), v))).to.be.deep.equal(
            ERROR_VALUE
          );
          expect(evaluateToValue(eq(v, errorExpr()))).to.be.deep.equal(
            ERROR_VALUE
          );
        });
      });

      it('error_error_returnsError', () => {
        expect(evaluateToValue(eq(errorExpr(), errorExpr()))).to.be.deep.equal(
          ERROR_VALUE
        );
      });

      it('error_null_returnsError', () => {
        expect(
          evaluateToValue(eq(errorExpr(), constant(null)))
        ).to.be.deep.equal(ERROR_VALUE);
      });
    }); // end describe Error tests
  });

  describe('gte', () => {
    it('returns false for lessThan values', () => {
      ComparisonValueTestData.lessThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(gte(left, right)),
          `gte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns true for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(gte(left, right)),
          `gte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns false for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(gte(left, right)),
          `gte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_any_returnsNull', () => {
      ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
        expect(
          evaluateToResult(gte(constant(null), v)),
          `gte(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(EvaluateResult.newNull());
        expect(
          evaluateToResult(gte(v, constant(null))),
          `gte(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(EvaluateResult.newNull());
      });
    });

    it('null_null_returnsTrue', () => {
      expect(
        evaluateToResult(gte(constant(null), constant(null)))
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('nan_number_returnsFalse', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(
          evaluateToValue(gte(constant(NaN), v)),
          `gte(NaN, ${canonifyExpr(v)})`
        ).to.be.deep.equal(FALSE_VALUE);
        expect(
          evaluateToValue(gte(v, constant(NaN))),
          `gte(${canonifyExpr(v)}, NaN)`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('nan_nan_returnsFalse', () => {
      expect(
        evaluateToValue(gte(constant(NaN), constant(NaN)))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('nanInArray_returnsFalse', () => {
      expect(
        evaluateToValue(gte(constantArray([NaN]), constantArray([NaN])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      // Adapt as needed for references
      expect(evaluateToValue(gte(field('not-exist'), constant(1)))).to.be
        .undefined; // Or appropriate error handling
    });
  }); // end describe('gte')

  describe('gt', () => {
    it('returns false for equal values', () => {
      ComparisonValueTestData.equivalentValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(gt(left, right)),
          `gt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns false for lessThan values', () => {
      ComparisonValueTestData.lessThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(gt(left, right)),
          `gt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns true for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(gt(left, right)),
          `gt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns false for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(gt(left, right)),
          `gt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_any_returnsNull', () => {
      ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
        expect(
          evaluateToResult(gt(constant(null), v)),
          `gt(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(EvaluateResult.newNull());
        expect(
          evaluateToResult(gt(v, constant(null))),
          `gt(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(EvaluateResult.newNull());
      });
    });

    it('null_null_returnsFalse', () => {
      expect(
        evaluateToResult(gt(constant(null), constant(null)))
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('nan_number_returnsFalse', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(evaluateToValue(gt(constant(NaN), v))).to.be.deep.equal(
          FALSE_VALUE
        );
        expect(evaluateToValue(gt(v, constant(NaN)))).to.be.deep.equal(
          FALSE_VALUE
        );
      });
    });

    it('nan_nan_returnsFalse', () => {
      expect(
        evaluateToValue(gt(constant(NaN), constant(NaN)))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('nanInArray_returnsFalse', () => {
      expect(
        evaluateToValue(gt(constantArray([NaN]), constantArray([NaN])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      // Adapt as needed for references
      expect(evaluateToValue(gt(field('not-exist'), constant(1)))).to.be
        .undefined; // Or appropriate error handling
    });
  }); // end describe('gt')

  describe('lte', () => {
    it('returns true for lessThan values', () => {
      ComparisonValueTestData.lessThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(lte(left, right)),
          `lte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns false for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(lte(left, right)),
          `lte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns false for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(lte(left, right)),
          `lte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_any_returnsNull', () => {
      ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
        expect(
          evaluateToResult(lte(constant(null), v)),
          `lte(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(EvaluateResult.newNull());
        expect(
          evaluateToResult(lte(v, constant(null))),
          `lte(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(EvaluateResult.newNull());
      });
    });

    it('null_null_returnsNull', () => {
      expect(
        evaluateToResult(lte(constant(null), constant(null)))
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('nan_number_returnsFalse', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(evaluateToValue(lte(constant(NaN), v))).to.be.deep.equal(
          FALSE_VALUE
        );
        expect(evaluateToValue(lte(v, constant(NaN)))).to.be.deep.equal(
          FALSE_VALUE
        );
      });
    });

    it('nan_nan_returnsFalse', () => {
      expect(
        evaluateToValue(lte(constant(NaN), constant(NaN)))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('nanInArray_returnsFalse', () => {
      expect(
        evaluateToValue(lte(constantArray([NaN]), constantArray([NaN])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      // Adapt as needed for references
      expect(evaluateToValue(lte(field('not-exist'), constant(1)))).to.be
        .undefined; // Or appropriate error handling
    });
  }); // end describe('lte')

  describe('lt', () => {
    it('returns false for equal values', () => {
      ComparisonValueTestData.equivalentValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(lt(left, right)),
          `lt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns true for lessThan values', () => {
      ComparisonValueTestData.lessThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(lt(left, right)),
          `lt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns false for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(lt(left, right)),
          `lt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns false for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(lt(left, right)),
          `lt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_any_returnsNull', () => {
      ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
        expect(
          evaluateToResult(lt(constant(null), v)),
          `lt(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(EvaluateResult.newNull());
        expect(
          evaluateToResult(lt(v, constant(null))),
          `lt(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(EvaluateResult.newNull());
      });
    });

    it('null_null_returnsNull', () => {
      expect(
        evaluateToResult(lt(constant(null), constant(null)))
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('nan_number_returnsFalse', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(evaluateToValue(lt(constant(NaN), v))).to.be.deep.equal(
          FALSE_VALUE
        );
        expect(evaluateToValue(lt(v, constant(NaN)))).to.be.deep.equal(
          FALSE_VALUE
        );
      });
    });

    it('nan_nan_returnsFalse', () => {
      expect(
        evaluateToValue(lt(constant(NaN), constant(NaN)))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('nanInArray_returnsFalse', () => {
      expect(
        evaluateToValue(lt(constantArray([NaN]), constantArray([NaN])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      // Adapt as needed for references
      expect(evaluateToValue(lt(field('not-exist'), constant(1)))).to.be
        .undefined; // Or appropriate error handling
    });
  }); // end describe('lt')

  describe('neq', () => {
    it('returns true for lessThan values', () => {
      ComparisonValueTestData.lessThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(neq(left, right)),
          `neq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns true for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(neq(left, right)),
          `neq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns true for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluateToValue(neq(left, right)),
          `neq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('null_any_returnsNull', () => {
      expect(
        evaluateToResult(neq(constant(null), constant(42)))
      ).to.be.deep.equal(EvaluateResult.newNull());
      expect(
        evaluateToResult(neq(constant(null), constant('matang')))
      ).to.be.deep.equal(EvaluateResult.newNull());
      expect(
        evaluateToResult(neq(constant(null), constant(true)))
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('null_null_returnsNull', () => {
      expect(
        evaluateToResult(neq(constant(null), constant(null)))
      ).to.be.deep.equal(EvaluateResult.newNull());
    });

    it('nan_number_returnsTrue', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(evaluateToValue(neq(constant(NaN), v))).to.be.deep.equal(
          TRUE_VALUE
        );
        expect(evaluateToValue(neq(v, constant(NaN)))).to.be.deep.equal(
          TRUE_VALUE
        );
      });
    });

    it('nan_nan_returnsTrue', () => {
      expect(
        evaluateToValue(neq(constant(NaN), constant(NaN)))
      ).to.be.deep.equal(TRUE_VALUE);
    });

    it('map_ambiguousNumerics', () => {
      expect(
        evaluateToValue(
          neq(
            constantMap({ foo: 1, bar: 42.0 }),
            constantMap({ foo: 1.0, bar: 42 })
          )
        )
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('array_ambiguousNumerics', () => {
      expect(
        evaluateToValue(neq(constantArray([1]), constantArray([1.0])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      expect(evaluateToValue(neq(field('not-exist'), constant(1)))).to.be
        .undefined; // Or appropriate error handling
    });
  }); // end describe('neq')
});
