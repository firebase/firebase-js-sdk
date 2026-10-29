/**
 * @license
 * Copyright 2026 Google LLC
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

export {
  FirebaseSqlErrorCode,
  Code,
  FirebaseSqlErrorCategory,
  type SerializedFirebaseSqlError,
  FirebaseSqlError
} from '../core/error';

export {
  type SqlServiceSettings,
  copySqlServiceSettings
} from '../core/settings';

export type {
  Builder,
  CheckMatchingArrayTypes,
  ContainsNull,
  ExplicitKeys,
  IsPlainObject,
  IsValidResultOverride,
  MergeDeep,
  MergeExplicit,
  MergePartialResult,
  OperationBase,
  OperationFailure,
  OperationResult,
  OperationSuccess,
  SelectQueryError,
  Simplify
} from './Builder';

export type {
  FilterBuilder,
  FilterOperator,
  FilterOrOptions,
  FilterTextSearchOptions,
  FilterTextSearchType,
  NarrowResultColumn
} from './FilterBuilder';

export {
  FirebaseSql,
  type FirebaseSqlRpcOptions,
  getSql,
  terminate
} from './FirebaseSql';

export type {
  QueryBuilder,
  QueryCountStrategy,
  QueryDeleteOptions,
  QueryInsertOptions,
  QuerySelectOptions,
  QueryUpdateOptions,
  QueryUpsertOptions
} from './QueryBuilder';

export type {
  InvalidMethodError,
  TransformBuilder,
  TransformExplainFormat,
  TransformExplainOptions,
  TransformLimitOptions,
  TransformOrderOptions,
  TransformRangeOptions
} from './TransformBuilder';
