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

import type { Builder, CheckMatchingArrayTypes } from './Builder';
import type { FilterBuilder } from './FilterBuilder';

export interface InvalidMethodError<S extends string> {
  Error: S;
}

export interface TransformOrderOptions {
  ascending?: boolean | undefined;
  nullsFirst?: boolean | undefined;
  foreignTable?: string | undefined;
  referencedTable?: string | undefined;
}

export interface TransformLimitOptions {
  foreignTable?: string | undefined;
  referencedTable?: string | undefined;
}

export interface TransformRangeOptions {
  foreignTable?: string | undefined;
  referencedTable?: string | undefined;
}

export type TransformExplainFormat = 'json' | 'text';

export interface TransformExplainOptions {
  analyze?: boolean | undefined;
  verbose?: boolean | undefined;
  settings?: boolean | undefined;
  buffers?: boolean | undefined;
  wal?: boolean | undefined;
  format?: TransformExplainFormat | undefined;
}

export interface TransformBuilder<
  Result$1,
  Method = unknown,
  ThrowOnError extends boolean = false
> extends Builder<Result$1, ThrowOnError> {
  throwOnError(): TransformBuilder<Result$1, Method, true>;

  select(
    columns?: string | undefined
  ): FilterBuilder<
    Method extends 'RPC'
      ? unknown extends Result$1
        ? Result$1
        : Result$1 extends readonly unknown[]
          ? Array<Record<string, unknown>>
          : Record<string, unknown>
      : Array<Record<string, unknown>>,
    Method,
    ThrowOnError
  >;

  order(
    column: string,
    options?: Readonly<TransformOrderOptions> | undefined
  ): this;

  limit(
    rows: number,
    options?: Readonly<TransformLimitOptions> | undefined
  ): this;

  range(
    from: number,
    to: number,
    options?: Readonly<TransformRangeOptions> | undefined
  ): this;

  abortSignal(signal: AbortSignal): this;

  single<
    ResultOne = unknown extends Result$1
      ? Record<string, unknown>
      : Result$1 extends ReadonlyArray<infer R>
        ? R
        : never
  >(): Builder<ResultOne, ThrowOnError>;

  maybeSingle<
    ResultOne = unknown extends Result$1
      ? Record<string, unknown>
      : Result$1 extends ReadonlyArray<infer R>
        ? R
        : never
  >(): Builder<ResultOne | null, ThrowOnError>;

  csv(): Builder<string, ThrowOnError>;

  geojson(): Builder<Record<string, unknown>, ThrowOnError>;

  explain(
    options?: Readonly<TransformExplainOptions> | undefined
  ):
    | Builder<Array<Record<string, unknown>>, ThrowOnError>
    | Builder<string, ThrowOnError>;

  rollback(): this;

  returns<NewResult>(): TransformBuilder<
    CheckMatchingArrayTypes<Result$1, NewResult>,
    Method,
    ThrowOnError
  >;

  maxAffected(
    rows: number
  ): Method extends 'PATCH' | 'DELETE' | 'RPC'
    ? this
    : InvalidMethodError<'maxAffected method only available on update or delete'>;
}
