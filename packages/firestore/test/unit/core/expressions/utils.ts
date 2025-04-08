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

import { newTestFirestore } from '../../../util/api_helpers';
import {
  BooleanExpr,
  Constant,
  constant,
  Expr,
  field
} from '../../../../src/lite-api/expressions';
import { newUserDataReader } from '../../../../src/lite-api/user_data_reader';
import { typeOrder, valueEquals } from '../../../../src/model/values';
import {
  Bytes,
  doc as docRef,
  GeoPoint,
  Timestamp,
  VectorValue
} from '../../../../src';
import { constantArray, constantMap } from '../../../util/pipelines';
import { JsonObject, ObjectValue } from '../../../../src/model/object_value';
import { Value } from '../../../../src/protos/firestore_proto_api';
import { EvaluateResult, toEvaluable } from '../../../../src/core/expressions';
import { doc } from '../../../util/helpers';

const db = newTestFirestore();
// Represents an evaluation error (e.g., field not found, type mismatch)
export const ERROR_VALUE = undefined;
// Represents an unset field (field does not exist in the document)
export const UNSET_VALUE = field('non-existent-field');
export const falseExpr = constant(1).eq(2);
export const trueExpr = constant(1).eq(1);

export function isTypeComparable(left: Constant, right: Constant): boolean {
  left._readUserData(newUserDataReader(db));
  right._readUserData(newUserDataReader(db));

  return typeOrder(left._getValue()) === typeOrder(right._getValue());
}

export class ComparisonValueTestData {
  static BOOLEAN_VALUES = [constant(false), constant(true)];

  static NUMERIC_VALUES = [
    constant(Number.NEGATIVE_INFINITY),
    constant(-Number.MAX_VALUE),
    constant(Number.MIN_SAFE_INTEGER),
    constant(-9007199254740990),
    constant(-1),
    constant(-0.5),
    constant(-Number.MIN_VALUE),
    constant(0),
    constant(Number.MIN_VALUE),
    constant(0.5),
    constant(1),
    constant(42),
    constant(9007199254740990),
    constant(Number.MAX_SAFE_INTEGER),
    constant(Number.MAX_VALUE),
    constant(Number.POSITIVE_INFINITY)
  ];

  static TIMESTAMP_VALUES = [
    constant(new Timestamp(-42, 0)), // -42 seconds from epoch
    constant(new Timestamp(-42, 42000)), // -42 seconds + 42 milliseconds (42000 microseconds) from epoch
    constant(new Timestamp(0, 0)), // Epoch
    constant(new Timestamp(0, 42000)), // 42 milliseconds from epoch
    constant(new Timestamp(42, 0)), // 42 seconds from epoch
    constant(new Timestamp(42, 42000)) // 42 seconds + 42 milliseconds from epoch
  ];

  static STRING_VALUES = [
    constant(''),
    constant('abcdefgh'),
    constant('fouxdufafa'.repeat(200)),
    constant('santé'),
    constant('santé et bonheur')
  ];

  static BYTE_VALUES = [
    constant(Bytes.fromUint8Array(new Uint8Array([]))), // Empty byte array
    constant(Bytes.fromUint8Array(new Uint8Array([0, 2, 56, 42]))),
    constant(Bytes.fromUint8Array(new Uint8Array([2, 26]))),
    constant(Bytes.fromUint8Array(new Uint8Array([2, 26, 31]))),
    constant(
      Bytes.fromUint8Array(new TextEncoder().encode('fouxdufafa'.repeat(200)))
    ) // Encode string to Uint8Array
  ];

  static ENTITY_REF_VALUES = [
    constant(docRef(db, 'foo', 'bar')),
    constant(docRef(db, 'foo', 'bar', 'qux/a')),
    constant(docRef(db, 'foo', 'bar', 'qux', 'bleh')),
    constant(docRef(db, 'foo', 'bar', 'qux', 'hi')),
    constant(docRef(db, 'foo', 'bar', 'tonk/a')),
    constant(docRef(db, 'foo', 'baz'))
  ];

  static GEO_VALUES = [
    constant(new GeoPoint(-87.0, -92.0)),
    constant(new GeoPoint(-87.0, 0.0)),
    constant(new GeoPoint(-87.0, 42.0)),
    constant(new GeoPoint(0.0, -92.0)),
    constant(new GeoPoint(0.0, 0.0)),
    constant(new GeoPoint(0.0, 42.0)),
    constant(new GeoPoint(42.0, -92.0)),
    constant(new GeoPoint(42.0, 0.0)),
    constant(new GeoPoint(42.0, 42.0))
  ];

  static ARRAY_VALUES = [
    constantArray([]),
    constantArray([true, 15]),
    constantArray([1, 2]),
    constantArray([new Timestamp(12, 0)]),
    constantArray(['foo']),
    constantArray(['foo', 'bar']),
    constantArray([new GeoPoint(0, 0)]),
    constantArray([{}])
  ];

  static VECTOR_VALUES = [
    constant(new VectorValue([42.0])),
    constant(new VectorValue([21.2, 3.14])),
    constant(new VectorValue([Number.NEGATIVE_INFINITY, 10.0, 1.0])),
    constant(new VectorValue([-Number.MAX_VALUE, 9.0, 1.0])),
    constant(new VectorValue([-Number.MIN_VALUE, 7.0, 1.0])),
    constant(new VectorValue([-Number.MIN_VALUE, 8.0, 1.0])),
    constant(new VectorValue([0.0, 5.0, 1.0])),
    constant(new VectorValue([0.0, 6.0, 1.0])),
    constant(new VectorValue([Number.MIN_VALUE, 3.0, 1.0])),
    constant(new VectorValue([Number.MIN_VALUE, 4.0, 1.0])),
    constant(new VectorValue([Number.MAX_VALUE, 2.0, 1.0])),
    constant(new VectorValue([Number.POSITIVE_INFINITY, 1.0, 1.0]))
  ];

  static MAP_VALUES = [
    constantMap({}),
    constantMap({ ABA: 'qux' }),
    constantMap({ aba: 'hello' }),
    constantMap({ aba: 'hello', foo: true }),
    constantMap({ aba: 'qux' }),
    constantMap({ foo: 'aaa' })
  ];

  // Concatenation of values (implementation depends on your testing framework)
  static ALL_SUPPORTED_COMPARABLE_VALUES = [
    ...ComparisonValueTestData.BOOLEAN_VALUES,
    ...ComparisonValueTestData.NUMERIC_VALUES,
    ...ComparisonValueTestData.TIMESTAMP_VALUES,
    ...ComparisonValueTestData.STRING_VALUES,
    ...ComparisonValueTestData.BYTE_VALUES,
    ...ComparisonValueTestData.ENTITY_REF_VALUES,
    ...ComparisonValueTestData.GEO_VALUES,
    ...ComparisonValueTestData.ARRAY_VALUES,
    ...ComparisonValueTestData.VECTOR_VALUES,
    ...ComparisonValueTestData.MAP_VALUES
  ];

  static equivalentValues(): Array<{ left: Constant; right: Constant }> {
    const results = ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.map(
      value => {
        return { left: value, right: value };
      }
    );

    return results.concat([
      { left: constant(-42), right: constant(-42.0) },
      { left: constant(-42.0), right: constant(-42) },
      { left: constant(42), right: constant(42.0) },
      { left: constant(42.0), right: constant(42) },

      { left: constant(0), right: constant(-0) },
      { left: constant(-0), right: constant(0) },

      { left: constant(0), right: constant(0.0) },
      { left: constant(0.0), right: constant(0) },

      { left: constant(0), right: constant(-0.0) },
      { left: constant(-0.0), right: constant(0) },

      { left: constant(-0), right: constant(0.0) },
      { left: constant(0.0), right: constant(-0) },

      { left: constant(-0), right: constant(-0.0) },
      { left: constant(-0.0), right: constant(-0) },

      { left: constant(0.0), right: constant(-0.0) },
      { left: constant(-0.0), right: constant(0.0) }
    ]);
  }

  static lessThanValues(): Array<{ left: Constant; right: Constant }> {
    const results: Array<{ left: Constant; right: Constant }> = [];

    for (
      let i = 0;
      i < ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.length;
      i++
    ) {
      for (
        let j = i + 1;
        j < ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.length;
        j++
      ) {
        const left = ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES[i];
        const right =
          ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES[j];
        if (isTypeComparable(left, right)) {
          results.push({ left, right });
        }
      }
    }
    return results;
  }

  static greaterThanValues(): Array<{ left: Constant; right: Constant }> {
    const results: Array<{ left: Constant; right: Constant }> = [];

    for (
      let i = 0;
      i < ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.length;
      i++
    ) {
      for (
        let j = i + 1;
        j < ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.length;
        j++
      ) {
        const left = ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES[i];
        const right =
          ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES[j];
        if (isTypeComparable(right, left)) {
          // Note the order of right and left
          results.push({ left: right, right: left });
        }
      }
    }
    return results;
  }

  static mixedTypeValues(): Array<{ left: Constant; right: Constant }> {
    const results: Array<{ left: Constant; right: Constant }> = [];

    for (
      let i = 0;
      i < ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.length;
      i++
    ) {
      for (
        let j = 0;
        j < ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.length;
        j++
      ) {
        // Note: j starts from 0 here
        const left = ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES[i];
        const right =
          ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES[j];
        if (!isTypeComparable(left, right)) {
          results.push({ left, right });
        }
      }
    }
    return results;
  }
}

export function evaluateToValue(
  expr: Expr,
  data?: JsonObject<unknown> | ObjectValue
): Value {
  expr._readUserData(newUserDataReader(db));
  return toEvaluable(expr).evaluate(
    // @ts-ignore
    { serializer: newUserDataReader(db).serializer },
    // Should not matter for the purpose of tests here.
    doc('foo/doc', 1000, data ?? { exists: true, nanValue: NaN })
  ).value!;
}

export function evaluateToResult(
  expr: Expr,
  data?: JsonObject<unknown> | ObjectValue
): EvaluateResult {
  expr._readUserData(newUserDataReader(db));
  return toEvaluable(expr).evaluate(
    // @ts-ignore
    { serializer: newUserDataReader(db).serializer },
    // Should not matter for the purpose of tests here.
    doc('foo/doc', 1000, data ?? { exists: true, nanValue: NaN })
  );
}

export function errorExpr(): Expr {
  return field('not-an-array').arrayLength();
}

export function errorFilterCondition(): BooleanExpr {
  return field('not-an-array').gt(0);
}

export function expectEqual(
  evaluated: Value,
  expected: Constant,
  message?: string
) {
  expected._readUserData(newUserDataReader(db));
  return expect(
    valueEquals(evaluated!, expected._getValue(), {
      nanEqual: true,
      mixIntegerDouble: true,
      semanticsEqual: true
    }),
    `${message}: expected ${JSON.stringify(
      expected._getValue(),
      null,
      2
    )} to equal ${JSON.stringify(evaluated, null, 2)}`
  ).to.be.true;
}
