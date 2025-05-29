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
  arrayContains,
  arrayContainsAll,
  arrayContainsAny,
  arrayLength,
  byteLength,
  charLength,
  constant,
  cosineDistance,
  divide,
  dotProduct,
  endsWith,
  eq,
  eqAny,
  euclideanDistance,
  Expr,
  field,
  FunctionExpr,
  gt,
  gte,
  isNan,
  isNotNan,
  like,
  lt,
  lte,
  mod,
  multiply,
  neq,
  notEqAny,
  regexContains,
  regexMatch,
  startsWith,
  strConcat,
  strContains,
  subtract,
  timestampToUnixMicros,
  timestampToUnixMillis,
  timestampToUnixSeconds,
  toLower,
  toUpper,
  trim,
  unixMicrosToTimestamp,
  unixMillisToTimestamp,
  unixSecondsToTimestamp,
  vectorLength
} from '../../../../src/lite-api/expressions';
import { EvaluateResult } from '../../../../src/core/expressions';
import {
  ERROR_VALUE,
  errorExpr,
  evaluateToResult,
  evaluateToValue,
  expectEqual
} from './utils';

describe('Unary Function Input Mirroring', () => {
  const unaryFunctionBuilders: Array<(v: Expr) => FunctionExpr> = [
    isNan,
    isNotNan,
    arrayLength,
    // TODO(b/351084804): reverse is not implemented yet
    // reverse,
    charLength,
    byteLength,
    toLower,
    toUpper,
    trim,
    vectorLength,
    unixMicrosToTimestamp,
    timestampToUnixMicros,
    unixMillisToTimestamp,
    timestampToUnixMillis,
    unixSecondsToTimestamp,
    timestampToUnixSeconds
    // TODO(b/351084804): timestampAdd is not unary
    // timestampAdd
  ];

  const testCases = [
    {
      inputExpr: constant(null),
      expectedResult: constant(null),
      description: 'NULL'
    },
    {
      inputExpr: errorExpr(),
      expectedResult: ERROR_VALUE,
      description: 'ERROR'
    },
    {
      inputExpr: field('non-existent-field'),
      expectedResult: ERROR_VALUE,
      description: 'UNSET'
    }
  ];

  unaryFunctionBuilders.forEach(builder => {
    const funcName = builder(constant('dummy')).name;

    it(`mirrors input for ${funcName}()`, () => {
      testCases.forEach(testCase => {
        let exprToEvaluate;
        try {
          exprToEvaluate = builder(testCase.inputExpr);
        } catch (e) {
          throw new Error(
            `Builder ${funcName} threw unexpectedly for input ${testCase.description}: ${e}`
          );
        }

        const actualResult = evaluateToValue(exprToEvaluate);

        if (testCase.expectedResult === ERROR_VALUE) {
          expect(
            actualResult,
            `${funcName}(${testCase.description}) should evaluate to ERROR (undefined)`
          ).to.be.undefined;
        } else {
          expectEqual(
            actualResult,
            testCase.expectedResult,
            `${funcName}(${testCase.description}) should evaluate to NULL`
          );
        }
      });
    });
  });
}); // end describe('Unary Function Input Mirroring')

describe('Binary Function Input Mirroring', () => {
  // List of functions to test (builders accepting two Expr args)
  const binaryFunctionBuilders: Array<(v1: Expr, v2: Expr) => FunctionExpr> = [
    // Arithmetic (Variadic, base is binary)
    add,
    subtract,
    multiply,
    divide,
    mod,
    // Comparison
    eq,
    neq,
    lt,
    lte,
    gt,
    gte,
    // Array
    arrayContains,
    arrayContainsAll,
    arrayContainsAny,
    eqAny,
    notEqAny,
    // String
    like,
    regexContains,
    regexMatch,
    strContains,
    startsWith,
    endsWith,
    strConcat, // strConcat is variadic
    // Map
    // mapGet,
    // Vector
    cosineDistance,
    dotProduct,
    euclideanDistance
  ];

  // Define test inputs
  const NULL_INPUT = constant(null);
  const ERROR_INPUT = errorExpr(); // Use existing helper
  const UNSET_INPUT = field('non-existent-field'); // Use existing helper (UNSET_VALUE)
  const VALID_INPUT = constant(42); // A simple valid input for cases needing one

  // Define test cases based on the rules
  const testCases = [
    // Rule 1: NULL, NULL -> NULL
    {
      left: NULL_INPUT,
      right: NULL_INPUT,
      expected: NULL_INPUT,
      description: 'NULL, NULL -> NULL'
    },
    // Rule 2: Error/Unset propagation
    {
      left: NULL_INPUT,
      right: ERROR_INPUT,
      expected: ERROR_VALUE,
      description: 'NULL, ERROR -> ERROR'
    },
    {
      left: ERROR_INPUT,
      right: NULL_INPUT,
      expected: ERROR_VALUE,
      description: 'ERROR, NULL -> ERROR'
    },
    {
      left: NULL_INPUT,
      right: UNSET_INPUT,
      expected: ERROR_VALUE,
      description: 'NULL, UNSET -> ERROR'
    },
    {
      left: UNSET_INPUT,
      right: NULL_INPUT,
      expected: ERROR_VALUE,
      description: 'UNSET, NULL -> ERROR'
    },
    {
      left: ERROR_INPUT,
      right: ERROR_INPUT,
      expected: ERROR_VALUE,
      description: 'ERROR, ERROR -> ERROR'
    },
    {
      left: ERROR_INPUT,
      right: UNSET_INPUT,
      expected: ERROR_VALUE,
      description: 'ERROR, UNSET -> ERROR'
    },
    {
      left: UNSET_INPUT,
      right: ERROR_INPUT,
      expected: ERROR_VALUE,
      description: 'UNSET, ERROR -> ERROR'
    },
    {
      left: UNSET_INPUT,
      right: UNSET_INPUT,
      expected: ERROR_VALUE,
      description: 'UNSET, UNSET -> ERROR'
    },
    {
      left: VALID_INPUT,
      right: ERROR_INPUT,
      expected: ERROR_VALUE,
      description: 'VALID, ERROR -> ERROR'
    },
    {
      left: ERROR_INPUT,
      right: VALID_INPUT,
      expected: ERROR_VALUE,
      description: 'ERROR, VALID -> ERROR'
    },
    {
      left: VALID_INPUT,
      right: UNSET_INPUT,
      expected: ERROR_VALUE,
      description: 'VALID, UNSET -> ERROR'
    },
    {
      left: UNSET_INPUT,
      right: VALID_INPUT,
      expected: ERROR_VALUE,
      description: 'UNSET, VALID -> ERROR'
    }
  ];

  binaryFunctionBuilders.forEach(builder => {
    const funcName = builder(constant('dummy'), constant('dummy')).name;

    it(`mirrors input for ${funcName}()`, () => {
      testCases.forEach(testCase => {
        let exprToEvaluate: Expr;
        try {
          // Builders take the first two arguments for variadic functions
          exprToEvaluate = builder(testCase.left, testCase.right);
        } catch (e) {
          // Catch errors during expression construction
          throw new Error(
            `Builder ${funcName} threw unexpectedly for inputs (${testCase.description}): ${e}`
          );
        }

        const actualResult = evaluateToResult(exprToEvaluate);

        if (testCase.expected === ERROR_VALUE) {
          expect(
            actualResult,
            `${funcName}(${testCase.description}) should evaluate to ERROR (undefined)`
          ).to.deep.equal(EvaluateResult.newError());
        } else if (testCase.expected === NULL_INPUT) {
          expect(
            actualResult,
            `${funcName}(${testCase.description}) should evaluate to NULL`
          ).to.deep.equal(EvaluateResult.newNull());
        } else {
          // This case shouldn't be hit by current test definitions
          expect(
            actualResult,
            `${funcName}(${
              testCase.description
            }) should evaluate to ${JSON.stringify(testCase.expected)}`
          ).to.deep.equal(testCase.expected);
        }
      });
    });
  });
}); // end describe('Binary Function Input Mirroring')
