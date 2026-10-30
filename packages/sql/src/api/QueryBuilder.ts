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

import type { FilterBuilder } from './FilterBuilder';

// `(string & {})` accepts any `string` while preventing TypeScript from collapsing the
// union to `string`, preserving IDE autocomplete for the literal values.
export type QueryCountStrategy =
  'exact' | 'planned' | 'estimated' | (string & {});

export interface QuerySelectOptions {
  head?: boolean | undefined;
  count?: QueryCountStrategy | undefined;
}

export interface QueryInsertOptions {
  count?: QueryCountStrategy | undefined;
  defaultToNull?: boolean | undefined;
}

export interface QueryUpsertOptions {
  onConflict?: string | undefined;
  ignoreDuplicates?: boolean | undefined;
  count?: QueryCountStrategy | undefined;
  defaultToNull?: boolean | undefined;
}

export interface QueryUpdateOptions {
  count?: QueryCountStrategy | undefined;
}

export interface QueryDeleteOptions {
  count?: QueryCountStrategy | undefined;
}

export interface QueryBuilder {
  select(
    columns?: string | undefined,
    options?: Readonly<QuerySelectOptions> | undefined
  ): FilterBuilder<Array<Record<string, unknown>>, 'GET'>;

  insert<
    Row extends object & {
      readonly [K in keyof Row]: unknown;
    } & {
      readonly [Symbol.iterator]?: never;
    } = Record<string, unknown>
  >(
    values: Row | readonly Row[],
    options?: Readonly<QueryInsertOptions> | undefined
  ): FilterBuilder<null, 'POST'>;

  upsert<
    Row extends object & {
      readonly [K in keyof Row]: unknown;
    } & {
      readonly [Symbol.iterator]?: never;
    } = Record<string, unknown>
  >(
    values: Row | readonly Row[],
    options?: Readonly<QueryUpsertOptions> | undefined
  ): FilterBuilder<null, 'POST'>;

  update<
    Row extends object & {
      readonly [K in keyof Row]: unknown;
    } & {
      readonly [Symbol.iterator]?: never;
    } = Record<string, unknown>
  >(
    values: Row,
    options?: Readonly<QueryUpdateOptions> | undefined
  ): FilterBuilder<null, 'PATCH'>;

  delete(
    options?: Readonly<QueryDeleteOptions> | undefined
  ): FilterBuilder<null, 'DELETE'>;
}
