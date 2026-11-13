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
/** Row-counting algorithm used when `count` is requested (`'exact'`, `'planned'`, or `'estimated'`). */
export type QueryCountStrategy =
  'exact' | 'planned' | 'estimated' | (string & {});

/** Options for selecting rows in <code>{@link QueryBuilder.select}</code>. */
export interface QuerySelectOptions {
  /** Return only `count` without row data (`data` is `null`) when `true`. */
  head?: boolean | undefined;
  /** Row-counting algorithm to return in `result.count`. */
  count?: QueryCountStrategy | undefined;
}

/** Options for inserting rows in <code>{@link QueryBuilder.insert}</code>. */
export interface QueryInsertOptions {
  /** Row-counting algorithm to return in `result.count`. */
  count?: QueryCountStrategy | undefined;
  /** Fill missing columns in bulk inserts with `NULL` when `true` (default) or column defaults when `false`. */
  defaultToNull?: boolean | undefined;
}

/** Options for upserting rows in <code>{@link QueryBuilder.upsert}</code>. */
export interface QueryUpsertOptions {
  /** Unique column name(s), comma-separated, used to detect conflicts instead of the primary key. */
  onConflict?: string | undefined;
  /** Ignore conflicting rows instead of merging updates when `true`. */
  ignoreDuplicates?: boolean | undefined;
  /** Row-counting algorithm to return in `result.count`. */
  count?: QueryCountStrategy | undefined;
  /** Fill missing columns in bulk upserts with `NULL` when `true` (default) or column defaults when `false`. */
  defaultToNull?: boolean | undefined;
}

/** Options for updating rows in <code>{@link QueryBuilder.update}</code>. */
export interface QueryUpdateOptions {
  /** Row-counting algorithm to return in `result.count`. */
  count?: QueryCountStrategy | undefined;
}

/** Options for deleting rows in <code>{@link QueryBuilder.delete}</code>. */
export interface QueryDeleteOptions {
  /** Row-counting algorithm to return in `result.count`. */
  count?: QueryCountStrategy | undefined;
}

/** Constrains `T` to a single non-iterable row object rather than an array. */
export type NonIterable<T> = T & { readonly [Symbol.iterator]?: never };

/** Entry-point builder for selecting or mutating rows on a table or view. */
export interface QueryBuilder {
  /**
   * Select rows from the target table or view.
   *
   * @remarks
   * Untyped queries default to `Array<Record<string, unknown>>` — chain `.returns<T[]>()` or `.overrideTypes<T[]>()` to type the returned rows.
   *
   * @param columns - Comma-separated columns to retrieve (defaults to `'*'`).
   * @param options - Optional head and count settings.
   *
   * @example Select specific columns
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
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }, { id: 2, title: 'Ship SDK' }]
   * ```
   */
  select(
    columns?: string | undefined,
    options?: Readonly<QuerySelectOptions> | undefined
  ): FilterBuilder<Array<Record<string, unknown>>, 'GET'>;

  /**
   * Insert one or more rows into the target table or view.
   *
   * @remarks
   * Inserted rows are not returned by default (`data` is `null`). Chain `.select()` to return the inserted rows, and pass an array of objects to insert multiple rows in a single transaction.
   *
   * @param values - Row object or array of row objects to insert.
   * @param options - Optional count settings.
   *
   * @example Insert a row and return it
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text);
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .insert({ id: 1, title: 'Write docs' })
   *   .select()
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }]
   * ```
   */
  insert<
    Row extends NonIterable<
      object & {
        readonly [K in keyof Row]: unknown;
      }
    > = Record<string, unknown>
  >(
    values: Row | readonly Row[],
    options?: Readonly<QueryInsertOptions> | undefined
  ): FilterBuilder<null, 'POST'>;

  /**
   * Insert rows into the target table or update existing rows on conflict.
   *
   * @remarks
   * Upserted rows are not returned by default (`data` is `null`). Chain `.select()` to return the rows, and set `options.onConflict` when matching on a non-primary-key unique constraint.
   *
   * @param values - Row object or array of row objects to upsert.
   * @param options - Optional conflict-resolution and count settings.
   *
   * @example Upsert a row by primary key
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text, status text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs', 'open');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .upsert({ id: 1, title: 'Write docs', status: 'done' })
   *   .select()
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs', status: 'done' }]
   * ```
   */
  upsert<
    Row extends NonIterable<
      object & {
        readonly [K in keyof Row]: unknown;
      }
    > = Record<string, unknown>
  >(
    values: Row | readonly Row[],
    options?: Readonly<QueryUpsertOptions> | undefined
  ): FilterBuilder<null, 'POST'>;

  /**
   * Update matching rows in the target table or view.
   *
   * @remarks
   * Always chain a filter (such as `.eq()`) to target specific rows, and chain `.select()` if you need the updated rows returned.
   *
   * @param values - Column values to update on matching rows.
   * @param options - Optional count settings.
   *
   * @example Update a row by ID
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text, status text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs', 'open');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .update({ status: 'done' })
   *   .eq('id', 1)
   *   .select()
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs', status: 'done' }]
   * ```
   */
  update<
    Row extends NonIterable<
      object & {
        readonly [K in keyof Row]: unknown;
      }
    > = Record<string, unknown>
  >(
    values: Row,
    options?: Readonly<QueryUpdateOptions> | undefined
  ): FilterBuilder<null, 'PATCH'>;

  /**
   * Delete matching rows from the target table or view.
   *
   * @remarks
   * Always chain a filter (such as `.eq()`) to target specific rows, and chain `.select()` if you need the deleted rows returned.
   *
   * @param options - Optional count settings.
   *
   * @example Delete a row by ID
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs'),
   *   (2, 'Ship SDK');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .delete()
   *   .eq('id', 1)
   *   .select()
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }]
   * ```
   */
  delete(
    options?: Readonly<QueryDeleteOptions> | undefined
  ): FilterBuilder<null, 'DELETE'>;
}
