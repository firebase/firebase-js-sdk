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

import { doc } from '../../util/helpers';
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
  xor
} from '../../../src/lite-api/expressions';
import { newTestFirestore } from '../../util/api_helpers';
import { constantArray, constantMap } from '../../util/pipelines';
import { newUserDataReader } from '../../../src/lite-api/user_data_reader';
import {
  FALSE_VALUE,
  TRUE_VALUE,
  typeOrder,
  valueEquals
} from '../../../src/model/values';
import { toEvaluable } from '../../../src/core/expressions';
import { Value } from '../../../src/protos/firestore_proto_api';
import { canonifyExpr } from '../../../src/core/pipeline-util';
import { JsonObject, ObjectValue } from '../../../src/model/object_value';

const db = newTestFirestore();
const ERROR_VALUE = undefined;
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
    constantArray([null]),
    constantArray([null, NaN]),
    constantArray([null, 1]),
    constantArray([true, 15]),
    constantArray([true, 15, null]),
    constantArray([NaN]),
    constantArray([NaN, 'foo']),
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

  static equivalentValues(): { left: Constant; right: Constant }[] {
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

  static lessThanValues(): { left: Constant; right: Constant }[] {
    const results: { left: Constant; right: Constant }[] = [];

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

  static greaterThanValues(): { left: Constant; right: Constant }[] {
    const results: { left: Constant; right: Constant }[] = [];

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

  static mixedTypeValues(): { left: Constant; right: Constant }[] {
    const results: { left: Constant; right: Constant }[] = [];

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

function evaluate(
  expr: Expr,
  data?: JsonObject<unknown> | ObjectValue
): Value | undefined {
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
          evaluate(eq(left, right)),
          `eq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns false for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluate(eq(left, right)),
          `eq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns false for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluate(eq(left, right)),
          `eq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_any_returnsFalse', () => {
      ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
        expect(
          evaluate(eq(constant(null), v)),
          `eq(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(FALSE_VALUE);
        expect(
          evaluate(eq(v, constant(null))),
          `eq(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_null_returnsTrue', () => {
      expect(evaluate(eq(constant(null), constant(null)))).to.be.deep.equal(
        TRUE_VALUE
      );
    });

    it('Null and missing evaluates to undefined (error)', () => {
      expect(evaluate(eq(constant(null), field('not-exist')))).to.be.undefined;
    });

    it('nullInArray_equality', () => {
      expect(evaluate(eq(constantArray([null]), constant(1)))).to.be.deep.equal(
        FALSE_VALUE
      );
      expect(
        evaluate(eq(constantArray([null]), constant('1')))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluate(eq(constantArray([null]), constant(null)))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluate(eq(constantArray([null]), constant(NaN)))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluate(eq(constantArray([null]), constantArray([])))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluate(eq(constantArray([null]), constantArray([NaN])))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluate(eq(constantArray([null]), constantArray([null])))
      ).to.be.deep.equal(TRUE_VALUE);
    });

    it('nullInMap_equality_returnsTrue', () => {
      expect(
        evaluate(eq(constantMap({ foo: null }), constantMap({ foo: null })))
      ).to.be.deep.equal(TRUE_VALUE);
    });

    it('null_missingInMap_equality_returnsFalse', () => {
      expect(
        evaluate(eq(constantMap({ foo: null }), constant({})))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    describe('NaN tests', () => {
      it('nan_number_returnsFalse', () => {
        ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
          expect(
            evaluate(eq(constant(NaN), v)),
            `eq(NaN, ${canonifyExpr(v)})`
          ).to.be.deep.equal(FALSE_VALUE);
          expect(
            evaluate(eq(v, constant(NaN))),
            `eq(${canonifyExpr(v)}, NaN)`
          ).to.be.deep.equal(FALSE_VALUE);
        });
      });

      it('nan_nan_returnsFalse', () => {
        expect(evaluate(eq(constant(NaN), constant(NaN)))).to.be.deep.equal(
          FALSE_VALUE
        );
      });

      it('nan_otherType_returnsFalse', () => {
        ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
          // Exclude numeric values as they are already tested above
          if (!ComparisonValueTestData.NUMERIC_VALUES.includes(v)) {
            expect(
              evaluate(eq(constant(NaN), v)),
              `eq(NaN, ${canonifyExpr(v)})`
            ).to.be.deep.equal(FALSE_VALUE);
            expect(
              evaluate(eq(v, constant(NaN))),
              `eq(${canonifyExpr(v)}, NaN)`
            ).to.be.deep.equal(FALSE_VALUE);
          }
        });
      });

      it('nanInArray_equality_returnsFalse', () => {
        expect(
          evaluate(eq(constantArray([NaN]), constantArray([NaN])))
        ).to.be.deep.equal(FALSE_VALUE);
      });

      it('nanInMap_equality_returnsFalse', () => {
        expect(
          evaluate(eq(constantMap({ foo: NaN }), constantMap({ foo: NaN })))
        ).to.be.deep.equal(FALSE_VALUE);
      });
    }); // end describe NaN tests

    describe('Array tests', () => {
      it('array_ambiguousNumerics', () => {
        expect(
          evaluate(eq(constantArray([1]), constantArray([1.0])))
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    describe('Map tests', () => {
      it('map_ambiguousNumerics', () => {
        expect(
          evaluate(
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
          expect(evaluate(eq(errorExpr(), v))).to.be.deep.equal(ERROR_VALUE);
          expect(evaluate(eq(v, errorExpr()))).to.be.deep.equal(ERROR_VALUE);
        });
      });

      it('error_error_returnsError', () => {
        expect(evaluate(eq(errorExpr(), errorExpr()))).to.be.deep.equal(
          ERROR_VALUE
        );
      });

      it('error_null_returnsError', () => {
        expect(evaluate(eq(errorExpr(), constant(null)))).to.be.deep.equal(
          ERROR_VALUE
        );
      });
    }); // end describe Error tests
  });

  describe('gte', () => {
    it('returns false for lessThan values', () => {
      ComparisonValueTestData.lessThanValues().forEach(({ left, right }) => {
        expect(
          evaluate(gte(left, right)),
          `gte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns true for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluate(gte(left, right)),
          `gte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns false for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluate(gte(left, right)),
          `gte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_any_returnsFalse', () => {
      ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
        expect(
          evaluate(gte(constant(null), v)),
          `gte(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(FALSE_VALUE);
        expect(
          evaluate(gte(v, constant(null))),
          `gte(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_null_returnsTrue', () => {
      expect(evaluate(gte(constant(null), constant(null)))).to.be.deep.equal(
        TRUE_VALUE
      );
    });

    it('nan_number_returnsFalse', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(
          evaluate(gte(constant(NaN), v)),
          `gte(NaN, ${canonifyExpr(v)})`
        ).to.be.deep.equal(FALSE_VALUE);
        expect(
          evaluate(gte(v, constant(NaN))),
          `gte(${canonifyExpr(v)}, NaN)`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('nan_nan_returnsFalse', () => {
      expect(evaluate(gte(constant(NaN), constant(NaN)))).to.be.deep.equal(
        FALSE_VALUE
      );
    });

    it('nanInArray_returnsFalse', () => {
      expect(
        evaluate(gte(constantArray([NaN]), constantArray([NaN])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      // Adapt as needed for references
      expect(evaluate(gte(field('not-exist'), constant(1)))).to.be.undefined; // Or appropriate error handling
    });
  }); // end describe('gte')

  describe('gt', () => {
    it('returns false for equal values', () => {
      ComparisonValueTestData.equivalentValues().forEach(({ left, right }) => {
        expect(
          evaluate(gt(left, right)),
          `gt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns false for lessThan values', () => {
      ComparisonValueTestData.lessThanValues().forEach(({ left, right }) => {
        expect(
          evaluate(gt(left, right)),
          `gt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns true for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluate(gt(left, right)),
          `gt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns false for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluate(gt(left, right)),
          `gt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_any_returnsFalse', () => {
      ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
        expect(
          evaluate(gt(constant(null), v)),
          `gt(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(FALSE_VALUE);
        expect(
          evaluate(gt(v, constant(null))),
          `gt(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_null_returnsFalse', () => {
      expect(evaluate(gt(constant(null), constant(null)))).to.be.deep.equal(
        FALSE_VALUE
      );
    });

    it('nan_number_returnsFalse', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(evaluate(gt(constant(NaN), v))).to.be.deep.equal(FALSE_VALUE);
        expect(evaluate(gt(v, constant(NaN)))).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('nan_nan_returnsFalse', () => {
      expect(evaluate(gt(constant(NaN), constant(NaN)))).to.be.deep.equal(
        FALSE_VALUE
      );
    });

    it('nanInArray_returnsFalse', () => {
      expect(
        evaluate(gt(constantArray([NaN]), constantArray([NaN])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      // Adapt as needed for references
      expect(evaluate(gt(field('not-exist'), constant(1)))).to.be.undefined; // Or appropriate error handling
    });
  }); // end describe('gt')

  describe('lte', () => {
    it('returns true for lessThan values', () => {
      ComparisonValueTestData.lessThanValues().forEach(({ left, right }) => {
        expect(
          evaluate(lte(left, right)),
          `lte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns false for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluate(lte(left, right)),
          `lte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns false for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluate(lte(left, right)),
          `lte(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_any_returnsFalse', () => {
      ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
        expect(
          evaluate(lte(constant(null), v)),
          `lte(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(FALSE_VALUE);
        expect(
          evaluate(lte(v, constant(null))),
          `lte(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_null_returnsTrue', () => {
      expect(evaluate(lte(constant(null), constant(null)))).to.be.deep.equal(
        TRUE_VALUE
      );
    });

    it('nan_number_returnsFalse', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(evaluate(lte(constant(NaN), v))).to.be.deep.equal(FALSE_VALUE);
        expect(evaluate(lte(v, constant(NaN)))).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('nan_nan_returnsFalse', () => {
      expect(evaluate(lte(constant(NaN), constant(NaN)))).to.be.deep.equal(
        FALSE_VALUE
      );
    });

    it('nanInArray_returnsFalse', () => {
      expect(
        evaluate(lte(constantArray([NaN]), constantArray([NaN])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      // Adapt as needed for references
      expect(evaluate(lte(field('not-exist'), constant(1)))).to.be.undefined; // Or appropriate error handling
    });
  }); // end describe('lte')

  describe('lt', () => {
    it('returns false for equal values', () => {
      ComparisonValueTestData.equivalentValues().forEach(({ left, right }) => {
        expect(
          evaluate(lt(left, right)),
          `lt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns true for lessThan values', () => {
      ComparisonValueTestData.lessThanValues().forEach(({ left, right }) => {
        expect(
          evaluate(lt(left, right)),
          `lt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns false for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluate(lt(left, right)),
          `lt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('returns false for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluate(lt(left, right)),
          `lt(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_any_returnsFalse', () => {
      ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
        expect(
          evaluate(lt(constant(null), v)),
          `lt(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(FALSE_VALUE);
        expect(
          evaluate(lt(v, constant(null))),
          `lt(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_null_returnsFalse', () => {
      expect(evaluate(lt(constant(null), constant(null)))).to.be.deep.equal(
        FALSE_VALUE
      );
    });

    it('nan_number_returnsFalse', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(evaluate(lt(constant(NaN), v))).to.be.deep.equal(FALSE_VALUE);
        expect(evaluate(lt(v, constant(NaN)))).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('nan_nan_returnsFalse', () => {
      expect(evaluate(lt(constant(NaN), constant(NaN)))).to.be.deep.equal(
        FALSE_VALUE
      );
    });

    it('nanInArray_returnsFalse', () => {
      expect(
        evaluate(lt(constantArray([NaN]), constantArray([NaN])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      // Adapt as needed for references
      expect(evaluate(lt(field('not-exist'), constant(1)))).to.be.undefined; // Or appropriate error handling
    });
  }); // end describe('lt')

  describe('neq', () => {
    it('returns true for lessThan values', () => {
      ComparisonValueTestData.lessThanValues().forEach(({ left, right }) => {
        expect(
          evaluate(neq(left, right)),
          `neq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns true for greaterThan values', () => {
      ComparisonValueTestData.greaterThanValues().forEach(({ left, right }) => {
        expect(
          evaluate(neq(left, right)),
          `neq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('returns true for mixedType values', () => {
      ComparisonValueTestData.mixedTypeValues().forEach(({ left, right }) => {
        expect(
          evaluate(neq(left, right)),
          `neq(${canonifyExpr(left)}, ${canonifyExpr(right)})`
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('null_any_returnsTrue', () => {
      expect(evaluate(neq(constant(null), constant(42)))).to.be.deep.equal(
        TRUE_VALUE
      );
      expect(
        evaluate(neq(constant(null), constant('matang')))
      ).to.be.deep.equal(TRUE_VALUE);
      expect(evaluate(neq(constant(null), constant(true)))).to.be.deep.equal(
        TRUE_VALUE
      );
    });

    it('null_null_returnsFalse', () => {
      expect(evaluate(neq(constant(null), constant(null)))).to.be.deep.equal(
        FALSE_VALUE
      );
    });

    it('nan_number_returnsTrue', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(evaluate(neq(constant(NaN), v))).to.be.deep.equal(TRUE_VALUE);
        expect(evaluate(neq(v, constant(NaN)))).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('nan_nan_returnsTrue', () => {
      expect(evaluate(neq(constant(NaN), constant(NaN)))).to.be.deep.equal(
        TRUE_VALUE
      );
    });

    it('map_ambiguousNumerics', () => {
      expect(
        evaluate(
          neq(
            constantMap({ foo: 1, bar: 42.0 }),
            constantMap({ foo: 1.0, bar: 42 })
          )
        )
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('array_ambiguousNumerics', () => {
      expect(
        evaluate(neq(constantArray([1]), constantArray([1.0])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      expect(evaluate(neq(field('not-exist'), constant(1)))).to.be.undefined; // Or appropriate error handling
    });
  }); // end describe('neq')
});

function expectEqual(
  evaluated: Value | undefined,
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

describe('Expressions', () => {
  describe('Arithmetic Expressions', () => {
    describe('add', () => {
      it('basic_add_numerics', () => {
        expectEqual(
          evaluate(add(constant(1), constant(2))),
          constant(3),
          `add(1, 2)`
        );
        expectEqual(
          evaluate(add(constant(1), constant(2.5))),
          constant(3.5),
          `add(1, 2.5)`
        );
        expectEqual(
          evaluate(add(constant(1.0), constant(2))),
          constant(3.0),
          `add(1.0, 2)`
        );
        expectEqual(
          evaluate(add(constant(1.0), constant(2.0))),
          constant(3.0),
          `add(1.0, 2.0)`
        );
      });

      it('basic_add_nonNumerics', () => {
        expect(evaluate(add(constant(1), constant('1')))).to.be.undefined;
        expect(evaluate(add(constant('1'), constant(1.0)))).to.be.undefined;
        expect(evaluate(add(constant('1'), constant('1')))).to.be.undefined;
      });

      it('doubleLongAddition_overflow', () => {
        expectEqual(
          evaluate(add(constant(9223372036854775807), constant(1.0))),
          constant(9.223372036854776e18),
          `add(Long.MAX_VALUE, 1.0)`
        );
        expectEqual(
          evaluate(add(constant(9223372036854775807.0), constant(100))),
          constant(9.223372036854776e18),
          `add(Long.MAX_VALUE as double, 100)`
        );
      });

      it('doubleAddition_overflow', () => {
        expectEqual(
          evaluate(add(constant(Number.MAX_VALUE), constant(Number.MAX_VALUE))),
          constant(Number.POSITIVE_INFINITY),
          `add(Number.MAX_VALUE, Number.MAX_VALUE)`
        );
        expectEqual(
          evaluate(
            add(constant(-Number.MAX_VALUE), constant(-Number.MAX_VALUE))
          ),
          constant(Number.NEGATIVE_INFINITY),
          `add(-Number.MAX_VALUE, -Number.MAX_VALUE)`
        );
      });

      it('sumPosAndNegInfinity_returnNaN', () => {
        expectEqual(
          evaluate(
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
          evaluate(
            add(
              constant(0x7fffffffffffffff, { preferIntegers: true }),
              constant(1)
            )
          )
        ).to.be.undefined;
        expect(
          evaluate(
            add(
              constant(0x8000000000000000, { preferIntegers: true }),
              constant(-1)
            )
          )
        ).to.be.undefined;
        expect(
          evaluate(
            add(
              constant(1),
              constant(0x7fffffffffffffff, { preferIntegers: true })
            )
          )
        ).to.be.undefined;
      });

      it('nan_number_returnNaN', () => {
        expectEqual(
          evaluate(add(constant(1), constant(NaN))),
          constant(NaN),
          `add(1, NaN)`
        );
        expectEqual(
          evaluate(add(constant(1.0), constant(NaN))),
          constant(NaN),
          `add(1.0, NaN)`
        );
        expectEqual(
          evaluate(add(constant(Number.MAX_SAFE_INTEGER), constant(NaN))),
          constant(NaN),
          `add(Number.MAX_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(add(constant(Number.MIN_SAFE_INTEGER), constant(NaN))),
          constant(NaN),
          `add(Number.MIN_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(add(constant(Number.MAX_VALUE), constant(NaN))),
          constant(NaN),
          `add(Number.MAX_VALUE, NaN)`
        );
        expectEqual(
          evaluate(add(constant(Number.MIN_VALUE), constant(NaN))),
          constant(NaN),
          `add(Number.MIN_VALUE, NaN)`
        );
        expectEqual(
          evaluate(add(constant(Number.POSITIVE_INFINITY), constant(NaN))),
          constant(NaN),
          `add(Number.POSITIVE_INFINITY, NaN)`
        );
        expectEqual(
          evaluate(add(constant(Number.NEGATIVE_INFINITY), constant(NaN))),
          constant(NaN),
          `add(Number.NEGATIVE_INFINITY, NaN)`
        );
      });

      it('nan_notNumberType_returnError', () => {
        expect(evaluate(add(constant(NaN), constant('hello world')))).to.be
          .undefined;
      });

      it('multiArgument', () => {
        expectEqual(
          evaluate(add(add(constant(1), constant(2)), constant(3))),
          constant(6),
          `add(add(1, 2), 3)`
        );
        expectEqual(
          evaluate(add(add(constant(1.0), constant(2)), constant(3))),
          constant(6.0),
          `add(add(1.0, 2), 3)`
        );
      });
    }); // end describe('add')

    describe('subtract', () => {
      it('basic_subtract_numerics', () => {
        expectEqual(
          evaluate(subtract(constant(1), constant(2))),
          constant(-1),
          `subtract(1, 2)`
        );
        expectEqual(
          evaluate(subtract(constant(1), constant(2.5))),
          constant(-1.5),
          `subtract(1, 2.5)`
        );
        expectEqual(
          evaluate(subtract(constant(1.0), constant(2))),
          constant(-1.0),
          `subtract(1.0, 2)`
        );
        expectEqual(
          evaluate(subtract(constant(1.0), constant(2.0))),
          constant(-1.0),
          `subtract(1.0, 2.0)`
        );
      });

      it('basic_subtract_nonNumerics', () => {
        expect(evaluate(subtract(constant(1), constant('1')))).to.be.undefined;
        expect(evaluate(subtract(constant('1'), constant(1.0)))).to.be
          .undefined;
        expect(evaluate(subtract(constant('1'), constant('1')))).to.be
          .undefined;
      });

      // TODO(pipeline): Overflow behavior is different in Javascript than backend.
      it.skip('doubleLongSubtraction_overflow', () => {
        expectEqual(
          evaluate(subtract(constant(0x8000000000000000), constant(1.0))),
          constant(-9.223372036854776e18),
          `subtract(Long.MIN_VALUE, 1.0)`
        );
        expectEqual(
          evaluate(subtract(constant(0x8000000000000000), constant(100))),
          constant(-9.223372036854776e18),
          `subtract(Long.MIN_VALUE, 100)`
        );
      });

      it('doubleSubtraction_overflow', () => {
        expectEqual(
          evaluate(
            subtract(constant(-Number.MAX_VALUE), constant(Number.MAX_VALUE))
          ),
          constant(Number.NEGATIVE_INFINITY),
          `subtract(-Number.MAX_VALUE, Number.MAX_VALUE)`
        );
        expectEqual(
          evaluate(
            subtract(constant(Number.MAX_VALUE), constant(-Number.MAX_VALUE))
          ),
          constant(Number.POSITIVE_INFINITY),
          `subtract(Number.MAX_VALUE, -Number.MAX_VALUE)`
        );
      });

      it('longSubtraction_overflow', () => {
        expect(
          evaluate(
            subtract(
              constant(0x8000000000000000, { preferIntegers: true }),
              constant(1)
            )
          )
        ).to.be.undefined;
        expect(
          evaluate(
            subtract(
              constant(0x8000000000000000, { preferIntegers: true }),
              constant(-1)
            )
          )
        ).to.be.undefined;
      });

      it('nan_number_returnNaN', () => {
        expectEqual(
          evaluate(subtract(constant(1), constant(NaN))),
          constant(NaN),
          `subtract(1, NaN)`
        );
        expectEqual(
          evaluate(subtract(constant(1.0), constant(NaN))),
          constant(NaN),
          `subtract(1.0, NaN)`
        );
        expectEqual(
          evaluate(subtract(constant(Number.MAX_SAFE_INTEGER), constant(NaN))),
          constant(NaN),
          `subtract(Number.MAX_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(subtract(constant(Number.MIN_SAFE_INTEGER), constant(NaN))),
          constant(NaN),
          `subtract(Number.MIN_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(subtract(constant(Number.MAX_VALUE), constant(NaN))),
          constant(NaN),
          `subtract(Number.MAX_VALUE, NaN)`
        );
        expectEqual(
          evaluate(subtract(constant(Number.MIN_VALUE), constant(NaN))),
          constant(NaN),
          `subtract(Number.MIN_VALUE, NaN)`
        );
        expectEqual(
          evaluate(subtract(constant(Number.POSITIVE_INFINITY), constant(NaN))),
          constant(NaN),
          `subtract(Number.POSITIVE_INFINITY, NaN)`
        );
        expectEqual(
          evaluate(subtract(constant(Number.NEGATIVE_INFINITY), constant(NaN))),
          constant(NaN),
          `subtract(Number.NEGATIVE_INFINITY, NaN)`
        );
      });

      it('nan_notNumberType_returnError', () => {
        expect(evaluate(subtract(constant(NaN), constant('hello world')))).to.be
          .undefined;
      });

      it('positiveInfinity', () => {
        expectEqual(
          evaluate(subtract(constant(Number.POSITIVE_INFINITY), constant(1))),
          constant(Number.POSITIVE_INFINITY),
          `subtract(Number.POSITIVE_INFINITY, 1)`
        );

        expectEqual(
          evaluate(subtract(constant(1), constant(Number.POSITIVE_INFINITY))),
          constant(Number.NEGATIVE_INFINITY),
          `subtract(1, Number.POSITIVE_INFINITY)`
        );
      });

      it('negativeInfinity', () => {
        expectEqual(
          evaluate(subtract(constant(Number.NEGATIVE_INFINITY), constant(1))),
          constant(Number.NEGATIVE_INFINITY),
          `subtract(Number.NEGATIVE_INFINITY, 1)`
        );

        expectEqual(
          evaluate(subtract(constant(1), constant(Number.NEGATIVE_INFINITY))),
          constant(Number.POSITIVE_INFINITY),
          `subtract(1, Number.NEGATIVE_INFINITY)`
        );
      });

      it('positiveInfinity_negativeInfinity', () => {
        expectEqual(
          evaluate(
            subtract(
              constant(Number.POSITIVE_INFINITY),
              constant(Number.NEGATIVE_INFINITY)
            )
          ),
          constant(Number.POSITIVE_INFINITY),
          `subtract(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)`
        );

        expectEqual(
          evaluate(
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
          evaluate(multiply(constant(1), constant(2))),
          constant(2),
          `multiply(1, 2)`
        );
        expectEqual(
          evaluate(multiply(constant(3), constant(2.5))),
          constant(7.5),
          `multiply(3, 2.5)`
        );
        expectEqual(
          evaluate(multiply(constant(1.0), constant(2))),
          constant(2.0),
          `multiply(1.0, 2)`
        );
        expectEqual(
          evaluate(multiply(constant(1.32), constant(2.0))),
          constant(2.64),
          `multiply(1.32, 2.0)`
        );
      });

      it('basic_multiply_nonNumerics', () => {
        expect(evaluate(multiply(constant(1), constant('1')))).to.be.undefined;
        expect(evaluate(multiply(constant('1'), constant(1.0)))).to.be
          .undefined;
        expect(evaluate(multiply(constant('1'), constant('1')))).to.be
          .undefined;
      });

      it('doubleLongMultiplication_overflow', () => {
        expectEqual(
          evaluate(multiply(constant(9223372036854775807), constant(100.0))),
          constant(922337203685477600000),
          `multiply(Long.MAX_VALUE, 100.0)`
        );
        expectEqual(
          evaluate(multiply(constant(9223372036854775807), constant(100))),
          constant(922337203685477600000),
          `multiply(Long.MAX_VALUE, 100)`
        );
      });

      it('doubleMultiplication_overflow', () => {
        expectEqual(
          evaluate(
            multiply(constant(Number.MAX_VALUE), constant(Number.MAX_VALUE))
          ),
          constant(Number.POSITIVE_INFINITY),
          `multiply(Number.MAX_VALUE, Number.MAX_VALUE)`
        );
        expectEqual(
          evaluate(
            multiply(constant(-Number.MAX_VALUE), constant(Number.MAX_VALUE))
          ),
          constant(Number.NEGATIVE_INFINITY),
          `multiply(-Number.MAX_VALUE, Number.MAX_VALUE)`
        );
      });

      it('longMultiplication_overflow', () => {
        expect(
          evaluate(
            multiply(
              constant(9223372036854775807, { preferIntegers: true }),
              constant(10)
            )
          )
        ).to.be.undefined;
        expect(
          evaluate(
            multiply(
              constant(0x8000000000000000, { preferIntegers: true }),
              constant(10)
            )
          )
        ).to.be.undefined;
        expect(
          evaluate(
            multiply(
              constant(-10),
              constant(9223372036854775807, { preferIntegers: true })
            )
          )
        ).to.be.undefined;
        expect(
          evaluate(
            multiply(
              constant(-10),
              constant(0x8000000000000000, { preferIntegers: true })
            )
          )
        ).to.be.undefined;
      });

      it('nan_number_returnNaN', () => {
        expectEqual(
          evaluate(multiply(constant(1), constant(NaN))),
          constant(NaN),
          `multiply(1, NaN)`
        );
        expectEqual(
          evaluate(multiply(constant(1.0), constant(NaN))),
          constant(NaN),
          `multiply(1.0, NaN)`
        );
        expectEqual(
          evaluate(multiply(constant(Number.MAX_SAFE_INTEGER), constant(NaN))),
          constant(NaN),
          `multiply(Number.MAX_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(multiply(constant(Number.MIN_SAFE_INTEGER), constant(NaN))),
          constant(NaN),
          `multiply(Number.MIN_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(multiply(constant(Number.MAX_VALUE), constant(NaN))),
          constant(NaN),
          `multiply(Number.MAX_VALUE, NaN)`
        );
        expectEqual(
          evaluate(multiply(constant(Number.MIN_VALUE), constant(NaN))),
          constant(NaN),
          `multiply(Number.MIN_VALUE, NaN)`
        );
        expectEqual(
          evaluate(multiply(constant(Number.POSITIVE_INFINITY), constant(NaN))),
          constant(NaN),
          `multiply(Number.POSITIVE_INFINITY, NaN)`
        );
        expectEqual(
          evaluate(multiply(constant(Number.NEGATIVE_INFINITY), constant(NaN))),
          constant(NaN),
          `multiply(Number.NEGATIVE_INFINITY, NaN)`
        );
      });

      it('nan_notNumberType_returnError', () => {
        expect(evaluate(multiply(constant(NaN), constant('hello world')))).to.be
          .undefined;
      });

      it('positiveInfinity', () => {
        expectEqual(
          evaluate(multiply(constant(Number.POSITIVE_INFINITY), constant(1))),
          constant(Number.POSITIVE_INFINITY),
          `multiply(Number.POSITIVE_INFINITY, 1)`
        );

        expectEqual(
          evaluate(multiply(constant(1), constant(Number.POSITIVE_INFINITY))),
          constant(Number.POSITIVE_INFINITY),
          `multiply(1, Number.POSITIVE_INFINITY)`
        );
      });

      it('negativeInfinity', () => {
        expectEqual(
          evaluate(multiply(constant(Number.NEGATIVE_INFINITY), constant(1))),
          constant(Number.NEGATIVE_INFINITY),
          `multiply(Number.NEGATIVE_INFINITY, 1)`
        );

        expectEqual(
          evaluate(multiply(constant(1), constant(Number.NEGATIVE_INFINITY))),
          constant(Number.NEGATIVE_INFINITY),
          `multiply(1, Number.NEGATIVE_INFINITY)`
        );
      });

      it('positiveInfinity_negativeInfinity_returnsNegativeInfinity', () => {
        expectEqual(
          evaluate(
            multiply(
              constant(Number.POSITIVE_INFINITY),
              constant(Number.NEGATIVE_INFINITY)
            )
          ),
          constant(Number.NEGATIVE_INFINITY),
          `multiply(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)`
        );

        expectEqual(
          evaluate(
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
          evaluate(multiply(multiply(constant(1), constant(2)), constant(3))),
          constant(6),
          `multiply(multiply(1, 2, 3))`
        );
        expectEqual(
          evaluate(multiply(constant(1.0), multiply(constant(2), constant(3)))),
          constant(6.0),
          `multiply(1.0, multiply(2, 3))`
        );
      });
    }); // end describe('multiply')

    describe('divide', () => {
      it('basic_divide_numerics', () => {
        expectEqual(
          evaluate(divide(constant(10), constant(2))),
          constant(5),
          `divide(10, 2)`
        );
        expectEqual(
          evaluate(divide(constant(10), constant(2.0))),
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
        expect(evaluate(divide(constant(1), constant('1')))).to.be.undefined;
        expect(evaluate(divide(constant('1'), constant(1.0)))).to.be.undefined;
        expect(evaluate(divide(constant('1'), constant('1')))).to.be.undefined;
      });

      it('long_division', () => {
        expectEqual(
          evaluate(divide(constant(10), constant(3))),
          constant(3), // Integer division in JavaScript
          `divide(10, 3)`
        );
        expectEqual(
          evaluate(divide(constant(-10), constant(3))),
          constant(-3), // Integer division in JavaScript
          `divide(-10, 3)`
        );
        expectEqual(
          evaluate(divide(constant(10), constant(-3))),
          constant(-3), // Integer division in JavaScript
          `divide(10, -3)`
        );
        expectEqual(
          evaluate(divide(constant(-10), constant(-3))),
          constant(3), // Integer division in JavaScript
          `divide(-10, -3)`
        );
      });

      it('doubleLongDivision_overflow', () => {
        expectEqual(
          evaluate(divide(constant(Number.MAX_SAFE_INTEGER), constant(0.1))),
          constant(90071992547409910), // Note: JS limitation, see explanation below
          `divide(Number.MAX_SAFE_INTEGER, 0.1)`
        );
        expectEqual(
          evaluate(divide(constant(Number.MAX_SAFE_INTEGER), constant(0.1))),
          constant(90071992547409910), // Note: JS limitation, see explanation below
          `divide(Number.MAX_SAFE_INTEGER, 0.1)`
        );
      });

      it('doubleDivision_overflow', () => {
        expectEqual(
          evaluate(
            divide(constant(Number.MAX_VALUE), constant(Number.MIN_VALUE))
          ),
          constant(Number.POSITIVE_INFINITY),
          `divide(Number.MAX_VALUE, Number.MIN_VALUE)`
        );
        expectEqual(
          evaluate(
            divide(constant(-Number.MAX_VALUE), constant(Number.MIN_VALUE))
          ),
          constant(Number.NEGATIVE_INFINITY),
          `divide(-Number.MAX_VALUE, Number.MIN_VALUE)`
        );
      });

      it('divideByZero', () => {
        expect(evaluate(divide(constant(1), constant(0)))).to.be.undefined; // Or your error handling
        expectEqual(
          evaluate(divide(constant(1.1), constant(0.0))),
          constant(Number.POSITIVE_INFINITY),
          `divide(1, 0.0)`
        );
        expectEqual(
          evaluate(divide(constant(1.1), constant(-0.0))),
          constant(Number.NEGATIVE_INFINITY),
          `divide(1, -0.0)`
        );
      });

      it('nan_number_returnNaN', () => {
        expectEqual(
          evaluate(divide(constant(1), constant(NaN))),
          constant(NaN),
          `divide(1, NaN)`
        );
        expectEqual(
          evaluate(divide(constant(NaN), constant(1))),
          constant(NaN),
          `divide(NaN, 1)`
        );

        expectEqual(
          evaluate(divide(constant(1.0), constant(NaN))),
          constant(NaN),
          `divide(1.0, NaN)`
        );
        expectEqual(
          evaluate(divide(constant(NaN), constant(1.0))),
          constant(NaN),
          `divide(NaN, 1.0)`
        );

        expectEqual(
          evaluate(divide(constant(Number.MAX_SAFE_INTEGER), constant(NaN))),
          constant(NaN),
          `divide(Number.MAX_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(divide(constant(NaN), constant(Number.MAX_SAFE_INTEGER))),
          constant(NaN),
          `divide(NaN, Number.MAX_SAFE_INTEGER)`
        );

        expectEqual(
          evaluate(divide(constant(Number.MIN_SAFE_INTEGER), constant(NaN))),
          constant(NaN),
          `divide(Number.MIN_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(divide(constant(NaN), constant(Number.MIN_SAFE_INTEGER))),
          constant(NaN),
          `divide(NaN, Number.MIN_SAFE_INTEGER)`
        );

        expectEqual(
          evaluate(divide(constant(Number.MAX_VALUE), constant(NaN))),
          constant(NaN),
          `divide(Number.MAX_VALUE, NaN)`
        );
        expectEqual(
          evaluate(divide(constant(NaN), constant(Number.MAX_VALUE))),
          constant(NaN),
          `divide(NaN, Number.MAX_VALUE)`
        );

        expectEqual(
          evaluate(divide(constant(Number.MIN_VALUE), constant(NaN))),
          constant(NaN),
          `divide(Number.MIN_VALUE, NaN)`
        );
        expectEqual(
          evaluate(divide(constant(NaN), constant(Number.MIN_VALUE))),
          constant(NaN),
          `divide(NaN, Number.MIN_VALUE)`
        );

        expectEqual(
          evaluate(divide(constant(Number.POSITIVE_INFINITY), constant(NaN))),
          constant(NaN),
          `divide(Number.POSITIVE_INFINITY, NaN)`
        );
        expectEqual(
          evaluate(divide(constant(NaN), constant(NaN))),
          constant(NaN),
          `divide(NaN, NaN)`
        );

        expectEqual(
          evaluate(divide(constant(Number.NEGATIVE_INFINITY), constant(NaN))),
          constant(NaN),
          `divide(Number.NEGATIVE_INFINITY, NaN)`
        );
        expectEqual(
          evaluate(divide(constant(NaN), constant(Number.NEGATIVE_INFINITY))),
          constant(NaN),
          `divide(NaN, Number.NEGATIVE_INFINITY)`
        );
      });

      it('nan_notNumberType_returnError', () => {
        expect(evaluate(divide(constant(NaN), constant('hello world')))).to.be
          .undefined;
      });

      it('positiveInfinity', () => {
        expectEqual(
          evaluate(divide(constant(Number.POSITIVE_INFINITY), constant(1))),
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
          evaluate(divide(constant(Number.NEGATIVE_INFINITY), constant(1))),
          constant(Number.NEGATIVE_INFINITY),
          `divide(Number.NEGATIVE_INFINITY, 1)`
        );
        expectEqual(
          evaluate(divide(constant(1), constant(Number.NEGATIVE_INFINITY))),
          constant(-0.0),
          `divide(1, Number.NEGATIVE_INFINITY)`
        );
      });

      it('positiveInfinity_negativeInfinity_returnsNan', () => {
        expectEqual(
          evaluate(
            divide(
              constant(Number.POSITIVE_INFINITY),
              constant(Number.NEGATIVE_INFINITY)
            )
          ),
          constant(NaN),
          `divide(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)`
        );
        expectEqual(
          evaluate(
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
        expect(evaluate(mod(constant(42), constant(0)))).to.be.undefined;
        expect(evaluate(mod(constant(42), constant(-0)))).to.be.undefined;

        expect(evaluate(mod(constant(42), constant(0.0)))).to.be.undefined;
        expect(evaluate(mod(constant(42), constant(-0.0)))).to.be.undefined;
      });

      it('dividendZero_returnsZero', () => {
        expectEqual(
          evaluate(mod(constant(0), constant(42))),
          constant(0),
          `mod(0, 42)`
        );
        expectEqual(
          evaluate(mod(constant(-0), constant(42))),
          constant(0),
          `mod(-0, 42)`
        );

        expectEqual(
          evaluate(mod(constant(0.0), constant(42))),
          constant(0.0),
          `mod(0.0, 42)`
        );
        expectEqual(
          evaluate(mod(constant(-0.0), constant(42))),
          constant(-0.0),
          `mod(-0.0, 42)`
        );
      });

      it('long_positive_positive', () => {
        expectEqual(
          evaluate(mod(constant(10), constant(3))),
          constant(1),
          `mod(10, 3)`
        );
      });

      it('long_negative_negative', () => {
        expectEqual(
          evaluate(mod(constant(-10), constant(-3))),
          constant(-1),
          `mod(-10, -3)`
        );
      });

      it('long_positive_negative', () => {
        expectEqual(
          evaluate(mod(constant(10), constant(-3))),
          constant(1),
          `mod(10, -3)`
        );
      });

      it('long_negative_positive', () => {
        expectEqual(
          evaluate(mod(constant(-10), constant(3))),
          constant(-1),
          `mod(-10, 3)`
        );
      });

      it('double_positive_positive', () => {
        expect(
          evaluate(mod(constant(10.5), constant(3.0)))?.doubleValue
        ).to.be.closeTo(1.5, 1e-6);
      });

      it('double_negative_negative', () => {
        expect(
          evaluate(mod(constant(-7.3), constant(-1.8)))?.doubleValue
        ).to.be.closeTo(-0.1, 1e-6);
      });

      it('double_positive_negative', () => {
        expect(
          evaluate(mod(constant(9.8), constant(-2.5)))?.doubleValue
        ).to.be.closeTo(2.3, 1e-6);
      });

      it('double_negative_positive', () => {
        expect(
          evaluate(mod(constant(-7.5), constant(2.3)))?.doubleValue
        ).to.be.closeTo(-0.6, 1e-6);
      });

      it('long_perfectlyDivisible', () => {
        expectEqual(
          evaluate(mod(constant(10), constant(5))),
          constant(0),
          `mod(10, 5)`
        );
        expectEqual(
          evaluate(mod(constant(-10), constant(5))),
          constant(0),
          `mod(-10, 5)`
        );
        expectEqual(
          evaluate(mod(constant(10), constant(-5))),
          constant(0),
          `mod(10, -5)`
        );
        expectEqual(
          evaluate(mod(constant(-10), constant(-5))),
          constant(0),
          `mod(-10, -5)`
        );
      });

      it('double_perfectlyDivisible', () => {
        expectEqual(
          evaluate(mod(constant(10), constant(2.5))),
          constant(0.0),
          `mod(10, 2.5)`
        );
        expectEqual(
          evaluate(mod(constant(10), constant(-2.5))),
          constant(0.0),
          `mod(10, -2.5)`
        );
        expectEqual(
          evaluate(mod(constant(-10), constant(2.5))),
          constant(-0.0),
          `mod(-10, 2.5)`
        );
        expectEqual(
          evaluate(mod(constant(-10), constant(-2.5))),
          constant(-0.0),
          `mod(-10, -2.5)`
        );
      });

      it('nonNumerics_returnError', () => {
        expect(evaluate(mod(constant(10), constant('1')))).to.be.undefined;
        expect(evaluate(mod(constant('1'), constant(10)))).to.be.undefined;
        expect(evaluate(mod(constant('1'), constant('1')))).to.be.undefined;
      });

      it('nan_number_returnNaN', () => {
        expectEqual(
          evaluate(mod(constant(1), constant(NaN))),
          constant(NaN),
          `mod(1, NaN)`
        );
        expectEqual(
          evaluate(mod(constant(1.0), constant(NaN))),
          constant(NaN),
          `mod(1.0, NaN)`
        );
        expectEqual(
          evaluate(mod(constant(Number.MAX_SAFE_INTEGER), constant(NaN))),
          constant(NaN),
          `mod(Number.MAX_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(mod(constant(Number.MIN_SAFE_INTEGER), constant(NaN))),
          constant(NaN),
          `mod(Number.MIN_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(mod(constant(Number.MAX_VALUE), constant(NaN))),
          constant(NaN),
          `mod(Number.MAX_VALUE, NaN)`
        );
        expectEqual(
          evaluate(mod(constant(Number.MIN_VALUE), constant(NaN))),
          constant(NaN),
          `mod(Number.MIN_VALUE, NaN)`
        );
        expectEqual(
          evaluate(mod(constant(Number.POSITIVE_INFINITY), constant(NaN))),
          constant(NaN),
          `mod(Number.POSITIVE_INFINITY, NaN)`
        );
        expectEqual(
          evaluate(mod(constant(Number.NEGATIVE_INFINITY), constant(NaN))),
          constant(NaN),
          `mod(Number.NEGATIVE_INFINITY, NaN)`
        );
      });

      it('nan_notNumberType_returnError', () => {
        expect(evaluate(mod(constant(NaN), constant('hello world')))).to.be
          .undefined;
      });

      it('number_posInfinity_returnSelf', () => {
        expectEqual(
          evaluate(mod(constant(1), constant(Number.POSITIVE_INFINITY))),
          constant(1.0),
          `mod(1, Number.POSITIVE_INFINITY)`
        );
        expectEqual(
          evaluate(
            mod(constant(42.123456789), constant(Number.POSITIVE_INFINITY))
          ),
          constant(42.123456789),
          `mod(42.123456789, Number.POSITIVE_INFINITY)`
        );
        expectEqual(
          evaluate(mod(constant(-99.9), constant(Number.POSITIVE_INFINITY))),
          constant(-99.9),
          `mod(-99.9, Number.POSITIVE_INFINITY)`
        );
      });

      it('posInfinity_number_returnNaN', () => {
        expectEqual(
          evaluate(mod(constant(Number.POSITIVE_INFINITY), constant(1))),
          constant(NaN),
          `mod(Number.POSITIVE_INFINITY, 1)`
        );
        expectEqual(
          evaluate(
            mod(constant(Number.POSITIVE_INFINITY), constant(42.123456789))
          ),
          constant(NaN),
          `mod(Number.POSITIVE_INFINITY, 42.123456789)`
        );
        expectEqual(
          evaluate(mod(constant(Number.POSITIVE_INFINITY), constant(-99.9))),
          constant(NaN),
          `mod(Number.POSITIVE_INFINITY, -99.9)`
        );
      });

      it('number_negInfinity_returnSelf', () => {
        expectEqual(
          evaluate(mod(constant(1), constant(Number.NEGATIVE_INFINITY))),
          constant(1.0),
          `mod(1, Number.NEGATIVE_INFINITY)`
        );
        expectEqual(
          evaluate(
            mod(constant(42.123456789), constant(Number.NEGATIVE_INFINITY))
          ),
          constant(42.123456789),
          `mod(42.123456789, Number.NEGATIVE_INFINITY)`
        );
        expectEqual(
          evaluate(mod(constant(-99.9), constant(Number.NEGATIVE_INFINITY))),
          constant(-99.9),
          `mod(-99.9, Number.NEGATIVE_INFINITY)`
        );
      });

      it('negInfinity_number_returnNaN', () => {
        expectEqual(
          evaluate(mod(constant(Number.NEGATIVE_INFINITY), constant(1))),
          constant(NaN),
          `mod(Number.NEGATIVE_INFINITY, 1)`
        );
        expectEqual(
          evaluate(
            mod(constant(Number.NEGATIVE_INFINITY), constant(42.123456789))
          ),
          constant(NaN),
          `mod(Number.NEGATIVE_INFINITY, 42.123456789)`
        );
        expectEqual(
          evaluate(mod(constant(Number.NEGATIVE_INFINITY), constant(-99.9))),
          constant(NaN),
          `mod(Number.NEGATIVE_INFINITY, -99.9)`
        );
      });

      it('posAndNegInfinity_returnNaN', () => {
        expectEqual(
          evaluate(
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
          evaluate(
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
          evaluate(
            arrayContainsAll(constantArray(['1', 42, true]), [
              constant('1'),
              constant(99)
            ])
          )
        ).to.deep.equal(FALSE_VALUE);
      });

      it('equivalentNumerics', () => {
        expect(
          evaluate(
            arrayContainsAll(
              constantArray([42, true, 'additional', 'values', 'in', 'array']),
              [constant(42.0), constant(true)]
            )
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('arrayToSearch_isEmpty', () => {
        expect(
          evaluate(
            arrayContainsAll(constantArray([]), [
              constant(42.0),
              constant(true)
            ])
          )
        ).to.deep.equal(FALSE_VALUE);
      });

      it('searchValue_isEmpty', () => {
        expect(
          evaluate(arrayContainsAll(constantArray([42.0, true]), []))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('searchValue_isNaN', () => {
        expect(
          evaluate(
            arrayContainsAll(constantArray([NaN, 42.0]), [constant(NaN)])
          )
        ).to.deep.equal(FALSE_VALUE);
      });

      it('searchValue_hasDuplicates', () => {
        expect(
          evaluate(
            arrayContainsAll(constantArray([true, 'hi']), [
              constant(true),
              constant(true),
              constant(true)
            ])
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('arrayToSearch_isEmpty_searchValue_isEmpty', () => {
        expect(evaluate(arrayContainsAll(constantArray([]), []))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('largeNumberOfElements', () => {
        const elements = Array.from({ length: 500 }, (_, i) => i + 1);
        expect(
          evaluate(
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
          evaluate(arrayContainsAny(ARRAY_TO_SEARCH, SEARCH_VALUES))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('equivalentNumerics', () => {
        expect(
          evaluate(
            arrayContainsAny(ARRAY_TO_SEARCH, [constant(42.0), constant(2)])
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('valuesNotFoundInArray', () => {
        expect(
          evaluate(
            arrayContainsAny(ARRAY_TO_SEARCH, [constant(99), constant('false')])
          )
        ).to.deep.equal(FALSE_VALUE);
      });

      // TODO(pipeline): Nested arrays are not supported in documents. We need to
      // support creating nested arrays as expressions however.
      it.skip('bothInputTypeIsArray', () => {
        expect(
          evaluate(
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

      it('search_isNull', () => {
        expect(
          evaluate(
            arrayContainsAny(constantArray([null, 1, 'matang', true]), [
              constant(null)
            ])
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('array_isNotArrayType_returnsError', () => {
        expect(evaluate(arrayContainsAny(constant('matang'), SEARCH_VALUES))).to
          .be.undefined;
      });

      it('search_isNotArrayType_returnsError', () => {
        expect(
          evaluate(arrayContainsAny(constant('values'), [constant('values')]))
        ).to.be.undefined;
      });

      it('array_notFound_returnsError', () => {
        expect(evaluate(arrayContainsAny(field('not-exist'), SEARCH_VALUES))).to
          .be.undefined;
      });

      it('searchNotFound_returnsError', () => {
        expect(
          evaluate(arrayContainsAny(ARRAY_TO_SEARCH, [field('not-exist')]))
        ).to.be.undefined;
      });
    }); // end describe('arrayContainsAny')

    describe('arrayContains', () => {
      const ARRAY_TO_SEARCH = constantArray([42, 'matang', true]);

      it('valueFoundInArray', () => {
        expect(
          evaluate(
            arrayContains(constantArray(['hello', 'world']), constant('hello'))
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('valueNotFoundInArray', () => {
        expect(
          evaluate(arrayContains(ARRAY_TO_SEARCH, constant(4)))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('notArrayContainsFunction_valueNotFoundInArray', () => {
        const child = arrayContains(ARRAY_TO_SEARCH, constant(4));
        const f = not(child as BooleanExpr);
        expect(evaluate(f)).to.deep.equal(TRUE_VALUE);
      });

      it('equivalentNumerics', () => {
        expect(
          evaluate(arrayContains(ARRAY_TO_SEARCH, constant(42.0)))
        ).to.deep.equal(TRUE_VALUE);
      });

      // TODO(pipeline): Nested arrays are not supported in documents. We need to
      // support creating nested arrays as expressions however.
      it.skip('bothInputTypeIsArray', () => {
        expect(
          evaluate(
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

      it('searchValue_isNull', () => {
        expect(
          evaluate(
            arrayContains(
              constantArray([null, 1, 'matang', true]),
              constant(null)
            )
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('searchValue_isNull_emptyValuesArray_returnsFalse', () => {
        expect(
          evaluate(arrayContains(constantArray([]), constant(null)))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('searchValue_isMap', () => {
        expect(
          evaluate(
            arrayContains(
              constantArray([123, { foo: 123 }, { bar: 42 }, { foo: 42 }]),
              constantMap({ foo: 42 })
            )
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('searchValue_isNaN', () => {
        expect(
          evaluate(arrayContains(constantArray([NaN, 'foo']), constant(NaN)))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('arrayToSearch_isNotArrayType_returnsError', () => {
        expect(evaluate(arrayContains(constant('matang'), constant('values'))))
          .to.be.undefined;
      });

      it('arrayToSearch_notFound_returnsError', () => {
        expect(evaluate(arrayContains(field('not-exist'), constant('matang'))))
          .to.be.undefined;
      });

      it('arrayToSearch_isEmpty_returnsFalse', () => {
        expect(
          evaluate(arrayContains(constantArray([]), constant('matang')))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('searchValue_reference_notFound_returnsError', () => {
        expect(evaluate(arrayContains(ARRAY_TO_SEARCH, field('not-exist')))).to
          .be.undefined;
      });
    }); // end describe('arrayContains')

    describe('arrayLength', () => {
      it('length', () => {
        expectEqual(
          evaluate(arrayLength(constantArray(['1', 42, true]))),
          constant(3),
          `arrayLength(['1', 42, true])`
        );
      });

      it('emptyArray', () => {
        expectEqual(
          evaluate(arrayLength(constantArray([]))),
          constant(0),
          `arrayLength([])`
        );
      });

      it('arrayWithDuplicateElements', () => {
        expectEqual(
          evaluate(arrayLength(constantArray([true, true]))),
          constant(2),
          `arrayLength([true, true])`
        );
      });

      it('notArrayType_returnsError', () => {
        expect(evaluate(arrayLength(constant(new VectorValue([0.0, 1.0]))))).to
          .be.undefined; // Assuming double[] is not considered an array
        expect(evaluate(arrayLength(constant('notAnArray')))).to.be.undefined;
      });
    }); // end describe('arrayLength')
  });

  describe('Field expression', () => {
    it('can get field', () => {
      expect(evaluate(field('exists'))?.booleanValue).to.be.true;
    });

    it('error if not found', () => {
      expect(evaluate(field('not-exists'))).to.be.undefined;
    });
  });

  describe('Logical Functions', () => {
    describe('and', () => {
      it('false_false_isFalse', () => {
        expect(evaluate(and(falseExpr, falseExpr))).to.deep.equal(FALSE_VALUE);
      });

      it('false_error_isFalse', () => {
        expect(evaluate(and(falseExpr, errorFilterCondition()))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('false_true_isFalse', () => {
        expect(evaluate(and(falseExpr, trueExpr))).to.deep.equal(FALSE_VALUE);
      });

      it('error_false_isFalse', () => {
        expect(evaluate(and(errorFilterCondition(), falseExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('error_error_isError', () => {
        expect(evaluate(and(errorFilterCondition(), errorFilterCondition()))).to
          .be.undefined;
      });

      it('error_true_isError', () => {
        expect(evaluate(and(errorFilterCondition(), trueExpr))).to.be.undefined;
      });

      it('true_false_isFalse', () => {
        expect(evaluate(and(trueExpr, falseExpr))).to.deep.equal(FALSE_VALUE);
      });

      it('true_error_isError', () => {
        expect(evaluate(and(trueExpr, errorFilterCondition()))).to.be.undefined;
      });

      it('true_true_isTrue', () => {
        expect(evaluate(and(trueExpr, trueExpr))).to.deep.equal(TRUE_VALUE);
      });

      it('false_false_false_isFalse', () => {
        expect(evaluate(and(falseExpr, falseExpr, falseExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('false_false_error_isFalse', () => {
        expect(
          evaluate(and(falseExpr, falseExpr, errorFilterCondition()))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('false_false_true_isFalse', () => {
        expect(evaluate(and(falseExpr, falseExpr, trueExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('false_error_false_isFalse', () => {
        expect(
          evaluate(and(falseExpr, errorFilterCondition(), falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('false_error_error_isFalse', () => {
        expect(
          evaluate(
            and(falseExpr, errorFilterCondition(), errorFilterCondition())
          )
        ).to.deep.equal(FALSE_VALUE);
      });

      it('false_error_true_isFalse', () => {
        expect(
          evaluate(and(falseExpr, errorFilterCondition(), trueExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('false_true_false_isFalse', () => {
        expect(evaluate(and(falseExpr, trueExpr, falseExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('false_true_error_isFalse', () => {
        expect(
          evaluate(and(falseExpr, trueExpr, errorFilterCondition()))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('false_true_true_isFalse', () => {
        expect(evaluate(and(falseExpr, trueExpr, trueExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('error_false_false_isFalse', () => {
        expect(
          evaluate(and(errorFilterCondition(), falseExpr, falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('error_false_error_isFalse', () => {
        expect(
          evaluate(
            and(errorFilterCondition(), falseExpr, errorFilterCondition())
          )
        ).to.deep.equal(FALSE_VALUE);
      });

      it('error_false_true_isFalse', () => {
        expect(
          evaluate(and(errorFilterCondition(), falseExpr, trueExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('error_error_false_isFalse', () => {
        expect(
          evaluate(
            and(errorFilterCondition(), errorFilterCondition(), falseExpr)
          )
        ).to.deep.equal(FALSE_VALUE);
      });

      it('error_error_error_isError', () => {
        expect(
          evaluate(
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
          evaluate(
            and(errorFilterCondition(), errorFilterCondition(), trueExpr)
          )
        ).to.be.undefined;
      });

      it('error_true_false_isFalse', () => {
        expect(
          evaluate(and(errorFilterCondition(), trueExpr, falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('error_true_error_isError', () => {
        expect(
          evaluate(
            and(errorFilterCondition(), trueExpr, errorFilterCondition())
          )
        ).to.be.undefined;
      });

      it('error_true_true_isError', () => {
        expect(evaluate(and(errorFilterCondition(), trueExpr, trueExpr))).to.be
          .undefined;
      });

      it('true_false_false_isFalse', () => {
        expect(evaluate(and(trueExpr, falseExpr, falseExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('true_false_error_isFalse', () => {
        expect(
          evaluate(and(trueExpr, falseExpr, errorFilterCondition()))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('true_false_true_isFalse', () => {
        expect(evaluate(and(trueExpr, falseExpr, trueExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('true_error_false_isFalse', () => {
        expect(
          evaluate(and(trueExpr, errorFilterCondition(), falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('true_error_error_isError', () => {
        expect(
          evaluate(
            and(trueExpr, errorFilterCondition(), errorFilterCondition())
          )
        ).to.be.undefined;
      });

      it('true_error_true_isError', () => {
        expect(evaluate(and(trueExpr, errorFilterCondition(), trueExpr))).to.be
          .undefined;
      });

      it('true_true_false_isFalse', () => {
        expect(evaluate(and(trueExpr, trueExpr, falseExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('true_true_error_isError', () => {
        expect(evaluate(and(trueExpr, trueExpr, errorFilterCondition()))).to.be
          .undefined;
      });

      it('true_true_true_isTrue', () => {
        expect(evaluate(and(trueExpr, trueExpr, trueExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('nested_and', () => {
        const child = and(trueExpr, falseExpr);
        const f = and(child, trueExpr);
        expect(evaluate(f)).to.deep.equal(FALSE_VALUE);
      });

      it('multipleArguments', () => {
        expect(evaluate(and(trueExpr, trueExpr, trueExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });
    }); // end describe('and')

    describe('cond', () => {
      it('trueCondition_returnsTrueCase', () => {
        const func = cond(trueExpr, constant('true case'), errorExpr());
        expect(evaluate(func)?.stringValue).to.deep.equal('true case');
      });

      it('falseCondition_returnsFalseCase', () => {
        const func = cond(falseExpr, errorExpr(), constant('false case'));
        expect(evaluate(func)?.stringValue).to.deep.equal('false case');
      });

      it('errorCondition_returnsFalseCase', () => {
        const func = cond(
          errorFilterCondition(),
          errorExpr(),
          constant('false')
        );
        expect(evaluate(func)?.stringValue).to.deep.equal('false');
      });
    }); // end describe('cond')

    describe('eqAny', () => {
      it('valueFoundInArray', () => {
        expect(
          evaluate(
            eqAny(constant('hello'), [constant('hello'), constant('world')])
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('valueNotFoundInArray', () => {
        expect(
          evaluate(
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
        expect(evaluate(f)).to.deep.equal(TRUE_VALUE);
      });

      it('equivalentNumerics', () => {
        expect(
          evaluate(
            eqAny(constant(42), [
              constant(42.0),
              constant('matang'),
              constant(true)
            ])
          )
        ).to.deep.equal(TRUE_VALUE);
        expect(
          evaluate(
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
          evaluate(
            eqAny(constantArray([1, 2, 3]), [
              constantArray([1, 2, 3]),
              constantArray([4, 5, 6]),
              constantArray([7, 8, 9])
            ])
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('array_notFound_returnsError', () => {
        expect(evaluate(eqAny(constant('matang'), [field('not-exist')]))).to.be
          .undefined;
      });

      it('array_isEmpty_returnsFalse', () => {
        expect(evaluate(eqAny(constant(42), []))).to.deep.equal(FALSE_VALUE);
      });

      it('search_reference_notFound_returnsError', () => {
        expect(
          evaluate(
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
          evaluate(
            eqAny(constant(null), [
              constant(null),
              constant(1),
              constant('matang'),
              constant(true)
            ])
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('search_isNull_emptyValuesArray_returnsFalse', () => {
        expect(evaluate(eqAny(constant(null), []))).to.deep.equal(FALSE_VALUE);
      });

      it('search_isNaN', () => {
        expect(
          evaluate(
            eqAny(constant(NaN), [constant(NaN), constant(42), constant(3.14)])
          )
        ).to.deep.equal(FALSE_VALUE);
      });

      it('search_isEmpty_array_isEmpty', () => {
        expect(evaluate(eqAny(constantArray([]), []))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('search_isEmpty_array_containsEmptyArray_returnsTrue', () => {
        expect(
          evaluate(eqAny(constantArray([]), [constantArray([])]))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('search_isMap', () => {
        expect(
          evaluate(
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
        expect(evaluate(isNan(constant(NaN)))).to.deep.equal(TRUE_VALUE);
        expect(evaluate(isNan(field('nanValue')))).to.deep.equal(TRUE_VALUE);
      });

      it('notNan_returnsFalse', () => {
        expect(evaluate(isNan(constant(42.0)))).to.deep.equal(FALSE_VALUE);
        expect(evaluate(isNan(constant(42)))).to.deep.equal(FALSE_VALUE);
      });

      it('isNotNan', () => {
        expect(evaluate(not(isNan(constant(42.0))))).to.deep.equal(TRUE_VALUE);
        expect(evaluate(not(isNan(constant(42))))).to.deep.equal(TRUE_VALUE);
      });

      it('otherNanRepresentations_returnsTrue', () => {
        const v1 = NaN; // In JS, any operation with NaN results in NaN
        expect(Number.isNaN(v1)).to.be.true;
        expect(evaluate(isNan(constant(v1)))).to.deep.equal(TRUE_VALUE);

        expect(
          evaluate(
            isNan(
              add(
                constant(Number.POSITIVE_INFINITY),
                constant(Number.NEGATIVE_INFINITY)
              )
            )
          )
        ).to.deep.equal(TRUE_VALUE);

        expect(evaluate(isNan(add(constant(NaN), constant(1))))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('error_returnsError', () => {
        expect(evaluate(isNan(errorExpr()))).to.be.undefined;
      });

      it('null_returnsError', () => {
        expect(evaluate(isNan(constant(null)))).to.be.undefined;
      });

      it('nonNumeric_returnsError', () => {
        expect(evaluate(isNan(constant(true)))).to.be.undefined;
        expect(evaluate(isNan(constant('abc')))).to.be.undefined;
      });
    }); // end describe('isNaN')

    describe('logicalMaximum', () => {
      it('numericType', () => {
        expectEqual(
          evaluate(
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
          evaluate(
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
          evaluate(
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
          evaluate(logicalMaximum(constant(null), errorExpr())),
          constant(null),
          `logicalMaximum(null, ERROR_VALUE)`
        );
      });

      it('nanAndNumbers', () => {
        expectEqual(
          evaluate(logicalMaximum(constant(NaN), constant(0))),
          constant(0),
          `logicalMaximum(NaN, 0)`
        );
      });

      it('errorInput_skip', () => {
        expectEqual(
          evaluate(logicalMaximum(errorExpr(), constant(1))),
          constant(1),
          `logicalMaximum(ERROR_VALUE, 1)`
        );
      });

      it('nullInput_skip', () => {
        expectEqual(
          evaluate(logicalMaximum(constant(null), constant(1))),
          constant(1),
          `logicalMaximum(null, 1)`
        );
      });

      it('equivalent_numerics', () => {
        expectEqual(
          evaluate(logicalMaximum(constant(1), constant(1.0))),
          constant(1),
          `logicalMaximum(1, 1.0)`
        );
      });
    }); // end describe('logicalMaximum')

    describe('logicalMinimum', () => {
      it('numericType', () => {
        expectEqual(
          evaluate(
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
          evaluate(
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
          evaluate(
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
          evaluate(logicalMinimum(constant(null), errorExpr())),
          constant(null),
          `logicalMinimum(null, ERROR_VALUE)`
        );
      });

      it('nanAndNumbers', () => {
        expectEqual(
          evaluate(logicalMinimum(constant(NaN), constant(0))),
          constant(NaN),
          `logicalMinimum(NaN, 0)`
        );
      });

      it('errorInput_skip', () => {
        expectEqual(
          evaluate(logicalMinimum(errorExpr(), constant(1))),
          constant(1),
          `logicalMinimum(ERROR_VALUE, 1)`
        );
      });

      it('nullInput_skip', () => {
        expectEqual(
          evaluate(logicalMinimum(constant(null), constant(1))),
          constant(1),
          `logicalMinimum(null, 1)`
        );
      });

      it('equivalent_numerics', () => {
        expectEqual(
          evaluate(logicalMinimum(constant(1), constant(1.0))),
          constant(1),
          `logicalMinimum(1, 1.0)`
        );
      });
    }); // end describe('logicalMinimum')

    describe('not', () => {
      it('true_to_false', () => {
        expect(evaluate(not(constant(1).eq(1)))).to.deep.equal(FALSE_VALUE);
      });

      it('false_to_true', () => {
        expect(evaluate(not(constant(1).neq(1)))).to.deep.equal(TRUE_VALUE);
      });
    }); // end describe('not')

    describe('or', () => {
      it('false_false_isFalse', () => {
        expect(evaluate(or(falseExpr, falseExpr))).to.deep.equal(FALSE_VALUE);
      });

      it('false_error_isError', () => {
        expect(evaluate(or(falseExpr, errorFilterCondition()))).to.be.undefined;
      });

      it('false_true_isTrue', () => {
        expect(evaluate(or(falseExpr, trueExpr))).to.deep.equal(TRUE_VALUE);
      });

      it('error_false_isError', () => {
        expect(evaluate(or(errorFilterCondition(), falseExpr))).to.be.undefined;
      });

      it('error_error_isError', () => {
        expect(evaluate(or(errorFilterCondition(), errorFilterCondition()))).to
          .be.undefined;
      });

      it('error_true_isTrue', () => {
        expect(evaluate(or(errorFilterCondition(), trueExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('true_false_isTrue', () => {
        expect(evaluate(or(trueExpr, falseExpr))).to.deep.equal(TRUE_VALUE);
      });

      it('true_error_isTrue', () => {
        expect(evaluate(or(trueExpr, errorFilterCondition()))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('true_true_isTrue', () => {
        expect(evaluate(or(trueExpr, trueExpr))).to.deep.equal(TRUE_VALUE);
      });

      it('false_false_false_isFalse', () => {
        expect(evaluate(or(falseExpr, falseExpr, falseExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('false_false_error_isError', () => {
        expect(evaluate(or(falseExpr, falseExpr, errorFilterCondition()))).to.be
          .undefined;
      });

      it('false_false_true_isTrue', () => {
        expect(evaluate(or(falseExpr, falseExpr, trueExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('false_error_false_isError', () => {
        expect(evaluate(or(falseExpr, errorFilterCondition(), falseExpr))).to.be
          .undefined;
      });

      it('false_error_error_isError', () => {
        expect(
          evaluate(
            or(falseExpr, errorFilterCondition(), errorFilterCondition())
          )
        ).to.be.undefined;
      });

      it('false_error_true_isTrue', () => {
        expect(
          evaluate(or(falseExpr, errorFilterCondition(), trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('false_true_false_isTrue', () => {
        expect(evaluate(or(falseExpr, trueExpr, falseExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('false_true_error_isTrue', () => {
        expect(
          evaluate(or(falseExpr, trueExpr, errorFilterCondition()))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('false_true_true_isTrue', () => {
        expect(evaluate(or(falseExpr, trueExpr, trueExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('error_false_false_isError', () => {
        expect(evaluate(or(errorFilterCondition(), falseExpr, falseExpr))).to.be
          .undefined;
      });

      it('error_false_error_isError', () => {
        expect(
          evaluate(
            or(errorFilterCondition(), falseExpr, errorFilterCondition())
          )
        ).to.be.undefined;
      });

      it('error_false_true_isTrue', () => {
        expect(
          evaluate(or(errorFilterCondition(), falseExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('error_error_false_isError', () => {
        expect(
          evaluate(
            or(errorFilterCondition(), errorFilterCondition(), falseExpr)
          )
        ).to.be.undefined;
      });

      it('error_error_error_isError', () => {
        expect(
          evaluate(
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
          evaluate(or(errorFilterCondition(), errorFilterCondition(), trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('error_true_false_isTrue', () => {
        expect(
          evaluate(or(errorFilterCondition(), trueExpr, falseExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('error_true_error_isTrue', () => {
        expect(
          evaluate(or(errorFilterCondition(), trueExpr, errorFilterCondition()))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('error_true_true_isTrue', () => {
        expect(
          evaluate(or(errorFilterCondition(), trueExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('true_false_false_isTrue', () => {
        expect(evaluate(or(trueExpr, falseExpr, falseExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('true_false_error_isTrue', () => {
        expect(
          evaluate(or(trueExpr, falseExpr, errorFilterCondition()))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('true_false_true_isTrue', () => {
        expect(evaluate(or(trueExpr, falseExpr, trueExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('true_error_false_isTrue', () => {
        expect(
          evaluate(or(trueExpr, errorFilterCondition(), falseExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('true_error_error_isTrue', () => {
        expect(
          evaluate(or(trueExpr, errorFilterCondition(), errorFilterCondition()))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('true_error_true_isTrue', () => {
        expect(
          evaluate(or(trueExpr, errorFilterCondition(), trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('true_true_false_isTrue', () => {
        expect(evaluate(or(trueExpr, trueExpr, falseExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('true_true_error_isTrue', () => {
        expect(
          evaluate(or(trueExpr, trueExpr, errorFilterCondition()))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('true_true_true_isTrue', () => {
        expect(evaluate(or(trueExpr, trueExpr, trueExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('nested_or', () => {
        const child = or(trueExpr, falseExpr);
        const f = or(child, falseExpr);
        expect(evaluate(f)).to.deep.equal(TRUE_VALUE);
      });

      it('multipleArguments', () => {
        expect(evaluate(or(trueExpr, falseExpr, trueExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });
    }); // end describe('or')

    describe('xor', () => {
      it('false_false_isFalse', () => {
        expect(evaluate(xor(falseExpr, falseExpr))).to.deep.equal(FALSE_VALUE);
      });

      it('false_error_isError', () => {
        expect(evaluate(xor(falseExpr, errorFilterCondition()))).to.be
          .undefined;
      });

      it('false_true_isTrue', () => {
        expect(evaluate(xor(falseExpr, trueExpr))).to.deep.equal(TRUE_VALUE);
      });

      it('error_false_isError', () => {
        expect(evaluate(xor(errorFilterCondition(), falseExpr))).to.be
          .undefined;
      });

      it('error_error_isError', () => {
        expect(evaluate(xor(errorFilterCondition(), errorFilterCondition()))).to
          .be.undefined;
      });

      it('error_true_isError', () => {
        expect(evaluate(xor(errorFilterCondition(), trueExpr))).to.be.undefined;
      });

      it('true_false_isTrue', () => {
        expect(evaluate(xor(trueExpr, falseExpr))).to.deep.equal(TRUE_VALUE);
      });

      it('true_error_isError', () => {
        expect(evaluate(xor(trueExpr, errorFilterCondition()))).to.be.undefined;
      });

      it('true_true_isFalse', () => {
        expect(evaluate(xor(trueExpr, trueExpr))).to.deep.equal(FALSE_VALUE);
      });

      it('false_false_false_isFalse', () => {
        expect(evaluate(xor(falseExpr, falseExpr, falseExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('false_false_error_isError', () => {
        expect(evaluate(xor(falseExpr, falseExpr, errorFilterCondition()))).to
          .be.undefined;
      });

      it('false_false_true_isTrue', () => {
        expect(evaluate(xor(falseExpr, falseExpr, trueExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('false_error_false_isError', () => {
        expect(evaluate(xor(falseExpr, errorFilterCondition(), falseExpr))).to
          .be.undefined;
      });

      it('false_error_error_isError', () => {
        expect(
          evaluate(
            xor(falseExpr, errorFilterCondition(), errorFilterCondition())
          )
        ).to.be.undefined;
      });

      it('false_error_true_isError', () => {
        expect(evaluate(xor(falseExpr, errorFilterCondition(), trueExpr))).to.be
          .undefined;
      });

      it('false_true_false_isTrue', () => {
        expect(evaluate(xor(falseExpr, trueExpr, falseExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('false_true_error_isError', () => {
        expect(evaluate(xor(falseExpr, trueExpr, errorFilterCondition()))).to.be
          .undefined;
      });

      it('false_true_true_isFalse', () => {
        expect(evaluate(xor(falseExpr, trueExpr, trueExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('error_false_false_isError', () => {
        expect(evaluate(xor(errorFilterCondition(), falseExpr, falseExpr))).to
          .be.undefined;
      });

      it('error_false_error_isError', () => {
        expect(
          evaluate(
            xor(errorFilterCondition(), falseExpr, errorFilterCondition())
          )
        ).to.be.undefined;
      });

      it('error_false_true_isError', () => {
        expect(evaluate(xor(errorFilterCondition(), falseExpr, trueExpr))).to.be
          .undefined;
      });

      it('error_error_false_isError', () => {
        expect(
          evaluate(
            xor(errorFilterCondition(), errorFilterCondition(), falseExpr)
          )
        ).to.be.undefined;
      });

      it('error_error_error_isError', () => {
        expect(
          evaluate(
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
          evaluate(
            xor(errorFilterCondition(), errorFilterCondition(), trueExpr)
          )
        ).to.be.undefined;
      });

      it('error_true_false_isError', () => {
        expect(evaluate(xor(errorFilterCondition(), trueExpr, falseExpr))).to.be
          .undefined;
      });

      it('error_true_error_isError', () => {
        expect(
          evaluate(
            xor(errorFilterCondition(), trueExpr, errorFilterCondition())
          )
        ).to.be.undefined;
      });

      it('error_true_true_isError', () => {
        expect(evaluate(xor(errorFilterCondition(), trueExpr, trueExpr))).to.be
          .undefined;
      });

      it('true_false_false_isTrue', () => {
        expect(evaluate(xor(trueExpr, falseExpr, falseExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('true_false_error_isError', () => {
        expect(evaluate(xor(trueExpr, falseExpr, errorFilterCondition()))).to.be
          .undefined;
      });

      it('true_false_true_isFalse', () => {
        expect(evaluate(xor(trueExpr, falseExpr, trueExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('true_error_false_isError', () => {
        expect(evaluate(xor(trueExpr, errorFilterCondition(), falseExpr))).to.be
          .undefined;
      });

      it('true_error_error_isError', () => {
        expect(
          evaluate(
            xor(trueExpr, errorFilterCondition(), errorFilterCondition())
          )
        ).to.be.undefined;
      });

      it('true_error_true_isError', () => {
        expect(evaluate(xor(trueExpr, errorFilterCondition(), trueExpr))).to.be
          .undefined;
      });

      it('true_true_false_isFalse', () => {
        expect(evaluate(xor(trueExpr, trueExpr, falseExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('true_true_error_isError', () => {
        expect(evaluate(xor(trueExpr, trueExpr, errorFilterCondition()))).to.be
          .undefined;
      });

      it('true_true_true_isTrue', () => {
        expect(evaluate(xor(trueExpr, trueExpr, trueExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('nested_xor', () => {
        const child = xor(trueExpr, falseExpr);
        const f = xor(child, trueExpr);
        expect(evaluate(f)).to.deep.equal(FALSE_VALUE);
      });

      it('multipleArguments', () => {
        expect(evaluate(xor(trueExpr, falseExpr, trueExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });
    }); // end describe('xor')
  }); // end describe('Logical Functions')

  describe('Map Functions', () => {
    describe('mapGet', () => {
      it('get_existingKey_returnsValue', () => {
        const map = { a: 1, b: 2, c: 3 };
        expectEqual(evaluate(mapGet(constantMap(map), 'b')), constant(2));
      });

      it('get_missingKey_returnsUnset', () => {
        const map = { a: 1, b: 2, c: 3 };
        expect(evaluate(mapGet(constantMap(map), 'd'))).to.be.undefined;
      });

      it('get_emptyMap_returnsUnset', () => {
        const map = {};
        expect(evaluate(mapGet(constantMap(map), 'd'))).to.be.undefined;
      });

      it('get_wrongMapType_returnsError', () => {
        const map = 'not a map';
        expect(evaluate(mapGet(constant(map), 'd'))).to.be.undefined;
      });

      // it('get_wrongKeyType_returnsError', () => {
      //   const map = {a: 1, b: 2, c: 3};
      //   expect(evaluate(mapGet(constant(map), constant(42)))).to.be.undefined;
      // });
    }); // end describe('mapGet')
  });

  describe('String Functions', () => {
    describe('byteLength', () => {
      it('emptyString', () => {
        expectEqual(evaluate(byteLength(constant(''))), constant(0));
      });

      it('emptyByte', () => {
        expectEqual(
          evaluate(
            byteLength(constant(Bytes.fromUint8Array(new Uint8Array())))
          ),
          constant(0)
        );
      });

      it('nonStringOrBytes_returnsError', () => {
        expect(evaluate(byteLength(constant(123)))).to.be.undefined;
      });

      it('highSurrogateOnly', () => {
        const s = '\uD83C'; // high surrogate, missing low surrogate
        expect(evaluate(byteLength(constant(s)))).to.be.undefined;
      });

      it('lowSurrogateOnly', () => {
        const s = '\uDF53'; // low surrogate, missing high surrogate
        expect(evaluate(byteLength(constant(s)))).to.be.undefined;
      });

      it('lowAndHighSurrogate_swapped', () => {
        const s = '\uDF53\uD83C'; // swapped high with low, invalid sequence
        expect(evaluate(byteLength(constant(s)))).to.be.undefined;
      });

      it('ascii', () => {
        expectEqual(evaluate(byteLength(constant('abc'))), constant(3));
        expectEqual(evaluate(byteLength(constant('1234'))), constant(4));
        expectEqual(evaluate(byteLength(constant('abc123!@'))), constant(8));
      });

      it('largeString', () => {
        expectEqual(
          evaluate(byteLength(constant('a'.repeat(1500)))),
          constant(1500)
        );
        expectEqual(
          evaluate(byteLength(constant('ab'.repeat(1500)))),
          constant(3000)
        );
      });

      it('twoBytes_perCharacter', () => {
        expectEqual(evaluate(byteLength(constant('éçñöü'))), constant(10));
        expectEqual(
          evaluate(
            byteLength(
              constant(Bytes.fromUint8Array(new TextEncoder().encode('éçñöü')))
            )
          ),
          constant(10)
        );
      });

      it('threeBytes_perCharacter', () => {
        expectEqual(evaluate(byteLength(constant('你好世界'))), constant(12));
        expectEqual(
          evaluate(
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
        expectEqual(evaluate(byteLength(constant('🀘🂡'))), constant(8));
        expectEqual(
          evaluate(
            byteLength(
              constant(Bytes.fromUint8Array(new TextEncoder().encode('🀘🂡')))
            )
          ),
          constant(8)
        );
      });

      it('mixOfDifferentEncodedLengths', () => {
        expectEqual(evaluate(byteLength(constant('aé好🂡'))), constant(10));
        expectEqual(
          evaluate(
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
        expectEqual(evaluate(charLength(constant(''))), constant(0));
      });

      it('bytesType_returnsError', () => {
        expect(
          evaluate(
            charLength(
              constant(Bytes.fromUint8Array(new TextEncoder().encode('abc')))
            )
          )
        ).to.be.undefined;
      });

      it('baseCase_bmp', () => {
        expectEqual(evaluate(charLength(constant('abc'))), constant(3));
        expectEqual(evaluate(charLength(constant('1234'))), constant(4));
        expectEqual(evaluate(charLength(constant('abc123!@'))), constant(8));
        expectEqual(evaluate(charLength(constant('你好世界'))), constant(4));
        expectEqual(evaluate(charLength(constant('cafétéria'))), constant(9));
        expectEqual(evaluate(charLength(constant('абвгд'))), constant(5));
        expectEqual(
          evaluate(charLength(constant('¡Hola! ¿Cómo estás?'))),
          constant(19)
        );
        expectEqual(evaluate(charLength(constant('☺'))), constant(1));
      });

      it('spaces', () => {
        expectEqual(evaluate(charLength(constant(''))), constant(0));
        expectEqual(evaluate(charLength(constant(' '))), constant(1));
        expectEqual(evaluate(charLength(constant('  '))), constant(2));
        expectEqual(evaluate(charLength(constant('a b'))), constant(3));
      });

      it('specialCharacters', () => {
        expectEqual(evaluate(charLength(constant('\n'))), constant(1));
        expectEqual(evaluate(charLength(constant('\t'))), constant(1));
        expectEqual(evaluate(charLength(constant('\\'))), constant(1));
      });

      it('bmp_smp_mix', () => {
        const s = 'Hello\uD83D\uDE0A'; // Hello followed by emoji
        expectEqual(evaluate(charLength(constant(s))), constant(6));
      });

      it('smp', () => {
        const s = '\uD83C\uDF53\uD83C\uDF51'; // a strawberry and peach emoji
        expectEqual(evaluate(charLength(constant(s))), constant(2));
      });

      it('highSurrogateOnly', () => {
        const s = '\uD83C'; // high surrogate, missing low surrogate
        expectEqual(evaluate(charLength(constant(s))), constant(1));
      });

      it('lowSurrogateOnly', () => {
        const s = '\uDF53'; // low surrogate, missing high surrogate
        expectEqual(evaluate(charLength(constant(s))), constant(1));
      });

      it('lowAndHighSurrogate_swapped', () => {
        const s = '\uDF53\uD83C'; // swapped high with low, invalid sequence
        expectEqual(evaluate(charLength(constant(s))), constant(2));
      });

      it('largeString', () => {
        expectEqual(
          evaluate(charLength(constant('a'.repeat(1500)))),
          constant(1500)
        );
        expectEqual(
          evaluate(charLength(constant('ab'.repeat(1500)))),
          constant(3000)
        );
      });
    }); // end describe('charLength')

    describe('concat', () => {
      it('multipleStringChildren_returnsCombination', () => {
        expectEqual(
          evaluate(strConcat(constant('foo'), constant(' '), constant('bar'))),
          constant('foo bar'),
          `strConcat('foo', ' ', 'bar')`
        );
      });

      it('multipleNonStringChildren_returnsError', () => {
        expect(
          evaluate(strConcat(constant('foo'), constant(42), constant('bar')))
        ).to.be.undefined;
      });

      it('multipleCalls', () => {
        const func = strConcat(constant('foo'), constant(' '), constant('bar'));
        expectEqual(evaluate(func), constant('foo bar'), 'First call');
        expectEqual(evaluate(func), constant('foo bar'), 'Second call');
        expectEqual(evaluate(func), constant('foo bar'), 'Third call');
      });

      it('largeNumberOfInputs', () => {
        const args = [];
        for (let i = 0; i < 500; i++) {
          args.push(constant('a'));
        }
        expectEqual(
          evaluate(strConcat(args[0], args[1], ...args.slice(2))),
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
          evaluate(func),
          constant('a'.repeat(500) + 'b'.repeat(500) + 'c'.repeat(500))
        );
      });
    }); // end describe('concat')

    describe('endsWith', () => {
      it('get_nonStringValue_isError', () => {
        expect(evaluate(endsWith(constant(42), constant('search')))).to.be
          .undefined;
      });

      it('get_nonStringSuffix_isError', () => {
        expect(evaluate(endsWith(constant('search'), constant(42)))).to.be
          .undefined;
      });

      it('get_emptyInputs_returnsTrue', () => {
        expect(evaluate(endsWith(constant(''), constant('')))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('get_emptyValue_returnsFalse', () => {
        expect(evaluate(endsWith(constant(''), constant('v')))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('get_emptySuffix_returnsTrue', () => {
        expect(
          evaluate(endsWith(constant('value'), constant('')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('get_returnsTrue', () => {
        expect(
          evaluate(endsWith(constant('search'), constant('rch')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('get_returnsFalse', () => {
        expect(
          evaluate(endsWith(constant('search'), constant('rcH')))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('get_largeSuffix_returnsFalse', () => {
        expect(
          evaluate(endsWith(constant('val'), constant('a very long suffix')))
        ).to.deep.equal(FALSE_VALUE);
      });
    }); // end describe('endsWith')

    describe('like', () => {
      it('get_nonStringLike_isError', () => {
        expect(evaluate(like(constant(42), constant('search')))).to.be
          .undefined;
      });

      it('get_nonStringValue_isError', () => {
        expect(evaluate(like(constant('ear'), constant(42)))).to.be.undefined;
      });

      it('get_staticLike', () => {
        const func = like(constant('yummy food'), constant('%food'));
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_emptySearchString', () => {
        const func = like(constant(''), constant('%hi%'));
        expect(evaluate(func)).to.deep.equal(FALSE_VALUE);
      });

      it('get_emptyLike', () => {
        const func = like(constant('yummy food'), constant(''));
        expect(evaluate(func)).to.deep.equal(FALSE_VALUE);
      });

      it('get_escapedLike', () => {
        const func = like(constant('yummy food??'), constant('%food??'));
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_dynamicLike', () => {
        const func = like(constant('yummy food'), field('regex'));
        expect(evaluate(func, { regex: 'yummy%' })).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func, { regex: 'food%' })).to.deep.equal(FALSE_VALUE);
        expect(evaluate(func, { regex: 'yummy_food' })).to.deep.equal(
          TRUE_VALUE
        );
      });
    }); // end describe('like')

    describe('regexContains', () => {
      it('get_nonStringRegex_isError', () => {
        expect(evaluate(regexContains(constant(42), constant('search')))).to.be
          .undefined;
      });

      it('get_nonStringValue_isError', () => {
        expect(evaluate(regexContains(constant('ear'), constant(42)))).to.be
          .undefined;
      });

      it('get_invalidRegex_isError', () => {
        const func = regexContains(constant('abcabc'), constant('(abc)\\1'));
        expect(evaluate(func)).to.be.undefined;
        expect(evaluate(func)).to.be.undefined;
        expect(evaluate(func)).to.be.undefined;
      });

      it('get_staticRegex', () => {
        const func = regexContains(constant('yummy food'), constant('.*oo.*'));
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_subString_literal', () => {
        const func = regexContains(
          constant('yummy good food'),
          constant('good')
        );
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_subString_regex', () => {
        const func = regexContains(
          constant('yummy good food'),
          constant('go*d')
        );
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_dynamicRegex', () => {
        const func = regexContains(constant('yummy food'), field('regex'));
        expect(evaluate(func, { regex: '^yummy.*' })).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func, { regex: 'fooood$' })).to.deep.equal(FALSE_VALUE);
        expect(evaluate(func, { regex: '.*' })).to.deep.equal(TRUE_VALUE);
      });
    }); // end describe('regexContains')

    describe('regexMatch', () => {
      it('get_nonStringRegex_isError', () => {
        expect(evaluate(regexMatch(constant(42), constant('search')))).to.be
          .undefined;
      });

      it('get_nonStringValue_isError', () => {
        expect(evaluate(regexMatch(constant('ear'), constant(42)))).to.be
          .undefined;
      });

      it('get_invalidRegex_isError', () => {
        const func = regexMatch(constant('abcabc'), constant('(abc)\\1'));
        expect(evaluate(func)).to.be.undefined;
        expect(evaluate(func)).to.be.undefined;
        expect(evaluate(func)).to.be.undefined;
      });

      it('get_staticRegex', () => {
        const func = regexMatch(constant('yummy food'), constant('.*oo.*'));
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_subString_literal', () => {
        const func = regexMatch(constant('yummy good food'), constant('good'));
        expect(evaluate(func)).to.deep.equal(FALSE_VALUE);
      });

      it('get_subString_regex', () => {
        const func = regexMatch(constant('yummy good food'), constant('go*d'));
        expect(evaluate(func)).to.deep.equal(FALSE_VALUE);
      });

      it('get_dynamicRegex', () => {
        const func = regexMatch(constant('yummy food'), field('regex'));
        expect(evaluate(func, { regex: '^yummy.*' })).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func, { regex: 'fooood$' })).to.deep.equal(FALSE_VALUE);
        expect(evaluate(func, { regex: '.*' })).to.deep.equal(TRUE_VALUE);
      });
    }); // end describe('regexMatch')

    describe('startsWith', () => {
      it('get_nonStringValue_isError', () => {
        expect(evaluate(startsWith(constant(42), constant('search')))).to.be
          .undefined;
      });

      it('get_nonStringPrefix_isError', () => {
        expect(evaluate(startsWith(constant('search'), constant(42)))).to.be
          .undefined;
      });

      it('get_emptyInputs_returnsTrue', () => {
        expect(evaluate(startsWith(constant(''), constant('')))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('get_emptyValue_returnsFalse', () => {
        expect(evaluate(startsWith(constant(''), constant('v')))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('get_emptyPrefix_returnsTrue', () => {
        expect(
          evaluate(startsWith(constant('value'), constant('')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('get_returnsTrue', () => {
        expect(
          evaluate(startsWith(constant('search'), constant('sea')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('get_returnsFalse', () => {
        expect(
          evaluate(startsWith(constant('search'), constant('Sea')))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('get_largePrefix_returnsFalse', () => {
        expect(
          evaluate(startsWith(constant('val'), constant('a very long prefix')))
        ).to.deep.equal(FALSE_VALUE);
      });
    }); // end describe('startsWith')

    describe('strContains', () => {
      it('value_nonString_isError', () => {
        expect(evaluate(strContains(constant(42), constant('value')))).to.be
          .undefined;
      });

      it('subString_nonString_isError', () => {
        expect(evaluate(strContains(constant('search space'), constant(42)))).to
          .be.undefined;
      });

      it('execute_true', () => {
        expect(
          evaluate(strContains(constant('abc'), constant('c')))
        ).to.deep.equal(TRUE_VALUE);
        expect(
          evaluate(strContains(constant('abc'), constant('bc')))
        ).to.deep.equal(TRUE_VALUE);
        expect(
          evaluate(strContains(constant('abc'), constant('abc')))
        ).to.deep.equal(TRUE_VALUE);
        expect(
          evaluate(strContains(constant('abc'), constant('')))
        ).to.deep.equal(TRUE_VALUE);
        expect(evaluate(strContains(constant(''), constant('')))).to.deep.equal(
          TRUE_VALUE
        );
        expect(
          evaluate(strContains(constant('☃☃☃'), constant('☃')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('execute_false', () => {
        expect(
          evaluate(strContains(constant('abc'), constant('abcd')))
        ).to.deep.equal(FALSE_VALUE);
        expect(
          evaluate(strContains(constant('abc'), constant('d')))
        ).to.deep.equal(FALSE_VALUE);
        expect(
          evaluate(strContains(constant(''), constant('a')))
        ).to.deep.equal(FALSE_VALUE);
        expect(
          evaluate(strContains(constant(''), constant('abcde')))
        ).to.deep.equal(FALSE_VALUE);
      });
    }); // end describe('strContains')
  }); // end describe('String Functions')

  describe('Vector Functions', () => {
    describe('cosineDistance', () => {
      it('cosineDistance', () => {
        expect(
          evaluate(
            cosineDistance(
              constant(new VectorValue([0.0, 1.0])),
              constant(new VectorValue([5.0, 100.0]))
            )
          )?.doubleValue
        ).to.be.closeTo(0.0012476611221553524, 1e-10); // Use closeTo for floating-point comparison
      });

      it('zeroVector_returnsError', () => {
        expect(
          evaluate(
            cosineDistance(
              constant(new VectorValue([0.0, 0.0])),
              constant(new VectorValue([5.0, 100.0]))
            )
          )
        ).to.be.undefined;
      });

      it('emptyVectors_returnsError', () => {
        expect(
          evaluate(
            cosineDistance(
              constant(new VectorValue([])),
              constant(new VectorValue([]))
            )
          )
        ).to.be.undefined;
      });

      it('differentVectorLengths_returnError', () => {
        expect(
          evaluate(
            cosineDistance(
              constant(new VectorValue([1.0])),
              constant(new VectorValue([2.0, 3.0]))
            )
          )
        ).to.be.undefined;
      });

      it('wrongInputType_returnError', () => {
        expect(
          evaluate(
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
          evaluate(
            dotProduct(
              constant(new VectorValue([2.0, 1.0])),
              constant(new VectorValue([1.0, 5.0]))
            )
          )!.doubleValue
        ).to.equal(7.0);
      });

      it('orthogonalVectors', () => {
        expect(
          evaluate(
            dotProduct(
              constant(new VectorValue([1.0, 0.0])),
              constant(new VectorValue([0.0, 5.0]))
            )
          )?.doubleValue
        ).to.deep.equal(0.0);
      });

      it('zeroVector_returnsZero', () => {
        expect(
          evaluate(
            dotProduct(
              constant(new VectorValue([0.0, 0.0])),
              constant(new VectorValue([5.0, 100.0]))
            )
          )?.doubleValue
        ).to.equal(0.0);
      });

      it('emptyVectors_returnsZero', () => {
        expect(
          evaluate(
            dotProduct(
              constant(new VectorValue([])),
              constant(new VectorValue([]))
            )
          )?.doubleValue
        ).to.equal(0.0);
      });

      it('differentVectorLengths_returnError', () => {
        expect(
          evaluate(
            dotProduct(
              constant(new VectorValue([1.0])),
              constant(new VectorValue([2.0, 3.0]))
            )
          )
        ).to.be.undefined;
      });

      it('wrongInputType_returnError', () => {
        expect(
          evaluate(
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
          evaluate(
            euclideanDistance(
              constant(new VectorValue([0.0, 0.0])),
              constant(new VectorValue([3.0, 4.0]))
            )
          )?.doubleValue
        ).to.equal(5.0);
      });

      it('zeroVector', () => {
        expect(
          evaluate(
            euclideanDistance(
              constant(new VectorValue([0.0, 0.0])),
              constant(new VectorValue([0.0, 0.0]))
            )
          )?.doubleValue
        ).to.equal(0.0);
      });

      it('emptyVectors', () => {
        expect(
          evaluate(
            euclideanDistance(
              constant(new VectorValue([])),
              constant(new VectorValue([]))
            )
          )?.doubleValue
        ).to.equal(0.0);
      });

      it('differentVectorLengths_returnError', () => {
        expect(
          evaluate(
            euclideanDistance(
              constant(new VectorValue([1.0])),
              constant(new VectorValue([2.0, 3.0]))
            )
          )
        ).to.be.undefined;
      });

      it('wrongInputType_returnError', () => {
        expect(
          evaluate(
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
          evaluate(vectorLength(constant(new VectorValue([0.0, 1.0])))),
          constant(2)
        );
      });

      it('emptyVector', () => {
        expectEqual(
          evaluate(vectorLength(constant(new VectorValue([])))),
          constant(0)
        );
      });

      it('zeroVector', () => {
        expectEqual(
          evaluate(vectorLength(constant(new VectorValue([0.0])))),
          constant(1)
        );
      });

      it('notVectorType_returnsError', () => {
        expect(evaluate(vectorLength(constantArray([1])))).to.be.undefined;
        expect(evaluate(vectorLength(constant('notAnArray')))).to.be.undefined;
      });
    }); // end describe('vectorLength')
  }); // end describe('Vector Functions')
});
