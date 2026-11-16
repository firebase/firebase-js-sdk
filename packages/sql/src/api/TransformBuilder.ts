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
 * Type-level marker only. At runtime the method still mutates and returns the underlying builder,
 * so a bare `await` expression compiles without error in TypeScript and sends the HTTP request;
 * TypeScript reports an error only when the returned value is used or assigned as a {@link Builder}
 * (for example, chaining further methods or reading `.data`).
 *
 * @typeParam S - Human-readable diagnostic string literal explaining why the method is unavailable.
 *
 * @example
 * Observe compile-time `InvalidMethodError` on an unsupported `select()` chain:
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
 * Sort an embedded `registrations` array newest-first with `NULL` check-ins placed last:
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
   * Sorts values in ascending (`true`) or descending (`false`) order. Defaults to `true`.
   */
  ascending?: boolean | undefined;

  /**
   * Places `NULL` values before non-null values (`true` emits `.nullsfirst`) or after (`false` emits `.nullslast`).
   *
   * @remarks
   * Defaults to `undefined` (PostgreSQL applies its default null ordering: `NULLS LAST` for `ASC`,
   * `NULLS FIRST` for `DESC`).
   */
  nullsFirst?: boolean | undefined;

  /**
   * Legacy alias for {@link TransformOrderOptions.referencedTable}. Prefer `referencedTable` for new code. Defaults to `undefined`.
   */
  foreignTable?: string | undefined;

  /**
   * Embedded relation name (or alias) whose nested array elements should be sorted instead of the parent table (`?<referencedTable>.order=...`).
   *
   * @remarks
   * Defaults to `undefined`. Takes precedence over `foreignTable` when both are provided. Does not
   * change parent-row order (to sort parent rows by a many-to-one relation column, pass
   * `'venues(name)'` as `column` with `referencedTable` omitted, or `'venue(name)'` if aliased via
   * `'venue:venues(name)'`).
   */
  referencedTable?: string | undefined;
}

/**
 * Embedded-table targeting options for {@link TransformBuilder.limit}.
 *
 * @example
 * Cap nested `registrations` to 5 items per parent event:
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
   * Legacy alias for {@link TransformLimitOptions.referencedTable}. Prefer `referencedTable` for new code. Defaults to `undefined`.
   */
  foreignTable?: string | undefined;

  /**
   * Embedded child relation name (or alias) whose nested array length should be capped per parent row (`?<referencedTable>.limit=...`). Defaults to `undefined`.
   */
  referencedTable?: string | undefined;
}

/**
 * Embedded-table targeting options for {@link TransformBuilder.range}.
 *
 * @example
 * Paginate nested `registrations` to indices `0..9` per parent event:
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
   * Legacy alias for {@link TransformRangeOptions.referencedTable}. Prefer `referencedTable` for new code. Defaults to `undefined`.
   */
  foreignTable?: string | undefined;

  /**
   * Embedded child relation name (or alias) to paginate per parent row (`?<referencedTable>.offset=...&<referencedTable>.limit=...`). Defaults to `undefined`.
   */
  referencedTable?: string | undefined;
}

/**
 * Output serialization format for PostgreSQL `EXPLAIN` plans requested via {@link TransformBuilder.explain}.
 *
 * @remarks
 * `'text'` returns PostgreSQL's human-readable indented plan text as a `string`. `'json'` returns
 * PostgreSQL's structured plan array as `Array<Record<string, unknown>>`.
 *
 * @example
 * Select JSON output format for programmatic query-plan inspection:
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
 * Configure `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` options:
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
   * Defaults to `false`. When chained onto a write query (`insert`, `update`, `upsert`, `delete`),
   * `analyze: true` executes the write on the server; chaining
   * {@link TransformBuilder.rollback | .rollback()} prevents committing only if the backend's
   * PostgREST `db-tx-end` setting permits transaction rollback overrides (otherwise `Prefer: tx=rollback`
   * is ignored and the write commits).
   */
  analyze?: boolean | undefined;

  /**
   * Includes output column lists, schema-qualified relation names, and query identifiers (`VERBOSE`). Defaults to `false`.
   */
  verbose?: boolean | undefined;

  /**
   * Includes non-default planner configuration parameters affecting the plan (`SETTINGS`). Defaults to `false`.
   */
  settings?: boolean | undefined;

  /**
   * Includes shared, local, and temp buffer hit and read counts (`BUFFERS`). Defaults to `false`. Typically paired with `analyze: true`.
   */
  buffers?: boolean | undefined;

  /**
   * Includes Write-Ahead Log record generation statistics (`WAL`). Defaults to `false`. Requires `analyze: true`; PostgreSQL rejects `EXPLAIN (WAL)` without `ANALYZE`.
   */
  wal?: boolean | undefined;

  /**
   * Serialization format of `result.data`: `'text'` (`string`) or `'json'` (`Array<Record<string, unknown>>`). Defaults to `'text'`.
   */
  format?: TransformExplainFormat | undefined;
}

/**
 * Lazy PostgREST result-shaping builder supporting post-mutation projection (`select`), ordering,
 * pagination (`limit`, `range`), server preferences (`maxAffected`, `rollback`), client fetch
 * cancellation (`abortSignal`), and cardinality/format narrowing (`single`, `maybeSingle`, `csv`,
 * `geojson`, `explain`).
 *
 * @remarks
 * Builder progression: base interface of {@link FilterBuilder} and subtype of {@link Builder}.
 * Calling `.single()`, `.maybeSingle()`, `.csv()`, `.geojson()`, or `.explain()` narrows the static
 * return type to {@link Builder}—always apply filters (`eq`, `in`), `order()`, `limit()`, `range()`,
 * and `maxAffected()` before those terminal format modifiers.
 *
 * Note that `limit()` and `range()` both set the `limit` URL parameter on the target table (or
 * `referencedTable`), so chaining both overwrites the previous `limit` (last call wins for
 * `limit`), whereas `range()` also sets `offset` and a subsequent `limit()` does not clear it (for
 * example, `.range(20, 39).limit(5)` sends `offset=20&limit=5`).
 *
 * @typeParam Result$1 - Expected resolved `data` payload type prior to cardinality/format narrowing.
 * @typeParam Method - HTTP/RPC operation discriminator (`'GET'`, `'POST'`, `'PATCH'`, `'DELETE'`, `'RPC'`).
 * @typeParam ThrowOnError - `true` after `throwOnError()` is called; `false` by default.
 *
 * @example
 * Order, paginate, and apply an `AbortSignal` timeout on a `TransformBuilder`:
 * ```ts
 * const res = await sql
 *   .from('venues')
 *   .select('id, slug, name, capacity')
 *   .order('capacity', { ascending: false })
 *   .range(0, 9)
 *   .abortSignal(AbortSignal.timeout(5000))
 *   .returns<Array<{ id: string; slug: string; name: string; capacity: number }>>();
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
   * on failure while preserving {@link TransformBuilder} chaining. See {@link Builder.throwOnError}.
   *
   * @returns This {@link TransformBuilder} narrowed to `ThrowOnError = true`.
   *
   * @example
   * Enable throwing mode before `.single()` on a `TransformBuilder`:
   * ```ts
   * const { data } = await sql
   *   .from('venues')
   *   .select('id, name')
   *   .eq('slug', 'moscone-west')
   *   .throwOnError()
   *   .single()
   *   .returns<{ id: string; name: string }>();
   * ```
   *
   * @public
   */
  throwOnError(): TransformBuilder<Result$1, Method, true>;

  /**
   * Requests that PostgREST return the affected row representation (`Prefer: return=representation`)
   * projected to `columns` after `insert`, `upsert`, `update`, `delete`, or set-returning `rpc`.
   *
   * @remarks
   * When to use: chaining onto {@link QueryBuilder.insert}, {@link QueryBuilder.upsert},
   * {@link QueryBuilder.update}, or {@link QueryBuilder.delete} when you need database-generated
   * columns (`id`, `created_at`) or post-update values in `result.data` (which otherwise resolves
   * to `null`), or projecting specific columns from a table-returning {@link FirebaseSql.rpc} call.
   * For read-only table queries, start with {@link QueryBuilder.select}.
   *
   * Preconditions: under PostgreSQL Row-Level Security (RLS), returning mutated rows requires a
   * `SELECT` policy permitting visibility of the affected rows in addition to the mutation policy.
   *
   * Behavior and side effects: transitions `Result$1` from `null` to
   * `Array<Record<string, unknown>>` (for table mutations) and returns a {@link FilterBuilder},
   * enabling subsequent `.order()`, `.single()`, `.maybeSingle()`, `.returns()`, and
   * `.overrideTypes()`. Appends `Prefer: return=representation` and sets `?select=<columns>`
   * (stripping unquoted whitespace).
   *
   * @param columns - Comma-separated column projection (defaults to `'*'`). Supports aliases and embedded foreign-key relations.
   * @returns This builder typed as {@link FilterBuilder} with array row representation.
   *
   * @example
   * Return database-generated columns from an `insert()`:
   * ```ts
   * const res = await sql
   *   .from('venues')
   *   .insert({ slug: 'paramount-sea', name: 'Paramount Theatre', city: 'Seattle', capacity: 2800 })
   *   .select('id, slug, name')
   *   .single()
   *   .returns<{ id: string; slug: string; name: string }>();
   *
   * if (!res.success) {
   *   console.error('Insert failed:', res.error.message);
   * }
   * ```
   *
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
   * When to use: deterministic sorting of query or mutation results—especially before
   * {@link TransformBuilder.limit} or {@link TransformBuilder.range} pagination. Chain multiple
   * `.order()` calls to sort by primary, secondary, and tertiary columns in call order. For `jsonb`
   * properties, use single-arrow `'metadata->level'` for numeric or typed JSON sorting and
   * double-arrow `'metadata->>track'` for lexicographical text sorting.
   *
   * Behavior and side effects: mutates this builder's URL query parameters in place without network
   * I/O and returns `this`.
   *
   * @param column - PostgreSQL column name, JSON path (`metadata->level` or `metadata->>track`), or `foreign_alias(column)` to sort parent rows by a many-to-one relation.
   * @param options - Sort direction (`ascending`, defaults to `true`), null placement (`nullsFirst`), and embedded `referencedTable` target. See {@link TransformOrderOptions}.
   * @returns This builder for continued chaining.
   *
   * @example
   * Sort events by price ascending, breaking ties by newest `created_at`:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, ticket_price, created_at')
   *   .order('ticket_price', { ascending: true })
   *   .order('created_at', { ascending: false });
   * ```
   *
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
   * When to use: fetching the top `N` rows (combine with {@link TransformBuilder.order}) or capping
   * nested child arrays on each parent row via `options.referencedTable`.
   *
   * Do not use for offset-based pagination across pages; use {@link TransformBuilder.range} instead
   * (note that `limit()` and `range()` overwrite each other's `limit` URL parameter, whereas
   * `limit()` does not clear an `offset` set by an earlier `range()`).
   *
   * Behavior and side effects: sends `limit=<rows>` verbatim without client-side validation,
   * mutating URL query parameters in place without network I/O, and returns `this`.
   *
   * @param rows - Non-negative maximum row count to return (not validated client-side).
   * @param options - Optional `referencedTable` to cap an embedded relation instead of parent rows. See {@link TransformLimitOptions}.
   * @returns This builder for continued chaining.
   *
   * @example
   * Fetch the 5 highest-capacity venues:
   * ```ts
   * const res = await sql
   *   .from('venues')
   *   .select('id, name, city, capacity')
   *   .order('capacity', { ascending: false })
   *   .limit(5);
   * ```
   *
   * @public
   */
  limit(
    rows: number,
    options?: Readonly<TransformLimitOptions> | undefined
  ): this;

  /**
   * Slices the result set to the 0-based inclusive index window `[from, to]` (`?offset=<from>&limit=<to - from + 1>`).
   *
   * @remarks
   * When to use: page-based pagination (for example, page 1 of 20 items is `.range(0, 19)`, page 2
   * is `.range(20, 39)`). Always pair with a deterministic {@link TransformBuilder.order} clause
   * (such as ordering by a unique `id` tie-breaker) so rows cannot shift across pages. For simple
   * top-N queries without an offset, use {@link TransformBuilder.limit}.
   *
   * Behavior and side effects: both `from` and `to` are inclusive (`range(0, 9)` returns up to `10`
   * rows). The SDK sends `offset=<from>` and `limit=<to - from + 1>` verbatim without client-side
   * validation (overwriting any earlier `.limit()` on the same target table; conversely, calling
   * `.limit()` after `.range()` overwrites `limit` while leaving `offset=<from>` in place).
   *
   * Error handling: if PostgREST rejects the requested range (for example, an offset beyond total
   * matching rows when `count` is requested, or a negative `limit` when `to < from - 1`), it
   * returns HTTP `416`, resolving to {@link OperationFailure} with `res.status === 416`,
   * `res.error.category === 'sql-postgrest'`, and `res.error.code === 'PGRST103'`. Stop paginating
   * once `from >= count` (or treat `'PGRST103'` as an empty page).
   *
   * @param from - 0-based starting row index, inclusive (`>= 0`, not validated client-side).
   * @param to - 0-based ending row index, inclusive (`>= from`, not validated client-side).
   * @param options - Optional `referencedTable` to paginate an embedded child array per parent row. See {@link TransformRangeOptions}.
   * @returns This builder for continued chaining.
   *
   * @example
   * Fetch page 2 (rows 20..39) of published events:
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
   * @public
   */
  range(
    from: number,
    to: number,
    options?: Readonly<TransformRangeOptions> | undefined
  ): this;

  /**
   * Attaches an `AbortSignal` to cancel the client-side HTTP `fetch` request (and any pending retries) when aborted.
   *
   * @remarks
   * When to use: enforcing per-query client deadlines (`AbortSignal.timeout(ms)`) or cancelling
   * in-flight read queries when a UI component unmounts or user search input changes.
   *
   * Behavior and side effects: composes `signal` with the client's internal {@link terminate}
   * signal. When `signal` aborts before completion, awaiting the builder resolves to
   * {@link OperationFailure} with `res.status === 0`, `res.error.category === 'sql-client'`, and
   * `res.error.code === 'other'` (or rejects with {@link FirebaseSqlError} where
   * `err.status === undefined` when {@link Builder.throwOnError} is enabled; note that calling
   * {@link terminate} mid-request yields `code === 'not-initialized'` instead of `'other'`).
   *
   * Write-safety and reuse caveat: aborting cancels only the client-side `fetch`—a mutation that
   * has already reached the server may still commit, and the resulting `code: 'other'` failure is
   * indistinguishable from a pre-flight network drop, so do not blindly retry aborted writes. The
   * `signal` stays attached to this mutable builder instance (after it aborts, every later `await`
   * fails immediately); create a fresh signal and builder per execution.
   *
   * @param signal - Standard `AbortSignal` (for example, from `new AbortController().signal` or `AbortSignal.timeout(5000)`).
   * @returns This builder for continued chaining.
   *
   * @example
   * Enforce a 3-second client timeout on a read query:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title')
   *   .abortSignal(AbortSignal.timeout(3000));
   * ```
   *
   * @public
   */
  abortSignal(signal: AbortSignal): this;

  /**
   * Unwraps a 1-row array result into a single JSON object (`Accept: application/vnd.pgrst.object+json`)
   * and fails on the server if the query matches `0` rows or more than `1` row.
   *
   * @remarks
   * When to use: primary-key or unique-key lookups (`eq('id', id)`) or single-row
   * `insert(...).select()` / `update(...).select()` chains where anything other than 1 row must
   * roll back and fail on the server.
   *
   * Do not use on optional read lookups that may legitimately match `0` rows—use
   * {@link TransformBuilder.maybeSingle} instead so `0` rows resolves to `data: null` rather than
   * HTTP `406` `'PGRST116'`.
   *
   * Behavior and side effects: builder progression is
   * `TransformBuilder<R[]> -> Builder<R, ThrowOnError>`. Terminal cardinality modifier—apply all
   * filters, `.select()`, and `.order()` before `.single()`. Follow with `.returns<MyRow>()`
   * (passing a single object type `MyRow`, not `MyRow[]`) to assign a full row type, or
   * `.overrideTypes<PartialRow>()` to partially refine fields on an already-typed row.
   *
   * Error handling: `0` rows or more than `1` row resolves to {@link OperationFailure} with
   * `res.status === 406`, `res.error.category === 'sql-postgrest'`, and
   * `res.error.code === 'PGRST116'`. Switch to {@link TransformBuilder.maybeSingle} on reads if `0`
   * rows is expected, or add a unique-key filter if multiple rows matched (do not add `.limit(1)`
   * if duplicates should be detected as errors, because `.limit(1)` suppresses duplicate detection
   * and returns an arbitrary row).
   *
   * @typeParam ResultOne - Unwrapped single-row type inferred from `Result$1`.
   * @returns A {@link Builder} resolving `data` as a single object `ResultOne`.
   *
   * @example
   * Fetch a single venue by unique `slug`:
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
   *   .returns<VenueSummary>();
   * ```
   *
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
   * Unwraps a `0`-or-`1` row array result client-side into `ResultOne | null`, failing client-side if `2` or more rows are returned.
   *
   * @remarks
   * When to use: read-only `select()` lookups by unique key where `0` matching rows is a valid
   * outcome (`0` rows resolves to `success: true, data: null`; use {@link TransformBuilder.single}
   * when `0` rows should fail).
   *
   * Do not use to guard writes (`insert`, `upsert`, `update`, `delete`): `maybeSingle()` sets no
   * `Accept` header and no row `limit`, and runs its cardinality check client-side after the server
   * has already returned `2xx` and committed changes to every matched row. Use
   * {@link TransformBuilder.maxAffected | .maxAffected(1)} (for `update()` and `delete()` on
   * PostgREST v13+) or {@link TransformBuilder.single} to enforce single-row writes on the server.
   *
   * Behavior and side effects: builder progression is
   * `TransformBuilder<R[]> -> Builder<R | null, ThrowOnError>`. Terminal cardinality modifier—apply
   * all filters and `.select()` before `.maybeSingle()`. Follow with `.returns<MyRow>()` (pass
   * `MyRow` without `| null` or `[]`; `returns` automatically preserves `| null` on `result.data`).
   * Sends no `limit`, so all
   * matching rows are transferred and parsed before checking `data.length > 1`; chain `.limit(2)`
   * before `.maybeSingle()` on read queries to bound network transfer while still detecting
   * duplicates.
   *
   * Error handling: matching `2` or more rows triggers a client-side check after the server
   * responded `2xx`, resolving to {@link OperationFailure} with `res.status === 406`,
   * `res.error.category === 'sql-postgrest'`, and `res.error.code === 'PGRST116'`. Filter on a
   * `UNIQUE` column or add `.limit(2)` to bound transfer while keeping duplicate detection (adding
   * `.limit(1)` disables duplicate detection and returns an arbitrary row).
   *
   * @typeParam ResultOne - Unwrapped single-row type inferred from `Result$1`.
   * @returns A {@link Builder} resolving `data` as `ResultOne | null`.
   *
   * @example
   * Look up an optional registration by composite unique key (`ResultOne | null`):
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
   *   .limit(2)
   *   .maybeSingle()
   *   .returns<RegistrationCheck>();
   *
   * if (res.success && res.data !== null) {
   *   console.log('Found registration:', res.data.id);
   * }
   * ```
   *
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
   * When to use: exporting `select()` results (or write results when `.select(...)` is chained
   * before `.csv()`) directly as Comma-Separated Values text.
   *
   * Do not use with {@link Builder.stripNulls | .stripNulls()}—calling `.csv().stripNulls()` throws
   * a synchronous `Error('stripNulls() cannot be used with csv()')`.
   *
   * Behavior and side effects: builder progression is
   * `TransformBuilder -> Builder<string, ThrowOnError>`. Terminal format modifier—chain all
   * filters, `order()`, `limit()`, and (for writes) `.select(...)` before `.csv()`. On writes
   * without `.select(...)` before `.csv()`, PostgREST returns an empty body and `res.data` resolves
   * to `null` at runtime despite the `string` type.
   *
   * @returns A {@link Builder} whose `data` resolves to a `string` containing the CSV document (or `null` at runtime if the response body is empty).
   *
   * @example
   * Export attendee registrations for an event as CSV:
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
   *
   * @public
   */
  csv(): Builder<string, ThrowOnError>;

  /**
   * Requests the response payload formatted as a GeoJSON `FeatureCollection` object (`Accept: application/geo+json`).
   *
   * @remarks
   * Preconditions: requires PostGIS on the PostgreSQL database and at least one `geometry` or
   * `geography` column (such as `venues.coords`) in the selected output columns; otherwise
   * PostgREST returns an error.
   *
   * Behavior and side effects: builder progression is
   * `TransformBuilder -> Builder<Record<string, unknown>, ThrowOnError>`. Terminal format
   * modifier—apply all filters, `order()`, `limit()`, and (for writes) `.select(...)` before
   * `.geojson()` (writes without `.select(...)` return an empty body where `res.data` is `null` at
   * runtime). Follow with `.returns<MyFeatureCollection>()` if you have a
   * typed GeoJSON interface.
   *
   * @returns A {@link Builder} resolving `data` to a GeoJSON `Record<string, unknown>` object (or `null` at runtime if the response body is empty).
   *
   * @example
   * Fetch San Francisco venues as a GeoJSON `FeatureCollection`:
   * ```ts
   * const res = await sql
   *   .from('venues')
   *   .select('id, slug, name, capacity, coords')
   *   .eq('city', 'San Francisco')
   *   .geojson();
   * ```
   *
   * @public
   */
  geojson(): Builder<Record<string, unknown>, ThrowOnError>;

  /**
   * Requests the PostgreSQL `EXPLAIN` execution plan for this query instead of row data (`Accept: application/vnd.pgrst.plan+<format>; ...`).
   *
   * @remarks
   * Preconditions: PostgREST's `db-plan-enabled` server configuration must be enabled; otherwise
   * the server rejects the `application/vnd.pgrst.plan+*` media type with HTTP `406`. Passing
   * `{ analyze: true }` executes the underlying SQL statement—chaining
   * {@link TransformBuilder.rollback | .rollback()} before `.explain({ analyze: true })` rolls back
   * `insert`, `upsert`, `update`, or `delete` statements only if the backend's PostgREST
   * `db-tx-end` configuration permits `Prefer: tx=rollback` overrides (otherwise the write commits).
   *
   * Behavior and side effects: builder progression is
   * `TransformBuilder -> Builder<Array<Record<string, unknown>>, ThrowOnError> | Builder<string, ThrowOnError>`.
   * Terminal format modifier—place at the end of your filter/transform chain. Do not chain
   * `.overrideTypes()` or `.returns()` after `.explain()`: because `explain()` returns a union of
   * array and `string` builders, any array or non-array type override fails compile-time
   * cardinality checking on the opposite union branch. `await` `.explain(...)` directly and narrow
   * `res.data` at runtime with `typeof res.data === 'string'` (`'text'` format) or
   * `Array.isArray(res.data)` (`'json'` format).
   *
   * @param options - Optional PostgreSQL `EXPLAIN` flags (`analyze`, `verbose`, `settings`, `buffers`, `wal`, all defaulting to `false`) and output `format` (defaults to `'text'`, or `'json'`). See {@link TransformExplainOptions}.
   * @returns A {@link Builder} union resolving `data` to plan text (`string`) or JSON plan nodes (`Array<Record<string, unknown>>`).
   *
   * @example
   * Inspect the `EXPLAIN ANALYZE` plan for a filtered event query:
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
   * @public
   */
  explain(
    options?: Readonly<TransformExplainOptions> | undefined
  ):
    | Builder<Array<Record<string, unknown>>, ThrowOnError>
    | Builder<string, ThrowOnError>;

  /**
   * Requests (`Prefer: tx=rollback`) that PostgREST roll back this request's transaction instead of committing it.
   *
   * @remarks
   * Preconditions and commit warning: PostgREST honors `Prefer: tx=rollback` only when the backend
   * server is configured with `db-tx-end` set to `commit-allow-override`, `rollback-allow-override`,
   * or `rollback` (where every transaction rolls back unconditionally). On default PostgREST
   * configurations (`db-tx-end = commit`), `Prefer: tx=rollback` is silently ignored—even when
   * `Prefer: handling=strict` is also present (such as via {@link TransformBuilder.maxAffected},
   * because `handling=strict` only rejects unrecognized preference syntax)—so the mutation commits
   * permanently and the SDK still resolves `OperationSuccess` because `Preference-Applied` is not
   * inspected. Never run `.rollback()` against production data unless you have verified the backend
   * enforces `tx=rollback`.
   *
   * Behavior and side effects: appends `Prefer: tx=rollback` to this single HTTP request in place
   * and returns `this`. Does not span multiple SDK calls (use a PostgreSQL function via
   * {@link FirebaseSql.rpc} for multi-statement transactions).
   *
   * @returns This builder for continued chaining.
   *
   * @example
   * Request a rolled-back insert preview (only when the server permits `Prefer: tx=rollback`):
   * ```ts
   * // WARNING: If the server's db-tx-end is set to commit (the default), PostgREST ignores
   * // Prefer: tx=rollback and this INSERT COMMITS while returning success: true.
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
   *
   * if (!res.success) {
   *   console.error('Preview failed:', res.error.message);
   * }
   * ```
   *
   * @public
   */
  rollback(): this;

  /**
   * Replaces the static TypeScript type of `result.data` with `NewResult` while keeping {@link TransformBuilder} methods available.
   *
   * @remarks
   * When to use: assigning a full static array (or RPC scalar/row) type to `result.data` on a
   * {@link FilterBuilder} or {@link TransformBuilder} chain without needing `{ merge: false }`.
   * Unlike {@link Builder.overrideTypes | .overrideTypes()}, `returns<NewResult>()` sheds the
   * untyped `Record<string, unknown>` base type directly with a single type parameter and preserves
   * `TransformBuilder` methods (`order`, `limit`, `range`, `single`, `maybeSingle`, `throwOnError`,
   * etc.). When you want to partially override or refine specific fields on an already-typed
   * builder while preserving all other properties, chain {@link Builder.overrideTypes} instead.
   *
   * Builder progression: calling `returns()` on a {@link FilterBuilder} narrows the static return
   * type to {@link TransformBuilder} (filter predicates such as `.eq()` and `.in()` are no longer
   * exposed after `returns()`, so apply row filters first). Calling `.single()` or `.maybeSingle()`
   * either before `returns<MyRow>()` (via {@link Builder.returns}) or after
   * `returns<MyRow[]>()` unwraps `MyRow` as expected.
   *
   * Match array cardinality: pass `MyRow[]` on list queries (or scalar/array type on untyped
   * `rpc()`); array-vs-object compatibility is enforced at compile time via
   * {@link CheckMatchingArrayTypes}.
   *
   * Behavior and side effects: compile-time type cast only; performs no network I/O or runtime
   * schema parsing, and preserves `Method` and `ThrowOnError`.
   *
   * @typeParam NewResult - Full replacement TypeScript type matching the current array/object cardinality of `Result$1`.
   * @returns This {@link TransformBuilder} with `Result$1` statically replaced by `CheckMatchingArrayTypes<Result$1, NewResult>`.
   *
   * @example
   * Assign a full `Venue[]` array type on a filtered list query:
   * ```ts
   * interface Venue {
   *   id: string;
   *   slug: string;
   *   name: string;
   *   city: string;
   *   capacity: number;
   * }
   *
   * const res = await sql
   *   .from('venues')
   *   .select('id, slug, name, city, capacity')
   *   .eq('city', 'Seattle')
   *   .order('capacity', { ascending: false })
   *   .returns<Venue[]>();
   *
   * if (res.success) {
   *   const venues: Venue[] = res.data;
   * }
   * ```
   *
   * @public
   */
  returns<NewResult>(): TransformBuilder<
    CheckMatchingArrayTypes<Result$1, NewResult>,
    Method,
    ThrowOnError
  >;

  /**
   * Appends `Prefer: handling=strict` and `Prefer: max-affected=<rows>` to request that PostgREST
   * roll back the transaction if the operation affects more than `rows` rows.
   *
   * @remarks
   * Preconditions: requires a PostgREST v13+ backend (PostgREST v12 servers supporting
   * `handling=strict` reject the unrecognized `max-affected` preference with HTTP `400` `PGRST122`,
   * whereas pre-v12 servers ignore both headers without enforcing the row cap), and upstream
   * PostgREST documents enforcement for `PATCH` (`update`) and `DELETE` (`delete`) methods.
   *
   * When to use: protecting `update()` and `delete()` operations on PostgREST v13+ from overly
   * broad filter predicates (for example, `.maxAffected(1)` when updating a single record).
   *
   * Do not use on `select()`, `insert()`, or `upsert()`: when `Method` is not
   * `'PATCH' | 'DELETE' | 'RPC'`, the return type is {@link InvalidMethodError}. Note that
   * `InvalidMethodError` is a type-level marker only—at runtime the builder is still returned, so a
   * bare `await` compiles and sends the request unless the return value is used as a builder.
   *
   * Behavior and side effects: appends `Prefer: handling=strict` and `Prefer: max-affected=<rows>`
   * verbatim without client-side validation or network I/O, and returns `this`.
   *
   * Error handling: when enforced by a PostgREST v13+ server and the affected row count exceeds
   * `rows`, PostgREST aborts the transaction and returns HTTP `400`, resolving to
   * {@link OperationFailure} with `res.status === 400`, `res.error.category === 'sql-postgrest'`,
   * and `res.error.code === 'PGRST124'`. Narrow the {@link FilterBuilder} predicates or raise `rows`
   * if the batch size is expected.
   *
   * @param rows - Maximum number of rows permitted to be modified or deleted (`>= 0`, not validated client-side).
   * @returns This builder when `Method` is `'PATCH' | 'DELETE' | 'RPC'`, otherwise compile-time {@link InvalidMethodError}.
   *
   * @example
   * Cap an `update()` to at most 1 row on PostgREST v13+:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .update({ status: 'cancelled' })
   *   .eq('code', 'FIREBASE-SUMMIT-2026')
   *   .maxAffected(1);
   *
   * if (!res.success) {
   *   console.error('Update failed:', res.error.code, res.error.message);
   * }
   * ```
   *
   * @public
   */
  maxAffected(
    rows: number
  ): Method extends 'PATCH' | 'DELETE' | 'RPC'
    ? this
    : InvalidMethodError<'maxAffected method only available on update or delete'>;
}
