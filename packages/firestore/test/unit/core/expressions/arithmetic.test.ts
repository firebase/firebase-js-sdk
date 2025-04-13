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
  add,
  constant,
  divide,
  mod,
  multiply,
  subtract
} from '../../../../src/lite-api/expressions';
import { EvaluateResult } from '../../../../src/core/expressions';
import { evaluateToResult, evaluateToValue, expectEqual } from './utils';

describe('Arithmetic Expressions', () => {
  describe('add', () => {
    it('basic_add_numerics', () => {
      expectEqual(
        evaluateToValue(add(constant(1), constant(2))),
        constant(3),
        `add(1, 2)`
      );
      expectEqual(
        evaluateToValue(add(constant(1), constant(2.5))),
        constant(3.5),
        `add(1, 2.5)`
      );
      expectEqual(
        evaluateToValue(add(constant(1.0), constant(2))),
        constant(3.0),
        `add(1.0, 2)`
      );
      expectEqual(
        evaluateToValue(add(constant(1.0), constant(2.0))),
        constant(3.0),
        `add(1.0, 2.0)`
      );
    });

    it('basic_add_nonNumerics', () => {
      expect(evaluateToResult(add(constant(1), constant('1')))).to.deep.equal(
        EvaluateResult.newError()
      );
      expect(evaluateToResult(add(constant('1'), constant(1.0)))).to.deep.equal(
        EvaluateResult.newError()
      );
      expect(evaluateToResult(add(constant('1'), constant('1')))).to.deep.equal(
        EvaluateResult.newError()
      );
    });

    it('doubleLongAddition_overflow', () => {
      expectEqual(
        evaluateToValue(add(constant(9223372036854775807), constant(1.0))),
        constant(9.223372036854776e18),
        `add(Long.MAX_VALUE, 1.0)`
      );
      expectEqual(
        evaluateToValue(add(constant(9223372036854775807.0), constant(100))),
        constant(9.223372036854776e18),
        `add(Long.MAX_VALUE as double, 100)`
      );
    });

    it('doubleAddition_overflow', () => {
      expectEqual(
        evaluateToValue(
          add(constant(Number.MAX_VALUE), constant(Number.MAX_VALUE))
        ),
        constant(Number.POSITIVE_INFINITY),
        `add(Number.MAX_VALUE, Number.MAX_VALUE)`
      );
      expectEqual(
        evaluateToValue(
          add(constant(-Number.MAX_VALUE), constant(-Number.MAX_VALUE))
        ),
        constant(Number.NEGATIVE_INFINITY),
        `add(-Number.MAX_VALUE, -Number.MAX_VALUE)`
      );
    });

    it('sumPosAndNegInfinity_returnNaN', () => {
      expectEqual(
        evaluateToValue(
          add(
            constant(Number.POSITIVE_INFINITY),
            constant(Number.NEGATIVE_INFINITY)
          )
        ),
        constant(NaN),
        `add(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)`
      );
    });

    // TODO(pipeline): It is not possible to do long overflow in javascript because
    // the number will be converted to double by UserDataReader first.
    it('longAddition_overflow', () => {
      expect(
        evaluateToValue(
          add(
            constant(0x7fffffffffffffff, { preferIntegers: true }),
            constant(1)
          )
        )
      ).to.be.undefined;
      expect(
        evaluateToValue(
          add(
            constant(0x8000000000000000, { preferIntegers: true }),
            constant(-1)
          )
        )
      ).to.be.undefined;
      expect(
        evaluateToValue(
          add(
            constant(1),
            constant(0x7fffffffffffffff, { preferIntegers: true })
          )
        )
      ).to.be.undefined;
    });

    it('nan_number_returnNaN', () => {
      expectEqual(
        evaluateToValue(add(constant(1), constant(NaN))),
        constant(NaN),
        `add(1, NaN)`
      );
      expectEqual(
        evaluateToValue(add(constant(1.0), constant(NaN))),
        constant(NaN),
        `add(1.0, NaN)`
      );
      expectEqual(
        evaluateToValue(add(constant(Number.MAX_SAFE_INTEGER), constant(NaN))),
        constant(NaN),
        `add(Number.MAX_SAFE_INTEGER, NaN)`
      );
      expectEqual(
        evaluateToValue(add(constant(Number.MIN_SAFE_INTEGER), constant(NaN))),
        constant(NaN),
        `add(Number.MIN_SAFE_INTEGER, NaN)`
      );
      expectEqual(
        evaluateToValue(add(constant(Number.MAX_VALUE), constant(NaN))),
        constant(NaN),
        `add(Number.MAX_VALUE, NaN)`
      );
      expectEqual(
        evaluateToValue(add(constant(Number.MIN_VALUE), constant(NaN))),
        constant(NaN),
        `add(Number.MIN_VALUE, NaN)`
      );
      expectEqual(
        evaluateToValue(add(constant(Number.POSITIVE_INFINITY), constant(NaN))),
        constant(NaN),
        `add(Number.POSITIVE_INFINITY, NaN)`
      );
      expectEqual(
        evaluateToValue(add(constant(Number.NEGATIVE_INFINITY), constant(NaN))),
        constant(NaN),
        `add(Number.NEGATIVE_INFINITY, NaN)`
      );
    });

    it('nan_notNumberType_returnError', () => {
      expect(evaluateToValue(add(constant(NaN), constant('hello world')))).to.be
        .undefined;
    });

    it('multiArgument', () => {
      expectEqual(
        evaluateToValue(add(add(constant(1), constant(2)), constant(3))),
        constant(6),
        `add(add(1, 2), 3)`
      );
      expectEqual(
        evaluateToValue(add(add(constant(1.0), constant(2)), constant(3))),
        constant(6.0),
        `add(add(1.0, 2), 3)`
      );
    });
  }); // end describe('add')

  describe('subtract', () => {
    it('basic_subtract_numerics', () => {
      expectEqual(
        evaluateToValue(subtract(constant(1), constant(2))),
        constant(-1),
        `subtract(1, 2)`
      );
      expectEqual(
        evaluateToValue(subtract(constant(1), constant(2.5))),
        constant(-1.5),
        `subtract(1, 2.5)`
      );
      expectEqual(
        evaluateToValue(subtract(constant(1.0), constant(2))),
        constant(-1.0),
        `subtract(1.0, 2)`
      );
      expectEqual(
        evaluateToValue(subtract(constant(1.0), constant(2.0))),
        constant(-1.0),
        `subtract(1.0, 2.0)`
      );
    });

    it('basic_subtract_nonNumerics', () => {
      expect(evaluateToValue(subtract(constant(1), constant('1')))).to.be
        .undefined;
      expect(evaluateToValue(subtract(constant('1'), constant(1.0)))).to.be
        .undefined;
      expect(evaluateToValue(subtract(constant('1'), constant('1')))).to.be
        .undefined;
    });

    // TODO(pipeline): Overflow behavior is different in Javascript than backend.
    it.skip('doubleLongSubtraction_overflow', () => {
      expectEqual(
        evaluateToValue(subtract(constant(0x8000000000000000), constant(1.0))),
        constant(-9.223372036854776e18),
        `subtract(Long.MIN_VALUE, 1.0)`
      );
      expectEqual(
        evaluateToValue(subtract(constant(0x8000000000000000), constant(100))),
        constant(-9.223372036854776e18),
        `subtract(Long.MIN_VALUE, 100)`
      );
    });

    it('doubleSubtraction_overflow', () => {
      expectEqual(
        evaluateToValue(
          subtract(constant(-Number.MAX_VALUE), constant(Number.MAX_VALUE))
        ),
        constant(Number.NEGATIVE_INFINITY),
        `subtract(-Number.MAX_VALUE, Number.MAX_VALUE)`
      );
      expectEqual(
        evaluateToValue(
          subtract(constant(Number.MAX_VALUE), constant(-Number.MAX_VALUE))
        ),
        constant(Number.POSITIVE_INFINITY),
        `subtract(Number.MAX_VALUE, -Number.MAX_VALUE)`
      );
    });

    it('longSubtraction_overflow', () => {
      expect(
        evaluateToValue(
          subtract(
            constant(0x8000000000000000, { preferIntegers: true }),
            constant(1)
          )
        )
      ).to.be.undefined;
      expect(
        evaluateToValue(
          subtract(
            constant(0x8000000000000000, { preferIntegers: true }),
            constant(-1)
          )
        )
      ).to.be.undefined;
    });

    it('nan_number_returnNaN', () => {
      expectEqual(
        evaluateToValue(subtract(constant(1), constant(NaN))),
        constant(NaN),
        `subtract(1, NaN)`
      );
      expectEqual(
        evaluateToValue(subtract(constant(1.0), constant(NaN))),
        constant(NaN),
        `subtract(1.0, NaN)`
      );
      expectEqual(
        evaluateToValue(
          subtract(constant(Number.MAX_SAFE_INTEGER), constant(NaN))
        ),
        constant(NaN),
        `subtract(Number.MAX_SAFE_INTEGER, NaN)`
      );
      expectEqual(
        evaluateToValue(
          subtract(constant(Number.MIN_SAFE_INTEGER), constant(NaN))
        ),
        constant(NaN),
        `subtract(Number.MIN_SAFE_INTEGER, NaN)`
      );
      expectEqual(
        evaluateToValue(subtract(constant(Number.MAX_VALUE), constant(NaN))),
        constant(NaN),
        `subtract(Number.MAX_VALUE, NaN)`
      );
      expectEqual(
        evaluateToValue(subtract(constant(Number.MIN_VALUE), constant(NaN))),
        constant(NaN),
        `subtract(Number.MIN_VALUE, NaN)`
      );
      expectEqual(
        evaluateToValue(
          subtract(constant(Number.POSITIVE_INFINITY), constant(NaN))
        ),
        constant(NaN),
        `subtract(Number.POSITIVE_INFINITY, NaN)`
      );
      expectEqual(
        evaluateToValue(
          subtract(constant(Number.NEGATIVE_INFINITY), constant(NaN))
        ),
        constant(NaN),
        `subtract(Number.NEGATIVE_INFINITY, NaN)`
      );
    });

    it('nan_notNumberType_returnError', () => {
      expect(evaluateToValue(subtract(constant(NaN), constant('hello world'))))
        .to.be.undefined;
    });

    it('positiveInfinity', () => {
      expectEqual(
        evaluateToValue(
          subtract(constant(Number.POSITIVE_INFINITY), constant(1))
        ),
        constant(Number.POSITIVE_INFINITY),
        `subtract(Number.POSITIVE_INFINITY, 1)`
      );

      expectEqual(
        evaluateToValue(
          subtract(constant(1), constant(Number.POSITIVE_INFINITY))
        ),
        constant(Number.NEGATIVE_INFINITY),
        `subtract(1, Number.POSITIVE_INFINITY)`
      );
    });

    it('negativeInfinity', () => {
      expectEqual(
        evaluateToValue(
          subtract(constant(Number.NEGATIVE_INFINITY), constant(1))
        ),
        constant(Number.NEGATIVE_INFINITY),
        `subtract(Number.NEGATIVE_INFINITY, 1)`
      );

      expectEqual(
        evaluateToValue(
          subtract(constant(1), constant(Number.NEGATIVE_INFINITY))
        ),
        constant(Number.POSITIVE_INFINITY),
        `subtract(1, Number.NEGATIVE_INFINITY)`
      );
    });

    it('positiveInfinity_negativeInfinity', () => {
      expectEqual(
        evaluateToValue(
          subtract(
            constant(Number.POSITIVE_INFINITY),
            constant(Number.NEGATIVE_INFINITY)
          )
        ),
        constant(Number.POSITIVE_INFINITY),
        `subtract(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)`
      );

      expectEqual(
        evaluateToValue(
          subtract(
            constant(Number.NEGATIVE_INFINITY),
            constant(Number.POSITIVE_INFINITY)
          )
        ),
        constant(Number.NEGATIVE_INFINITY),
        `subtract(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)`
      );
    });
  }); // end describe('subtract')

  describe('multiply', () => {
    it('basic_multiply_numerics', () => {
      expectEqual(
        evaluateToValue(multiply(constant(1), constant(2))),
        constant(2),
        `multiply(1, 2)`
      );
      expectEqual(
        evaluateToValue(multiply(constant(3), constant(2.5))),
        constant(7.5),
        `multiply(3, 2.5)`
      );
      expectEqual(
        evaluateToValue(multiply(constant(1.0), constant(2))),
        constant(2.0),
        `multiply(1.0, 2)`
      );
      expectEqual(
        evaluateToValue(multiply(constant(1.32), constant(2.0))),
        constant(2.64),
        `multiply(1.32, 2.0)`
      );
    });

    it('basic_multiply_nonNumerics', () => {
      expect(evaluateToValue(multiply(constant(1), constant('1')))).to.be
        .undefined;
      expect(evaluateToValue(multiply(constant('1'), constant(1.0)))).to.be
        .undefined;
      expect(evaluateToValue(multiply(constant('1'), constant('1')))).to.be
        .undefined;
    });

    it('doubleLongMultiplication_overflow', () => {
      expectEqual(
        evaluateToValue(
          multiply(constant(9223372036854775807), constant(100.0))
        ),
        constant(922337203685477600000),
        `multiply(Long.MAX_VALUE, 100.0)`
      );
      expectEqual(
        evaluateToValue(multiply(constant(9223372036854775807), constant(100))),
        constant(922337203685477600000),
        `multiply(Long.MAX_VALUE, 100)`
      );
    });

    it('doubleMultiplication_overflow', () => {
      expectEqual(
        evaluateToValue(
          multiply(constant(Number.MAX_VALUE), constant(Number.MAX_VALUE))
        ),
        constant(Number.POSITIVE_INFINITY),
        `multiply(Number.MAX_VALUE, Number.MAX_VALUE)`
      );
      expectEqual(
        evaluateToValue(
          multiply(constant(-Number.MAX_VALUE), constant(Number.MAX_VALUE))
        ),
        constant(Number.NEGATIVE_INFINITY),
        `multiply(-Number.MAX_VALUE, Number.MAX_VALUE)`
      );
    });

    it('longMultiplication_overflow', () => {
      expect(
        evaluateToValue(
          multiply(
            constant(9223372036854775807, { preferIntegers: true }),
            constant(10)
          )
        )
      ).to.be.undefined;
      expect(
        evaluateToValue(
          multiply(
            constant(0x8000000000000000, { preferIntegers: true }),
            constant(10)
          )
        )
      ).to.be.undefined;
      expect(
        evaluateToValue(
          multiply(
            constant(-10),
            constant(9223372036854775807, { preferIntegers: true })
          )
        )
      ).to.be.undefined;
      expect(
        evaluateToValue(
          multiply(
            constant(-10),
            constant(0x8000000000000000, { preferIntegers: true })
          )
        )
      ).to.be.undefined;
    });

    it('nan_number_returnNaN', () => {
      expectEqual(
        evaluateToValue(multiply(constant(1), constant(NaN))),
        constant(NaN),
        `multiply(1, NaN)`
      );
      expectEqual(
        evaluateToValue(multiply(constant(1.0), constant(NaN))),
        constant(NaN),
        `multiply(1.0, NaN)`
      );
      expectEqual(
        evaluateToValue(
          multiply(constant(Number.MAX_SAFE_INTEGER), constant(NaN))
        ),
        constant(NaN),
        `multiply(Number.MAX_SAFE_INTEGER, NaN)`
      );
      expectEqual(
        evaluateToValue(
          multiply(constant(Number.MIN_SAFE_INTEGER), constant(NaN))
        ),
        constant(NaN),
        `multiply(Number.MIN_SAFE_INTEGER, NaN)`
      );
      expectEqual(
        evaluateToValue(multiply(constant(Number.MAX_VALUE), constant(NaN))),
        constant(NaN),
        `multiply(Number.MAX_VALUE, NaN)`
      );
      expectEqual(
        evaluateToValue(multiply(constant(Number.MIN_VALUE), constant(NaN))),
        constant(NaN),
        `multiply(Number.MIN_VALUE, NaN)`
      );
      expectEqual(
        evaluateToValue(
          multiply(constant(Number.POSITIVE_INFINITY), constant(NaN))
        ),
        constant(NaN),
        `multiply(Number.POSITIVE_INFINITY, NaN)`
      );
      expectEqual(
        evaluateToValue(
          multiply(constant(Number.NEGATIVE_INFINITY), constant(NaN))
        ),
        constant(NaN),
        `multiply(Number.NEGATIVE_INFINITY, NaN)`
      );
    });

    it('nan_notNumberType_returnError', () => {
      expect(evaluateToValue(multiply(constant(NaN), constant('hello world'))))
        .to.be.undefined;
    });

    it('positiveInfinity', () => {
      expectEqual(
        evaluateToValue(
          multiply(constant(Number.POSITIVE_INFINITY), constant(1))
        ),
        constant(Number.POSITIVE_INFINITY),
        `multiply(Number.POSITIVE_INFINITY, 1)`
      );

      expectEqual(
        evaluateToValue(
          multiply(constant(1), constant(Number.POSITIVE_INFINITY))
        ),
        constant(Number.POSITIVE_INFINITY),
        `multiply(1, Number.POSITIVE_INFINITY)`
      );
    });

    it('negativeInfinity', () => {
      expectEqual(
        evaluateToValue(
          multiply(constant(Number.NEGATIVE_INFINITY), constant(1))
        ),
        constant(Number.NEGATIVE_INFINITY),
        `multiply(Number.NEGATIVE_INFINITY, 1)`
      );

      expectEqual(
        evaluateToValue(
          multiply(constant(1), constant(Number.NEGATIVE_INFINITY))
        ),
        constant(Number.NEGATIVE_INFINITY),
        `multiply(1, Number.NEGATIVE_INFINITY)`
      );
    });

    it('positiveInfinity_negativeInfinity_returnsNegativeInfinity', () => {
      expectEqual(
        evaluateToValue(
          multiply(
            constant(Number.POSITIVE_INFINITY),
            constant(Number.NEGATIVE_INFINITY)
          )
        ),
        constant(Number.NEGATIVE_INFINITY),
        `multiply(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)`
      );

      expectEqual(
        evaluateToValue(
          multiply(
            constant(Number.NEGATIVE_INFINITY),
            constant(Number.POSITIVE_INFINITY)
          )
        ),
        constant(Number.NEGATIVE_INFINITY),
        `multiply(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)`
      );
    });

    it('multiArgument', () => {
      expectEqual(
        evaluateToValue(
          multiply(multiply(constant(1), constant(2)), constant(3))
        ),
        constant(6),
        `multiply(multiply(1, 2, 3))`
      );
      expectEqual(
        evaluateToValue(
          multiply(constant(1.0), multiply(constant(2), constant(3)))
        ),
        constant(6.0),
        `multiply(1.0, multiply(2, 3))`
      );
    });
  }); // end describe('multiply')

  describe('divide', () => {
    it('basic_divide_numerics', () => {
      expectEqual(
        evaluateToValue(divide(constant(10), constant(2))),
        constant(5),
        `divide(10, 2)`
      );
      expectEqual(
        evaluateToValue(divide(constant(10), constant(2.0))),
        constant(5.0),
        `divide(10, 2.0)`
      );
      // TODO(pipeline): Constant.of is problematic here.
      // expectEqual(
      //   evaluate(divide(constant(10.0), constant(3))),
      //   constant(10.0 / 3),
      //   `divide(10.0, 3)`
      // );
      // expectEqual(
      //   evaluate(divide(constant(10.0), constant(7.0))),
      //   constant(10.0 / 7.0),
      //   `divide(10.0, 7.0)`
      // );
    });

    it('basic_divide_nonNumerics', () => {
      expect(evaluateToValue(divide(constant(1), constant('1')))).to.be
        .undefined;
      expect(evaluateToValue(divide(constant('1'), constant(1.0)))).to.be
        .undefined;
      expect(evaluateToValue(divide(constant('1'), constant('1')))).to.be
        .undefined;
    });

    it('long_division', () => {
      expectEqual(
        evaluateToValue(divide(constant(10), constant(3))),
        constant(3), // Integer division in JavaScript
        `divide(10, 3)`
      );
      expectEqual(
        evaluateToValue(divide(constant(-10), constant(3))),
        constant(-3), // Integer division in JavaScript
        `divide(-10, 3)`
      );
      expectEqual(
        evaluateToValue(divide(constant(10), constant(-3))),
        constant(-3), // Integer division in JavaScript
        `divide(10, -3)`
      );
      expectEqual(
        evaluateToValue(divide(constant(-10), constant(-3))),
        constant(3), // Integer division in JavaScript
        `divide(-10, -3)`
      );
    });

    it('doubleLongDivision_overflow', () => {
      expectEqual(
        evaluateToValue(
          divide(constant(Number.MAX_SAFE_INTEGER), constant(0.1))
        ),
        constant(90071992547409910), // Note: JS limitation, see explanation below
        `divide(Number.MAX_SAFE_INTEGER, 0.1)`
      );
      expectEqual(
        evaluateToValue(
          divide(constant(Number.MAX_SAFE_INTEGER), constant(0.1))
        ),
        constant(90071992547409910), // Note: JS limitation, see explanation below
        `divide(Number.MAX_SAFE_INTEGER, 0.1)`
      );
    });

    it('doubleDivision_overflow', () => {
      expectEqual(
        evaluateToValue(
          divide(constant(Number.MAX_VALUE), constant(Number.MIN_VALUE))
        ),
        constant(Number.POSITIVE_INFINITY),
        `divide(Number.MAX_VALUE, Number.MIN_VALUE)`
      );
      expectEqual(
        evaluateToValue(
          divide(constant(-Number.MAX_VALUE), constant(Number.MIN_VALUE))
        ),
        constant(Number.NEGATIVE_INFINITY),
        `divide(-Number.MAX_VALUE, Number.MIN_VALUE)`
      );
    });

    it('divideByZero', () => {
      expect(evaluateToValue(divide(constant(1), constant(0)))).to.be.undefined; // Or your error handling
      expectEqual(
        evaluateToValue(divide(constant(1.1), constant(0.0))),
        constant(Number.POSITIVE_INFINITY),
        `divide(1, 0.0)`
      );
      expectEqual(
        evaluateToValue(divide(constant(1.1), constant(-0.0))),
        constant(Number.NEGATIVE_INFINITY),
        `divide(1, -0.0)`
      );
    });

    it('nan_number_returnNaN', () => {
      expectEqual(
        evaluateToValue(divide(constant(1), constant(NaN))),
        constant(NaN),
        `divide(1, NaN)`
      );
      expectEqual(
        evaluateToValue(divide(constant(NaN), constant(1))),
        constant(NaN),
        `divide(NaN, 1)`
      );

      expectEqual(
        evaluateToValue(divide(constant(1.0), constant(NaN))),
        constant(NaN),
        `divide(1.0, NaN)`
      );
      expectEqual(
        evaluateToValue(divide(constant(NaN), constant(1.0))),
        constant(NaN),
        `divide(NaN, 1.0)`
      );

      expectEqual(
        evaluateToValue(
          divide(constant(Number.MAX_SAFE_INTEGER), constant(NaN))
        ),
        constant(NaN),
        `divide(Number.MAX_SAFE_INTEGER, NaN)`
      );
      expectEqual(
        evaluateToValue(
          divide(constant(NaN), constant(Number.MAX_SAFE_INTEGER))
        ),
        constant(NaN),
        `divide(NaN, Number.MAX_SAFE_INTEGER)`
      );

      expectEqual(
        evaluateToValue(
          divide(constant(Number.MIN_SAFE_INTEGER), constant(NaN))
        ),
        constant(NaN),
        `divide(Number.MIN_SAFE_INTEGER, NaN)`
      );
      expectEqual(
        evaluateToValue(
          divide(constant(NaN), constant(Number.MIN_SAFE_INTEGER))
        ),
        constant(NaN),
        `divide(NaN, Number.MIN_SAFE_INTEGER)`
      );

      expectEqual(
        evaluateToValue(divide(constant(Number.MAX_VALUE), constant(NaN))),
        constant(NaN),
        `divide(Number.MAX_VALUE, NaN)`
      );
      expectEqual(
        evaluateToValue(divide(constant(NaN), constant(Number.MAX_VALUE))),
        constant(NaN),
        `divide(NaN, Number.MAX_VALUE)`
      );

      expectEqual(
        evaluateToValue(divide(constant(Number.MIN_VALUE), constant(NaN))),
        constant(NaN),
        `divide(Number.MIN_VALUE, NaN)`
      );
      expectEqual(
        evaluateToValue(divide(constant(NaN), constant(Number.MIN_VALUE))),
        constant(NaN),
        `divide(NaN, Number.MIN_VALUE)`
      );

      expectEqual(
        evaluateToValue(
          divide(constant(Number.POSITIVE_INFINITY), constant(NaN))
        ),
        constant(NaN),
        `divide(Number.POSITIVE_INFINITY, NaN)`
      );
      expectEqual(
        evaluateToValue(divide(constant(NaN), constant(NaN))),
        constant(NaN),
        `divide(NaN, NaN)`
      );

      expectEqual(
        evaluateToValue(
          divide(constant(Number.NEGATIVE_INFINITY), constant(NaN))
        ),
        constant(NaN),
        `divide(Number.NEGATIVE_INFINITY, NaN)`
      );
      expectEqual(
        evaluateToValue(
          divide(constant(NaN), constant(Number.NEGATIVE_INFINITY))
        ),
        constant(NaN),
        `divide(NaN, Number.NEGATIVE_INFINITY)`
      );
    });

    it('nan_notNumberType_returnError', () => {
      expect(evaluateToValue(divide(constant(NaN), constant('hello world')))).to
        .be.undefined;
    });

    it('positiveInfinity', () => {
      expectEqual(
        evaluateToValue(
          divide(constant(Number.POSITIVE_INFINITY), constant(1))
        ),
        constant(Number.POSITIVE_INFINITY),
        `divide(Number.POSITIVE_INFINITY, 1)`
      );
      // TODO(pipeline): Constant.of is problematic here.
      // expectEqual(
      //   evaluate(
      //     divide(constant(1), constant(Number.POSITIVE_INFINITY))
      //   ),
      //   constant(0.0),
      //   `divide(1, Number.POSITIVE_INFINITY)`
      // );
    });

    it('negativeInfinity', () => {
      expectEqual(
        evaluateToValue(
          divide(constant(Number.NEGATIVE_INFINITY), constant(1))
        ),
        constant(Number.NEGATIVE_INFINITY),
        `divide(Number.NEGATIVE_INFINITY, 1)`
      );
      expectEqual(
        evaluateToValue(
          divide(constant(1), constant(Number.NEGATIVE_INFINITY))
        ),
        constant(-0.0),
        `divide(1, Number.NEGATIVE_INFINITY)`
      );
    });

    it('positiveInfinity_negativeInfinity_returnsNan', () => {
      expectEqual(
        evaluateToValue(
          divide(
            constant(Number.POSITIVE_INFINITY),
            constant(Number.NEGATIVE_INFINITY)
          )
        ),
        constant(NaN),
        `divide(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)`
      );
      expectEqual(
        evaluateToValue(
          divide(
            constant(Number.NEGATIVE_INFINITY),
            constant(Number.POSITIVE_INFINITY)
          )
        ),
        constant(NaN),
        `divide(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)`
      );
    });
  }); // end describe('divide')

  describe('mod', () => {
    it('divisorZero_throwsError', () => {
      expect(evaluateToValue(mod(constant(42), constant(0)))).to.be.undefined;
      expect(evaluateToValue(mod(constant(42), constant(-0)))).to.be.undefined;

      expect(evaluateToValue(mod(constant(42), constant(0.0)))).to.be.undefined;
      expect(evaluateToValue(mod(constant(42), constant(-0.0)))).to.be
        .undefined;
    });

    it('dividendZero_returnsZero', () => {
      expectEqual(
        evaluateToValue(mod(constant(0), constant(42))),
        constant(0),
        `mod(0, 42)`
      );
      expectEqual(
        evaluateToValue(mod(constant(-0), constant(42))),
        constant(0),
        `mod(-0, 42)`
      );

      expectEqual(
        evaluateToValue(mod(constant(0.0), constant(42))),
        constant(0.0),
        `mod(0.0, 42)`
      );
      expectEqual(
        evaluateToValue(mod(constant(-0.0), constant(42))),
        constant(-0.0),
        `mod(-0.0, 42)`
      );
    });

    it('long_positive_positive', () => {
      expectEqual(
        evaluateToValue(mod(constant(10), constant(3))),
        constant(1),
        `mod(10, 3)`
      );
    });

    it('long_negative_negative', () => {
      expectEqual(
        evaluateToValue(mod(constant(-10), constant(-3))),
        constant(-1),
        `mod(-10, -3)`
      );
    });

    it('long_positive_negative', () => {
      expectEqual(
        evaluateToValue(mod(constant(10), constant(-3))),
        constant(1),
        `mod(10, -3)`
      );
    });

    it('long_negative_positive', () => {
      expectEqual(
        evaluateToValue(mod(constant(-10), constant(3))),
        constant(-1),
        `mod(-10, 3)`
      );
    });

    it('double_positive_positive', () => {
      expect(
        evaluateToValue(mod(constant(10.5), constant(3.0)))?.doubleValue
      ).to.be.closeTo(1.5, 1e-6);
    });

    it('double_negative_negative', () => {
      expect(
        evaluateToValue(mod(constant(-7.3), constant(-1.8)))?.doubleValue
      ).to.be.closeTo(-0.1, 1e-6);
    });

    it('double_positive_negative', () => {
      expect(
        evaluateToValue(mod(constant(9.8), constant(-2.5)))?.doubleValue
      ).to.be.closeTo(2.3, 1e-6);
    });

    it('double_negative_positive', () => {
      expect(
        evaluateToValue(mod(constant(-7.5), constant(2.3)))?.doubleValue
      ).to.be.closeTo(-0.6, 1e-6);
    });

    it('long_perfectlyDivisible', () => {
      expectEqual(
        evaluateToValue(mod(constant(10), constant(5))),
        constant(0),
        `mod(10, 5)`
      );
      expectEqual(
        evaluateToValue(mod(constant(-10), constant(5))),
        constant(0),
        `mod(-10, 5)`
      );
      expectEqual(
        evaluateToValue(mod(constant(10), constant(-5))),
        constant(0),
        `mod(10, -5)`
      );
      expectEqual(
        evaluateToValue(mod(constant(-10), constant(-5))),
        constant(0),
        `mod(-10, -5)`
      );
    });

    it('double_perfectlyDivisible', () => {
      expectEqual(
        evaluateToValue(mod(constant(10), constant(2.5))),
        constant(0.0),
        `mod(10, 2.5)`
      );
      expectEqual(
        evaluateToValue(mod(constant(10), constant(-2.5))),
        constant(0.0),
        `mod(10, -2.5)`
      );
      expectEqual(
        evaluateToValue(mod(constant(-10), constant(2.5))),
        constant(-0.0),
        `mod(-10, 2.5)`
      );
      expectEqual(
        evaluateToValue(mod(constant(-10), constant(-2.5))),
        constant(-0.0),
        `mod(-10, -2.5)`
      );
    });

    it('nonNumerics_returnError', () => {
      expect(evaluateToValue(mod(constant(10), constant('1')))).to.be.undefined;
      expect(evaluateToValue(mod(constant('1'), constant(10)))).to.be.undefined;
      expect(evaluateToValue(mod(constant('1'), constant('1')))).to.be
        .undefined;
    });

    it('nan_number_returnNaN', () => {
      expectEqual(
        evaluateToValue(mod(constant(1), constant(NaN))),
        constant(NaN),
        `mod(1, NaN)`
      );
      expectEqual(
        evaluateToValue(mod(constant(1.0), constant(NaN))),
        constant(NaN),
        `mod(1.0, NaN)`
      );
      expectEqual(
        evaluateToValue(mod(constant(Number.MAX_SAFE_INTEGER), constant(NaN))),
        constant(NaN),
        `mod(Number.MAX_SAFE_INTEGER, NaN)`
      );
      expectEqual(
        evaluateToValue(mod(constant(Number.MIN_SAFE_INTEGER), constant(NaN))),
        constant(NaN),
        `mod(Number.MIN_SAFE_INTEGER, NaN)`
      );
      expectEqual(
        evaluateToValue(mod(constant(Number.MAX_VALUE), constant(NaN))),
        constant(NaN),
        `mod(Number.MAX_VALUE, NaN)`
      );
      expectEqual(
        evaluateToValue(mod(constant(Number.MIN_VALUE), constant(NaN))),
        constant(NaN),
        `mod(Number.MIN_VALUE, NaN)`
      );
      expectEqual(
        evaluateToValue(mod(constant(Number.POSITIVE_INFINITY), constant(NaN))),
        constant(NaN),
        `mod(Number.POSITIVE_INFINITY, NaN)`
      );
      expectEqual(
        evaluateToValue(mod(constant(Number.NEGATIVE_INFINITY), constant(NaN))),
        constant(NaN),
        `mod(Number.NEGATIVE_INFINITY, NaN)`
      );
    });

    it('nan_notNumberType_returnError', () => {
      expect(evaluateToValue(mod(constant(NaN), constant('hello world')))).to.be
        .undefined;
    });

    it('number_posInfinity_returnSelf', () => {
      expectEqual(
        evaluateToValue(mod(constant(1), constant(Number.POSITIVE_INFINITY))),
        constant(1.0),
        `mod(1, Number.POSITIVE_INFINITY)`
      );
      expectEqual(
        evaluateToValue(
          mod(constant(42.123456789), constant(Number.POSITIVE_INFINITY))
        ),
        constant(42.123456789),
        `mod(42.123456789, Number.POSITIVE_INFINITY)`
      );
      expectEqual(
        evaluateToValue(
          mod(constant(-99.9), constant(Number.POSITIVE_INFINITY))
        ),
        constant(-99.9),
        `mod(-99.9, Number.POSITIVE_INFINITY)`
      );
    });

    it('posInfinity_number_returnNaN', () => {
      expectEqual(
        evaluateToValue(mod(constant(Number.POSITIVE_INFINITY), constant(1))),
        constant(NaN),
        `mod(Number.POSITIVE_INFINITY, 1)`
      );
      expectEqual(
        evaluateToValue(
          mod(constant(Number.POSITIVE_INFINITY), constant(42.123456789))
        ),
        constant(NaN),
        `mod(Number.POSITIVE_INFINITY, 42.123456789)`
      );
      expectEqual(
        evaluateToValue(
          mod(constant(Number.POSITIVE_INFINITY), constant(-99.9))
        ),
        constant(NaN),
        `mod(Number.POSITIVE_INFINITY, -99.9)`
      );
    });

    it('number_negInfinity_returnSelf', () => {
      expectEqual(
        evaluateToValue(mod(constant(1), constant(Number.NEGATIVE_INFINITY))),
        constant(1.0),
        `mod(1, Number.NEGATIVE_INFINITY)`
      );
      expectEqual(
        evaluateToValue(
          mod(constant(42.123456789), constant(Number.NEGATIVE_INFINITY))
        ),
        constant(42.123456789),
        `mod(42.123456789, Number.NEGATIVE_INFINITY)`
      );
      expectEqual(
        evaluateToValue(
          mod(constant(-99.9), constant(Number.NEGATIVE_INFINITY))
        ),
        constant(-99.9),
        `mod(-99.9, Number.NEGATIVE_INFINITY)`
      );
    });

    it('negInfinity_number_returnNaN', () => {
      expectEqual(
        evaluateToValue(mod(constant(Number.NEGATIVE_INFINITY), constant(1))),
        constant(NaN),
        `mod(Number.NEGATIVE_INFINITY, 1)`
      );
      expectEqual(
        evaluateToValue(
          mod(constant(Number.NEGATIVE_INFINITY), constant(42.123456789))
        ),
        constant(NaN),
        `mod(Number.NEGATIVE_INFINITY, 42.123456789)`
      );
      expectEqual(
        evaluateToValue(
          mod(constant(Number.NEGATIVE_INFINITY), constant(-99.9))
        ),
        constant(NaN),
        `mod(Number.NEGATIVE_INFINITY, -99.9)`
      );
    });

    it('posAndNegInfinity_returnNaN', () => {
      expectEqual(
        evaluateToValue(
          mod(
            constant(Number.POSITIVE_INFINITY),
            constant(Number.NEGATIVE_INFINITY)
          )
        ),
        constant(NaN),
        `mod(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)`
      );
    });
  }); // end describe('mod')
}); // end describe('Arithmetic Expressions')
