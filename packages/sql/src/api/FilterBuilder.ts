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

import type { TransformBuilder } from './TransformBuilder';

export type FilterTextSearchType = 'plain' | 'phrase' | 'websearch';

export interface FilterTextSearchOptions {
  config?: string | undefined;
  type?: FilterTextSearchType | undefined;
}

export interface FilterOrOptions {
  foreignTable?: string | undefined;
  referencedTable?: string | undefined;
}

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'ilike'
  | 'is'
  | 'isdistinct'
  | 'in'
  | 'cs'
  | 'cd'
  | 'sl'
  | 'sr'
  | 'nxl'
  | 'nxr'
  | 'adj'
  | 'ov'
  | 'fts'
  | 'plfts'
  | 'phfts'
  | 'wfts'
  | 'match'
  | 'imatch';

export type NarrowResultColumn<T, Col extends string> =
  T extends Array<infer Item>
    ? Item extends object
      ? Col extends keyof Item
        ? Array<{
            [K in keyof Item]: K extends Col ? NonNullable<Item[K]> : Item[K];
          }>
        : T
      : T
    : T extends object
      ? Col extends keyof T
        ? {
            [K in keyof T]: K extends Col ? NonNullable<T[K]> : T[K];
          }
        : T
      : T;

export interface FilterBuilder<
  T,
  Method = unknown,
  ThrowOnError extends boolean = false
> extends TransformBuilder<T, Method, ThrowOnError> {
  throwOnError(): FilterBuilder<T, Method, true>;

  eq(column: string, value: NonNullable<unknown>): this;

  neq(column: string, value: unknown): this;

  gt(column: string, value: unknown): this;

  gte(column: string, value: unknown): this;

  lt(column: string, value: unknown): this;

  lte(column: string, value: unknown): this;

  like(column: string, pattern: string): this;

  likeAllOf(column: string, patterns: readonly string[]): this;

  likeAnyOf(column: string, patterns: readonly string[]): this;

  ilike(column: string, pattern: string): this;

  ilikeAllOf(column: string, patterns: readonly string[]): this;

  ilikeAnyOf(column: string, patterns: readonly string[]): this;

  regexMatch(column: string, pattern: string): this;

  regexIMatch(column: string, pattern: string): this;

  is(column: string, value: boolean | null): this;

  isDistinct(column: string, value: unknown): this;

  in(column: string, values: readonly unknown[]): this;

  notIn(column: string, values: readonly unknown[]): this;

  contains<
    Value extends object & {
      readonly [K in keyof Value]: unknown;
    } & {
      readonly [Symbol.iterator]?: never;
    } = Record<string, unknown>
  >(
    column: string,
    value: string | readonly unknown[] | Value
  ): this;

  containedBy<
    Value extends object & {
      readonly [K in keyof Value]: unknown;
    } & {
      readonly [Symbol.iterator]?: never;
    } = Record<string, unknown>
  >(
    column: string,
    value: string | readonly unknown[] | Value
  ): this;

  rangeGt(column: string, range: string): this;

  rangeGte(column: string, range: string): this;

  rangeLt(column: string, range: string): this;

  rangeLte(column: string, range: string): this;

  rangeAdjacent(column: string, range: string): this;

  overlaps(column: string, value: string | readonly unknown[]): this;

  textSearch(
    column: string,
    query: string,
    options?: Readonly<FilterTextSearchOptions> | undefined
  ): this;

  match<
    Query extends object & {
      readonly [K in keyof Query]: unknown;
    } & {
      readonly [Symbol.iterator]?: never;
    } = Record<string, unknown>
  >(
    query: Query
  ): this;

  not<ColumnName extends string>(
    column: ColumnName,
    operator: 'is',
    value: null
  ): FilterBuilder<NarrowResultColumn<T, ColumnName>, Method, ThrowOnError> &
    this;
  not(
    column: string,
    operator: FilterOperator | (string & {}),
    value: unknown
  ): this;

  or(filters: string, options?: Readonly<FilterOrOptions> | undefined): this;

  filter(
    column: string,
    operator: `${'' | 'not.'}${FilterOperator}` | (string & {}),
    value: unknown
  ): this;
}
