/**
 * @license
 * Copyright 2024 Google LLC
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
  Bytes,
  doc as docRef,
  GeoPoint,
  Timestamp,
  VectorValue
} from '../../../src';
import { EvaluateResult, toEvaluable } from '../../../src/core/expressions';
import { canonifyExpr } from '../../../src/core/pipeline-util';
import {
  add,
  and,
  arrayContains,
  arrayContainsAll,
  arrayContainsAny,
  arrayLength,
  BooleanExpr,
  byteLength,
  charLength,
  cond,
  constant,
  Constant,
  cosineDistance,
  divide,
  dotProduct,
  endsWith,
  eq,
  eqAny,
  euclideanDistance,
  Expr,
  field,
  gt,
  gte,
  isNan,
  isNotNan,
  like,
  logicalMaximum,
  logicalMinimum,
  lt,
  lte,
  mapGet,
  mod,
  multiply,
  neq,
  not,
  or,
  regexContains,
  regexMatch,
  startsWith,
  strConcat,
  strContains,
  subtract,
  vectorLength,
  xor,
  isNull,
  isNotNull,
  exists,
  reverse,
  toLower,
  toUpper,
  trim,
  unixMicrosToTimestamp,
  timestampToUnixMicros,
  unixMillisToTimestamp,
  timestampToUnixMillis,
  unixSecondsToTimestamp,
  timestampToUnixSeconds,
  FunctionExpr,
  notEqAny
} from '../../../src/lite-api/expressions';
import { newUserDataReader } from '../../../src/lite-api/user_data_reader';
import { JsonObject, ObjectValue } from '../../../src/model/object_value';
import {
  FALSE_VALUE,
  MIN_VALUE,
  TRUE_VALUE,
  typeOrder,
  valueEquals
} from '../../../src/model/values';
import { Value } from '../../../src/protos/firestore_proto_api';
import { newTestFirestore } from '../../util/api_helpers';
import { doc } from '../../util/helpers';
import { constantArray, constantMap } from '../../util/pipelines';

const db = newTestFirestore();
// Represents an evaluation error (e.g., field not found, type mismatch)
const ERROR_VALUE = undefined;
// Represents an unset field (field does not exist in the document)
const UNSET_VALUE = field('non-existent-field');
const falseExpr = constant(1).eq(2);
const trueExpr = constant(1).eq(1);

function isTypeComparable(left: Constant, right: Constant): boolean {
  left._readUserData(newUserDataReader(db));
  right._readUserData(newUserDataReader(db));

  return typeOrder(left._getValue()) === typeOrder(right._getValue());
}

class ComparisonValueTestData {
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

function evaluateToValue(
  expr: Expr,
  data?: JsonObject<unknown> | ObjectValue
): Value {
  expr._readUserData(newUserDataReader(db));
  return toEvaluable(expr).evaluate(
    { serializer: newUserDataReader(db).serializer },
    // Should not matter for the purpose of tests here.
    doc('foo/doc', 1000, data ?? { exists: true, nanValue: NaN })
  ).value!;
}

function evaluateToResult(
  expr: Expr,
  data?: JsonObject<unknown> | ObjectValue
): EvaluateResult {
  expr._readUserData(newUserDataReader(db));
  return toEvaluable(expr).evaluate(
    { serializer: newUserDataReader(db).serializer },
    // Should not matter for the purpose of tests here.
    doc('foo/doc', 1000, data ?? { exists: true, nanValue: NaN })
  );
}

function errorExpr(): Expr {
  return field('not-an-array').arrayLength();
}

function errorFilterCondition(): BooleanExpr {
  return field('not-an-array').gt(0);
}

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

function expectEqual(evaluated: Value, expected: Constant, message?: string) {
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

describe('Expressions', () => {
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
        expect(
          evaluateToResult(add(constant('1'), constant(1.0)))
        ).to.deep.equal(EvaluateResult.newError());
        expect(
          evaluateToResult(add(constant('1'), constant('1')))
        ).to.deep.equal(EvaluateResult.newError());
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
          evaluateToValue(
            add(constant(Number.MAX_SAFE_INTEGER), constant(NaN))
          ),
          constant(NaN),
          `add(Number.MAX_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluateToValue(
            add(constant(Number.MIN_SAFE_INTEGER), constant(NaN))
          ),
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
          evaluateToValue(
            add(constant(Number.POSITIVE_INFINITY), constant(NaN))
          ),
          constant(NaN),
          `add(Number.POSITIVE_INFINITY, NaN)`
        );
        expectEqual(
          evaluateToValue(
            add(constant(Number.NEGATIVE_INFINITY), constant(NaN))
          ),
          constant(NaN),
          `add(Number.NEGATIVE_INFINITY, NaN)`
        );
      });

      it('nan_notNumberType_returnError', () => {
        expect(evaluateToValue(add(constant(NaN), constant('hello world')))).to
          .be.undefined;
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
          evaluateToValue(
            subtract(constant(0x8000000000000000), constant(1.0))
          ),
          constant(-9.223372036854776e18),
          `subtract(Long.MIN_VALUE, 1.0)`
        );
        expectEqual(
          evaluateToValue(
            subtract(constant(0x8000000000000000), constant(100))
          ),
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
        expect(
          evaluateToValue(subtract(constant(NaN), constant('hello world')))
        ).to.be.undefined;
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
          evaluateToValue(
            multiply(constant(9223372036854775807), constant(100))
          ),
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
        expect(
          evaluateToValue(multiply(constant(NaN), constant('hello world')))
        ).to.be.undefined;
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
        expect(evaluateToValue(divide(constant(1), constant(0)))).to.be
          .undefined; // Or your error handling
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
        expect(evaluateToValue(divide(constant(NaN), constant('hello world'))))
          .to.be.undefined;
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
        expect(evaluateToValue(mod(constant(42), constant(-0)))).to.be
          .undefined;

        expect(evaluateToValue(mod(constant(42), constant(0.0)))).to.be
          .undefined;
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
        expect(evaluateToValue(mod(constant(10), constant('1')))).to.be
          .undefined;
        expect(evaluateToValue(mod(constant('1'), constant(10)))).to.be
          .undefined;
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
          evaluateToValue(
            mod(constant(Number.MAX_SAFE_INTEGER), constant(NaN))
          ),
          constant(NaN),
          `mod(Number.MAX_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluateToValue(
            mod(constant(Number.MIN_SAFE_INTEGER), constant(NaN))
          ),
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
          evaluateToValue(
            mod(constant(Number.POSITIVE_INFINITY), constant(NaN))
          ),
          constant(NaN),
          `mod(Number.POSITIVE_INFINITY, NaN)`
        );
        expectEqual(
          evaluateToValue(
            mod(constant(Number.NEGATIVE_INFINITY), constant(NaN))
          ),
          constant(NaN),
          `mod(Number.NEGATIVE_INFINITY, NaN)`
        );
      });

      it('nan_notNumberType_returnError', () => {
        expect(evaluateToValue(mod(constant(NaN), constant('hello world')))).to
          .be.undefined;
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
            arrayContainsAll(constantArray([]), [
              constant(42.0),
              constant(true)
            ])
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
          evaluateToValue(
            arrayContainsAny(ARRAY_TO_SEARCH, [field('not-exist')])
          )
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

  describe('Field expression', () => {
    it('can get field', () => {
      expect(evaluateToValue(field('exists'), { exists: true })).to.deep.equal(
        TRUE_VALUE
      );
    });

    it('error if not found', () => {
      expect(evaluateToResult(field('not-exists'))).to.deep.equal(
        EvaluateResult.newUnset()
      );
    });
  });

  describe('Debugging Functions', () => {
    describe('exists', () => {
      it('anythingButUnset_returnsTrue', () => {
        ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
          expect(
            evaluateToValue(exists(v)),
            `exists(${canonifyExpr(v)})`
          ).to.deep.equal(TRUE_VALUE);
        });
      });

      it('null_returnsTrue', () => {
        expect(evaluateToValue(exists(constant(null)))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('error_returnsError', () => {
        expect(evaluateToValue(exists(errorExpr()))).to.be.undefined;
      });

      it('unset_withNotExists_returnsTrue', () => {
        const functionExpr = exists(UNSET_VALUE);
        expect(evaluateToValue(not(functionExpr))).to.deep.equal(TRUE_VALUE);
      });

      it('unset_returnsFalse', () => {
        expect(evaluateToValue(exists(UNSET_VALUE))).to.deep.equal(FALSE_VALUE);
      });

      it('emptyArray_returnsTrue', () => {
        expect(evaluateToValue(exists(constantArray([])))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('emptyMap_returnsTrue', () => {
        expect(evaluateToValue(exists(constantMap({})))).to.deep.equal(
          TRUE_VALUE
        );
      });
    });
  });

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
        expect(
          evaluateToValue(and(falseExpr, trueExpr, trueExpr))
        ).to.deep.equal(FALSE_VALUE);
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
        expect(
          evaluateToValue(and(trueExpr, falseExpr, trueExpr))
        ).to.deep.equal(FALSE_VALUE);
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
        expect(
          evaluateToValue(and(trueExpr, trueExpr, falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('true_true_error_isError', () => {
        expect(evaluateToValue(and(trueExpr, trueExpr, errorFilterCondition())))
          .to.be.undefined;
      });

      it('true_true_true_isTrue', () => {
        expect(
          evaluateToValue(and(trueExpr, trueExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('nested_and', () => {
        const child = and(trueExpr, falseExpr);
        const f = and(child, trueExpr);
        expect(evaluateToValue(f)).to.deep.equal(FALSE_VALUE);
      });

      it('multipleArguments', () => {
        expect(
          evaluateToValue(and(trueExpr, trueExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
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
        const func = cond(
          errorFilterCondition(),
          errorExpr(),
          constant('false')
        );
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
            eqAny(constant(4), [
              constant(42),
              constant('matang'),
              constant(true)
            ])
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
        expect(evaluateToValue(isNan(constant(42.0)))).to.deep.equal(
          FALSE_VALUE
        );
        expect(evaluateToValue(isNan(constant(42)))).to.deep.equal(FALSE_VALUE);
      });

      it('isNotNan', () => {
        expect(evaluateToValue(isNotNan(constant(42.0)))).to.deep.equal(
          TRUE_VALUE
        );
        expect(evaluateToValue(isNotNan(constant(42)))).to.deep.equal(
          TRUE_VALUE
        );
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
        expect(evaluateToValue(or(trueExpr, trueExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('false_false_false_isFalse', () => {
        expect(
          evaluateToValue(or(falseExpr, falseExpr, falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('false_false_error_isError', () => {
        expect(
          evaluateToValue(or(falseExpr, falseExpr, errorFilterCondition()))
        ).to.be.undefined;
      });

      it('false_false_true_isTrue', () => {
        expect(
          evaluateToValue(or(falseExpr, falseExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('false_error_false_isError', () => {
        expect(
          evaluateToValue(or(falseExpr, errorFilterCondition(), falseExpr))
        ).to.be.undefined;
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
        expect(
          evaluateToValue(or(falseExpr, trueExpr, falseExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('false_true_error_isTrue', () => {
        expect(
          evaluateToValue(or(falseExpr, trueExpr, errorFilterCondition()))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('false_true_true_isTrue', () => {
        expect(
          evaluateToValue(or(falseExpr, trueExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('error_false_false_isError', () => {
        expect(
          evaluateToValue(or(errorFilterCondition(), falseExpr, falseExpr))
        ).to.be.undefined;
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
        expect(
          evaluateToValue(or(trueExpr, falseExpr, falseExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('true_false_error_isTrue', () => {
        expect(
          evaluateToValue(or(trueExpr, falseExpr, errorFilterCondition()))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('true_false_true_isTrue', () => {
        expect(
          evaluateToValue(or(trueExpr, falseExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
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
        expect(
          evaluateToValue(or(trueExpr, trueExpr, falseExpr))
        ).to.deep.equal(TRUE_VALUE);
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
        expect(
          evaluateToValue(or(trueExpr, falseExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
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
        expect(
          evaluateToValue(xor(falseExpr, falseExpr, errorFilterCondition()))
        ).to.be.undefined;
      });

      it('false_false_true_isTrue', () => {
        expect(
          evaluateToValue(xor(falseExpr, falseExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('false_error_false_isError', () => {
        expect(
          evaluateToValue(xor(falseExpr, errorFilterCondition(), falseExpr))
        ).to.be.undefined;
      });

      it('false_error_error_isError', () => {
        expect(
          evaluateToValue(
            xor(falseExpr, errorFilterCondition(), errorFilterCondition())
          )
        ).to.be.undefined;
      });

      it('false_error_true_isError', () => {
        expect(
          evaluateToValue(xor(falseExpr, errorFilterCondition(), trueExpr))
        ).to.be.undefined;
      });

      it('false_true_false_isTrue', () => {
        expect(
          evaluateToValue(xor(falseExpr, trueExpr, falseExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('false_true_error_isError', () => {
        expect(
          evaluateToValue(xor(falseExpr, trueExpr, errorFilterCondition()))
        ).to.be.undefined;
      });

      it('false_true_true_isFalse', () => {
        expect(
          evaluateToValue(xor(falseExpr, trueExpr, trueExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('error_false_false_isError', () => {
        expect(
          evaluateToValue(xor(errorFilterCondition(), falseExpr, falseExpr))
        ).to.be.undefined;
      });

      it('error_false_error_isError', () => {
        expect(
          evaluateToValue(
            xor(errorFilterCondition(), falseExpr, errorFilterCondition())
          )
        ).to.be.undefined;
      });

      it('error_false_true_isError', () => {
        expect(
          evaluateToValue(xor(errorFilterCondition(), falseExpr, trueExpr))
        ).to.be.undefined;
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
        expect(
          evaluateToValue(xor(errorFilterCondition(), trueExpr, falseExpr))
        ).to.be.undefined;
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
        expect(
          evaluateToValue(xor(trueExpr, falseExpr, errorFilterCondition()))
        ).to.be.undefined;
      });

      it('true_false_true_isFalse', () => {
        expect(
          evaluateToValue(xor(trueExpr, falseExpr, trueExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('true_error_false_isError', () => {
        expect(
          evaluateToValue(xor(trueExpr, errorFilterCondition(), falseExpr))
        ).to.be.undefined;
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
        expect(
          evaluateToValue(xor(trueExpr, trueExpr, falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('true_true_error_isError', () => {
        expect(evaluateToValue(xor(trueExpr, trueExpr, errorFilterCondition())))
          .to.be.undefined;
      });

      it('true_true_true_isTrue', () => {
        expect(
          evaluateToValue(xor(trueExpr, trueExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('nested_xor', () => {
        const child = xor(trueExpr, falseExpr);
        const f = xor(child, trueExpr);
        expect(evaluateToValue(f)).to.deep.equal(FALSE_VALUE);
      });

      it('multipleArguments', () => {
        expect(
          evaluateToValue(xor(trueExpr, falseExpr, trueExpr))
        ).to.deep.equal(FALSE_VALUE);
      });
    }); // end describe('xor')

    describe('isNull', () => {
      it('null_returnsTrue', () => {
        expect(evaluateToValue(isNull(constant(null)))).to.deep.equal(
          TRUE_VALUE
        );
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
        expect(evaluateToValue(isNull(constant(NaN)))).to.deep.equal(
          FALSE_VALUE
        );
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

  describe('Map Functions', () => {
    describe('mapGet', () => {
      it('get_existingKey_returnsValue', () => {
        const map = { a: 1, b: 2, c: 3 };
        expectEqual(
          evaluateToValue(mapGet(constantMap(map), 'b')),
          constant(2)
        );
      });

      it('get_missingKey_returnsUnset', () => {
        const map = { a: 1, b: 2, c: 3 };
        expect(evaluateToResult(mapGet(constantMap(map), 'd'))).to.deep.equal(
          EvaluateResult.newUnset()
        );
      });

      it('get_emptyMap_returnsUnset', () => {
        const map = {};
        expect(evaluateToResult(mapGet(constantMap(map), 'd'))).to.deep.equal(
          EvaluateResult.newUnset()
        );
      });

      it('get_wrongMapType_returnsError', () => {
        const map = 'not a map';
        expect(evaluateToValue(mapGet(constant(map), 'd'))).to.be.undefined;
      });

      // it('get_wrongKeyType_returnsError', () => {
      //   const map = {a: 1, b: 2, c: 3};
      //   expect(evaluate(mapGet(constantMap(map), constant(42)))).to.be.undefined;
      // });
    }); // end describe('mapGet')
  });

  describe('String Functions', () => {
    describe('byteLength', () => {
      it('emptyString', () => {
        expectEqual(evaluateToValue(byteLength(constant(''))), constant(0));
      });

      it('emptyByte', () => {
        expectEqual(
          evaluateToValue(
            byteLength(constant(Bytes.fromUint8Array(new Uint8Array())))
          ),
          constant(0)
        );
      });

      it('nonStringOrBytes_returnsError', () => {
        expect(evaluateToValue(byteLength(constant(123)))).to.be.undefined;
      });

      it('highSurrogateOnly', () => {
        const s = '\uD83C'; // high surrogate, missing low surrogate
        expect(evaluateToValue(byteLength(constant(s)))).to.be.undefined;
      });

      it('lowSurrogateOnly', () => {
        const s = '\uDF53'; // low surrogate, missing high surrogate
        expect(evaluateToValue(byteLength(constant(s)))).to.be.undefined;
      });

      it('lowAndHighSurrogate_swapped', () => {
        const s = '\uDF53\uD83C'; // swapped high with low, invalid sequence
        expect(evaluateToValue(byteLength(constant(s)))).to.be.undefined;
      });

      it('ascii', () => {
        expectEqual(evaluateToValue(byteLength(constant('abc'))), constant(3));
        expectEqual(evaluateToValue(byteLength(constant('1234'))), constant(4));
        expectEqual(
          evaluateToValue(byteLength(constant('abc123!@'))),
          constant(8)
        );
      });

      it('largeString', () => {
        expectEqual(
          evaluateToValue(byteLength(constant('a'.repeat(1500)))),
          constant(1500)
        );
        expectEqual(
          evaluateToValue(byteLength(constant('ab'.repeat(1500)))),
          constant(3000)
        );
      });

      it('twoBytes_perCharacter', () => {
        expectEqual(
          evaluateToValue(byteLength(constant('éçñöü'))),
          constant(10)
        );
        expectEqual(
          evaluateToValue(
            byteLength(
              constant(Bytes.fromUint8Array(new TextEncoder().encode('éçñöü')))
            )
          ),
          constant(10)
        );
      });

      it('threeBytes_perCharacter', () => {
        expectEqual(
          evaluateToValue(byteLength(constant('你好世界'))),
          constant(12)
        );
        expectEqual(
          evaluateToValue(
            byteLength(
              constant(
                Bytes.fromUint8Array(new TextEncoder().encode('你好世界'))
              )
            )
          ),
          constant(12)
        );
      });

      it('fourBytes_perCharacter', () => {
        expectEqual(evaluateToValue(byteLength(constant('🀘🂡'))), constant(8));
        expectEqual(
          evaluateToValue(
            byteLength(
              constant(Bytes.fromUint8Array(new TextEncoder().encode('🀘🂡')))
            )
          ),
          constant(8)
        );
      });

      it('mixOfDifferentEncodedLengths', () => {
        expectEqual(
          evaluateToValue(byteLength(constant('aé好🂡'))),
          constant(10)
        );
        expectEqual(
          evaluateToValue(
            byteLength(
              constant(Bytes.fromUint8Array(new TextEncoder().encode('aé好🂡')))
            )
          ),
          constant(10)
        );
      });
    }); // end describe('byteLength')

    describe('charLength', () => {
      it('emptyString', () => {
        expectEqual(evaluateToValue(charLength(constant(''))), constant(0));
      });

      it('bytesType_returnsError', () => {
        expect(
          evaluateToValue(
            charLength(
              constant(Bytes.fromUint8Array(new TextEncoder().encode('abc')))
            )
          )
        ).to.be.undefined;
      });

      it('baseCase_bmp', () => {
        expectEqual(evaluateToValue(charLength(constant('abc'))), constant(3));
        expectEqual(evaluateToValue(charLength(constant('1234'))), constant(4));
        expectEqual(
          evaluateToValue(charLength(constant('abc123!@'))),
          constant(8)
        );
        expectEqual(
          evaluateToValue(charLength(constant('你好世界'))),
          constant(4)
        );
        expectEqual(
          evaluateToValue(charLength(constant('cafétéria'))),
          constant(9)
        );
        expectEqual(
          evaluateToValue(charLength(constant('абвгд'))),
          constant(5)
        );
        expectEqual(
          evaluateToValue(charLength(constant('¡Hola! ¿Cómo estás?'))),
          constant(19)
        );
        expectEqual(evaluateToValue(charLength(constant('☺'))), constant(1));
      });

      it('spaces', () => {
        expectEqual(evaluateToValue(charLength(constant(''))), constant(0));
        expectEqual(evaluateToValue(charLength(constant(' '))), constant(1));
        expectEqual(evaluateToValue(charLength(constant('  '))), constant(2));
        expectEqual(evaluateToValue(charLength(constant('a b'))), constant(3));
      });

      it('specialCharacters', () => {
        expectEqual(evaluateToValue(charLength(constant('\n'))), constant(1));
        expectEqual(evaluateToValue(charLength(constant('\t'))), constant(1));
        expectEqual(evaluateToValue(charLength(constant('\\'))), constant(1));
      });

      it('bmp_smp_mix', () => {
        const s = 'Hello\uD83D\uDE0A'; // Hello followed by emoji
        expectEqual(evaluateToValue(charLength(constant(s))), constant(6));
      });

      it('smp', () => {
        const s = '\uD83C\uDF53\uD83C\uDF51'; // a strawberry and peach emoji
        expectEqual(evaluateToValue(charLength(constant(s))), constant(2));
      });

      it('highSurrogateOnly', () => {
        const s = '\uD83C'; // high surrogate, missing low surrogate
        expectEqual(evaluateToValue(charLength(constant(s))), constant(1));
      });

      it('lowSurrogateOnly', () => {
        const s = '\uDF53'; // low surrogate, missing high surrogate
        expectEqual(evaluateToValue(charLength(constant(s))), constant(1));
      });

      it('lowAndHighSurrogate_swapped', () => {
        const s = '\uDF53\uD83C'; // swapped high with low, invalid sequence
        expectEqual(evaluateToValue(charLength(constant(s))), constant(2));
      });

      it('largeString', () => {
        expectEqual(
          evaluateToValue(charLength(constant('a'.repeat(1500)))),
          constant(1500)
        );
        expectEqual(
          evaluateToValue(charLength(constant('ab'.repeat(1500)))),
          constant(3000)
        );
      });
    }); // end describe('charLength')

    describe('concat', () => {
      it('multipleStringChildren_returnsCombination', () => {
        expectEqual(
          evaluateToValue(
            strConcat(constant('foo'), constant(' '), constant('bar'))
          ),
          constant('foo bar'),
          `strConcat('foo', ' ', 'bar')`
        );
      });

      it('multipleNonStringChildren_returnsError', () => {
        expect(
          evaluateToValue(
            strConcat(constant('foo'), constant(42), constant('bar'))
          )
        ).to.be.undefined;
      });

      it('multipleCalls', () => {
        const func = strConcat(constant('foo'), constant(' '), constant('bar'));
        expectEqual(evaluateToValue(func), constant('foo bar'), 'First call');
        expectEqual(evaluateToValue(func), constant('foo bar'), 'Second call');
        expectEqual(evaluateToValue(func), constant('foo bar'), 'Third call');
      });

      it('largeNumberOfInputs', () => {
        const args = [];
        for (let i = 0; i < 500; i++) {
          args.push(constant('a'));
        }
        expectEqual(
          evaluateToValue(strConcat(args[0], args[1], ...args.slice(2))),
          constant('a'.repeat(500))
        );
      });

      it('largeStrings', () => {
        const func = strConcat(
          constant('a'.repeat(500)),
          constant('b'.repeat(500)),
          constant('c'.repeat(500))
        );
        expectEqual(
          evaluateToValue(func),
          constant('a'.repeat(500) + 'b'.repeat(500) + 'c'.repeat(500))
        );
      });
    }); // end describe('concat')

    describe('endsWith', () => {
      it('get_nonStringValue_isError', () => {
        expect(evaluateToValue(endsWith(constant(42), constant('search')))).to
          .be.undefined;
      });

      it('get_nonStringSuffix_isError', () => {
        expect(evaluateToValue(endsWith(constant('search'), constant(42)))).to
          .be.undefined;
      });

      it('get_emptyInputs_returnsTrue', () => {
        expect(
          evaluateToValue(endsWith(constant(''), constant('')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('get_emptyValue_returnsFalse', () => {
        expect(
          evaluateToValue(endsWith(constant(''), constant('v')))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('get_emptySuffix_returnsTrue', () => {
        expect(
          evaluateToValue(endsWith(constant('value'), constant('')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('get_returnsTrue', () => {
        expect(
          evaluateToValue(endsWith(constant('search'), constant('rch')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('get_returnsFalse', () => {
        expect(
          evaluateToValue(endsWith(constant('search'), constant('rcH')))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('get_largeSuffix_returnsFalse', () => {
        expect(
          evaluateToValue(
            endsWith(constant('val'), constant('a very long suffix'))
          )
        ).to.deep.equal(FALSE_VALUE);
      });
    }); // end describe('endsWith')

    describe('like', () => {
      it('get_nonStringLike_isError', () => {
        expect(evaluateToValue(like(constant(42), constant('search')))).to.be
          .undefined;
      });

      it('get_nonStringValue_isError', () => {
        expect(evaluateToValue(like(constant('ear'), constant(42)))).to.be
          .undefined;
      });

      it('get_staticLike', () => {
        const func = like(constant('yummy food'), constant('%food'));
        expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_emptySearchString', () => {
        const func = like(constant(''), constant('%hi%'));
        expect(evaluateToValue(func)).to.deep.equal(FALSE_VALUE);
      });

      it('get_emptyLike', () => {
        const func = like(constant('yummy food'), constant(''));
        expect(evaluateToValue(func)).to.deep.equal(FALSE_VALUE);
      });

      it('get_escapedLike', () => {
        const func = like(constant('yummy food??'), constant('%food??'));
        expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_dynamicLike', () => {
        const func = like(constant('yummy food'), field('regex'));
        expect(evaluateToValue(func, { regex: 'yummy%' })).to.deep.equal(
          TRUE_VALUE
        );
        expect(evaluateToValue(func, { regex: 'food%' })).to.deep.equal(
          FALSE_VALUE
        );
        expect(evaluateToValue(func, { regex: 'yummy_food' })).to.deep.equal(
          TRUE_VALUE
        );
      });
    }); // end describe('like')

    describe('regexContains', () => {
      it('get_nonStringRegex_isError', () => {
        expect(evaluateToValue(regexContains(constant(42), constant('search'))))
          .to.be.undefined;
      });

      it('get_nonStringValue_isError', () => {
        expect(evaluateToValue(regexContains(constant('ear'), constant(42)))).to
          .be.undefined;
      });

      it('get_invalidRegex_isError', () => {
        const func = regexContains(constant('abcabc'), constant('(abc)\\1'));
        expect(evaluateToValue(func)).to.be.undefined;
        expect(evaluateToValue(func)).to.be.undefined;
        expect(evaluateToValue(func)).to.be.undefined;
      });

      it('get_staticRegex', () => {
        const func = regexContains(constant('yummy food'), constant('.*oo.*'));
        expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_subString_literal', () => {
        const func = regexContains(
          constant('yummy good food'),
          constant('good')
        );
        expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_subString_regex', () => {
        const func = regexContains(
          constant('yummy good food'),
          constant('go*d')
        );
        expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_dynamicRegex', () => {
        const func = regexContains(constant('yummy food'), field('regex'));
        expect(evaluateToValue(func, { regex: '^yummy.*' })).to.deep.equal(
          TRUE_VALUE
        );
        expect(evaluateToValue(func, { regex: 'fooood$' })).to.deep.equal(
          FALSE_VALUE
        );
        expect(evaluateToValue(func, { regex: '.*' })).to.deep.equal(
          TRUE_VALUE
        );
      });
    }); // end describe('regexContains')

    describe('regexMatch', () => {
      it('get_nonStringRegex_isError', () => {
        expect(evaluateToValue(regexMatch(constant(42), constant('search')))).to
          .be.undefined;
      });

      it('get_nonStringValue_isError', () => {
        expect(evaluateToValue(regexMatch(constant('ear'), constant(42)))).to.be
          .undefined;
      });

      it('get_invalidRegex_isError', () => {
        const func = regexMatch(constant('abcabc'), constant('(abc)\\1'));
        expect(evaluateToValue(func)).to.be.undefined;
        expect(evaluateToValue(func)).to.be.undefined;
        expect(evaluateToValue(func)).to.be.undefined;
      });

      it('get_staticRegex', () => {
        const func = regexMatch(constant('yummy food'), constant('.*oo.*'));
        expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_subString_literal', () => {
        const func = regexMatch(constant('yummy good food'), constant('good'));
        expect(evaluateToValue(func)).to.deep.equal(FALSE_VALUE);
      });

      it('get_subString_regex', () => {
        const func = regexMatch(constant('yummy good food'), constant('go*d'));
        expect(evaluateToValue(func)).to.deep.equal(FALSE_VALUE);
      });

      it('get_dynamicRegex', () => {
        const func = regexMatch(constant('yummy food'), field('regex'));
        expect(evaluateToValue(func, { regex: '^yummy.*' })).to.deep.equal(
          TRUE_VALUE
        );
        expect(evaluateToValue(func, { regex: 'fooood$' })).to.deep.equal(
          FALSE_VALUE
        );
        expect(evaluateToValue(func, { regex: '.*' })).to.deep.equal(
          TRUE_VALUE
        );
      });
    }); // end describe('regexMatch')

    describe('startsWith', () => {
      it('get_nonStringValue_isError', () => {
        expect(evaluateToValue(startsWith(constant(42), constant('search')))).to
          .be.undefined;
      });

      it('get_nonStringPrefix_isError', () => {
        expect(evaluateToValue(startsWith(constant('search'), constant(42)))).to
          .be.undefined;
      });

      it('get_emptyInputs_returnsTrue', () => {
        expect(
          evaluateToValue(startsWith(constant(''), constant('')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('get_emptyValue_returnsFalse', () => {
        expect(
          evaluateToValue(startsWith(constant(''), constant('v')))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('get_emptyPrefix_returnsTrue', () => {
        expect(
          evaluateToValue(startsWith(constant('value'), constant('')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('get_returnsTrue', () => {
        expect(
          evaluateToValue(startsWith(constant('search'), constant('sea')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('get_returnsFalse', () => {
        expect(
          evaluateToValue(startsWith(constant('search'), constant('Sea')))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('get_largePrefix_returnsFalse', () => {
        expect(
          evaluateToValue(
            startsWith(constant('val'), constant('a very long prefix'))
          )
        ).to.deep.equal(FALSE_VALUE);
      });
    }); // end describe('startsWith')

    describe('strContains', () => {
      it('value_nonString_isError', () => {
        expect(evaluateToValue(strContains(constant(42), constant('value')))).to
          .be.undefined;
      });

      it('subString_nonString_isError', () => {
        expect(
          evaluateToValue(strContains(constant('search space'), constant(42)))
        ).to.be.undefined;
      });

      it('execute_true', () => {
        expect(
          evaluateToValue(strContains(constant('abc'), constant('c')))
        ).to.deep.equal(TRUE_VALUE);
        expect(
          evaluateToValue(strContains(constant('abc'), constant('bc')))
        ).to.deep.equal(TRUE_VALUE);
        expect(
          evaluateToValue(strContains(constant('abc'), constant('abc')))
        ).to.deep.equal(TRUE_VALUE);
        expect(
          evaluateToValue(strContains(constant('abc'), constant('')))
        ).to.deep.equal(TRUE_VALUE);
        expect(
          evaluateToValue(strContains(constant(''), constant('')))
        ).to.deep.equal(TRUE_VALUE);
        expect(
          evaluateToValue(strContains(constant('☃☃☃'), constant('☃')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('execute_false', () => {
        expect(
          evaluateToValue(strContains(constant('abc'), constant('abcd')))
        ).to.deep.equal(FALSE_VALUE);
        expect(
          evaluateToValue(strContains(constant('abc'), constant('d')))
        ).to.deep.equal(FALSE_VALUE);
        expect(
          evaluateToValue(strContains(constant(''), constant('a')))
        ).to.deep.equal(FALSE_VALUE);
        expect(
          evaluateToValue(strContains(constant(''), constant('abcde')))
        ).to.deep.equal(FALSE_VALUE);
      });
    }); // end describe('strContains')
  }); // end describe('String Functions')

  describe('Vector Functions', () => {
    describe('cosineDistance', () => {
      it('cosineDistance', () => {
        expect(
          evaluateToValue(
            cosineDistance(
              constant(new VectorValue([0.0, 1.0])),
              constant(new VectorValue([5.0, 100.0]))
            )
          )?.doubleValue
        ).to.be.closeTo(0.0012476611221553524, 1e-10); // Use closeTo for floating-point comparison
      });

      it('zeroVector_returnsError', () => {
        expect(
          evaluateToResult(
            cosineDistance(
              constant(new VectorValue([0.0, 0.0])),
              constant(new VectorValue([5.0, 100.0]))
            )
          )
        ).to.deep.equal(EvaluateResult.newError());
      });

      it('emptyVectors_returnsError', () => {
        expect(
          evaluateToValue(
            cosineDistance(
              constant(new VectorValue([])),
              constant(new VectorValue([]))
            )
          )
        ).to.be.undefined;
      });

      it('differentVectorLengths_returnError', () => {
        expect(
          evaluateToValue(
            cosineDistance(
              constant(new VectorValue([1.0])),
              constant(new VectorValue([2.0, 3.0]))
            )
          )
        ).to.be.undefined;
      });

      it('wrongInputType_returnError', () => {
        expect(
          evaluateToValue(
            cosineDistance(
              constant(new VectorValue([1.0, 2.0])),
              constantArray([3.0, 4.0])
            )
          )
        ).to.be.undefined;
      });
    }); // end describe('cosineDistance')

    describe('dotProduct', () => {
      it('dotProduct', () => {
        expect(
          evaluateToValue(
            dotProduct(
              constant(new VectorValue([2.0, 1.0])),
              constant(new VectorValue([1.0, 5.0]))
            )
          )!.doubleValue
        ).to.equal(7.0);
      });

      it('orthogonalVectors', () => {
        expect(
          evaluateToValue(
            dotProduct(
              constant(new VectorValue([1.0, 0.0])),
              constant(new VectorValue([0.0, 5.0]))
            )
          )?.doubleValue
        ).to.deep.equal(0.0);
      });

      it('zeroVector_returnsZero', () => {
        expect(
          evaluateToValue(
            dotProduct(
              constant(new VectorValue([0.0, 0.0])),
              constant(new VectorValue([5.0, 100.0]))
            )
          )?.doubleValue
        ).to.equal(0.0);
      });

      it('emptyVectors_returnsZero', () => {
        expect(
          evaluateToValue(
            dotProduct(
              constant(new VectorValue([])),
              constant(new VectorValue([]))
            )
          )?.doubleValue
        ).to.equal(0.0);
      });

      it('differentVectorLengths_returnError', () => {
        expect(
          evaluateToValue(
            dotProduct(
              constant(new VectorValue([1.0])),
              constant(new VectorValue([2.0, 3.0]))
            )
          )
        ).to.be.undefined;
      });

      it('wrongInputType_returnError', () => {
        expect(
          evaluateToValue(
            dotProduct(
              constant(new VectorValue([1.0, 2.0])),
              constantArray([3.0, 4.0])
            )
          )
        ).to.be.undefined;
      });
    }); // end describe('dotProduct')

    describe('euclideanDistance', () => {
      it('euclideanDistance', () => {
        expect(
          evaluateToValue(
            euclideanDistance(
              constant(new VectorValue([0.0, 0.0])),
              constant(new VectorValue([3.0, 4.0]))
            )
          )?.doubleValue
        ).to.equal(5.0);
      });

      it('zeroVector', () => {
        expect(
          evaluateToValue(
            euclideanDistance(
              constant(new VectorValue([0.0, 0.0])),
              constant(new VectorValue([0.0, 0.0]))
            )
          )?.doubleValue
        ).to.equal(0.0);
      });

      it('emptyVectors', () => {
        expect(
          evaluateToValue(
            euclideanDistance(
              constant(new VectorValue([])),
              constant(new VectorValue([]))
            )
          )?.doubleValue
        ).to.equal(0.0);
      });

      it('differentVectorLengths_returnError', () => {
        expect(
          evaluateToValue(
            euclideanDistance(
              constant(new VectorValue([1.0])),
              constant(new VectorValue([2.0, 3.0]))
            )
          )
        ).to.be.undefined;
      });

      it('wrongInputType_returnError', () => {
        expect(
          evaluateToValue(
            euclideanDistance(
              constant(new VectorValue([1.0, 2.0])),
              constantArray([3.0, 4.0])
            )
          )
        ).to.be.undefined;
      });
    }); // end describe('euclideanDistance')

    describe('vectorLength', () => {
      it('length', () => {
        expectEqual(
          evaluateToValue(vectorLength(constant(new VectorValue([0.0, 1.0])))),
          constant(2)
        );
      });

      it('emptyVector', () => {
        expectEqual(
          evaluateToValue(vectorLength(constant(new VectorValue([])))),
          constant(0)
        );
      });

      it('zeroVector', () => {
        expectEqual(
          evaluateToValue(vectorLength(constant(new VectorValue([0.0])))),
          constant(1)
        );
      });

      it('notVectorType_returnsError', () => {
        expect(evaluateToValue(vectorLength(constantArray([1])))).to.be
          .undefined;
        expect(evaluateToValue(vectorLength(constant('notAnArray')))).to.be
          .undefined;
      });
    }); // end describe('vectorLength')
  }); // end describe('Vector Functions')

  describe('Timestamp Functions', () => {
    describe('UnixMicrosToTimestamp', () => {
      it('stringType_returnsError', () => {
        expect(evaluateToValue(unixMicrosToTimestamp(constant('abc')))).to.be
          .undefined;
      });

      it('zeroValue_returnsTimestampEpoch', () => {
        const result = evaluateToValue(unixMicrosToTimestamp(constant(0)));
        expect(result?.timestampValue).to.deep.equal({
          seconds: 0,
          nanos: 0
        });
      });

      it('intType_returnsTimestamp', () => {
        const result = evaluateToValue(
          unixMicrosToTimestamp(constant(1000000))
        );
        expect(result?.timestampValue).to.deep.equal({
          seconds: 1,
          nanos: 0
        });
      });

      it('longType_returnsTimestamp', () => {
        const result = evaluateToValue(
          unixMicrosToTimestamp(constant(9876543210))
        );
        expect(result?.timestampValue).to.deep.equal({
          seconds: 9876,
          nanos: 543210000
        });
      });

      it('longType_negative_returnsTimestamp', () => {
        const result = evaluateToValue(unixMicrosToTimestamp(constant(-10000)));
        expect(result?.timestampValue).to.deep.equal({
          seconds: 0,
          nanos: -10000000
        });
      });

      it('longType_negative_overflow_returnsError', () => {
        const result1 = evaluateToValue(
          unixMicrosToTimestamp(
            constant(-62135596800000000, {
              preferIntegers: true
            })
          )
        );
        expect(result1?.timestampValue).to.deep.equal({
          seconds: -62135596800,
          nanos: 0
        });

        const result2 = evaluateToValue(
          unixMicrosToTimestamp(
            subtract(
              constant(-62135596800000000, { preferIntegers: true }),
              constant(1)
            )
          )
        );
        expect(result2).to.deep.equal(undefined);
      });

      it('longType_positive_overflow_returnsError', () => {
        const result1 = evaluateToValue(
          unixMicrosToTimestamp(
            subtract(
              constant(253402300800000000, { preferIntegers: true }),
              constant(1)
            )
          )
        );
        expect(result1?.timestampValue).to.deep.equal({
          seconds: 253402300799,
          nanos: 999999000
        });

        const result2 = evaluateToValue(
          unixMicrosToTimestamp(
            constant(253402300800000000, {
              preferIntegers: true
            })
          )
        );
        expect(result2).to.deep.equal(undefined);
      });
    });

    describe('UnixMillisToTimestamp', () => {
      it('stringType_returnsError', () => {
        expect(evaluateToValue(unixMillisToTimestamp(constant('abc')))).to.be
          .undefined;
      });

      it('zeroValue_returnsTimestampEpoch', () => {
        const result = evaluateToValue(unixMillisToTimestamp(constant(0)));
        expect(result?.timestampValue).to.deep.equal({
          seconds: 0,
          nanos: 0
        });
      });

      it('intType_returnsTimestamp', () => {
        const result = evaluateToValue(unixMillisToTimestamp(constant(1000)));
        expect(result?.timestampValue).to.deep.equal({
          seconds: 1,
          nanos: 0
        });
      });

      it('longType_returnsTimestamp', () => {
        const result = evaluateToValue(
          unixMillisToTimestamp(constant(9876543210))
        );
        expect(result?.timestampValue).to.deep.equal({
          seconds: 9876543,
          nanos: 210000000
        });
      });

      it('longType_negative_returnsTimestamp', () => {
        const result = evaluateToValue(unixMillisToTimestamp(constant(-10000)));
        expect(result?.timestampValue).to.deep.equal({
          seconds: -10,
          nanos: 0
        });
      });

      it('longType_negative_overflow_returnsError', () => {
        const result1 = evaluateToValue(
          unixMillisToTimestamp(
            constant(-62135596800000, {
              preferIntegers: true
            })
          )
        );
        expect(result1?.timestampValue).to.deep.equal({
          seconds: -62135596800,
          nanos: 0
        });

        const result2 = evaluateToValue(
          unixMillisToTimestamp(
            constant(-62135596800001, {
              preferIntegers: true
            })
          )
        );
        expect(result2).to.deep.equal(undefined);
      });

      it('longType_positive_overflow_returnsError', () => {
        const result1 = evaluateToValue(
          unixMillisToTimestamp(
            constant(253402300799999, {
              preferIntegers: true
            })
          )
        );
        expect(result1?.timestampValue).to.deep.equal({
          seconds: 253402300799,
          nanos: 999000000
        });

        const result2 = evaluateToValue(
          unixMillisToTimestamp(
            constant(253402300800000, {
              preferIntegers: true
            })
          )
        );
        expect(result2).to.deep.equal(undefined);
      });
    });

    describe('UnixSecondsToTimestamp', () => {
      it('stringType_returnsError', () => {
        expect(evaluateToValue(unixSecondsToTimestamp(constant('abc')))).to.be
          .undefined;
      });

      it('zeroValue_returnsTimestampEpoch', () => {
        const result = evaluateToValue(unixSecondsToTimestamp(constant(0)));
        expect(result?.timestampValue).to.deep.equal({
          seconds: 0,
          nanos: 0
        });
      });

      it('intType_returnsTimestamp', () => {
        const result = evaluateToValue(unixSecondsToTimestamp(constant(1)));
        expect(result?.timestampValue).to.deep.equal({
          seconds: 1,
          nanos: 0
        });
      });

      it('longType_returnsTimestamp', () => {
        const result = evaluateToValue(
          unixSecondsToTimestamp(constant(9876543210))
        );
        expect(result?.timestampValue).to.deep.equal({
          seconds: 9876543210,
          nanos: 0
        });
      });

      it('longType_negative_returnsTimestamp', () => {
        const result = evaluateToValue(
          unixSecondsToTimestamp(constant(-10000))
        );
        expect(result?.timestampValue).to.deep.equal({
          seconds: -10000,
          nanos: 0
        });
      });

      it('longType_negative_overflow_returnsError', () => {
        const result1 = evaluateToValue(
          unixSecondsToTimestamp(
            constant(-62135596800, {
              preferIntegers: true
            })
          )
        );
        expect(result1?.timestampValue).to.deep.equal({
          seconds: -62135596800,
          nanos: 0
        });

        const result2 = evaluateToValue(
          unixSecondsToTimestamp(
            constant(-62135596801, {
              preferIntegers: true
            })
          )
        );
        expect(result2).to.deep.equal(undefined);
      });

      it('longType_positive_overflow_returnsError', () => {
        const result1 = evaluateToValue(
          unixSecondsToTimestamp(
            constant(253402300799, {
              preferIntegers: true
            })
          )
        );
        expect(result1?.timestampValue).to.deep.equal({
          seconds: 253402300799,
          nanos: 0
        });

        const result2 = evaluateToValue(
          unixSecondsToTimestamp(
            constant(253402300800, {
              preferIntegers: true
            })
          )
        );
        expect(result2).to.deep.equal(undefined);
      });
    });

    describe('TimestampToUnixMicros', () => {
      it('nonTimestampType_returnsError', () => {
        expect(evaluateToValue(timestampToUnixMicros(constant(123)))).to.be
          .undefined;
      });

      it('timestamp_returnsMicros', () => {
        const timestamp = new Timestamp(347068800, 0);
        const result = evaluateToValue(
          timestampToUnixMicros(constant(timestamp))
        );
        expect(result?.integerValue).to.equal('347068800000000');
      });

      it('epochTimestamp_returnsMicros', () => {
        const timestamp = new Timestamp(0, 0);
        const result = evaluateToValue(
          timestampToUnixMicros(constant(timestamp))
        );
        expect(result?.integerValue).to.equal('0');
      });

      it('currentTimestamp_returnsMicros', () => {
        const now = Timestamp.now();
        const result = evaluateToValue(timestampToUnixMicros(constant(now)));
        expect(result?.integerValue).to.equal(
          (BigInt(now.toMillis()) * BigInt(1000)).toString()
        );
      });

      it('maxTimestamp_returnsMicros', () => {
        const maxTimestamp = new Timestamp(253402300799, 999999999);
        const result = evaluateToValue(
          timestampToUnixMicros(constant(maxTimestamp))
        );
        expect(result?.integerValue).to.equal('253402300799999999');
      });

      it('minTimestamp_returnsMicros', () => {
        const minTimestamp = new Timestamp(-62135596800, 0);
        const result = evaluateToValue(
          timestampToUnixMicros(constant(minTimestamp))
        );
        expect(result?.integerValue).to.equal('-62135596800000000');
      });

      it('timestampOverflow_returnsError', () => {
        expect(
          evaluateToValue(
            timestampToUnixMicros(
              constant({
                timestampValue: {
                  seconds: Number.MAX_SAFE_INTEGER,
                  nanos: 999999999
                }
              })
            )
          )
        ).to.be.undefined;
      });

      it('timestampTruncatesToMicros', () => {
        const timestamp = new Timestamp(-1, 999999999);
        const result = evaluateToValue(
          timestampToUnixMicros(constant(timestamp))
        );
        expect(result?.integerValue).to.equal('-1');
      });
    });

    describe('TimestampToUnixMillisFunction', () => {
      it('nonTimestampType_returnsError', () => {
        expect(evaluateToValue(timestampToUnixMillis(constant(123)))).to.be
          .undefined;
      });

      it('timestamp_returnsMillis', () => {
        const timestamp = new Timestamp(347068800, 0);
        const result = evaluateToValue(
          timestampToUnixMillis(constant(timestamp))
        );
        expect(result?.integerValue).to.equal('347068800000');
      });

      it('epochTimestamp_returnsMillis', () => {
        const timestamp = new Timestamp(0, 0);
        const result = evaluateToValue(
          timestampToUnixMillis(constant(timestamp))
        );
        expect(result?.integerValue).to.equal('0');
      });

      it('currentTimestamp_returnsMillis', () => {
        const now = Timestamp.now();
        const result = evaluateToValue(timestampToUnixMillis(constant(now)));
        expect(result?.integerValue).to.equal(now.toMillis().toString());
      });

      it('maxTimestamp_returnsMillis', () => {
        const maxTimestamp = new Timestamp(253402300799, 999000000);
        const result = evaluateToValue(
          timestampToUnixMillis(constant(maxTimestamp))
        );
        expect(result?.integerValue).to.equal('253402300799999');
      });

      it('minTimestamp_returnsMillis', () => {
        const minTimestamp = new Timestamp(-62135596800, 0);
        const result = evaluateToValue(
          timestampToUnixMillis(constant(minTimestamp))
        );
        expect(result?.integerValue).to.equal('-62135596800000');
      });

      it('timestampTruncatesToMillis', () => {
        const timestamp = new Timestamp(-1, 999999999);
        const result = evaluateToValue(
          timestampToUnixMillis(constant(timestamp))
        );
        expect(result?.integerValue).to.equal('-1');
      });

      it('timestampOverflow_returnsError', () => {
        expect(
          evaluateToValue(
            timestampToUnixMillis(
              constant({
                timestampValue: {
                  seconds: Number.MAX_SAFE_INTEGER,
                  nanos: 999999999
                }
              })
            )
          )
        ).to.be.undefined;
      });
    });

    describe('TimestampToUnixSecondsFunctionTest', () => {
      it('nonTimestampType_returnsError', () => {
        expect(evaluateToValue(timestampToUnixSeconds(constant(123)))).to.be
          .undefined;
      });

      it('timestamp_returnsSeconds', () => {
        const timestamp = new Timestamp(347068800, 0);
        const result = evaluateToValue(
          timestampToUnixSeconds(constant(timestamp))
        );
        expect(result?.integerValue).to.equal('347068800');
      });

      it('epochTimestamp_returnsSeconds', () => {
        const timestamp = new Timestamp(0, 0);
        const result = evaluateToValue(
          timestampToUnixSeconds(constant(timestamp))
        );
        expect(result?.integerValue).to.equal('0');
      });

      it('currentTimestamp_returnsSeconds', () => {
        const now = Timestamp.now();
        const result = evaluateToValue(timestampToUnixSeconds(constant(now)));
        expect(result?.integerValue).to.equal(
          Math.floor(now.toMillis() / 1000).toString()
        );
      });

      it('maxTimestamp_returnsSeconds', () => {
        const maxTimestamp = new Timestamp(253402300799, 999999000);
        const result = evaluateToValue(
          timestampToUnixSeconds(constant(maxTimestamp))
        );
        expect(result?.integerValue).to.equal('253402300799');
      });

      it('minTimestamp_returnsSeconds', () => {
        const minTimestamp = new Timestamp(-62135596800, 0);
        const result = evaluateToValue(
          timestampToUnixSeconds(constant(minTimestamp))
        );
        expect(result?.integerValue).to.equal('-62135596800');
      });

      it('timestampTruncatesToSeconds', () => {
        const timestamp = new Timestamp(-1, 999999999);
        const result = evaluateToValue(
          timestampToUnixSeconds(constant(timestamp))
        );
        expect(result?.integerValue).to.equal('-1');
      });

      it('timestampOverflow_returnsError', () => {
        expect(
          evaluateToValue(
            timestampToUnixSeconds(
              constant({
                timestampValue: {
                  seconds: Number.MAX_SAFE_INTEGER,
                  nanos: 999999999
                }
              })
            )
          )
        ).to.be.undefined;
      });
    });

    describe('timestampAdd() function', () => {
      it('timestampAdd_stringType_returnsError', () => {
        expect(
          evaluateToValue(
            constant('abc').timestampAdd(constant('second'), constant(1))
          )
        ).to.be.undefined;
      });

      it('timestampAdd_zeroValue_returnsTimestampEpoch', () => {
        const result = evaluateToValue(
          constant(new Timestamp(0, 0)).timestampAdd(
            constant('second'),
            constant(0)
          )
        );
        expect(result?.timestampValue).to.deep.equal({
          seconds: 0,
          nanos: 0
        });
      });

      it('timestampAdd_intType_returnsTimestamp', () => {
        const result = evaluateToValue(
          constant(new Timestamp(0, 0)).timestampAdd(
            constant('second'),
            constant(1)
          )
        );
        expect(result?.timestampValue).to.deep.equal({
          seconds: 1,
          nanos: 0
        });
      });

      it('timestampAdd_longType_returnsTimestamp', () => {
        const result = evaluateToValue(
          constant(new Timestamp(0, 0)).timestampAdd(
            constant('second'),
            constant(9876543210)
          )
        );
        expect(result?.timestampValue).to.deep.equal({
          seconds: 9876543210,
          nanos: 0
        });
      });

      it('timestampAdd_longType_negative_returnsTimestamp', () => {
        const result = evaluateToValue(
          constant(new Timestamp(0, 0)).timestampAdd(
            constant('second'),
            constant(-10000)
          )
        );
        expect(result?.timestampValue).to.deep.equal({
          seconds: -10000,
          nanos: 0
        });
      });

      it('timestampAdd_longType_negative_overflow_returnsError', () => {
        const result1 = evaluateToValue(
          constant(new Timestamp(-62135596800, 0)).timestampAdd(
            constant('second'),
            constant(0)
          )
        );
        expect(result1?.timestampValue).to.deep.equal({
          seconds: -62135596800,
          nanos: 0
        });

        const result2 = evaluateToValue(
          constant(new Timestamp(-62135596800, 0)).timestampAdd(
            constant('second'),
            constant(-1)
          )
        );
        expect(result2).to.deep.equal(undefined);
      });

      it('timestampAdd_longType_positive_overflow_returnsError', () => {
        const result1 = evaluateToValue(
          constant(new Timestamp(253402300799, 999999000)).timestampAdd(
            constant('second'),
            constant(0)
          )
        );
        expect(result1?.timestampValue).to.deep.equal({
          seconds: 253402300799,
          nanos: 999999000
        });

        const result2 = evaluateToValue(
          constant(new Timestamp(253402300799, 999999000)).timestampAdd(
            constant('second'),
            constant(1)
          )
        );
        expect(result2).to.deep.equal(undefined);
      });

      it('timestampAdd_longType_minute_returnsTimestamp', () => {
        const result = evaluateToValue(
          constant(new Timestamp(0, 0)).timestampAdd(
            constant('minute'),
            constant(1)
          )
        );
        expect(result?.timestampValue).to.deep.equal({
          seconds: 60,
          nanos: 0
        });
      });

      it('timestampAdd_longType_hour_returnsTimestamp', () => {
        const result = evaluateToValue(
          constant(new Timestamp(0, 0)).timestampAdd(
            constant('hour'),
            constant(1)
          )
        );
        expect(result?.timestampValue).to.deep.equal({
          seconds: 3600,
          nanos: 0
        });
      });

      it('timestampAdd_longType_day_returnsTimestamp', () => {
        const result = evaluateToValue(
          constant(new Timestamp(0, 0)).timestampAdd(
            constant('day'),
            constant(1)
          )
        );
        expect(result?.timestampValue).to.deep.equal({
          seconds: 86400,
          nanos: 0
        });
      });

      it('timestampAdd_longType_millisecond_returnsTimestamp', () => {
        const result = evaluateToValue(
          constant(new Timestamp(0, 0)).timestampAdd(
            constant('millisecond'),
            constant(1)
          )
        );
        expect(result?.timestampValue).to.deep.equal({
          seconds: 0,
          nanos: 1000000
        });
      });

      it('timestampAdd_longType_microsecond_returnsTimestamp', () => {
        const result = evaluateToValue(
          constant(new Timestamp(0, 0)).timestampAdd(
            constant('microsecond'),
            constant(1)
          )
        );
        expect(result?.timestampValue).to.deep.equal({
          seconds: 0,
          nanos: 1000
        });
      });

      it('timestampAdd_invalidTimeUnit_returnsError', () => {
        expect(
          evaluateToValue(
            constant(new Timestamp(0, 0)).timestampAdd(
              constant('abc'),
              constant(1)
            )
          )
        ).to.be.undefined;
      });

      it('timestampAdd_invalidAmount_returnsError', () => {
        expect(
          evaluateToValue(
            constant(new Timestamp(0, 0)).timestampAdd(
              constant('second'),
              constant('abc')
            )
          )
        ).to.be.undefined;
      });

      it('timestampAdd_nullAmount_returnsNull', () => {
        expectEqual(
          evaluateToValue(
            constant(new Timestamp(0, 0)).timestampAdd(
              constant('second'),
              constant(null)
            )
          ),
          constant(null)
        );
      });

      it('timestampAdd_nullTimeUnit_returnsNull', () => {
        expectEqual(
          evaluateToValue(
            constant(new Timestamp(0, 0)).timestampAdd(
              constant(null),
              constant(1)
            )
          ),
          constant(null)
        );
      });

      it('timestampAdd_nullTimestamp_returnsNull', () => {
        expectEqual(
          evaluateToValue(
            constant(null).timestampAdd(constant('second'), constant(1))
          ),
          constant(null)
        );
      });
    });
  });

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
    const binaryFunctionBuilders: Array<(v1: Expr, v2: Expr) => FunctionExpr> =
      [
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
});
