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

import {
  ArrayValue,
  Value,
  Function as ProtoFunction
} from '../protos/firestore_proto_api';
import { EvaluationContext, PipelineInputOutput } from './pipeline_run';
import {
  Field,
  Constant,
  BooleanExpr, Expr, FunctionExpr
} from '../lite-api/expressions';
import {
  CREATE_TIME_NAME,
  DOCUMENT_KEY_NAME,
  FieldPath,
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
  isVectorValue,
  MAX_VALUE,
  MIN_VALUE,
  TRUE_VALUE,
  typeOrder,
  valueCompare,
  valueEquals as valueEqualsWithOptions,
  VECTOR_MAP_VECTORS_KEY
} from '../model/values';

import { RE2JS } from 're2js';
import { toName, toTimestamp, toVersion } from '../remote/serializer';
import { exprFromProto } from './pipeline_serialize';
import { isNegativeZero } from '../util/types';
import { logWarn } from '../util/log';

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
  } else if (expr instanceof Add) {
    return new CoreAdd(expr);
  } else if (expr instanceof Subtract) {
    return new CoreSubtract(expr);
  } else if (expr instanceof Multiply) {
    return new CoreMultiply(expr);
  } else if (expr instanceof Divide) {
    return new CoreDivide(expr);
  } else if (expr instanceof Mod) {
    return new CoreMod(expr);
  } else if (expr instanceof And) {
    return new CoreAnd(expr);
  } else if (expr instanceof Eq) {
    return new CoreEq(expr);
  } else if (expr instanceof Neq) {
    return new CoreNeq(expr);
  } else if (expr instanceof Lt) {
    return new CoreLt(expr);
  } else if (expr instanceof Lte) {
    return new CoreLte(expr);
  } else if (expr instanceof Gt) {
    return new CoreGt(expr);
  } else if (expr instanceof Gte) {
    return new CoreGte(expr);
  } else if (expr instanceof ArrayConcat) {
    return new CoreArrayConcat(expr);
  } else if (expr instanceof ArrayReverse) {
    return new CoreArrayReverse(expr);
  } else if (expr instanceof ArrayContains) {
    return new CoreArrayContains(expr);
  } else if (expr instanceof ArrayContainsAll) {
    return new CoreArrayContainsAll(expr);
  } else if (expr instanceof ArrayContainsAny) {
    return new CoreArrayContainsAny(expr);
  } else if (expr instanceof ArrayLength) {
    return new CoreArrayLength(expr);
  } else if (expr instanceof ArrayElement) {
    return new CoreArrayElement(expr);
  } else if (expr instanceof EqAny) {
    return new CoreEqAny(expr);
  } else if (expr instanceof NotEqAny) {
    return new CoreNotEqAny(expr);
  } else if (expr instanceof IsNan) {
    return new CoreIsNan(expr);
  } else if (expr instanceof IsNull) {
    return new CoreIsNull(expr);
  } else if (expr instanceof Exists) {
    return new CoreExists(expr);
  } else if (expr instanceof Not) {
    return new CoreNot(expr);
  } else if (expr instanceof Or) {
    return new CoreOr(expr);
  } else if (expr instanceof Xor) {
    return new CoreXor(expr);
  } else if (expr instanceof Cond) {
    return new CoreCond(expr);
  } else if (expr instanceof LogicalMaximum) {
    return new CoreLogicalMaximum(expr);
  } else if (expr instanceof LogicalMinimum) {
    return new CoreLogicalMinimum(expr);
  } else if (expr instanceof Reverse) {
    return new CoreReverse(expr);
  } else if (expr instanceof ReplaceFirst) {
    return new CoreReplaceFirst(expr);
  } else if (expr instanceof ReplaceAll) {
    return new CoreReplaceAll(expr);
  } else if (expr instanceof CharLength) {
    return new CoreCharLength(expr);
  } else if (expr instanceof ByteLength) {
    return new CoreByteLength(expr);
  } else if (expr instanceof Like) {
    return new CoreLike(expr);
  } else if (expr instanceof RegexContains) {
    return new CoreRegexContains(expr);
  } else if (expr instanceof RegexMatch) {
    return new CoreRegexMatch(expr);
  } else if (expr instanceof StrContains) {
    return new CoreStrContains(expr);
  } else if (expr instanceof StartsWith) {
    return new CoreStartsWith(expr);
  } else if (expr instanceof EndsWith) {
    return new CoreEndsWith(expr);
  } else if (expr instanceof ToLower) {
    return new CoreToLower(expr);
  } else if (expr instanceof ToUpper) {
    return new CoreToUpper(expr);
  } else if (expr instanceof Trim) {
    return new CoreTrim(expr);
  } else if (expr instanceof StrConcat) {
    return new CoreStrConcat(expr);
  } else if (expr instanceof MapGet) {
    return new CoreMapGet(expr);
  } else if (expr instanceof Count) {
    return new CoreCount(expr);
  } else if (expr instanceof Sum) {
    return new CoreSum(expr);
  } else if (expr instanceof Avg) {
    return new CoreAvg(expr);
  } else if (expr instanceof Minimum) {
    return new CoreMinimum(expr);
  } else if (expr instanceof Maximum) {
    return new CoreMaximum(expr);
  } else if (expr instanceof CosineDistance) {
    return new CoreCosineDistance(expr);
  } else if (expr instanceof DotProduct) {
    return new CoreDotProduct(expr);
  } else if (expr instanceof EuclideanDistance) {
    return new CoreEuclideanDistance(expr);
  } else if (expr instanceof VectorLength) {
    return new CoreVectorLength(expr);
  } else if (expr instanceof UnixMicrosToTimestamp) {
    return new CoreUnixMicrosToTimestamp(expr);
  } else if (expr instanceof TimestampToUnixMicros) {
    return new CoreTimestampToUnixMicros(expr);
  } else if (expr instanceof UnixMillisToTimestamp) {
    return new CoreUnixMillisToTimestamp(expr);
  } else if (expr instanceof TimestampToUnixMillis) {
    return new CoreTimestampToUnixMillis(expr);
  } else if (expr instanceof UnixSecondsToTimestamp) {
    return new CoreUnixSecondsToTimestamp(expr);
  } else if (expr instanceof TimestampToUnixSeconds) {
    return new CoreTimestampToUnixSeconds(expr);
  } else if (expr instanceof TimestampAdd) {
    return new CoreTimestampAdd(expr);
  } else if (expr instanceof TimestampSub) {
    return new CoreTimestampSub(expr);
  }

  throw new Error(`Unknown Expr type: ${expr}`);
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

abstract class BigIntOrDoubleArithmetics<
  T extends Add | Subtract | Multiply | Divide | Mod
> implements EvaluableExpr
{
  protected constructor(protected expr: T) {}

  getLeft(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    return toEvaluable(this.expr.left).evaluate(context, input);
  }

  getRight(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    return toEvaluable(this.expr.right).evaluate(context, input);
  }

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
    const left = this.getLeft(context, input);
    const right = this.getRight(context, input);
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

export class CoreAdd extends BigIntOrDoubleArithmetics<Add> {
  constructor(protected expr: Add) {
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

  static fromProtoToApiObj(value: ProtoFunction): Add {
    return new Add(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreSubtract extends BigIntOrDoubleArithmetics<Subtract> {
  constructor(protected expr: Subtract) {
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

  static fromProtoToApiObj(value: ProtoFunction): Subtract {
    return new Subtract(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreMultiply extends BigIntOrDoubleArithmetics<Multiply> {
  constructor(protected expr: Multiply) {
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

  static fromProtoToApiObj(value: ProtoFunction): Multiply {
    return new Multiply(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreDivide extends BigIntOrDoubleArithmetics<Divide> {
  constructor(protected expr: Divide) {
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

  static fromProtoToApiObj(value: ProtoFunction): Divide {
    return new Divide(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreMod extends BigIntOrDoubleArithmetics<Mod> {
  constructor(protected expr: Mod) {
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

  static fromProtoToApiObj(value: ProtoFunction): Mod {
    return new Mod(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreAnd implements EvaluableExpr {
  constructor(private expr: And) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    let isError = false;
    for (const param of this.expr.conditions) {
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

  static fromProtoToApiObj(value: ProtoFunction): And {
    return new And(value.args!.map(exprFromProto) as FilterCondition[]);
  }
}

export class CoreNot implements EvaluableExpr {
  constructor(private expr: Not) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const result = toEvaluable(this.expr.expr).evaluate(context, input);
    if (result === undefined || !isBoolean(result)) {
      return undefined;
    }

    return { booleanValue: !result.booleanValue };
  }

  static fromProtoToApiObj(value: ProtoFunction): Not {
    return new Not(exprFromProto(value.args![0]));
  }
}

export class CoreOr implements EvaluableExpr {
  constructor(private expr: Or) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    let isError = false;
    for (const param of this.expr.conditions) {
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

  static fromProtoToApiObj(value: ProtoFunction): Or {
    return new Or(value.args!.map(exprFromProto) as FilterCondition[]);
  }
}

export class CoreXor implements EvaluableExpr {
  constructor(private expr: Xor) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    let result = false;
    for (const param of this.expr.conditions) {
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

  static fromProtoToApiObj(value: ProtoFunction): Xor {
    return new Xor(value.args!.map(exprFromProto) as FilterCondition[]);
  }
}

export class CoreEqAny implements EvaluableExpr {
  constructor(private expr: FunctionExpr) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const searchValue = toEvaluable(this.expr.left).evaluate(context, input);
    if (searchValue === undefined) {
      return undefined;
    }

    const candidates = this.expr.others.map(candidate =>
      toEvaluable(candidate).evaluate(context, input)
    );

    let hasError = false;
    for (const candidate of candidates) {
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

  static fromProtoToApiObj(value: ProtoFunction): EqAny {
    return new EqAny(
      exprFromProto(value.args![0]),
      value.args!.slice(1).map(exprFromProto)
    );
  }
}

export class CoreNotEqAny implements EvaluableExpr {
  constructor(private expr: NotEqAny) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const inverse = new CoreEqAny(new EqAny(this.expr.left, this.expr.others));
    const result = inverse.evaluate(context, input);
    if (result === undefined) {
      return undefined;
    }
    return { booleanValue: !result.booleanValue };
  }

  static fromProtoToApiObj(value: ProtoFunction): EqAny {
    return new EqAny(
      exprFromProto(value.args![0]),
      value.args!.slice(1).map(exprFromProto)
    );
  }
}

export class CoreIsNan implements EvaluableExpr {
  constructor(private expr: IsNan) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.expr).evaluate(context, input);
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

  static fromProtoToApiObj(value: ProtoFunction): IsNan {
    return new IsNan(exprFromProto(value.args![0]));
  }
}

export class CoreIsNull implements EvaluableExpr {
  constructor(private expr: IsNull) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.expr).evaluate(context, input);
    return {
      booleanValue: evaluated === undefined ? false : isNullValue(evaluated)
    };
  }

  static fromProtoToApiObj(value: ProtoFunction): IsNan {
    return new IsNan(exprFromProto(value.args![0]));
  }
}

export class CoreExists implements EvaluableExpr {
  constructor(private expr: Exists) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.expr).evaluate(context, input);
    return evaluated === undefined ? FALSE_VALUE : TRUE_VALUE;
  }

  static fromProtoToApiObj(value: ProtoFunction): Exists {
    return new Exists(exprFromProto(value.args![0]));
  }
}

export class CoreCond implements EvaluableExpr {
  constructor(private expr: Cond) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.condition).evaluate(context, input);

    if (isBoolean(evaluated) && evaluated.booleanValue) {
      return toEvaluable(this.expr.thenExpr).evaluate(context, input);
    }

    return toEvaluable(this.expr.elseExpr).evaluate(context, input);
  }

  static fromProtoToApiObj(value: ProtoFunction): Cond {
    return new Cond(
      exprFromProto(value.args![0]) as FilterCondition,
      exprFromProto(value.args![1]),
      exprFromProto(value.args![2])
    );
  }
}

export class CoreLogicalMaximum implements EvaluableExpr {
  constructor(private expr: LogicalMaximum) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const values = [
      toEvaluable(this.expr.left).evaluate(context, input),
      toEvaluable(this.expr.right).evaluate(context, input)
    ];

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

  static fromProtoToApiObj(value: ProtoFunction): LogicalMaximum {
    return new LogicalMaximum(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreLogicalMinimum implements EvaluableExpr {
  constructor(private expr: LogicalMinimum) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const values = [
      toEvaluable(this.expr.left).evaluate(context, input),
      toEvaluable(this.expr.right).evaluate(context, input)
    ];

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

  static fromProtoToApiObj(value: ProtoFunction): LogicalMinimum {
    return new LogicalMinimum(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

abstract class ComparisonBase<T extends Eq | Neq | Lt | Lte | Gt | Gte>
  implements EvaluableExpr
{
  protected constructor(protected expr: T) {}

  abstract trueCase(left: Value, right: Value): boolean;

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const left = toEvaluable(this.expr.left).evaluate(context, input);
    const right = toEvaluable(this.expr.right).evaluate(context, input);
    if (left === undefined || right === undefined) {
      return undefined;
    }
    return this.trueCase(left, right) ? TRUE_VALUE : FALSE_VALUE;
  }
}

export class CoreEq extends ComparisonBase<Eq> {
  constructor(protected expr: Eq) {
    super(expr);
  }

  trueCase(left: Value, right: Value): boolean {
    return valueEquals(left, right);
  }

  static fromProtoToApiObj(value: ProtoFunction): Eq {
    return new Eq(exprFromProto(value.args![0]), exprFromProto(value.args![1]));
  }
}

export class CoreNeq extends ComparisonBase<Neq> {
  constructor(protected expr: Neq) {
    super(expr);
  }

  trueCase(left: Value, right: Value): boolean {
    return !valueEquals(left, right);
  }

  static fromProtoToApiObj(value: ProtoFunction): Neq {
    return new Neq(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreLt extends ComparisonBase<Lt> {
  constructor(protected expr: Lt) {
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

  static fromProtoToApiObj(value: ProtoFunction): Lt {
    return new Lt(exprFromProto(value.args![0]), exprFromProto(value.args![1]));
  }
}

export class CoreLte extends ComparisonBase<Lte> {
  constructor(protected expr: Lte) {
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

  static fromProtoToApiObj(value: ProtoFunction): Lte {
    return new Lte(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreGt extends ComparisonBase<Gt> {
  constructor(protected expr: Gt) {
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

  static fromProtoToApiObj(value: ProtoFunction): Gt {
    return new Gt(exprFromProto(value.args![0]), exprFromProto(value.args![1]));
  }
}

export class CoreGte extends ComparisonBase<Gte> {
  constructor(protected expr: Gte) {
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

  static fromProtoToApiObj(value: ProtoFunction): Gte {
    return new Gte(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreArrayConcat implements EvaluableExpr {
  constructor(private expr: ArrayConcat) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }

  static fromProtoToApiObj(value: ProtoFunction): ArrayConcat {
    return new ArrayConcat(
      exprFromProto(value.args![0]),
      value.args!.slice(1).map(exprFromProto)
    );
  }
}

export class CoreArrayReverse implements EvaluableExpr {
  constructor(private expr: ArrayReverse) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.array).evaluate(context, input);
    if (
      evaluated === undefined ||
      !Array.isArray(evaluated.arrayValue?.values)
    ) {
      return undefined;
    }

    return { arrayValue: { values: evaluated.arrayValue?.values.reverse() } };
  }

  static fromProtoToApiObj(value: ProtoFunction): ArrayReverse {
    return new ArrayReverse(exprFromProto(value.args![0]));
  }
}

export class CoreArrayContains implements EvaluableExpr {
  constructor(private expr: ArrayContains) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.array).evaluate(context, input);
    if (evaluated === undefined || !isArray(evaluated)) {
      return undefined;
    }

    const element = toEvaluable(this.expr.element).evaluate(context, input);
    if (evaluated === undefined || element === undefined) {
      return undefined;
    }

    return evaluated.arrayValue.values?.some(val => valueEquals(val, element!))
      ? TRUE_VALUE
      : FALSE_VALUE;
  }

  static fromProtoToApiObj(value: ProtoFunction): ArrayContains {
    return new ArrayContains(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreArrayContainsAll implements EvaluableExpr {
  constructor(private expr: ArrayContainsAll) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.array).evaluate(context, input);
    if (evaluated === undefined || !isArray(evaluated)) {
      return undefined;
    }

    const elements = this.expr.values.map(val =>
      toEvaluable(val).evaluate(context, input)
    );

    for (const element of elements) {
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

  static fromProtoToApiObj(value: ProtoFunction): ArrayContainsAll {
    return new ArrayContainsAll(
      exprFromProto(value.args![0]),
      value.args!.slice(1).map(exprFromProto)
    );
  }
}

export class CoreArrayContainsAny implements EvaluableExpr {
  constructor(private expr: ArrayContainsAny) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluatedExpr = toEvaluable(this.expr.array).evaluate(context, input);
    if (evaluatedExpr === undefined || !isArray(evaluatedExpr)) {
      return undefined;
    }

    const candidates = this.expr.values.map(val =>
      toEvaluable(val).evaluate(context, input)
    );

    for (const element of candidates) {
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

  static fromProtoToApiObj(value: ProtoFunction): ArrayContainsAny {
    return new ArrayContainsAny(
      exprFromProto(value.args![0]),
      value.args!.slice(1).map(exprFromProto)
    );
  }
}

export class CoreArrayLength implements EvaluableExpr {
  constructor(private expr: ArrayLength) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.array).evaluate(context, input);
    if (evaluated === undefined || !isArray(evaluated)) {
      return undefined;
    }

    return { integerValue: `${evaluated.arrayValue.values?.length ?? 0}` };
  }

  static fromProtoToApiObj(value: ProtoFunction): ArrayLength {
    return new ArrayLength(exprFromProto(value.args![0]));
  }
}

export class CoreArrayElement implements EvaluableExpr {
  constructor(private expr: ArrayElement) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }

  static fromProtoToApiObj(value: ProtoFunction): ArrayElement {
    throw new Error('Unimplemented');
  }
}

export class CoreReverse implements EvaluableExpr {
  constructor(private expr: Reverse) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.value).evaluate(context, input);
    if (evaluated === undefined) {
      return undefined;
    }

    if (!isString(evaluated)) {
      return undefined;
    }

    return { stringValue: evaluated.stringValue.split('').reverse().join('') };
  }

  static fromProtoToApiObj(value: ProtoFunction): Reverse {
    return new Reverse(exprFromProto(value.args![0]));
  }
}

export class CoreReplaceFirst implements EvaluableExpr {
  constructor(private expr: ReplaceFirst) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }

  static fromProtoToApiObj(value: ProtoFunction): ReplaceFirst {
    throw new Error('Unimplemented');
  }
}

export class CoreReplaceAll implements EvaluableExpr {
  constructor(private expr: ReplaceAll) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }

  static fromProtoToApiObj(value: ProtoFunction): ReplaceAll {
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
  constructor(private expr: CharLength) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.value).evaluate(context, input);

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

  static fromProtoToApiObj(value: ProtoFunction): CharLength {
    return new CharLength(exprFromProto(value.args![0]));
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
  constructor(private expr: ByteLength) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.value).evaluate(context, input);

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

  static fromProtoToApiObj(value: ProtoFunction): ByteLength {
    return new ByteLength(exprFromProto(value.args![0]));
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
  constructor(private expr: Like) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.expr).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    const pattern = toEvaluable(this.expr.pattern).evaluate(context, input);
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

  static fromProtoToApiObj(value: ProtoFunction): Like {
    return new Like(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreRegexContains implements EvaluableExpr {
  constructor(private expr: RegexContains) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.expr).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    const pattern = toEvaluable(this.expr.pattern).evaluate(context, input);
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

  static fromProtoToApiObj(value: ProtoFunction): RegexContains {
    return new RegexContains(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreRegexMatch implements EvaluableExpr {
  constructor(private expr: RegexMatch) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.expr).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    const pattern = toEvaluable(this.expr.pattern).evaluate(context, input);
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

  static fromProtoToApiObj(value: ProtoFunction): RegexMatch {
    return new RegexMatch(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreStrContains implements EvaluableExpr {
  constructor(private expr: StrContains) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.expr).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    const substring = toEvaluable(this.expr.substring).evaluate(context, input);
    if (substring === undefined || !isString(substring)) {
      return undefined;
    }

    return {
      booleanValue: evaluated.stringValue.includes(substring.stringValue)
    };
  }

  static fromProtoToApiObj(value: ProtoFunction): StrContains {
    return new StrContains(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreStartsWith implements EvaluableExpr {
  constructor(private expr: StartsWith) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.expr).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    const prefix = toEvaluable(this.expr.prefix).evaluate(context, input);
    if (prefix === undefined || !isString(prefix)) {
      return undefined;
    }

    return {
      booleanValue: evaluated.stringValue.startsWith(prefix.stringValue)
    };
  }

  static fromProtoToApiObj(value: ProtoFunction): StartsWith {
    return new StartsWith(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreEndsWith implements EvaluableExpr {
  constructor(private expr: EndsWith) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.expr).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    const suffix = toEvaluable(this.expr.suffix).evaluate(context, input);
    if (suffix === undefined || !isString(suffix)) {
      return undefined;
    }

    return { booleanValue: evaluated.stringValue.endsWith(suffix.stringValue) };
  }

  static fromProtoToApiObj(value: ProtoFunction): EndsWith {
    return new EndsWith(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreToLower implements EvaluableExpr {
  constructor(private expr: ToLower) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.expr).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    return { stringValue: evaluated.stringValue.toLowerCase() };
  }

  static fromProtoToApiObj(value: ProtoFunction): ToLower {
    return new ToLower(exprFromProto(value.args![0]));
  }
}

export class CoreToUpper implements EvaluableExpr {
  constructor(private expr: ToUpper) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.expr).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    return { stringValue: evaluated.stringValue.toUpperCase() };
  }

  static fromProtoToApiObj(value: ProtoFunction): ToUpper {
    return new ToUpper(exprFromProto(value.args![0]));
  }
}

export class CoreTrim implements EvaluableExpr {
  constructor(private expr: Trim) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.expr).evaluate(context, input);
    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    return { stringValue: evaluated.stringValue.trim() };
  }

  static fromProtoToApiObj(value: ProtoFunction): Trim {
    return new Trim(exprFromProto(value.args![0]));
  }
}

export class CoreStrConcat implements EvaluableExpr {
  constructor(private expr: StrConcat) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const exprs = [this.expr.first, ...this.expr.rest];
    const evaluated = exprs.map(val =>
      toEvaluable(val).evaluate(context, input)
    );
    if (evaluated.some(val => val === undefined || !isString(val))) {
      return undefined;
    }

    return { stringValue: evaluated.map(val => val!.stringValue).join('') };
  }

  static fromProtoToApiObj(value: ProtoFunction): StrConcat {
    return new StrConcat(
      exprFromProto(value.args![0]),
      value.args!.slice(1).map(exprFromProto)
    );
  }
}

export class CoreMapGet implements EvaluableExpr {
  constructor(private expr: MapGet) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluatedMap = toEvaluable(this.expr.map).evaluate(context, input);
    if (evaluatedMap === undefined || !isMapValue(evaluatedMap)) {
      return undefined;
    }

    return evaluatedMap.mapValue.fields?.[this.expr.subfield];
  }

  static fromProtoToApiObj(value: ProtoFunction): MapGet {
    return new MapGet(
      exprFromProto(value.args![0]),
      value.args![1].stringValue!
    );
  }
}

export class CoreCount implements EvaluableExpr {
  constructor(private expr: Count) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }

  static fromProtoToApiObj(value: ProtoFunction): Count {
    throw new Error('Unimplemented');
  }
}

export class CoreSum implements EvaluableExpr {
  constructor(private expr: Sum) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }

  static fromProtoToApiObj(value: ProtoFunction): Sum {
    throw new Error('Unimplemented');
  }
}

export class CoreAvg implements EvaluableExpr {
  constructor(private expr: Avg) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }

  static fromProtoToApiObj(value: ProtoFunction): Avg {
    throw new Error('Unimplemented');
  }
}

export class CoreMinimum implements EvaluableExpr {
  constructor(private expr: Minimum) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }

  static fromProtoToApiObj(value: ProtoFunction): Minimum {
    throw new Error('Unimplemented');
  }
}

export class CoreMaximum implements EvaluableExpr {
  constructor(private expr: Maximum) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }

  static fromProtoToApiObj(value: ProtoFunction): Maximum {
    throw new Error('Unimplemented');
  }
}

abstract class DistanceBase<
  T extends CosineDistance | DotProduct | EuclideanDistance
> implements EvaluableExpr
{
  protected constructor(private expr: T) {}

  abstract calculateDistance(
    vec1: ArrayValue | undefined,
    vec2: ArrayValue | undefined
  ): number | undefined;

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const vector1 = toEvaluable(this.expr.vector1).evaluate(context, input);
    if (vector1 === undefined || !isVectorValue(vector1)) {
      return undefined;
    }

    const vector2 = toEvaluable(this.expr.vector2).evaluate(context, input);
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

export class CoreCosineDistance extends DistanceBase<CosineDistance> {
  constructor(expr: CosineDistance) {
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

  static fromProtoToApiObj(value: ProtoFunction): CosineDistance {
    return new CosineDistance(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreDotProduct extends DistanceBase<DotProduct> {
  constructor(expr: DotProduct) {
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

  static fromProtoToApiObj(value: ProtoFunction): DotProduct {
    return new DotProduct(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreEuclideanDistance extends DistanceBase<EuclideanDistance> {
  constructor(expr: EuclideanDistance) {
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

  static fromProtoToApiObj(value: ProtoFunction): EuclideanDistance {
    return new EuclideanDistance(
      exprFromProto(value.args![0]),
      exprFromProto(value.args![1])
    );
  }
}

export class CoreVectorLength implements EvaluableExpr {
  constructor(private expr: VectorLength) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const vector = toEvaluable(this.expr.value).evaluate(context, input);
    if (vector === undefined || !isVectorValue(vector)) {
      return undefined;
    }

    const vectorValue = getVectorValue(vector);

    return { integerValue: vectorValue?.values?.length ?? 0 };
  }

  static fromProtoToApiObj(value: ProtoFunction): VectorLength {
    return new VectorLength(exprFromProto(value.args![0]));
  }
}

export class CoreUnixMicrosToTimestamp implements EvaluableExpr {
  constructor(private expr: UnixMicrosToTimestamp) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }

  static fromProtoToApiObj(value: ProtoFunction): UnixMicrosToTimestamp {
    throw new Error('Unimplemented');
  }
}

export class CoreTimestampToUnixMicros implements EvaluableExpr {
  constructor(private expr: TimestampToUnixMicros) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }

  static fromProtoToApiObj(value: ProtoFunction): TimestampToUnixMicros {
    throw new Error('Unimplemented');
  }
}

export class CoreUnixMillisToTimestamp implements EvaluableExpr {
  constructor(private expr: UnixMillisToTimestamp) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }

  static fromProtoToApiObj(value: ProtoFunction): UnixMillisToTimestamp {
    throw new Error('Unimplemented');
  }
}

export class CoreTimestampToUnixMillis implements EvaluableExpr {
  constructor(private expr: TimestampToUnixMillis) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }

  static fromProtoToApiObj(value: ProtoFunction): TimestampToUnixMillis {
    throw new Error('Unimplemented');
  }
}

export class CoreUnixSecondsToTimestamp implements EvaluableExpr {
  constructor(private expr: UnixSecondsToTimestamp) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }

  static fromProtoToApiObj(value: ProtoFunction): UnixSecondsToTimestamp {
    throw new Error('Unimplemented');
  }
}

export class CoreTimestampToUnixSeconds implements EvaluableExpr {
  constructor(private expr: TimestampToUnixSeconds) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }

  static fromProtoToApiObj(value: ProtoFunction): TimestampToUnixSeconds {
    throw new Error('Unimplemented');
  }
}

export class CoreTimestampAdd implements EvaluableExpr {
  constructor(private expr: TimestampAdd) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }

  static fromProtoToApiObj(value: ProtoFunction): TimestampAdd {
    throw new Error('Unimplemented');
  }
}

export class CoreTimestampSub implements EvaluableExpr {
  constructor(private expr: TimestampSub) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }

  static fromProtoToApiObj(value: ProtoFunction): TimestampSub {
    throw new Error('Unimplemented');
  }
}
