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

import { ArrayValue, Value } from '../protos/firestore_proto_api';
import { EvaluationContext, PipelineInputOutput } from './pipeline_run';
import {
  And,
  Add,
  Subtract,
  Mod,
  Multiply,
  Divide,
  Eq,
  Neq,
  Lt,
  Lte,
  Gt,
  Gte,
  ArrayConcat,
  ArrayReverse,
  ArrayContains,
  ArrayContainsAll,
  ArrayContainsAny,
  ArrayLength,
  ArrayElement,
  In,
  IsNan,
  Exists,
  Not,
  Or,
  Xor,
  If,
  LogicalMax,
  LogicalMin,
  Reverse,
  ReplaceFirst,
  ReplaceAll,
  CharLength,
  ByteLength,
  Like,
  RegexContains,
  RegexMatch,
  StrContains,
  StartsWith,
  EndsWith,
  ToLower,
  ToUpper,
  Trim,
  StrConcat,
  MapGet,
  Count,
  Sum,
  Avg,
  Min,
  Max,
  CosineDistance,
  DotProduct,
  EuclideanDistance,
  VectorLength,
  UnixMicrosToTimestamp,
  TimestampToUnixMicros,
  UnixMillisToTimestamp,
  TimestampToUnixMillis,
  UnixSecondsToTimestamp,
  TimestampToUnixSeconds,
  TimestampAdd,
  TimestampSub,
  Field,
  Constant
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
  isDouble,
  isInteger,
  isMapValue,
  isNumber,
  isString,
  isVectorValue,
  MIN_VALUE,
  TRUE_VALUE,
  valueCompare,
  valueEquals,
  VECTOR_MAP_VECTORS_KEY
} from '../model/values';

import { RE2JS } from 're2js';
import { toName, toTimestamp, toVersion } from '../remote/serializer';

export interface EvaluableExpr {
  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined;
}

export function toEvaluable<T>(expr: T): EvaluableExpr {
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
  } else if (expr instanceof In) {
    return new CoreIn(expr);
  } else if (expr instanceof IsNan) {
    return new CoreIsNan(expr);
  } else if (expr instanceof Exists) {
    return new CoreExists(expr);
  } else if (expr instanceof Not) {
    return new CoreNot(expr);
  } else if (expr instanceof Or) {
    return new CoreOr(expr);
  } else if (expr instanceof Xor) {
    return new CoreXor(expr);
  } else if (expr instanceof If) {
    return new CoreIf(expr);
  } else if (expr instanceof LogicalMax) {
    return new CoreLogicalMax(expr);
  } else if (expr instanceof LogicalMin) {
    return new CoreLogicalMin(expr);
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
  } else if (expr instanceof Min) {
    return new CoreMin(expr);
  } else if (expr instanceof Max) {
    return new CoreMax(expr);
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
        referenceValue: toName(context.userDataReader.serializer, input.key)
      };
    }
    if (this.expr.fieldName() === UPDATE_TIME_NAME) {
      return {
        timestampValue: toVersion(
          context.userDataReader.serializer,
          input.version
        )
      };
    }
    if (this.expr.fieldName() === CREATE_TIME_NAME) {
      return {
        timestampValue: toVersion(
          context.userDataReader.serializer,
          input.createTime
        )
      };
    }
    return (
      input.data.field(FieldPath.fromServerFormat(this.expr.fieldName())) ??
      undefined
    );
  }
}

export class CoreConstant implements EvaluableExpr {
  constructor(private expr: Constant) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    this.expr._readUserData(context.userDataReader);
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

const LongMaxValue = BigInt('0x7fffffffffffffff');
const LongMinValue = -BigInt('0x8000000000000000');

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
  ): bigint | undefined;
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

      // Check for overflow
      if (result < LongMinValue || result > LongMaxValue) {
        return undefined; // Simulate overflow error
      } else {
        return { integerValue: `${result}` };
      }
    }
  }
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
  ): bigint | undefined {
    const rightValue = asBigInt(right);
    if (rightValue === BigInt(0)) {
      return undefined;
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
      return undefined;
    }
    return { doubleValue: asDouble(left) / rightValue };
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
    return { doubleValue: asDouble(left) % asDouble(right) };
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
}

export class CoreIn implements EvaluableExpr {
  constructor(private expr: In) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const searchValue = toEvaluable(this.expr.searchValue).evaluate(
      context,
      input
    );
    if (searchValue === undefined) {
      return undefined;
    }

    const candidates = this.expr.candidates.map(candidate =>
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

    if (!isNumber(evaluated) || isInteger(evaluated)) {
      return FALSE_VALUE;
    }

    return {
      booleanValue: isNaN(
        asDouble(evaluated as { doubleValue: number | string })
      )
    };
  }
}

export class CoreExists implements EvaluableExpr {
  constructor(private expr: Exists) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.expr).evaluate(context, input);
    if (evaluated === undefined) {
      return undefined;
    }

    return TRUE_VALUE;
  }
}

export class CoreIf implements EvaluableExpr {
  constructor(private expr: If) {}

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
}

export class CoreLogicalMax implements EvaluableExpr {
  constructor(private expr: LogicalMax) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const left = toEvaluable(this.expr.left).evaluate(context, input);
    const right = toEvaluable(this.expr.right).evaluate(context, input);
    if (left === undefined && right === undefined) {
      return undefined;
    }

    if (valueCompare(left ?? MIN_VALUE, right ?? MIN_VALUE) >= 0) {
      return left ?? MIN_VALUE;
    } else {
      return right ?? MIN_VALUE;
    }
  }
}

export class CoreLogicalMin implements EvaluableExpr {
  constructor(private expr: LogicalMin) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const left = toEvaluable(this.expr.left).evaluate(context, input);
    const right = toEvaluable(this.expr.right).evaluate(context, input);
    if (left === undefined && right === undefined) {
      return undefined;
    }

    if (valueCompare(left ?? MIN_VALUE, right ?? MIN_VALUE) < 0) {
      return left ?? MIN_VALUE;
    } else {
      return right ?? MIN_VALUE;
    }
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
}

export class CoreNeq extends ComparisonBase<Neq> {
  constructor(protected expr: Neq) {
    super(expr);
  }

  trueCase(left: Value, right: Value): boolean {
    return !valueEquals(left, right);
  }
}

export class CoreLt extends ComparisonBase<Lt> {
  constructor(protected expr: Lt) {
    super(expr);
  }

  trueCase(left: Value, right: Value): boolean {
    return valueCompare(left, right) < 0;
  }
}

export class CoreLte extends ComparisonBase<Lte> {
  constructor(protected expr: Lte) {
    super(expr);
  }

  trueCase(left: Value, right: Value): boolean {
    return valueCompare(left, right) <= 0;
  }
}

export class CoreGt extends ComparisonBase<Gt> {
  constructor(protected expr: Gt) {
    super(expr);
  }

  trueCase(left: Value, right: Value): boolean {
    return valueCompare(left, right) > 0;
  }
}

export class CoreGte extends ComparisonBase<Gte> {
  constructor(protected expr: Gte) {
    super(expr);
  }

  trueCase(left: Value, right: Value): boolean {
    return valueCompare(left, right) >= 0;
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
}

export class CoreArrayReverse implements EvaluableExpr {
  constructor(private expr: ArrayReverse) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.array).evaluate(context, input);
    if (evaluated === undefined || !Array.isArray(evaluated.arrayValue)) {
      return undefined;
    }

    return { arrayValue: { values: evaluated.arrayValue.reverse() } };
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
    if (evaluated === undefined) {
      return undefined;
    }

    return evaluated.arrayValue.values?.some(val => valueEquals(val, element!))
      ? TRUE_VALUE
      : FALSE_VALUE;
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
        if (element !== undefined && valueEquals(val, element!)) {
          return TRUE_VALUE;
        }
      }
    }

    return FALSE_VALUE;
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
}

export class CoreArrayElement implements EvaluableExpr {
  constructor(private expr: ArrayElement) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
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
}

export class CoreReplaceFirst implements EvaluableExpr {
  constructor(private expr: ReplaceFirst) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
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
}

export class CoreCharLength implements EvaluableExpr {
  constructor(private expr: CharLength) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.value).evaluate(context, input);

    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    // return the number of characters in the string
    return { integerValue: `${evaluated.stringValue.length}` };
  }
}

export class CoreByteLength implements EvaluableExpr {
  constructor(private expr: ByteLength) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const evaluated = toEvaluable(this.expr.value).evaluate(context, input);

    if (evaluated === undefined || !isString(evaluated)) {
      return undefined;
    }

    // return the number of bytes in the string
    return {
      integerValue: `${new TextEncoder().encode(evaluated.stringValue).length}`
    };
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
      booleanValue: RE2JS.compile(likeToRegex(pattern.stringValue))
        .matcher(evaluated.stringValue)
        .find()
    };
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

    return {
      booleanValue: RE2JS.compile(pattern.stringValue)
        .matcher(evaluated.stringValue)
        .find()
    };
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

    return {
      booleanValue: RE2JS.compile(pattern.stringValue).matches(
        evaluated.stringValue
      )
    };
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

    return evaluatedMap.mapValue.fields?.[this.expr.name];
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
}

export class CoreSum implements EvaluableExpr {
  constructor(private expr: Sum) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
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
}

export class CoreMin implements EvaluableExpr {
  constructor(private expr: Min) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreMax implements EvaluableExpr {
  constructor(private expr: Max) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
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

    const vector2 = toEvaluable(this.expr.vector1).evaluate(context, input);
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

    return euclideanDistance;
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
}

export class CoreUnixMicrosToTimestamp implements EvaluableExpr {
  constructor(private expr: UnixMicrosToTimestamp) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
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
}

export class CoreUnixMillisToTimestamp implements EvaluableExpr {
  constructor(private expr: UnixMillisToTimestamp) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
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
}

export class CoreUnixSecondsToTimestamp implements EvaluableExpr {
  constructor(private expr: UnixSecondsToTimestamp) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
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
}

export class CoreTimestampAdd implements EvaluableExpr {
  constructor(private expr: TimestampAdd) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
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
}
