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

/**
 * Compile-time sentinel type returned instead of a valid builder when a method is chained onto an
 * incompatible HTTP verb (for example, calling {@link TransformBuilder.maxAffected} on a `select()` or `insert()` builder).
 *
 * @remarks
 * Not constructible as a runtime error—surfaces as a non-awaitable `{ Error: S }` return type in TypeScript so invalid chains fail to type-check.
 *
 * @typeParam S - Human-readable diagnostic string literal explaining why the method is unavailable.
 *
 * @example
 * **Observe compile-time `InvalidMethodError` on an unsupported `select()` chain**
 * ```ts
 * import type { InvalidMethodError } from 'firebase/sql';
 *
 * const invalid: InvalidMethodError<'maxAffected method only available on update or delete'> =
 *   sql.from('events').select('id').maxAffected(1);
 * ```
 *
 * @public
 */
export interface InvalidMethodError<S extends string> {
  /** Compile-time diagnostic message describing the unsupported HTTP method combination. */
  Error: S;
}

/**
 * Ordering options for {@link TransformBuilder.order}.
 *
 * @example
 * **Sort an embedded `registrations` array newest-first with `NULL` check-ins placed last**
 * ```ts
 * import type { TransformOrderOptions } from 'firebase/sql';
 *
 * const orderOpts: TransformOrderOptions = {
 *   referencedTable: 'registrations',
 *   ascending: false,
 *   nullsFirst: false
 * };
 * const res = await sql
 *   .from('events')
 *   .select('id, title, registrations(id, attendee_email, checked_in_at)')
 *   .order('checked_in_at', orderOpts);
 * ```
 *
 * @public
 */
export interface TransformOrderOptions {
  /**
   * Sorts values in ascending (`true`) or descending (`false`) order.
   *
   * @defaultValue `true`
   */
  ascending?: boolean | undefined;

  /**
   * Places `NULL` values before non-null values (`true` emits `.nullsfirst`) or after (`false` emits `.nullslast`).
   *
   * @remarks
   * When omitted, PostgreSQL applies its default null ordering (`NULLS LAST` for `ASC`, `NULLS FIRST` for `DESC`).
   *
   * @defaultValue `undefined`
   */
  nullsFirst?: boolean | undefined;

  /**
   * Legacy alias for {@link TransformOrderOptions.referencedTable}. Prefer `referencedTable`.
   *
   * @deprecated Use {@link TransformOrderOptions.referencedTable} instead.
   * @defaultValue `undefined`
   */
  foreignTable?: string | undefined;

  /**
   * Embedded relation name (or alias) whose nested array elements should be sorted instead of the parent table (`?<referencedTable>.order=...`).
   *
   * @remarks
   * Takes precedence over `foreignTable` when both are provided. Does not change parent-row order
   * (to sort parent rows by a many-to-one relation column, pass `'venue(name)'` as `column` with `referencedTable` omitted).
   *
   * @defaultValue `undefined`
   */
  referencedTable?: string | undefined;
}

/**
 * Embedded-table targeting options for {@link TransformBuilder.limit}.
 *
 * @example
 * **Cap nested `registrations` to 5 items per parent event**
 * ```ts
 * import type { TransformLimitOptions } from 'firebase/sql';
 *
 * const limitOpts: TransformLimitOptions = { referencedTable: 'registrations' };
 * const res = await sql
 *   .from('events')
 *   .select('id, title, registrations(id, attendee_email)')
 *   .limit(5, limitOpts);
 * ```
 *
 * @public
 */
export interface TransformLimitOptions {
  /**
   * Legacy alias for {@link TransformLimitOptions.referencedTable}. Prefer `referencedTable`.
   *
   * @deprecated Use {@link TransformLimitOptions.referencedTable} instead.
   * @defaultValue `undefined`
   */
  foreignTable?: string | undefined;

  /**
   * Embedded child relation name (or alias) whose nested array length should be capped per parent row (`?<referencedTable>.limit=...`).
   *
   * @defaultValue `undefined`
   */
  referencedTable?: string | undefined;
}

/**
 * Embedded-table targeting options for {@link TransformBuilder.range}.
 *
 * @example
 * **Paginate nested `registrations` to indices `0..9` per parent event**
 * ```ts
 * import type { TransformRangeOptions } from 'firebase/sql';
 *
 * const rangeOpts: TransformRangeOptions = { referencedTable: 'registrations' };
 * const res = await sql
 *   .from('events')
 *   .select('id, title, registrations(id, attendee_email)')
 *   .range(0, 9, rangeOpts);
 * ```
 *
 * @public
 */
export interface TransformRangeOptions {
  /**
   * Legacy alias for {@link TransformRangeOptions.referencedTable}. Prefer `referencedTable`.
   *
   * @deprecated Use {@link TransformRangeOptions.referencedTable} instead.
   * @defaultValue `undefined`
   */
  foreignTable?: string | undefined;

  /**
   * Embedded child relation name (or alias) to paginate per parent row (`?<referencedTable>.offset=...&<referencedTable>.limit=...`).
   *
   * @defaultValue `undefined`
   */
  referencedTable?: string | undefined;
}

/**
 * Output serialization format for PostgreSQL `EXPLAIN` plans requested via {@link TransformBuilder.explain}.
 *
 * @remarks
 * - `'text'`: Returns PostgreSQL's human-readable indented plan text as a `string`.
 * - `'json'`: Returns PostgreSQL's structured plan array as `Array<Record<string, unknown>>`.
 *
 * @example
 * **Select JSON output format for programmatic query-plan inspection**
 * ```ts
 * import type { TransformExplainFormat } from 'firebase/sql';
 *
 * const format: TransformExplainFormat = 'json';
 * const res = await sql.from('events').select('id, title').explain({ format });
 * ```
 *
 * @public
 */
export type TransformExplainFormat = 'json' | 'text';

/**
 * PostgreSQL `EXPLAIN` execution flags and output format options for {@link TransformBuilder.explain}.
 *
 * @example
 * **Configure `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` options**
 * ```ts
 * import type { TransformExplainOptions } from 'firebase/sql';
 *
 * const explainOpts: TransformExplainOptions = {
 *   analyze: true,
 *   buffers: true,
 *   format: 'json'
 * };
 * const res = await sql
 *   .from('events')
 *   .select('id, code, title')
 *   .eq('status', 'published')
 *   .explain(explainOpts);
 * ```
 *
 * @public
 */
export interface TransformExplainOptions {
  /**
   * Executes the statement to include actual runtime timings and row counts (`ANALYZE`) in addition to planner estimates.
   *
   * @remarks
   * When chained onto a write query (`insert`, `update`, `upsert`, `delete`), `analyze: true` **actually executes** the write unless combined with {@link TransformBuilder.rollback | .rollback()}!
   *
   * @defaultValue `false`
   */
  analyze?: boolean | undefined;

  /**
   * Includes output column lists, schema-qualified relation names, and query identifiers (`VERBOSE`).
   *
   * @defaultValue `false`
   */
  verbose?: boolean | undefined;

  /**
   * Includes non-default planner configuration parameters affecting the plan (`SETTINGS`).
   *
   * @defaultValue `false`
   */
  settings?: boolean | undefined;

  /**
   * Includes shared/local/temp buffer hit and read counts (`BUFFERS`). Typically paired with `analyze: true`.
   *
   * @defaultValue `false`
   */
  buffers?: boolean | undefined;

  /**
   * Includes Write-Ahead Log record generation statistics (`WAL`). Only meaningful when `analyze: true` is also set on data-modifying queries.
   *
   * @defaultValue `false`
   */
  wal?: boolean | undefined;

  /**
   * Serialization format of `result.data`: `'text'` (`string`) or `'json'` (`Array<Record<string, unknown>>`).
   *
   * @defaultValue `'text'`
   */
  format?: TransformExplainFormat | undefined;
}

/**
 * Lazy PostgREST result-shaping builder supporting post-mutation projection (`select`), ordering,
 * pagination (`limit`, `range`), safety guards (`maxAffected`, `rollback`, `abortSignal`), and
 * cardinality/format narrowing (`single`, `maybeSingle`, `csv`, `geojson`, `explain`).
 *
 * @remarks
 * **Builder Progression:** Base interface of {@link FilterBuilder} and subtype of {@link Builder}.
 * Calling `.single()`, `.maybeSingle()`, `.csv()`, `.geojson()`, or `.explain()` narrows the static
 * return type to {@link Builder}—always apply filters (`eq`, `in`), `order()`, `limit()`, `range()`,
 * and `maxAffected()` **before** those terminal format modifiers.
 *
 * @typeParam Result$1 - Expected resolved `data` payload type prior to cardinality/format narrowing.
 * @typeParam Method - HTTP/RPC operation discriminator (`'GET'`, `'POST'`, `'PATCH'`, `'DELETE'`, `'RPC'`).
 * @typeParam ThrowOnError - `true` after `throwOnError()` is called; `false` by default.
 *
 * @example
 * **Order, paginate, and apply an `AbortSignal` timeout on a `TransformBuilder`**
 * ```ts
 * const res = await sql
 *   .from('venues')
 *   .select('id, slug, name, capacity')
 *   .order('capacity', { ascending: false })
 *   .range(0, 9)
 *   .abortSignal(AbortSignal.timeout(5000))
 *   .overrideTypes<Array<{ id: string; slug: string; name: string; capacity: number }>, { merge: false }>();
 * ```
 *
 * @public
 */
export interface TransformBuilder<
  Result$1,
  Method = unknown,
  ThrowOnError extends boolean = false
> extends Builder<Result$1, ThrowOnError> {
  /**
   * Switches this builder into throwing mode so awaiting it rejects with {@link FirebaseSqlError}
   * on failure while preserving {@link TransformBuilder} chaining.
   *
   * @returns This {@link TransformBuilder} narrowed to `ThrowOnError = true`.
   *
   * @example
   * **Enable throwing mode before `.single()` on a `TransformBuilder`**
   * ```ts
   * const { data } = await sql
   *   .from('venues')
   *   .select('id, name')
   *   .eq('slug', 'moscone-west')
   *   .throwOnError()
   *   .single()
   *   .overrideTypes<{ id: string; name: string }, { merge: false }>();
   * ```
   *
   * @see {@link Builder.throwOnError} for full error-throwing semantics.
   * @public
   */
  throwOnError(): TransformBuilder<Result$1, Method, true>;

  /**
   * Requests that PostgREST return the affected row representation (`Prefer: return=representation`)
   * projected to `columns` after `insert`, `upsert`, `update`, `delete`, or set-returning `rpc`.
   *
   * @remarks
   * **When to use:** Chaining onto {@link QueryBuilder.insert}, {@link QueryBuilder.upsert},
   * {@link QueryBuilder.update}, or {@link QueryBuilder.delete} when you need database-generated
   * columns (`id`, `created_at`) or post-update values in `result.data` (which otherwise resolves to `null`),
   * or projecting specific columns from a table-returning {@link FirebaseSql.rpc} call.
   *
   * **Preconditions:**
   * - Under PostgreSQL Row-Level Security (RLS), returning mutated rows requires a `SELECT` policy
   *   permitting visibility of the affected rows in addition to the mutation policy.
   *
   * **Behavior & Side Effects:**
   * - **Builder Progression:** Transitions `Result$1` from `null` to `Array<Record<string, unknown>>`
   *   (for table mutations) and returns a {@link FilterBuilder}, enabling subsequent `.order()`,
   *   `.single()`, `.maybeSingle()`, and `.overrideTypes()`.
   * - Appends `Prefer: return=representation` and sets `?select=<columns>` (stripping unquoted whitespace).
   *
   * @param columns - Comma-separated column projection (defaults to `'*'`). Supports aliases and embedded foreign-key relations.
   * @returns This builder typed as {@link FilterBuilder} with array row representation.
   *
   * @example
   * **Return database-generated columns from an `insert()`**
   * ```ts
   * const res = await sql
   *   .from('venues')
   *   .insert({ slug: 'paramount-sea', name: 'Paramount Theatre', city: 'Seattle', capacity: 2800 })
   *   .select('id, slug, name')
   *   .single()
   *   .overrideTypes<{ id: string; slug: string; name: string }, { merge: false }>();
   * ```
   *
   * @see {@link QueryBuilder.select} for starting a read-only `SELECT` query.
   * @public
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
   * Appends an `ORDER BY` clause (`?order=<column>.<asc|desc>[.<nullsfirst|nullslast>]`) to sort
   * parent rows or an embedded child relation's array.
   *
   * @remarks
   * **When to use:** Deterministic sorting of query or mutation results—especially before
   * {@link TransformBuilder.limit} or {@link TransformBuilder.range} pagination. Chain multiple
   * `.order()` calls to sort by primary, secondary, and tertiary columns in call order.
   * For `jsonb` properties, use single-arrow `'metadata->level'` for numeric/typed JSON sorting and
   * double-arrow `'metadata->>track'` for lexicographical text sorting.
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @param column - PostgreSQL column name, JSON path (`metadata->level` or `metadata->>track`), or `foreign_alias(column)` to sort parent rows by a many-to-one relation.
   * @param options - Sort direction (`ascending`), null placement (`nullsFirst`), and embedded `referencedTable` target. See {@link TransformOrderOptions}.
   * @returns This builder for continued chaining.
   *
   * @example
   * **Sort events by price ascending, breaking ties by newest `created_at`**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, ticket_price, created_at')
   *   .order('ticket_price', { ascending: true })
   *   .order('created_at', { ascending: false });
   * ```
   *
   * @see {@link TransformOrderOptions} for `ascending`, `nullsFirst`, and `referencedTable` options.
   * @public
   */
  order(
    column: string,
    options?: Readonly<TransformOrderOptions> | undefined
  ): this;

  /**
   * Caps the maximum number of rows returned (`?limit=<rows>` or `?<referencedTable>.limit=<rows>`).
   *
   * @remarks
   * **When to use:** Fetching the top `N` rows (combine with {@link TransformBuilder.order}) or
   * capping nested child arrays on each parent row via `options.referencedTable`.
   *
   * **Do NOT use:** Offset-based pagination across pages; use {@link TransformBuilder.range} instead
   * (which sets both `offset` and `limit`).
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @param rows - Non-negative maximum row count to return.
   * @param options - Optional `referencedTable` to cap an embedded relation instead of parent rows. See {@link TransformLimitOptions}.
   * @returns This builder for continued chaining.
   *
   * @example
   * **Fetch the 5 highest-capacity venues**
   * ```ts
   * const res = await sql
   *   .from('venues')
   *   .select('id, name, city, capacity')
   *   .order('capacity', { ascending: false })
   *   .limit(5);
   * ```
   *
   * @see {@link TransformBuilder.range} for 0-based inclusive page slicing.
   * @public
   */
  limit(
    rows: number,
    options?: Readonly<TransformLimitOptions> | undefined
  ): this;

  /**
   * Slices the result set to the **0-based inclusive** index window `[from, to]` (`?offset=<from>&limit=<to - from + 1>`).
   *
   * @remarks
   * **When to use:** Page-based pagination (for example, page 1 of 20 items is `.range(0, 19)`,
   * page 2 is `.range(20, 39)`). Always pair with a deterministic {@link TransformBuilder.order}
   * clause (such as ordering by a unique `id` tie-breaker) so rows cannot shift across pages.
   *
   * **Behavior & Side Effects:** Both `from` and `to` are **inclusive** (`range(0, 9)` returns up to
   * `10` rows). Mutates URL query parameters in place without network I/O and returns `this`.
   *
   * **Error Handling & Remediation:**
   * - When `count` (`'exact'`, `'planned'`, or `'estimated'`) is requested and `from > 0` is greater
   *   than or equal to the total matching row count (or when `to < from`), PostgREST returns HTTP
   *   `416 Requested Range Not Satisfiable`, which resolves to {@link OperationFailure}
   *   (`status: 416`, `category: 'sql-postgrest'`, `error.code === 'PGRST103'`). Clamp `from` to
   *   total count or treat `error.code === 'PGRST103'` as an empty page (`[]`).
   *
   * @param from - 0-based starting row index (inclusive, must be `>= 0`).
   * @param to - 0-based ending row index (inclusive, must be `>= from`).
   * @param options - Optional `referencedTable` to paginate an embedded child array per parent row. See {@link TransformRangeOptions}.
   * @returns This builder for continued chaining.
   *
   * @example
   * **Fetch page 2 (rows 20..39) of published events**
   * ```ts
   * const page2 = await sql
   *   .from('events')
   *   .select('id, code, title', { count: 'exact' })
   *   .eq('status', 'published')
   *   .order('created_at', { ascending: false })
   *   .order('id', { ascending: true })
   *   .range(20, 39);
   * ```
   *
   * @see {@link TransformBuilder.limit} for simple top-N queries without an offset.
   * @public
   */
  range(
    from: number,
    to: number,
    options?: Readonly<TransformRangeOptions> | undefined
  ): this;

  /**
   * Attaches an `AbortSignal` to cancel the underlying HTTP `fetch` request (and any pending retries) when aborted.
   *
   * @remarks
   * **When to use:** Enforcing per-query deadlines (`AbortSignal.timeout(ms)`) or cancelling
   * in-flight queries when a UI component unmounts or user search input changes.
   *
   * **Behavior & Side Effects:** Composes `signal` with the client's internal {@link terminate}
   * signal. When `signal` aborts before completion, awaiting the builder resolves to
   * {@link OperationFailure} (`status: 0`, `category: 'sql-client'`, `code: 'other'`) by default,
   * or rejects with {@link FirebaseSqlError} when {@link Builder.throwOnError} is enabled.
   *
   * @param signal - Standard `AbortSignal` (for example, from `new AbortController().signal` or `AbortSignal.timeout(5000)`).
   * @returns This builder for continued chaining.
   *
   * @example
   * **Enforce a 3-second timeout on a query**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title')
   *   .abortSignal(AbortSignal.timeout(3000));
   * ```
   * @public
   */
  abortSignal(signal: AbortSignal): this;

  /**
   * Unwraps a 1-row array result into a single JSON object (`Accept: application/vnd.pgrst.object+json`)
   * and fails if the query matches `0` rows or more than `1` row.
   *
   * @remarks
   * **When to use:** Primary-key lookups (`eq('id', id)`) or single-row `insert(...).select()` chains
   * where anything other than **exactly 1 row** indicates an error.
   *
   * **Do NOT use:** Optional lookups that may legitimately match `0` rows—use
   * {@link TransformBuilder.maybeSingle} instead so `0` rows resolves to `data: null` rather than HTTP 406 `'PGRST116'`.
   *
   * **Behavior & Side Effects:**
   * - **Builder Progression:** `TransformBuilder<R[]> -> Builder<R, ThrowOnError>`. Terminal
   *   cardinality modifier—apply all filters, `.select()`, and `.order()` **before** `.single()`.
   * - Follow with `.overrideTypes<MyRow, { merge: false }>()` (passing a single object type `MyRow`,
   *   **not** `MyRow[]`) to strongly type `result.data`.
   *
   * **Error Handling & Remediation:**
   * - `0` rows or `> 1` rows resolves to {@link OperationFailure} with HTTP `status: 406`,
   *   `category: 'sql-postgrest'`, and `code: 'PGRST116'`. Switch to {@link TransformBuilder.maybeSingle}
   *   if `0` rows is expected, or add `.limit(1)` / a unique-key filter if multiple rows matched.
   *
   * @typeParam ResultOne - Unwrapped single-row type inferred from `Result$1`.
   * @returns A {@link Builder} resolving `data` as a single object `ResultOne`.
   *
   * @example
   * **Fetch a single venue by unique `slug`**
   * ```ts
   * interface VenueSummary {
   *   id: string;
   *   slug: string;
   *   name: string;
   *   capacity: number;
   * }
   *
   * const res = await sql
   *   .from('venues')
   *   .select('id, slug, name, capacity')
   *   .eq('slug', 'moscone-west')
   *   .single()
   *   .overrideTypes<VenueSummary, { merge: false }>();
   * ```
   *
   * @see {@link TransformBuilder.maybeSingle} when zero matching rows should resolve `data` to `null`.
   * @public
   */
  single<
    ResultOne = unknown extends Result$1
      ? Record<string, unknown>
      : Result$1 extends ReadonlyArray<infer R>
        ? R
        : never
  >(): Builder<ResultOne, ThrowOnError>;

  /**
   * Unwraps a `0`-or-`1` row result into `ResultOne | null`, failing only if **more than `1` row** matches.
   *
   * @remarks
   * **When to use:** Lookups by unique key or conditional `update(...).select()` chains where the
   * target row might not exist (`0` rows cleanly resolves to `success: true, data: null`).
   *
   * **Do NOT use:** Queries where `0` rows should be treated as an error; use {@link TransformBuilder.single} instead.
   *
   * **Behavior & Side Effects:**
   * - **Builder Progression:** `TransformBuilder<R[]> -> Builder<R | null, ThrowOnError>`. Terminal
   *   cardinality modifier—apply all filters and `.select()` **before** `.maybeSingle()`.
   * - Follow with `.overrideTypes<MyRow, { merge: false }>()` (pass `MyRow` without `| null` or `[]`;
   *   `overrideTypes` automatically preserves `| null` on `result.data`!).
   *
   * **Error Handling & Remediation:**
   * - Matching `2` or more rows resolves to {@link OperationFailure} with HTTP `status: 406`,
   *   `category: 'sql-postgrest'`, and `code: 'PGRST116'`. Filter on a `UNIQUE` column or add `.limit(1)`.
   *
   * @typeParam ResultOne - Unwrapped single-row type inferred from `Result$1`.
   * @returns A {@link Builder} resolving `data` as `ResultOne | null`.
   *
   * @example
   * **Look up an optional registration by composite key (`ResultOne | null`)**
   * ```ts
   * interface RegistrationCheck {
   *   id: string;
   *   role: 'attendee' | 'speaker' | 'organizer';
   *   checked_in_at: string | null;
   * }
   *
   * const res = await sql
   *   .from('registrations')
   *   .select('id, role, checked_in_at')
   *   .eq('event_id', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')
   *   .eq('attendee_email', 'alice@example.com')
   *   .maybeSingle()
   *   .overrideTypes<RegistrationCheck, { merge: false }>();
   *
   * if (res.success && res.data !== null) {
   *   console.log('Found registration:', res.data.id);
   * }
   * ```
   *
   * @see {@link TransformBuilder.single} when `0` rows must fail.
   * @public
   */
  maybeSingle<
    ResultOne = unknown extends Result$1
      ? Record<string, unknown>
      : Result$1 extends ReadonlyArray<infer R>
        ? R
        : never
  >(): Builder<ResultOne | null, ThrowOnError>;

  /**
   * Requests the response payload serialized as a raw CSV string (`Accept: text/csv`), including a header row.
   *
   * @remarks
   * **When to use:** Exporting query or mutation results directly as Comma-Separated Values text without client-side JSON-to-CSV formatting.
   *
   * **Do NOT use:** Together with {@link Builder.stripNulls | .stripNulls()}—calling `.csv().stripNulls()` throws a synchronous `Error('stripNulls() cannot be used with csv()')`.
   *
   * **Behavior & Side Effects:**
   * - **Builder Progression:** `TransformBuilder -> Builder<string, ThrowOnError>`. Terminal format modifier—chain all filters, `order()`, and `limit()` **before** `.csv()`.
   * - Mutates this builder's `Accept` header in place without network I/O.
   *
   * @returns A {@link Builder} whose `data` resolves to a `string` containing the CSV document.
   *
   * @example
   * **Export attendee registrations for an event as CSV**
   * ```ts
   * const res = await sql
   *   .from('registrations')
   *   .select('attendee_email, role, checked_in_at')
   *   .eq('event_id', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')
   *   .order('attendee_email', { ascending: true })
   *   .csv();
   *
   * if (res.success) {
   *   const csvText: string = res.data;
   * }
   * ```
   * @public
   */
  csv(): Builder<string, ThrowOnError>;

  /**
   * Requests the response payload formatted as a GeoJSON `FeatureCollection` object (`Accept: application/geo+json`).
   *
   * @remarks
   * **Preconditions:**
   * - Requires PostGIS on the PostgreSQL database and at least one `geometry` or `geography` column (such as `venues.coords`) in the selected output columns; otherwise PostgREST returns an error.
   *
   * **Behavior & Side Effects:**
   * - **Builder Progression:** `TransformBuilder -> Builder<Record<string, unknown>, ThrowOnError>`. Terminal format modifier—apply all filters, `order()`, and `limit()` **before** `.geojson()`.
   * - Follow with `.overrideTypes<MyFeatureCollection, { merge: false }>()` if you have a typed GeoJSON interface.
   *
   * @returns A {@link Builder} resolving `data` to a GeoJSON `Record<string, unknown>` object.
   *
   * @example
   * **Fetch San Francisco venues as a GeoJSON `FeatureCollection`**
   * ```ts
   * const res = await sql
   *   .from('venues')
   *   .select('id, slug, name, capacity, coords')
   *   .eq('city', 'San Francisco')
   *   .geojson();
   * ```
   * @public
   */
  geojson(): Builder<Record<string, unknown>, ThrowOnError>;

  /**
   * Requests the PostgreSQL `EXPLAIN` execution plan for this query instead of row data (`Accept: application/vnd.pgrst.plan+<format>; ...`).
   *
   * @remarks
   * **Preconditions:**
   * - PostgREST's `db-plan-enabled` server configuration must be enabled; otherwise the server rejects the `application/vnd.pgrst.plan+*` media type with HTTP `406`.
   * - Passing `{ analyze: true }` **executes** the underlying SQL statement—chain {@link TransformBuilder.rollback | .rollback()} *before* `.explain({ analyze: true })` when profiling `insert`, `upsert`, `update`, or `delete` statements so changes are not committed!
   *
   * **Behavior & Side Effects:**
   * - **Builder Progression:** `TransformBuilder -> Builder<Array<Record<string, unknown>>, ThrowOnError> | Builder<string, ThrowOnError>`. Terminal format modifier—place at the end of your filter/transform chain.
   * - **Do NOT chain `.overrideTypes()` or `.returns()` after `.explain()`:** Because `explain()` returns a union of array and `string` builders, any array or non-array type override fails compile-time cardinality checking on the opposite union branch. `await` `.explain(...)` directly and narrow `res.data` at runtime with `typeof res.data === 'string'` (`'text'` format) or `Array.isArray(res.data)` (`'json'` format).
   *
   * @param options - Optional PostgreSQL `EXPLAIN` flags (`analyze`, `verbose`, `settings`, `buffers`, `wal`) and output `format` (`'text'` default, or `'json'`). See {@link TransformExplainOptions}.
   * @returns A {@link Builder} union resolving `data` to plan text (`string`) or JSON plan nodes (`Array<Record<string, unknown>>`).
   *
   * @example
   * **Inspect the `EXPLAIN ANALYZE` plan for a filtered event query**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .eq('status', 'published')
   *   .explain({ analyze: true, buffers: true, format: 'text' });
   *
   * if (res.success && typeof res.data === 'string') {
   *   console.log(res.data);
   * }
   * ```
   *
   * @see {@link TransformExplainOptions} and {@link TransformExplainFormat}.
   * @see {@link TransformBuilder.rollback} for dry-running write statements safely.
   * @public
   */
  explain(
    options?: Readonly<TransformExplainOptions> | undefined
  ):
    | Builder<Array<Record<string, unknown>>, ThrowOnError>
    | Builder<string, ThrowOnError>;

  /**
   * Executes the request inside a server-side PostgreSQL transaction that is **rolled back** instead of committed (`Prefer: tx=rollback`).
   *
   * @remarks
   * **When to use:** Dry-running `insert()`, `upsert()`, `update()`, `delete()`, or `rpc()` calls to validate constraints, triggers, Row-Level Security policies, and `RETURNING` payloads (`.select()`) without persisting any database changes.
   *
   * **Preconditions:** PostgREST server configuration must permit transaction rollback preferences (`db-tx-end` set to `commit-allow-override` or `rollback-allow-override`); otherwise `Prefer: tx=rollback` is ignored by PostgREST!
   *
   * **Behavior & Side Effects:** Appends `Prefer: tx=rollback` to this single HTTP request in place and returns `this`. Does not span multiple SDK calls (use a PostgreSQL function via {@link FirebaseSql.rpc} for multi-statement transactions).
   *
   * @returns This builder for continued chaining.
   *
   * @example
   * **Dry-run an event `insert()` to preview generated columns without saving**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .insert({
   *     code: 'DRY-RUN-2026',
   *     title: 'Dry Run Session',
   *     schedule: '[2026-10-15T14:00:00Z,2026-10-15T15:00:00Z)'
   *   })
   *   .select('id, code, status, created_at')
   *   .rollback()
   *   .single();
   * ```
   * @public
   */
  rollback(): this;

  /**
   * Replaces the static TypeScript type of `result.data` while keeping {@link TransformBuilder} methods available.
   *
   * @remarks
   * Prefer {@link Builder.overrideTypes | .overrideTypes()} with `{ merge: false }` at the end of the builder chain instead of `returns()`.
   * Enforces array-vs-object cardinality compatibility via {@link CheckMatchingArrayTypes}. Note that calling `returns()` on a {@link FilterBuilder} narrows the static type to {@link TransformBuilder} (filter methods are no longer exposed after `returns()`).
   *
   * @deprecated Use {@link Builder.overrideTypes | .overrideTypes()} with `{ merge: false }` at the end of your call chain instead.
   * @typeParam NewResult - Replacement TypeScript type matching the current array/object cardinality of `Result$1`.
   * @returns This {@link TransformBuilder} with `Result$1` replaced by `CheckMatchingArrayTypes<Result$1, NewResult>`.
   *
   * @example
   * **Legacy type override on a `TransformBuilder` (prefer `.overrideTypes()` instead)**
   * ```ts
   * const res = await sql
   *   .from('venues')
   *   .select('id, slug, name')
   *   .returns<Array<{ id: string; slug: string; name: string }>>();
   * ```
   *
   * @see {@link Builder.overrideTypes} for the recommended replacement.
   * @public
   */
  returns<NewResult>(): TransformBuilder<
    CheckMatchingArrayTypes<Result$1, NewResult>,
    Method,
    ThrowOnError
  >;

  /**
   * Enforces a server-side safety ceiling (`Prefer: handling=strict, max-affected=<rows>`) so PostgREST
   * rolls back the transaction if an `update`, `delete`, or `rpc` operation affects more than `rows` rows.
   *
   * @remarks
   * **When to use:** Protecting `update()` and `delete()` operations from overly broad or buggy
   * filter predicates (for example, `.maxAffected(1)` when updating a single record by business key).
   *
   * **Do NOT use:** `select()`, `insert()`, or `upsert()`—restricted at compile time to `Method`
   * `'PATCH' | 'DELETE' | 'RPC'` (calling on `GET` or `POST` yields {@link InvalidMethodError}).
   *
   * **Behavior & Side Effects:** Appends `Prefer: handling=strict, max-affected=<rows>` in place
   * without network I/O and returns `this`.
   *
   * **Error Handling & Remediation:**
   * - If the affected row count exceeds `rows`, PostgREST aborts the transaction (persisting zero
   *   changes) and returns HTTP `400` (`category: 'sql-postgrest'`, `code: 'PGRST124'`). Narrow the
   *   {@link FilterBuilder} predicates or raise `rows` if the batch size is expected.
   *
   * @param rows - Maximum number of rows permitted to be modified or deleted (`>= 0`).
   * @returns This builder when `Method` is `'PATCH' | 'DELETE' | 'RPC'`, otherwise compile-time {@link InvalidMethodError}.
   *
   * @example
   * **Ensure an `update()` modifies at most 1 row**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .update({ status: 'cancelled' })
   *   .eq('code', 'FIREBASE-SUMMIT-2026')
   *   .maxAffected(1);
   * ```
   * @public
   */
  maxAffected(
    rows: number
  ): Method extends 'PATCH' | 'DELETE' | 'RPC'
    ? this
    : InvalidMethodError<'maxAffected method only available on update or delete'>;
}
