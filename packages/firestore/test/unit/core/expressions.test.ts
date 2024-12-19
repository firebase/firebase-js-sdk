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
  add,
  arrayContains,
  arrayContainsAll,
  arrayContainsAny,
  arrayLength,
  byteLength,
  Bytes,
  charLength,
  cond,
  Constant,
  cosineDistance,
  divide,
  doc as docRef,
  dotProduct,
  endsWith,
  eq,
  eqAny,
  euclideanDistance,
  Field,
  FilterExpr,
  FirestoreFunction,
  GeoPoint,
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
  regexContains,
  regexMatch,
  startsWith,
  strConcat,
  strContains,
  subtract,
  Timestamp,
  useFluentPipelines,
  vectorLength,
  VectorValue,
  xor
} from '../../../src';

import { doc } from '../../util/helpers';
import {
  andFunction,
  arrayReverse,
  Expr,
  orFunction
} from '../../../src/lite-api/expressions';
import { newTestFirestore } from '../../util/api_helpers';
import { canonifyPipeline } from '../../util/pipelines';
import { newUserDataReader } from '../../../src/lite-api/user_data_reader';
import {
  FALSE_VALUE,
  TRUE_VALUE,
  typeOrder,
  valueEquals
} from '../../../src/model/values';
import { LongMaxValue, toEvaluable } from '../../../src/core/expressions';
import { Value } from '../../../src/protos/firestore_proto_api';
import { canonifyExpr } from '../../../src/core/pipeline-util';
import { JsonObject, ObjectValue } from '../../../src/model/object_value';

const db = newTestFirestore();
const ERROR_VALUE = undefined;
const falseExpr = Constant.of(1).eq(2);
const trueExpr = Constant.of(1).eq(1);

function isTypeComparable(left: Constant, right: Constant): boolean {
  left._readUserData(newUserDataReader(db));
  right._readUserData(newUserDataReader(db));

  return typeOrder(left._getValue()) === typeOrder(right._getValue());
}

class ComparisonValueTestData {
  static BOOLEAN_VALUES = [Constant.of(false), Constant.of(true)];

  static NUMERIC_VALUES = [
    Constant.of(Number.NEGATIVE_INFINITY),
    Constant.of(-Number.MAX_VALUE),
    Constant.of(Number.MIN_SAFE_INTEGER),
    Constant.of(-9007199254740990),
    Constant.of(-1),
    Constant.of(-0.5),
    Constant.of(-Number.MIN_VALUE),
    Constant.of(0),
    Constant.of(Number.MIN_VALUE),
    Constant.of(0.5),
    Constant.of(1),
    Constant.of(42),
    Constant.of(9007199254740990),
    Constant.of(Number.MAX_SAFE_INTEGER),
    Constant.of(Number.MAX_VALUE),
    Constant.of(Number.POSITIVE_INFINITY)
  ];

  static TIMESTAMP_VALUES = [
    Constant.of(new Timestamp(-42, 0)), // -42 seconds from epoch
    Constant.of(new Timestamp(-42, 42000)), // -42 seconds + 42 milliseconds (42000 microseconds) from epoch
    Constant.of(new Timestamp(0, 0)), // Epoch
    Constant.of(new Timestamp(0, 42000)), // 42 milliseconds from epoch
    Constant.of(new Timestamp(42, 0)), // 42 seconds from epoch
    Constant.of(new Timestamp(42, 42000)) // 42 seconds + 42 milliseconds from epoch
  ];

  static STRING_VALUES = [
    Constant.of(''),
    Constant.of('abcdefgh'),
    Constant.of('fouxdufafa'.repeat(200)),
    Constant.of('santé'),
    Constant.of('santé et bonheur')
  ];

  static BYTE_VALUES = [
    Constant.of(Bytes.fromUint8Array(new Uint8Array([]))), // Empty byte array
    Constant.of(Bytes.fromUint8Array(new Uint8Array([0, 2, 56, 42]))),
    Constant.of(Bytes.fromUint8Array(new Uint8Array([2, 26]))),
    Constant.of(Bytes.fromUint8Array(new Uint8Array([2, 26, 31]))),
    Constant.of(
      Bytes.fromUint8Array(new TextEncoder().encode('fouxdufafa'.repeat(200)))
    ) // Encode string to Uint8Array
  ];

  static ENTITY_REF_VALUES = [
    Constant.of(docRef(db, 'foo', 'bar')),
    Constant.of(docRef(db, 'foo', 'bar', 'qux/a')),
    Constant.of(docRef(db, 'foo', 'bar', 'qux', 'bleh')),
    Constant.of(docRef(db, 'foo', 'bar', 'qux', 'hi')),
    Constant.of(docRef(db, 'foo', 'bar', 'tonk/a')),
    Constant.of(docRef(db, 'foo', 'baz'))
  ];

  static GEO_VALUES = [
    Constant.of(new GeoPoint(-87.0, -92.0)),
    Constant.of(new GeoPoint(-87.0, 0.0)),
    Constant.of(new GeoPoint(-87.0, 42.0)),
    Constant.of(new GeoPoint(0.0, -92.0)),
    Constant.of(new GeoPoint(0.0, 0.0)),
    Constant.of(new GeoPoint(0.0, 42.0)),
    Constant.of(new GeoPoint(42.0, -92.0)),
    Constant.of(new GeoPoint(42.0, 0.0)),
    Constant.of(new GeoPoint(42.0, 42.0))
  ];

  static ARRAY_VALUES = [
    Constant.of([]),
    Constant.of([null]),
    Constant.of([null, NaN]),
    Constant.of([null, 1]),
    Constant.of([true, 15]),
    Constant.of([true, 15, null]),
    Constant.of([NaN]),
    Constant.of([NaN, 'foo']),
    Constant.of([1, 2]),
    Constant.of([new Timestamp(12, 0)]),
    Constant.of(['foo']),
    Constant.of(['foo', 'bar']),
    Constant.of([new GeoPoint(0, 0)]),
    Constant.of([{}])
  ];

  static VECTOR_VALUES = [
    Constant.of(new VectorValue([42.0])),
    Constant.of(new VectorValue([21.2, 3.14])),
    Constant.of(new VectorValue([Number.NEGATIVE_INFINITY, 10.0, 1.0])),
    Constant.of(new VectorValue([-Number.MAX_VALUE, 9.0, 1.0])),
    Constant.of(new VectorValue([-Number.MIN_VALUE, 7.0, 1.0])),
    Constant.of(new VectorValue([-Number.MIN_VALUE, 8.0, 1.0])),
    Constant.of(new VectorValue([0.0, 5.0, 1.0])),
    Constant.of(new VectorValue([0.0, 6.0, 1.0])),
    Constant.of(new VectorValue([Number.MIN_VALUE, 3.0, 1.0])),
    Constant.of(new VectorValue([Number.MIN_VALUE, 4.0, 1.0])),
    Constant.of(new VectorValue([Number.MAX_VALUE, 2.0, 1.0])),
    Constant.of(new VectorValue([Number.POSITIVE_INFINITY, 1.0, 1.0]))
  ];

  static MAP_VALUES = [
    Constant.of({}),
    Constant.of({ ABA: 'qux' } as any),
    Constant.of({ aba: 'hello' } as any),
    Constant.of({ aba: 'hello', foo: true } as any),
    Constant.of({ aba: 'qux' } as any),
    Constant.of({ foo: 'aaa' } as any)
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
      { left: Constant.of(-42), right: Constant.of(-42.0) },
      { left: Constant.of(-42.0), right: Constant.of(-42) },
      { left: Constant.of(42), right: Constant.of(42.0) },
      { left: Constant.of(42.0), right: Constant.of(42) },

      { left: Constant.of(0), right: Constant.of(-0) },
      { left: Constant.of(-0), right: Constant.of(0) },

      { left: Constant.of(0), right: Constant.of(0.0) },
      { left: Constant.of(0.0), right: Constant.of(0) },

      { left: Constant.of(0), right: Constant.of(-0.0) },
      { left: Constant.of(-0.0), right: Constant.of(0) },

      { left: Constant.of(-0), right: Constant.of(0.0) },
      { left: Constant.of(0.0), right: Constant.of(-0) },

      { left: Constant.of(-0), right: Constant.of(-0.0) },
      { left: Constant.of(-0.0), right: Constant.of(-0) },

      { left: Constant.of(0.0), right: Constant.of(-0.0) },
      { left: Constant.of(-0.0), right: Constant.of(0.0) }
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
  return Field.of('not-an-array').arrayLength();
}

function errorFilterExpr(): FilterExpr {
  return Field.of('not-an-array').gt(0);
}

describe.only('Comparison Expressions', () => {
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
          evaluate(eq(Constant.of(null), v)),
          `eq(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(FALSE_VALUE);
        expect(
          evaluate(eq(v, Constant.of(null))),
          `eq(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_null_returnsTrue', () => {
      expect(
        evaluate(eq(Constant.of(null), Constant.of(null)))
      ).to.be.deep.equal(TRUE_VALUE);
    });

    it('Null and missing evaluates to undefined (error)', () => {
      expect(evaluate(eq(Constant.of(null), Field.of('not-exist')))).to.be
        .undefined;
    });

    it('nullInArray_equality', () => {
      expect(
        evaluate(eq(Constant.of([null]), Constant.of(1)))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluate(eq(Constant.of([null]), Constant.of('1')))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluate(eq(Constant.of([null]), Constant.of(null)))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluate(eq(Constant.of([null]), Constant.of(NaN)))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluate(eq(Constant.of([null]), Constant.of([])))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluate(eq(Constant.of([null]), Constant.of([NaN])))
      ).to.be.deep.equal(FALSE_VALUE);
      expect(
        evaluate(eq(Constant.of([null]), Constant.of([null])))
      ).to.be.deep.equal(TRUE_VALUE);
    });

    // TODO(pipeline): Constant.of(Map) is being rejected at runtime
    it.skip('nullInMap_equality_returnsTrue', () => {
      expect(
        evaluate(
          eq(
            Constant.of(new Map<string, any>([['foo', null]])),
            Constant.of(new Map<string, any>([['foo', null]]))
          )
        )
      ).to.be.deep.equal(TRUE_VALUE);
    });

    it.skip('null_missingInMap_equality_returnsFalse', () => {
      expect(
        evaluate(
          eq(
            Constant.of(new Map<string, any>([['foo', null]])),
            Constant.of(new Map<string, any>([['foo', null]]))
          )
        )
      ).to.be.deep.equal(FALSE_VALUE);
    });

    // ... NaN tests (similar pattern as null tests)
    it('nan_number_returnsFalse', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(evaluate(eq(Constant.of(NaN), v))).to.be.deep.equal(FALSE_VALUE);
        expect(evaluate(eq(v, Constant.of(NaN)))).to.be.deep.equal(FALSE_VALUE);
      });
    });

    describe('NaN tests', () => {
      it('nan_number_returnsFalse', () => {
        ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
          expect(
            evaluate(eq(Constant.of(NaN), v)),
            `eq(NaN, ${canonifyExpr(v)})`
          ).to.be.deep.equal(FALSE_VALUE);
          expect(
            evaluate(eq(v, Constant.of(NaN))),
            `eq(${canonifyExpr(v)}, NaN)`
          ).to.be.deep.equal(FALSE_VALUE);
        });
      });

      it('nan_nan_returnsFalse', () => {
        expect(
          evaluate(eq(Constant.of(NaN), Constant.of(NaN)))
        ).to.be.deep.equal(FALSE_VALUE);
      });

      it('nan_otherType_returnsFalse', () => {
        ComparisonValueTestData.ALL_SUPPORTED_COMPARABLE_VALUES.forEach(v => {
          // Exclude numeric values as they are already tested above
          if (!ComparisonValueTestData.NUMERIC_VALUES.includes(v)) {
            expect(
              evaluate(eq(Constant.of(NaN), v)),
              `eq(NaN, ${canonifyExpr(v)})`
            ).to.be.deep.equal(FALSE_VALUE);
            expect(
              evaluate(eq(v, Constant.of(NaN))),
              `eq(${canonifyExpr(v)}, NaN)`
            ).to.be.deep.equal(FALSE_VALUE);
          }
        });
      });

      it('nanInArray_equality_returnsFalse', () => {
        expect(
          evaluate(eq(Constant.of([NaN]), Constant.of([NaN])))
        ).to.be.deep.equal(FALSE_VALUE);
      });

      it.skip('nanInMap_equality_returnsFalse', () => {
        expect(
          evaluate(
            eq(
              Constant.of(new Map<string, any>([['foo', NaN]])),
              Constant.of(new Map<string, any>([['foo', NaN]]))
            )
          )
        ).to.be.deep.equal(FALSE_VALUE);
      });
    }); // end describe NaN tests

    describe('Array tests', () => {
      it('array_ambiguousNumerics', () => {
        expect(
          evaluate(eq(Constant.of([1]), Constant.of([1.0])))
        ).to.be.deep.equal(TRUE_VALUE);
      });
    });

    describe.skip('Map tests', () => {
      it('map_ambiguousNumerics', () => {
        expect(
          evaluate(
            eq(
              Constant.of(
                new Map<string, any>([
                  ['foo', 1],
                  ['bar', 42.0]
                ])
              ),
              Constant.of(
                new Map<string, any>([
                  ['bar', 42],
                  ['foo', 1.0]
                ])
              )
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
        expect(evaluate(eq(errorExpr(), Constant.of(null)))).to.be.deep.equal(
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
          evaluate(gte(Constant.of(null), v)),
          `gte(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(FALSE_VALUE);
        expect(
          evaluate(gte(v, Constant.of(null))),
          `gte(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_null_returnsTrue', () => {
      expect(
        evaluate(gte(Constant.of(null), Constant.of(null)))
      ).to.be.deep.equal(TRUE_VALUE);
    });

    it('nan_number_returnsFalse', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(
          evaluate(gte(Constant.of(NaN), v)),
          `gte(NaN, ${canonifyExpr(v)})`
        ).to.be.deep.equal(FALSE_VALUE);
        expect(
          evaluate(gte(v, Constant.of(NaN))),
          `gte(${canonifyExpr(v)}, NaN)`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('nan_nan_returnsFalse', () => {
      expect(
        evaluate(gte(Constant.of(NaN), Constant.of(NaN)))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('nanInArray_returnsFalse', () => {
      expect(
        evaluate(gte(Constant.of([NaN]), Constant.of([NaN])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      // Adapt as needed for references
      expect(evaluate(gte(Field.of('not-exist'), Constant.of(1)))).to.be
        .undefined; // Or appropriate error handling
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
          evaluate(gt(Constant.of(null), v)),
          `gt(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(FALSE_VALUE);
        expect(
          evaluate(gt(v, Constant.of(null))),
          `gt(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_null_returnsFalse', () => {
      expect(
        evaluate(gt(Constant.of(null), Constant.of(null)))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('nan_number_returnsFalse', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(evaluate(gt(Constant.of(NaN), v))).to.be.deep.equal(FALSE_VALUE);
        expect(evaluate(gt(v, Constant.of(NaN)))).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('nan_nan_returnsFalse', () => {
      expect(evaluate(gt(Constant.of(NaN), Constant.of(NaN)))).to.be.deep.equal(
        FALSE_VALUE
      );
    });

    it('nanInArray_returnsFalse', () => {
      expect(
        evaluate(gt(Constant.of([NaN]), Constant.of([NaN])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      // Adapt as needed for references
      expect(evaluate(gt(Field.of('not-exist'), Constant.of(1)))).to.be
        .undefined; // Or appropriate error handling
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
          evaluate(lte(Constant.of(null), v)),
          `lte(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(FALSE_VALUE);
        expect(
          evaluate(lte(v, Constant.of(null))),
          `lte(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_null_returnsTrue', () => {
      expect(
        evaluate(lte(Constant.of(null), Constant.of(null)))
      ).to.be.deep.equal(TRUE_VALUE);
    });

    it('nan_number_returnsFalse', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(evaluate(lte(Constant.of(NaN), v))).to.be.deep.equal(
          FALSE_VALUE
        );
        expect(evaluate(lte(v, Constant.of(NaN)))).to.be.deep.equal(
          FALSE_VALUE
        );
      });
    });

    it('nan_nan_returnsFalse', () => {
      expect(
        evaluate(lte(Constant.of(NaN), Constant.of(NaN)))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('nanInArray_returnsFalse', () => {
      expect(
        evaluate(lte(Constant.of([NaN]), Constant.of([NaN])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      // Adapt as needed for references
      expect(evaluate(lte(Field.of('not-exist'), Constant.of(1)))).to.be
        .undefined; // Or appropriate error handling
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
          evaluate(lt(Constant.of(null), v)),
          `lt(null, ${canonifyExpr(v)})`
        ).to.be.deep.equal(FALSE_VALUE);
        expect(
          evaluate(lt(v, Constant.of(null))),
          `lt(${canonifyExpr(v)}, null)`
        ).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('null_null_returnsFalse', () => {
      expect(
        evaluate(lt(Constant.of(null), Constant.of(null)))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('nan_number_returnsFalse', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(evaluate(lt(Constant.of(NaN), v))).to.be.deep.equal(FALSE_VALUE);
        expect(evaluate(lt(v, Constant.of(NaN)))).to.be.deep.equal(FALSE_VALUE);
      });
    });

    it('nan_nan_returnsFalse', () => {
      expect(evaluate(lt(Constant.of(NaN), Constant.of(NaN)))).to.be.deep.equal(
        FALSE_VALUE
      );
    });

    it('nanInArray_returnsFalse', () => {
      expect(
        evaluate(lt(Constant.of([NaN]), Constant.of([NaN])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      // Adapt as needed for references
      expect(evaluate(lt(Field.of('not-exist'), Constant.of(1)))).to.be
        .undefined; // Or appropriate error handling
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
      expect(
        evaluate(neq(Constant.of(null), Constant.of(42)))
      ).to.be.deep.equal(TRUE_VALUE);
      expect(
        evaluate(neq(Constant.of(null), Constant.of('matang')))
      ).to.be.deep.equal(TRUE_VALUE);
      expect(
        evaluate(neq(Constant.of(null), Constant.of(true)))
      ).to.be.deep.equal(TRUE_VALUE);
    });

    it('null_null_returnsFalse', () => {
      expect(
        evaluate(neq(Constant.of(null), Constant.of(null)))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('nan_number_returnsTrue', () => {
      ComparisonValueTestData.NUMERIC_VALUES.forEach(v => {
        expect(evaluate(neq(Constant.of(NaN), v))).to.be.deep.equal(TRUE_VALUE);
        expect(evaluate(neq(v, Constant.of(NaN)))).to.be.deep.equal(TRUE_VALUE);
      });
    });

    it('nan_nan_returnsTrue', () => {
      expect(
        evaluate(neq(Constant.of(NaN), Constant.of(NaN)))
      ).to.be.deep.equal(TRUE_VALUE);
    });

    it.skip('map_ambiguousNumerics', () => {
      expect(
        evaluate(
          neq(
            Constant.of(
              new Map<string, any>([
                ['foo', 1],
                ['bar', 42.0]
              ])
            ),
            Constant.of(
              new Map<string, any>([
                ['foo', 1.0],
                ['bar', 42]
              ])
            )
          )
        )
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('array_ambiguousNumerics', () => {
      expect(
        evaluate(neq(Constant.of([1]), Constant.of([1.0])))
      ).to.be.deep.equal(FALSE_VALUE);
    });

    it('referenceFieldNotFound_returnsError', () => {
      expect(evaluate(neq(Field.of('not-exist'), Constant.of(1)))).to.be
        .undefined; // Or appropriate error handling
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

describe.only('Expressions', () => {
  describe('Arithmetic Expressions', () => {
    describe('add', () => {
      it('basic_add_numerics', () => {
        expectEqual(
          evaluate(add(Constant.of(1), Constant.of(2))),
          Constant.of(3),
          `add(1, 2)`
        );
        expectEqual(
          evaluate(add(Constant.of(1), Constant.of(2.5))),
          Constant.of(3.5),
          `add(1, 2.5)`
        );
        expectEqual(
          evaluate(add(Constant.of(1.0), Constant.of(2))),
          Constant.of(3.0),
          `add(1.0, 2)`
        );
        expectEqual(
          evaluate(add(Constant.of(1.0), Constant.of(2.0))),
          Constant.of(3.0),
          `add(1.0, 2.0)`
        );
      });

      it('basic_add_nonNumerics', () => {
        expect(evaluate(add(Constant.of(1), Constant.of('1')))).to.be.undefined;
        expect(evaluate(add(Constant.of('1'), Constant.of(1.0)))).to.be
          .undefined;
        expect(evaluate(add(Constant.of('1'), Constant.of('1')))).to.be
          .undefined;
      });

      it('doubleLongAddition_overflow', () => {
        expectEqual(
          evaluate(add(Constant.of(9223372036854775807), Constant.of(1.0))),
          Constant.of(9.223372036854776e18),
          `add(Long.MAX_VALUE, 1.0)`
        );
        expectEqual(
          evaluate(add(Constant.of(9223372036854775807.0), Constant.of(100))),
          Constant.of(9.223372036854776e18),
          `add(Long.MAX_VALUE as double, 100)`
        );
      });

      it('doubleAddition_overflow', () => {
        expectEqual(
          evaluate(
            add(Constant.of(Number.MAX_VALUE), Constant.of(Number.MAX_VALUE))
          ),
          Constant.of(Number.POSITIVE_INFINITY),
          `add(Number.MAX_VALUE, Number.MAX_VALUE)`
        );
        expectEqual(
          evaluate(
            add(Constant.of(-Number.MAX_VALUE), Constant.of(-Number.MAX_VALUE))
          ),
          Constant.of(Number.NEGATIVE_INFINITY),
          `add(-Number.MAX_VALUE, -Number.MAX_VALUE)`
        );
      });

      it('sumPosAndNegInfinity_returnNaN', () => {
        expectEqual(
          evaluate(
            add(
              Constant.of(Number.POSITIVE_INFINITY),
              Constant.of(Number.NEGATIVE_INFINITY)
            )
          ),
          Constant.of(NaN),
          `add(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)`
        );
      });

      // TODO(pipeline): It is not possible to do long overflow in javascript because
      // the number will be converted to double by UserDataReader first.
      it.skip('longAddition_overflow', () => {
        expect(
          evaluate(
            add(
              Constant.of(0x7fffffffffffffff, { preferIntegers: true }),
              Constant.of(1)
            )
          )
        ).to.be.undefined;
        expect(
          evaluate(
            add(
              Constant.of(0x8000000000000000, { preferIntegers: true }),
              Constant.of(-1)
            )
          )
        ).to.be.undefined;
        expect(
          evaluate(
            add(
              Constant.of(1),
              Constant.of(0x7fffffffffffffff, { preferIntegers: true })
            )
          )
        ).to.be.undefined;
      });

      it('nan_number_returnNaN', () => {
        expectEqual(
          evaluate(add(Constant.of(1), Constant.of(NaN))),
          Constant.of(NaN),
          `add(1, NaN)`
        );
        expectEqual(
          evaluate(add(Constant.of(1.0), Constant.of(NaN))),
          Constant.of(NaN),
          `add(1.0, NaN)`
        );
        expectEqual(
          evaluate(add(Constant.of(Number.MAX_SAFE_INTEGER), Constant.of(NaN))),
          Constant.of(NaN),
          `add(Number.MAX_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(add(Constant.of(Number.MIN_SAFE_INTEGER), Constant.of(NaN))),
          Constant.of(NaN),
          `add(Number.MIN_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(add(Constant.of(Number.MAX_VALUE), Constant.of(NaN))),
          Constant.of(NaN),
          `add(Number.MAX_VALUE, NaN)`
        );
        expectEqual(
          evaluate(add(Constant.of(Number.MIN_VALUE), Constant.of(NaN))),
          Constant.of(NaN),
          `add(Number.MIN_VALUE, NaN)`
        );
        expectEqual(
          evaluate(
            add(Constant.of(Number.POSITIVE_INFINITY), Constant.of(NaN))
          ),
          Constant.of(NaN),
          `add(Number.POSITIVE_INFINITY, NaN)`
        );
        expectEqual(
          evaluate(
            add(Constant.of(Number.NEGATIVE_INFINITY), Constant.of(NaN))
          ),
          Constant.of(NaN),
          `add(Number.NEGATIVE_INFINITY, NaN)`
        );
      });

      it('nan_notNumberType_returnError', () => {
        expect(evaluate(add(Constant.of(NaN), Constant.of('hello world')))).to
          .be.undefined;
      });

      it('multiArgument', () => {
        expectEqual(
          evaluate(add(add(Constant.of(1), Constant.of(2)), Constant.of(3))),
          Constant.of(6),
          `add(add(1, 2), 3)`
        );
        expectEqual(
          evaluate(add(add(Constant.of(1.0), Constant.of(2)), Constant.of(3))),
          Constant.of(6.0),
          `add(add(1.0, 2), 3)`
        );
      });

      // TODO(pipeline): Finish this when we support sum()
      it.skip('sum_and_multiAdd_produceSameResult', () => {});
    }); // end describe('add')

    describe('subtract', () => {
      it('basic_subtract_numerics', () => {
        expectEqual(
          evaluate(subtract(Constant.of(1), Constant.of(2))),
          Constant.of(-1),
          `subtract(1, 2)`
        );
        expectEqual(
          evaluate(subtract(Constant.of(1), Constant.of(2.5))),
          Constant.of(-1.5),
          `subtract(1, 2.5)`
        );
        expectEqual(
          evaluate(subtract(Constant.of(1.0), Constant.of(2))),
          Constant.of(-1.0),
          `subtract(1.0, 2)`
        );
        expectEqual(
          evaluate(subtract(Constant.of(1.0), Constant.of(2.0))),
          Constant.of(-1.0),
          `subtract(1.0, 2.0)`
        );
      });

      it('basic_subtract_nonNumerics', () => {
        expect(evaluate(subtract(Constant.of(1), Constant.of('1')))).to.be
          .undefined;
        expect(evaluate(subtract(Constant.of('1'), Constant.of(1.0)))).to.be
          .undefined;
        expect(evaluate(subtract(Constant.of('1'), Constant.of('1')))).to.be
          .undefined;
      });

      // TODO(pipeline): We do not have a way to represent a Long.MIN_VALUE yet.
      it.skip('doubleLongSubtraction_overflow', () => {
        expectEqual(
          evaluate(subtract(Constant.of(0x8000000000000000), Constant.of(1.0))),
          Constant.of(-9.223372036854776e18),
          `subtract(Number.MIN_SAFE_INTEGER, 1.0)`
        );
        expectEqual(
          evaluate(subtract(Constant.of(0x8000000000000000), Constant.of(100))),
          Constant.of(-9.223372036854776e18),
          `subtract(Number.MIN_SAFE_INTEGER, 100)`
        );
      });

      it('doubleSubtraction_overflow', () => {
        expectEqual(
          evaluate(
            subtract(
              Constant.of(-Number.MAX_VALUE),
              Constant.of(Number.MAX_VALUE)
            )
          ),
          Constant.of(Number.NEGATIVE_INFINITY),
          `subtract(-Number.MAX_VALUE, Number.MAX_VALUE)`
        );
        expectEqual(
          evaluate(
            subtract(
              Constant.of(Number.MAX_VALUE),
              Constant.of(-Number.MAX_VALUE)
            )
          ),
          Constant.of(Number.POSITIVE_INFINITY),
          `subtract(Number.MAX_VALUE, -Number.MAX_VALUE)`
        );
      });

      it.skip('longSubtraction_overflow', () => {
        expect(
          evaluate(
            subtract(Constant.of(Number.MIN_SAFE_INTEGER), Constant.of(1))
          )
        ).to.be.undefined;
        expect(
          evaluate(
            subtract(Constant.of(Number.MAX_SAFE_INTEGER), Constant.of(-1))
          )
        ).to.be.undefined;
      });

      it('nan_number_returnNaN', () => {
        expectEqual(
          evaluate(subtract(Constant.of(1), Constant.of(NaN))),
          Constant.of(NaN),
          `subtract(1, NaN)`
        );
        expectEqual(
          evaluate(subtract(Constant.of(1.0), Constant.of(NaN))),
          Constant.of(NaN),
          `subtract(1.0, NaN)`
        );
        expectEqual(
          evaluate(
            subtract(Constant.of(Number.MAX_SAFE_INTEGER), Constant.of(NaN))
          ),
          Constant.of(NaN),
          `subtract(Number.MAX_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(
            subtract(Constant.of(Number.MIN_SAFE_INTEGER), Constant.of(NaN))
          ),
          Constant.of(NaN),
          `subtract(Number.MIN_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(subtract(Constant.of(Number.MAX_VALUE), Constant.of(NaN))),
          Constant.of(NaN),
          `subtract(Number.MAX_VALUE, NaN)`
        );
        expectEqual(
          evaluate(subtract(Constant.of(Number.MIN_VALUE), Constant.of(NaN))),
          Constant.of(NaN),
          `subtract(Number.MIN_VALUE, NaN)`
        );
        expectEqual(
          evaluate(
            subtract(Constant.of(Number.POSITIVE_INFINITY), Constant.of(NaN))
          ),
          Constant.of(NaN),
          `subtract(Number.POSITIVE_INFINITY, NaN)`
        );
        expectEqual(
          evaluate(
            subtract(Constant.of(Number.NEGATIVE_INFINITY), Constant.of(NaN))
          ),
          Constant.of(NaN),
          `subtract(Number.NEGATIVE_INFINITY, NaN)`
        );
      });

      it('nan_notNumberType_returnError', () => {
        expect(evaluate(subtract(Constant.of(NaN), Constant.of('hello world'))))
          .to.be.undefined;
      });

      it('positiveInfinity', () => {
        expectEqual(
          evaluate(
            subtract(Constant.of(Number.POSITIVE_INFINITY), Constant.of(1))
          ),
          Constant.of(Number.POSITIVE_INFINITY),
          `subtract(Number.POSITIVE_INFINITY, 1)`
        );

        expectEqual(
          evaluate(
            subtract(Constant.of(1), Constant.of(Number.POSITIVE_INFINITY))
          ),
          Constant.of(Number.NEGATIVE_INFINITY),
          `subtract(1, Number.POSITIVE_INFINITY)`
        );
      });

      it('negativeInfinity', () => {
        expectEqual(
          evaluate(
            subtract(Constant.of(Number.NEGATIVE_INFINITY), Constant.of(1))
          ),
          Constant.of(Number.NEGATIVE_INFINITY),
          `subtract(Number.NEGATIVE_INFINITY, 1)`
        );

        expectEqual(
          evaluate(
            subtract(Constant.of(1), Constant.of(Number.NEGATIVE_INFINITY))
          ),
          Constant.of(Number.POSITIVE_INFINITY),
          `subtract(1, Number.NEGATIVE_INFINITY)`
        );
      });

      it('positiveInfinity_negativeInfinity', () => {
        expectEqual(
          evaluate(
            subtract(
              Constant.of(Number.POSITIVE_INFINITY),
              Constant.of(Number.NEGATIVE_INFINITY)
            )
          ),
          Constant.of(Number.POSITIVE_INFINITY),
          `subtract(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)`
        );

        expectEqual(
          evaluate(
            subtract(
              Constant.of(Number.NEGATIVE_INFINITY),
              Constant.of(Number.POSITIVE_INFINITY)
            )
          ),
          Constant.of(Number.NEGATIVE_INFINITY),
          `subtract(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)`
        );
      });
    }); // end describe('subtract')

    describe('multiply', () => {
      it('basic_multiply_numerics', () => {
        expectEqual(
          evaluate(multiply(Constant.of(1), Constant.of(2))),
          Constant.of(2),
          `multiply(1, 2)`
        );
        expectEqual(
          evaluate(multiply(Constant.of(3), Constant.of(2.5))),
          Constant.of(7.5),
          `multiply(3, 2.5)`
        );
        expectEqual(
          evaluate(multiply(Constant.of(1.0), Constant.of(2))),
          Constant.of(2.0),
          `multiply(1.0, 2)`
        );
        expectEqual(
          evaluate(multiply(Constant.of(1.32), Constant.of(2.0))),
          Constant.of(2.64),
          `multiply(1.32, 2.0)`
        );
      });

      it('basic_multiply_nonNumerics', () => {
        expect(evaluate(multiply(Constant.of(1), Constant.of('1')))).to.be
          .undefined;
        expect(evaluate(multiply(Constant.of('1'), Constant.of(1.0)))).to.be
          .undefined;
        expect(evaluate(multiply(Constant.of('1'), Constant.of('1')))).to.be
          .undefined;
      });

      it.skip('doubleLongMultiplication_overflow', () => {
        expectEqual(
          evaluate(
            multiply(Constant.of(Number.MAX_SAFE_INTEGER), Constant.of(100.0))
          ),
          Constant.of(900719925474099100),
          `multiply(Number.MAX_SAFE_INTEGER, 100.0)`
        );
        expectEqual(
          evaluate(
            multiply(Constant.of(Number.MAX_SAFE_INTEGER), Constant.of(100))
          ),
          Constant.of(900719925474099200),
          `multiply(Number.MAX_SAFE_INTEGER, 100)`
        );
      });

      it('doubleMultiplication_overflow', () => {
        expectEqual(
          evaluate(
            multiply(
              Constant.of(Number.MAX_VALUE),
              Constant.of(Number.MAX_VALUE)
            )
          ),
          Constant.of(Number.POSITIVE_INFINITY),
          `multiply(Number.MAX_VALUE, Number.MAX_VALUE)`
        );
        expectEqual(
          evaluate(
            multiply(
              Constant.of(-Number.MAX_VALUE),
              Constant.of(Number.MAX_VALUE)
            )
          ),
          Constant.of(Number.NEGATIVE_INFINITY),
          `multiply(-Number.MAX_VALUE, Number.MAX_VALUE)`
        );
      });

      it.skip('longMultiplication_overflow', () => {
        expect(
          evaluate(
            multiply(Constant.of(Number.MAX_SAFE_INTEGER), Constant.of(10))
          )
        ).to.be.undefined;
        expect(
          evaluate(
            multiply(Constant.of(Number.MIN_SAFE_INTEGER), Constant.of(10))
          )
        ).to.be.undefined;
        expect(
          evaluate(
            multiply(Constant.of(-10), Constant.of(Number.MAX_SAFE_INTEGER))
          )
        ).to.be.undefined;
        expect(
          evaluate(
            multiply(Constant.of(-10), Constant.of(Number.MIN_SAFE_INTEGER))
          )
        ).to.be.undefined;
      });

      it('nan_number_returnNaN', () => {
        expectEqual(
          evaluate(multiply(Constant.of(1), Constant.of(NaN))),
          Constant.of(NaN),
          `multiply(1, NaN)`
        );
        expectEqual(
          evaluate(multiply(Constant.of(1.0), Constant.of(NaN))),
          Constant.of(NaN),
          `multiply(1.0, NaN)`
        );
        expectEqual(
          evaluate(
            multiply(Constant.of(Number.MAX_SAFE_INTEGER), Constant.of(NaN))
          ),
          Constant.of(NaN),
          `multiply(Number.MAX_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(
            multiply(Constant.of(Number.MIN_SAFE_INTEGER), Constant.of(NaN))
          ),
          Constant.of(NaN),
          `multiply(Number.MIN_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(multiply(Constant.of(Number.MAX_VALUE), Constant.of(NaN))),
          Constant.of(NaN),
          `multiply(Number.MAX_VALUE, NaN)`
        );
        expectEqual(
          evaluate(multiply(Constant.of(Number.MIN_VALUE), Constant.of(NaN))),
          Constant.of(NaN),
          `multiply(Number.MIN_VALUE, NaN)`
        );
        expectEqual(
          evaluate(
            multiply(Constant.of(Number.POSITIVE_INFINITY), Constant.of(NaN))
          ),
          Constant.of(NaN),
          `multiply(Number.POSITIVE_INFINITY, NaN)`
        );
        expectEqual(
          evaluate(
            multiply(Constant.of(Number.NEGATIVE_INFINITY), Constant.of(NaN))
          ),
          Constant.of(NaN),
          `multiply(Number.NEGATIVE_INFINITY, NaN)`
        );
      });

      it('nan_notNumberType_returnError', () => {
        expect(evaluate(multiply(Constant.of(NaN), Constant.of('hello world'))))
          .to.be.undefined;
      });

      it('positiveInfinity', () => {
        expectEqual(
          evaluate(
            multiply(Constant.of(Number.POSITIVE_INFINITY), Constant.of(1))
          ),
          Constant.of(Number.POSITIVE_INFINITY),
          `multiply(Number.POSITIVE_INFINITY, 1)`
        );

        expectEqual(
          evaluate(
            multiply(Constant.of(1), Constant.of(Number.POSITIVE_INFINITY))
          ),
          Constant.of(Number.POSITIVE_INFINITY),
          `multiply(1, Number.POSITIVE_INFINITY)`
        );
      });

      it('negativeInfinity', () => {
        expectEqual(
          evaluate(
            multiply(Constant.of(Number.NEGATIVE_INFINITY), Constant.of(1))
          ),
          Constant.of(Number.NEGATIVE_INFINITY),
          `multiply(Number.NEGATIVE_INFINITY, 1)`
        );

        expectEqual(
          evaluate(
            multiply(Constant.of(1), Constant.of(Number.NEGATIVE_INFINITY))
          ),
          Constant.of(Number.NEGATIVE_INFINITY),
          `multiply(1, Number.NEGATIVE_INFINITY)`
        );
      });

      it('positiveInfinity_negativeInfinity_returnsNegativeInfinity', () => {
        expectEqual(
          evaluate(
            multiply(
              Constant.of(Number.POSITIVE_INFINITY),
              Constant.of(Number.NEGATIVE_INFINITY)
            )
          ),
          Constant.of(Number.NEGATIVE_INFINITY),
          `multiply(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)`
        );

        expectEqual(
          evaluate(
            multiply(
              Constant.of(Number.NEGATIVE_INFINITY),
              Constant.of(Number.POSITIVE_INFINITY)
            )
          ),
          Constant.of(Number.NEGATIVE_INFINITY),
          `multiply(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)`
        );
      });

      it('multiArgument', () => {
        expectEqual(
          evaluate(
            multiply(multiply(Constant.of(1), Constant.of(2)), Constant.of(3))
          ),
          Constant.of(6),
          `multiply(multiply(1, 2, 3))`
        );
        expectEqual(
          evaluate(
            multiply(Constant.of(1.0), multiply(Constant.of(2), Constant.of(3)))
          ),
          Constant.of(6.0),
          `multiply(1.0, multiply(2, 3))`
        );
      });
    }); // end describe('multiply')

    describe('divide', () => {
      it('basic_divide_numerics', () => {
        expectEqual(
          evaluate(divide(Constant.of(10), Constant.of(2))),
          Constant.of(5),
          `divide(10, 2)`
        );
        expectEqual(
          evaluate(divide(Constant.of(10), Constant.of(2.0))),
          Constant.of(5.0),
          `divide(10, 2.0)`
        );
        // TODO(pipeline): Constant.of is problematic here.
        // expectEqual(
        //   evaluate(divide(Constant.of(10.0), Constant.of(3))),
        //   Constant.of(10.0 / 3),
        //   `divide(10.0, 3)`
        // );
        // expectEqual(
        //   evaluate(divide(Constant.of(10.0), Constant.of(7.0))),
        //   Constant.of(10.0 / 7.0),
        //   `divide(10.0, 7.0)`
        // );
      });

      it('basic_divide_nonNumerics', () => {
        expect(evaluate(divide(Constant.of(1), Constant.of('1')))).to.be
          .undefined;
        expect(evaluate(divide(Constant.of('1'), Constant.of(1.0)))).to.be
          .undefined;
        expect(evaluate(divide(Constant.of('1'), Constant.of('1')))).to.be
          .undefined;
      });

      it('long_division', () => {
        expectEqual(
          evaluate(divide(Constant.of(10), Constant.of(3))),
          Constant.of(3), // Integer division in JavaScript
          `divide(10, 3)`
        );
        expectEqual(
          evaluate(divide(Constant.of(-10), Constant.of(3))),
          Constant.of(-3), // Integer division in JavaScript
          `divide(-10, 3)`
        );
        expectEqual(
          evaluate(divide(Constant.of(10), Constant.of(-3))),
          Constant.of(-3), // Integer division in JavaScript
          `divide(10, -3)`
        );
        expectEqual(
          evaluate(divide(Constant.of(-10), Constant.of(-3))),
          Constant.of(3), // Integer division in JavaScript
          `divide(-10, -3)`
        );
      });

      it('doubleLongDivision_overflow', () => {
        expectEqual(
          evaluate(
            divide(Constant.of(Number.MAX_SAFE_INTEGER), Constant.of(0.1))
          ),
          Constant.of(90071992547409910), // Note: JS limitation, see explanation below
          `divide(Number.MAX_SAFE_INTEGER, 0.1)`
        );
        expectEqual(
          evaluate(
            divide(Constant.of(Number.MAX_SAFE_INTEGER), Constant.of(0.1))
          ),
          Constant.of(90071992547409910), // Note: JS limitation, see explanation below
          `divide(Number.MAX_SAFE_INTEGER, 0.1)`
        );
      });

      it('doubleDivision_overflow', () => {
        expectEqual(
          evaluate(
            divide(Constant.of(Number.MAX_VALUE), Constant.of(Number.MIN_VALUE))
          ),
          Constant.of(Number.POSITIVE_INFINITY),
          `divide(Number.MAX_VALUE, Number.MIN_VALUE)`
        );
        expectEqual(
          evaluate(
            divide(
              Constant.of(-Number.MAX_VALUE),
              Constant.of(Number.MIN_VALUE)
            )
          ),
          Constant.of(Number.NEGATIVE_INFINITY),
          `divide(-Number.MAX_VALUE, Number.MIN_VALUE)`
        );
      });

      it.skip('divideByZero', () => {
        expect(evaluate(divide(Constant.of(1), Constant.of(0)))).to.be
          .undefined; // Or your error handling
        expectEqual(
          evaluate(divide(Constant.of(1), Constant.of(0.0))),
          Constant.of(Number.POSITIVE_INFINITY),
          `divide(1, 0.0)`
        );
        expectEqual(
          evaluate(divide(Constant.of(1), Constant.of(-0.0))),
          Constant.of(Number.NEGATIVE_INFINITY),
          `divide(1, -0.0)`
        );
      });

      it('nan_number_returnNaN', () => {
        expectEqual(
          evaluate(divide(Constant.of(1), Constant.of(NaN))),
          Constant.of(NaN),
          `divide(1, NaN)`
        );
        expectEqual(
          evaluate(divide(Constant.of(NaN), Constant.of(1))),
          Constant.of(NaN),
          `divide(NaN, 1)`
        );

        expectEqual(
          evaluate(divide(Constant.of(1.0), Constant.of(NaN))),
          Constant.of(NaN),
          `divide(1.0, NaN)`
        );
        expectEqual(
          evaluate(divide(Constant.of(NaN), Constant.of(1.0))),
          Constant.of(NaN),
          `divide(NaN, 1.0)`
        );

        expectEqual(
          evaluate(
            divide(Constant.of(Number.MAX_SAFE_INTEGER), Constant.of(NaN))
          ),
          Constant.of(NaN),
          `divide(Number.MAX_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(
            divide(Constant.of(NaN), Constant.of(Number.MAX_SAFE_INTEGER))
          ),
          Constant.of(NaN),
          `divide(NaN, Number.MAX_SAFE_INTEGER)`
        );

        expectEqual(
          evaluate(
            divide(Constant.of(Number.MIN_SAFE_INTEGER), Constant.of(NaN))
          ),
          Constant.of(NaN),
          `divide(Number.MIN_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(
            divide(Constant.of(NaN), Constant.of(Number.MIN_SAFE_INTEGER))
          ),
          Constant.of(NaN),
          `divide(NaN, Number.MIN_SAFE_INTEGER)`
        );

        expectEqual(
          evaluate(divide(Constant.of(Number.MAX_VALUE), Constant.of(NaN))),
          Constant.of(NaN),
          `divide(Number.MAX_VALUE, NaN)`
        );
        expectEqual(
          evaluate(divide(Constant.of(NaN), Constant.of(Number.MAX_VALUE))),
          Constant.of(NaN),
          `divide(NaN, Number.MAX_VALUE)`
        );

        expectEqual(
          evaluate(divide(Constant.of(Number.MIN_VALUE), Constant.of(NaN))),
          Constant.of(NaN),
          `divide(Number.MIN_VALUE, NaN)`
        );
        expectEqual(
          evaluate(divide(Constant.of(NaN), Constant.of(Number.MIN_VALUE))),
          Constant.of(NaN),
          `divide(NaN, Number.MIN_VALUE)`
        );

        expectEqual(
          evaluate(
            divide(Constant.of(Number.POSITIVE_INFINITY), Constant.of(NaN))
          ),
          Constant.of(NaN),
          `divide(Number.POSITIVE_INFINITY, NaN)`
        );
        expectEqual(
          evaluate(divide(Constant.of(NaN), Constant.of(NaN))),
          Constant.of(NaN),
          `divide(NaN, NaN)`
        );

        expectEqual(
          evaluate(
            divide(Constant.of(Number.NEGATIVE_INFINITY), Constant.of(NaN))
          ),
          Constant.of(NaN),
          `divide(Number.NEGATIVE_INFINITY, NaN)`
        );
        expectEqual(
          evaluate(
            divide(Constant.of(NaN), Constant.of(Number.NEGATIVE_INFINITY))
          ),
          Constant.of(NaN),
          `divide(NaN, Number.NEGATIVE_INFINITY)`
        );
      });

      it('nan_notNumberType_returnError', () => {
        expect(evaluate(divide(Constant.of(NaN), Constant.of('hello world'))))
          .to.be.undefined;
      });

      it('positiveInfinity', () => {
        expectEqual(
          evaluate(
            divide(Constant.of(Number.POSITIVE_INFINITY), Constant.of(1))
          ),
          Constant.of(Number.POSITIVE_INFINITY),
          `divide(Number.POSITIVE_INFINITY, 1)`
        );
        // TODO(pipeline): Constant.of is problematic here.
        // expectEqual(
        //   evaluate(
        //     divide(Constant.of(1), Constant.of(Number.POSITIVE_INFINITY))
        //   ),
        //   Constant.of(0.0),
        //   `divide(1, Number.POSITIVE_INFINITY)`
        // );
      });

      it('negativeInfinity', () => {
        expectEqual(
          evaluate(
            divide(Constant.of(Number.NEGATIVE_INFINITY), Constant.of(1))
          ),
          Constant.of(Number.NEGATIVE_INFINITY),
          `divide(Number.NEGATIVE_INFINITY, 1)`
        );
        expectEqual(
          evaluate(
            divide(Constant.of(1), Constant.of(Number.NEGATIVE_INFINITY))
          ),
          Constant.of(-0.0),
          `divide(1, Number.NEGATIVE_INFINITY)`
        );
      });

      it('positiveInfinity_negativeInfinity_returnsNan', () => {
        expectEqual(
          evaluate(
            divide(
              Constant.of(Number.POSITIVE_INFINITY),
              Constant.of(Number.NEGATIVE_INFINITY)
            )
          ),
          Constant.of(NaN),
          `divide(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)`
        );
        expectEqual(
          evaluate(
            divide(
              Constant.of(Number.NEGATIVE_INFINITY),
              Constant.of(Number.POSITIVE_INFINITY)
            )
          ),
          Constant.of(NaN),
          `divide(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)`
        );
      });
    }); // end describe('divide')

    describe('mod', () => {
      it('divisorZero_throwsError', () => {
        expect(evaluate(mod(Constant.of(42), Constant.of(0)))).to.be.undefined;
        expect(evaluate(mod(Constant.of(42), Constant.of(-0)))).to.be.undefined;

        expect(evaluate(mod(Constant.of(42), Constant.of(0.0)))).to.be
          .undefined;
        expect(evaluate(mod(Constant.of(42), Constant.of(-0.0)))).to.be
          .undefined;
      });

      it('dividendZero_returnsZero', () => {
        expectEqual(
          evaluate(mod(Constant.of(0), Constant.of(42))),
          Constant.of(0),
          `mod(0, 42)`
        );
        expectEqual(
          evaluate(mod(Constant.of(-0), Constant.of(42))),
          Constant.of(0),
          `mod(-0, 42)`
        );

        expectEqual(
          evaluate(mod(Constant.of(0.0), Constant.of(42))),
          Constant.of(0.0),
          `mod(0.0, 42)`
        );
        expectEqual(
          evaluate(mod(Constant.of(-0.0), Constant.of(42))),
          Constant.of(-0.0),
          `mod(-0.0, 42)`
        );
      });

      it('long_positive_positive', () => {
        expectEqual(
          evaluate(mod(Constant.of(10), Constant.of(3))),
          Constant.of(1),
          `mod(10, 3)`
        );
      });

      it('long_negative_negative', () => {
        expectEqual(
          evaluate(mod(Constant.of(-10), Constant.of(-3))),
          Constant.of(-1),
          `mod(-10, -3)`
        );
      });

      it('long_positive_negative', () => {
        expectEqual(
          evaluate(mod(Constant.of(10), Constant.of(-3))),
          Constant.of(1),
          `mod(10, -3)`
        );
      });

      it('long_negative_positive', () => {
        expectEqual(
          evaluate(mod(Constant.of(-10), Constant.of(3))),
          Constant.of(-1),
          `mod(-10, 3)`
        );
      });

      it('double_positive_positive', () => {
        expect(
          evaluate(mod(Constant.of(10.5), Constant.of(3.0)))?.doubleValue
        ).to.be.closeTo(1.5, 1e-6);
      });

      it('double_negative_negative', () => {
        expect(
          evaluate(mod(Constant.of(-7.3), Constant.of(-1.8)))?.doubleValue
        ).to.be.closeTo(-0.1, 1e-6);
      });

      it('double_positive_negative', () => {
        expect(
          evaluate(mod(Constant.of(9.8), Constant.of(-2.5)))?.doubleValue
        ).to.be.closeTo(2.3, 1e-6);
      });

      it('double_negative_positive', () => {
        expect(
          evaluate(mod(Constant.of(-7.5), Constant.of(2.3)))?.doubleValue
        ).to.be.closeTo(-0.6, 1e-6);
      });

      it('long_perfectlyDivisible', () => {
        expectEqual(
          evaluate(mod(Constant.of(10), Constant.of(5))),
          Constant.of(0),
          `mod(10, 5)`
        );
        expectEqual(
          evaluate(mod(Constant.of(-10), Constant.of(5))),
          Constant.of(0),
          `mod(-10, 5)`
        );
        expectEqual(
          evaluate(mod(Constant.of(10), Constant.of(-5))),
          Constant.of(0),
          `mod(10, -5)`
        );
        expectEqual(
          evaluate(mod(Constant.of(-10), Constant.of(-5))),
          Constant.of(0),
          `mod(-10, -5)`
        );
      });

      it('double_perfectlyDivisible', () => {
        expectEqual(
          evaluate(mod(Constant.of(10), Constant.of(2.5))),
          Constant.of(0.0),
          `mod(10, 2.5)`
        );
        expectEqual(
          evaluate(mod(Constant.of(10), Constant.of(-2.5))),
          Constant.of(0.0),
          `mod(10, -2.5)`
        );
        expectEqual(
          evaluate(mod(Constant.of(-10), Constant.of(2.5))),
          Constant.of(-0.0),
          `mod(-10, 2.5)`
        );
        expectEqual(
          evaluate(mod(Constant.of(-10), Constant.of(-2.5))),
          Constant.of(-0.0),
          `mod(-10, -2.5)`
        );
      });

      it('nonNumerics_returnError', () => {
        expect(evaluate(mod(Constant.of(10), Constant.of('1')))).to.be
          .undefined;
        expect(evaluate(mod(Constant.of('1'), Constant.of(10)))).to.be
          .undefined;
        expect(evaluate(mod(Constant.of('1'), Constant.of('1')))).to.be
          .undefined;
      });

      it('nan_number_returnNaN', () => {
        expectEqual(
          evaluate(mod(Constant.of(1), Constant.of(NaN))),
          Constant.of(NaN),
          `mod(1, NaN)`
        );
        expectEqual(
          evaluate(mod(Constant.of(1.0), Constant.of(NaN))),
          Constant.of(NaN),
          `mod(1.0, NaN)`
        );
        expectEqual(
          evaluate(mod(Constant.of(Number.MAX_SAFE_INTEGER), Constant.of(NaN))),
          Constant.of(NaN),
          `mod(Number.MAX_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(mod(Constant.of(Number.MIN_SAFE_INTEGER), Constant.of(NaN))),
          Constant.of(NaN),
          `mod(Number.MIN_SAFE_INTEGER, NaN)`
        );
        expectEqual(
          evaluate(mod(Constant.of(Number.MAX_VALUE), Constant.of(NaN))),
          Constant.of(NaN),
          `mod(Number.MAX_VALUE, NaN)`
        );
        expectEqual(
          evaluate(mod(Constant.of(Number.MIN_VALUE), Constant.of(NaN))),
          Constant.of(NaN),
          `mod(Number.MIN_VALUE, NaN)`
        );
        expectEqual(
          evaluate(
            mod(Constant.of(Number.POSITIVE_INFINITY), Constant.of(NaN))
          ),
          Constant.of(NaN),
          `mod(Number.POSITIVE_INFINITY, NaN)`
        );
        expectEqual(
          evaluate(
            mod(Constant.of(Number.NEGATIVE_INFINITY), Constant.of(NaN))
          ),
          Constant.of(NaN),
          `mod(Number.NEGATIVE_INFINITY, NaN)`
        );
      });

      it('nan_notNumberType_returnError', () => {
        expect(evaluate(mod(Constant.of(NaN), Constant.of('hello world')))).to
          .be.undefined;
      });

      it('number_posInfinity_returnSelf', () => {
        expectEqual(
          evaluate(mod(Constant.of(1), Constant.of(Number.POSITIVE_INFINITY))),
          Constant.of(1.0),
          `mod(1, Number.POSITIVE_INFINITY)`
        );
        expectEqual(
          evaluate(
            mod(
              Constant.of(42.123456789),
              Constant.of(Number.POSITIVE_INFINITY)
            )
          ),
          Constant.of(42.123456789),
          `mod(42.123456789, Number.POSITIVE_INFINITY)`
        );
        expectEqual(
          evaluate(
            mod(Constant.of(-99.9), Constant.of(Number.POSITIVE_INFINITY))
          ),
          Constant.of(-99.9),
          `mod(-99.9, Number.POSITIVE_INFINITY)`
        );
      });

      it('posInfinity_number_returnNaN', () => {
        expectEqual(
          evaluate(mod(Constant.of(Number.POSITIVE_INFINITY), Constant.of(1))),
          Constant.of(NaN),
          `mod(Number.POSITIVE_INFINITY, 1)`
        );
        expectEqual(
          evaluate(
            mod(
              Constant.of(Number.POSITIVE_INFINITY),
              Constant.of(42.123456789)
            )
          ),
          Constant.of(NaN),
          `mod(Number.POSITIVE_INFINITY, 42.123456789)`
        );
        expectEqual(
          evaluate(
            mod(Constant.of(Number.POSITIVE_INFINITY), Constant.of(-99.9))
          ),
          Constant.of(NaN),
          `mod(Number.POSITIVE_INFINITY, -99.9)`
        );
      });

      it('number_negInfinity_returnSelf', () => {
        expectEqual(
          evaluate(mod(Constant.of(1), Constant.of(Number.NEGATIVE_INFINITY))),
          Constant.of(1.0),
          `mod(1, Number.NEGATIVE_INFINITY)`
        );
        expectEqual(
          evaluate(
            mod(
              Constant.of(42.123456789),
              Constant.of(Number.NEGATIVE_INFINITY)
            )
          ),
          Constant.of(42.123456789),
          `mod(42.123456789, Number.NEGATIVE_INFINITY)`
        );
        expectEqual(
          evaluate(
            mod(Constant.of(-99.9), Constant.of(Number.NEGATIVE_INFINITY))
          ),
          Constant.of(-99.9),
          `mod(-99.9, Number.NEGATIVE_INFINITY)`
        );
      });

      it('negInfinity_number_returnNaN', () => {
        expectEqual(
          evaluate(mod(Constant.of(Number.NEGATIVE_INFINITY), Constant.of(1))),
          Constant.of(NaN),
          `mod(Number.NEGATIVE_INFINITY, 1)`
        );
        expectEqual(
          evaluate(
            mod(
              Constant.of(Number.NEGATIVE_INFINITY),
              Constant.of(42.123456789)
            )
          ),
          Constant.of(NaN),
          `mod(Number.NEGATIVE_INFINITY, 42.123456789)`
        );
        expectEqual(
          evaluate(
            mod(Constant.of(Number.NEGATIVE_INFINITY), Constant.of(-99.9))
          ),
          Constant.of(NaN),
          `mod(Number.NEGATIVE_INFINITY, -99.9)`
        );
      });

      it('posAndNegInfinity_returnNaN', () => {
        expectEqual(
          evaluate(
            mod(
              Constant.of(Number.POSITIVE_INFINITY),
              Constant.of(Number.NEGATIVE_INFINITY)
            )
          ),
          Constant.of(NaN),
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
              Constant.of([
                '1',
                42,
                true,
                'additional',
                'values',
                'in',
                'array'
              ]),
              [Constant.of('1'), Constant.of(42), Constant.of(true)]
            )
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('doesNotContainAll', () => {
        expect(
          evaluate(
            arrayContainsAll(Constant.of(['1', 42, true]), [
              Constant.of('1'),
              Constant.of(99)
            ])
          )
        ).to.deep.equal(FALSE_VALUE);
      });

      it('equivalentNumerics', () => {
        expect(
          evaluate(
            arrayContainsAll(
              Constant.of([42, true, 'additional', 'values', 'in', 'array']),
              [Constant.of(42.0), Constant.of(true)]
            )
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('arrayToSearch_isEmpty', () => {
        expect(
          evaluate(
            arrayContainsAll(Constant.of([]), [
              Constant.of(42.0),
              Constant.of(true)
            ])
          )
        ).to.deep.equal(FALSE_VALUE);
      });

      it('searchValue_isEmpty', () => {
        expect(
          evaluate(arrayContainsAll(Constant.of([42.0, true]), []))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('searchValue_isNaN', () => {
        expect(
          evaluate(
            arrayContainsAll(Constant.of([NaN, 42.0]), [Constant.of(NaN)])
          )
        ).to.deep.equal(FALSE_VALUE);
      });

      it('searchValue_hasDuplicates', () => {
        expect(
          evaluate(
            arrayContainsAll(Constant.of([true, 'hi']), [
              Constant.of(true),
              Constant.of(true),
              Constant.of(true)
            ])
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('arrayToSearch_isEmpty_searchValue_isEmpty', () => {
        expect(evaluate(arrayContainsAll(Constant.of([]), []))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('largeNumberOfElements', () => {
        const elements = Array.from({ length: 500 }, (_, i) => i + 1);
        expect(
          evaluate(
            arrayContainsAll(
              Constant.of(elements),
              elements.map(e => Constant.of(e))
            )
          )
        ).to.deep.equal(TRUE_VALUE);
      });
    });

    describe('arrayContainsAny', () => {
      const ARRAY_TO_SEARCH = Constant.of([42, 'matang', true]);
      const SEARCH_VALUES = [Constant.of('matang'), Constant.of(false)];

      it('valueFoundInArray', () => {
        expect(
          evaluate(arrayContainsAny(ARRAY_TO_SEARCH, SEARCH_VALUES))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('equivalentNumerics', () => {
        expect(
          evaluate(
            arrayContainsAny(ARRAY_TO_SEARCH, [
              Constant.of(42.0),
              Constant.of(2)
            ])
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('valuesNotFoundInArray', () => {
        expect(
          evaluate(
            arrayContainsAny(ARRAY_TO_SEARCH, [
              Constant.of(99),
              Constant.of('false')
            ])
          )
        ).to.deep.equal(FALSE_VALUE);
      });

      // TODO(pipeline): Nested arrays are not supported in documents. We need to
      // support creating nested arrays as expressions however.
      it.skip('bothInputTypeIsArray', () => {
        expect(
          evaluate(
            arrayContainsAny(
              Constant.of([
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9]
              ]),
              [Constant.of([1, 2, 3]), Constant.of([4, 5, 6])]
            )
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('search_isNull', () => {
        expect(
          evaluate(
            arrayContainsAny(Constant.of([null, 1, 'matang', true]), [
              Constant.of(null)
            ])
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('array_isNotArrayType_returnsError', () => {
        expect(evaluate(arrayContainsAny(Constant.of('matang'), SEARCH_VALUES)))
          .to.be.undefined;
      });

      it('search_isNotArrayType_returnsError', () => {
        expect(
          evaluate(
            arrayContainsAny(Constant.of('values'), [Constant.of('values')])
          )
        ).to.be.undefined;
      });

      it('array_notFound_returnsError', () => {
        expect(evaluate(arrayContainsAny(Field.of('not-exist'), SEARCH_VALUES)))
          .to.be.undefined;
      });

      it('searchNotFound_returnsError', () => {
        expect(
          evaluate(arrayContainsAny(ARRAY_TO_SEARCH, [Field.of('not-exist')]))
        ).to.be.undefined;
      });
    }); // end describe('arrayContainsAny')

    describe('arrayContains', () => {
      const ARRAY_TO_SEARCH = Constant.of([42, 'matang', true]);

      it('valueFoundInArray', () => {
        expect(
          evaluate(
            arrayContains(Constant.of(['hello', 'world']), Constant.of('hello'))
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('valueNotFoundInArray', () => {
        expect(
          evaluate(arrayContains(ARRAY_TO_SEARCH, Constant.of(4)))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('notArrayContainsFunction_valueNotFoundInArray', () => {
        const child = arrayContains(ARRAY_TO_SEARCH, Constant.of(4));
        const f = not(child);
        expect(evaluate(f)).to.deep.equal(TRUE_VALUE);
      });

      it('equivalentNumerics', () => {
        expect(
          evaluate(arrayContains(ARRAY_TO_SEARCH, Constant.of(42.0)))
        ).to.deep.equal(TRUE_VALUE);
      });

      it.skip('bothInputTypeIsArray', () => {
        expect(
          evaluate(
            arrayContains(
              Constant.of([
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9]
              ]),
              Constant.of([1, 2, 3])
            )
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('searchValue_isNull', () => {
        expect(
          evaluate(
            arrayContains(
              Constant.of([null, 1, 'matang', true]),
              Constant.of(null)
            )
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('searchValue_isNull_emptyValuesArray_returnsFalse', () => {
        expect(
          evaluate(arrayContains(Constant.of([]), Constant.of(null)))
        ).to.deep.equal(FALSE_VALUE);
      });

      it.skip('searchValue_isMap', () => {
        expect(
          evaluate(
            arrayContains(
              Constant.of([
                123,
                new Map<string, any>([['foo', 123]]),
                new Map<string, any>([['bar', 42]]),
                new Map<string, any>([['foo', 42]])
              ]),
              Constant.of(new Map<string, any>([['foo', 42]]))
            )
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('searchValue_isNaN', () => {
        expect(
          evaluate(arrayContains(Constant.of([NaN, 'foo']), Constant.of(NaN)))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('arrayToSearch_isNotArrayType_returnsError', () => {
        expect(
          evaluate(arrayContains(Constant.of('matang'), Constant.of('values')))
        ).to.be.undefined;
      });

      it('arrayToSearch_notFound_returnsError', () => {
        expect(
          evaluate(arrayContains(Field.of('not-exist'), Constant.of('matang')))
        ).to.be.undefined;
      });

      it('arrayToSearch_isEmpty_returnsFalse', () => {
        expect(
          evaluate(arrayContains(Constant.of([]), Constant.of('matang')))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('searchValue_reference_notFound_returnsError', () => {
        expect(evaluate(arrayContains(ARRAY_TO_SEARCH, Field.of('not-exist'))))
          .to.be.undefined;
      });
    }); // end describe('arrayContains')

    describe('arrayLength', () => {
      it('length', () => {
        expectEqual(
          evaluate(arrayLength(Constant.of(['1', 42, true]))),
          Constant.of(3),
          `arrayLength(['1', 42, true])`
        );
      });

      it('emptyArray', () => {
        expectEqual(
          evaluate(arrayLength(Constant.of([]))),
          Constant.of(0),
          `arrayLength([])`
        );
      });

      it('arrayWithDuplicateElements', () => {
        expectEqual(
          evaluate(arrayLength(Constant.of([true, true]))),
          Constant.of(2),
          `arrayLength([true, true])`
        );
      });

      it('notArrayType_returnsError', () => {
        expect(evaluate(arrayLength(Constant.of(new VectorValue([0.0, 1.0])))))
          .to.be.undefined; // Assuming double[] is not considered an array
        expect(evaluate(arrayLength(Constant.of('notAnArray')))).to.be
          .undefined;
      });
    }); // end describe('arrayLength')

    describe('arrayReverse', () => {
      it('emptyArray', () => {
        expectEqual(
          evaluate(arrayReverse(Constant.of([]))),
          Constant.of([]),
          `arrayReverse([])`
        );
      });

      it('oneElement', () => {
        expectEqual(
          evaluate(arrayReverse(Constant.of([42]))),
          Constant.of([42]),
          `arrayReverse([42])`
        );
      });

      it('duplicateElements', () => {
        expectEqual(
          evaluate(arrayReverse(Constant.of([1, 2, 2, 3]))),
          Constant.of([3, 2, 2, 1]),
          `arrayReverse([1, 2, 2, 3])`
        );
      });

      it('array_reverse', () => {
        const input = ['1', 42, true];
        expectEqual(
          evaluate(arrayReverse(Constant.of(input))),
          Constant.of(input.slice().reverse()),
          `arrayReverse(['1', 42, true])`
        );
      });

      it('largeArray', () => {
        const input = Array.from({ length: 500 }, (_, i) => i + 1);
        expectEqual(
          evaluate(arrayReverse(Constant.of(input))),
          Constant.of(input.slice().reverse()),
          `arrayReverse(largeArray)`
        );
      });

      it('notArrayType_returnsError', () => {
        expect(evaluate(arrayReverse(Constant.of({})))).to.be.undefined; // Assuming empty map is not an array
      });
    }); // end describe('arrayReverse')
  });

  describe('Field expression', () => {
    it('can get field', () => {
      expect(evaluate(Field.of('exists'))?.booleanValue).to.be.true;
    });

    it('error if not found', () => {
      expect(evaluate(Field.of('not-exists'))).to.be.undefined;
    });
  });

  describe('Logical Functions', () => {
    describe('and', () => {
      it('false_false_isFalse', () => {
        expect(evaluate(andFunction(falseExpr, falseExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('false_error_isFalse', () => {
        expect(
          evaluate(andFunction(falseExpr, errorFilterExpr()))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('false_true_isFalse', () => {
        expect(evaluate(andFunction(falseExpr, trueExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('error_false_isFalse', () => {
        expect(
          evaluate(andFunction(errorFilterExpr(), falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('error_error_isError', () => {
        expect(evaluate(andFunction(errorFilterExpr(), errorFilterExpr()))).to
          .be.undefined;
      });

      it('error_true_isError', () => {
        expect(evaluate(andFunction(errorFilterExpr(), trueExpr))).to.be
          .undefined;
      });

      it('true_false_isFalse', () => {
        expect(evaluate(andFunction(trueExpr, falseExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('true_error_isError', () => {
        expect(evaluate(andFunction(trueExpr, errorFilterExpr()))).to.be
          .undefined;
      });

      it('true_true_isTrue', () => {
        expect(evaluate(andFunction(trueExpr, trueExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('false_false_false_isFalse', () => {
        expect(
          evaluate(andFunction(falseExpr, falseExpr, falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('false_false_error_isFalse', () => {
        expect(
          evaluate(andFunction(falseExpr, falseExpr, errorFilterExpr()))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('false_false_true_isFalse', () => {
        expect(
          evaluate(andFunction(falseExpr, falseExpr, trueExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('false_error_false_isFalse', () => {
        expect(
          evaluate(andFunction(falseExpr, errorFilterExpr(), falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('false_error_error_isFalse', () => {
        expect(
          evaluate(andFunction(falseExpr, errorFilterExpr(), errorFilterExpr()))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('false_error_true_isFalse', () => {
        expect(
          evaluate(andFunction(falseExpr, errorFilterExpr(), trueExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('false_true_false_isFalse', () => {
        expect(
          evaluate(andFunction(falseExpr, trueExpr, falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('false_true_error_isFalse', () => {
        expect(
          evaluate(andFunction(falseExpr, trueExpr, errorFilterExpr()))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('false_true_true_isFalse', () => {
        expect(
          evaluate(andFunction(falseExpr, trueExpr, trueExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('error_false_false_isFalse', () => {
        expect(
          evaluate(andFunction(errorFilterExpr(), falseExpr, falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('error_false_error_isFalse', () => {
        expect(
          evaluate(andFunction(errorFilterExpr(), falseExpr, errorFilterExpr()))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('error_false_true_isFalse', () => {
        expect(
          evaluate(andFunction(errorFilterExpr(), falseExpr, trueExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('error_error_false_isFalse', () => {
        expect(
          evaluate(andFunction(errorFilterExpr(), errorFilterExpr(), falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('error_error_error_isError', () => {
        expect(
          evaluate(
            andFunction(errorFilterExpr(), errorFilterExpr(), errorFilterExpr())
          )
        ).to.be.undefined;
      });

      it('error_error_true_isError', () => {
        expect(
          evaluate(andFunction(errorFilterExpr(), errorFilterExpr(), trueExpr))
        ).to.be.undefined;
      });

      it('error_true_false_isFalse', () => {
        expect(
          evaluate(andFunction(errorFilterExpr(), trueExpr, falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('error_true_error_isError', () => {
        expect(
          evaluate(andFunction(errorFilterExpr(), trueExpr, errorFilterExpr()))
        ).to.be.undefined;
      });

      it('error_true_true_isError', () => {
        expect(evaluate(andFunction(errorFilterExpr(), trueExpr, trueExpr))).to
          .be.undefined;
      });

      it('true_false_false_isFalse', () => {
        expect(
          evaluate(andFunction(trueExpr, falseExpr, falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('true_false_error_isFalse', () => {
        expect(
          evaluate(andFunction(trueExpr, falseExpr, errorFilterExpr()))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('true_false_true_isFalse', () => {
        expect(
          evaluate(andFunction(trueExpr, falseExpr, trueExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('true_error_false_isFalse', () => {
        expect(
          evaluate(andFunction(trueExpr, errorFilterExpr(), falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('true_error_error_isError', () => {
        expect(
          evaluate(andFunction(trueExpr, errorFilterExpr(), errorFilterExpr()))
        ).to.be.undefined;
      });

      it('true_error_true_isError', () => {
        expect(evaluate(andFunction(trueExpr, errorFilterExpr(), trueExpr))).to
          .be.undefined;
      });

      it('true_true_false_isFalse', () => {
        expect(
          evaluate(andFunction(trueExpr, trueExpr, falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('true_true_error_isError', () => {
        expect(evaluate(andFunction(trueExpr, trueExpr, errorFilterExpr()))).to
          .be.undefined;
      });

      it('true_true_true_isTrue', () => {
        expect(
          evaluate(andFunction(trueExpr, trueExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('nested_and', () => {
        const child = andFunction(trueExpr, falseExpr);
        const f = andFunction(child, trueExpr);
        expect(evaluate(f)).to.deep.equal(FALSE_VALUE);
      });

      it('multipleArguments', () => {
        expect(
          evaluate(andFunction(trueExpr, trueExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });
    }); // end describe('and')

    describe('cond', () => {
      it('trueCondition_returnsTrueCase', () => {
        const func = cond(trueExpr, Constant.of('true case'), errorExpr());
        expect(evaluate(func)?.stringValue).to.deep.equal('true case');
      });

      it('falseCondition_returnsFalseCase', () => {
        const func = cond(falseExpr, errorExpr(), Constant.of('false case'));
        expect(evaluate(func)?.stringValue).to.deep.equal('false case');
      });

      it('errorCondition_returnsFalseCase', () => {
        const func = cond(errorFilterExpr(), errorExpr(), Constant.of('false'));
        expect(evaluate(func)?.stringValue).to.deep.equal('false');
      });
    }); // end describe('cond')

    describe('eqAny', () => {
      it('valueFoundInArray', () => {
        expect(
          evaluate(
            eqAny(Constant.of('hello'), [
              Constant.of('hello'),
              Constant.of('world')
            ])
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('valueNotFoundInArray', () => {
        expect(
          evaluate(
            eqAny(Constant.of(4), [
              Constant.of(42),
              Constant.of('matang'),
              Constant.of(true)
            ])
          )
        ).to.deep.equal(FALSE_VALUE);
      });

      it('notEqAnyFunction_valueNotFoundInArray', () => {
        const child = eqAny(Constant.of(4), [
          Constant.of(42),
          Constant.of('matang'),
          Constant.of(true)
        ]);
        const f = not(child);
        expect(evaluate(f)).to.deep.equal(TRUE_VALUE);
      });

      it('equivalentNumerics', () => {
        expect(
          evaluate(
            eqAny(Constant.of(42), [
              Constant.of(42.0),
              Constant.of('matang'),
              Constant.of(true)
            ])
          )
        ).to.deep.equal(TRUE_VALUE);
        expect(
          evaluate(
            eqAny(Constant.of(42.0), [
              Constant.of(42),
              Constant.of('matang'),
              Constant.of(true)
            ])
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('bothInputTypeIsArray', () => {
        expect(
          evaluate(
            eqAny(Constant.of([1, 2, 3]), [
              Constant.of([1, 2, 3]),
              Constant.of([4, 5, 6]),
              Constant.of([7, 8, 9])
            ])
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('array_notFound_returnsError', () => {
        expect(evaluate(eqAny(Constant.of('matang'), [Field.of('not-exist')])))
          .to.be.undefined;
      });

      it('array_isEmpty_returnsFalse', () => {
        expect(evaluate(eqAny(Constant.of(42), []))).to.deep.equal(FALSE_VALUE);
      });

      it('search_reference_notFound_returnsError', () => {
        expect(
          evaluate(
            eqAny(Field.of('not-exist'), [
              Constant.of(42),
              Constant.of('matang'),
              Constant.of(true)
            ])
          )
        ).to.be.undefined;
      });

      it('search_isNull', () => {
        expect(
          evaluate(
            eqAny(Constant.of(null), [
              Constant.of(null),
              Constant.of(1),
              Constant.of('matang'),
              Constant.of(true)
            ])
          )
        ).to.deep.equal(TRUE_VALUE);
      });

      it('search_isNull_emptyValuesArray_returnsFalse', () => {
        expect(evaluate(eqAny(Constant.of(null), []))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('search_isNaN', () => {
        expect(
          evaluate(
            eqAny(Constant.of(NaN), [
              Constant.of(NaN),
              Constant.of(42),
              Constant.of(3.14)
            ])
          )
        ).to.deep.equal(FALSE_VALUE);
      });

      it('search_isEmpty_array_isEmpty', () => {
        expect(evaluate(eqAny(Constant.of([]), []))).to.deep.equal(FALSE_VALUE);
      });

      it('search_isEmpty_array_containsEmptyArray_returnsTrue', () => {
        expect(
          evaluate(eqAny(Constant.of([]), [Constant.of([])]))
        ).to.deep.equal(TRUE_VALUE);
      });

      it.skip('search_isMap', () => {
        expect(
          evaluate(
            eqAny(Constant.of(new Map<string, any>([['foo', 42]])), [
              Constant.of(123),
              Constant.of(new Map<string, any>([['foo', 123]])),
              Constant.of(new Map<string, any>([['bar', 42]])),
              Constant.of(new Map<string, any>([['foo', 42]]))
            ])
          )
        ).to.deep.equal(TRUE_VALUE);
      });
    }); // end describe('eqAny')

    describe('isNaN', () => {
      it('nan_returnsTrue', () => {
        expect(evaluate(isNan(Constant.of(NaN)))).to.deep.equal(TRUE_VALUE);
        expect(evaluate(isNan(Field.of('nanValue')))).to.deep.equal(TRUE_VALUE);
      });

      it('notNan_returnsFalse', () => {
        expect(evaluate(isNan(Constant.of(42.0)))).to.deep.equal(FALSE_VALUE);
        expect(evaluate(isNan(Constant.of(42)))).to.deep.equal(FALSE_VALUE);
      });

      it('isNotNan', () => {
        expect(evaluate(not(isNan(Constant.of(42.0))))).to.deep.equal(
          TRUE_VALUE
        );
        expect(evaluate(not(isNan(Constant.of(42))))).to.deep.equal(TRUE_VALUE);
      });

      it('otherNanRepresentations_returnsTrue', () => {
        const v1 = NaN; // In JS, any operation with NaN results in NaN
        expect(Number.isNaN(v1)).to.be.true;
        expect(evaluate(isNan(Constant.of(v1)))).to.deep.equal(TRUE_VALUE);

        expect(
          evaluate(
            isNan(
              add(
                Constant.of(Number.POSITIVE_INFINITY),
                Constant.of(Number.NEGATIVE_INFINITY)
              )
            )
          )
        ).to.deep.equal(TRUE_VALUE);

        expect(
          evaluate(isNan(add(Constant.of(NaN), Constant.of(1))))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('error_returnsError', () => {
        expect(evaluate(isNan(errorExpr()))).to.be.undefined;
      });

      it('null_returnsError', () => {
        expect(evaluate(isNan(Constant.of(null)))).to.be.undefined;
      });

      it('nonNumeric_returnsError', () => {
        expect(evaluate(isNan(Constant.of(true)))).to.be.undefined;
        expect(evaluate(isNan(Constant.of('abc')))).to.be.undefined;
      });
    }); // end describe('isNaN')

    describe('logicalMaximum', () => {
      it('numericType', () => {
        expectEqual(
          evaluate(
            logicalMaximum(
              Constant.of(1),
              logicalMaximum(Constant.of(2.0), Constant.of(3))
            )
          ),
          Constant.of(3),
          `logicalMaximum(1, logicalMaximum(2.0, 3))`
        );
      });

      it('stringType', () => {
        expectEqual(
          evaluate(
            logicalMaximum(
              logicalMaximum(Constant.of('a'), Constant.of('b')),
              Constant.of('c')
            )
          ),
          Constant.of('c'),
          `logicalMaximum(logicalMaximum('a', 'b'), 'c')`
        );
      });

      it('mixedType', () => {
        expectEqual(
          evaluate(
            logicalMaximum(
              Constant.of(1),
              logicalMaximum(Constant.of('1'), Constant.of(0))
            )
          ),
          Constant.of('1'),
          `logicalMaximum(1, logicalMaximum('1', 0))`
        );
      });

      it('onlyNullAndError_returnsNull', () => {
        expectEqual(
          evaluate(logicalMaximum(Constant.of(null), ERROR_VALUE)),
          Constant.of(null),
          `logicalMaximum(null, ERROR_VALUE)`
        );
      });

      it('nanAndNumbers', () => {
        expectEqual(
          evaluate(logicalMaximum(Constant.of(NaN), Constant.of(0))),
          Constant.of(0),
          `logicalMaximum(NaN, 0)`
        );
      });

      it('errorInput_skip', () => {
        expectEqual(
          evaluate(logicalMaximum(errorExpr(), Constant.of(1))),
          Constant.of(1),
          `logicalMaximum(ERROR_VALUE, 1)`
        );
      });

      it('nullInput_skip', () => {
        expectEqual(
          evaluate(logicalMaximum(Constant.of(null), Constant.of(1))),
          Constant.of(1),
          `logicalMaximum(null, 1)`
        );
      });

      it('equivalent_numerics', () => {
        expectEqual(
          evaluate(logicalMaximum(Constant.of(1), Constant.of(1.0))),
          Constant.of(1),
          `logicalMaximum(1, 1.0)`
        );
      });
    }); // end describe('logicalMaximum')

    describe('logicalMinimum', () => {
      it('numericType', () => {
        expectEqual(
          evaluate(
            logicalMinimum(
              Constant.of(1),
              logicalMinimum(Constant.of(2.0), Constant.of(3))
            )
          ),
          Constant.of(1),
          `logicalMinimum(1, logicalMinimum(2.0, 3))`
        );
      });

      it('stringType', () => {
        expectEqual(
          evaluate(
            logicalMinimum(
              logicalMinimum(Constant.of('a'), Constant.of('b')),
              Constant.of('c')
            )
          ),
          Constant.of('a'),
          `logicalMinimum(logicalMinimum('a', 'b'), 'c')`
        );
      });

      it('mixedType', () => {
        expectEqual(
          evaluate(
            logicalMinimum(
              Constant.of(1),
              logicalMinimum(Constant.of('1'), Constant.of(0))
            )
          ),
          Constant.of(0),
          `logicalMinimum(1, logicalMinimum('1', 0))`
        );
      });

      it('onlyNullAndError_returnsNull', () => {
        expectEqual(
          evaluate(logicalMinimum(Constant.of(null), ERROR_VALUE)),
          Constant.of(null),
          `logicalMinimum(null, ERROR_VALUE)`
        );
      });

      it('nanAndNumbers', () => {
        expectEqual(
          evaluate(logicalMinimum(Constant.of(NaN), Constant.of(0))),
          Constant.of(NaN),
          `logicalMinimum(NaN, 0)`
        );
      });

      it('errorInput_skip', () => {
        expectEqual(
          evaluate(logicalMinimum(errorExpr(), Constant.of(1))),
          Constant.of(1),
          `logicalMinimum(ERROR_VALUE, 1)`
        );
      });

      it('nullInput_skip', () => {
        expectEqual(
          evaluate(logicalMinimum(Constant.of(null), Constant.of(1))),
          Constant.of(1),
          `logicalMinimum(null, 1)`
        );
      });

      it('equivalent_numerics', () => {
        expectEqual(
          evaluate(logicalMinimum(Constant.of(1), Constant.of(1.0))),
          Constant.of(1),
          `logicalMinimum(1, 1.0)`
        );
      });
    }); // end describe('logicalMinimum')

    describe('not', () => {
      it('true_to_false', () => {
        expect(evaluate(not(Constant.of(1).eq(1)))).to.deep.equal(FALSE_VALUE);
      });

      it('false_to_true', () => {
        expect(evaluate(not(Constant.of(1).neq(1)))).to.deep.equal(TRUE_VALUE);
      });
    }); // end describe('not')

    describe('or', () => {
      it('false_false_isFalse', () => {
        expect(evaluate(orFunction(falseExpr, falseExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('false_error_isError', () => {
        expect(evaluate(orFunction(falseExpr, errorFilterExpr()))).to.be
          .undefined;
      });

      it('false_true_isTrue', () => {
        expect(evaluate(orFunction(falseExpr, trueExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('error_false_isError', () => {
        expect(evaluate(orFunction(errorFilterExpr(), falseExpr))).to.be
          .undefined;
      });

      it('error_error_isError', () => {
        expect(evaluate(orFunction(errorFilterExpr(), errorFilterExpr()))).to.be
          .undefined;
      });

      it('error_true_isTrue', () => {
        expect(evaluate(orFunction(errorFilterExpr(), trueExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('true_false_isTrue', () => {
        expect(evaluate(orFunction(trueExpr, falseExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('true_error_isTrue', () => {
        expect(evaluate(orFunction(trueExpr, errorFilterExpr()))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('true_true_isTrue', () => {
        expect(evaluate(orFunction(trueExpr, trueExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('false_false_false_isFalse', () => {
        expect(
          evaluate(orFunction(falseExpr, falseExpr, falseExpr))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('false_false_error_isError', () => {
        expect(evaluate(orFunction(falseExpr, falseExpr, errorFilterExpr()))).to
          .be.undefined;
      });

      it('false_false_true_isTrue', () => {
        expect(
          evaluate(orFunction(falseExpr, falseExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('false_error_false_isError', () => {
        expect(evaluate(orFunction(falseExpr, errorFilterExpr(), falseExpr))).to
          .be.undefined;
      });

      it('false_error_error_isError', () => {
        expect(
          evaluate(orFunction(falseExpr, errorFilterExpr(), errorFilterExpr()))
        ).to.be.undefined;
      });

      it('false_error_true_isTrue', () => {
        expect(
          evaluate(orFunction(falseExpr, errorFilterExpr(), trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('false_true_false_isTrue', () => {
        expect(
          evaluate(orFunction(falseExpr, trueExpr, falseExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('false_true_error_isTrue', () => {
        expect(
          evaluate(orFunction(falseExpr, trueExpr, errorFilterExpr()))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('false_true_true_isTrue', () => {
        expect(
          evaluate(orFunction(falseExpr, trueExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('error_false_false_isError', () => {
        expect(evaluate(orFunction(errorFilterExpr(), falseExpr, falseExpr))).to
          .be.undefined;
      });

      it('error_false_error_isError', () => {
        expect(
          evaluate(orFunction(errorFilterExpr(), falseExpr, errorFilterExpr()))
        ).to.be.undefined;
      });

      it('error_false_true_isTrue', () => {
        expect(
          evaluate(orFunction(errorFilterExpr(), falseExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('error_error_false_isError', () => {
        expect(
          evaluate(orFunction(errorFilterExpr(), errorFilterExpr(), falseExpr))
        ).to.be.undefined;
      });

      it('error_error_error_isError', () => {
        expect(
          evaluate(
            orFunction(errorFilterExpr(), errorFilterExpr(), errorFilterExpr())
          )
        ).to.be.undefined;
      });

      it('error_error_true_isTrue', () => {
        expect(
          evaluate(orFunction(errorFilterExpr(), errorFilterExpr(), trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('error_true_false_isTrue', () => {
        expect(
          evaluate(orFunction(errorFilterExpr(), trueExpr, falseExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('error_true_error_isTrue', () => {
        expect(
          evaluate(orFunction(errorFilterExpr(), trueExpr, errorFilterExpr()))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('error_true_true_isTrue', () => {
        expect(
          evaluate(orFunction(errorFilterExpr(), trueExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('true_false_false_isTrue', () => {
        expect(
          evaluate(orFunction(trueExpr, falseExpr, falseExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('true_false_error_isTrue', () => {
        expect(
          evaluate(orFunction(trueExpr, falseExpr, errorFilterExpr()))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('true_false_true_isTrue', () => {
        expect(
          evaluate(orFunction(trueExpr, falseExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('true_error_false_isTrue', () => {
        expect(
          evaluate(orFunction(trueExpr, errorFilterExpr(), falseExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('true_error_error_isTrue', () => {
        expect(
          evaluate(orFunction(trueExpr, errorFilterExpr(), errorFilterExpr()))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('true_error_true_isTrue', () => {
        expect(
          evaluate(orFunction(trueExpr, errorFilterExpr(), trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('true_true_false_isTrue', () => {
        expect(
          evaluate(orFunction(trueExpr, trueExpr, falseExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('true_true_error_isTrue', () => {
        expect(
          evaluate(orFunction(trueExpr, trueExpr, errorFilterExpr()))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('true_true_true_isTrue', () => {
        expect(
          evaluate(orFunction(trueExpr, trueExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('nested_or', () => {
        const child = orFunction(trueExpr, falseExpr);
        const f = orFunction(child, falseExpr);
        expect(evaluate(f)).to.deep.equal(TRUE_VALUE);
      });

      it('multipleArguments', () => {
        expect(
          evaluate(orFunction(trueExpr, falseExpr, trueExpr))
        ).to.deep.equal(TRUE_VALUE);
      });
    }); // end describe('or')

    describe('xor', () => {
      it('false_false_isFalse', () => {
        expect(evaluate(xor(falseExpr, falseExpr))).to.deep.equal(FALSE_VALUE);
      });

      it('false_error_isError', () => {
        expect(evaluate(xor(falseExpr, errorFilterExpr()))).to.be.undefined;
      });

      it('false_true_isTrue', () => {
        expect(evaluate(xor(falseExpr, trueExpr))).to.deep.equal(TRUE_VALUE);
      });

      it('error_false_isError', () => {
        expect(evaluate(xor(errorFilterExpr(), falseExpr))).to.be.undefined;
      });

      it('error_error_isError', () => {
        expect(evaluate(xor(errorFilterExpr(), errorFilterExpr()))).to.be
          .undefined;
      });

      it('error_true_isError', () => {
        expect(evaluate(xor(errorFilterExpr(), trueExpr))).to.be.undefined;
      });

      it('true_false_isTrue', () => {
        expect(evaluate(xor(trueExpr, falseExpr))).to.deep.equal(TRUE_VALUE);
      });

      it('true_error_isError', () => {
        expect(evaluate(xor(trueExpr, errorFilterExpr()))).to.be.undefined;
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
        expect(evaluate(xor(falseExpr, falseExpr, errorFilterExpr()))).to.be
          .undefined;
      });

      it('false_false_true_isTrue', () => {
        expect(evaluate(xor(falseExpr, falseExpr, trueExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('false_error_false_isError', () => {
        expect(evaluate(xor(falseExpr, errorFilterExpr(), falseExpr))).to.be
          .undefined;
      });

      it('false_error_error_isError', () => {
        expect(evaluate(xor(falseExpr, errorFilterExpr(), errorFilterExpr())))
          .to.be.undefined;
      });

      it('false_error_true_isError', () => {
        expect(evaluate(xor(falseExpr, errorFilterExpr(), trueExpr))).to.be
          .undefined;
      });

      it('false_true_false_isTrue', () => {
        expect(evaluate(xor(falseExpr, trueExpr, falseExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('false_true_error_isError', () => {
        expect(evaluate(xor(falseExpr, trueExpr, errorFilterExpr()))).to.be
          .undefined;
      });

      it('false_true_true_isFalse', () => {
        expect(evaluate(xor(falseExpr, trueExpr, trueExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('error_false_false_isError', () => {
        expect(evaluate(xor(errorFilterExpr(), falseExpr, falseExpr))).to.be
          .undefined;
      });

      it('error_false_error_isError', () => {
        expect(evaluate(xor(errorFilterExpr(), falseExpr, errorFilterExpr())))
          .to.be.undefined;
      });

      it('error_false_true_isError', () => {
        expect(evaluate(xor(errorFilterExpr(), falseExpr, trueExpr))).to.be
          .undefined;
      });

      it('error_error_false_isError', () => {
        expect(evaluate(xor(errorFilterExpr(), errorFilterExpr(), falseExpr)))
          .to.be.undefined;
      });

      it('error_error_error_isError', () => {
        expect(
          evaluate(xor(errorFilterExpr(), errorFilterExpr(), errorFilterExpr()))
        ).to.be.undefined;
      });

      it('error_error_true_isError', () => {
        expect(evaluate(xor(errorFilterExpr(), errorFilterExpr(), trueExpr))).to
          .be.undefined;
      });

      it('error_true_false_isError', () => {
        expect(evaluate(xor(errorFilterExpr(), trueExpr, falseExpr))).to.be
          .undefined;
      });

      it('error_true_error_isError', () => {
        expect(evaluate(xor(errorFilterExpr(), trueExpr, errorFilterExpr()))).to
          .be.undefined;
      });

      it('error_true_true_isError', () => {
        expect(evaluate(xor(errorFilterExpr(), trueExpr, trueExpr))).to.be
          .undefined;
      });

      it('true_false_false_isTrue', () => {
        expect(evaluate(xor(trueExpr, falseExpr, falseExpr))).to.deep.equal(
          TRUE_VALUE
        );
      });

      it('true_false_error_isError', () => {
        expect(evaluate(xor(trueExpr, falseExpr, errorFilterExpr()))).to.be
          .undefined;
      });

      it('true_false_true_isFalse', () => {
        expect(evaluate(xor(trueExpr, falseExpr, trueExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('true_error_false_isError', () => {
        expect(evaluate(xor(trueExpr, errorFilterExpr(), falseExpr))).to.be
          .undefined;
      });

      it('true_error_error_isError', () => {
        expect(evaluate(xor(trueExpr, errorFilterExpr(), errorFilterExpr()))).to
          .be.undefined;
      });

      it('true_error_true_isError', () => {
        expect(evaluate(xor(trueExpr, errorFilterExpr(), trueExpr))).to.be
          .undefined;
      });

      it('true_true_false_isFalse', () => {
        expect(evaluate(xor(trueExpr, trueExpr, falseExpr))).to.deep.equal(
          FALSE_VALUE
        );
      });

      it('true_true_error_isError', () => {
        expect(evaluate(xor(trueExpr, trueExpr, errorFilterExpr()))).to.be
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
    // describe('mapGet', () => {
    //   it('get_existingKey_returnsValue', () => {
    //     const map = new Map<string, any>([
    //       ['a', 1],
    //       ['b', 2],
    //       ['c', 3],
    //     ]);
    //     expect(
    //       evaluate(mapGet(Constant.of(map), Constant.of('b')))
    //     ).to.deep.equal(Constant.of(2));
    //   });
    //
    //   it('get_missingKey_returnsUnset', () => {
    //     const map = new Map<string, any>([
    //       ['a', 1],
    //       ['b', 2],
    //       ['c', 3],
    //     ]);
    //     expect(
    //       evaluate(mapGet(Constant.of(map), Constant.of('d')))
    //     ).to.deep.equal(UNSET_VALUE);
    //   });
    //
    //   it('get_emptyMap_returnsUnset', () => {
    //     const map = new Map<string, any>();
    //     expect(
    //       evaluate(mapGet(Constant.of(map), Constant.of('d')))
    //     ).to.deep.equal(UNSET_VALUE);
    //   });
    //
    //   it('get_wrongMapType_returnsError', () => {
    //     const map = 'not a map';
    //     expect(evaluate(mapGet(Constant.of(map), Constant.of('d')))).to.be
    //       .undefined;
    //   });
    //
    //   it('get_wrongKeyType_returnsError', () => {
    //     const map = new Map<string, any>([
    //       ['a', 1],
    //       ['b', 2],
    //       ['c', 3],
    //     ]);
    //     expect(evaluate(mapGet(Constant.of(map), Constant.of(42)))).to.be.undefined;
    //   });
    // }); // end describe('mapGet')
  });

  describe('String Functions', () => {
    describe('byteLength', () => {
      it('emptyString', () => {
        expectEqual(evaluate(byteLength(Constant.of(''))), Constant.of(0));
      });

      it('emptyByte', () => {
        expectEqual(
          evaluate(
            byteLength(Constant.of(Bytes.fromUint8Array(new Uint8Array())))
          ),
          Constant.of(0)
        );
      });

      it('nonStringOrBytes_returnsError', () => {
        expect(evaluate(byteLength(Constant.of(123)))).to.be.undefined;
      });

      it('highSurrogateOnly', () => {
        const s = '\uD83C'; // high surrogate, missing low surrogate
        expect(evaluate(byteLength(Constant.of(s)))).to.be.undefined;
      });

      it('lowSurrogateOnly', () => {
        const s = '\uDF53'; // low surrogate, missing high surrogate
        expect(evaluate(byteLength(Constant.of(s)))).to.be.undefined;
      });

      it('lowAndHighSurrogate_swapped', () => {
        const s = '\uDF53\uD83C'; // swapped high with low, invalid sequence
        expect(evaluate(byteLength(Constant.of(s)))).to.be.undefined;
      });

      it('ascii', () => {
        expectEqual(evaluate(byteLength(Constant.of('abc'))), Constant.of(3));
        expectEqual(evaluate(byteLength(Constant.of('1234'))), Constant.of(4));
        expectEqual(
          evaluate(byteLength(Constant.of('abc123!@'))),
          Constant.of(8)
        );
      });

      it('largeString', () => {
        expectEqual(
          evaluate(byteLength(Constant.of('a'.repeat(1500)))),
          Constant.of(1500)
        );
        expectEqual(
          evaluate(byteLength(Constant.of('ab'.repeat(1500)))),
          Constant.of(3000)
        );
      });

      it('twoBytes_perCharacter', () => {
        expectEqual(
          evaluate(byteLength(Constant.of('éçñöü'))),
          Constant.of(10)
        );
        expectEqual(
          evaluate(
            byteLength(
              Constant.of(
                Bytes.fromUint8Array(new TextEncoder().encode('éçñöü'))
              )
            )
          ),
          Constant.of(10)
        );
      });

      it('threeBytes_perCharacter', () => {
        expectEqual(
          evaluate(byteLength(Constant.of('你好世界'))),
          Constant.of(12)
        );
        expectEqual(
          evaluate(
            byteLength(
              Constant.of(
                Bytes.fromUint8Array(new TextEncoder().encode('你好世界'))
              )
            )
          ),
          Constant.of(12)
        );
      });

      it('fourBytes_perCharacter', () => {
        expectEqual(evaluate(byteLength(Constant.of('🀘🂡'))), Constant.of(8));
        expectEqual(
          evaluate(
            byteLength(
              Constant.of(Bytes.fromUint8Array(new TextEncoder().encode('🀘🂡')))
            )
          ),
          Constant.of(8)
        );
      });

      it('mixOfDifferentEncodedLengths', () => {
        expectEqual(
          evaluate(byteLength(Constant.of('aé好🂡'))),
          Constant.of(10)
        );
        expectEqual(
          evaluate(
            byteLength(
              Constant.of(
                Bytes.fromUint8Array(new TextEncoder().encode('aé好🂡'))
              )
            )
          ),
          Constant.of(10)
        );
      });
    }); // end describe('byteLength')

    describe('charLength', () => {
      it('emptyString', () => {
        expectEqual(evaluate(charLength(Constant.of(''))), Constant.of(0));
      });

      it('bytesType_returnsError', () => {
        expect(
          evaluate(
            charLength(
              Constant.of(Bytes.fromUint8Array(new TextEncoder().encode('abc')))
            )
          )
        ).to.be.undefined;
      });

      it('baseCase_bmp', () => {
        expectEqual(evaluate(charLength(Constant.of('abc'))), Constant.of(3));
        expectEqual(evaluate(charLength(Constant.of('1234'))), Constant.of(4));
        expectEqual(
          evaluate(charLength(Constant.of('abc123!@'))),
          Constant.of(8)
        );
        expectEqual(
          evaluate(charLength(Constant.of('你好世界'))),
          Constant.of(4)
        );
        expectEqual(
          evaluate(charLength(Constant.of('cafétéria'))),
          Constant.of(9)
        );
        expectEqual(evaluate(charLength(Constant.of('абвгд'))), Constant.of(5));
        expectEqual(
          evaluate(charLength(Constant.of('¡Hola! ¿Cómo estás?'))),
          Constant.of(19)
        );
        expectEqual(evaluate(charLength(Constant.of('☺'))), Constant.of(1));
      });

      it('spaces', () => {
        expectEqual(evaluate(charLength(Constant.of(''))), Constant.of(0));
        expectEqual(evaluate(charLength(Constant.of(' '))), Constant.of(1));
        expectEqual(evaluate(charLength(Constant.of('  '))), Constant.of(2));
        expectEqual(evaluate(charLength(Constant.of('a b'))), Constant.of(3));
      });

      it('specialCharacters', () => {
        expectEqual(evaluate(charLength(Constant.of('\n'))), Constant.of(1));
        expectEqual(evaluate(charLength(Constant.of('\t'))), Constant.of(1));
        expectEqual(evaluate(charLength(Constant.of('\\'))), Constant.of(1));
      });

      it('bmp_smp_mix', () => {
        const s = 'Hello\uD83D\uDE0A'; // Hello followed by emoji
        expectEqual(evaluate(charLength(Constant.of(s))), Constant.of(6));
      });

      it('smp', () => {
        const s = '\uD83C\uDF53\uD83C\uDF51'; // a strawberry and peach emoji
        expectEqual(evaluate(charLength(Constant.of(s))), Constant.of(2));
      });

      it('highSurrogateOnly', () => {
        const s = '\uD83C'; // high surrogate, missing low surrogate
        expectEqual(evaluate(charLength(Constant.of(s))), Constant.of(1));
      });

      it('lowSurrogateOnly', () => {
        const s = '\uDF53'; // low surrogate, missing high surrogate
        expectEqual(evaluate(charLength(Constant.of(s))), Constant.of(1));
      });

      it('lowAndHighSurrogate_swapped', () => {
        const s = '\uDF53\uD83C'; // swapped high with low, invalid sequence
        expectEqual(evaluate(charLength(Constant.of(s))), Constant.of(2));
      });

      it('largeString', () => {
        expectEqual(
          evaluate(charLength(Constant.of('a'.repeat(1500)))),
          Constant.of(1500)
        );
        expectEqual(
          evaluate(charLength(Constant.of('ab'.repeat(1500)))),
          Constant.of(3000)
        );
      });
    }); // end describe('charLength')

    describe('concat', () => {
      it('multipleStringChildren_returnsCombination', () => {
        expectEqual(
          evaluate(
            strConcat(Constant.of('foo'), Constant.of(' '), Constant.of('bar'))
          ),
          Constant.of('foo bar'),
          `strConcat('foo', ' ', 'bar')`
        );
      });

      it('multipleNonStringChildren_returnsError', () => {
        expect(
          evaluate(
            strConcat(Constant.of('foo'), Constant.of(42), Constant.of('bar'))
          )
        ).to.be.undefined;
      });

      it('multipleCalls', () => {
        const func = strConcat(
          Constant.of('foo'),
          Constant.of(' '),
          Constant.of('bar')
        );
        expectEqual(evaluate(func), Constant.of('foo bar'), 'First call');
        expectEqual(evaluate(func), Constant.of('foo bar'), 'Second call');
        expectEqual(evaluate(func), Constant.of('foo bar'), 'Third call');
      });

      it('largeNumberOfInputs', () => {
        const args = [];
        for (let i = 0; i < 500; i++) {
          args.push(Constant.of('a'));
        }
        expectEqual(
          evaluate(strConcat(args[0], ...args.slice(1))),
          Constant.of('a'.repeat(500))
        );
      });

      it('largeStrings', () => {
        const func = strConcat(
          Constant.of('a'.repeat(500)),
          Constant.of('b'.repeat(500)),
          Constant.of('c'.repeat(500))
        );
        expectEqual(
          evaluate(func),
          Constant.of('a'.repeat(500) + 'b'.repeat(500) + 'c'.repeat(500))
        );
      });
    }); // end describe('concat')

    describe('endsWith', () => {
      it('get_nonStringValue_isError', () => {
        expect(evaluate(endsWith(Constant.of(42), Constant.of('search')))).to.be
          .undefined;
      });

      it('get_nonStringSuffix_isError', () => {
        expect(evaluate(endsWith(Constant.of('search'), Constant.of(42)))).to.be
          .undefined;
      });

      it('get_emptyInputs_returnsTrue', () => {
        expect(
          evaluate(endsWith(Constant.of(''), Constant.of('')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('get_emptyValue_returnsFalse', () => {
        expect(
          evaluate(endsWith(Constant.of(''), Constant.of('v')))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('get_emptySuffix_returnsTrue', () => {
        expect(
          evaluate(endsWith(Constant.of('value'), Constant.of('')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('get_returnsTrue', () => {
        expect(
          evaluate(endsWith(Constant.of('search'), Constant.of('rch')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('get_returnsFalse', () => {
        expect(
          evaluate(endsWith(Constant.of('search'), Constant.of('rcH')))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('get_largeSuffix_returnsFalse', () => {
        expect(
          evaluate(
            endsWith(Constant.of('val'), Constant.of('a very long suffix'))
          )
        ).to.deep.equal(FALSE_VALUE);
      });
    }); // end describe('endsWith')

    describe('like', () => {
      it('get_nonStringLike_isError', () => {
        expect(evaluate(like(Constant.of(42), Constant.of('search')))).to.be
          .undefined;
      });

      it('get_nonStringValue_isError', () => {
        expect(evaluate(like(Constant.of('ear'), Constant.of(42)))).to.be
          .undefined;
      });

      it('get_staticLike', () => {
        const func = like(Constant.of('yummy food'), Constant.of('%food'));
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_emptySearchString', () => {
        const func = like(Constant.of(''), Constant.of('%hi%'));
        expect(evaluate(func)).to.deep.equal(FALSE_VALUE);
      });

      it('get_emptyLike', () => {
        const func = like(Constant.of('yummy food'), Constant.of(''));
        expect(evaluate(func)).to.deep.equal(FALSE_VALUE);
      });

      it('get_escapedLike', () => {
        const func = like(Constant.of('yummy food??'), Constant.of('%food??'));
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_dynamicLike', () => {
        const func = like(Constant.of('yummy food'), Field.of('regex'));
        expect(evaluate(func, { regex: 'yummy%' })).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func, { regex: 'food%' })).to.deep.equal(FALSE_VALUE);
        expect(evaluate(func, { regex: 'yummy_food' })).to.deep.equal(
          TRUE_VALUE
        );
      });
    }); // end describe('like')

    describe('regexContains', () => {
      it('get_nonStringRegex_isError', () => {
        expect(evaluate(regexContains(Constant.of(42), Constant.of('search'))))
          .to.be.undefined;
      });

      it('get_nonStringValue_isError', () => {
        expect(evaluate(regexContains(Constant.of('ear'), Constant.of(42)))).to
          .be.undefined;
      });

      it('get_invalidRegex_isError', () => {
        const func = regexContains(
          Constant.of('abcabc'),
          Constant.of('(abc)\\1')
        );
        expect(evaluate(func)).to.be.undefined;
        expect(evaluate(func)).to.be.undefined;
        expect(evaluate(func)).to.be.undefined;
      });

      it('get_staticRegex', () => {
        const func = regexContains(
          Constant.of('yummy food'),
          Constant.of('.*oo.*')
        );
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_subString_literal', () => {
        const func = regexContains(
          Constant.of('yummy good food'),
          Constant.of('good')
        );
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_subString_regex', () => {
        const func = regexContains(
          Constant.of('yummy good food'),
          Constant.of('go*d')
        );
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_dynamicRegex', () => {
        const func = regexContains(
          Constant.of('yummy food'),
          Field.of('regex')
        );
        expect(evaluate(func, { regex: '^yummy.*' })).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func, { regex: 'fooood$' })).to.deep.equal(FALSE_VALUE);
        expect(evaluate(func, { regex: '.*' })).to.deep.equal(TRUE_VALUE);
      });
    }); // end describe('regexContains')

    describe('regexMatch', () => {
      it('get_nonStringRegex_isError', () => {
        expect(evaluate(regexMatch(Constant.of(42), Constant.of('search')))).to
          .be.undefined;
      });

      it('get_nonStringValue_isError', () => {
        expect(evaluate(regexMatch(Constant.of('ear'), Constant.of(42)))).to.be
          .undefined;
      });

      it('get_invalidRegex_isError', () => {
        const func = regexMatch(Constant.of('abcabc'), Constant.of('(abc)\\1'));
        expect(evaluate(func)).to.be.undefined;
        expect(evaluate(func)).to.be.undefined;
        expect(evaluate(func)).to.be.undefined;
      });

      it('get_staticRegex', () => {
        const func = regexMatch(
          Constant.of('yummy food'),
          Constant.of('.*oo.*')
        );
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func)).to.deep.equal(TRUE_VALUE);
      });

      it('get_subString_literal', () => {
        const func = regexMatch(
          Constant.of('yummy good food'),
          Constant.of('good')
        );
        expect(evaluate(func)).to.deep.equal(FALSE_VALUE);
      });

      it('get_subString_regex', () => {
        const func = regexMatch(
          Constant.of('yummy good food'),
          Constant.of('go*d')
        );
        expect(evaluate(func)).to.deep.equal(FALSE_VALUE);
      });

      it('get_dynamicRegex', () => {
        const func = regexMatch(Constant.of('yummy food'), Field.of('regex'));
        expect(evaluate(func, { regex: '^yummy.*' })).to.deep.equal(TRUE_VALUE);
        expect(evaluate(func, { regex: 'fooood$' })).to.deep.equal(FALSE_VALUE);
        expect(evaluate(func, { regex: '.*' })).to.deep.equal(TRUE_VALUE);
      });
    }); // end describe('regexMatch')

    describe('startsWith', () => {
      it('get_nonStringValue_isError', () => {
        expect(evaluate(startsWith(Constant.of(42), Constant.of('search')))).to
          .be.undefined;
      });

      it('get_nonStringPrefix_isError', () => {
        expect(evaluate(startsWith(Constant.of('search'), Constant.of(42)))).to
          .be.undefined;
      });

      it('get_emptyInputs_returnsTrue', () => {
        expect(
          evaluate(startsWith(Constant.of(''), Constant.of('')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('get_emptyValue_returnsFalse', () => {
        expect(
          evaluate(startsWith(Constant.of(''), Constant.of('v')))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('get_emptyPrefix_returnsTrue', () => {
        expect(
          evaluate(startsWith(Constant.of('value'), Constant.of('')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('get_returnsTrue', () => {
        expect(
          evaluate(startsWith(Constant.of('search'), Constant.of('sea')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('get_returnsFalse', () => {
        expect(
          evaluate(startsWith(Constant.of('search'), Constant.of('Sea')))
        ).to.deep.equal(FALSE_VALUE);
      });

      it('get_largePrefix_returnsFalse', () => {
        expect(
          evaluate(
            startsWith(Constant.of('val'), Constant.of('a very long prefix'))
          )
        ).to.deep.equal(FALSE_VALUE);
      });
    }); // end describe('startsWith')

    describe('strContains', () => {
      it('value_nonString_isError', () => {
        expect(evaluate(strContains(Constant.of(42), Constant.of('value')))).to
          .be.undefined;
      });

      it('subString_nonString_isError', () => {
        expect(
          evaluate(strContains(Constant.of('search space'), Constant.of(42)))
        ).to.be.undefined;
      });

      it('execute_true', () => {
        expect(
          evaluate(strContains(Constant.of('abc'), Constant.of('c')))
        ).to.deep.equal(TRUE_VALUE);
        expect(
          evaluate(strContains(Constant.of('abc'), Constant.of('bc')))
        ).to.deep.equal(TRUE_VALUE);
        expect(
          evaluate(strContains(Constant.of('abc'), Constant.of('abc')))
        ).to.deep.equal(TRUE_VALUE);
        expect(
          evaluate(strContains(Constant.of('abc'), Constant.of('')))
        ).to.deep.equal(TRUE_VALUE);
        expect(
          evaluate(strContains(Constant.of(''), Constant.of('')))
        ).to.deep.equal(TRUE_VALUE);
        expect(
          evaluate(strContains(Constant.of('☃☃☃'), Constant.of('☃')))
        ).to.deep.equal(TRUE_VALUE);
      });

      it('execute_false', () => {
        expect(
          evaluate(strContains(Constant.of('abc'), Constant.of('abcd')))
        ).to.deep.equal(FALSE_VALUE);
        expect(
          evaluate(strContains(Constant.of('abc'), Constant.of('d')))
        ).to.deep.equal(FALSE_VALUE);
        expect(
          evaluate(strContains(Constant.of(''), Constant.of('a')))
        ).to.deep.equal(FALSE_VALUE);
        expect(
          evaluate(strContains(Constant.of(''), Constant.of('abcde')))
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
              Constant.of(new VectorValue([0.0, 1.0])),
              Constant.of(new VectorValue([5.0, 100.0]))
            )
          )?.doubleValue
        ).to.be.closeTo(0.0012476611221553524, 1e-10); // Use closeTo for floating-point comparison
      });

      it('zeroVector_returnsError', () => {
        expect(
          evaluate(
            cosineDistance(
              Constant.of(new VectorValue([0.0, 0.0])),
              Constant.of(new VectorValue([5.0, 100.0]))
            )
          )
        ).to.be.undefined;
      });

      it('emptyVectors_returnsError', () => {
        expect(
          evaluate(
            cosineDistance(
              Constant.of(new VectorValue([])),
              Constant.of(new VectorValue([]))
            )
          )
        ).to.be.undefined;
      });

      it('differentVectorLengths_returnError', () => {
        expect(
          evaluate(
            cosineDistance(
              Constant.of(new VectorValue([1.0])),
              Constant.of(new VectorValue([2.0, 3.0]))
            )
          )
        ).to.be.undefined;
      });

      it('wrongInputType_returnError', () => {
        expect(
          evaluate(
            cosineDistance(
              Constant.of(new VectorValue([1.0, 2.0])),
              Constant.of([3.0, 4.0])
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
              Constant.of(new VectorValue([2.0, 1.0])),
              Constant.of(new VectorValue([1.0, 5.0]))
            )
          )!.doubleValue
        ).to.equal(7.0);
      });

      it('orthogonalVectors', () => {
        expect(
          evaluate(
            dotProduct(
              Constant.of(new VectorValue([1.0, 0.0])),
              Constant.of(new VectorValue([0.0, 5.0]))
            )
          )?.doubleValue
        ).to.deep.equal(0.0);
      });

      it('zeroVector_returnsZero', () => {
        expect(
          evaluate(
            dotProduct(
              Constant.of(new VectorValue([0.0, 0.0])),
              Constant.of(new VectorValue([5.0, 100.0]))
            )
          )?.doubleValue
        ).to.equal(0.0);
      });

      it('emptyVectors_returnsZero', () => {
        expect(
          evaluate(
            dotProduct(
              Constant.of(new VectorValue([])),
              Constant.of(new VectorValue([]))
            )
          )?.doubleValue
        ).to.equal(0.0);
      });

      it('differentVectorLengths_returnError', () => {
        expect(
          evaluate(
            dotProduct(
              Constant.of(new VectorValue([1.0])),
              Constant.of(new VectorValue([2.0, 3.0]))
            )
          )
        ).to.be.undefined;
      });

      it('wrongInputType_returnError', () => {
        expect(
          evaluate(
            dotProduct(
              Constant.of(new VectorValue([1.0, 2.0])),
              Constant.of([3.0, 4.0])
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
              Constant.of(new VectorValue([0.0, 0.0])),
              Constant.of(new VectorValue([3.0, 4.0]))
            )
          )?.doubleValue
        ).to.equal(5.0);
      });

      it('zeroVector', () => {
        expect(
          evaluate(
            euclideanDistance(
              Constant.of(new VectorValue([0.0, 0.0])),
              Constant.of(new VectorValue([0.0, 0.0]))
            )
          )?.doubleValue
        ).to.equal(0.0);
      });

      it('emptyVectors', () => {
        expect(
          evaluate(
            euclideanDistance(
              Constant.of(new VectorValue([])),
              Constant.of(new VectorValue([]))
            )
          )?.doubleValue
        ).to.equal(0.0);
      });

      it('differentVectorLengths_returnError', () => {
        expect(
          evaluate(
            euclideanDistance(
              Constant.of(new VectorValue([1.0])),
              Constant.of(new VectorValue([2.0, 3.0]))
            )
          )
        ).to.be.undefined;
      });

      it('wrongInputType_returnError', () => {
        expect(
          evaluate(
            euclideanDistance(
              Constant.of(new VectorValue([1.0, 2.0])),
              Constant.of([3.0, 4.0])
            )
          )
        ).to.be.undefined;
      });
    }); // end describe('euclideanDistance')

    describe('vectorLength', () => {
      it('length', () => {
        expectEqual(
          evaluate(vectorLength(Constant.of(new VectorValue([0.0, 1.0])))),
          Constant.of(2)
        );
      });

      it('emptyVector', () => {
        expectEqual(
          evaluate(vectorLength(Constant.of(new VectorValue([])))),
          Constant.of(0)
        );
      });

      it('zeroVector', () => {
        expectEqual(
          evaluate(vectorLength(Constant.of(new VectorValue([0.0])))),
          Constant.of(1)
        );
      });

      it('notVectorType_returnsError', () => {
        expect(evaluate(vectorLength(Constant.of([1])))).to.be.undefined;
        expect(evaluate(vectorLength(Constant.of('notAnArray')))).to.be
          .undefined;
      });
    }); // end describe('vectorLength')
  }); // end describe('Vector Functions')
});
