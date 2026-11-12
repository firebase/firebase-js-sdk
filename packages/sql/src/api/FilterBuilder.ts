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

/** Query parsing mode for <code>{@link FilterBuilder.textSearch}</code>. */
export type FilterTextSearchType = 'plain' | 'phrase' | 'websearch';

/** Options for full-text search in <code>{@link FilterBuilder.textSearch}</code>. */
export interface FilterTextSearchOptions {
  /** PostgreSQL text search configuration (for example, `'english'`). */
  config?: string | undefined;
  /** Query parsing mode (`'plain'`, `'phrase'`, or `'websearch'`). */
  type?: FilterTextSearchType | undefined;
}

/** Options for combining filters in <code>{@link FilterBuilder.or}</code>. */
export interface FilterOrOptions {
  /** Deprecated alias for `referencedTable`. @deprecated Use `referencedTable` instead. */
  foreignTable?: string | undefined;
  /** Embedded related table to apply the `OR` filter to. */
  referencedTable?: string | undefined;
}

/** PostgREST filter operator names accepted by `.not()` and `.filter()`. */
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

/** Narrows `Col` to `NonNullable` in the result row type after `.not(column, 'is', null)`. */
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

/** Query builder with row-filtering operators (`.eq()`, `.in()`, `.or()`, etc.). */
export interface FilterBuilder<
  T,
  Method = unknown,
  ThrowOnError extends boolean = false
> extends TransformBuilder<T, Method, ThrowOnError> {
  /** Throw a `FirebaseSqlError` when the operation fails instead of returning it in `result.error`. */
  throwOnError(): FilterBuilder<T, Method, true>;

  /**
   * Filter rows where `column` equals `value`.
   *
   * @remarks
   * Comparing against `null` does not match SQL `NULL` values — use `.is(column, null)` instead.
   *
   * @param column - Column to filter on.
   * @param value - Value to match.
   *
   * @example Filter tasks by status
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text, status text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs', 'open'),
   *   (2, 'Ship SDK', 'done');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .eq('status', 'open')
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }]
   * ```
   */
  eq(column: string, value: NonNullable<unknown>): this;

  /**
   * Filter rows where `column` does not equal `value`.
   *
   * @param column - Column to filter on.
   * @param value - Value to exclude.
   *
   * @example Exclude completed tasks
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text, status text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs', 'open'),
   *   (2, 'Ship SDK', 'done');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .neq('status', 'done')
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }]
   * ```
   */
  neq(column: string, value: unknown): this;

  /**
   * Filter rows where `column` is greater than `value`.
   *
   * @param column - Column to filter on.
   * @param value - Lower bound to compare against.
   *
   * @example Find high-value orders
   * ```sql
   * CREATE TABLE orders (id int8 PRIMARY KEY, total int4);
   * INSERT INTO orders VALUES
   *   (1, 45),
   *   (2, 120);
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('orders')
   *   .select('id, total')
   *   .gt('total', 100)
   *   .returns<Order[]>();
   * // data: [{ id: 2, total: 120 }]
   * ```
   */
  gt(column: string, value: unknown): this;

  /**
   * Filter rows where `column` is greater than or equal to `value`.
   *
   * @param column - Column to filter on.
   * @param value - Inclusive lower bound to compare against.
   *
   * @example Find products meeting a minimum stock level
   * ```sql
   * CREATE TABLE products (id int8 PRIMARY KEY, name text, stock int4);
   * INSERT INTO products VALUES
   *   (1, 'Notebook', 4),
   *   (2, 'Pen', 10);
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('products')
   *   .select('id, name')
   *   .gte('stock', 10)
   *   .returns<Product[]>();
   * // data: [{ id: 2, name: 'Pen' }]
   * ```
   */
  gte(column: string, value: unknown): this;

  /**
   * Filter rows where `column` is less than `value`.
   *
   * @param column - Column to filter on.
   * @param value - Upper bound to compare against.
   *
   * @example Find low-stock products
   * ```sql
   * CREATE TABLE products (id int8 PRIMARY KEY, name text, stock int4);
   * INSERT INTO products VALUES
   *   (1, 'Notebook', 4),
   *   (2, 'Pen', 25);
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('products')
   *   .select('id, name')
   *   .lt('stock', 10)
   *   .returns<Product[]>();
   * // data: [{ id: 1, name: 'Notebook' }]
   * ```
   */
  lt(column: string, value: unknown): this;

  /**
   * Filter rows where `column` is less than or equal to `value`.
   *
   * @param column - Column to filter on.
   * @param value - Inclusive upper bound to compare against.
   *
   * @example Find budget products
   * ```sql
   * CREATE TABLE products (id int8 PRIMARY KEY, name text, price int4);
   * INSERT INTO products VALUES
   *   (1, 'Pencil', 5),
   *   (2, 'Binder', 15);
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('products')
   *   .select('id, name')
   *   .lte('price', 5)
   *   .returns<Product[]>();
   * // data: [{ id: 1, name: 'Pencil' }]
   * ```
   */
  lte(column: string, value: unknown): this;

  /**
   * Filter rows where `column` matches `pattern` case-sensitively.
   *
   * @param column - Text column to match against.
   * @param pattern - SQL `LIKE` pattern (using `%` and `_` wildcards).
   *
   * @example Match task titles by prefix
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs'),
   *   (2, 'write tests');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .like('title', 'Write%')
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }]
   * ```
   */
  like(column: string, pattern: string): this;

  /**
   * Filter rows where `column` matches every pattern in `patterns` case-sensitively.
   *
   * @param column - Text column to match against.
   * @param patterns - SQL `LIKE` patterns that must all match (using `%` and `_` wildcards).
   */
  likeAllOf(column: string, patterns: readonly string[]): this;

  /**
   * Filter rows where `column` matches at least one pattern in `patterns` case-sensitively.
   *
   * @param column - Text column to match against.
   * @param patterns - SQL `LIKE` patterns where any match succeeds (using `%` and `_` wildcards).
   */
  likeAnyOf(column: string, patterns: readonly string[]): this;

  /**
   * Filter rows where `column` matches `pattern` case-insensitively.
   *
   * @param column - Text column to match against.
   * @param pattern - SQL `ILIKE` pattern (using `%` and `_` wildcards).
   *
   * @example Match task titles case-insensitively
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs'),
   *   (2, 'Ship SDK');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .ilike('title', '%docs%')
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }]
   * ```
   */
  ilike(column: string, pattern: string): this;

  /**
   * Filter rows where `column` matches every pattern in `patterns` case-insensitively.
   *
   * @param column - Text column to match against.
   * @param patterns - SQL `ILIKE` patterns that must all match (using `%` and `_` wildcards).
   */
  ilikeAllOf(column: string, patterns: readonly string[]): this;

  /**
   * Filter rows where `column` matches at least one pattern in `patterns` case-insensitively.
   *
   * @param column - Text column to match against.
   * @param patterns - SQL `ILIKE` patterns where any match succeeds (using `%` and `_` wildcards).
   */
  ilikeAnyOf(column: string, patterns: readonly string[]): this;

  /**
   * Filter rows where `column` matches the POSIX regular expression `pattern` case-sensitively.
   *
   * @param column - Text column to match against.
   * @param pattern - PostgreSQL regular expression (`~` operator).
   */
  regexMatch(column: string, pattern: string): this;

  /**
   * Filter rows where `column` matches the POSIX regular expression `pattern` case-insensitively.
   *
   * @param column - Text column to match against.
   * @param pattern - Case-insensitive PostgreSQL regular expression (`~*` operator).
   */
  regexIMatch(column: string, pattern: string): this;

  /**
   * Filter rows where `column` is `null`, `true`, or `false`.
   *
   * @param column - Column to filter on.
   * @param value - `null` or boolean literal to check with SQL `IS`.
   *
   * @example Find unassigned tasks
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text, assignee text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs', NULL),
   *   (2, 'Ship SDK', 'Ada');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .is('assignee', null)
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }]
   * ```
   */
  is(column: string, value: boolean | null): this;

  /**
   * Filter rows where `column` is distinct from `value` (including `NULL` comparisons).
   *
   * @param column - Column to filter on.
   * @param value - Value to compare with SQL `IS DISTINCT FROM`.
   */
  isDistinct(column: string, value: unknown): this;

  /**
   * Filter rows where `column` matches any value in `values`.
   *
   * @param column - Column to filter on.
   * @param values - Candidate values to match against.
   *
   * @example Filter tasks by multiple statuses
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text, status text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs', 'open'),
   *   (2, 'Review PR', 'in_progress'),
   *   (3, 'Ship SDK', 'done');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .in('status', ['open', 'in_progress'])
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }, { id: 2, title: 'Review PR' }]
   * ```
   */
  in(column: string, values: readonly unknown[]): this;

  /**
   * Filter rows where `column` does not match any value in `values`.
   *
   * @param column - Column to filter on.
   * @param values - Values to exclude.
   */
  notIn(column: string, values: readonly unknown[]): this;

  /**
   * Filter rows where an array, range, or `jsonb` `column` contains `value`.
   *
   * @param column - Array, range, or `jsonb` column to filter on.
   * @param value - Subset array, range literal, or JSON object that `column` must contain.
   *
   * @example Find tasks containing specific tags
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text, tags text[]);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs', ARRAY['docs', 'urgent']),
   *   (2, 'Ship SDK', ARRAY['release']);
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .contains('tags', ['docs', 'urgent'])
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }]
   * ```
   */
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

  /**
   * Filter rows where an array, range, or `jsonb` `column` is contained by `value`.
   *
   * @param column - Array, range, or `jsonb` column to filter on.
   * @param value - Superset array, range literal, or JSON object that must contain `column`.
   *
   * @example Find tasks whose tags are a subset of allowed tags
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text, tags text[]);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs', ARRAY['docs']),
   *   (2, 'Ship SDK', ARRAY['docs', 'release']);
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .containedBy('tags', ['docs', 'urgent'])
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }]
   * ```
   */
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

  /**
   * Filter rows where a range `column` lies strictly to the right of `range`.
   *
   * @param column - Range column to filter on.
   * @param range - PostgreSQL range literal (such as `'[1, 5)'`).
   *
   * @example Find bookings strictly after a window
   * ```sql
   * CREATE TABLE orders (id int8 PRIMARY KEY, hours int4range);
   * INSERT INTO orders VALUES
   *   (1, '[9, 12)'),
   *   (2, '[14, 17)');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('orders')
   *   .select('id')
   *   .rangeGt('hours', '[12, 14)')
   *   .returns<Order[]>();
   * // data: [{ id: 2 }]
   * ```
   */
  rangeGt(column: string, range: string): this;

  /**
   * Filter rows where a range `column` does not extend to the left of `range`.
   *
   * @param column - Range column to filter on.
   * @param range - PostgreSQL range literal (such as `'[1, 5)'`).
   *
   * @example Find windows starting at or after a range start
   * ```sql
   * CREATE TABLE orders (id int8 PRIMARY KEY, hours int4range);
   * INSERT INTO orders VALUES
   *   (1, '[9, 12)'),
   *   (2, '[14, 17)');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('orders')
   *   .select('id')
   *   .rangeGte('hours', '[13, 18)')
   *   .returns<Order[]>();
   * // data: [{ id: 2 }]
   * ```
   */
  rangeGte(column: string, range: string): this;

  /**
   * Filter rows where a range `column` lies strictly to the left of `range`.
   *
   * @param column - Range column to filter on.
   * @param range - PostgreSQL range literal (such as `'[1, 5)'`).
   *
   * @example Find bookings strictly before a window
   * ```sql
   * CREATE TABLE orders (id int8 PRIMARY KEY, hours int4range);
   * INSERT INTO orders VALUES
   *   (1, '[9, 12)'),
   *   (2, '[14, 17)');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('orders')
   *   .select('id')
   *   .rangeLt('hours', '[12, 14)')
   *   .returns<Order[]>();
   * // data: [{ id: 1 }]
   * ```
   */
  rangeLt(column: string, range: string): this;

  /**
   * Filter rows where a range `column` does not extend to the right of `range`.
   *
   * @param column - Range column to filter on.
   * @param range - PostgreSQL range literal (such as `'[1, 5)'`).
   *
   * @example Find windows ending at or before a range end
   * ```sql
   * CREATE TABLE orders (id int8 PRIMARY KEY, hours int4range);
   * INSERT INTO orders VALUES
   *   (1, '[9, 12)'),
   *   (2, '[14, 17)');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('orders')
   *   .select('id')
   *   .rangeLte('hours', '[8, 13)')
   *   .returns<Order[]>();
   * // data: [{ id: 1 }]
   * ```
   */
  rangeLte(column: string, range: string): this;

  /**
   * Filter rows where a range `column` is immediately adjacent to `range` without overlapping.
   *
   * @param column - Range column to filter on.
   * @param range - PostgreSQL range literal (such as `'[1, 5)'`).
   *
   * @example Find adjacent time slots
   * ```sql
   * CREATE TABLE orders (id int8 PRIMARY KEY, hours int4range);
   * INSERT INTO orders VALUES
   *   (1, '[9, 12)'),
   *   (2, '[14, 17)');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('orders')
   *   .select('id')
   *   .rangeAdjacent('hours', '[12, 14)')
   *   .returns<Order[]>();
   * // data: [{ id: 1 }, { id: 2 }]
   * ```
   */
  rangeAdjacent(column: string, range: string): this;

  /**
   * Filter rows where an array or range `column` shares at least one element with `value`.
   *
   * @param column - Array or range column to filter on.
   * @param value - Array of elements or PostgreSQL range literal to test for overlap.
   *
   * @example Find tasks matching any tag in a list
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text, tags text[]);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs', ARRAY['docs', 'urgent']),
   *   (2, 'Ship SDK', ARRAY['release']);
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .overlaps('tags', ['urgent', 'blocked'])
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }]
   * ```
   */
  overlaps(column: string, value: string | readonly unknown[]): this;

  /**
   * Filter rows where a `text` or `tsvector` `column` matches the full-text `query`.
   *
   * @param column - Text or `tsvector` column to search.
   * @param query - Full-text search query expression.
   * @param options - Optional text search configuration and parsing mode.
   *
   * @example Search task descriptions with full-text search
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write API documentation'),
   *   (2, 'Fix login bug');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .textSearch('title', 'documentation', { config: 'english', type: 'plain' })
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write API documentation' }]
   * ```
   */
  textSearch(
    column: string,
    query: string,
    options?: Readonly<FilterTextSearchOptions> | undefined
  ): this;

  /**
   * Filter rows where every `key: value` entry in `query` matches.
   *
   * @param query - Object mapping column names to expected values.
   *
   * @example Match multiple columns at once
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text, status text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs', 'open'),
   *   (2, 'Ship SDK', 'done');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .match({ id: 1, status: 'open' })
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }]
   * ```
   */
  match<
    Query extends object & {
      readonly [K in keyof Query]: unknown;
    } & {
      readonly [Symbol.iterator]?: never;
    } = Record<string, unknown>
  >(
    query: Query
  ): this;

  /**
   * Filter rows where `column` is not `null`, narrowing `column` to `NonNullable` in the result type.
   *
   * @param column - Column to filter and narrow.
   * @param operator - The `'is'` operator.
   * @param value - `null` literal.
   */
  not<ColumnName extends string>(
    column: ColumnName,
    operator: 'is',
    value: null
  ): FilterBuilder<NarrowResultColumn<T, ColumnName>, Method, ThrowOnError> &
    this;
  /**
   * Filter rows that do not satisfy `operator` and `value` on `column`.
   *
   * @param column - Column to filter on.
   * @param operator - PostgREST operator name to negate (such as `'eq'` or `'in'`).
   * @param value - Raw PostgREST operand value.
   *
   * @example Exclude rows matching a condition
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text, status text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs', 'open'),
   *   (2, 'Ship SDK', 'archived');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .not('status', 'eq', 'archived')
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }]
   * ```
   */
  not(
    column: string,
    operator: FilterOperator | (string & {}),
    value: unknown
  ): this;

  /**
   * Filter rows matching at least one condition in a comma-separated PostgREST filter string.
   *
   * @param filters - Comma-separated PostgREST filter expressions (such as `'status.eq.open,priority.gte.3'`).
   * @param options - Optional target table configuration for embedded resources.
   *
   * @example Match any of multiple conditions
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text, status text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs', 'open'),
   *   (2, 'Ship SDK', 'done');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .or('id.eq.1,status.eq.open')
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }]
   * ```
   */
  or(filters: string, options?: Readonly<FilterOrOptions> | undefined): this;

  /**
   * Filter rows using a raw PostgREST operator name (such as `'eq'` or `'not.in'`).
   *
   * @param column - Column to filter on.
   * @param operator - PostgREST operator name, optionally prefixed with `'not.'`.
   * @param value - Raw PostgREST operand value.
   *
   * @example Apply a raw PostgREST filter
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text, status text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs', 'open'),
   *   (2, 'Ship SDK', 'done');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .filter('status', 'in', '("open","in_progress")')
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }]
   * ```
   */
  filter(
    column: string,
    operator: `${'' | 'not.'}${FilterOperator}` | (string & {}),
    value: unknown
  ): this;
}
