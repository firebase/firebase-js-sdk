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

import { VectorValue } from '../../../../src';
import { EvaluateResult } from '../../../../src/core/expressions';
import {
  arrayContains,
  arrayContainsAll,
  arrayContainsAny,
  arrayLength,
  BooleanExpression,
  Constant,
  constant,
  field,
  not
} from '../../../../src/lite-api/expressions';
import {
  FALSE_VALUE,
  INTERNAL_MIN_VALUE,
  TRUE_VALUE
} from '../../../../src/model/values';
import { constantArray, constantMap } from '../../../util/pipelines';

import {
  evaluateToResult,
  evaluateToValue,
  expectEqualToConstant
} from './utils';

describe('Array Expressions', () => {
  describe('arrayContainsAll', () => {
    it('containsAll', () => {
      expect(
        evaluateToValue(
          arrayContainsAll(
            constantArray('1', 42, true, 'additional', 'values', 'in', 'array'),
            [constant('1'), constant(42), constant(true)]
          )
        )
      ).toEqual(TRUE_VALUE);
    });

    it('doesNotContainAll', () => {
      expect(
        evaluateToValue(
          arrayContainsAll(constantArray(['1', 42, true]), [
            constant('1'),
            constant(99)
          ])
        )
      ).toEqual(FALSE_VALUE);
    });

    it('equivalentNumerics', () => {
      expect(
        evaluateToValue(
          arrayContainsAll(
            constantArray(42, true, 'additional', 'values', 'in', 'array'),
            [constant(42.0), constant(true)]
          )
        )
      ).toEqual(TRUE_VALUE);
    });

    it('arrayToSearch_isEmpty', () => {
      expect(
        evaluateToValue(
          arrayContainsAll(constantArray(), [constant(42.0), constant(true)])
        )
      ).toEqual(FALSE_VALUE);
    });

    it('searchValue_isEmpty', () => {
      expect(
        evaluateToValue(arrayContainsAll(constantArray(42.0, true), []))
      ).toEqual(TRUE_VALUE);
    });

    it('searchValue_isNaN', () => {
      expect(
        evaluateToValue(
          arrayContainsAll(constantArray(NaN, 42.0), [constant(NaN)])
        )
      ).toEqual(FALSE_VALUE);
    });

    it('searchValue_hasDuplicates', () => {
      expect(
        evaluateToValue(
          arrayContainsAll(constantArray(true, 'hi'), [
            constant(true),
            constant(true),
            constant(true)
          ])
        )
      ).toEqual(TRUE_VALUE);
    });

    it('arrayToSearch_isEmpty_searchValue_isEmpty', () => {
      expect(evaluateToValue(arrayContainsAll(constantArray(), []))).toEqual(
        TRUE_VALUE
      );
    });

    it('largeNumberOfElements', () => {
      const elements = Array.from({ length: 500 }, (_, i) => i + 1);
      expect(
        evaluateToValue(
          arrayContainsAll(
            constantArray(...elements),
            elements.map(e => constant(e))
          )
        )
      ).toEqual(TRUE_VALUE);
    });
  });

  describe('arrayContainsAny', () => {
    const ARRAY_TO_SEARCH = constantArray(42, 'matang', true);
    const SEARCH_VALUES = [constant('matang'), constant(false)];

    it('valueFoundInArray', () => {
      expect(
        evaluateToValue(arrayContainsAny(ARRAY_TO_SEARCH, SEARCH_VALUES))
      ).toEqual(TRUE_VALUE);
    });

    it('equivalentNumerics', () => {
      expect(
        evaluateToValue(
          arrayContainsAny(ARRAY_TO_SEARCH, [constant(42.0), constant(2)])
        )
      ).toEqual(TRUE_VALUE);
    });

    it('valuesNotFoundInArray', () => {
      expect(
        evaluateToValue(
          arrayContainsAny(ARRAY_TO_SEARCH, [constant(99), constant('false')])
        )
      ).toEqual(FALSE_VALUE);
    });

    // TODO(pipeline): Nested arrays are not supported in documents. We need to
    // support creating nested arrays as expressions however.
    // it.skip('bothInputTypeIsArray', () => {
    //   expect(
    //     evaluateToValue(
    //       arrayContainsAny(constantArray([1, 2, 3], [4, 5, 6], [7, 8, 9]), [
    //         constantArray(1, 2, 3),
    //         constantArray(4, 5, 6)
    //       ])
    //     )
    //   ).to.deep.equal(TRUE_VALUE);
    // });

    it('search_isNull_returnsNull', () => {
      expect(
        evaluateToResult(
          arrayContainsAny(constantArray(null, 1, 'matang', true), [
            constant(null)
          ])
        )
      ).toEqual(EvaluateResult.newValue(TRUE_VALUE));
    });

    it('array_isNotArrayType_returnsError', () => {
      expect(
        evaluateToValue(arrayContainsAny(constant('matang'), SEARCH_VALUES))
      ).toBeUndefined();
    });

    it('search_isNotArrayType_returnsError', () => {
      expect(
        evaluateToValue(
          arrayContainsAny(constant('values'), [constant('values')])
        )
      ).toBeUndefined();
    });

    it('array_notFound_returnsError', () => {
      expect(
        evaluateToValue(arrayContainsAny(field('not-exist'), SEARCH_VALUES))
      ).toBeUndefined();
    });

    it('searchNotFound_returnsError', () => {
      expect(
        evaluateToValue(arrayContainsAny(ARRAY_TO_SEARCH, [field('not-exist')]))
      ).toBeUndefined();
    });
  }); // end describe('arrayContainsAny')

  describe('arrayContains', () => {
    const ARRAY_TO_SEARCH = constantArray(42, 'matang', true);

    it('valueFoundInArray', () => {
      expect(
        evaluateToValue(
          arrayContains(constantArray('hello', 'world'), constant('hello'))
        )
      ).toEqual(TRUE_VALUE);
    });

    it('valueNotFoundInArray', () => {
      expect(
        evaluateToValue(arrayContains(ARRAY_TO_SEARCH, constant(4)))
      ).toEqual(FALSE_VALUE);
    });

    it('notArrayContainsFunction_valueNotFoundInArray', () => {
      const child = arrayContains(ARRAY_TO_SEARCH, constant(4));
      const f = not(child as BooleanExpression);
      expect(evaluateToValue(f)).toEqual(TRUE_VALUE);
    });

    it('equivalentNumerics', () => {
      expect(
        evaluateToValue(arrayContains(ARRAY_TO_SEARCH, constant(42.0)))
      ).toEqual(TRUE_VALUE);
    });

    // TODO(pipeline): Nested arrays are not supported in documents. We need to
    // support creating nested arrays as expressions however.
    // it.skip('bothInputTypeIsArray', () => {
    //   expect(
    //     evaluateToValue(
    //       arrayContains(
    //         constantArray([1, 2, 3], [4, 5, 6], [7, 8, 9]),
    //         constantArray(1, 2, 3)
    //       )
    //     )
    //   ).to.deep.equal(TRUE_VALUE);
    // });

    it('searchValue_isNull_returnsNull', () => {
      expect(
        evaluateToValue(
          arrayContains(constantArray(null, 1, 'matang', true), constant(null))
        )
      ).toEqual(INTERNAL_MIN_VALUE);
    });

    it('searchValue_isNull_emptyValuesArray_returnsNull', () => {
      expect(
        evaluateToValue(arrayContains(constantArray(), constant(null)))
      ).toEqual(INTERNAL_MIN_VALUE);
    });

    it('searchValue_isMap', () => {
      expect(
        evaluateToValue(
          arrayContains(
            constantArray(123, { foo: 123 }, { bar: 42 }, { foo: 42 }),
            constantMap({ foo: 42 })
          )
        )
      ).toEqual(TRUE_VALUE);
    });

    it('searchValue_isNaN', () => {
      expect(
        evaluateToValue(arrayContains(constantArray(NaN, 'foo'), constant(NaN)))
      ).toEqual(FALSE_VALUE);
    });

    it('arrayToSearch_isNotArrayType_returnsError', () => {
      expect(
        evaluateToValue(arrayContains(constant('matang'), constant('values')))
      ).toBeUndefined();
    });

    it('arrayToSearch_notFound_returnsError', () => {
      expect(
        evaluateToValue(arrayContains(field('not-exist'), constant('matang')))
      ).toBeUndefined();
    });

    it('arrayToSearch_isEmpty_returnsFalse', () => {
      expect(
        evaluateToValue(arrayContains(constantArray(), constant('matang')))
      ).toEqual(FALSE_VALUE);
    });

    it('searchValue_reference_notFound_returnsError', () => {
      expect(
        evaluateToValue(arrayContains(ARRAY_TO_SEARCH, field('not-exist')))
      ).toBeUndefined();
    });
  }); // end describe('arrayContains')

  describe('arrayLength', () => {
    it('length', () => {
      expectEqualToConstant(
        evaluateToValue(arrayLength(constantArray('1', 42, true))),
        constant(3) as Constant,
        `arrayLength(['1', 42, true])`
      );
    });

    it('emptyArray', () => {
      expectEqualToConstant(
        evaluateToValue(arrayLength(constantArray())),
        constant(0) as Constant,
        `arrayLength([])`
      );
    });

    it('arrayWithDuplicateElements', () => {
      expectEqualToConstant(
        evaluateToValue(arrayLength(constantArray(true, true))),
        constant(2) as Constant,
        `arrayLength([true, true])`
      );
    });

    it('notArrayType_returnsError', () => {
      expect(
        evaluateToValue(arrayLength(constant(new VectorValue([0.0, 1.0]))))
      ).toBeUndefined(); // Assuming double[] is not considered an array
      expect(
        evaluateToValue(arrayLength(constant('notAnArray')))
      ).toBeUndefined();
    });
  }); // end describe('arrayLength')
});
