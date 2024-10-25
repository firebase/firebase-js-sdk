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

import { Value } from '../protos/firestore_proto_api';
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
import { FieldPath } from '../model/path';
import { FALSE_VALUE, TRUE_VALUE, valueEquals } from '../model/values';

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

export class CoreAdd implements EvaluableExpr {
  constructor(private expr: Add) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented'); // Placeholder
  }
}

export class CoreSubtract implements EvaluableExpr {
  constructor(private expr: Subtract) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented'); // Placeholder
  }
}

export class CoreMultiply implements EvaluableExpr {
  constructor(private expr: Multiply) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented'); // Placeholder
  }
}

export class CoreDivide implements EvaluableExpr {
  constructor(private expr: Divide) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented'); // Placeholder
  }
}

export class CoreMod implements EvaluableExpr {
  constructor(private expr: Mod) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented'); // Placeholder
  }
}

export class CoreAnd implements EvaluableExpr {
  constructor(private expr: And) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    return this.expr.params.every(
      p => toEvaluable(p).evaluate(context, input) ?? false
    )
      ? TRUE_VALUE
      : FALSE_VALUE;
  }
}

export class CoreEq implements EvaluableExpr {
  constructor(private expr: Eq) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    const left = toEvaluable(this.expr.left).evaluate(context, input);
    const right = toEvaluable(this.expr.right).evaluate(context, input);
    if (left === undefined || right === undefined) {
      return FALSE_VALUE;
    }
    return valueEquals(left, right) ? TRUE_VALUE : FALSE_VALUE;
  }
}

export class CoreNeq implements EvaluableExpr {
  constructor(private expr: Neq) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreLt implements EvaluableExpr {
  constructor(private expr: Lt) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreLte implements EvaluableExpr {
  constructor(private expr: Lte) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreGt implements EvaluableExpr {
  constructor(private expr: Gt) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreGte implements EvaluableExpr {
  constructor(private expr: Gte) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
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
    throw new Error('Unimplemented');
  }
}

export class CoreArrayContains implements EvaluableExpr {
  constructor(private expr: ArrayContains) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreArrayContainsAll implements EvaluableExpr {
  constructor(private expr: ArrayContainsAll) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreArrayContainsAny implements EvaluableExpr {
  constructor(private expr: ArrayContainsAny) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreArrayLength implements EvaluableExpr {
  constructor(private expr: ArrayLength) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
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

export class CoreIn implements EvaluableExpr {
  constructor(private expr: In) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreIsNan implements EvaluableExpr {
  constructor(private expr: IsNan) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreExists implements EvaluableExpr {
  constructor(private expr: Exists) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreNot implements EvaluableExpr {
  constructor(private expr: Not) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreOr implements EvaluableExpr {
  constructor(private expr: Or) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreXor implements EvaluableExpr {
  constructor(private expr: Xor) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreIf implements EvaluableExpr {
  constructor(private expr: If) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreLogicalMax implements EvaluableExpr {
  constructor(private expr: LogicalMax) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreLogicalMin implements EvaluableExpr {
  constructor(private expr: LogicalMin) {}

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
    throw new Error('Unimplemented');
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
    throw new Error('Unimplemented');
  }
}

export class CoreByteLength implements EvaluableExpr {
  constructor(private expr: ByteLength) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreLike implements EvaluableExpr {
  constructor(private expr: Like) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreRegexContains implements EvaluableExpr {
  constructor(private expr: RegexContains) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreRegexMatch implements EvaluableExpr {
  constructor(private expr: RegexMatch) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreStrContains implements EvaluableExpr {
  constructor(private expr: StrContains) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreStartsWith implements EvaluableExpr {
  constructor(private expr: StartsWith) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreEndsWith implements EvaluableExpr {
  constructor(private expr: EndsWith) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreToLower implements EvaluableExpr {
  constructor(private expr: ToLower) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreToUpper implements EvaluableExpr {
  constructor(private expr: ToUpper) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreTrim implements EvaluableExpr {
  constructor(private expr: Trim) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreStrConcat implements EvaluableExpr {
  constructor(private expr: StrConcat) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreMapGet implements EvaluableExpr {
  constructor(private expr: MapGet) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
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

export class CoreCosineDistance implements EvaluableExpr {
  constructor(private expr: CosineDistance) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreDotProduct implements EvaluableExpr {
  constructor(private expr: DotProduct) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreEuclideanDistance implements EvaluableExpr {
  constructor(private expr: EuclideanDistance) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
  }
}

export class CoreVectorLength implements EvaluableExpr {
  constructor(private expr: VectorLength) {}

  evaluate(
    context: EvaluationContext,
    input: PipelineInputOutput
  ): Value | undefined {
    throw new Error('Unimplemented');
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
