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
 * Copyright 2025 Google LLC
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

export { OneOf } from '../../src/util/types';

export {
  PipelineResult,
  PipelineSnapshot
} from '../../src/lite-api/pipeline-result';

export { Pipeline } from '../../src/lite-api/pipeline';

export { execute } from '../../src/lite-api/pipeline_impl';

export {
  StageOptions,
  CollectionStageOptions,
  CollectionGroupStageOptions,
  DatabaseStageOptions,
  DocumentsStageOptions,
  AddFieldsStageOptions,
  RemoveFieldsStageOptions,
  SelectStageOptions,
  WhereStageOptions,
  OffsetStageOptions,
  LimitStageOptions,
  DistinctStageOptions,
  AggregateStageOptions,
  FindNearestStageOptions,
  ReplaceWithStageOptions,
  SampleStageOptions,
  UnionStageOptions,
  UnnestStageOptions,
  SortStageOptions
} from '../../src/lite-api/stage_options';

export {
  Expression,
  field,
  and,
  array,
  constant,
  add,
  subtract,
  multiply,
  average,
  substring,
  count,
  mapMerge,
  mapRemove,
  ifError,
  isAbsent,
  isError,
  or,
  divide,
  map,
  mod,
  documentId,
  equal,
  notEqual,
  lessThan,
  countIf,
  lessThanOrEqual,
  greaterThan,
  greaterThanOrEqual,
  arrayConcat,
  arrayContains,
  arrayContainsAny,
  arrayContainsAll,
  arrayLength,
  equalAny,
  notEqualAny,
  xor,
  conditional,
  not,
  logicalMaximum,
  logicalMinimum,
  exists,
  reverse,
  byteLength,
  charLength,
  like,
  regexContains,
  regexFind,
  regexFindAll,
  regexMatch,
  stringContains,
  startsWith,
  endsWith,
  toLower,
  toUpper,
  trim,
  stringConcat,
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
  timestampSubtract,
  ascending,
  descending,
  arrayGet,
  abs,
  sum,
  countDistinct,
  ceil,
  floor,
  exp,
  pow,
  rand,
  round,
  collectionId,
  ln,
  log,
  sqrt,
  trunc,
  stringReverse,
  log10,
  concat,
  currentTimestamp,
  ifAbsent,
  join,
  length,
  arraySum,
  split,
  timestampTruncate,
  type,
  AliasedExpression,
  Field,
  Constant,
  FunctionExpression,
  Ordering,
  ExpressionType,
  AliasedAggregate,
  Selectable,
  BooleanExpression,
  AggregateFunction,
  TimeGranularity
} from '../../src/lite-api/expressions';
