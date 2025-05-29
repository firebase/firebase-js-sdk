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
import { evaluateToResult, evaluateToValue, expectEqual } from './utils';
import {
  arrayContains,
  arrayContainsAll,
  arrayContainsAny,
  arrayLength,
  BooleanExpr,
  constant,
  field,
  not
} from '../../../../src/lite-api/expressions';
import { constantArray, constantMap } from '../../../util/pipelines';
import {
  FALSE_VALUE,
  MIN_VALUE,
  TRUE_VALUE
} from '../../../../src/model/values';
import { EvaluateResult } from '../../../../src/core/expressions';
import { VectorValue } from '../../../../src';

describe('Array Expressions', () => {
  describe('arrayContainsAll', () => {
    it('containsAll', () => {
      expect(
        evaluateToValue(
          arrayContainsAll(
            constantArray([
              '1',
              42,
              true,
              'additional',
              'values',
              'in',
              'array'
            ]),
            [constant('1'), constant(42), constant(true)]
          )
        )
      ).to.deep.equal(TRUE_VALUE);
    });

    it('doesNotContainAll', () => {
      expect(
        evaluateToValue(
          arrayContainsAll(constantArray(['1', 42, true]), [
            constant('1'),
            constant(99)
          ])
        )
      ).to.deep.equal(FALSE_VALUE);
    });

    it('equivalentNumerics', () => {
      expect(
        evaluateToValue(
          arrayContainsAll(
            constantArray([42, true, 'additional', 'values', 'in', 'array']),
            [constant(42.0), constant(true)]
          )
        )
      ).to.deep.equal(TRUE_VALUE);
    });

    it('arrayToSearch_isEmpty', () => {
      expect(
        evaluateToValue(
          arrayContainsAll(constantArray([]), [constant(42.0), constant(true)])
        )
      ).to.deep.equal(FALSE_VALUE);
    });

    it('searchValue_isEmpty', () => {
      expect(
        evaluateToValue(arrayContainsAll(constantArray([42.0, true]), []))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('searchValue_isNaN', () => {
      expect(
        evaluateToValue(
          arrayContainsAll(constantArray([NaN, 42.0]), [constant(NaN)])
        )
      ).to.deep.equal(FALSE_VALUE);
    });

    it('searchValue_hasDuplicates', () => {
      expect(
        evaluateToValue(
          arrayContainsAll(constantArray([true, 'hi']), [
            constant(true),
            constant(true),
            constant(true)
          ])
        )
      ).to.deep.equal(TRUE_VALUE);
    });

    it('arrayToSearch_isEmpty_searchValue_isEmpty', () => {
      expect(
        evaluateToValue(arrayContainsAll(constantArray([]), []))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('largeNumberOfElements', () => {
      const elements = Array.from({ length: 500 }, (_, i) => i + 1);
      expect(
        evaluateToValue(
          arrayContainsAll(
            constantArray(elements),
            elements.map(e => constant(e))
          )
        )
      ).to.deep.equal(TRUE_VALUE);
    });
  });

  describe('arrayContainsAny', () => {
    const ARRAY_TO_SEARCH = constantArray([42, 'matang', true]);
    const SEARCH_VALUES = [constant('matang'), constant(false)];

    it('valueFoundInArray', () => {
      expect(
        evaluateToValue(arrayContainsAny(ARRAY_TO_SEARCH, SEARCH_VALUES))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('equivalentNumerics', () => {
      expect(
        evaluateToValue(
          arrayContainsAny(ARRAY_TO_SEARCH, [constant(42.0), constant(2)])
        )
      ).to.deep.equal(TRUE_VALUE);
    });

    it('valuesNotFoundInArray', () => {
      expect(
        evaluateToValue(
          arrayContainsAny(ARRAY_TO_SEARCH, [constant(99), constant('false')])
        )
      ).to.deep.equal(FALSE_VALUE);
    });

    // TODO(pipeline): Nested arrays are not supported in documents. We need to
    // support creating nested arrays as expressions however.
    it.skip('bothInputTypeIsArray', () => {
      expect(
        evaluateToValue(
          arrayContainsAny(
            constantArray([
              [1, 2, 3],
              [4, 5, 6],
              [7, 8, 9]
            ]),
            [constantArray([1, 2, 3]), constantArray([4, 5, 6])]
          )
        )
      ).to.deep.equal(TRUE_VALUE);
    });

    it('search_isNull_returnsNull', () => {
      expect(
        evaluateToResult(
          arrayContainsAny(constantArray([null, 1, 'matang', true]), [
            constant(null)
          ])
        )
      ).to.deep.equal(EvaluateResult.newNull());
    });

    it('array_isNotArrayType_returnsError', () => {
      expect(
        evaluateToValue(arrayContainsAny(constant('matang'), SEARCH_VALUES))
      ).to.be.undefined;
    });

    it('search_isNotArrayType_returnsError', () => {
      expect(
        evaluateToValue(
          arrayContainsAny(constant('values'), [constant('values')])
        )
      ).to.be.undefined;
    });

    it('array_notFound_returnsError', () => {
      expect(
        evaluateToValue(arrayContainsAny(field('not-exist'), SEARCH_VALUES))
      ).to.be.undefined;
    });

    it('searchNotFound_returnsError', () => {
      expect(
        evaluateToValue(arrayContainsAny(ARRAY_TO_SEARCH, [field('not-exist')]))
      ).to.be.undefined;
    });
  }); // end describe('arrayContainsAny')

  describe('arrayContains', () => {
    const ARRAY_TO_SEARCH = constantArray([42, 'matang', true]);

    it('valueFoundInArray', () => {
      expect(
        evaluateToValue(
          arrayContains(constantArray(['hello', 'world']), constant('hello'))
        )
      ).to.deep.equal(TRUE_VALUE);
    });

    it('valueNotFoundInArray', () => {
      expect(
        evaluateToValue(arrayContains(ARRAY_TO_SEARCH, constant(4)))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('notArrayContainsFunction_valueNotFoundInArray', () => {
      const child = arrayContains(ARRAY_TO_SEARCH, constant(4));
      const f = not(child as BooleanExpr);
      expect(evaluateToValue(f)).to.deep.equal(TRUE_VALUE);
    });

    it('equivalentNumerics', () => {
      expect(
        evaluateToValue(arrayContains(ARRAY_TO_SEARCH, constant(42.0)))
      ).to.deep.equal(TRUE_VALUE);
    });

    // TODO(pipeline): Nested arrays are not supported in documents. We need to
    // support creating nested arrays as expressions however.
    it.skip('bothInputTypeIsArray', () => {
      expect(
        evaluateToValue(
          arrayContains(
            constantArray([
              [1, 2, 3],
              [4, 5, 6],
              [7, 8, 9]
            ]),
            constantArray([1, 2, 3])
          )
        )
      ).to.deep.equal(TRUE_VALUE);
    });

    it('searchValue_isNull_returnsNull', () => {
      expect(
        evaluateToValue(
          arrayContains(
            constantArray([null, 1, 'matang', true]),
            constant(null)
          )
        )
      ).to.deep.equal(MIN_VALUE);
    });

    it('searchValue_isNull_emptyValuesArray_returnsNull', () => {
      expect(
        evaluateToValue(arrayContains(constantArray([]), constant(null)))
      ).to.deep.equal(MIN_VALUE);
    });

    it('searchValue_isMap', () => {
      expect(
        evaluateToValue(
          arrayContains(
            constantArray([123, { foo: 123 }, { bar: 42 }, { foo: 42 }]),
            constantMap({ foo: 42 })
          )
        )
      ).to.deep.equal(TRUE_VALUE);
    });

    it('searchValue_isNaN', () => {
      expect(
        evaluateToValue(
          arrayContains(constantArray([NaN, 'foo']), constant(NaN))
        )
      ).to.deep.equal(FALSE_VALUE);
    });

    it('arrayToSearch_isNotArrayType_returnsError', () => {
      expect(
        evaluateToValue(arrayContains(constant('matang'), constant('values')))
      ).to.be.undefined;
    });

    it('arrayToSearch_notFound_returnsError', () => {
      expect(
        evaluateToValue(arrayContains(field('not-exist'), constant('matang')))
      ).to.be.undefined;
    });

    it('arrayToSearch_isEmpty_returnsFalse', () => {
      expect(
        evaluateToValue(arrayContains(constantArray([]), constant('matang')))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('searchValue_reference_notFound_returnsError', () => {
      expect(
        evaluateToValue(arrayContains(ARRAY_TO_SEARCH, field('not-exist')))
      ).to.be.undefined;
    });
  }); // end describe('arrayContains')

  describe('arrayLength', () => {
    it('length', () => {
      expectEqual(
        evaluateToValue(arrayLength(constantArray(['1', 42, true]))),
        constant(3),
        `arrayLength(['1', 42, true])`
      );
    });

    it('emptyArray', () => {
      expectEqual(
        evaluateToValue(arrayLength(constantArray([]))),
        constant(0),
        `arrayLength([])`
      );
    });

    it('arrayWithDuplicateElements', () => {
      expectEqual(
        evaluateToValue(arrayLength(constantArray([true, true]))),
        constant(2),
        `arrayLength([true, true])`
      );
    });

    it('notArrayType_returnsError', () => {
      expect(
        evaluateToValue(arrayLength(constant(new VectorValue([0.0, 1.0]))))
      ).to.be.undefined; // Assuming double[] is not considered an array
      expect(evaluateToValue(arrayLength(constant('notAnArray')))).to.be
        .undefined;
    });
  }); // end describe('arrayLength')
});
