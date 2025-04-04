/**
 * @license
 * Copyright 2021 Google LLC
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

export { PipelineSource } from './lite-api/pipeline-source';

export {
  PipelineResult,
  PipelineSnapshot,
  pipelineResultEqual
} from './lite-api/pipeline-result';

export { RealtimePipelineSnapshot } from './api/snapshot';

export { Pipeline } from './api/pipeline';

export { RealtimePipeline } from './api/realtime_pipeline';

// Rename here because we want the exported name to be onSnapshot
// internally the name has to be onPipelineSnapshot to avoid
// name collisions.
import { onPipelineSnapshot as onSnapshot } from './api/reference_impl';

export { execute } from './api/pipeline_impl';

export {
  Stage,
  FindNearestOptions,
  AddFields,
  Aggregate,
  Distinct,
  CollectionSource,
  CollectionGroupSource,
  DatabaseSource,
  DocumentsSource,
  Where,
  FindNearest,
  Limit,
  Offset,
  Select,
  Sort,
  GenericStage
} from './lite-api/stage';

export {
  field,
  constant,
  add,
  subtract,
  multiply,
  divide,
  mod,
  eq,
  neq,
  lt,
  lte,
  gt,
  gte,
  arrayConcat,
  arrayContains,
  arrayContainsAny,
  arrayContainsAll,
  arrayLength,
  eqAny,
  notEqAny,
  xor,
  cond,
  not,
  logicalMaximum,
  logicalMinimum,
  exists,
  isNan,
  reverse,
  replaceFirst,
  replaceAll,
  byteLength,
  charLength,
  like,
  regexContains,
  regexMatch,
  strContains,
  startsWith,
  endsWith,
  toLower,
  toUpper,
  trim,
  strConcat,
  mapGet,
  countAll,
  count,
  sum,
  avg,
  and,
  or,
  minimum,
  maximum,
  cosineDistance,
  dotProduct,
  euclideanDistance,
  vectorLength,
  unixMicrosToTimestamp,
  timestampToUnixMicros,
  unixMillisToTimestamp,
  timestampToUnixMillis,
  unixSecondsToTimestamp,
  timestampToUnixSeconds,
  timestampAdd,
  timestampSub,
  ascending,
  descending,
  countIf,
  bitAnd,
  bitOr,
  bitXor,
  bitNot,
  bitLeftShift,
  bitRightShift,
  rand,
  array,
  arrayOffset,
  currentContext,
  isError,
  ifError,
  isAbsent,
  isNull,
  isNotNull,
  isNotNan,
  map,
  mapRemove,
  mapMerge,
  documentId,
  substr,
  Expr,
  ExprWithAlias,
  Field,
  Constant,
  FunctionExpr,
  Ordering
} from './lite-api/expressions';

export type {
  ExprType,
  AggregateWithAlias,
  Selectable,
  BooleanExpr,
  AggregateFunction
} from './lite-api/expressions';

export { _internalPipelineToExecutePipelineRequestProto } from './remote/internal_serializer';

export { onSnapshot };
