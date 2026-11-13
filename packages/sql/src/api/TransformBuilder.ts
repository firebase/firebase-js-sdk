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

/** Compile-time type error returned when a builder method is unavailable for the current HTTP verb. */
export interface InvalidMethodError<S extends string> {
  /** Diagnostic message describing why the method is unavailable. */
  Error: S;
}

/** Options for sorting query results in <code>{@link TransformBuilder.order}</code>. */
export interface TransformOrderOptions {
  /** Sort ascending when `true` (default) or descending when `false`. */
  ascending?: boolean | undefined;
  /** Place `NULL` values first when `true` or last when `false`. */
  nullsFirst?: boolean | undefined;
  /** Deprecated alias for `referencedTable`. @deprecated Use `referencedTable` instead. */
  foreignTable?: string | undefined;
  /** Embedded related table whose nested array should be sorted. */
  referencedTable?: string | undefined;
}

/** Options for limiting rows in <code>{@link TransformBuilder.limit}</code>. */
export interface TransformLimitOptions {
  /** Deprecated alias for `referencedTable`. @deprecated Use `referencedTable` instead. */
  foreignTable?: string | undefined;
  /** Embedded related table whose nested array should be limited. */
  referencedTable?: string | undefined;
}

/** Options for paginating rows in <code>{@link TransformBuilder.range}</code>. */
export interface TransformRangeOptions {
  /** Deprecated alias for `referencedTable`. @deprecated Use `referencedTable` instead. */
  foreignTable?: string | undefined;
  /** Embedded related table whose nested array should be paginated. */
  referencedTable?: string | undefined;
}

/** Output format for <code>{@link TransformBuilder.explain}</code> (`'json'` or `'text'`). */
export type TransformExplainFormat = 'json' | 'text';

/** Options for inspecting the query plan in <code>{@link TransformBuilder.explain}</code>. */
export interface TransformExplainOptions {
  /** Execute the query and include actual run times and row counts when `true`. */
  analyze?: boolean | undefined;
  /** Include output column lists and query identifiers in the plan when `true`. */
  verbose?: boolean | undefined;
  /** Include modified configuration parameters that affect query planning when `true`. */
  settings?: boolean | undefined;
  /** Include shared, local, and temp buffer usage statistics when `true`. */
  buffers?: boolean | undefined;
  /** Include Write-Ahead Logging (WAL) record generation statistics when `true`. */
  wal?: boolean | undefined;
  /** Output format for the plan (`'text'` by default or `'json'`). */
  format?: TransformExplainFormat | undefined;
}

/** Query builder supporting ordering, pagination, row cardinality, and output format modifiers. */
export interface TransformBuilder<
  Result$1,
  Method = unknown,
  ThrowOnError extends boolean = false
> extends Builder<Result$1, ThrowOnError> {
  /** Throw a `FirebaseSqlError` when the operation fails instead of returning it in `result.error`. */
  throwOnError(): TransformBuilder<Result$1, Method, true>;

  /**
   * Return rows modified by an `insert`, `upsert`, `update`, or `delete` operation, or project columns from a table-valued `rpc` result.
   *
   * @param columns - Comma-separated columns to return. Defaults to `'*'`.
   *
   * @example Return rows from an update
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text, done boolean);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs', false);
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .update({ done: true })
   *   .eq('id', 1)
   *   .select('id, done')
   *   .returns<Task[]>();
   * // data: [{ id: 1, done: true }]
   * ```
   */
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

  /**
   * Sort query results by `column`.
   *
   * @param column - Column to sort by.
   * @param options - Optional sort direction, null ordering, and referenced table settings.
   *
   * @example Sort products by price descending
   * ```sql
   * CREATE TABLE products (id int8 PRIMARY KEY, name text, price numeric);
   * INSERT INTO products VALUES
   *   (1, 'Pen', 2.50),
   *   (2, 'Notebook', 12.00);
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('products')
   *   .select('id, name, price')
   *   .order('price', { ascending: false })
   *   .returns<Product[]>();
   * // data: [{ id: 2, name: 'Notebook', price: 12 }, { id: 1, name: 'Pen', price: 2.5 }]
   * ```
   */
  order(
    column: string,
    options?: Readonly<TransformOrderOptions> | undefined
  ): this;

  /**
   * Limit the query result to at most `rows` rows.
   *
   * @param rows - Maximum number of rows to return.
   * @param options - Optional referenced table settings.
   *
   * @example Return the first 2 tasks
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs'),
   *   (2, 'Add tests'),
   *   (3, 'Ship SDK');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .order('id')
   *   .limit(2)
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }, { id: 2, title: 'Add tests' }]
   * ```
   */
  limit(
    rows: number,
    options?: Readonly<TransformLimitOptions> | undefined
  ): this;

  /**
   * Limit the query result to rows within the inclusive zero-based index range `[from, to]`.
   *
   * @param from - Zero-based starting row index (inclusive).
   * @param to - Zero-based ending row index (inclusive).
   * @param options - Optional referenced table settings.
   *
   * @example Fetch a page of rows
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs'),
   *   (2, 'Add tests'),
   *   (3, 'Ship SDK');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .order('id')
   *   .range(1, 2)
   *   .returns<Task[]>();
   * // data: [{ id: 2, title: 'Add tests' }, { id: 3, title: 'Ship SDK' }]
   * ```
   */
  range(
    from: number,
    to: number,
    options?: Readonly<TransformRangeOptions> | undefined
  ): this;

  /**
   * Attach an `AbortSignal` to cancel the in-flight HTTP request.
   *
   * @param signal - Signal from an `AbortController` or `AbortSignal.timeout()`.
   *
   * @example Cancel a query with AbortController
   * ```ts
   * const controller = new AbortController();
   * const responsePromise = sql
   *   .from('tasks')
   *   .select()
   *   .abortSignal(controller.signal);
   *
   * controller.abort();
   * const { data, error } = await responsePromise;
   * ```
   */
  abortSignal(signal: AbortSignal): this;

  /**
   * Unwrap `result.data` to a single row object instead of an array.
   *
   * @remarks
   * Fails with a `FirebaseSqlError` if the query returns zero rows or more than one row — apply filters before calling `.single()`.
   *
   * @example Fetch a single row by primary key
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
   *   .eq('id', 1)
   *   .single<Task>();
   * // data: { id: 1, title: 'Write docs' }
   * ```
   */
  single<
    ResultOne = unknown extends Result$1
      ? Record<string, unknown>
      : Result$1 extends ReadonlyArray<infer R>
        ? R
        : never
  >(): Builder<ResultOne, ThrowOnError>;

  /**
   * Unwrap `result.data` to a single row object, or `null` when zero rows match.
   *
   * @remarks
   * Fails with a `FirebaseSqlError` if the query returns more than one row.
   *
   * @example Fetch an optional row
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .eq('id', 99)
   *   .maybeSingle<Task>();
   * // data: null
   * ```
   */
  maybeSingle<
    ResultOne = unknown extends Result$1
      ? Record<string, unknown>
      : Result$1 extends ReadonlyArray<infer R>
        ? R
        : never
  >(): Builder<ResultOne | null, ThrowOnError>;

  /**
   * Format `result.data` as a comma-separated values (CSV) string including a header row.
   *
   * @example Export rows as CSV
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
   *   .order('id')
   *   .csv();
   * // data: "id,title\n1,Write docs\n2,Ship SDK"
   * ```
   */
  csv(): Builder<string, ThrowOnError>;

  /**
   * Format `result.data` as a GeoJSON `FeatureCollection` object.
   *
   * @example Fetch landmarks as GeoJSON
   * ```sql
   * CREATE TABLE landmarks (id int8 PRIMARY KEY, name text, geom geometry(Point, 4326));
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('landmarks')
   *   .select('id, name, geom')
   *   .geojson();
   * // data: { type: 'FeatureCollection', features: [...] }
   * ```
   */
  geojson(): Builder<Record<string, unknown>, ThrowOnError>;

  /**
   * Return the PostgreSQL `EXPLAIN` execution plan for the query instead of its row results.
   *
   * @param options - Optional `EXPLAIN` flags and output format.
   *
   * @example Inspect a query execution plan
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .explain({ analyze: true, format: 'json' });
   * ```
   */
  explain(
    options?: Readonly<TransformExplainOptions> | undefined
  ):
    | Builder<Array<Record<string, unknown>>, ThrowOnError>
    | Builder<string, ThrowOnError>;

  /**
   * Run the query or mutation inside a transaction that is rolled back at the end of the request.
   *
   * @example Dry-run an insert with rollback
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text);
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .insert({ id: 1, title: 'Dry run' })
   *   .select()
   *   .rollback()
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Dry run' }] (not persisted)
   * ```
   */
  rollback(): this;

  /**
   * Set the TypeScript row or payload type for `result.data` while keeping filter and transform methods available.
   *
   * @remarks
   * Can be chained before `.single()`, `.maybeSingle()`, or additional transforms; array vs. single-object cardinality must match the query shape.
   *
   * @example Type a query before calling single
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .eq('id', 1)
   *   .returns<Task[]>()
   *   .single();
   * // data: { id: 1, title: 'Write docs' }
   * ```
   */
  returns<NewResult>(): TransformBuilder<
    CheckMatchingArrayTypes<Result$1, NewResult>,
    Method,
    ThrowOnError
  >;

  /**
   * Fail the mutation or RPC if more than `rows` rows are affected.
   *
   * @param rows - Maximum number of rows allowed to be modified.
   */
  maxAffected(
    rows: number
  ): Method extends 'PATCH' | 'DELETE' | 'RPC'
    ? this
    : InvalidMethodError<'maxAffected method only available on update or delete'>;
}
