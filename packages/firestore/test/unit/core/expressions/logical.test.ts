/**
 * @license
 * Copyright 2026 Google LLC
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

import {
  and,
  constant,
  not,
  or,
  xor,
  field,
  logicalMaximum,
  logicalMinimum,
  conditional as cond,
  add,
  equal,
  notEqual
} from '../../../../src/lite-api/expressions';
import {
  FALSE_VALUE,
  INTERNAL_MIN_VALUE,
  TRUE_VALUE
} from '../../../../src/model/values';
import { constantArray, constantMap } from '../../../util/pipelines';

import {
  errorExpr,
  errorFilterCondition,
  evaluateToValue,
  expectEqualToConstant,
  falseExpr,
  trueExpr
} from './utils';

describe('Logical Functions', () => {
  describe('and', () => {
    it('false_false_isFalse', () => {
      expect(evaluateToValue(and(falseExpr, falseExpr))).toEqual(FALSE_VALUE);
    });

    it('false_error_isFalse', () => {
      expect(evaluateToValue(and(falseExpr, errorFilterCondition()))).toEqual(
        FALSE_VALUE
      );
    });

    it('false_true_isFalse', () => {
      expect(evaluateToValue(and(falseExpr, trueExpr))).toEqual(FALSE_VALUE);
    });

    it('error_false_isFalse', () => {
      expect(evaluateToValue(and(errorFilterCondition(), falseExpr))).toEqual(
        FALSE_VALUE
      );
    });

    it('error_error_isError', () => {
      expect(
        evaluateToValue(and(errorFilterCondition(), errorFilterCondition()))
      ).toBeUndefined();
    });

    it('error_true_isError', () => {
      expect(
        evaluateToValue(and(errorFilterCondition(), trueExpr))
      ).toBeUndefined();
    });

    it('true_false_isFalse', () => {
      expect(evaluateToValue(and(trueExpr, falseExpr))).toEqual(FALSE_VALUE);
    });

    it('true_error_isError', () => {
      expect(
        evaluateToValue(and(trueExpr, errorFilterCondition()))
      ).toBeUndefined();
    });

    it('true_true_isTrue', () => {
      expect(evaluateToValue(and(trueExpr, trueExpr))).toEqual(TRUE_VALUE);
    });

    it('false_false_false_isFalse', () => {
      expect(evaluateToValue(and(falseExpr, falseExpr, falseExpr))).toEqual(
        FALSE_VALUE
      );
    });

    it('false_false_error_isFalse', () => {
      expect(
        evaluateToValue(and(falseExpr, falseExpr, errorFilterCondition()))
      ).toEqual(FALSE_VALUE);
    });

    it('false_false_true_isFalse', () => {
      expect(evaluateToValue(and(falseExpr, falseExpr, trueExpr))).toEqual(
        FALSE_VALUE
      );
    });

    it('false_error_false_isFalse', () => {
      expect(
        evaluateToValue(and(falseExpr, errorFilterCondition(), falseExpr))
      ).toEqual(FALSE_VALUE);
    });

    it('false_error_error_isFalse', () => {
      expect(
        evaluateToValue(
          and(falseExpr, errorFilterCondition(), errorFilterCondition())
        )
      ).toEqual(FALSE_VALUE);
    });

    it('false_error_true_isFalse', () => {
      expect(
        evaluateToValue(and(falseExpr, errorFilterCondition(), trueExpr))
      ).toEqual(FALSE_VALUE);
    });

    it('false_true_false_isFalse', () => {
      expect(evaluateToValue(and(falseExpr, trueExpr, falseExpr))).toEqual(
        FALSE_VALUE
      );
    });

    it('false_true_error_isFalse', () => {
      expect(
        evaluateToValue(and(falseExpr, trueExpr, errorFilterCondition()))
      ).toEqual(FALSE_VALUE);
    });

    it('false_true_true_isFalse', () => {
      expect(evaluateToValue(and(falseExpr, trueExpr, trueExpr))).toEqual(
        FALSE_VALUE
      );
    });

    it('error_false_false_isFalse', () => {
      expect(
        evaluateToValue(and(errorFilterCondition(), falseExpr, falseExpr))
      ).toEqual(FALSE_VALUE);
    });

    it('error_false_error_isFalse', () => {
      expect(
        evaluateToValue(
          and(errorFilterCondition(), falseExpr, errorFilterCondition())
        )
      ).toEqual(FALSE_VALUE);
    });

    it('error_false_true_isFalse', () => {
      expect(
        evaluateToValue(and(errorFilterCondition(), falseExpr, trueExpr))
      ).toEqual(FALSE_VALUE);
    });

    it('error_error_false_isFalse', () => {
      expect(
        evaluateToValue(
          and(errorFilterCondition(), errorFilterCondition(), falseExpr)
        )
      ).toEqual(FALSE_VALUE);
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
      ).toBeUndefined();
    });

    it('error_error_true_isError', () => {
      expect(
        evaluateToValue(
          and(errorFilterCondition(), errorFilterCondition(), trueExpr)
        )
      ).toBeUndefined();
    });

    it('error_true_false_isFalse', () => {
      expect(
        evaluateToValue(and(errorFilterCondition(), trueExpr, falseExpr))
      ).toEqual(FALSE_VALUE);
    });

    it('error_true_error_isError', () => {
      expect(
        evaluateToValue(
          and(errorFilterCondition(), trueExpr, errorFilterCondition())
        )
      ).toBeUndefined();
    });

    it('error_true_true_isError', () => {
      expect(
        evaluateToValue(and(errorFilterCondition(), trueExpr, trueExpr))
      ).toBeUndefined();
    });

    it('true_false_false_isFalse', () => {
      expect(evaluateToValue(and(trueExpr, falseExpr, falseExpr))).toEqual(
        FALSE_VALUE
      );
    });

    it('true_false_error_isFalse', () => {
      expect(
        evaluateToValue(and(trueExpr, falseExpr, errorFilterCondition()))
      ).toEqual(FALSE_VALUE);
    });

    it('true_false_true_isFalse', () => {
      expect(evaluateToValue(and(trueExpr, falseExpr, trueExpr))).toEqual(
        FALSE_VALUE
      );
    });

    it('true_error_false_isFalse', () => {
      expect(
        evaluateToValue(and(trueExpr, errorFilterCondition(), falseExpr))
      ).toEqual(FALSE_VALUE);
    });

    it('true_error_error_isError', () => {
      expect(
        evaluateToValue(
          and(trueExpr, errorFilterCondition(), errorFilterCondition())
        )
      ).toBeUndefined();
    });

    it('true_error_true_isError', () => {
      expect(
        evaluateToValue(and(trueExpr, errorFilterCondition(), trueExpr))
      ).toBeUndefined();
    });

    it('true_true_false_isFalse', () => {
      expect(evaluateToValue(and(trueExpr, trueExpr, falseExpr))).toEqual(
        FALSE_VALUE
      );
    });

    it('true_true_error_isError', () => {
      expect(
        evaluateToValue(and(trueExpr, trueExpr, errorFilterCondition()))
      ).toBeUndefined();
    });

    it('true_true_true_isTrue', () => {
      expect(evaluateToValue(and(trueExpr, trueExpr, trueExpr))).toEqual(
        TRUE_VALUE
      );
    });

    it('nested_and', () => {
      const child = and(trueExpr, falseExpr);
      const f = and(child, trueExpr);
      expect(evaluateToValue(f)).toEqual(FALSE_VALUE);
    });

    it('multipleArguments', () => {
      expect(evaluateToValue(and(trueExpr, trueExpr, trueExpr))).toEqual(
        TRUE_VALUE
      );
    });
  }); // end describe('and')

  describe('cond', () => {
    it('trueCondition_returnsTrueCase', () => {
      const func = cond(trueExpr, constant('true case'), errorExpr());
      expect(evaluateToValue(func)).toEqual({
        stringValue: 'true case'
      });
    });

    it('falseCondition_returnsFalseCase', () => {
      const func = cond(falseExpr, errorExpr(), constant('false case'));
      expect(evaluateToValue(func)).toEqual({
        stringValue: 'false case'
      });
    });

    it('errorCondition_returnsFalseCase', () => {
      const func = cond(errorFilterCondition(), errorExpr(), constant('false'));
      expect(evaluateToValue(func)).toBeUndefined();
    });
  }); // end describe('cond')

  describe('eqAny', () => {
    it('valueFoundInArray', () => {
      expect(
        evaluateToValue(
          constant('hello').equalAny([constant('hello'), constant('world')])
        )
      ).toEqual(TRUE_VALUE);
    });

    it('valueNotFoundInArray', () => {
      expect(
        evaluateToValue(
          constant(4).equalAny([
            constant(42),
            constant('matang'),
            constant(true)
          ])
        )
      ).toEqual(FALSE_VALUE);
    });

    it('notEqAnyFunction_valueNotFoundInArray', () => {
      const child = constant(4).equalAny([
        constant(42),
        constant('matang'),
        constant(true)
      ]);
      const f = not(child);
      expect(evaluateToValue(f)).toEqual(TRUE_VALUE);
    });

    it('equivalentNumerics', () => {
      expect(
        evaluateToValue(
          constant(42).equalAny([
            constant(42.0),
            constant('matang'),
            constant(true)
          ])
        )
      ).toEqual(TRUE_VALUE);
      expect(
        evaluateToValue(
          constant(42.0).equalAny([
            constant(42),
            constant('matang'),
            constant(true)
          ])
        )
      ).toEqual(TRUE_VALUE);
    });

    it('bothInputTypeIsArray', () => {
      expect(
        evaluateToValue(
          constantArray([1, 2, 3]).equalAny([
            constantArray([1, 2, 3]),
            constantArray([4, 5, 6]),
            constantArray([7, 8, 9])
          ])
        )
      ).toEqual(TRUE_VALUE);
    });

    it('array_notFound_returnsError', () => {
      expect(
        evaluateToValue(constant('matang').equalAny([field('not-exist')]))
      ).toBeUndefined();
    });

    it('array_isEmpty_returnsFalse', () => {
      expect(evaluateToValue(constant(42).equalAny([]))).toEqual(FALSE_VALUE);
    });

    it('search_reference_notFound_returnsError', () => {
      expect(
        evaluateToValue(
          field('not-exist').equalAny([
            constant(42),
            constant('matang'),
            constant(true)
          ])
        )
      ).toBeUndefined();
    });

    it('search_isNull', () => {
      expect(
        evaluateToValue(
          constant(null).equalAny([
            constant(null),
            constant(1),
            constant('matang'),
            constant(true)
          ])
        )
      ).toEqual(INTERNAL_MIN_VALUE);
    });

    it('search_isNull_emptyValuesArray_returnsFalse', () => {
      expect(evaluateToValue(constant(null).equalAny([]))).toEqual(
        INTERNAL_MIN_VALUE
      );
    });

    it('search_isNaN', () => {
      expect(
        evaluateToValue(
          constant(NaN).equalAny([constant(NaN), constant(42), constant(3.14)])
        )
      ).toEqual(FALSE_VALUE);
    });

    it('search_isEmpty_array_isEmpty', () => {
      expect(evaluateToValue(constantArray([]).equalAny([]))).toEqual(
        FALSE_VALUE
      );
    });

    it('search_isEmpty_array_containsEmptyArray_returnsTrue', () => {
      expect(
        evaluateToValue(constantArray([]).equalAny([constantArray([])]))
      ).toEqual(TRUE_VALUE);
    });

    it('search_isMap', () => {
      expect(
        evaluateToValue(
          constantMap({ foo: 42 }).equalAny([
            constant(123),
            constantMap({ foo: 123 }),
            constantMap({ bar: 42 }),
            constantMap({ foo: 42 })
          ])
        )
      ).toEqual(TRUE_VALUE);
    });
  }); // end describe('eqAny')

  describe('isNaN', () => {
    it('nan_returnsFalse', () => {
      expect(evaluateToValue(equal(constant(NaN), constant(NaN)))).toEqual(
        FALSE_VALUE
      );
      expect(evaluateToValue(equal(field('nanValue'), constant(NaN)))).toEqual(
        FALSE_VALUE
      );
    });

    it('notNan_returnsFalse', () => {
      expect(evaluateToValue(equal(constant(42.0), constant(NaN)))).toEqual(
        FALSE_VALUE
      );
      expect(evaluateToValue(equal(constant(42), NaN))).toEqual(FALSE_VALUE);
    });

    it('isNotNan', () => {
      expect(evaluateToValue(notEqual(constant(42.0), constant(NaN)))).toEqual(
        TRUE_VALUE
      );
      expect(evaluateToValue(notEqual(constant(42), NaN))).toEqual(TRUE_VALUE);
    });

    it('otherNanRepresentations_returnsFalse', () => {
      const v1 = NaN; // In JS, any operation with NaN results in NaN
      expect(Number.isNaN(v1)).toBe(true);
      expect(evaluateToValue(equal(constant(v1), NaN))).toEqual(FALSE_VALUE);

      expect(
        evaluateToValue(
          equal(
            add(
              constant(Number.POSITIVE_INFINITY),
              constant(Number.NEGATIVE_INFINITY)
            ),
            constant(NaN)
          )
        )
      ).toEqual(FALSE_VALUE);

      expect(
        evaluateToValue(equal(add(constant(NaN), constant(1)), constant(NaN)))
      ).toEqual(FALSE_VALUE);
    });

    it('nonNumeric_returnsError', () => {
      expect(evaluateToValue(equal(constant(true), constant(NaN)))).toEqual(
        FALSE_VALUE
      );
      expect(evaluateToValue(equal(constant('abc'), NaN))).toEqual(FALSE_VALUE);
    });
  }); // end describe('isNaN')

  describe('logicalMaximum', () => {
    it('numericType', () => {
      expectEqualToConstant(
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
      expectEqualToConstant(
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
      expectEqualToConstant(
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
      expectEqualToConstant(
        evaluateToValue(logicalMaximum(constant(null), errorExpr())),
        constant(null),
        `logicalMaximum(null, ERROR_VALUE)`
      );
    });

    it('nanAndNumbers', () => {
      expectEqualToConstant(
        evaluateToValue(logicalMaximum(constant(NaN), constant(0))),
        constant(0),
        `logicalMaximum(NaN, 0)`
      );
    });

    it('errorInput_skip', () => {
      expectEqualToConstant(
        evaluateToValue(logicalMaximum(errorExpr(), constant(1))),
        constant(1),
        `logicalMaximum(ERROR_VALUE, 1)`
      );
    });

    it('nullInput_skip', () => {
      expectEqualToConstant(
        evaluateToValue(logicalMaximum(constant(null), constant(1))),
        constant(1),
        `logicalMaximum(null, 1)`
      );
    });

    it('equivalent_numerics', () => {
      expectEqualToConstant(
        evaluateToValue(logicalMaximum(constant(1), constant(1.0))),
        constant(1),
        `logicalMaximum(1, 1.0)`
      );
    });
  }); // end describe('logicalMaximum')

  describe('logicalMinimum', () => {
    it('numericType', () => {
      expectEqualToConstant(
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
      expectEqualToConstant(
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
      expectEqualToConstant(
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
      expectEqualToConstant(
        evaluateToValue(logicalMinimum(constant(null), errorExpr())),
        constant(null),
        `logicalMinimum(null, ERROR_VALUE)`
      );
    });

    it('nanAndNumbers', () => {
      expectEqualToConstant(
        evaluateToValue(logicalMinimum(constant(NaN), constant(0))),
        constant(NaN),
        `logicalMinimum(NaN, 0)`
      );
    });

    it('errorInput_skip', () => {
      expectEqualToConstant(
        evaluateToValue(logicalMinimum(errorExpr(), constant(1))),
        constant(1),
        `logicalMinimum(ERROR_VALUE, 1)`
      );
    });

    it('nullInput_skip', () => {
      expectEqualToConstant(
        evaluateToValue(logicalMinimum(constant(null), constant(1))),
        constant(1),
        `logicalMinimum(null, 1)`
      );
    });

    it('equivalent_numerics', () => {
      expectEqualToConstant(
        evaluateToValue(logicalMinimum(constant(1), constant(1.0))),
        constant(1),
        `logicalMinimum(1, 1.0)`
      );
    });
  }); // end describe('logicalMinimum')

  describe('not', () => {
    it('true_to_false', () => {
      expect(evaluateToValue(not(constant(1).equal(1)))).toEqual(FALSE_VALUE);
    });

    it('false_to_true', () => {
      expect(evaluateToValue(not(constant(1).notEqual(1)))).toEqual(TRUE_VALUE);
    });
  }); // end describe('not')

  describe('or', () => {
    it('false_false_isFalse', () => {
      expect(evaluateToValue(or(falseExpr, falseExpr))).toEqual(FALSE_VALUE);
    });

    it('false_error_isError', () => {
      expect(
        evaluateToValue(or(falseExpr, errorFilterCondition()))
      ).toBeUndefined();
    });

    it('false_true_isTrue', () => {
      expect(evaluateToValue(or(falseExpr, trueExpr))).toEqual(TRUE_VALUE);
    });

    it('error_false_isError', () => {
      expect(
        evaluateToValue(or(errorFilterCondition(), falseExpr))
      ).toBeUndefined();
    });

    it('error_error_isError', () => {
      expect(
        evaluateToValue(or(errorFilterCondition(), errorFilterCondition()))
      ).toBeUndefined();
    });

    it('error_true_isTrue', () => {
      expect(evaluateToValue(or(errorFilterCondition(), trueExpr))).toEqual(
        TRUE_VALUE
      );
    });

    it('true_false_isTrue', () => {
      expect(evaluateToValue(or(trueExpr, falseExpr))).toEqual(TRUE_VALUE);
    });

    it('true_error_isTrue', () => {
      expect(evaluateToValue(or(trueExpr, errorFilterCondition()))).toEqual(
        TRUE_VALUE
      );
    });

    it('true_true_isTrue', () => {
      expect(evaluateToValue(or(trueExpr, trueExpr))).toEqual(TRUE_VALUE);
    });

    it('false_false_false_isFalse', () => {
      expect(evaluateToValue(or(falseExpr, falseExpr, falseExpr))).toEqual(
        FALSE_VALUE
      );
    });

    it('false_false_error_isError', () => {
      expect(
        evaluateToValue(or(falseExpr, falseExpr, errorFilterCondition()))
      ).toBeUndefined();
    });

    it('false_false_true_isTrue', () => {
      expect(evaluateToValue(or(falseExpr, falseExpr, trueExpr))).toEqual(
        TRUE_VALUE
      );
    });

    it('false_error_false_isError', () => {
      expect(
        evaluateToValue(or(falseExpr, errorFilterCondition(), falseExpr))
      ).toBeUndefined();
    });

    it('false_error_error_isError', () => {
      expect(
        evaluateToValue(
          or(falseExpr, errorFilterCondition(), errorFilterCondition())
        )
      ).toBeUndefined();
    });

    it('false_error_true_isTrue', () => {
      expect(
        evaluateToValue(or(falseExpr, errorFilterCondition(), trueExpr))
      ).toEqual(TRUE_VALUE);
    });

    it('false_true_false_isTrue', () => {
      expect(evaluateToValue(or(falseExpr, trueExpr, falseExpr))).toEqual(
        TRUE_VALUE
      );
    });

    it('false_true_error_isTrue', () => {
      expect(
        evaluateToValue(or(falseExpr, trueExpr, errorFilterCondition()))
      ).toEqual(TRUE_VALUE);
    });

    it('false_true_true_isTrue', () => {
      expect(evaluateToValue(or(falseExpr, trueExpr, trueExpr))).toEqual(
        TRUE_VALUE
      );
    });

    it('error_false_false_isError', () => {
      expect(
        evaluateToValue(or(errorFilterCondition(), falseExpr, falseExpr))
      ).toBeUndefined();
    });

    it('error_false_error_isError', () => {
      expect(
        evaluateToValue(
          or(errorFilterCondition(), falseExpr, errorFilterCondition())
        )
      ).toBeUndefined();
    });

    it('error_false_true_isTrue', () => {
      expect(
        evaluateToValue(or(errorFilterCondition(), falseExpr, trueExpr))
      ).toEqual(TRUE_VALUE);
    });

    it('error_error_false_isError', () => {
      expect(
        evaluateToValue(
          or(errorFilterCondition(), errorFilterCondition(), falseExpr)
        )
      ).toBeUndefined();
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
      ).toBeUndefined();
    });

    it('error_error_true_isTrue', () => {
      expect(
        evaluateToValue(
          or(errorFilterCondition(), errorFilterCondition(), trueExpr)
        )
      ).toEqual(TRUE_VALUE);
    });

    it('error_true_false_isTrue', () => {
      expect(
        evaluateToValue(or(errorFilterCondition(), trueExpr, falseExpr))
      ).toEqual(TRUE_VALUE);
    });

    it('error_true_error_isTrue', () => {
      expect(
        evaluateToValue(
          or(errorFilterCondition(), trueExpr, errorFilterCondition())
        )
      ).toEqual(TRUE_VALUE);
    });

    it('error_true_true_isTrue', () => {
      expect(
        evaluateToValue(or(errorFilterCondition(), trueExpr, trueExpr))
      ).toEqual(TRUE_VALUE);
    });

    it('true_false_false_isTrue', () => {
      expect(evaluateToValue(or(trueExpr, falseExpr, falseExpr))).toEqual(
        TRUE_VALUE
      );
    });

    it('true_false_error_isTrue', () => {
      expect(
        evaluateToValue(or(trueExpr, falseExpr, errorFilterCondition()))
      ).toEqual(TRUE_VALUE);
    });

    it('true_false_true_isTrue', () => {
      expect(evaluateToValue(or(trueExpr, falseExpr, trueExpr))).toEqual(
        TRUE_VALUE
      );
    });

    it('true_error_false_isTrue', () => {
      expect(
        evaluateToValue(or(trueExpr, errorFilterCondition(), falseExpr))
      ).toEqual(TRUE_VALUE);
    });

    it('true_error_error_isTrue', () => {
      expect(
        evaluateToValue(
          or(trueExpr, errorFilterCondition(), errorFilterCondition())
        )
      ).toEqual(TRUE_VALUE);
    });

    it('true_error_true_isTrue', () => {
      expect(
        evaluateToValue(or(trueExpr, errorFilterCondition(), trueExpr))
      ).toEqual(TRUE_VALUE);
    });

    it('true_true_false_isTrue', () => {
      expect(evaluateToValue(or(trueExpr, trueExpr, falseExpr))).toEqual(
        TRUE_VALUE
      );
    });

    it('true_true_error_isTrue', () => {
      expect(
        evaluateToValue(or(trueExpr, trueExpr, errorFilterCondition()))
      ).toEqual(TRUE_VALUE);
    });

    it('true_true_true_isTrue', () => {
      expect(evaluateToValue(or(trueExpr, trueExpr, trueExpr))).toEqual(
        TRUE_VALUE
      );
    });

    it('nested_or', () => {
      const child = or(trueExpr, falseExpr);
      const f = or(child, falseExpr);
      expect(evaluateToValue(f)).toEqual(TRUE_VALUE);
    });

    it('multipleArguments', () => {
      expect(evaluateToValue(or(trueExpr, falseExpr, trueExpr))).toEqual(
        TRUE_VALUE
      );
    });
  }); // end describe('or')

  describe('xor', () => {
    it('false_false_isFalse', () => {
      expect(evaluateToValue(xor(falseExpr, falseExpr))).toEqual(FALSE_VALUE);
    });

    it('false_error_isError', () => {
      expect(
        evaluateToValue(xor(falseExpr, errorFilterCondition()))
      ).toBeUndefined();
    });

    it('false_true_isTrue', () => {
      expect(evaluateToValue(xor(falseExpr, trueExpr))).toEqual(TRUE_VALUE);
    });

    it('error_false_isError', () => {
      expect(
        evaluateToValue(xor(errorFilterCondition(), falseExpr))
      ).toBeUndefined();
    });

    it('error_error_isError', () => {
      expect(
        evaluateToValue(xor(errorFilterCondition(), errorFilterCondition()))
      ).toBeUndefined();
    });

    it('error_true_isError', () => {
      expect(
        evaluateToValue(xor(errorFilterCondition(), trueExpr))
      ).toBeUndefined();
    });

    it('true_false_isTrue', () => {
      expect(evaluateToValue(xor(trueExpr, falseExpr))).toEqual(TRUE_VALUE);
    });

    it('true_error_isError', () => {
      expect(
        evaluateToValue(xor(trueExpr, errorFilterCondition()))
      ).toBeUndefined();
    });

    it('true_true_isFalse', () => {
      expect(evaluateToValue(xor(trueExpr, trueExpr))).toEqual(FALSE_VALUE);
    });

    it('false_false_false_isFalse', () => {
      expect(evaluateToValue(xor(falseExpr, falseExpr, falseExpr))).toEqual(
        FALSE_VALUE
      );
    });

    it('false_false_error_isError', () => {
      expect(
        evaluateToValue(xor(falseExpr, falseExpr, errorFilterCondition()))
      ).toBeUndefined();
    });

    it('false_false_true_isTrue', () => {
      expect(evaluateToValue(xor(falseExpr, falseExpr, trueExpr))).toEqual(
        TRUE_VALUE
      );
    });

    it('false_error_false_isError', () => {
      expect(
        evaluateToValue(xor(falseExpr, errorFilterCondition(), falseExpr))
      ).toBeUndefined();
    });

    it('false_error_error_isError', () => {
      expect(
        evaluateToValue(
          xor(falseExpr, errorFilterCondition(), errorFilterCondition())
        )
      ).toBeUndefined();
    });

    it('false_error_true_isError', () => {
      expect(
        evaluateToValue(xor(falseExpr, errorFilterCondition(), trueExpr))
      ).toBeUndefined();
    });

    it('false_true_false_isTrue', () => {
      expect(evaluateToValue(xor(falseExpr, trueExpr, falseExpr))).toEqual(
        TRUE_VALUE
      );
    });

    it('false_true_error_isError', () => {
      expect(
        evaluateToValue(xor(falseExpr, trueExpr, errorFilterCondition()))
      ).toBeUndefined();
    });

    it('false_true_true_isFalse', () => {
      expect(evaluateToValue(xor(falseExpr, trueExpr, trueExpr))).toEqual(
        FALSE_VALUE
      );
    });

    it('error_false_false_isError', () => {
      expect(
        evaluateToValue(xor(errorFilterCondition(), falseExpr, falseExpr))
      ).toBeUndefined();
    });

    it('error_false_error_isError', () => {
      expect(
        evaluateToValue(
          xor(errorFilterCondition(), falseExpr, errorFilterCondition())
        )
      ).toBeUndefined();
    });

    it('error_false_true_isError', () => {
      expect(
        evaluateToValue(xor(errorFilterCondition(), falseExpr, trueExpr))
      ).toBeUndefined();
    });

    it('error_error_false_isError', () => {
      expect(
        evaluateToValue(
          xor(errorFilterCondition(), errorFilterCondition(), falseExpr)
        )
      ).toBeUndefined();
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
      ).toBeUndefined();
    });

    it('error_error_true_isError', () => {
      expect(
        evaluateToValue(
          xor(errorFilterCondition(), errorFilterCondition(), trueExpr)
        )
      ).toBeUndefined();
    });

    it('error_true_false_isError', () => {
      expect(
        evaluateToValue(xor(errorFilterCondition(), trueExpr, falseExpr))
      ).toBeUndefined();
    });

    it('error_true_error_isError', () => {
      expect(
        evaluateToValue(
          xor(errorFilterCondition(), trueExpr, errorFilterCondition())
        )
      ).toBeUndefined();
    });

    it('error_true_true_isError', () => {
      expect(
        evaluateToValue(xor(errorFilterCondition(), trueExpr, trueExpr))
      ).toBeUndefined();
    });

    it('true_false_false_isTrue', () => {
      expect(evaluateToValue(xor(trueExpr, falseExpr, falseExpr))).toEqual(
        TRUE_VALUE
      );
    });

    it('true_false_error_isError', () => {
      expect(
        evaluateToValue(xor(trueExpr, falseExpr, errorFilterCondition()))
      ).toBeUndefined();
    });

    it('true_false_true_isFalse', () => {
      expect(evaluateToValue(xor(trueExpr, falseExpr, trueExpr))).toEqual(
        FALSE_VALUE
      );
    });

    it('true_error_false_isError', () => {
      expect(
        evaluateToValue(xor(trueExpr, errorFilterCondition(), falseExpr))
      ).toBeUndefined();
    });

    it('true_error_error_isError', () => {
      expect(
        evaluateToValue(
          xor(trueExpr, errorFilterCondition(), errorFilterCondition())
        )
      ).toBeUndefined();
    });

    it('true_error_true_isError', () => {
      expect(
        evaluateToValue(xor(trueExpr, errorFilterCondition(), trueExpr))
      ).toBeUndefined();
    });

    it('true_true_false_isFalse', () => {
      expect(evaluateToValue(xor(trueExpr, trueExpr, falseExpr))).toEqual(
        FALSE_VALUE
      );
    });

    it('true_true_error_isError', () => {
      expect(
        evaluateToValue(xor(trueExpr, trueExpr, errorFilterCondition()))
      ).toBeUndefined();
    });

    it('true_true_true_isTrue', () => {
      expect(evaluateToValue(xor(trueExpr, trueExpr, trueExpr))).toEqual(
        TRUE_VALUE
      );
    });

    it('nested_xor', () => {
      const child = xor(trueExpr, falseExpr);
      const f = xor(child, trueExpr);
      expect(evaluateToValue(f)).toEqual(FALSE_VALUE);
    });

    it('multipleArguments', () => {
      expect(evaluateToValue(xor(trueExpr, falseExpr, trueExpr))).toEqual(
        FALSE_VALUE
      );
    });
  }); // end describe('xor')
}); // end describe('Logical Functions')
