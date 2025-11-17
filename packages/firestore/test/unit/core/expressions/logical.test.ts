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
  expectEqualToConstant,
  falseExpr,
  trueExpr
} from './utils';
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
  Constant,
  equal,
  notEqual
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
          constant('hello').equalAny([constant('hello'), constant('world')])
        )
      ).to.deep.equal(TRUE_VALUE);
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
      ).to.deep.equal(FALSE_VALUE);
    });

    it('notEqAnyFunction_valueNotFoundInArray', () => {
      const child = constant(4).equalAny([
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
          constant(42).equalAny([
            constant(42.0),
            constant('matang'),
            constant(true)
          ])
        )
      ).to.deep.equal(TRUE_VALUE);
      expect(
        evaluateToValue(
          constant(42.0).equalAny([
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
          constantArray([1, 2, 3]).equalAny([
            constantArray([1, 2, 3]),
            constantArray([4, 5, 6]),
            constantArray([7, 8, 9])
          ])
        )
      ).to.deep.equal(TRUE_VALUE);
    });

    it('array_notFound_returnsError', () => {
      expect(evaluateToValue(constant('matang').equalAny([field('not-exist')])))
        .to.be.undefined;
    });

    it('array_isEmpty_returnsFalse', () => {
      expect(evaluateToValue(constant(42).equalAny([]))).to.deep.equal(
        FALSE_VALUE
      );
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
      ).to.be.undefined;
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
      ).to.deep.equal(MIN_VALUE);
    });

    it('search_isNull_emptyValuesArray_returnsFalse', () => {
      expect(evaluateToValue(constant(null).equalAny([]))).to.deep.equal(
        MIN_VALUE
      );
    });

    it('search_isNaN', () => {
      expect(
        evaluateToValue(
          constant(NaN).equalAny([constant(NaN), constant(42), constant(3.14)])
        )
      ).to.deep.equal(FALSE_VALUE);
    });

    it('search_isEmpty_array_isEmpty', () => {
      expect(evaluateToValue(constantArray([]).equalAny([]))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('search_isEmpty_array_containsEmptyArray_returnsTrue', () => {
      expect(
        evaluateToValue(constantArray([]).equalAny([constantArray([])]))
      ).to.deep.equal(TRUE_VALUE);
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
      ).to.deep.equal(TRUE_VALUE);
    });
  }); // end describe('eqAny')

  describe('isNaN', () => {
    it('nan_returnsTrue', () => {
      expect(
        evaluateToValue(equal(constant(NaN), constant(NaN)))
      ).to.deep.equal(TRUE_VALUE);
      expect(
        evaluateToValue(equal(field('nanValue'), constant(NaN)))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('notNan_returnsFalse', () => {
      expect(
        evaluateToValue(equal(constant(42.0), constant(NaN)))
      ).to.deep.equal(FALSE_VALUE);
      expect(evaluateToValue(equal(constant(42), NaN))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('isNotNan', () => {
      expect(
        evaluateToValue(notEqual(constant(42.0), constant(NaN)))
      ).to.deep.equal(TRUE_VALUE);
      expect(evaluateToValue(notEqual(constant(42), NaN))).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('otherNanRepresentations_returnsTrue', () => {
      const v1 = NaN; // In JS, any operation with NaN results in NaN
      expect(Number.isNaN(v1)).to.be.true;
      expect(evaluateToValue(equal(constant(v1), NaN))).to.deep.equal(
        TRUE_VALUE
      );

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
      ).to.deep.equal(TRUE_VALUE);

      expect(
        evaluateToValue(equal(add(constant(NaN), constant(1)), constant(NaN)))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('nonNumeric_returnsError', () => {
      expect(evaluateToValue(equal(constant(true), constant(NaN)))).to.be
        .undefined;
      expect(evaluateToValue(equal(constant('abc'), NaN))).to.be.undefined;
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
      expect(evaluateToValue(not(constant(1).equal(1)))).to.deep.equal(
        FALSE_VALUE
      );
    });

    it('false_to_true', () => {
      expect(evaluateToValue(not(constant(1).notEqual(1)))).to.deep.equal(
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
}); // end describe('Logical Functions')
