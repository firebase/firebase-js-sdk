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

/**
 * PostgreSQL `tsquery` parser mode used by {@link FilterBuilder.textSearch}.
 *
 * @remarks
 * - `'plain'`: Uses `plainto_tsquery` (`plfts`), normalizing unquoted words and joining terms with `&` (`AND`).
 * - `'phrase'`: Uses `phraseto_tsquery` (`phfts`), matching normalized terms in adjacent `<->` phrase order.
 * - `'websearch'`: Uses `websearch_to_tsquery` (`wfts`), supporting `"quoted phrases"`, `or`, and `-negation` without ever raising syntax errors on raw user input.
 *
 * When omitted in {@link FilterTextSearchOptions}, PostgREST uses raw `to_tsquery` (`fts`), which requires valid `tsquery` syntax.
 *
 * @example
 * **Select `'websearch'` mode for raw user search input**
 * ```ts
 * import type { FilterTextSearchType } from 'firebase/sql';
 *
 * const mode: FilterTextSearchType = 'websearch';
 * const res = await sql
 *   .from('events')
 *   .select('id, title')
 *   .textSearch('search_doc', '"cloud sql" or postgres -cancelled', {
 *     type: mode,
 *     config: 'english'
 *   });
 * ```
 *
 * @public
 */
export type FilterTextSearchType = 'plain' | 'phrase' | 'websearch';

/**
 * Full-text search configuration and parser options for {@link FilterBuilder.textSearch}.
 *
 * @example
 * **Configure English stemming with `'websearch'` query parsing**
 * ```ts
 * import type { FilterTextSearchOptions } from 'firebase/sql';
 *
 * const searchOpts: FilterTextSearchOptions = {
 *   config: 'english',
 *   type: 'websearch'
 * };
 * const res = await sql
 *   .from('events')
 *   .select('id, code, title')
 *   .textSearch('search_doc', 'serverless Keynote', searchOpts);
 * ```
 *
 * @public
 */
export interface FilterTextSearchOptions {
  /**
   * PostgreSQL text search configuration name (such as `'english'`, `'simple'`, or `'spanish'`) sent as `fts(<config>).<query>`.
   *
   * @remarks
   * When omitted, PostgreSQL uses the server's `default_text_search_config` setting.
   *
   * @defaultValue `undefined`
   */
  config?: string | undefined;

  /**
   * Query parser mode (`'plain'`, `'phrase'`, or `'websearch'`).
   *
   * @remarks
   * When omitted, PostgREST applies `to_tsquery` (`fts`), which requires explicit boolean operators (such as `'firebase' & 'sql'`) and rejects malformed user strings.
   *
   * @defaultValue `undefined`
   */
  type?: FilterTextSearchType | undefined;
}

/**
 * Embedded-relation targeting options for {@link FilterBuilder.or}.
 *
 * @example
 * **Scope an `OR` filter to an embedded `registrations` relation**
 * ```ts
 * import type { FilterOrOptions } from 'firebase/sql';
 *
 * const orOpts: FilterOrOptions = { referencedTable: 'registrations' };
 * const res = await sql
 *   .from('events')
 *   .select('id, title, registrations!inner(attendee_email, role)')
 *   .or('role.eq.speaker,role.eq.organizer', orOpts);
 * ```
 *
 * @public
 */
export interface FilterOrOptions {
  /**
   * Legacy alias for {@link FilterOrOptions.referencedTable}. Prefer `referencedTable`.
   *
   * @deprecated Use {@link FilterOrOptions.referencedTable} instead.
   * @defaultValue `undefined`
   */
  foreignTable?: string | undefined;

  /**
   * Embedded relation name (or alias) to apply the `OR` disjunction against (`?<referencedTable>.or=(...)`) instead of the parent table.
   *
   * @remarks
   * Takes precedence over `foreignTable` when both are provided. Filters rows inside the embedded relation's array; combine with `!inner` in `select()` if unmatched parent rows should also be excluded.
   *
   * @defaultValue `undefined`
   */
  referencedTable?: string | undefined;
}

/**
 * Raw PostgREST filter operator tokens accepted by {@link FilterBuilder.(not:2) | FilterBuilder.not} and {@link FilterBuilder.filter}.
 *
 * @remarks
 * Maps to PostgREST URL filter prefixes:
 * - Comparison: `'eq'` (`=`), `'neq'` (`<>`), `'gt'` (`>`), `'gte'` (`>=`), `'lt'` (`<`), `'lte'` (`<=`), `'is'` (`IS`), `'isdistinct'` (`IS DISTINCT FROM`), `'in'` (`IN`).
 * - Pattern & regex: `'like'` (`LIKE`), `'ilike'` (`ILIKE`), `'match'` (`~`), `'imatch'` (`~*`).
 * - Array, `jsonb`, & range: `'cs'` (`@>`), `'cd'` (`<@`), `'ov'` (`&&`), `'sl'` (`<<`), `'sr'` (`>>`), `'nxl'` (`&>`), `'nxr'` (`&<`), `'adj'` (`-|-`).
 * - Full-text search: `'fts'` (`to_tsquery`), `'plfts'` (`plainto_tsquery`), `'phfts'` (`phraseto_tsquery`), `'wfts'` (`websearch_to_tsquery`).
 *
 * @example
 * **Use a typed PostgREST operator token with `.filter()`**
 * ```ts
 * import type { FilterOperator } from 'firebase/sql';
 *
 * const op: FilterOperator = 'cs';
 * const res = await sql
 *   .from('events')
 *   .select('id, title, tags')
 *   .filter('tags', op, '{keynote}');
 * ```
 *
 * @public
 */
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

/**
 * Type-level helper that narrows property `Col` on an object `T` (or each element of an array `T`)
 * to `NonNullable<T[Col]>` when {@link FilterBuilder.(not:1) | .not(column, 'is', null)} is chained.
 *
 * @remarks
 * Leaves `T` unchanged when `Col` is not a known literal property key of `T` (which is the case on
 * default untyped chains where `T` starts as `Array<Record<string, unknown>>`; reflect non-nullability
 * directly in your terminal `.overrideTypes<Row[], { merge: false }>()` interface instead).
 *
 * @typeParam T - Row object or array of row objects carried by {@link FilterBuilder}.
 * @typeParam Col - Literal property name confirmed non-null by `IS NOT NULL`.
 *
 * @example
 * **Narrow a nullable `venue_id` property to `string` across an array of rows**
 * ```ts
 * import type { NarrowResultColumn } from 'firebase/sql';
 *
 * interface EventItem {
 *   id: string;
 *   venue_id: string | null;
 * }
 *
 * type InPersonEventItems = NarrowResultColumn<EventItem[], 'venue_id'>;
 * // Array<{ id: string; venue_id: string }>
 * ```
 *
 * @public
 */
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

/**
 * Lazy PostgREST filter builder returned by {@link QueryBuilder} verbs, {@link FirebaseSql.rpc},
 * and {@link TransformBuilder.select}.
 *
 * @remarks
 * **Builder Progression:** Extends {@link TransformBuilder} (and {@link Builder} / `PromiseLike`).
 * Chaining multiple filter methods combines predicates with logical `AND` in the outgoing URL query
 * string (use {@link FilterBuilder.or | .or()} for logical `OR`).
 *
 * **Value Serialization Guardrails (`Date` & `undefined`):**
 * - **Timestamps (`Date`):** Never pass a raw `Date` object to filter methods—URL parameter string
 *   interpolation calls `Date.prototype.toString()` (locale string), which PostgreSQL rejects with
 *   SQLSTATE `'22007'`. Always pass ISO-8601 strings via `date.toISOString()`.
 * - **Optional Variables (`undefined`):** Methods typed with `value: unknown` (`neq`, `gt`, `gte`,
 *   `lt`, `lte`, `isDistinct`, `not`, `filter`) accept `undefined` at compile time and serialize the
 *   literal string `'undefined'` into the URL (`?col=gte.undefined`). Always guard optional filter
 *   inputs with `if (value !== undefined)` before chaining!
 *
 * **Mutability & Reuse:** Filter methods mutate the current `FilterBuilder` instance in place and
 * return `this`—do **not** branch two conflicting filter chains off the same `FilterBuilder`
 * variable (branch from {@link FirebaseSql.from | sql.from(table)} instead). Re-awaiting or
 * concurrently awaiting the *same* finalized `FilterBuilder` via `Promise.all` is safe and
 * execution-isolated.
 *
 * @typeParam T - Expected resolved `data` payload type.
 * @typeParam Method - HTTP/RPC operation discriminator (`'GET'`, `'POST'`, `'PATCH'`, `'DELETE'`, `'RPC'`).
 * @typeParam ThrowOnError - `true` after {@link FilterBuilder.throwOnError} is called; `false` by default.
 *
 * @example
 * **Compose multiple `AND` predicates on a `FilterBuilder` before ordering and typing**
 * ```ts
 * interface PublishedEvent {
 *   id: string;
 *   code: string;
 *   title: string;
 *   ticket_price: number;
 * }
 *
 * const res = await sql
 *   .from('events')
 *   .select('id, code, title, ticket_price')
 *   .eq('status', 'published')
 *   .lte('ticket_price', 150)
 *   .contains('tags', ['firebase'])
 *   .order('ticket_price', { ascending: true })
 *   .overrideTypes<PublishedEvent[], { merge: false }>();
 * ```
 *
 * @public
 */
export interface FilterBuilder<
  T,
  Method = unknown,
  ThrowOnError extends boolean = false
> extends TransformBuilder<T, Method, ThrowOnError> {
  /**
   * Switches this builder into throwing mode so awaiting it rejects with {@link FirebaseSqlError}
   * on failure instead of resolving to {@link OperationFailure}, while preserving {@link FilterBuilder} chaining.
   *
   * @returns This {@link FilterBuilder} narrowed to `ThrowOnError = true` (resolving to {@link OperationSuccess} when awaited).
   *
   * @example
   * **Enable throwing mode early in a filter chain**
   * ```ts
   * const { data } = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .throwOnError()
   *   .eq('status', 'published')
   *   .overrideTypes<Array<{ id: string; code: string; title: string }>, { merge: false }>();
   * ```
   *
   * @see {@link Builder.throwOnError} for full error-throwing semantics and `try / catch` handling.
   * @public
   */
  throwOnError(): FilterBuilder<T, Method, true>;

  /**
   * Filters rows where `column` equals `value` (`?column=eq.<value>`).
   *
   * @remarks
   * **When to use:** Exact equality matching on non-null strings, numbers, UUIDs, or booleans
   * (including dot-qualified embedded columns such as `'venues.city'`). For `jsonb` columns, use
   * double-arrow `->>` (`'metadata->>track'`) when comparing strings, and single-arrow `->`
   * (`'metadata->level'`) when comparing numbers or booleans (comparing a string against `->` fails
   * with PostgreSQL `'22P02'`).
   *
   * **Do NOT use:**
   * - Checking for SQL `NULL`—passing `null` is rejected by `NonNullable<unknown>`; use {@link FilterBuilder.is | .is(column, null)} instead.
   * - Passing raw `Date` instances—pass `date.toISOString()` instead.
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @param column - PostgreSQL column name, JSON path expression (`metadata->>key` or `metadata->numKey`), or `embedded_table.column` reference.
   * @param value - Non-null primitive value serialized into the `eq.` PostgREST filter parameter.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Filter published events on a specific column value**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .eq('status', 'published');
   * ```
   *
   * @see {@link FilterBuilder.is} for `NULL` and boolean identity checks.
   * @see {@link FilterBuilder.match} for matching multiple column equalities from an object.
   * @public
   */
  eq(column: string, value: NonNullable<unknown>): this;

  /**
   * Filters rows where `column` does not equal `value` (`?column=neq.<value>`, SQL `<>`).
   *
   * @remarks
   * **When to use:** Excluding a specific non-null scalar value on a column.
   *
   * **Do NOT use:**
   * - Expecting rows where `column IS NULL` to match—standard SQL `NULL <> value` evaluates to `UNKNOWN`, excluding `NULL` rows. Use {@link FilterBuilder.isDistinct} if `NULL` rows should be included as distinct from `value`.
   * - Testing `IS NOT NULL`; use {@link FilterBuilder.(not:1) | .not(column, 'is', null)} instead.
   * - Passing `undefined` or raw `Date` objects—guard optional values with `if (val !== undefined)` and convert dates via `date.toISOString()`.
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @param column - PostgreSQL column name, JSON path expression, or `embedded_table.column` reference.
   * @param value - Defined non-null value to exclude via `neq.`.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Exclude cancelled events**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title, status')
   *   .neq('status', 'cancelled');
   * ```
   *
   * @see {@link FilterBuilder.isDistinct} for null-safe inequality (`IS DISTINCT FROM`).
   * @public
   */
  neq(column: string, value: unknown): this;

  /**
   * Filters rows where `column` is strictly greater than `value` (`?column=gt.<value>`, SQL `>`).
   *
   * @remarks
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   * Pass ISO-8601 strings (`date.toISOString()`, never raw `Date` instances) for timestamps, guard optional bounds with `if (val !== undefined)`, use `'metadata->key'` (not `->>`) for numeric `jsonb` comparisons, and quote PostgreSQL reserved-word column names with double quotes (`'"order"'`).
   *
   * @param column - Numeric, timestamp, date, JSON numeric path (`metadata->key`), or lexicographically ordered PostgreSQL column name.
   * @param value - Defined lower bound (exclusive) serialized into `gt.<value>`.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Find large venues with capacity strictly above 1,000**
   * ```ts
   * const res = await sql
   *   .from('venues')
   *   .select('id, name, city, capacity')
   *   .gt('capacity', 1000);
   * ```
   *
   * @see {@link FilterBuilder.gte} for inclusive `>=` bounds.
   * @public
   */
  gt(column: string, value: unknown): this;

  /**
   * Filters rows where `column` is greater than or equal to `value` (`?column=gte.<value>`, SQL `>=`).
   *
   * @remarks
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   * Pass ISO-8601 strings (`date.toISOString()`, never raw `Date` instances) for timestamps, guard optional bounds with `if (val !== undefined)`, and use `'metadata->key'` (not `->>`) for numeric `jsonb` comparisons.
   *
   * @param column - Numeric, timestamp, date, JSON numeric path (`metadata->key`), or lexicographically ordered PostgreSQL column name.
   * @param value - Defined lower bound (inclusive) serialized into `gte.<value>`.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Fetch events created on or after a specific ISO-8601 timestamp**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title, created_at')
   *   .gte('created_at', '2026-01-01T00:00:00Z');
   * ```
   *
   * @see {@link FilterBuilder.gt} for strict `>` bounds.
   * @public
   */
  gte(column: string, value: unknown): this;

  /**
   * Filters rows where `column` is strictly less than `value` (`?column=lt.<value>`, SQL `<`).
   *
   * @remarks
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   * Pass ISO-8601 strings (`date.toISOString()`, never raw `Date` instances) for timestamps, guard optional bounds with `if (val !== undefined)`, and use `'metadata->key'` (not `->>`) for numeric `jsonb` comparisons.
   *
   * @param column - Numeric, timestamp, date, JSON numeric path (`metadata->key`), or lexicographically ordered PostgreSQL column name.
   * @param value - Defined upper bound (exclusive) serialized into `lt.<value>`.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Find events priced strictly under $50**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, ticket_price')
   *   .lt('ticket_price', 50);
   * ```
   *
   * @see {@link FilterBuilder.lte} for inclusive `<=` bounds.
   * @public
   */
  lt(column: string, value: unknown): this;

  /**
   * Filters rows where `column` is less than or equal to `value` (`?column=lte.<value>`, SQL `<=`).
   *
   * @remarks
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   * Pass ISO-8601 strings (`date.toISOString()`, never raw `Date` instances) for timestamps, guard optional bounds with `if (val !== undefined)`, and use `'metadata->key'` (not `->>`) for numeric `jsonb` comparisons.
   *
   * @param column - Numeric, timestamp, date, JSON numeric path (`metadata->key`), or lexicographically ordered PostgreSQL column name.
   * @param value - Defined upper bound (inclusive) serialized into `lte.<value>`.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Find intimate venues with capacity up to 300**
   * ```ts
   * const res = await sql
   *   .from('venues')
   *   .select('id, name, capacity')
   *   .lte('capacity', 300);
   * ```
   *
   * @see {@link FilterBuilder.lt} for strict `<` bounds.
   * @public
   */
  lte(column: string, value: unknown): this;

  /**
   * Filters rows where text `column` matches SQL `LIKE` `pattern` **case-sensitively** (`?column=like.<pattern>`).
   *
   * @remarks
   * **When to use:** Case-sensitive prefix, suffix, or substring matching using SQL wildcards (`%` for zero or more characters, `_` for a single character; `*` is also accepted by PostgREST as an alias for `%`).
   *
   * **Do NOT use:** Case-insensitive user search; use {@link FilterBuilder.ilike} or {@link FilterBuilder.textSearch} instead.
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @param column - Text PostgreSQL column name or JSON text path (`metadata->>key`).
   * @param pattern - SQL `LIKE` pattern containing `%` or `_` wildcards.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Match event codes starting with an uppercase `'FB-'` prefix**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .like('code', 'FB-%');
   * ```
   *
   * @see {@link FilterBuilder.ilike} for case-insensitive `ILIKE` matching.
   * @public
   */
  like(column: string, pattern: string): this;

  /**
   * Filters rows where text `column` **case-sensitively** matches **every** SQL `LIKE` pattern in `patterns` (`?column=like(all).{...}`).
   *
   * @remarks
   * **Behavior & Side Effects:** Joins `patterns` with commas inside a PostgREST array literal without quoting (do not pass patterns containing commas, double quotes, `{`, or `}`) and mutates URL query parameters in place without network I/O.
   *
   * @param column - Text PostgreSQL column name.
   * @param patterns - Non-empty list of SQL `LIKE` patterns (`%` / `_`) that must **all** match `column`.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Match event codes that both start with `'FB-'` and end with `'-2026'`**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .likeAllOf('code', ['FB-%', '%-2026']);
   * ```
   *
   * @see {@link FilterBuilder.likeAnyOf} to match at least one pattern.
   * @see {@link FilterBuilder.ilikeAllOf} for case-insensitive matching.
   * @public
   */
  likeAllOf(column: string, patterns: readonly string[]): this;

  /**
   * Filters rows where text `column` **case-sensitively** matches **at least one** SQL `LIKE` pattern in `patterns` (`?column=like(any).{...}`).
   *
   * @remarks
   * **Behavior & Side Effects:** Joins `patterns` with commas inside a PostgREST array literal without quoting (do not pass patterns containing commas, double quotes, `{`, or `}`) and mutates URL query parameters in place without network I/O.
   *
   * @param column - Text PostgreSQL column name.
   * @param patterns - Non-empty list of SQL `LIKE` patterns (`%` / `_`) where any match qualifies the row.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Match event codes starting with either `'KEYNOTE-'` or `'WORKSHOP-'`**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .likeAnyOf('code', ['KEYNOTE-%', 'WORKSHOP-%']);
   * ```
   *
   * @see {@link FilterBuilder.likeAllOf} when every pattern must match.
   * @see {@link FilterBuilder.ilikeAnyOf} for case-insensitive matching.
   * @public
   */
  likeAnyOf(column: string, patterns: readonly string[]): this;

  /**
   * Filters rows where text `column` matches SQL `ILIKE` `pattern` **case-insensitively** (`?column=ilike.<pattern>`).
   *
   * @remarks
   * **When to use:** Case-insensitive prefix, suffix, or substring matching using `%` and `_` SQL wildcards.
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @param column - Text PostgreSQL column name or JSON text path (`metadata->>key`).
   * @param pattern - Case-insensitive SQL `ILIKE` pattern containing `%` or `_` wildcards.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Search event titles containing `'summit'` regardless of case**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .ilike('title', '%summit%');
   * ```
   *
   * @see {@link FilterBuilder.like} for case-sensitive `LIKE` matching.
   * @see {@link FilterBuilder.textSearch} for indexed full-text stemming search.
   * @public
   */
  ilike(column: string, pattern: string): this;

  /**
   * Filters rows where text `column` **case-insensitively** matches **every** SQL `ILIKE` pattern in `patterns` (`?column=ilike(all).{...}`).
   *
   * @remarks
   * **Behavior & Side Effects:** Joins `patterns` with commas inside a PostgREST array literal without quoting (do not pass patterns containing commas, double quotes, `{`, or `}`) and mutates URL query parameters in place without network I/O.
   *
   * @param column - Text PostgreSQL column name.
   * @param patterns - Non-empty list of SQL `ILIKE` patterns (`%` / `_`) that must **all** match `column`.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Find events whose title mentions both `'firebase'` and `'workshop'` (any case)**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title')
   *   .ilikeAllOf('title', ['%firebase%', '%workshop%']);
   * ```
   *
   * @see {@link FilterBuilder.ilikeAnyOf} to match at least one pattern.
   * @public
   */
  ilikeAllOf(column: string, patterns: readonly string[]): this;

  /**
   * Filters rows where text `column` **case-insensitively** matches **at least one** SQL `ILIKE` pattern in `patterns` (`?column=ilike(any).{...}`).
   *
   * @remarks
   * **Behavior & Side Effects:** Joins `patterns` with commas inside a PostgREST array literal without quoting (do not pass patterns containing commas, double quotes, `{`, or `}`) and mutates URL query parameters in place without network I/O.
   *
   * @param column - Text PostgreSQL column name.
   * @param patterns - Non-empty list of SQL `ILIKE` patterns (`%` / `_`) where any match qualifies the row.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Find registrations with `@example.com` or `@google.com` email domains (case-insensitive)**
   * ```ts
   * const res = await sql
   *   .from('registrations')
   *   .select('id, attendee_email, role')
   *   .ilikeAnyOf('attendee_email', ['%@example.com', '%@google.com']);
   * ```
   *
   * @see {@link FilterBuilder.ilikeAllOf} when every pattern must match.
   * @public
   */
  ilikeAnyOf(column: string, patterns: readonly string[]): this;

  /**
   * Filters rows where text `column` matches POSIX regular expression `pattern` **case-sensitively** (`?column=match.<pattern>`, PostgreSQL `~` operator).
   *
   * @remarks
   * **When to use:** Structural string validation (such as structured ticket codes or slugs) using PostgreSQL POSIX regular expressions.
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @param column - Text PostgreSQL column name.
   * @param pattern - Case-sensitive PostgreSQL POSIX regular expression pattern.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Match uppercase event codes formatted as `EVT-` followed by 4 digits**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .regexMatch('code', '^EVT-[0-9]{4}$');
   * ```
   *
   * @see {@link FilterBuilder.regexIMatch} for case-insensitive POSIX regex matching (`~*`).
   * @public
   */
  regexMatch(column: string, pattern: string): this;

  /**
   * Filters rows where text `column` matches POSIX regular expression `pattern` **case-insensitively** (`?column=imatch.<pattern>`, PostgreSQL `~*` operator).
   *
   * @remarks
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @param column - Text PostgreSQL column name.
   * @param pattern - Case-insensitive PostgreSQL POSIX regular expression pattern.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Match venue slugs ending in `-west` or `-east` regardless of case**
   * ```ts
   * const res = await sql
   *   .from('venues')
   *   .select('id, slug, name')
   *   .regexIMatch('slug', '-(west|east)$');
   * ```
   *
   * @see {@link FilterBuilder.regexMatch} for case-sensitive POSIX regex matching (`~`).
   * @public
   */
  regexIMatch(column: string, pattern: string): this;

  /**
   * Filters rows where `column` `IS NULL`, `IS TRUE`, or `IS FALSE` (`?column=is.<value>`).
   *
   * @remarks
   * **When to use:** Testing nullable columns (`venue_id`, `checked_in_at`) against `null`, or
   * testing boolean columns (`is_featured`) with SQL `IS TRUE` / `IS FALSE` semantics.
   *
   * **Do NOT use:**
   * - Testing `IS NOT NULL`; use {@link FilterBuilder.(not:1) | .not(column, 'is', null)} instead.
   * - Comparing arbitrary strings or numbers; use {@link FilterBuilder.eq} or {@link FilterBuilder.isDistinct}.
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @param column - PostgreSQL column name to test with SQL `IS`.
   * @param value - Literal `null`, `true`, or `false`.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Find registrations that have not checked in yet (`checked_in_at IS NULL`)**
   * ```ts
   * const uncheckedRes = await sql
   *   .from('registrations')
   *   .select('id, attendee_email')
   *   .eq('event_id', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')
   *   .is('checked_in_at', null);
   * ```
   *
   * @see {@link FilterBuilder.(not:1) | FilterBuilder.not} for `IS NOT NULL` filtering.
   * @public
   */
  is(column: string, value: boolean | null): this;

  /**
   * Filters rows where `column IS DISTINCT FROM value` (`?column=isdistinct.<value>`), treating `NULL` as a comparable value.
   *
   * @remarks
   * **When to use:** Null-safe inequality checks where rows with `column IS NULL` **should** match when `value` is non-null (and `NULL` vs `NULL` evaluates to `false` / not distinct).
   *
   * **Do NOT use:** Standard SQL inequality that should ignore `NULL` rows; use {@link FilterBuilder.neq} instead.
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @param column - PostgreSQL column name to compare with `IS DISTINCT FROM`.
   * @param value - Value (including `null`) to test distinctness against.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Match events assigned to a different venue OR virtual events (`venue_id IS NULL`)**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, venue_id')
   *   .isDistinct('venue_id', '550e8400-e29b-41d4-a716-446655440000');
   * ```
   *
   * @see {@link FilterBuilder.neq} for standard SQL `<>` inequality (which excludes `NULL` rows).
   * @public
   */
  isDistinct(column: string, value: unknown): this;

  /**
   * Filters rows where `column` equals any element in `values` (`?column=in.(...)`, SQL `IN`).
   *
   * @remarks
   * **When to use:** Matching a scalar column against a finite set of candidate IDs, slugs, or enum strings.
   *
   * **Do NOT use:**
   * - Filtering PostgreSQL array columns (`tags text[]`) for element membership; use {@link FilterBuilder.contains} or {@link FilterBuilder.overlaps} instead.
   * - Passing hundreds of UUIDs that push the URL length past server header limits (~8 KB); pass large ID lists to a stored function via {@link FirebaseSql.rpc} instead.
   *
   * **Behavior & Side Effects:** Deduplicates `values` via `Set`, wraps string elements containing `,`, `(`, or `)` in double quotes (note: embedded `"` or `\` characters inside strings are not escaped automatically), and mutates URL query parameters in place without network I/O. Passing an empty array `[]` sends `in.()`, matching zero rows.
   *
   * @param column - Scalar PostgreSQL column name.
   * @param values - Candidate scalar values to include.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Fetch events that are either `'draft'` or `'published'`**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, status')
   *   .in('status', ['draft', 'published']);
   * ```
   *
   * @see {@link FilterBuilder.notIn} for SQL `NOT IN` exclusion.
   * @see {@link FilterBuilder.overlaps} for array-column (`text[]`) overlap checks.
   * @public
   */
  in(column: string, values: readonly unknown[]): this;

  /**
   * Filters rows where `column` does not equal any element in `values` (`?column=not.in.(...)`, SQL `NOT IN`).
   *
   * @remarks
   * **When to use:** Excluding a set of known scalar values on a column.
   *
   * **Do NOT use:**
   * - Passing `null` inside `values`—in SQL, `col NOT IN (..., NULL)` never evaluates to `true` and matches **zero** rows!
   * - Expecting rows where `column IS NULL` to match—SQL `NOT IN` excludes `NULL` rows unless combined with `IS NULL` via {@link FilterBuilder.or}.
   *
   * **Behavior & Side Effects:** Deduplicates `values` via `Set`, wraps string elements containing `,`, `(`, or `)` in double quotes (embedded `"` or `\` characters inside strings are not escaped automatically), and mutates URL query parameters in place without network I/O.
   *
   * @param column - Scalar PostgreSQL column name.
   * @param values - Non-null scalar values to exclude.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Exclude cancelled and archived events**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title, status')
   *   .notIn('status', ['cancelled', 'archived']);
   * ```
   *
   * @see {@link FilterBuilder.in} for SQL `IN` inclusion.
   * @public
   */
  notIn(column: string, values: readonly unknown[]): this;

  /**
   * Filters array, `jsonb`, or range `column` values that contain all elements, key-value pairs, or bounds of `value` (`?column=cs.<value>`, PostgreSQL `@>` operator).
   *
   * @remarks
   * **When to use:**
   * - **Array columns** (`tags text[]`): Pass a JS array (such as `['firebase', 'sql']`) to match rows whose array contains *every* listed element.
   * - **`jsonb` columns** (`metadata jsonb`): Pass a plain JS object (such as `{ track: 'ai' }`) to match rows whose JSON document structurally contains those key-value pairs.
   * - **Range columns** (`schedule tstzrange`): Pass a PostgreSQL range literal string (or scalar timestamp string) to match ranges containing that sub-range or point.
   *
   * **Do NOT use:** Matching rows where an array column shares *at least one* tag with `value`; use {@link FilterBuilder.overlaps} instead.
   *
   * **Behavior & Side Effects:** Serializes strings verbatim, JS arrays via unquoted comma-joining `{a,b}` (if any array element contains `,`, `"`, `{`, `}`, or leading/trailing whitespace, pass a pre-quoted PostgreSQL array literal `string` such as `'{"cloud, sql","ai"}'` instead of a JS array), and plain objects via `JSON.stringify`, mutating URL query parameters in place without network I/O.
   *
   * @typeParam Value - Non-iterable plain object type when filtering `jsonb` columns.
   * @param column - PostgreSQL array (`text[]`), `jsonb`, or range (`tstzrange`) column name.
   * @param value - JS array (for simple SQL array elements), plain object (for `jsonb`), or PostgreSQL range/array literal string.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Match events tagged with both `'firebase'` and `'postgres'`, and `jsonb` metadata `{ track: 'backend' }`**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, tags, metadata')
   *   .contains('tags', ['firebase', 'postgres'])
   *   .contains('metadata', { track: 'backend' });
   * ```
   *
   * @see {@link FilterBuilder.containedBy} for the inverse `<@` containment operator.
   * @see {@link FilterBuilder.overlaps} for `&&` overlap on arrays and ranges.
   * @public
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
   * Filters array, `jsonb`, or range `column` values that are completely contained within `value` (`?column=cd.<value>`, PostgreSQL `<@` operator).
   *
   * @remarks
   * **When to use:**
   * - **Range columns** (`schedule tstzrange`): Pass a bounding window string (`'[2026-10-15T00:00:00Z,2026-10-16T00:00:00Z)'`) to find events scheduled *entirely* inside that window.
   * - **Array columns** (`tags text[]`): Pass a superset JS array so only rows whose elements are a subset of `value` match.
   * - **`jsonb` columns** (`metadata jsonb`): Pass a superset plain object.
   *
   * **Behavior & Side Effects:** Serializes strings verbatim, JS arrays via unquoted comma-joining `{a,b}` (pass a pre-quoted PostgreSQL array literal `string` such as `'{"cloud, sql","ai"}'` if elements contain `,`, `"`, `{`, `}`, or leading/trailing whitespace), and plain objects via `JSON.stringify`, mutating URL query parameters in place without network I/O.
   *
   * @typeParam Value - Non-iterable plain object type when filtering `jsonb` columns.
   * @param column - PostgreSQL array, `jsonb`, or range column name.
   * @param value - Superset JS array, plain object, or PostgreSQL range/array literal string.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Find events scheduled entirely within a single conference day**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title, schedule')
   *   .containedBy('schedule', '[2026-10-15T00:00:00Z,2026-10-16T00:00:00Z)');
   * ```
   *
   * @see {@link FilterBuilder.contains} for `@>` superset containment.
   * @see {@link FilterBuilder.overlaps} to include events that partially overlap a time window.
   * @public
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
   * Filters PostgreSQL range `column` values positioned **strictly right of** (after) `range` (`?column=sr.<range>`, PostgreSQL `>>` operator).
   *
   * @remarks
   * **When to use:** Finding ranges (`tstzrange`, `daterange`, `int4range`) where every point in `column` is strictly greater than every point in `range`.
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @param column - PostgreSQL range column name (such as `schedule`).
   * @param range - PostgreSQL range literal using `[` / `]` for inclusive bounds and `(` / `)` for exclusive bounds.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Find events starting strictly after a morning keynote slot ends**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, schedule')
   *   .rangeGt('schedule', '[2026-10-15T09:00:00Z,2026-10-15T10:00:00Z)');
   * ```
   *
   * @see {@link FilterBuilder.rangeGte} for does-not-extend-left-of (`&>`).
   * @see {@link FilterBuilder.rangeLt} for strictly-left-of (`<<`).
   * @public
   */
  rangeGt(column: string, range: string): this;

  /**
   * Filters PostgreSQL range `column` values that **do not extend to the left of** `range` (`?column=nxl.<range>`, PostgreSQL `&>` operator).
   *
   * @remarks
   * **When to use:** Matching ranges whose lower bound is greater than or equal to the lower bound of `range`.
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @param column - PostgreSQL range column name (such as `schedule`).
   * @param range - PostgreSQL range literal (for example, `'[2026-10-15T09:00:00Z,2026-10-15T12:00:00Z)'`).
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Find events whose `schedule` does not start before `09:00 UTC`**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, schedule')
   *   .rangeGte('schedule', '[2026-10-15T09:00:00Z,2026-10-15T10:00:00Z)');
   * ```
   *
   * @see {@link FilterBuilder.rangeGt} for strictly-right-of (`>>`).
   * @public
   */
  rangeGte(column: string, range: string): this;

  /**
   * Filters PostgreSQL range `column` values positioned **strictly left of** (before) `range` (`?column=sl.<range>`, PostgreSQL `<<` operator).
   *
   * @remarks
   * **When to use:** Finding ranges where every point in `column` is strictly less than every point in `range`.
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @param column - PostgreSQL range column name (such as `schedule`).
   * @param range - PostgreSQL range literal using `[` / `]` (inclusive) and `(` / `)` (exclusive).
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Find events finishing strictly before an evening reception slot begins**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, schedule')
   *   .rangeLt('schedule', '[2026-10-15T18:00:00Z,2026-10-15T20:00:00Z)');
   * ```
   *
   * @see {@link FilterBuilder.rangeLte} for does-not-extend-right-of (`&<`).
   * @see {@link FilterBuilder.rangeGt} for strictly-right-of (`>>`).
   * @public
   */
  rangeLt(column: string, range: string): this;

  /**
   * Filters PostgreSQL range `column` values that **do not extend to the right of** `range` (`?column=nxr.<range>`, PostgreSQL `&<` operator).
   *
   * @remarks
   * **When to use:** Matching ranges whose upper bound is less than or equal to the upper bound of `range`.
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @param column - PostgreSQL range column name (such as `schedule`).
   * @param range - PostgreSQL range literal (for example, `'[2026-10-15T09:00:00Z,2026-10-15T17:00:00Z)'`).
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Find events whose `schedule` ends no later than `17:00 UTC`**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, schedule')
   *   .rangeLte('schedule', '[2026-10-15T09:00:00Z,2026-10-15T17:00:00Z)');
   * ```
   *
   * @see {@link FilterBuilder.rangeLt} for strictly-left-of (`<<`).
   * @public
   */
  rangeLte(column: string, range: string): this;

  /**
   * Filters PostgreSQL range `column` values that are **immediately adjacent** to `range` with no gap and no overlap (`?column=adj.<range>`, PostgreSQL `-|-` operator).
   *
   * @remarks
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @param column - PostgreSQL range column name (such as `schedule`).
   * @param range - PostgreSQL range literal (for example, `'[2026-10-15T09:00:00Z,2026-10-15T10:00:00Z)'` is adjacent to `'[2026-10-15T10:00:00Z,2026-10-15T11:00:00Z)'`).
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Find sessions scheduled back-to-back with a `09:00–10:00 UTC` keynote**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, schedule')
   *   .rangeAdjacent('schedule', '[2026-10-15T09:00:00Z,2026-10-15T10:00:00Z)');
   * ```
   *
   * @see {@link FilterBuilder.overlaps} for ranges that share at least one point in common (`&&`).
   * @public
   */
  rangeAdjacent(column: string, range: string): this;

  /**
   * Filters PostgreSQL array or range `column` values that share **at least one element or point** in common with `value` (`?column=ov.<value>`, PostgreSQL `&&` operator).
   *
   * @remarks
   * **When to use:**
   * - **Array columns** (`tags text[]`): Match rows tagged with *any* tag in `value` (logical `OR` across tags).
   * - **Range columns** (`schedule tstzrange`): Detect schedule conflicts or find events overlapping a time window.
   *
   * **Do NOT use:** `jsonb` columns—PostgreSQL's `&&` operator is defined on arrays and ranges, not `jsonb` (use {@link FilterBuilder.contains} for `jsonb`).
   *
   * **Behavior & Side Effects:** Serializes strings verbatim (for ranges or pre-quoted PostgreSQL array literals such as `'{"cloud, sql","ai"}'`) and JS arrays via unquoted comma-joining `{a,b}` (do not pass JS array elements containing `,`, `"`, `{`, `}`, or leading/trailing whitespace), mutating URL query parameters in place without network I/O.
   *
   * @param column - PostgreSQL array (`text[]`) or range (`tstzrange`) column name.
   * @param value - JS array of simple candidate elements (for SQL arrays) or PostgreSQL range/array literal string.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Find events overlapping a time slot OR carrying at least one target tag**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, tags, schedule')
   *   .overlaps('tags', ['ai', 'serverless'])
   *   .overlaps('schedule', '[2026-10-15T10:00:00Z,2026-10-15T12:00:00Z)');
   * ```
   *
   * @see {@link FilterBuilder.contains} when *every* element in `value` must be present (`@>`).
   * @public
   */
  overlaps(column: string, value: string | readonly unknown[]): this;

  /**
   * Filters `tsvector` or `text` `column` values matching full-text search `query` (`?column=[pl|ph|w]fts[(config)].<query>`, PostgreSQL `@@` operator).
   *
   * @remarks
   * **When to use:** Stemmed, natural-language full-text search against indexed `tsvector` columns (such as `events.search_doc`) or `text` columns.
   * - Always pass `{ type: 'websearch' }` (or `'plain'` / `'phrase'`) when `query` comes from raw user input; omitting `options.type` uses PostgreSQL `to_tsquery`, which fails with a syntax error if `query` is not valid `tsquery` boolean syntax (such as `'firebase' & 'sql'`).
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @param column - PostgreSQL `tsvector` or `text` column name.
   * @param query - Search query string interpreted according to `options.type`.
   * @param options - Optional text search dictionary (`config`) and parser mode (`type`). See {@link FilterTextSearchOptions}.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Search `events.search_doc` safely from user input using `'websearch'` mode**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .textSearch('search_doc', '"vector search" or postgres -draft', {
   *     type: 'websearch',
   *     config: 'english'
   *   });
   * ```
   *
   * @see {@link FilterTextSearchOptions} and {@link FilterTextSearchType} for parser modes.
   * @public
   */
  textSearch(
    column: string,
    query: string,
    options?: Readonly<FilterTextSearchOptions> | undefined
  ): this;

  /**
   * Appends an equality filter (`?col=eq.<val>`) for every defined key-value pair in `query`.
   *
   * @remarks
   * **When to use:** Concise multi-column equality filtering from a plain criteria object. Properties whose value is `undefined` are automatically omitted (ignored).
   *
   * **Do NOT use:** Properties whose value may be `null`—`match({ venue_id: null })` emits `?venue_id=eq.null` instead of `IS NULL`; use {@link FilterBuilder.is | .is('venue_id', null)} for `NULL` checks.
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @typeParam Query - Non-iterable plain object mapping column names to expected values.
   * @param query - Plain object of `{ column: value }` equality predicates (`undefined` values are skipped).
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Match featured published events using a single object**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .match({ status: 'published', is_featured: true });
   * ```
   *
   * @see {@link FilterBuilder.eq} for single-column equality checks.
   * @public
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
   * Filters rows where `column IS NOT NULL` (`?column=not.is.null`) and narrows `column` on `T`
   * to `NonNullable` via {@link NarrowResultColumn}.
   *
   * @remarks
   * **When to use:** Excluding `NULL` values on nullable columns (such as `events.venue_id` or
   * `registrations.checked_in_at`). Note that on default untyped chains (`T = Array<Record<string, unknown>>`),
   * declare the narrowed column as non-null directly in your terminal `.overrideTypes<Row[], { merge: false }>()`
   * interface (`NarrowResultColumn` only narrows pre-typed `FilterBuilder<Row[]>` references).
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @typeParam ColumnName - Literal column name key to narrow to `NonNullable` in `T`.
   * @param column - PostgreSQL column name that must be non-null.
   * @param operator - Must be `'is'` for `IS NOT NULL` type narrowing.
   * @param value - Must be `null`.
   * @returns This {@link FilterBuilder} with `T`'s `ColumnName` property narrowed to `NonNullable`.
   *
   * @example
   * **Exclude virtual events (`venue_id IS NOT NULL`)**
   * ```ts
   * const inPersonRes = await sql
   *   .from('events')
   *   .select('id, title, venue_id')
   *   .not('venue_id', 'is', null)
   *   .overrideTypes<Array<{ id: string; title: string; venue_id: string }>, { merge: false }>();
   * ```
   *
   * @see {@link FilterBuilder.is} for `IS NULL` checks.
   * @public
   */
  not<ColumnName extends string>(
    column: ColumnName,
    operator: 'is',
    value: null
  ): FilterBuilder<NarrowResultColumn<T, ColumnName>, Method, ThrowOnError> &
    this;
  /**
   * Negates a PostgREST filter operator on `column` (`?column=not.<operator>.<value>`).
   *
   * @remarks
   * **When to use:** Negating operators that lack a dedicated negated helper (for example,
   * `.not('tags', 'cs', '{archived}')` or `.not('title', 'ilike', '%test%')`).
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O.
   * Note that array/list values passed to raw PostgREST operators must use PostgREST wire syntax
   * (such as `'(draft,cancelled)'` for `'in'`); prefer {@link FilterBuilder.notIn} for typed array negation.
   *
   * @param column - PostgreSQL column name to filter.
   * @param operator - PostgREST {@link FilterOperator} name (such as `'eq'`, `'ilike'`, `'cs'`, `'ov'`).
   * @param value - Operand formatted for the specified PostgREST `operator`.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Exclude archived events**
   * ```ts
   * const activeRes = await sql
   *   .from('events')
   *   .select('id, code, status')
   *   .not('status', 'eq', 'archived');
   * ```
   *
   * @see {@link FilterBuilder.neq} and {@link FilterBuilder.notIn} for dedicated inequality and list-exclusion helpers.
   * @public
   */
  not(
    column: string,
    operator: FilterOperator | (string & {}),
    value: unknown
  ): this;

  /**
   * Filters rows satisfying **at least one** comma-separated raw PostgREST predicate (`?or=(<filters>)` or `?<referencedTable>.or=(<filters>)`).
   *
   * @remarks
   * **When to use:** Logical `OR` conditions (including nested `and(...)` groups such as `'is_featured.eq.true,and(status.eq.published,ticket_price.eq.0)'`).
   *
   * **Preconditions & Security:**
   * - `filters` is interpolated verbatim inside `or=(...)` using raw PostgREST syntax (`column.operator.value`). Double-quote string operands that may contain commas or parentheses, and validate untrusted user input before interpolating.
   * - Cannot span columns from different tables in a single `.or()` expression; pass `{ referencedTable }` to scope an `.or()` expression to one embedded relation.
   *
   * **Behavior & Side Effects:** Mutates this builder's URL query parameters in place without network I/O and returns `this`.
   *
   * @param filters - Comma-separated PostgREST filter expressions (without surrounding `or=(...)` parentheses).
   * @param options - Optional `referencedTable` to scope the disjunction to an embedded relation. See {@link FilterOrOptions}.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Match events that are either free (`ticket_price = 0`) OR featured and under $50**
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title, ticket_price, is_featured')
   *   .eq('status', 'published')
   *   .or('ticket_price.eq.0,and(is_featured.eq.true,ticket_price.lt.50)');
   * ```
   *
   * @see {@link FilterOrOptions} for scoping `or()` to an embedded relation.
   * @public
   */
  or(filters: string, options?: Readonly<FilterOrOptions> | undefined): this;

  /**
   * Appends a raw PostgREST filter parameter (`?column=<operator>.<value>`) as an escape hatch for custom or composite operators.
   *
   * @remarks
   * **When to use:** Invoking PostgREST operators or modifiers (such as `'not.ov'` or custom server operators) not covered by dedicated {@link FilterBuilder} methods.
   *
   * **Do NOT use:** Standard comparisons, arrays, or `NULL` checks where typed helpers ({@link FilterBuilder.eq}, {@link FilterBuilder.in}, {@link FilterBuilder.contains}, {@link FilterBuilder.is}) handle value quoting and formatting automatically.
   *
   * **Behavior & Side Effects:** Appends `${operator}.${value}` verbatim to URL query parameter `column` without quoting or escaping `value`, and returns `this`.
   *
   * @param column - PostgreSQL column name, JSON path, or `embedded_table.column` reference.
   * @param operator - PostgREST {@link FilterOperator} (optionally prefixed with `'not.'`).
   * @param value - Raw PostgREST-formatted operand (such as `'(speaker,organizer)'` for `'in'` or `'{ai,sql}'` for `'cs'`).
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * **Apply a raw PostgREST `'in'` filter on `registrations.role`**
   * ```ts
   * const res = await sql
   *   .from('registrations')
   *   .select('id, attendee_email, role')
   *   .filter('role', 'in', '(speaker,organizer)');
   * ```
   *
   * @see {@link FilterOperator} for supported PostgREST operator tokens.
   * @public
   */
  filter(
    column: string,
    operator: `${'' | 'not.'}${FilterOperator}` | (string & {}),
    value: unknown
  ): this;
}
