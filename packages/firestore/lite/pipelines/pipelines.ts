/**
 * Firestore Lite Pipelines
 *
 * @remarks Firestore Lite is a small online-only SDK that allows read
 * and write access to your Firestore database. All operations connect
 * directly to the backend, and `onSnapshot()` APIs are not supported.
 * @packageDocumentation
 */
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

// External exports: ./index
// These external exports will be stripped from the dist/pipelines.d.ts file
// by the prune-dts script, in order to reduce type duplication. However, these
// types need to be exported here to ensure that api-extractor behaves
// correctly. If a type from api.ts is missing from this export, then
// api-extractor may rename it with a suffix `_#`, e.g. `YourType_2`.
export type {
  Timestamp,
  DocumentReference,
  VectorValue,
  GeoPoint,
  FieldPath,
  DocumentData,
  Query,
  Firestore,
  FirestoreDataConverter,
  WithFieldValue,
  PartialWithFieldValue,
  SetOptions,
  QueryDocumentSnapshot,
  Primitive,
  FieldValue,
  Bytes
} from '../index';

export { PipelineSource } from '../../src/lite-api/pipeline-source';

export { PipelineResult } from '../../src/lite-api/pipeline-result';

export { Pipeline } from '../../src/lite-api/pipeline';

export { pipeline, execute } from '../../src/lite-api/pipeline_impl';

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
} from '../../src/lite-api/stage';

export {
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
  genericFunction,
  ascending,
  descending,
  ExprWithAlias,
  Field,
  Constant,
  FirestoreFunction,
  Add,
  Subtract,
  Multiply,
  Divide,
  Mod,
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
  EqAny,
  IsNan,
  Exists,
  Not,
  And,
  Or,
  Xor,
  Cond,
  LogicalMaximum,
  LogicalMinimum,
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
  Minimum,
  Maximum,
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
  Ordering,
  ExprType,
  AggregateFunctionWithAlias,
  Selectable,
  BooleanExpr,
  AggregateFunction
} from '../../src/lite-api/expressions';
