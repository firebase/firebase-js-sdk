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
  ListOfExprs
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
  Timestamp as ProtoTimestamp
} from '../protos/firestore_proto_api';
import { fromTimestamp, toName, toVersion } from '../remote/serializer';
import { hardAssert } from '../util/assert';
import { logWarn } from '../util/log';
import { isNegativeZero } from '../util/types';

import { EvaluationContext, PipelineInputOutput } from './pipeline_run';

export interface EvaluableExpr {
  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined;
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
    } else if (functionExpr.name === 'is_null') {
      return new CoreIsNull(functionExpr);
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
    } else if (functionExpr.name === 'array_reverse') {
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
  ): Value | undefined {
    if (this.expr.fieldName() === DOCUMENT_KEY_NAME) {
      return {
        referenceValue: toName(context.serializer, input.key)
      };
    }
    if (this.expr.fieldName() === UPDATE_TIME_NAME) {
      return {
        timestampValue: toVersion(context.serializer, input.version)
      };
    }
    if (this.expr.fieldName() === CREATE_TIME_NAME) {
      return {
        timestampValue: toVersion(context.serializer, input.createTime)
      };
    }
    return input.data.field(this.expr.fieldPath) ?? undefined;
  }
}

export class CoreConstant implements EvaluableExpr {
  constructor(private expr: Constant) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    return this.expr._getValue();
  }
}

export class CoreListOfExprs implements EvaluableExpr {
  constructor(private expr: ListOfExprs) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const results = this.expr.exprs.map(expr =>
      toEvaluable(expr).evaluate(context, input)
    );
    if (results.some(value => value === undefined)) {
      return undefined;
    }

    return { arrayValue: { values: results as Value[] } };
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
  ): Value | undefined {
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
    left: Value | undefined,
    right: Value | undefined
  ): Value | undefined {
    if (left === undefined || right === undefined) {
      return undefined;
    }

    if (
      (!isDouble(left) && !isInteger(left)) ||
      (!isDouble(right) && !isInteger(right))
    ) {
      return undefined;
    }

    if (isDouble(left) || isDouble(right)) {
      return this.doubleArith(left, right);
    }

    if (isInteger(left) && isInteger(right)) {
      const result = this.bigIntArith(left, right);
      if (result === undefined) {
        return undefined;
      }

      if (typeof result === 'number') {
        return { doubleValue: result };
      }
      // Check for overflow
      else if (result < LongMinValue || result > LongMaxValue) {
        return undefined; // Simulate overflow error
      } else {
        return { integerValue: `${result}` };
      }
    }
  }
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
      return undefined;
      // return isNegativeZero(asDouble(right))
      //       ? Number.NEGATIVE_INFINITY
      //       : Number.POSITIVE_INFINITY;
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
      return undefined;
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
      return undefined;
    }

    return { doubleValue: asDouble(left) % rightValue };
  }
}

export class CoreAnd implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    let isError = false;
    for (const param of this.expr.params) {
      const result = toEvaluable(param).evaluate(context, input);
      if (result === undefined || !isBoolean(result)) {
        isError = true;
        continue;
      }

      if (isBoolean(result) && !result.booleanValue) {
        return { booleanValue: false };
      }
    }
    return isError ? undefined : { booleanValue: true };
  }
}

export class CoreNot implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 1,
      'not() function should have exactly 1 param'
    );
    const result = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (result === undefined || !isBoolean(result)) {
      return undefined;
    }

    return { booleanValue: !result.booleanValue };
  }
}

export class CoreOr implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    let isError = false;
    for (const param of this.expr.params) {
      const result = toEvaluable(param).evaluate(context, input);
      if (result === undefined || !isBoolean(result)) {
        isError = true;
        continue;
      }

      if (isBoolean(result) && result.booleanValue) {
        return { booleanValue: true };
      }
    }
    return isError ? undefined : { booleanValue: false };
  }
}

export class CoreXor implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    let result = false;
    for (const param of this.expr.params) {
      const evaluated = toEvaluable(param).evaluate(context, input);
      if (evaluated === undefined || !isBoolean(evaluated)) {
        return undefined;
      }

      result = CoreXor.xor(result, evaluated.booleanValue);
    }
    return { booleanValue: result };
  }

  static xor(a: boolean, b: boolean): boolean {
    return (a || b) && !(a && b);
  }
}

export class CoreEqAny implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 2,
      'eq_any() function should have exactly 2 params'
    );
    const searchExpr = this.expr.params[0];
    const searchValue = toEvaluable(searchExpr).evaluate(context, input);
    if (searchValue === undefined) {
      return undefined;
    }

    const arrayExpr = this.expr.params[1];
    const arrayValue = toEvaluable(arrayExpr).evaluate(context, input);

    let hasError = arrayValue === undefined;
    for (const candidate of arrayValue?.arrayValue?.values ?? []) {
      if (candidate === undefined) {
        hasError = true;
        continue;
      }

      if (valueEquals(searchValue, candidate)) {
        return TRUE_VALUE;
      }
    }

    return hasError ? undefined : FALSE_VALUE;
  }
}

export class CoreNotEqAny implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const inverse = new CoreEqAny(new FunctionExpr('eq_any', this.expr.params));
    const result = inverse.evaluate(context, input);
    if (result === undefined) {
      return undefined;
    }
    return { booleanValue: !result.booleanValue };
  }
}

export class CoreIsNan implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 1,
      'is_nan() function should have exactly 1 param'
    );
    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (evaluated === undefined) {
      return undefined;
    }

    if (!isNumber(evaluated)) {
      return undefined;
    }

    return {
      booleanValue: isNaN(
        asDouble(evaluated as { doubleValue: number | string })
      )
    };
  }
}

export class CoreIsNull implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 1,
      'is_null() function should have exactly 1 param'
    );
    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    return {
      booleanValue: evaluated === undefined ? false : isNullValue(evaluated)
    };
  }
}

export class CoreExists implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 1,
      'exists() function should have exactly 1 param'
    );
    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    return evaluated === undefined ? FALSE_VALUE : TRUE_VALUE;
  }
}

export class CoreCond implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 3,
      'cond() function should have exactly 3 param'
    );

    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);

    if (isBoolean(evaluated) && evaluated.booleanValue) {
      return toEvaluable(this.expr.params[1]).evaluate(context, input);
    }

    return toEvaluable(this.expr.params[2]).evaluate(context, input);
  }
}

export class CoreLogicalMaximum implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const values = this.expr.params.map(param =>
      toEvaluable(param).evaluate(context, input)
    );

    let result: Value | undefined;

    for (const value of values) {
      if (value === undefined || valueEquals(value, MIN_VALUE)) {
        continue;
      }

      if (result === undefined) {
        result = value;
      } else {
        result = valueCompare(value, result) > 0 ? value : result;
      }
    }

    return result ?? MIN_VALUE;
  }
}

export class CoreLogicalMinimum implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const values = this.expr.params.map(param =>
      toEvaluable(param).evaluate(context, input)
    );

    let result: Value | undefined;

    for (const value of values) {
      if (value === undefined || valueEquals(value, MIN_VALUE)) {
        continue;
      }

      if (result === undefined) {
        result = value;
      } else {
        result = valueCompare(value, result) < 0 ? value : result;
      }
    }

    return result ?? MIN_VALUE;
  }
}

abstract class ComparisonBase implements EvaluableExpr {
  protected constructor(protected expr: FunctionExpr) {}

  abstract trueCase(left: Value, right: Value): boolean;

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 2,
      `${this.expr.name}() function should have exactly 2 params`
    );

    const left = toEvaluable(this.expr.params[0]).evaluate(context, input);
    const right = toEvaluable(this.expr.params[1]).evaluate(context, input);
    if (left === undefined || right === undefined) {
      return undefined;
    }
    return this.trueCase(left, right) ? TRUE_VALUE : FALSE_VALUE;
  }
}

export class CoreEq extends ComparisonBase {
  constructor(protected expr: FunctionExpr) {
    super(expr);
  }

  trueCase(left: Value, right: Value): boolean {
    return valueEquals(left, right);
  }
}

export class CoreNeq extends ComparisonBase {
  constructor(protected expr: FunctionExpr) {
    super(expr);
  }

  trueCase(left: Value, right: Value): boolean {
    return !valueEquals(left, right);
  }
}

export class CoreLt extends ComparisonBase {
  constructor(protected expr: FunctionExpr) {
    super(expr);
  }

  trueCase(left: Value, right: Value): boolean {
    if (typeOrder(left) !== typeOrder(right)) {
      return false;
    }
    if (isNanValue(left) || isNanValue(right)) {
      return false;
    }
    return valueCompare(left, right) < 0;
  }
}

export class CoreLte extends ComparisonBase {
  constructor(protected expr: FunctionExpr) {
    super(expr);
  }

  trueCase(left: Value, right: Value): boolean {
    if (typeOrder(left) !== typeOrder(right)) {
      return false;
    }
    if (isNanValue(left) || isNanValue(right)) {
      return false;
    }
    if (valueEquals(left, right)) {
      return true;
    }

    return valueCompare(left, right) < 0;
  }
}

export class CoreGt extends ComparisonBase {
  constructor(protected expr: FunctionExpr) {
    super(expr);
  }

  trueCase(left: Value, right: Value): boolean {
    if (typeOrder(left) !== typeOrder(right)) {
      return false;
    }
    if (isNanValue(left) || isNanValue(right)) {
      return false;
    }

    return valueCompare(left, right) > 0;
  }
}

export class CoreGte extends ComparisonBase {
  constructor(protected expr: FunctionExpr) {
    super(expr);
  }

  trueCase(left: Value, right: Value): boolean {
    if (typeOrder(left) !== typeOrder(right)) {
      return false;
    }
    if (isNanValue(left) || isNanValue(right)) {
      return false;
    }
    if (valueEquals(left, right)) {
      return true;
    }

    return valueCompare(left, right) > 0;
  }
}

export class CoreArrayConcat implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreArrayReverse implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 1,
      'array_reverse() function should have exactly one parameter'
    );
    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (
      evaluated === undefined ||
      !Array.isArray(evaluated.arrayValue?.values)
    ) {
      return undefined;
    }

    return { arrayValue: { values: evaluated.arrayValue?.values.reverse() } };
  }
}

export class CoreArrayContains implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 2,
      'array_contains() function should have exactly two parameters'
    );

    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (evaluated === undefined || !isArray(evaluated)) {
      return undefined;
    }

    const element = toEvaluable(this.expr.params[1]).evaluate(context, input);
    if (evaluated === undefined || element === undefined) {
      return undefined;
    }

    return evaluated.arrayValue.values?.some(val => valueEquals(val, element!))
      ? TRUE_VALUE
      : FALSE_VALUE;
  }
}

export class CoreArrayContainsAll implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 2,
      'array_contains_all() function should have exactly two parameters'
    );

    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (evaluated === undefined || !isArray(evaluated)) {
      return undefined;
    }

    const elements = toEvaluable(this.expr.params[1]).evaluate(context, input);
    if (evaluated === undefined || !isArray(evaluated)) {
      return undefined;
    }

    for (const element of elements?.arrayValue?.values ?? []) {
      let found = false;
      for (const val of evaluated.arrayValue.values ?? []) {
        if (element !== undefined && valueEquals(val, element!)) {
          found = true;
          break;
        }
      }

      if (!found) {
        return FALSE_VALUE;
      }
    }

    return TRUE_VALUE;
  }
}

export class CoreArrayContainsAny implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 2,
      'array_contains_any() function should have exactly two parameters'
    );

    const evaluatedExpr = toEvaluable(this.expr.params[0]).evaluate(
      context,
      input
    );
    if (evaluatedExpr === undefined || !isArray(evaluatedExpr)) {
      return undefined;
    }

    const candidates = toEvaluable(this.expr.params[1]).evaluate(
      context,
      input
    );
    if (candidates === undefined || !isArray(candidates)) {
      return undefined;
    }

    for (const element of candidates.arrayValue.values ?? []) {
      for (const val of evaluatedExpr.arrayValue.values ?? []) {
        if (element === undefined) {
          return undefined;
        }
        if (valueEquals(val, element!)) {
          return TRUE_VALUE;
        }
      }
    }

    return FALSE_VALUE;
  }
}

export class CoreArrayLength implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 1,
      'array_length() function should have exactly one parameter'
    );
    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (evaluated === undefined || !isArray(evaluated)) {
      return undefined;
    }

    return { integerValue: `${evaluated.arrayValue.values?.length ?? 0}` };
  }
}

export class CoreArrayElement implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreReverse implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 1,
      'reverse() function should have exactly one parameter'
    );
    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (evaluated === undefined) {
      return undefined;
    }

    if (!isString(evaluated)) {
      return undefined;
    }

    return { stringValue: evaluated.stringValue.split('').reverse().join('') };
  }
}

export class CoreReplaceFirst implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreReplaceAll implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

function getUnicodePointCount(str: string) {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    const codePoint = str.codePointAt(i);

    if (codePoint === undefined) {
      return undefined;
    }

    if (codePoint <= 0xdfff) {
      count += 1;
    } else if (codePoint <= 0x10ffff) {
      count += 1;
      i++;
    } else {
      return undefined; // Invalid code point (should not normally happen)
    }
  }
  return count;
}

export class CoreCharLength implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 1,
      'char_length() function should have exactly one parameter'
    );
    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);

    if (evaluated === undefined) {
      return undefined;
    }

    if (isString(evaluated)) {
      return { integerValue: getUnicodePointCount(evaluated.stringValue) };
    } else if (isNullValue(evaluated)) {
      return MIN_VALUE;
    } else {
      return undefined;
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
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 1,
      'byte_length() function should have exactly one parameter'
    );
    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);

    if (evaluated === undefined) {
      return undefined;
    }

    if (isString(evaluated)) {
      // return the number of bytes in the string
      const result = getUtf8ByteLength(evaluated.stringValue);
      return result === undefined
        ? result
        : {
            integerValue: result
          };
    } else if (isBytes(evaluated)) {
      return { integerValue: evaluated.bytesValue.length };
    } else if (isNullValue(evaluated)) {
      return MIN_VALUE;
    } else {
      return undefined;
    }
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
      case '\\':
        result += '\\\\';
        break;
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
  return result;
}

export class CoreLike implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 2,
      'like() function should have exactly two parameters'
    );

    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    const pattern = toEvaluable(this.expr.params[1]).evaluate(context, input);
    if (pattern === undefined || !isString(pattern)) {
      return undefined;
    }

    return {
      booleanValue: RE2JS.matches(
        likeToRegex(pattern.stringValue),
        evaluated.stringValue
      )
    };
  }
}

export class CoreRegexContains implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 2,
      'regex_contains() function should have exactly two parameters'
    );

    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    const pattern = toEvaluable(this.expr.params[1]).evaluate(context, input);
    if (pattern === undefined || !isString(pattern)) {
      return undefined;
    }

    try {
      const regex = RE2JS.compile(pattern.stringValue);
      return {
        booleanValue: regex.matcher(evaluated.stringValue).find()
      };
    } catch (RE2JSError) {
      logWarn(
        `Invalid regex pattern found: ${pattern.stringValue}, returning error`
      );
      return undefined;
    }
  }
}

export class CoreRegexMatch implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 2,
      'regex_match() function should have exactly two parameters'
    );

    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    const pattern = toEvaluable(this.expr.params[1]).evaluate(context, input);
    if (pattern === undefined || !isString(pattern)) {
      return undefined;
    }

    try {
      const regex = RE2JS.compile(pattern.stringValue);
      return {
        booleanValue: RE2JS.compile(pattern.stringValue).matches(
          evaluated.stringValue
        )
      };
    } catch (RE2JSError) {
      logWarn(
        `Invalid regex pattern found: ${pattern.stringValue}, returning error`
      );
      return undefined;
    }
  }
}

export class CoreStrContains implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 2,
      'str_contains() function should have exactly two parameters'
    );

    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    const substring = toEvaluable(this.expr.params[1]).evaluate(context, input);
    if (substring === undefined || !isString(substring)) {
      return undefined;
    }

    return {
      booleanValue: evaluated.stringValue.includes(substring.stringValue)
    };
  }
}

export class CoreStartsWith implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 2,
      'starts_with() function should have exactly two parameters'
    );

    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    const prefix = toEvaluable(this.expr.params[1]).evaluate(context, input);
    if (prefix === undefined || !isString(prefix)) {
      return undefined;
    }

    return {
      booleanValue: evaluated.stringValue.startsWith(prefix.stringValue)
    };
  }
}

export class CoreEndsWith implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 2,
      'ends_with() function should have exactly two parameters'
    );

    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    const suffix = toEvaluable(this.expr.params[1]).evaluate(context, input);
    if (suffix === undefined || !isString(suffix)) {
      return undefined;
    }

    return { booleanValue: evaluated.stringValue.endsWith(suffix.stringValue) };
  }
}

export class CoreToLower implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 1,
      'to_lower() function should have exactly one parameter'
    );

    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    return { stringValue: evaluated.stringValue.toLowerCase() };
  }
}

export class CoreToUpper implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 1,
      'to_upper() function should have exactly one parameter'
    );

    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    return { stringValue: evaluated.stringValue.toUpperCase() };
  }
}

export class CoreTrim implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 1,
      'trim() function should have exactly one parameter'
    );

    const evaluated = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    return { stringValue: evaluated.stringValue.trim() };
  }
}

export class CoreStrConcat implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = this.expr.params.map(val =>
      toEvaluable(val).evaluate(context, input)
    );
    if (evaluated.some(val => val === undefined || !isString(val))) {
      return undefined;
    }

    return { stringValue: evaluated.map(val => val!.stringValue).join('') };
  }
}

export class CoreMapGet implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 2,
      'map_get() function should have exactly two parameters'
    );

    const evaluatedMap = toEvaluable(this.expr.params[0]).evaluate(
      context,
      input
    );
    if (evaluatedMap === undefined || !isMapValue(evaluatedMap)) {
      return undefined;
    }

    const subfield = toEvaluable(this.expr.params[1]).evaluate(context, input);
    if (subfield === undefined || !isString(subfield)) {
      return undefined;
    }

    return evaluatedMap.mapValue.fields?.[subfield.stringValue];
  }
}

export class CoreCount implements EvaluableExpr {
  constructor(private expr: AggregateFunction) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreSum implements EvaluableExpr {
  constructor(private expr: AggregateFunction) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreAvg implements EvaluableExpr {
  constructor(private expr: AggregateFunction) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreMinimum implements EvaluableExpr {
  constructor(private expr: AggregateFunction) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreMaximum implements EvaluableExpr {
  constructor(private expr: AggregateFunction) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
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
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 2,
      `${this.expr.name}() function should have exactly 2 params`
    );

    const vector1 = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (vector1 === undefined || !isVectorValue(vector1)) {
      return undefined;
    }

    const vector2 = toEvaluable(this.expr.params[1]).evaluate(context, input);
    if (vector2 === undefined || !isVectorValue(vector2)) {
      return undefined;
    }

    const vectorValue1 = getVectorValue(vector1);
    const vectorValue2 = getVectorValue(vector2);
    if (
      vectorValue1 === undefined ||
      vectorValue2 === undefined ||
      vectorValue1.values?.length !== vectorValue2.values?.length
    ) {
      return undefined;
    }

    const distance = this.calculateDistance(vectorValue1, vectorValue2);
    if (distance === undefined || isNaN(distance)) {
      return undefined;
    }

    return { doubleValue: distance };
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
    // calculate cosine distance between vectorValue1.values and vectorValue2.values
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    for (let i = 0; i < (vec1?.values || []).length; i++) {
      dotProduct +=
        Number(vec1?.values![i].doubleValue) *
        Number(vec2?.values![i].doubleValue);
      magnitude1 += Math.pow(Number(vec1?.values![i].doubleValue), 2);
      magnitude2 += Math.pow(Number(vec2?.values![i].doubleValue), 2);
    }
    const magnitude = Math.sqrt(magnitude1) * Math.sqrt(magnitude2);
    if (magnitude === 0) {
      return undefined;
    }

    return 1 - dotProduct / magnitude;
  }
}

export class CoreDotProduct extends DistanceBase {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  calculateDistance(
    vec1: ArrayValue | undefined,
    vec2: ArrayValue | undefined
  ): number {
    // calculate dotproduct between vectorValue1.values and vectorValue2.values
    let dotProduct = 0;
    for (let i = 0; i < (vec1?.values || []).length; i++) {
      dotProduct +=
        Number(vec1?.values![i].doubleValue) *
        Number(vec2?.values![i].doubleValue);
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
  ): number {
    let euclideanDistance = 0;
    for (let i = 0; i < (vec1?.values || []).length; i++) {
      euclideanDistance += Math.pow(
        Number(vec1?.values![i].doubleValue) -
          Number(vec2?.values![i].doubleValue),
        2
      );
    }

    return Math.sqrt(euclideanDistance);
  }
}

export class CoreVectorLength implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 1,
      'vector_length() function should have exactly one parameter'
    );

    const vector = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (vector === undefined || !isVectorValue(vector)) {
      return undefined;
    }

    const vectorValue = getVectorValue(vector);

    return { integerValue: vectorValue?.values?.length ?? 0 };
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
  TIMESTAMP_MAX_SECONDS * MILLISECONDS_PER_SECOND +
  (MILLISECONDS_PER_SECOND - BigInt(1));

// 0001-01-01T00:00:00.000000Z
const TIMESTAMP_MIN_MICROSECONDS: bigint =
  TIMESTAMP_MIN_SECONDS * MICROSECONDS_PER_SECOND;
// 9999-12-31T23:59:59.999999Z - but the max timestamp has 999,999,999 nanoseconds
const TIMESTAMP_MAX_MICROSECONDS: bigint =
  TIMESTAMP_MAX_SECONDS * MICROSECONDS_PER_SECOND +
  (MICROSECONDS_PER_SECOND - BigInt(1));

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
  if (seconds < TIMESTAMP_MIN_SECONDS || seconds > TIMESTAMP_MAX_SECONDS) {
    return false;
  }

  if (nanos < 0 || nanos >= MICROSECONDS_PER_SECOND * BigInt(1000)) {
    return false;
  }

  return true;
}

function timestampToMicros(timestamp: Timestamp): bigint {
  return (
    BigInt(timestamp.seconds) * MICROSECONDS_PER_SECOND +
    BigInt(timestamp.nanoseconds) / BigInt(1000)
  );
}

abstract class UnixToTimestamp implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 1,
      `${this.expr.name}() function should have exactly one parameter`
    );

    const value = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (isNullValue(value)) {
      return MIN_VALUE;
    }
    if (value === undefined || !isInteger(value)) {
      return undefined;
    }

    return this.toTimestamp(BigInt(value.integerValue));
  }

  abstract toTimestamp(value: bigint): Value | undefined;
}

export class CoreUnixMicrosToTimestamp extends UnixToTimestamp {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  toTimestamp(value: bigint): Value | undefined {
    if (!isMicrosInBounds(value)) {
      return undefined;
    }

    const seconds = Number(value / MICROSECONDS_PER_SECOND);
    const nanos = Number((value % MICROSECONDS_PER_SECOND) * BigInt(1000));
    return { timestampValue: { seconds, nanos } };
  }
}

export class CoreUnixMillisToTimestamp extends UnixToTimestamp {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  toTimestamp(value: bigint): Value | undefined {
    if (!isMillisInBounds(value)) {
      return undefined;
    }

    const seconds = Number(value / MILLISECONDS_PER_SECOND);
    const nanos = Number(
      (value % MILLISECONDS_PER_SECOND) * BigInt(1000 * 1000)
    );

    return { timestampValue: { seconds, nanos } };
  }
}

export class CoreUnixSecondsToTimestamp extends UnixToTimestamp {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  toTimestamp(value: bigint): Value | undefined {
    if (!isSecondsInBounds(value)) {
      return undefined;
    }

    const seconds = Number(value);
    return { timestampValue: { seconds, nanos: 0 } };
  }
}

abstract class TimestampToUnix implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 1,
      `${this.expr.name}() function should have exactly one parameter`
    );

    const value = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (isNullValue(value)) {
      return MIN_VALUE;
    }
    if (value === undefined || !isTimestampValue(value)) {
      return undefined;
    }
    const timestamp = fromTimestamp(value.timestampValue!);
    if (!isTimestampInBounds(timestamp.seconds, timestamp.nanoseconds)) {
      return undefined;
    }

    return this.toUnix(timestamp);
  }

  abstract toUnix(value: Timestamp): Value | undefined;
}

export class CoreTimestampToUnixMicros extends TimestampToUnix {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  toUnix(timestamp: Timestamp): Value | undefined {
    return { integerValue: `${timestampToMicros(timestamp).toString()}` };
  }
}

export class CoreTimestampToUnixMillis extends TimestampToUnix {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  toUnix(timestamp: Timestamp): Value | undefined {
    const micros = timestampToMicros(timestamp);
    const millis = micros / BigInt(1000);
    const submillis = micros % BigInt(1000);
    if (millis > BigInt(0) || submillis === BigInt(0)) {
      return { integerValue: millis.toString() };
    } else {
      return { integerValue: (millis - BigInt(1)).toString() };
    }
  }
}

export class CoreTimestampToUnixSeconds extends TimestampToUnix {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  toUnix(timestamp: Timestamp): Value | undefined {
    const micros = timestampToMicros(timestamp);
    const seconds = micros / BigInt(1000 * 1000);
    const subseconds = micros % BigInt(1000 * 1000);
    if (seconds > BigInt(0) || subseconds === BigInt(0)) {
      return { integerValue: seconds.toString() };
    } else {
      return { integerValue: (seconds - BigInt(1)).toString() };
    }
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
  ): Value | undefined {
    hardAssert(
      this.expr.params.length === 3,
      `${this.expr.name}() function should have exactly 3 parameters`
    );

    const timestamp = toEvaluable(this.expr.params[0]).evaluate(context, input);
    if (isNullValue(timestamp)) {
      return MIN_VALUE;
    }
    if (timestamp === undefined || !isTimestampValue(timestamp)) {
      return undefined;
    }

    const unit = toEvaluable(this.expr.params[1]).evaluate(context, input);
    if (isNullValue(unit)) {
      return MIN_VALUE;
    }
    if (unit === undefined || !isString(unit)) {
      return undefined;
    }
    const timeUnit = asTimeUnit(unit.stringValue);
    if (timeUnit === undefined) {
      return undefined;
    }

    const amountValue = toEvaluable(this.expr.params[2]).evaluate(
      context,
      input
    );
    if (isNullValue(amountValue)) {
      return MIN_VALUE;
    }
    if (amountValue === undefined || !isInteger(amountValue)) {
      return undefined;
    }

    const amount = amountValue.integerValue;
    let microsToOperate: bigint;
    switch (timeUnit) {
      case 'microsecond':
        microsToOperate = BigInt(amount);
        break;
      case 'millisecond':
        microsToOperate = BigInt(amount) * BigInt(1000);
        break;
      case 'second':
        microsToOperate = BigInt(amount) * BigInt(1000000);
        break;
      case 'minute':
        microsToOperate = BigInt(amount) * BigInt(60000000);
        break;
      case 'hour':
        microsToOperate = BigInt(amount) * BigInt(3600000000);
        break;
      case 'day':
        microsToOperate = BigInt(amount) * BigInt(86400000000);
        break;
      default:
        return undefined;
    }

    const newMicros = this.newMicros(
      timestamp.timestampValue!,
      microsToOperate
    );

    if (!isMicrosInBounds(newMicros)) {
      return undefined;
    }

    const newSeconds = Number(newMicros / BigInt(1000000));
    const newNanos = Number((newMicros % BigInt(1000000)) * BigInt(1000));
    return { timestampValue: { seconds: newSeconds, nanos: newNanos } };
  }

  abstract newMicros(
    timestamp: ProtoTimestamp,
    microsToOperation: bigint
  ): bigint;
}

export class CoreTimestampAdd extends TimestampArithmetic {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  newMicros(protoTimestamp: ProtoTimestamp, microsToAdd: bigint): bigint {
    const timestamp = fromTimestamp(protoTimestamp);
    return timestampToMicros(timestamp) + microsToAdd;
  }
}

export class CoreTimestampSub extends TimestampArithmetic {
  constructor(expr: FunctionExpr) {
    super(expr);
  }

  newMicros(protoTimestamp: ProtoTimestamp, microsToSub: bigint): bigint {
    const timestamp = fromTimestamp(protoTimestamp);
    return timestampToMicros(timestamp) - microsToSub;
  }
}
