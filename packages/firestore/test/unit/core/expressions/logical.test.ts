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
  errorFilterCondition,
  evaluateToValue,
  expectEqual,
  falseExpr,
  trueExpr
} from './utils';
import {
  and,
  constant,
  eqAny,
  isNan,
  isNotNan,
  not,
  or,
  xor,
  field,
  logicalMaximum,
  logicalMinimum,
  cond,
  add,
  isNull,
  isNotNull
} from '../../../../src/lite-api/expressions';
import {
  FALSE_VALUE,
  MIN_VALUE,
  TRUE_VALUE,
  valueEquals
} from '../../../../src/model/values';
import { constantArray, constantMap } from '../../../util/pipelines';
import { canonifyExpr } from '../../../../src/core/pipeline-util';

describe('Logical Functions', () => {
  describe('and', () => {
    it('false_false_isFalse', () => {
      expect(evaluateToValue(and(falseExpr, falseExpr))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('false_error_isFalse', () => {
      expect(
        evaluateToValue(and(falseExpr, errorFilterCondition()))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('false_true_isFalse', () => {
      expect(evaluateToValue(and(falseExpr, trueExpr))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('error_false_isFalse', () => {
      expect(
        evaluateToValue(and(errorFilterCondition(), falseExpr))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('error_error_isError', () => {
      expect(
        evaluateToValue(and(errorFilterCondition(), errorFilterCondition()))
      ).to.be.undefined;
    });

    it('error_true_isError', () => {
      expect(evaluateToValue(and(errorFilterCondition(), trueExpr))).to.be
        .undefined;
    });

    it('true_false_isFalse', () => {
      expect(evaluateToValue(and(trueExpr, falseExpr))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('true_error_isError', () => {
      expect(evaluateToValue(and(trueExpr, errorFilterCondition()))).to.be
        .undefined;
    });

    it('true_true_isTrue', () => {
      expect(evaluateToValue(and(trueExpr, trueExpr))).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('false_false_false_isFalse', () => {
      expect(
        evaluateToValue(and(falseExpr, falseExpr, falseExpr))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('false_false_error_isFalse', () => {
      expect(
        evaluateToValue(and(falseExpr, falseExpr, errorFilterCondition()))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('false_false_true_isFalse', () => {
      expect(
        evaluateToValue(and(falseExpr, falseExpr, trueExpr))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('false_error_false_isFalse', () => {
      expect(
        evaluateToValue(and(falseExpr, errorFilterCondition(), falseExpr))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('false_error_error_isFalse', () => {
      expect(
        evaluateToValue(
          and(falseExpr, errorFilterCondition(), errorFilterCondition())
        )
      ).to.deep.equal(FALSE_VALUE);
    });

    it('false_error_true_isFalse', () => {
      expect(
        evaluateToValue(and(falseExpr, errorFilterCondition(), trueExpr))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('false_true_false_isFalse', () => {
      expect(
        evaluateToValue(and(falseExpr, trueExpr, falseExpr))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('false_true_error_isFalse', () => {
      expect(
        evaluateToValue(and(falseExpr, trueExpr, errorFilterCondition()))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('false_true_true_isFalse', () => {
      expect(evaluateToValue(and(falseExpr, trueExpr, trueExpr))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('error_false_false_isFalse', () => {
      expect(
        evaluateToValue(and(errorFilterCondition(), falseExpr, falseExpr))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('error_false_error_isFalse', () => {
      expect(
        evaluateToValue(
          and(errorFilterCondition(), falseExpr, errorFilterCondition())
        )
      ).to.deep.equal(FALSE_VALUE);
    });

    it('error_false_true_isFalse', () => {
      expect(
        evaluateToValue(and(errorFilterCondition(), falseExpr, trueExpr))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('error_error_false_isFalse', () => {
      expect(
        evaluateToValue(
          and(errorFilterCondition(), errorFilterCondition(), falseExpr)
        )
      ).to.deep.equal(FALSE_VALUE);
    });

    it('error_error_error_isError', () => {
      expect(
        evaluateToValue(
          and(
            errorFilterCondition(),
            errorFilterCondition(),
            errorFilterCondition()
          )
        )
      ).to.be.undefined;
    });

    it('error_error_true_isError', () => {
      expect(
        evaluateToValue(
          and(errorFilterCondition(), errorFilterCondition(), trueExpr)
        )
      ).to.be.undefined;
    });

    it('error_true_false_isFalse', () => {
      expect(
        evaluateToValue(and(errorFilterCondition(), trueExpr, falseExpr))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('error_true_error_isError', () => {
      expect(
        evaluateToValue(
          and(errorFilterCondition(), trueExpr, errorFilterCondition())
        )
      ).to.be.undefined;
    });

    it('error_true_true_isError', () => {
      expect(evaluateToValue(and(errorFilterCondition(), trueExpr, trueExpr)))
        .to.be.undefined;
    });

    it('true_false_false_isFalse', () => {
      expect(
        evaluateToValue(and(trueExpr, falseExpr, falseExpr))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('true_false_error_isFalse', () => {
      expect(
        evaluateToValue(and(trueExpr, falseExpr, errorFilterCondition()))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('true_false_true_isFalse', () => {
      expect(evaluateToValue(and(trueExpr, falseExpr, trueExpr))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('true_error_false_isFalse', () => {
      expect(
        evaluateToValue(and(trueExpr, errorFilterCondition(), falseExpr))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('true_error_error_isError', () => {
      expect(
        evaluateToValue(
          and(trueExpr, errorFilterCondition(), errorFilterCondition())
        )
      ).to.be.undefined;
    });

    it('true_error_true_isError', () => {
      expect(evaluateToValue(and(trueExpr, errorFilterCondition(), trueExpr)))
        .to.be.undefined;
    });

    it('true_true_false_isFalse', () => {
      expect(evaluateToValue(and(trueExpr, trueExpr, falseExpr))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('true_true_error_isError', () => {
      expect(evaluateToValue(and(trueExpr, trueExpr, errorFilterCondition())))
        .to.be.undefined;
    });

    it('true_true_true_isTrue', () => {
      expect(evaluateToValue(and(trueExpr, trueExpr, trueExpr))).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('nested_and', () => {
      const child = and(trueExpr, falseExpr);
      const f = and(child, trueExpr);
      expect(evaluateToValue(f)).to.deep.equal(FALSE_VALUE);
    });

    it('multipleArguments', () => {
      expect(evaluateToValue(and(trueExpr, trueExpr, trueExpr))).to.deep.equal(
        TRUE_VALUE
      );
    });
  }); // end describe('and')

  describe('cond', () => {
    it('trueCondition_returnsTrueCase', () => {
      const func = cond(trueExpr, constant('true case'), errorExpr());
      expect(evaluateToValue(func)).to.deep.equal({
        stringValue: 'true case'
      });
    });

    it('falseCondition_returnsFalseCase', () => {
      const func = cond(falseExpr, errorExpr(), constant('false case'));
      expect(evaluateToValue(func)).to.deep.equal({
        stringValue: 'false case'
      });
    });

    it('errorCondition_returnsFalseCase', () => {
      const func = cond(errorFilterCondition(), errorExpr(), constant('false'));
      expect(evaluateToValue(func)).to.be.undefined;
    });
  }); // end describe('cond')

  describe('eqAny', () => {
    it('valueFoundInArray', () => {
      expect(
        evaluateToValue(
          eqAny(constant('hello'), [constant('hello'), constant('world')])
        )
      ).to.deep.equal(TRUE_VALUE);
    });

    it('valueNotFoundInArray', () => {
      expect(
        evaluateToValue(
          eqAny(constant(4), [constant(42), constant('matang'), constant(true)])
        )
      ).to.deep.equal(FALSE_VALUE);
    });

    it('notEqAnyFunction_valueNotFoundInArray', () => {
      const child = eqAny(constant(4), [
        constant(42),
        constant('matang'),
        constant(true)
      ]);
      const f = not(child);
      expect(evaluateToValue(f)).to.deep.equal(TRUE_VALUE);
    });

    it('equivalentNumerics', () => {
      expect(
        evaluateToValue(
          eqAny(constant(42), [
            constant(42.0),
            constant('matang'),
            constant(true)
          ])
        )
      ).to.deep.equal(TRUE_VALUE);
      expect(
        evaluateToValue(
          eqAny(constant(42.0), [
            constant(42),
            constant('matang'),
            constant(true)
          ])
        )
      ).to.deep.equal(TRUE_VALUE);
    });

    it('bothInputTypeIsArray', () => {
      expect(
        evaluateToValue(
          eqAny(constantArray([1, 2, 3]), [
            constantArray([1, 2, 3]),
            constantArray([4, 5, 6]),
            constantArray([7, 8, 9])
          ])
        )
      ).to.deep.equal(TRUE_VALUE);
    });

    it('array_notFound_returnsError', () => {
      expect(evaluateToValue(eqAny(constant('matang'), [field('not-exist')])))
        .to.be.undefined;
    });

    it('array_isEmpty_returnsFalse', () => {
      expect(evaluateToValue(eqAny(constant(42), []))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('search_reference_notFound_returnsError', () => {
      expect(
        evaluateToValue(
          eqAny(field('not-exist'), [
            constant(42),
            constant('matang'),
            constant(true)
          ])
        )
      ).to.be.undefined;
    });

    it('search_isNull', () => {
      expect(
        evaluateToValue(
          eqAny(constant(null), [
            constant(null),
            constant(1),
            constant('matang'),
            constant(true)
          ])
        )
      ).to.deep.equal(MIN_VALUE);
    });

    it('search_isNull_emptyValuesArray_returnsFalse', () => {
      expect(evaluateToValue(eqAny(constant(null), []))).to.deep.equal(
        MIN_VALUE
      );
    });

    it('search_isNaN', () => {
      expect(
        evaluateToValue(
          eqAny(constant(NaN), [constant(NaN), constant(42), constant(3.14)])
        )
      ).to.deep.equal(FALSE_VALUE);
    });

    it('search_isEmpty_array_isEmpty', () => {
      expect(evaluateToValue(eqAny(constantArray([]), []))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('search_isEmpty_array_containsEmptyArray_returnsTrue', () => {
      expect(
        evaluateToValue(eqAny(constantArray([]), [constantArray([])]))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('search_isMap', () => {
      expect(
        evaluateToValue(
          eqAny(constantMap({ foo: 42 }), [
            constant(123),
            constantMap({ foo: 123 }),
            constantMap({ bar: 42 }),
            constantMap({ foo: 42 })
          ])
        )
      ).to.deep.equal(TRUE_VALUE);
    });
  }); // end describe('eqAny')

  describe('isNaN', () => {
    it('nan_returnsTrue', () => {
      expect(evaluateToValue(isNan(constant(NaN)))).to.deep.equal(TRUE_VALUE);
      expect(evaluateToValue(isNan(field('nanValue')))).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('notNan_returnsFalse', () => {
      expect(evaluateToValue(isNan(constant(42.0)))).to.deep.equal(FALSE_VALUE);
      expect(evaluateToValue(isNan(constant(42)))).to.deep.equal(FALSE_VALUE);
    });

    it('isNotNan', () => {
      expect(evaluateToValue(isNotNan(constant(42.0)))).to.deep.equal(
        TRUE_VALUE
      );
      expect(evaluateToValue(isNotNan(constant(42)))).to.deep.equal(TRUE_VALUE);
    });

    it('otherNanRepresentations_returnsTrue', () => {
      const v1 = NaN; // In JS, any operation with NaN results in NaN
      expect(Number.isNaN(v1)).to.be.true;
      expect(evaluateToValue(isNan(constant(v1)))).to.deep.equal(TRUE_VALUE);

      expect(
        evaluateToValue(
          isNan(
            add(
              constant(Number.POSITIVE_INFINITY),
              constant(Number.NEGATIVE_INFINITY)
            )
          )
        )
      ).to.deep.equal(TRUE_VALUE);

      expect(
        evaluateToValue(isNan(add(constant(NaN), constant(1))))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('nonNumeric_returnsError', () => {
      expect(evaluateToValue(isNan(constant(true)))).to.be.undefined;
      expect(evaluateToValue(isNan(constant('abc')))).to.be.undefined;
    });
  }); // end describe('isNaN')

  describe('logicalMaximum', () => {
    it('numericType', () => {
      expectEqual(
        evaluateToValue(
          logicalMaximum(
            constant(1),
            logicalMaximum(constant(2.0), constant(3))
          )
        ),
        constant(3),
        `logicalMaximum(1, logicalMaximum(2.0, 3))`
      );
    });

    it('stringType', () => {
      expectEqual(
        evaluateToValue(
          logicalMaximum(
            logicalMaximum(constant('a'), constant('b')),
            constant('c')
          )
        ),
        constant('c'),
        `logicalMaximum(logicalMaximum('a', 'b'), 'c')`
      );
    });

    it('mixedType', () => {
      expectEqual(
        evaluateToValue(
          logicalMaximum(
            constant(1),
            logicalMaximum(constant('1'), constant(0))
          )
        ),
        constant('1'),
        `logicalMaximum(1, logicalMaximum('1', 0))`
      );
    });

    it('onlyNullAndError_returnsNull', () => {
      expectEqual(
        evaluateToValue(logicalMaximum(constant(null), errorExpr())),
        constant(null),
        `logicalMaximum(null, ERROR_VALUE)`
      );
    });

    it('nanAndNumbers', () => {
      expectEqual(
        evaluateToValue(logicalMaximum(constant(NaN), constant(0))),
        constant(0),
        `logicalMaximum(NaN, 0)`
      );
    });

    it('errorInput_skip', () => {
      expectEqual(
        evaluateToValue(logicalMaximum(errorExpr(), constant(1))),
        constant(1),
        `logicalMaximum(ERROR_VALUE, 1)`
      );
    });

    it('nullInput_skip', () => {
      expectEqual(
        evaluateToValue(logicalMaximum(constant(null), constant(1))),
        constant(1),
        `logicalMaximum(null, 1)`
      );
    });

    it('equivalent_numerics', () => {
      expectEqual(
        evaluateToValue(logicalMaximum(constant(1), constant(1.0))),
        constant(1),
        `logicalMaximum(1, 1.0)`
      );
    });
  }); // end describe('logicalMaximum')

  describe('logicalMinimum', () => {
    it('numericType', () => {
      expectEqual(
        evaluateToValue(
          logicalMinimum(
            constant(1),
            logicalMinimum(constant(2.0), constant(3))
          )
        ),
        constant(1),
        `logicalMinimum(1, logicalMinimum(2.0, 3))`
      );
    });

    it('stringType', () => {
      expectEqual(
        evaluateToValue(
          logicalMinimum(
            logicalMinimum(constant('a'), constant('b')),
            constant('c')
          )
        ),
        constant('a'),
        `logicalMinimum(logicalMinimum('a', 'b'), 'c')`
      );
    });

    it('mixedType', () => {
      expectEqual(
        evaluateToValue(
          logicalMinimum(
            constant(1),
            logicalMinimum(constant('1'), constant(0))
          )
        ),
        constant(0),
        `logicalMinimum(1, logicalMinimum('1', 0))`
      );
    });

    it('onlyNullAndError_returnsNull', () => {
      expectEqual(
        evaluateToValue(logicalMinimum(constant(null), errorExpr())),
        constant(null),
        `logicalMinimum(null, ERROR_VALUE)`
      );
    });

    it('nanAndNumbers', () => {
      expectEqual(
        evaluateToValue(logicalMinimum(constant(NaN), constant(0))),
        constant(NaN),
        `logicalMinimum(NaN, 0)`
      );
    });

    it('errorInput_skip', () => {
      expectEqual(
        evaluateToValue(logicalMinimum(errorExpr(), constant(1))),
        constant(1),
        `logicalMinimum(ERROR_VALUE, 1)`
      );
    });

    it('nullInput_skip', () => {
      expectEqual(
        evaluateToValue(logicalMinimum(constant(null), constant(1))),
        constant(1),
        `logicalMinimum(null, 1)`
      );
    });

    it('equivalent_numerics', () => {
      expectEqual(
        evaluateToValue(logicalMinimum(constant(1), constant(1.0))),
        constant(1),
        `logicalMinimum(1, 1.0)`
      );
    });
  }); // end describe('logicalMinimum')

  describe('not', () => {
    it('true_to_false', () => {
      expect(evaluateToValue(not(constant(1).eq(1)))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('false_to_true', () => {
      expect(evaluateToValue(not(constant(1).neq(1)))).to.deep.equal(
        TRUE_VALUE
      );
    });
  }); // end describe('not')

  describe('or', () => {
    it('false_false_isFalse', () => {
      expect(evaluateToValue(or(falseExpr, falseExpr))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('false_error_isError', () => {
      expect(evaluateToValue(or(falseExpr, errorFilterCondition()))).to.be
        .undefined;
    });

    it('false_true_isTrue', () => {
      expect(evaluateToValue(or(falseExpr, trueExpr))).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('error_false_isError', () => {
      expect(evaluateToValue(or(errorFilterCondition(), falseExpr))).to.be
        .undefined;
    });

    it('error_error_isError', () => {
      expect(
        evaluateToValue(or(errorFilterCondition(), errorFilterCondition()))
      ).to.be.undefined;
    });

    it('error_true_isTrue', () => {
      expect(
        evaluateToValue(or(errorFilterCondition(), trueExpr))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('true_false_isTrue', () => {
      expect(evaluateToValue(or(trueExpr, falseExpr))).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('true_error_isTrue', () => {
      expect(
        evaluateToValue(or(trueExpr, errorFilterCondition()))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('true_true_isTrue', () => {
      expect(evaluateToValue(or(trueExpr, trueExpr))).to.deep.equal(TRUE_VALUE);
    });

    it('false_false_false_isFalse', () => {
      expect(
        evaluateToValue(or(falseExpr, falseExpr, falseExpr))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('false_false_error_isError', () => {
      expect(evaluateToValue(or(falseExpr, falseExpr, errorFilterCondition())))
        .to.be.undefined;
    });

    it('false_false_true_isTrue', () => {
      expect(evaluateToValue(or(falseExpr, falseExpr, trueExpr))).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('false_error_false_isError', () => {
      expect(evaluateToValue(or(falseExpr, errorFilterCondition(), falseExpr)))
        .to.be.undefined;
    });

    it('false_error_error_isError', () => {
      expect(
        evaluateToValue(
          or(falseExpr, errorFilterCondition(), errorFilterCondition())
        )
      ).to.be.undefined;
    });

    it('false_error_true_isTrue', () => {
      expect(
        evaluateToValue(or(falseExpr, errorFilterCondition(), trueExpr))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('false_true_false_isTrue', () => {
      expect(evaluateToValue(or(falseExpr, trueExpr, falseExpr))).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('false_true_error_isTrue', () => {
      expect(
        evaluateToValue(or(falseExpr, trueExpr, errorFilterCondition()))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('false_true_true_isTrue', () => {
      expect(evaluateToValue(or(falseExpr, trueExpr, trueExpr))).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('error_false_false_isError', () => {
      expect(evaluateToValue(or(errorFilterCondition(), falseExpr, falseExpr)))
        .to.be.undefined;
    });

    it('error_false_error_isError', () => {
      expect(
        evaluateToValue(
          or(errorFilterCondition(), falseExpr, errorFilterCondition())
        )
      ).to.be.undefined;
    });

    it('error_false_true_isTrue', () => {
      expect(
        evaluateToValue(or(errorFilterCondition(), falseExpr, trueExpr))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('error_error_false_isError', () => {
      expect(
        evaluateToValue(
          or(errorFilterCondition(), errorFilterCondition(), falseExpr)
        )
      ).to.be.undefined;
    });

    it('error_error_error_isError', () => {
      expect(
        evaluateToValue(
          or(
            errorFilterCondition(),
            errorFilterCondition(),
            errorFilterCondition()
          )
        )
      ).to.be.undefined;
    });

    it('error_error_true_isTrue', () => {
      expect(
        evaluateToValue(
          or(errorFilterCondition(), errorFilterCondition(), trueExpr)
        )
      ).to.deep.equal(TRUE_VALUE);
    });

    it('error_true_false_isTrue', () => {
      expect(
        evaluateToValue(or(errorFilterCondition(), trueExpr, falseExpr))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('error_true_error_isTrue', () => {
      expect(
        evaluateToValue(
          or(errorFilterCondition(), trueExpr, errorFilterCondition())
        )
      ).to.deep.equal(TRUE_VALUE);
    });

    it('error_true_true_isTrue', () => {
      expect(
        evaluateToValue(or(errorFilterCondition(), trueExpr, trueExpr))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('true_false_false_isTrue', () => {
      expect(evaluateToValue(or(trueExpr, falseExpr, falseExpr))).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('true_false_error_isTrue', () => {
      expect(
        evaluateToValue(or(trueExpr, falseExpr, errorFilterCondition()))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('true_false_true_isTrue', () => {
      expect(evaluateToValue(or(trueExpr, falseExpr, trueExpr))).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('true_error_false_isTrue', () => {
      expect(
        evaluateToValue(or(trueExpr, errorFilterCondition(), falseExpr))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('true_error_error_isTrue', () => {
      expect(
        evaluateToValue(
          or(trueExpr, errorFilterCondition(), errorFilterCondition())
        )
      ).to.deep.equal(TRUE_VALUE);
    });

    it('true_error_true_isTrue', () => {
      expect(
        evaluateToValue(or(trueExpr, errorFilterCondition(), trueExpr))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('true_true_false_isTrue', () => {
      expect(evaluateToValue(or(trueExpr, trueExpr, falseExpr))).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('true_true_error_isTrue', () => {
      expect(
        evaluateToValue(or(trueExpr, trueExpr, errorFilterCondition()))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('true_true_true_isTrue', () => {
      expect(evaluateToValue(or(trueExpr, trueExpr, trueExpr))).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('nested_or', () => {
      const child = or(trueExpr, falseExpr);
      const f = or(child, falseExpr);
      expect(evaluateToValue(f)).to.deep.equal(TRUE_VALUE);
    });

    it('multipleArguments', () => {
      expect(evaluateToValue(or(trueExpr, falseExpr, trueExpr))).to.deep.equal(
        TRUE_VALUE
      );
    });
  }); // end describe('or')

  describe('xor', () => {
    it('false_false_isFalse', () => {
      expect(evaluateToValue(xor(falseExpr, falseExpr))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('false_error_isError', () => {
      expect(evaluateToValue(xor(falseExpr, errorFilterCondition()))).to.be
        .undefined;
    });

    it('false_true_isTrue', () => {
      expect(evaluateToValue(xor(falseExpr, trueExpr))).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('error_false_isError', () => {
      expect(evaluateToValue(xor(errorFilterCondition(), falseExpr))).to.be
        .undefined;
    });

    it('error_error_isError', () => {
      expect(
        evaluateToValue(xor(errorFilterCondition(), errorFilterCondition()))
      ).to.be.undefined;
    });

    it('error_true_isError', () => {
      expect(evaluateToValue(xor(errorFilterCondition(), trueExpr))).to.be
        .undefined;
    });

    it('true_false_isTrue', () => {
      expect(evaluateToValue(xor(trueExpr, falseExpr))).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('true_error_isError', () => {
      expect(evaluateToValue(xor(trueExpr, errorFilterCondition()))).to.be
        .undefined;
    });

    it('true_true_isFalse', () => {
      expect(evaluateToValue(xor(trueExpr, trueExpr))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('false_false_false_isFalse', () => {
      expect(
        evaluateToValue(xor(falseExpr, falseExpr, falseExpr))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('false_false_error_isError', () => {
      expect(evaluateToValue(xor(falseExpr, falseExpr, errorFilterCondition())))
        .to.be.undefined;
    });

    it('false_false_true_isTrue', () => {
      expect(
        evaluateToValue(xor(falseExpr, falseExpr, trueExpr))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('false_error_false_isError', () => {
      expect(evaluateToValue(xor(falseExpr, errorFilterCondition(), falseExpr)))
        .to.be.undefined;
    });

    it('false_error_error_isError', () => {
      expect(
        evaluateToValue(
          xor(falseExpr, errorFilterCondition(), errorFilterCondition())
        )
      ).to.be.undefined;
    });

    it('false_error_true_isError', () => {
      expect(evaluateToValue(xor(falseExpr, errorFilterCondition(), trueExpr)))
        .to.be.undefined;
    });

    it('false_true_false_isTrue', () => {
      expect(
        evaluateToValue(xor(falseExpr, trueExpr, falseExpr))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('false_true_error_isError', () => {
      expect(evaluateToValue(xor(falseExpr, trueExpr, errorFilterCondition())))
        .to.be.undefined;
    });

    it('false_true_true_isFalse', () => {
      expect(evaluateToValue(xor(falseExpr, trueExpr, trueExpr))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('error_false_false_isError', () => {
      expect(evaluateToValue(xor(errorFilterCondition(), falseExpr, falseExpr)))
        .to.be.undefined;
    });

    it('error_false_error_isError', () => {
      expect(
        evaluateToValue(
          xor(errorFilterCondition(), falseExpr, errorFilterCondition())
        )
      ).to.be.undefined;
    });

    it('error_false_true_isError', () => {
      expect(evaluateToValue(xor(errorFilterCondition(), falseExpr, trueExpr)))
        .to.be.undefined;
    });

    it('error_error_false_isError', () => {
      expect(
        evaluateToValue(
          xor(errorFilterCondition(), errorFilterCondition(), falseExpr)
        )
      ).to.be.undefined;
    });

    it('error_error_error_isError', () => {
      expect(
        evaluateToValue(
          xor(
            errorFilterCondition(),
            errorFilterCondition(),
            errorFilterCondition()
          )
        )
      ).to.be.undefined;
    });

    it('error_error_true_isError', () => {
      expect(
        evaluateToValue(
          xor(errorFilterCondition(), errorFilterCondition(), trueExpr)
        )
      ).to.be.undefined;
    });

    it('error_true_false_isError', () => {
      expect(evaluateToValue(xor(errorFilterCondition(), trueExpr, falseExpr)))
        .to.be.undefined;
    });

    it('error_true_error_isError', () => {
      expect(
        evaluateToValue(
          xor(errorFilterCondition(), trueExpr, errorFilterCondition())
        )
      ).to.be.undefined;
    });

    it('error_true_true_isError', () => {
      expect(evaluateToValue(xor(errorFilterCondition(), trueExpr, trueExpr)))
        .to.be.undefined;
    });

    it('true_false_false_isTrue', () => {
      expect(
        evaluateToValue(xor(trueExpr, falseExpr, falseExpr))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('true_false_error_isError', () => {
      expect(evaluateToValue(xor(trueExpr, falseExpr, errorFilterCondition())))
        .to.be.undefined;
    });

    it('true_false_true_isFalse', () => {
      expect(evaluateToValue(xor(trueExpr, falseExpr, trueExpr))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('true_error_false_isError', () => {
      expect(evaluateToValue(xor(trueExpr, errorFilterCondition(), falseExpr)))
        .to.be.undefined;
    });

    it('true_error_error_isError', () => {
      expect(
        evaluateToValue(
          xor(trueExpr, errorFilterCondition(), errorFilterCondition())
        )
      ).to.be.undefined;
    });

    it('true_error_true_isError', () => {
      expect(evaluateToValue(xor(trueExpr, errorFilterCondition(), trueExpr)))
        .to.be.undefined;
    });

    it('true_true_false_isFalse', () => {
      expect(evaluateToValue(xor(trueExpr, trueExpr, falseExpr))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('true_true_error_isError', () => {
      expect(evaluateToValue(xor(trueExpr, trueExpr, errorFilterCondition())))
        .to.be.undefined;
    });

    it('true_true_true_isTrue', () => {
      expect(evaluateToValue(xor(trueExpr, trueExpr, trueExpr))).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('nested_xor', () => {
      const child = xor(trueExpr, falseExpr);
      const f = xor(child, trueExpr);
      expect(evaluateToValue(f)).to.deep.equal(FALSE_VALUE);
    });

    it('multipleArguments', () => {
      expect(evaluateToValue(xor(trueExpr, falseExpr, trueExpr))).to.deep.equal(
        FALSE_VALUE
      );
    });
  }); // end describe('xor')

  describe('isNull', () => {
    it('null_returnsTrue', () => {
      expect(evaluateToValue(isNull(constant(null)))).to.deep.equal(TRUE_VALUE);
    });

    it('error_returnsError', () => {
      expect(evaluateToValue(isNull(errorExpr()))).to.be.undefined;
    });

    it('unset_returnsError', () => {
      expect(evaluateToValue(isNull(field('non-existent-field')))).to.be
        .undefined;
    });

    it('anythingButNull_returnsFalse', () => {
      // Filter out null if it exists in the test data (it shouldn't based on definition)
      const nonNullValues =
        ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES;

      nonNullValues.forEach(v => {
        expect(
          evaluateToValue(isNull(v)),
          `isNull(${canonifyExpr(v)})`
        ).to.deep.equal(FALSE_VALUE);
      });

      // Explicitly test NaN as well
      expect(evaluateToValue(isNull(constant(NaN)))).to.deep.equal(FALSE_VALUE);
    });
  }); // end describe('isNull')

  describe('isNotNull', () => {
    it('null_returnsFalse', () => {
      expect(evaluateToValue(isNotNull(constant(null)))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('error_returnsFalse', () => {
      expect(evaluateToValue(isNotNull(errorExpr()))).to.be.undefined;
    });

    it('unset_returnsFalse', () => {
      expect(evaluateToValue(isNotNull(field('non-existent-field')))).to.be
        .undefined;
    });

    it('anythingButNull_returnsTrue', () => {
      // Filter out null if it exists in the test data
      const nonNullValues =
        ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.filter(
          v => !valueEquals(v._getValue(), { nullValue: 'NULL_VALUE' })
        );

      nonNullValues.forEach(v => {
        expect(
          evaluateToValue(isNotNull(v)),
          `isNotNull(${canonifyExpr(v)})`
        ).to.deep.equal(TRUE_VALUE);
      });

      // Explicitly test NaN as well
      expect(evaluateToValue(isNotNull(constant(NaN)))).to.deep.equal(
        TRUE_VALUE
      );
    });
  }); // end describe('isNotNull')
}); // end describe('Logical Functions')
