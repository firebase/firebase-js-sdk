// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { RE2JS } from 're2js';

import {
  Field,
  Constant,
  Expr,
  FunctionExpr,
  AggregateFunction,
  ListOfExprs,
  isNan,
  isError
} from '../lite-api/expressions';
import { Timestamp } from '../lite-api/timestamp';
import {
  CREATE_TIME_NAME,
  DOCUMENT_KEY_NAME,
  UPDATE_TIME_NAME
} from '../model/path';
import {
  FALSE_VALUE,
  getVectorValue,
  isArray,
  isBoolean,
  isBytes,
  isDouble,
  isInteger,
  isMapValue,
  isNanValue,
  isNullValue,
  isNumber,
  isString,
  isTimestampValue,
  isVectorValue,
  MIN_VALUE,
  TRUE_VALUE,
  typeOrder,
  valueCompare,
  valueEquals as valueEqualsWithOptions
} from '../model/values';
import {
  ArrayValue,
  Value,
  Timestamp as ProtoTimestamp,
  LatLng,
  MapValue
} from '../protos/firestore_proto_api';
import { fromTimestamp, toName, toVersion } from '../remote/serializer';
import { hardAssert } from '../util/assert';
import { logWarn } from '../util/log';
import { isNegativeZero } from '../util/types';

import { EvaluationContext, PipelineInputOutput } from './pipeline_run';
import { objectSize } from '../util/obj';

export type EvaluateResultType =
  | 'ERROR'
  | 'UNSET'
  | 'NULL'
  | 'BOOLEAN'
  | 'INT'
  | 'DOUBLE'
  | 'TIMESTAMP'
  | 'STRING'
  | 'BYTES'
  | 'REFERENCE'
  | 'GEO_POINT'
  | 'ARRAY'
  | 'MAP'
  | 'FIELD_REFERENCE'
  | 'VECTOR';

export class EvaluateResult {
  private constructor(
    readonly type: EvaluateResultType,
    readonly value?: Value
  ) {}

  static newError(): EvaluateResult {
    return new EvaluateResult('ERROR', undefined);
  }

  static newUnset(): EvaluateResult {
    return new EvaluateResult('UNSET', undefined);
  }

  static newNull(): EvaluateResult {
    return new EvaluateResult('NULL', MIN_VALUE);
  }

  static newValue(value: Value): EvaluateResult {
    if (isNullValue(value)) {
      return new EvaluateResult('NULL', MIN_VALUE);
    } else if (isBoolean(value)) {
      return new EvaluateResult('BOOLEAN', value);
    } else if (isInteger(value)) {
      return new EvaluateResult('INT', value);
    } else if (isDouble(value)) {
      return new EvaluateResult('DOUBLE', value);
    } else if (isTimestampValue(value)) {
      return new EvaluateResult('TIMESTAMP', value);
    } else if (isString(value)) {
      return new EvaluateResult('STRING', value);
    } else if (isBytes(value)) {
      return new EvaluateResult('BYTES', value);
    } else if (value.referenceValue) {
      return new EvaluateResult('REFERENCE', value);
    } else if (value.geoPointValue) {
      return new EvaluateResult('GEO_POINT', value);
    } else if (isArray(value)) {
      return new EvaluateResult('ARRAY', value);
    } else if (isVectorValue(value)) {
      // vector value must be before map value
      return new EvaluateResult('VECTOR', value);
    } else if (isMapValue(value)) {
      return new EvaluateResult('MAP', value);
    } else {
      return new EvaluateResult('ERROR', undefined);
    }
  }

  isErrorOrUnset(): boolean {
    return this.type === 'ERROR' || this.type === 'UNSET';
  }

  isNull(): boolean {
    return this.type === 'NULL';
  }
}

export function valueOrUndefined(value: EvaluateResult): Value | undefined {
  if (value.isErrorOrUnset()) {
    return undefined;
  }
  return value.value!;
}

export interface EvaluableExpr {
  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult;
}

export function toEvaluable<T extends Expr>(expr: T): EvaluableExpr {
  if (expr instanceof Field) {
    return new CoreField(expr);
  } else if (expr instanceof Constant) {
    return new CoreConstant(expr);
  } else if (expr instanceof ListOfExprs) {
    return new CoreListOfExprs(expr);
  } else if (expr.exprType === 'Function') {
    const functionExpr = expr as unknown as FunctionExpr;
    if (functionExpr.name === 'add') {
      return new CoreAdd(functionExpr);
    } else if (functionExpr.name === 'subtract') {
      return new CoreSubtract(functionExpr);
    } else if (functionExpr.name === 'multiply') {
      return new CoreMultiply(functionExpr);
    } else if (functionExpr.name === 'divide') {
      return new CoreDivide(functionExpr);
    } else if (functionExpr.name === 'mod') {
      return new CoreMod(functionExpr);
    } else if (functionExpr.name === 'and') {
      return new CoreAnd(functionExpr);
    } else if (functionExpr.name === 'eq') {
      return new CoreEq(functionExpr);
    } else if (functionExpr.name === 'neq') {
      return new CoreNeq(functionExpr);
    } else if (functionExpr.name === 'lt') {
      return new CoreLt(functionExpr);
    } else if (functionExpr.name === 'lte') {
      return new CoreLte(functionExpr);
    } else if (functionExpr.name === 'gt') {
      return new CoreGt(functionExpr);
    } else if (functionExpr.name === 'gte') {
      return new CoreGte(functionExpr);
    } else if (functionExpr.name === 'array_concat') {
      return new CoreArrayConcat(functionExpr);
    } else if (functionExpr.name === 'array_reverse') {
      return new CoreArrayReverse(functionExpr);
    } else if (functionExpr.name === 'array_contains') {
      return new CoreArrayContains(functionExpr);
    } else if (functionExpr.name === 'array_contains_all') {
      return new CoreArrayContainsAll(functionExpr);
    } else if (functionExpr.name === 'array_contains_any') {
      return new CoreArrayContainsAny(functionExpr);
    } else if (functionExpr.name === 'array_length') {
      return new CoreArrayLength(functionExpr);
    } else if (functionExpr.name === 'array_element') {
      return new CoreArrayElement(functionExpr);
    } else if (functionExpr.name === 'eq_any') {
      return new CoreEqAny(functionExpr);
    } else if (functionExpr.name === 'not_eq_any') {
      return new CoreNotEqAny(functionExpr);
    } else if (functionExpr.name === 'is_nan') {
      return new CoreIsNan(functionExpr);
    } else if (functionExpr.name === 'is_not_nan') {
      return new CoreIsNotNan(functionExpr);
    } else if (functionExpr.name === 'is_null') {
      return new CoreIsNull(functionExpr);
    } else if (functionExpr.name === 'is_not_null') {
      return new CoreIsNotNull(functionExpr);
    } else if (functionExpr.name === 'exists') {
      return new CoreExists(functionExpr);
    } else if (functionExpr.name === 'not') {
      return new CoreNot(functionExpr);
    } else if (functionExpr.name === 'or') {
      return new CoreOr(functionExpr);
    } else if (functionExpr.name === 'xor') {
      return new CoreXor(functionExpr);
    } else if (functionExpr.name === 'cond') {
      return new CoreCond(functionExpr);
    } else if (functionExpr.name === 'logical_maximum') {
      return new CoreLogicalMaximum(functionExpr);
    } else if (functionExpr.name === 'logical_minimum') {
      return new CoreLogicalMinimum(functionExpr);
    } else if (functionExpr.name === 'reverse') {
      return new CoreReverse(functionExpr);
    } else if (functionExpr.name === 'replace_first') {
      return new CoreReplaceFirst(functionExpr);
    } else if (functionExpr.name === 'replace_all') {
      return new CoreReplaceAll(functionExpr);
    } else if (functionExpr.name === 'char_length') {
      return new CoreCharLength(functionExpr);
    } else if (functionExpr.name === 'byte_length') {
      return new CoreByteLength(functionExpr);
    } else if (functionExpr.name === 'like') {
      return new CoreLike(functionExpr);
    } else if (functionExpr.name === 'regex_contains') {
      return new CoreRegexContains(functionExpr);
    } else if (functionExpr.name === 'regex_match') {
      return new CoreRegexMatch(functionExpr);
    } else if (functionExpr.name === 'str_contains') {
      return new CoreStrContains(functionExpr);
    } else if (functionExpr.name === 'starts_with') {
      return new CoreStartsWith(functionExpr);
    } else if (functionExpr.name === 'ends_with') {
      return new CoreEndsWith(functionExpr);
    } else if (functionExpr.name === 'to_lower') {
      return new CoreToLower(functionExpr);
    } else if (functionExpr.name === 'to_upper') {
      return new CoreToUpper(functionExpr);
    } else if (functionExpr.name === 'trim') {
      return new CoreTrim(functionExpr);
    } else if (functionExpr.name === 'str_concat') {
      return new CoreStrConcat(functionExpr);
    } else if (functionExpr.name === 'map_get') {
      return new CoreMapGet(functionExpr);
    } else if (functionExpr.name === 'cosine_distance') {
      return new CoreCosineDistance(functionExpr);
    } else if (functionExpr.name === 'dot_product') {
      return new CoreDotProduct(functionExpr);
    } else if (functionExpr.name === 'euclidean_distance') {
      return new CoreEuclideanDistance(functionExpr);
    } else if (functionExpr.name === 'vector_length') {
      return new CoreVectorLength(functionExpr);
    } else if (functionExpr.name === 'unix_micros_to_timestamp') {
      return new CoreUnixMicrosToTimestamp(functionExpr);
    } else if (functionExpr.name === 'timestamp_to_unix_micros') {
      return new CoreTimestampToUnixMicros(functionExpr);
    } else if (functionExpr.name === 'unix_millis_to_timestamp') {
      return new CoreUnixMillisToTimestamp(functionExpr);
    } else if (functionExpr.name === 'timestamp_to_unix_millis') {
      return new CoreTimestampToUnixMillis(functionExpr);
    } else if (functionExpr.name === 'unix_seconds_to_timestamp') {
      return new CoreUnixSecondsToTimestamp(functionExpr);
    } else if (functionExpr.name === 'timestamp_to_unix_seconds') {
      return new CoreTimestampToUnixSeconds(functionExpr);
    } else if (functionExpr.name === 'timestamp_add') {
      return new CoreTimestampAdd(functionExpr);
    } else if (functionExpr.name === 'timestamp_sub') {
      return new CoreTimestampSub(functionExpr);
    }
  } else if (expr.exprType === 'AggregateFunction') {
    const functionExpr = expr as unknown as AggregateFunction;
    if (functionExpr.name === 'count') {
      return new CoreCount(functionExpr);
    } else if (functionExpr.name === 'sum') {
      return new CoreSum(functionExpr);
    } else if (functionExpr.name === 'avg') {
      return new CoreAvg(functionExpr);
    } else if (functionExpr.name === 'minimum') {
      return new CoreMinimum(functionExpr);
    } else if (functionExpr.name === 'maximum') {
      return new CoreMaximum(functionExpr);
    }
  }

  throw new Error(`Unknown Expr : ${expr}`);
}

export class CoreField implements EvaluableExpr {
  constructor(private expr: Field) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    if (this.expr.fieldName() === DOCUMENT_KEY_NAME) {
      return EvaluateResult.newValue({
        referenceValue: toName(context.serializer, input.key)
      });
    }
    if (this.expr.fieldName() === UPDATE_TIME_NAME) {
      return EvaluateResult.newValue({
        timestampValue: toVersion(context.serializer, input.version)
      });
    }
    if (this.expr.fieldName() === CREATE_TIME_NAME) {
      return EvaluateResult.newValue({
        timestampValue: toVersion(context.serializer, input.createTime)
      });
    }
    // Return 'UNSET' if the field doesn't exist, otherwise the Value.
    const result = input.data.field(this.expr._fieldPath);
    if (!!result) {
      return EvaluateResult.newValue(result);
    } else {
      return EvaluateResult.newUnset();
    }
  }
}

export class CoreConstant implements EvaluableExpr {
  constructor(private expr: Constant) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    return EvaluateResult.newValue(this.expr._getValue());
  }
}

export class CoreListOfExprs implements EvaluableExpr {
  constructor(private expr: ListOfExprs) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    const results: EvaluateResult[] = this.expr.exprs.map(expr =>
      toEvaluable(expr).evaluate(context, input)
    );
    // If any sub-expression resulted in error or was unset, the list evaluation fails.
    if (results.some(value => value.isErrorOrUnset())) {
      return EvaluateResult.newError();
    }

    return EvaluateResult.newValue({
      arrayValue: { values: results.map(value => value.value!) }
    });
  }
}

function asDouble(
  protoNumber:
    | { doubleValue: number | string }
    | { integerValue: number | string }
): number {
  if (isDouble(protoNumber)) {
    return Number(protoNumber.doubleValue);
  }
  return Number(protoNumber.integerValue);
}

function asBigInt(protoNumber: { integerValue: number | string }): bigint {
  return BigInt(protoNumber.integerValue);
}

export const LongMaxValue = BigInt('0x7fffffffffffffff');
export const LongMinValue = -BigInt('0x8000000000000000');

abstract class BigIntOrDoubleArithmetics implements EvaluableExpr {
  protected constructor(protected expr: FunctionExpr) {}

  abstract bigIntArith(
    left: { integerValue: number | string },
    right: {
      integerValue: number | string;
    }
  ): bigint | number | undefined;
  abstract doubleArith(
    left:
      | { doubleValue: number | string }
      | {
          integerValue: number | string;
        },
    right:
      | { doubleValue: number | string }
      | {
          integerValue: number | string;
        }
  ):
    | {
        doubleValue: number;
      }
    | undefined;

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length >= 2,
      'Arithmetics should have at least 2 params'
    );
    const left = toEvaluable(this.expr.params[0]).evaluate(context, input);
    const right = toEvaluable(this.expr.params[1]).evaluate(context, input);
    let result = this.applyArithmetics(left, right);

    for (const expr of this.expr.params.slice(2)) {
      const evaluated = toEvaluable(expr).evaluate(context, input);
      result = this.applyArithmetics(result, evaluated);
    }

    return result;
  }

  applyArithmetics(
    left: EvaluateResult,
    right: EvaluateResult
  ): EvaluateResult {
    // If any operand is error or unset, the result is error.
    if (left.isErrorOrUnset() || right.isErrorOrUnset()) {
      return EvaluateResult.newError();
    }
    if (left.isNull() || right.isNull()) {
      return EvaluateResult.newNull();
    }

    // Type check: Both must be numbers (integer or double).
    // We know left and right are Value here due to the check above.
    const leftVal = left.value;
    const rightVal = right.value;
    if (
      (!isDouble(leftVal) && !isInteger(leftVal)) ||
      (!isDouble(rightVal) && !isInteger(rightVal))
    ) {
      return EvaluateResult.newError(); // Type error
    }

    // Perform arithmetic based on types.
    if (isDouble(leftVal) || isDouble(rightVal)) {
      const result = this.doubleArith(leftVal, rightVal);
      if (!result) {
        return EvaluateResult.newError();
      }
      return EvaluateResult.newValue(result);
    }

    if (isInteger(leftVal) && isInteger(rightVal)) {
      // Pass the narrowed Value types
      const result = this.bigIntArith(leftVal, rightVal);
      if (result === undefined) {
        return EvaluateResult.newError(); // Specific arithmetic error (e.g., divide by zero for integers)
      }

      if (typeof result === 'number') {
        // Result was double (e.g., integer divide by zero)
        return EvaluateResult.newValue({ doubleValue: result });
      }
      // Check for BigInt overflow
      else if (result < LongMinValue || result > LongMaxValue) {
        return EvaluateResult.newError(); // Simulate overflow error
      } else {
        return EvaluateResult.newValue({ integerValue: `${result}` });
      }
    }
    // Should not be reached due to initial type checks
    return EvaluateResult.newError();
  }
}

type Equality = 'NULL' | 'EQ' | 'NOT_EQ';
function strictValueEquals(left: Value, right: Value): Equality {
  if (isNullValue(left) || isNullValue(right)) {
    return 'NULL';
  }

  if (isArray(left) && isArray(right)) {
    return strictArrayValueEquals(left.arrayValue, right.arrayValue);
  }
  if (
    (isVectorValue(left) && isVectorValue(right)) ||
    (isMapValue(left) && isMapValue(right))
  ) {
    return strictObjectValueEquals(left.mapValue!, right.mapValue!);
  }

  return valueEquals(left, right) ? 'EQ' : 'NOT_EQ';
}

function strictArrayValueEquals(left: ArrayValue, right: ArrayValue): Equality {
  if (left.values?.length !== right.values?.length) {
    return 'NOT_EQ';
  }

  let foundNull = false;
  for (let index = 0; index < (left.values?.length ?? 0); index++) {
    const leftValue = left.values![index];
    const rightValue = right.values![index];
    switch (strictValueEquals(leftValue, rightValue)) {
      case 'NOT_EQ': {
        return 'NOT_EQ';
      }
      case 'NULL': {
        foundNull = true;
        break;
      }
    }
  }

  if (foundNull) {
    return 'NULL';
  }

  return 'EQ';
}

function strictObjectValueEquals(left: MapValue, right: MapValue): Equality {
  const leftMap = left.fields || {};
  const rightMap = right.fields || {};

  if (objectSize(leftMap) !== objectSize(rightMap)) {
    return 'NOT_EQ';
  }

  let foundNull = false;
  for (const key in leftMap) {
    if (leftMap.hasOwnProperty(key)) {
      if (rightMap[key] === undefined) {
        return 'NOT_EQ';
      }

      switch (strictValueEquals(leftMap[key], rightMap[key])) {
        case 'NOT_EQ': {
          return 'NOT_EQ';
        }
        case 'NULL': {
          foundNull = true;
        }
      }
    }
  }

  if (foundNull) {
    return 'NULL';
  }

  return 'EQ';
}

function valueEquals(left: Value, right: Value): boolean {
  return valueEqualsWithOptions(left, right, {
    nanEqual: false,
    mixIntegerDouble: true,
    semanticsEqual: true
  });
}

export class CoreAdd extends BigIntOrDoubleArithmetics {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  bigIntArith(
    left: { integerValue: number | string },
    right: {
      integerValue: number | string;
    }
  ): bigint | undefined {
    return asBigInt(left) + asBigInt(right);
  }

  doubleArith(
    left:
      | { doubleValue: number | string }
      | {
          integerValue: number | string;
        },
    right:
      | { doubleValue: number | string }
      | {
          integerValue: number | string;
        }
  ):
    | {
        doubleValue: number;
      }
    | undefined {
    return { doubleValue: asDouble(left) + asDouble(right) };
  }
}

export class CoreSubtract extends BigIntOrDoubleArithmetics {
  constructor(protected expr: FunctionExpr) {
    super(expr);
  }

  bigIntArith(
    left: { integerValue: number | string },
    right: {
      integerValue: number | string;
    }
  ): bigint | undefined {
    return asBigInt(left) - asBigInt(right);
  }

  doubleArith(
    left:
      | { doubleValue: number | string }
      | {
          integerValue: number | string;
        },
    right:
      | { doubleValue: number | string }
      | {
          integerValue: number | string;
        }
  ):
    | {
        doubleValue: number;
      }
    | undefined {
    return { doubleValue: asDouble(left) - asDouble(right) };
  }
}

export class CoreMultiply extends BigIntOrDoubleArithmetics {
  constructor(protected expr: FunctionExpr) {
    super(expr);
  }

  bigIntArith(
    left: { integerValue: number | string },
    right: {
      integerValue: number | string;
    }
  ): bigint | undefined {
    return asBigInt(left) * asBigInt(right);
  }

  doubleArith(
    left:
      | { doubleValue: number | string }
      | {
          integerValue: number | string;
        },
    right:
      | { doubleValue: number | string }
      | {
          integerValue: number | string;
        }
  ):
    | {
        doubleValue: number;
      }
    | undefined {
    return { doubleValue: asDouble(left) * asDouble(right) };
  }
}

export class CoreDivide extends BigIntOrDoubleArithmetics {
  constructor(protected expr: FunctionExpr) {
    super(expr);
  }

  bigIntArith(
    left: { integerValue: number | string },
    right: {
      integerValue: number | string;
    }
  ): bigint | number | undefined {
    const rightValue = asBigInt(right);
    if (rightValue === BigInt(0)) {
      return undefined; // Integer division by zero is an error
    }
    return asBigInt(left) / rightValue;
  }

  doubleArith(
    left:
      | { doubleValue: number | string }
      | {
          integerValue: number | string;
        },
    right:
      | { doubleValue: number | string }
      | {
          integerValue: number | string;
        }
  ):
    | {
        doubleValue: number;
      }
    | undefined {
    const rightValue = asDouble(right);
    if (rightValue === 0) {
      // Double division by zero results in Infinity
      return {
        doubleValue: isNegativeZero(rightValue)
          ? Number.NEGATIVE_INFINITY
          : Number.POSITIVE_INFINITY
      };
    }
    return { doubleValue: asDouble(left) / rightValue };
  }
}

export class CoreMod extends BigIntOrDoubleArithmetics {
  constructor(protected expr: FunctionExpr) {
    super(expr);
  }

  bigIntArith(
    left: { integerValue: number | string },
    right: {
      integerValue: number | string;
    }
  ): bigint | undefined {
    const rightValue = asBigInt(right);
    if (rightValue === BigInt(0)) {
      return undefined; // Modulo by zero is an error
    }
    return asBigInt(left) % rightValue;
  }

  doubleArith(
    left:
      | { doubleValue: number | string }
      | {
          integerValue: number | string;
        },
    right:
      | { doubleValue: number | string }
      | {
          integerValue: number | string;
        }
  ):
    | {
        doubleValue: number;
      }
    | undefined {
    const rightValue = asDouble(right);
    if (rightValue === 0) {
      return undefined; // Modulo by zero is an error
    }

    return { doubleValue: asDouble(left) % rightValue };
  }
}

export class CoreAnd implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    let hasError = false;
    let hasNull = false;
    for (const param of this.expr.params) {
      const result = toEvaluable(param).evaluate(context, input);
      switch (result.type) {
        case 'BOOLEAN': {
          if (!result.value?.booleanValue) {
            return EvaluateResult.newValue(FALSE_VALUE);
          }
          break;
        }
        case 'NULL': {
          hasNull = true;
          break;
        }
        default: {
          hasError = true;
        }
      }
    }

    if (hasError) {
      return EvaluateResult.newError();
    }
    if (hasNull) {
      return EvaluateResult.newNull();
    }

    return EvaluateResult.newValue(TRUE_VALUE);
  }
}

export class CoreNot implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 1,
      'not() function should have exactly 1 param'
    );
    const result = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (result.type) {
      case 'BOOLEAN': {
        return EvaluateResult.newValue({
          booleanValue: !result.value?.booleanValue
        });
      }
      case 'NULL': {
        return EvaluateResult.newNull();
      }
      default:
        return EvaluateResult.newError();
    }
  }
}

export class CoreOr implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    let hasError = false;
    let hasNull = false;
    for (const param of this.expr.params) {
      const result = toEvaluable(param).evaluate(context, input);
      switch (result.type) {
        case 'BOOLEAN': {
          if (result.value?.booleanValue) {
            return EvaluateResult.newValue(TRUE_VALUE);
          }
          break;
        }
        case 'NULL': {
          hasNull = true;
          break;
        }
        default: {
          hasError = true;
        }
      }
    }

    if (hasError) {
      return EvaluateResult.newError();
    }
    if (hasNull) {
      return EvaluateResult.newNull();
    }

    return EvaluateResult.newValue(FALSE_VALUE);
  }
}

export class CoreXor implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    let result = false;
    let hasNull = false;
    for (const param of this.expr.params) {
      const evaluated = toEvaluable(param).evaluate(context, input);
      switch (evaluated.type) {
        case 'BOOLEAN': {
          result = CoreXor.xor(result, !!evaluated.value?.booleanValue);
          break;
        }
        case 'NULL': {
          hasNull = true;
          break;
        }
        default: {
          return EvaluateResult.newError();
        }
      }
    }

    if (hasNull) {
      return EvaluateResult.newNull();
    }
    return EvaluateResult.newValue({ booleanValue: result });
  }

  // XOR(a, b) is equivalent to (a OR b) AND NOT(a AND b)
  // It is required to evaluate all arguments to ensure that the correct error semantics are
  // applied.
  static xor(a: boolean, b: boolean): boolean {
    return (a || b) && !(a && b);
  }
}

export class CoreEqAny implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 2,
      'eq_any() function should have exactly 2 params'
    );

    let foundNull = false;
    const searchExpr = this.expr.params[0];
    const searchValue = toEvaluable(searchExpr).evaluate(context, input);
    switch (searchValue.type) {
      case 'NULL': {
        foundNull = true;
        break;
      }
      case 'ERROR':
        return EvaluateResult.newError();
      case 'UNSET':
        return EvaluateResult.newError();
    }

    const arrayExpr = this.expr.params[1];
    const arrayValue = toEvaluable(arrayExpr).evaluate(context, input);
    switch (arrayValue.type) {
      case 'ARRAY':
        break;
      case 'NULL': {
        foundNull = true;
        break;
      }
      default:
        return EvaluateResult.newError();
    }

    if (foundNull) {
      return EvaluateResult.newNull();
    }

    for (const candidate of arrayValue.value?.arrayValue?.values ?? []) {
      switch (strictValueEquals(searchValue.value!, candidate)) {
        case 'EQ':
          return EvaluateResult.newValue(TRUE_VALUE);
        case 'NOT_EQ': {
          break;
        }
        case 'NULL':
          foundNull = true;
      }
    }

    if (foundNull) {
      return EvaluateResult.newNull();
    }

    return EvaluateResult.newValue(FALSE_VALUE);
  }
}

export class CoreNotEqAny implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    const equivalent = new CoreNot(
      new FunctionExpr('not', [new FunctionExpr('eq_any', this.expr.params)])
    );
    return equivalent.evaluate(context, input);
  }
}

export class CoreIsNan implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 1,
      'is_nan() function should have exactly 1 param'
    );
    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (evaluated.type) {
      case 'INT':
        return EvaluateResult.newValue(FALSE_VALUE);
      case 'DOUBLE':
        return EvaluateResult.newValue({
          booleanValue: isNaN(
            asDouble(evaluated.value as { doubleValue: number | string })
          )
        });
      case 'NULL':
        return EvaluateResult.newNull();
      default:
        return EvaluateResult.newError();
    }
  }
}

export class CoreIsNotNan implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 1,
      'is_not_nan() function should have exactly 1 param'
    );

    const equivalent = new CoreNot(
      new FunctionExpr('not', [new FunctionExpr('is_nan', this.expr.params)])
    );
    return equivalent.evaluate(context, input);
  }
}

export class CoreIsNull implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 1,
      'is_null() function should have exactly 1 param'
    );
    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (evaluated.type) {
      case 'NULL':
        return EvaluateResult.newValue(TRUE_VALUE);
      case 'UNSET':
        return EvaluateResult.newError();
      case 'ERROR':
        return EvaluateResult.newError();
      default:
        return EvaluateResult.newValue(FALSE_VALUE);
    }
  }
}

export class CoreIsNotNull implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 1,
      'is_not_null() function should have exactly 1 param'
    );
    const equivalent = new CoreNot(
      new FunctionExpr('not', [new FunctionExpr('is_null', this.expr.params)])
    );
    return equivalent.evaluate(context, input);
  }
}

export class CoreExists implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 1,
      'exists() function should have exactly 1 param'
    );
    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (evaluated.type) {
      case 'ERROR':
        return EvaluateResult.newError();
      case 'UNSET':
        return EvaluateResult.newValue(FALSE_VALUE);
      default:
        return EvaluateResult.newValue(TRUE_VALUE);
    }
  }
}

export class CoreCond implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 3,
      'cond() function should have exactly 3 param'
    );

    const condition = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (condition.type) {
      case 'BOOLEAN': {
        if (condition.value?.booleanValue) {
          return toEvaluable(this.expr.params[1]).evaluate(context, input);
        } else {
          return toEvaluable(this.expr.params[2]).evaluate(context, input);
        }
      }
      case 'NULL': {
        return toEvaluable(this.expr.params[2]).evaluate(context, input);
      }
      default:
        return EvaluateResult.newError();
    }
  }
}

export class CoreLogicalMaximum implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    const results = this.expr.params.map(param =>
      toEvaluable(param).evaluate(context, input)
    );

    let maxValue: EvaluateResult | undefined;

    for (const result of results) {
      switch (result.type) {
        case 'ERROR':
        case 'UNSET':
        case 'NULL':
          continue;
        default: {
          if (maxValue === undefined) {
            maxValue = result;
          } else {
            maxValue =
              valueCompare(result.value!, maxValue.value!) > 0
                ? result
                : maxValue;
          }
        }
      }
    }

    return maxValue === undefined ? EvaluateResult.newNull() : maxValue;
  }
}

export class CoreLogicalMinimum implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    const results = this.expr.params.map(param =>
      toEvaluable(param).evaluate(context, input)
    );
    let minValue: EvaluateResult | undefined;

    for (const result of results) {
      switch (result.type) {
        case 'ERROR':
        case 'UNSET':
        case 'NULL':
          continue;
        default: {
          if (minValue === undefined) {
            minValue = result;
          } else {
            minValue =
              valueCompare(result.value!, minValue.value!) < 0
                ? result
                : minValue;
          }
        }
      }
    }

    return minValue === undefined ? EvaluateResult.newNull() : minValue;
  }
}

abstract class ComparisonBase implements EvaluableExpr {
  protected constructor(protected expr: FunctionExpr) {}

  abstract compareToResult(
    left: EvaluateResult,
    right: EvaluateResult
  ): EvaluateResult;

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 2,
      `${this.expr.name}() function should have exactly 2 params`
    );

    const left = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (left.type) {
      case 'ERROR':
        return EvaluateResult.newError();
      case 'UNSET':
        return EvaluateResult.newError();
    }

    const right = toEvaluable(this.expr.params[1]).evaluate(context, input);
    switch (right.type) {
      case 'ERROR':
        return EvaluateResult.newError();
      case 'UNSET':
        return EvaluateResult.newError();
    }

    if (left.isNull() || right.isNull()) {
      return EvaluateResult.newNull();
    }

    return this.compareToResult(left, right);
  }
}

export class CoreEq extends ComparisonBase {
  constructor(protected expr: FunctionExpr) {
    super(expr);
  }

  compareToResult(left: EvaluateResult, right: EvaluateResult): EvaluateResult {
    if (typeOrder(left.value!) !== typeOrder(right.value!)) {
      return EvaluateResult.newValue(FALSE_VALUE);
    }
    if (isNanValue(left.value) || isNanValue(right.value)) {
      return EvaluateResult.newValue(FALSE_VALUE);
    }

    switch (strictValueEquals(left.value!, right.value!)) {
      case 'EQ':
        return EvaluateResult.newValue(TRUE_VALUE);
      case 'NOT_EQ':
        return EvaluateResult.newValue(FALSE_VALUE);
      case 'NULL':
        return EvaluateResult.newNull();
    }
  }
}

export class CoreNeq extends ComparisonBase {
  constructor(protected expr: FunctionExpr) {
    super(expr);
  }

  compareToResult(left: EvaluateResult, right: EvaluateResult): EvaluateResult {
    switch (strictValueEquals(left.value!, right.value!)) {
      case 'EQ':
        return EvaluateResult.newValue(FALSE_VALUE);
      case 'NOT_EQ':
        return EvaluateResult.newValue(TRUE_VALUE);
      case 'NULL':
        return EvaluateResult.newNull();
    }
  }
}

export class CoreLt extends ComparisonBase {
  constructor(protected expr: FunctionExpr) {
    super(expr);
  }

  compareToResult(left: EvaluateResult, right: EvaluateResult): EvaluateResult {
    if (typeOrder(left.value!) !== typeOrder(right.value!)) {
      return EvaluateResult.newValue(FALSE_VALUE);
    }
    if (isNanValue(left.value) || isNanValue(right.value)) {
      return EvaluateResult.newValue(FALSE_VALUE);
    }
    return EvaluateResult.newValue({
      booleanValue: valueCompare(left.value!, right.value!) < 0
    });
  }
}

export class CoreLte extends ComparisonBase {
  constructor(protected expr: FunctionExpr) {
    super(expr);
  }

  compareToResult(left: EvaluateResult, right: EvaluateResult): EvaluateResult {
    if (typeOrder(left.value!) !== typeOrder(right.value!)) {
      return EvaluateResult.newValue(FALSE_VALUE);
    }
    if (isNanValue(left.value!) || isNanValue(right.value!)) {
      return EvaluateResult.newValue(FALSE_VALUE);
    }

    if (strictValueEquals(left.value!, right.value!) === 'EQ') {
      return EvaluateResult.newValue(TRUE_VALUE);
    }

    return EvaluateResult.newValue({
      booleanValue: valueCompare(left.value!, right.value!) < 0
    });
  }
}

export class CoreGt extends ComparisonBase {
  constructor(protected expr: FunctionExpr) {
    super(expr);
  }

  compareToResult(left: EvaluateResult, right: EvaluateResult): EvaluateResult {
    if (typeOrder(left.value!) !== typeOrder(right.value!)) {
      return EvaluateResult.newValue(FALSE_VALUE);
    }
    if (isNanValue(left.value) || isNanValue(right.value)) {
      return EvaluateResult.newValue(FALSE_VALUE);
    }
    return EvaluateResult.newValue({
      booleanValue: valueCompare(left.value!, right.value!) > 0
    });
  }
}

export class CoreGte extends ComparisonBase {
  constructor(protected expr: FunctionExpr) {
    super(expr);
  }

  compareToResult(left: EvaluateResult, right: EvaluateResult): EvaluateResult {
    if (typeOrder(left.value!) !== typeOrder(right.value!)) {
      return EvaluateResult.newValue(FALSE_VALUE);
    }
    if (isNanValue(left.value!) || isNanValue(right.value!)) {
      return EvaluateResult.newValue(FALSE_VALUE);
    }

    if (strictValueEquals(left.value!, right.value!) === 'EQ') {
      return EvaluateResult.newValue(TRUE_VALUE);
    }

    return EvaluateResult.newValue({
      booleanValue: valueCompare(left.value!, right.value!) > 0
    });
  }
}

export class CoreArrayConcat implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    throw new Error('Unimplemented');
  }
}

export class CoreArrayReverse implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 1,
      'array_reverse() function should have exactly one parameter'
    );
    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (evaluated.type) {
      case 'NULL':
        return EvaluateResult.newNull();
      case 'ARRAY': {
        const values = evaluated.value!.arrayValue?.values ?? [];
        return EvaluateResult.newValue({
          arrayValue: { values: [...values].reverse() }
        });
      }
      default:
        return EvaluateResult.newError();
    }
  }
}

export class CoreArrayContains implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 2,
      'array_contains() function should have exactly two parameters'
    );
    return new CoreEqAny(
      new FunctionExpr('eq_any', [this.expr.params[1], this.expr.params[0]])
    ).evaluate(context, input);
  }
}

export class CoreArrayContainsAll implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 2,
      'array_contains_all() function should have exactly two parameters'
    );

    let foundNull = false;
    const arrayToSearch = toEvaluable(this.expr.params[0]).evaluate(
      context,
      input
    );
    switch (arrayToSearch.type) {
      case 'ARRAY': {
        break;
      }
      case 'NULL': {
        foundNull = true;
        break;
      }
      default: {
        return EvaluateResult.newError();
      }
    }

    const elementsToFind = toEvaluable(this.expr.params[1]).evaluate(
      context,
      input
    );
    switch (elementsToFind.type) {
      case 'ARRAY': {
        break;
      }
      case 'NULL': {
        foundNull = true;
        break;
      }
      default: {
        return EvaluateResult.newError();
      }
    }

    if (foundNull) {
      return EvaluateResult.newNull();
    }

    const searchValues = elementsToFind.value?.arrayValue?.values ?? [];
    const arrayValues = arrayToSearch.value?.arrayValue?.values ?? [];
    let foundNullAtLeastOnce = false;
    for (const search of searchValues) {
      let found = false;
      foundNull = false;
      for (const value of arrayValues) {
        switch (strictValueEquals(search, value)) {
          case 'EQ': {
            found = true;
            break;
          }
          case 'NOT_EQ': {
            break;
          }
          case 'NULL': {
            foundNull = true;
            foundNullAtLeastOnce = true;
          }
        }

        if (found) {
          // short circuit
          break;
        }
      }

      if (found) {
        // true case - do nothing, we found a match, make sure all other values are also found
      } else {
        // false case - we didn't find a match, short circuit
        if (!foundNull) {
          return EvaluateResult.newValue(FALSE_VALUE);
        }

        // null case - do nothing, we found at least one null value, keep going
      }
    }

    if (foundNullAtLeastOnce) {
      return EvaluateResult.newNull();
    }

    return EvaluateResult.newValue(TRUE_VALUE);
  }
}

export class CoreArrayContainsAny implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 2,
      'array_contains_any() function should have exactly two parameters'
    );

    let foundNull = false;
    const arrayToSearch = toEvaluable(this.expr.params[0]).evaluate(
      context,
      input
    );
    switch (arrayToSearch.type) {
      case 'ARRAY': {
        break;
      }
      case 'NULL': {
        foundNull = true;
        break;
      }
      default: {
        return EvaluateResult.newError();
      }
    }

    const elementsToFind = toEvaluable(this.expr.params[1]).evaluate(
      context,
      input
    );
    switch (elementsToFind.type) {
      case 'ARRAY': {
        break;
      }
      case 'NULL': {
        foundNull = true;
        break;
      }
      default: {
        return EvaluateResult.newError();
      }
    }

    if (foundNull) {
      return EvaluateResult.newNull();
    }

    const searchValues = elementsToFind.value?.arrayValue?.values ?? [];
    const arrayValues = arrayToSearch.value?.arrayValue?.values ?? [];

    for (const value of arrayValues) {
      for (const search of searchValues) {
        switch (strictValueEquals(value, search)) {
          case 'EQ': {
            return EvaluateResult.newValue(TRUE_VALUE);
          }
          case 'NOT_EQ': {
            break;
          }
          case 'NULL':
            foundNull = true;
        }
      }
    }

    if (foundNull) {
      return EvaluateResult.newNull();
    }

    return EvaluateResult.newValue(FALSE_VALUE);
  }
}

export class CoreArrayLength implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 1,
      'array_length() function should have exactly one parameter'
    );
    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (evaluated.type) {
      case 'NULL':
        return EvaluateResult.newNull();
      case 'ARRAY': {
        return EvaluateResult.newValue({
          integerValue: `${evaluated.value?.arrayValue?.values?.length ?? 0}`
        });
      }
      default: {
        return EvaluateResult.newError();
      }
    }
  }
}

export class CoreArrayElement implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    throw new Error('Unimplemented');
  }
}

export class CoreReverse implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 1,
      'reverse() function should have exactly one parameter'
    );
    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (evaluated.type) {
      case 'NULL':
        return EvaluateResult.newNull();
      case 'STRING': {
        return EvaluateResult.newValue({
          stringValue: evaluated.value?.stringValue
            ?.split('')
            .reverse()
            .join('')
        });
      }
      default: {
        return EvaluateResult.newError();
      }
    }
  }
}

export class CoreReplaceFirst implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    throw new Error('Unimplemented');
  }
}

export class CoreReplaceAll implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    throw new Error('Unimplemented');
  }
}

function getUnicodePointCount(str: string) {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    const codePoint = str.codePointAt(i);

    if (codePoint === undefined) {
      return undefined; // Should not happen with valid JS strings
    }

    // BMP character (including lone surrogates, which count as 1)
    if (codePoint <= 0xffff) {
      // Check specifically for lone surrogates which are invalid UTF-16 sequences
      if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
        // High surrogate: check if followed by low surrogate
        if (codePoint <= 0xdbff) {
          const nextCodePoint = str.codePointAt(i + 1);
          if (
            nextCodePoint === undefined ||
            !(nextCodePoint >= 0xdc00 && nextCodePoint <= 0xdfff)
          ) {
            // Lone high surrogate - treat as one character for length, but invalid for byte length
            count += 1;
          } else {
            // Valid surrogate pair (counts as one character)
            count += 1;
            i++; // Skip the low surrogate
          }
        } else {
          // Lone low surrogate - treat as one character
          count += 1;
        }
      } else {
        // Regular BMP character
        count += 1;
      }
    }
    // Astral plane character (SMP) - should have been handled by surrogate pair check
    // This case might be redundant if surrogate logic is correct, but kept for clarity
    else if (codePoint <= 0x10ffff) {
      count += 1;
      i++; // Code points > 0xFFFF take two JS string indices
    } else {
      return undefined; // Invalid code point
    }
  }
  return count;
}

export class CoreCharLength implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 1,
      'char_length() function should have exactly one parameter'
    );
    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (evaluated.type) {
      case 'NULL':
        return EvaluateResult.newNull();
      case 'STRING': {
        const length = getUnicodePointCount(evaluated.value!.stringValue!);
        // If counting failed (e.g., invalid sequence), return error
        return length === undefined
          ? EvaluateResult.newError()
          : EvaluateResult.newValue({ integerValue: length });
      }
      default: {
        return EvaluateResult.newError();
      }
    }
  }
}

function getUtf8ByteLength(str: string) {
  let byteLength = 0;
  for (let i = 0; i < str.length; i++) {
    const codePoint = str.codePointAt(i);

    // Check for out of range of lone surrogate
    if (codePoint === undefined) {
      return undefined;
    }

    if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
      // If it is a high surrogate, check if a low surrogate follows
      if (codePoint <= 0xdbff) {
        const lowSurrogate = str.codePointAt(i + 1);
        if (
          lowSurrogate === undefined ||
          !(lowSurrogate >= 0xdc00 && lowSurrogate <= 0xdfff)
        ) {
          return undefined; // Lone high surrogate
        }
        // Valid surrogate pair
        byteLength += 4;
        i++; // Move past the low surrogate
      } else {
        return undefined; // Lone low surrogate
      }
    } else if (codePoint <= 0x7f) {
      byteLength += 1;
    } else if (codePoint <= 0x7ff) {
      byteLength += 2;
    } else if (codePoint <= 0xffff) {
      byteLength += 3;
    } else if (codePoint <= 0x10ffff) {
      byteLength += 4;
      i++; // Increment i to skip the next code unit of the surrogate pair
    } else {
      return undefined; // Invalid code point (should not normally happen)
    }
  }
  return byteLength;
}

export class CoreByteLength implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 1,
      'byte_length() function should have exactly one parameter'
    );
    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (evaluated.type) {
      case 'BYTES': {
        return EvaluateResult.newValue({
          integerValue: evaluated.value?.bytesValue?.length
        });
      }
      case 'STRING': {
        // return the number of bytes in the string
        const result = getUtf8ByteLength(evaluated.value?.stringValue!);
        return result === undefined
          ? EvaluateResult.newError()
          : EvaluateResult.newValue({
              integerValue: result
            });
      }
      case 'NULL': {
        return EvaluateResult.newNull();
      }
      default: {
        return EvaluateResult.newError();
      }
    }
  }
}

abstract class StringSearchFunctionBase implements EvaluableExpr {
  protected constructor(readonly expr: FunctionExpr) {}

  abstract performSearch(value: string, search: string): EvaluateResult;

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 2,
      `${this.expr.name}() function should have exactly two parameters`
    );

    let foundNull = false;
    const value = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (value.type) {
      case 'STRING': {
        break;
      }
      case 'NULL': {
        foundNull = true;
        break;
      }
      default: {
        return EvaluateResult.newError();
      }
    }

    const pattern = toEvaluable(this.expr.params[1]).evaluate(context, input);
    switch (pattern.type) {
      case 'STRING': {
        break;
      }
      case 'NULL': {
        foundNull = true;
        break;
      }
      default: {
        return EvaluateResult.newError();
      }
    }

    if (foundNull) {
      return EvaluateResult.newNull();
    }

    return this.performSearch(
      value.value?.stringValue!,
      pattern.value?.stringValue!
    );
  }
}

function likeToRegex(like: string): string {
  let result = '';
  for (let i = 0; i < like.length; i++) {
    const c = like.charAt(i);
    switch (c) {
      case '_':
        result += '.';
        break;
      case '%':
        result += '.*';
        break;
      // Escape regex special characters
      case '\\': // Need to escape backslash itself
      case '.':
      case '*':
      case '?':
      case '+':
      case '^':
      case '$':
      case '|':
      case '(':
      case ')':
      case '[':
      case ']':
      case '{':
      case '}':
        result += '\\' + c;
        break;
      default:
        result += c;
        break;
    }
  }
  // Anchor the regex to match the entire string
  return '^' + result + '$';
}

export class CoreLike extends StringSearchFunctionBase {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  performSearch(value: string, search: string): EvaluateResult {
    try {
      const regexPattern = likeToRegex(search);
      const regex = RE2JS.compile(regexPattern);
      return EvaluateResult.newValue({ booleanValue: regex.matches(value) });
    } catch (e) {
      logWarn(
        `Invalid LIKE pattern converted to regex: ${search}, returning error. Error: ${e}`
      );
      return EvaluateResult.newError();
    }
  }
}

export class CoreRegexContains extends StringSearchFunctionBase {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  performSearch(value: string, search: string): EvaluateResult {
    try {
      const regex = RE2JS.compile(search);
      return EvaluateResult.newValue({
        booleanValue: regex.matcher(value).find()
      });
    } catch (RE2JSError) {
      logWarn(
        `Invalid regex pattern found in regex_contains: ${search}, returning error`
      );
      return EvaluateResult.newError();
    }
  }
}

export class CoreRegexMatch extends StringSearchFunctionBase {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  performSearch(value: string, search: string): EvaluateResult {
    try {
      // Use matches() for full string match semantics
      return EvaluateResult.newValue({
        booleanValue: RE2JS.compile(search).matches(value)
      });
    } catch (RE2JSError) {
      logWarn(
        `Invalid regex pattern found in regex_match: ${search}, returning error`
      );
      return EvaluateResult.newError();
    }
  }
}

export class CoreStrContains extends StringSearchFunctionBase {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  performSearch(value: string, search: string): EvaluateResult {
    return EvaluateResult.newValue({ booleanValue: value.includes(search) });
  }
}

export class CoreStartsWith extends StringSearchFunctionBase {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  performSearch(value: string, search: string): EvaluateResult {
    return EvaluateResult.newValue({ booleanValue: value.startsWith(search) });
  }
}

export class CoreEndsWith extends StringSearchFunctionBase {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  performSearch(value: string, search: string): EvaluateResult {
    return EvaluateResult.newValue({ booleanValue: value.endsWith(search) });
  }
}

export class CoreToLower implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 1,
      'to_lower() function should have exactly one parameter'
    );

    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (evaluated.type) {
      case 'STRING': {
        return EvaluateResult.newValue({
          stringValue: evaluated.value?.stringValue?.toLowerCase()
        });
      }
      case 'NULL': {
        return EvaluateResult.newNull();
      }
      default: {
        return EvaluateResult.newError();
      }
    }
  }
}

export class CoreToUpper implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 1,
      'to_upper() function should have exactly one parameter'
    );

    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (evaluated.type) {
      case 'STRING': {
        return EvaluateResult.newValue({
          stringValue: evaluated.value?.stringValue?.toUpperCase()
        });
      }
      case 'NULL': {
        return EvaluateResult.newNull();
      }
      default: {
        return EvaluateResult.newError();
      }
    }
  }
}

export class CoreTrim implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 1,
      'trim() function should have exactly one parameter'
    );

    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (evaluated.type) {
      case 'STRING': {
        return EvaluateResult.newValue({
          stringValue: evaluated.value?.stringValue?.trim()
        });
      }
      case 'NULL': {
        return EvaluateResult.newNull();
      }
      default: {
        return EvaluateResult.newError();
      }
    }
  }
}

export class CoreStrConcat implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    const evaluated = this.expr.params.map(val =>
      toEvaluable(val).evaluate(context, input)
    );
    // If any part is error or unset, or not a string (and not null), result is error
    // If any part is null, result is null
    let resultString = '';
    let hasNull = false;
    for (const val of evaluated) {
      switch (val.type) {
        case 'STRING': {
          resultString += val.value!.stringValue;
          break;
        }
        case 'NULL': {
          hasNull = true;
          break;
        }
        default: {
          return EvaluateResult.newError();
        }
      }
    }
    if (hasNull) {
      return EvaluateResult.newNull();
    }
    return EvaluateResult.newValue({ stringValue: resultString });
  }
}

export class CoreMapGet implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 2,
      'map_get() function should have exactly two parameters'
    );

    const evaluatedMap = toEvaluable(this.expr.params[0]).evaluate(
      context,
      input
    );
    switch (evaluatedMap.type) {
      case 'UNSET': {
        return EvaluateResult.newUnset();
      }
      case 'MAP': {
        break;
      }
      default: {
        return EvaluateResult.newError();
      }
    }

    const subfield = toEvaluable(this.expr.params[1]).evaluate(context, input);
    switch (subfield.type) {
      case 'STRING': {
        break;
      }
      default: {
        return EvaluateResult.newError();
      }
    }

    const value =
      evaluatedMap.value?.mapValue?.fields?.[subfield.value?.stringValue!];
    return value === undefined
      ? EvaluateResult.newUnset()
      : EvaluateResult.newValue(value);
  }
}

// Aggregate functions are handled differently during pipeline execution
// Their evaluate methods here might not be directly called in the same way.
export class CoreCount implements EvaluableExpr {
  constructor(private expr: AggregateFunction) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    throw new Error('Aggregate evaluate() should not be called directly');
  }
}

export class CoreSum implements EvaluableExpr {
  constructor(private expr: AggregateFunction) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    throw new Error('Aggregate evaluate() should not be called directly');
  }
}

export class CoreAvg implements EvaluableExpr {
  constructor(private expr: AggregateFunction) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    throw new Error('Aggregate evaluate() should not be called directly');
  }
}

export class CoreMinimum implements EvaluableExpr {
  constructor(private expr: AggregateFunction) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    throw new Error('Aggregate evaluate() should not be called directly');
  }
}

export class CoreMaximum implements EvaluableExpr {
  constructor(private expr: AggregateFunction) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    throw new Error('Aggregate evaluate() should not be called directly');
  }
}

abstract class DistanceBase implements EvaluableExpr {
  protected constructor(private expr: FunctionExpr) {}

  abstract calculateDistance(
    vec1: ArrayValue | undefined,
    vec2: ArrayValue | undefined
  ): number | undefined;

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 2,
      `${this.expr.name}() function should have exactly 2 params`
    );

    let hasNull = false;
    const vector1 = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (vector1.type) {
      case 'VECTOR': {
        break;
      }
      case 'NULL': {
        hasNull = true;
        break;
      }
      default: {
        return EvaluateResult.newError();
      }
    }

    const vector2 = toEvaluable(this.expr.params[1]).evaluate(context, input);
    switch (vector2.type) {
      case 'VECTOR': {
        break;
      }
      case 'NULL': {
        hasNull = true;
        break;
      }
      default: {
        return EvaluateResult.newError();
      }
    }

    if (hasNull) {
      return EvaluateResult.newNull();
    }

    const vectorValue1 = getVectorValue(vector1.value!);
    const vectorValue2 = getVectorValue(vector2.value!);

    // Mismatched lengths or undefined vectors result in error
    if (
      vectorValue1 === undefined ||
      vectorValue2 === undefined ||
      vectorValue1.values?.length !== vectorValue2.values?.length
    ) {
      return EvaluateResult.newError();
    }

    const distance = this.calculateDistance(vectorValue1, vectorValue2);
    // NaN or undefined distance calculation results in error
    if (distance === undefined || isNaN(distance)) {
      return EvaluateResult.newError();
    }

    return EvaluateResult.newValue({ doubleValue: distance });
  }
}

export class CoreCosineDistance extends DistanceBase {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  calculateDistance(
    vec1: ArrayValue | undefined,
    vec2: ArrayValue | undefined
  ): number | undefined {
    const values1 = vec1?.values ?? [];
    const values2 = vec2?.values ?? [];
    if (values1.length === 0) return undefined; // Distance undefined for empty vectors

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    for (let i = 0; i < values1.length; i++) {
      // Error if any element is not a number
      if (!isNumber(values1[i]) || !isNumber(values2[i])) return undefined;
      const val1 = asDouble(values1[i] as { doubleValue: number | string });
      const val2 = asDouble(values2[i] as { doubleValue: number | string });
      dotProduct += val1 * val2;
      magnitude1 += val1 * val1;
      magnitude2 += val2 * val2;
    }
    const magnitude = Math.sqrt(magnitude1) * Math.sqrt(magnitude2);
    // Distance undefined if either vector has zero magnitude
    if (magnitude === 0) {
      return undefined;
    }

    // Clamp cosine similarity to [-1, 1] due to potential floating point inaccuracies
    const cosineSimilarity = Math.max(-1, Math.min(1, dotProduct / magnitude));
    return 1 - cosineSimilarity;
  }
}

export class CoreDotProduct extends DistanceBase {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  calculateDistance(
    vec1: ArrayValue | undefined,
    vec2: ArrayValue | undefined
  ): number | undefined {
    const values1 = vec1?.values ?? [];
    const values2 = vec2?.values ?? [];
    if (values1.length === 0) return 0.0; // Dot product of empty vectors is 0

    let dotProduct = 0;
    for (let i = 0; i < values1.length; i++) {
      // Error if any element is not a number
      if (!isNumber(values1[i]) || !isNumber(values2[i])) return undefined;
      const val1 = asDouble(values1[i] as { doubleValue: number | string });
      const val2 = asDouble(values2[i] as { doubleValue: number | string });
      dotProduct += val1 * val2;
    }

    return dotProduct;
  }
}

export class CoreEuclideanDistance extends DistanceBase {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  calculateDistance(
    vec1: ArrayValue | undefined,
    vec2: ArrayValue | undefined
  ): number | undefined {
    const values1 = vec1?.values ?? [];
    const values2 = vec2?.values ?? [];
    if (values1.length === 0) return 0.0; // Distance between empty vectors is 0

    let euclideanDistanceSq = 0;
    for (let i = 0; i < values1.length; i++) {
      // Error if any element is not a number
      if (!isNumber(values1[i]) || !isNumber(values2[i])) return undefined;
      const val1 = asDouble(values1[i] as { doubleValue: number | string });
      const val2 = asDouble(values2[i] as { doubleValue: number | string });
      euclideanDistanceSq += Math.pow(val1 - val2, 2);
    }

    return Math.sqrt(euclideanDistanceSq);
  }
}

export class CoreVectorLength implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 1,
      'vector_length() function should have exactly one parameter'
    );

    const vector = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (vector.type) {
      case 'VECTOR': {
        const vectorValue = getVectorValue(vector.value!);
        return EvaluateResult.newValue({
          integerValue: vectorValue?.values?.length ?? 0
        });
      }
      case 'NULL': {
        return EvaluateResult.newNull();
      }
      default: {
        return EvaluateResult.newError();
      }
    }
  }
}

// 0001-01-01T00:00:00Z
const TIMESTAMP_MIN_SECONDS: bigint = BigInt(-62135596800);
// 9999-12-31T23:59:59Z - but the max timestamp has 999,999,999 nanoseconds
const TIMESTAMP_MAX_SECONDS: bigint = BigInt(253402300799);

const MILLISECONDS_PER_SECOND: bigint = BigInt(1000);
const MICROSECONDS_PER_SECOND: bigint = BigInt(1000000);

// 0001-01-01T00:00:00.000Z
const TIMESTAMP_MIN_MILLISECONDS: bigint =
  TIMESTAMP_MIN_SECONDS * MILLISECONDS_PER_SECOND;
// 9999-12-31T23:59:59.999Z - but the max timestamp has 999,999,999 nanoseconds
const TIMESTAMP_MAX_MILLISECONDS: bigint =
  TIMESTAMP_MAX_SECONDS * MILLISECONDS_PER_SECOND + BigInt(999); // Max sub-second millis

// 0001-01-01T00:00:00.000000Z
const TIMESTAMP_MIN_MICROSECONDS: bigint =
  TIMESTAMP_MIN_SECONDS * MICROSECONDS_PER_SECOND;
// 9999-12-31T23:59:59.999999Z - but the max timestamp has 999,999,999 nanoseconds
const TIMESTAMP_MAX_MICROSECONDS: bigint =
  TIMESTAMP_MAX_SECONDS * MICROSECONDS_PER_SECOND + BigInt(999999); // Max sub-second micros

function isMicrosInBounds(micros: bigint): boolean {
  return (
    micros >= TIMESTAMP_MIN_MICROSECONDS && micros <= TIMESTAMP_MAX_MICROSECONDS
  );
}

function isMillisInBounds(millis: bigint): boolean {
  return (
    millis >= TIMESTAMP_MIN_MILLISECONDS && millis <= TIMESTAMP_MAX_MILLISECONDS
  );
}

function isSecondsInBounds(seconds: bigint): boolean {
  return seconds >= TIMESTAMP_MIN_SECONDS && seconds <= TIMESTAMP_MAX_SECONDS;
}

function isTimestampInBounds(seconds: number, nanos: number) {
  const sBig = BigInt(seconds);
  if (sBig < TIMESTAMP_MIN_SECONDS || sBig > TIMESTAMP_MAX_SECONDS) {
    return false;
  }
  // Nanos must be non-negative and less than 1 second
  if (nanos < 0 || nanos >= 1_000_000_000) {
    return false;
  }
  // Additional check for min/max boundaries
  if (sBig === TIMESTAMP_MIN_SECONDS && nanos !== 0) return false; // Min timestamp has 0 nanos
  if (sBig === TIMESTAMP_MAX_SECONDS && nanos > 999_999_999) return false; // Max timestamp allows up to 999_999_999 nanos

  return true;
}

function timestampToMicros(timestamp: Timestamp): bigint {
  return (
    BigInt(timestamp.seconds) * MICROSECONDS_PER_SECOND +
    // Integer division truncates towards zero
    BigInt(Math.trunc(timestamp.nanoseconds / 1000))
  );
}

abstract class UnixToTimestamp implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 1,
      `${this.expr.name}() function should have exactly one parameter`
    );

    const value = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (value.type) {
      case 'INT': {
        return this.toTimestamp(BigInt(value.value!.integerValue!));
      }
      case 'NULL': {
        return EvaluateResult.newNull();
      }
      default: {
        return EvaluateResult.newError();
      }
    }
  }

  abstract toTimestamp(value: bigint): EvaluateResult;
}

export class CoreUnixMicrosToTimestamp extends UnixToTimestamp {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  toTimestamp(value: bigint): EvaluateResult {
    if (!isMicrosInBounds(value)) {
      return EvaluateResult.newError();
    }

    const seconds = Number(value / MICROSECONDS_PER_SECOND);
    const nanos = Number((value % MICROSECONDS_PER_SECOND) * BigInt(1000));
    return EvaluateResult.newValue({ timestampValue: { seconds, nanos } });
  }
}

export class CoreUnixMillisToTimestamp extends UnixToTimestamp {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  toTimestamp(value: bigint): EvaluateResult {
    if (!isMillisInBounds(value)) {
      return EvaluateResult.newError();
    }

    const seconds = Number(value / MILLISECONDS_PER_SECOND);
    const nanos = Number(
      (value % MILLISECONDS_PER_SECOND) * BigInt(1000 * 1000)
    );

    return EvaluateResult.newValue({ timestampValue: { seconds, nanos } });
  }
}

export class CoreUnixSecondsToTimestamp extends UnixToTimestamp {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  toTimestamp(value: bigint): EvaluateResult {
    if (!isSecondsInBounds(value)) {
      return EvaluateResult.newError();
    }

    const seconds = Number(value);
    return EvaluateResult.newValue({ timestampValue: { seconds, nanos: 0 } });
  }
}

abstract class TimestampToUnix implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 1,
      `${this.expr.name}() function should have exactly one parameter`
    );

    const value = toEvaluable(this.expr.params[0]).evaluate(context, input);
    switch (value.type) {
      case 'TIMESTAMP': {
        break;
      }
      case 'NULL': {
        return EvaluateResult.newNull();
      }
      default: {
        return EvaluateResult.newError();
      }
    }

    const timestamp = fromTimestamp(value.value!.timestampValue!);
    // Check if the input timestamp is within valid bounds
    if (!isTimestampInBounds(timestamp.seconds, timestamp.nanoseconds)) {
      return EvaluateResult.newError();
    }

    return this.toUnix(timestamp);
  }

  abstract toUnix(value: Timestamp): EvaluateResult;
}

export class CoreTimestampToUnixMicros extends TimestampToUnix {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  toUnix(timestamp: Timestamp): EvaluateResult {
    const micros = timestampToMicros(timestamp);
    // Check if the resulting micros are within representable bounds
    if (!isMicrosInBounds(micros)) {
      return EvaluateResult.newError();
    }
    return EvaluateResult.newValue({ integerValue: `${micros.toString()}` });
  }
}

export class CoreTimestampToUnixMillis extends TimestampToUnix {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  toUnix(timestamp: Timestamp): EvaluateResult {
    const micros = timestampToMicros(timestamp);
    // Perform division, truncating towards zero (default JS BigInt division)
    const millis = micros / BigInt(1000);
    const submillis = micros % BigInt(1000);
    if (millis > BigInt(0) || submillis === BigInt(0)) {
      return EvaluateResult.newValue({ integerValue: millis.toString() });
    } else {
      return EvaluateResult.newValue({
        integerValue: (millis - BigInt(1)).toString()
      });
    }
  }
}

export class CoreTimestampToUnixSeconds extends TimestampToUnix {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  toUnix(timestamp: Timestamp): EvaluateResult {
    // Seconds are directly available
    const seconds = BigInt(timestamp.seconds);
    // Check if the resulting seconds are within representable bounds
    if (!isSecondsInBounds(seconds)) {
      return EvaluateResult.newError();
    }
    return EvaluateResult.newValue({ integerValue: seconds.toString() });
  }
}

type TimeUnit =
  | 'microsecond'
  | 'millisecond'
  | 'second'
  | 'minute'
  | 'hour'
  | 'day';
function asTimeUnit(unit?: string): TimeUnit | undefined {
  switch (unit) {
    case 'microsecond':
      return 'microsecond';
    case 'millisecond':
      return 'millisecond';
    case 'second':
      return 'second';
    case 'minute':
      return 'minute';
    case 'hour':
      return 'hour';
    case 'day':
      return 'day';
    default:
      return undefined;
  }
}

abstract class TimestampArithmetic implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}
  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): EvaluateResult {
    hardAssert(
      this.expr.params.length === 3,
      `${this.expr.name}() function should have exactly 3 parameters`
    );

    let foundNull = false;
    const timestampVal = toEvaluable(this.expr.params[0]).evaluate(
      context,
      input
    );
    switch (timestampVal.type) {
      case 'TIMESTAMP': {
        break;
      }
      case 'NULL': {
        foundNull = true;
        break;
      }
      default: {
        return EvaluateResult.newError();
      }
    }

    const unitVal = toEvaluable(this.expr.params[1]).evaluate(context, input);
    let timeUnit: TimeUnit | undefined;
    switch (unitVal.type) {
      case 'STRING': {
        timeUnit = asTimeUnit(unitVal.value!.stringValue);
        if (timeUnit === undefined) {
          return EvaluateResult.newError();
        }
        break;
      }
      case 'NULL': {
        foundNull = true;
        break;
      }
      default: {
        return EvaluateResult.newError();
      }
    }

    const amountVal = toEvaluable(this.expr.params[2]).evaluate(context, input);
    switch (amountVal.type) {
      case 'INT': {
        break;
      }
      case 'NULL': {
        foundNull = true;
        break;
      }
      default: {
        return EvaluateResult.newError();
      }
    }

    if (foundNull) {
      return EvaluateResult.newNull();
    }

    const amount = BigInt(amountVal.value!.integerValue!);
    let microsToOperate: bigint;
    try {
      switch (timeUnit) {
        case 'microsecond':
          microsToOperate = amount;
          break;
        case 'millisecond':
          microsToOperate = amount * BigInt(1000);
          break;
        case 'second':
          microsToOperate = amount * BigInt(1000000);
          break;
        case 'minute':
          microsToOperate = amount * BigInt(60000000);
          break;
        case 'hour':
          microsToOperate = amount * BigInt(3600000000);
          break;
        case 'day':
          microsToOperate = amount * BigInt(86400000000);
          break;
        default:
          return EvaluateResult.newError();
      }
      // Check for potential overflow during multiplication
      if (
        timeUnit !== 'microsecond' &&
        amount !== BigInt(0) &&
        microsToOperate / amount !== BigInt(this.getMultiplier(timeUnit))
      ) {
        return EvaluateResult.newError();
      }
    } catch (e) {
      // Catch potential BigInt errors (though unlikely with isInteger check)
      logWarn(`Error during timestamp arithmetic: ${e}`);
      return EvaluateResult.newError();
    }

    const initialTimestamp = fromTimestamp(timestampVal.value!.timestampValue!);
    // Check initial timestamp bounds
    if (
      !isTimestampInBounds(
        initialTimestamp.seconds,
        initialTimestamp.nanoseconds
      )
    ) {
      return EvaluateResult.newError();
    }

    const initialMicros = timestampToMicros(initialTimestamp);
    const newMicros = this.newMicros(initialMicros, microsToOperate);

    // Check final microsecond bounds
    if (!isMicrosInBounds(newMicros)) {
      return EvaluateResult.newError();
    }

    // Convert back to seconds and nanos
    const newSeconds = Number(newMicros / MICROSECONDS_PER_SECOND);
    const nanosRemainder = newMicros % MICROSECONDS_PER_SECOND;
    const newNanos = Number(
      (nanosRemainder < 0
        ? nanosRemainder + MICROSECONDS_PER_SECOND
        : nanosRemainder) * BigInt(1000)
    );
    const adjustedSeconds = nanosRemainder < 0 ? newSeconds - 1 : newSeconds;

    // Final check on calculated timestamp bounds
    if (!isTimestampInBounds(adjustedSeconds, newNanos)) {
      return EvaluateResult.newError();
    }

    return EvaluateResult.newValue({
      timestampValue: { seconds: adjustedSeconds, nanos: newNanos }
    });
  }

  private getMultiplier(unit: TimeUnit): number {
    switch (unit) {
      case 'millisecond':
        return 1000;
      case 'second':
        return 1000000;
      case 'minute':
        return 60000000;
      case 'hour':
        return 3600000000;
      case 'day':
        return 86400000000;
      default:
        return 1; // microsecond
    }
  }

  abstract newMicros(initialMicros: bigint, microsToOperation: bigint): bigint;
}

export class CoreTimestampAdd extends TimestampArithmetic {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  newMicros(initialMicros: bigint, microsToAdd: bigint): bigint {
    return initialMicros + microsToAdd;
  }
}

export class CoreTimestampSub extends TimestampArithmetic {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  newMicros(initialMicros: bigint, microsToSub: bigint): bigint {
    return initialMicros - microsToSub;
  }
}
