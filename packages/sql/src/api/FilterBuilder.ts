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
 * `'plain'` uses `plainto_tsquery` (`plfts`), normalizing unquoted words and joining terms with `&`
 * (`AND`). `'phrase'` uses `phraseto_tsquery` (`phfts`), matching normalized terms in adjacent `<->`
 * phrase order. `'websearch'` uses `websearch_to_tsquery` (`wfts`), supporting `"quoted phrases"`,
 * `or`, and `-negation` without raising syntax errors on raw user input.
 *
 * When omitted in {@link FilterTextSearchOptions}, PostgREST uses raw `to_tsquery` (`fts`), which
 * requires valid `tsquery` syntax.
 *
 * @example
 * Select `'websearch'` mode for raw user search input:
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
 * Configure English stemming with `'websearch'` query parsing:
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
   * Defaults to `undefined` (PostgreSQL uses the server's `default_text_search_config` setting).
   */
  config?: string | undefined;

  /**
   * Query parser mode (`'plain'`, `'phrase'`, or `'websearch'`).
   *
   * @remarks
   * Defaults to `undefined` (PostgREST applies `to_tsquery` / `fts`, which requires explicit
   * boolean operators such as `'firebase' & 'sql'` and rejects malformed user strings).
   */
  type?: FilterTextSearchType | undefined;
}

/**
 * Embedded-relation targeting options for {@link FilterBuilder.or}.
 *
 * @example
 * Scope an `OR` filter to an embedded `registrations` relation:
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
   * Legacy alias for {@link FilterOrOptions.referencedTable}. Prefer `referencedTable` for new code. Defaults to `undefined`.
   */
  foreignTable?: string | undefined;

  /**
   * Embedded relation name (or alias) to apply the `OR` disjunction against (`?<referencedTable>.or=(...)`) instead of the parent table.
   *
   * @remarks
   * Defaults to `undefined`. Takes precedence over `foreignTable` when both are provided. Filters
   * rows inside the embedded relation's array; combine with `!inner` in `select()` if unmatched
   * parent rows should also be excluded.
   */
  referencedTable?: string | undefined;
}

/**
 * Raw PostgREST filter operator tokens accepted by {@link FilterBuilder.(not:2) | FilterBuilder.not} and {@link FilterBuilder.filter}.
 *
 * @remarks
 * Maps to PostgREST URL filter prefixes across four operator families.
 *
 * Comparison: `'eq'` (`=`), `'neq'` (`<>`), `'gt'` (`>`), `'gte'` (`>=`), `'lt'` (`<`), `'lte'` (`<=`), `'is'` (`IS`), `'isdistinct'` (`IS DISTINCT FROM`), and `'in'` (`IN`).
 *
 * Pattern and regex: `'like'` (`LIKE`), `'ilike'` (`ILIKE`), `'match'` (`~`), and `'imatch'` (`~*`).
 *
 * Array, `jsonb`, and range: `'cs'` (`@>`), `'cd'` (`<@`), `'ov'` (`&&`), `'sl'` (`<<`), `'sr'` (`>>`), `'nxl'` (`&>`), `'nxr'` (`&<`), and `'adj'` (`-|-`).
 *
 * Full-text search: `'fts'` (`to_tsquery`), `'plfts'` (`plainto_tsquery`), `'phfts'` (`phraseto_tsquery`), and `'wfts'` (`websearch_to_tsquery`).
 *
 * @example
 * Use a typed PostgREST operator token with `.filter()`:
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
 * Narrow a nullable `venue_id` property to `string` across an array of rows:
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
 * Builder progression: extends {@link TransformBuilder} (and {@link Builder} / `PromiseLike`).
 * Chaining multiple filter methods combines predicates with logical `AND` in the outgoing URL query
 * string (use {@link FilterBuilder.or | .or()} for logical `OR`).
 *
 * Value serialization guardrails (`Date`, `undefined`, and `null`): never pass a raw `Date` object
 * to filter methods—URL parameter string interpolation invokes `Date.prototype.toString()` (for
 * example, `'Thu Jan 01 2026 ... GMT+0000 (...)'`), which PostgreSQL rejects with SQLSTATE `'22007'`
 * or `'22023'` depending on the runtime time zone; always pass ISO-8601 strings via
 * `date.toISOString()`. Methods typed with `value: unknown` (`neq`, `gt`, `gte`, `lt`, `lte`,
 * `isDistinct`, `not`, `filter`, and array elements of `in`/`notIn`) accept `undefined` or `null`
 * at compile time and interpolate the literal text `'undefined'` or `'null'` into the URL; always
 * guard optional filter inputs with `if (value !== undefined)` and use
 * {@link FilterBuilder.is | .is(column, null)} or
 * {@link FilterBuilder.(not:1) | .not(column, 'is', null)} for SQL `NULL` checks.
 *
 * Embedded columns and reserved PostgREST parameter names: filtering a dot-qualified embedded
 * column (such as `'venues.city'`) filters only the embedded resource—parent rows are still
 * returned with the embedded property set to `null` or `[]` unless the relation is selected with
 * `!inner` in `select()`. Also note that bare column names matching reserved PostgREST query
 * parameters (`select`, `order`, `limit`, `offset`, `or`, `and`, `columns`, `on_conflict`) collide
 * with PostgREST URL directives (for example, `eq('limit', 1)` is parsed as `limit` rather than a
 * column filter).
 *
 * Mutability and non-cached execution: filter methods mutate the current `FilterBuilder` instance
 * in place and return `this`—do not branch two conflicting filter chains off the same
 * `FilterBuilder` variable (branch from {@link FirebaseSql.from | sql.from(table)} instead). Each
 * `await` or `.then()` call sends a new HTTP request built from the builder's current state;
 * results are not cached. Awaiting the same builder twice (sequentially or via
 * `Promise.all([q, q])`) executes it twice—harmless for reads, but it duplicates writes for
 * `insert()`, `upsert()`, `update()`, `delete()`, and write `rpc()` builders. Await each mutation
 * builder at most once.
 *
 * @typeParam T - Expected resolved `data` payload type.
 * @typeParam Method - HTTP/RPC operation discriminator (`'GET'`, `'POST'`, `'PATCH'`, `'DELETE'`, `'RPC'`).
 * @typeParam ThrowOnError - `true` after {@link FilterBuilder.throwOnError} is called; `false` by default.
 *
 * @example
 * Compose multiple `AND` predicates on a `FilterBuilder` before ordering and typing:
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
   * on failure instead of resolving to {@link OperationFailure}, while preserving {@link FilterBuilder}
   * chaining. See {@link Builder.throwOnError}.
   *
   * @returns This {@link FilterBuilder} narrowed to `ThrowOnError = true` (resolving to {@link OperationSuccess} when awaited).
   *
   * @example
   * Enable throwing mode early in a filter chain:
   * ```ts
   * const { data } = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .throwOnError()
   *   .eq('status', 'published')
   *   .overrideTypes<Array<{ id: string; code: string; title: string }>, { merge: false }>();
   * ```
   *
   * @public
   */
  throwOnError(): FilterBuilder<T, Method, true>;

  /**
   * Filters rows where `column` equals `value` (`?column=eq.<value>`).
   *
   * @remarks
   * When to use: exact equality matching on non-null strings, numbers, UUIDs, or booleans (see
   * {@link FilterBuilder.match} for multi-column object equality). For `jsonb` columns, use
   * double-arrow `->>` (`'metadata->>track'`) when comparing strings, and single-arrow `->`
   * (`'metadata->level'`) when comparing numbers or booleans (comparing a string against `->` fails
   * with PostgreSQL `'22P02'`).
   *
   * Embedded column caveat: filtering an embedded column (`'venues.city'`) filters only the
   * embedded rows; parent rows are still returned (with the embed `null` or `[]`) unless the
   * relation is selected with `!inner`.
   *
   * Do not use for SQL `NULL` checks—`null` is rejected by `NonNullable<unknown>`; use
   * {@link FilterBuilder.is | .is(column, null)} instead. Do not pass raw `Date` instances; pass
   * `date.toISOString()`.
   *
   * Behavior and side effects: interpolates `eq.${value}` verbatim into URL query parameters in
   * place without network I/O and returns `this`.
   *
   * @param column - PostgreSQL column name, JSON path expression (`metadata->>key` or `metadata->numKey`), or `embedded_table.column` reference.
   * @param value - Non-null primitive value serialized into the `eq.` PostgREST filter parameter.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Filter published events on a specific column value:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .eq('status', 'published');
   * ```
   *
   * @public
   */
  eq(column: string, value: NonNullable<unknown>): this;

  /**
   * Filters rows where `column` does not equal `value` (`?column=neq.<value>`, SQL `<>`).
   *
   * @remarks
   * When to use: excluding a specific non-null scalar value on a column. Filtering an embedded
   * column (`'venues.city'`) filters only the embedded rows; parent rows are still returned (with
   * the embed `null` or `[]`) unless the relation is selected with `!inner`.
   *
   * Do not expect rows where `column IS NULL` to match—standard SQL `NULL <> value` evaluates to
   * `UNKNOWN`, excluding `NULL` rows (use {@link FilterBuilder.isDistinct} with a non-null `value`
   * if `NULL` rows should also match). For `IS NOT NULL`, use
   * {@link FilterBuilder.(not:1) | .not(column, 'is', null)}. Guard optional values with
   * `if (val !== undefined)` (and do not pass `null`, which sends the string `'null'`) and convert
   * dates via `date.toISOString()`.
   *
   * Behavior and side effects: interpolates `neq.${value}` into URL query parameters in place
   * without network I/O and returns `this`.
   *
   * @param column - PostgreSQL column name, JSON path expression, or `embedded_table.column` reference.
   * @param value - Defined non-null value to exclude via `neq.`.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Exclude cancelled events:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title, status')
   *   .neq('status', 'cancelled');
   * ```
   *
   * @public
   */
  neq(column: string, value: unknown): this;

  /**
   * Filters rows where `column` is strictly greater than `value` (`?column=gt.<value>`, SQL `>`).
   *
   * @remarks
   * Behavior and side effects: mutates this builder's URL query parameters in place without network
   * I/O and returns `this` (see {@link FilterBuilder.gte} for inclusive `>=` bounds). Pass ISO-8601
   * strings (`date.toISOString()`, never raw `Date` instances) for timestamps, guard optional
   * bounds with `if (val !== undefined)`, and use `'metadata->key'` (not `->>`) for numeric `jsonb`
   * comparisons.
   *
   * @param column - Numeric, timestamp, date, JSON numeric path (`metadata->key`), or lexicographically ordered PostgreSQL column name.
   * @param value - Defined non-null lower bound (exclusive) serialized into `gt.<value>`.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Find large venues with capacity strictly above 1,000:
   * ```ts
   * const res = await sql
   *   .from('venues')
   *   .select('id, name, city, capacity')
   *   .gt('capacity', 1000);
   * ```
   *
   * @public
   */
  gt(column: string, value: unknown): this;

  /**
   * Filters rows where `column` is greater than or equal to `value` (`?column=gte.<value>`, SQL `>=`).
   *
   * @remarks
   * Behavior and side effects: mutates this builder's URL query parameters in place without network
   * I/O and returns `this` (see {@link FilterBuilder.gt} for strict `>` bounds). Pass ISO-8601
   * strings (`date.toISOString()`, never raw `Date` instances) for timestamps, guard optional
   * bounds with `if (val !== undefined)`, and use `'metadata->key'` (not `->>`) for numeric `jsonb`
   * comparisons.
   *
   * @param column - Numeric, timestamp, date, JSON numeric path (`metadata->key`), or lexicographically ordered PostgreSQL column name.
   * @param value - Defined non-null lower bound (inclusive) serialized into `gte.<value>`.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Fetch events created on or after a specific ISO-8601 timestamp:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title, created_at')
   *   .gte('created_at', '2026-01-01T00:00:00Z');
   * ```
   *
   * @public
   */
  gte(column: string, value: unknown): this;

  /**
   * Filters rows where `column` is strictly less than `value` (`?column=lt.<value>`, SQL `<`).
   *
   * @remarks
   * Behavior and side effects: mutates this builder's URL query parameters in place without network
   * I/O and returns `this` (see {@link FilterBuilder.lte} for inclusive `<=` bounds). Pass ISO-8601
   * strings (`date.toISOString()`, never raw `Date` instances) for timestamps, guard optional
   * bounds with `if (val !== undefined)`, and use `'metadata->key'` (not `->>`) for numeric `jsonb`
   * comparisons.
   *
   * @param column - Numeric, timestamp, date, JSON numeric path (`metadata->key`), or lexicographically ordered PostgreSQL column name.
   * @param value - Defined non-null upper bound (exclusive) serialized into `lt.<value>`.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Find events priced strictly under $50:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, ticket_price')
   *   .lt('ticket_price', 50);
   * ```
   *
   * @public
   */
  lt(column: string, value: unknown): this;

  /**
   * Filters rows where `column` is less than or equal to `value` (`?column=lte.<value>`, SQL `<=`).
   *
   * @remarks
   * Behavior and side effects: mutates this builder's URL query parameters in place without network
   * I/O and returns `this` (see {@link FilterBuilder.lt} for strict `<` bounds). Pass ISO-8601
   * strings (`date.toISOString()`, never raw `Date` instances) for timestamps, guard optional
   * bounds with `if (val !== undefined)`, and use `'metadata->key'` (not `->>`) for numeric `jsonb`
   * comparisons.
   *
   * @param column - Numeric, timestamp, date, JSON numeric path (`metadata->key`), or lexicographically ordered PostgreSQL column name.
   * @param value - Defined non-null upper bound (inclusive) serialized into `lte.<value>`.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Find intimate venues with capacity up to 300:
   * ```ts
   * const res = await sql
   *   .from('venues')
   *   .select('id, name, capacity')
   *   .lte('capacity', 300);
   * ```
   *
   * @public
   */
  lte(column: string, value: unknown): this;

  /**
   * Filters rows where text `column` matches SQL `LIKE` `pattern` case-sensitively (`?column=like.<pattern>`).
   *
   * @remarks
   * When to use: case-sensitive prefix, suffix, or substring matching using SQL wildcards (`%` for
   * zero or more characters, `_` for a single character; for case-insensitive matching use
   * {@link FilterBuilder.ilike} or {@link FilterBuilder.textSearch}).
   *
   * Wildcard and escaping note: PostgREST rewrites every `*` in `pattern` to SQL `%`, so `*` always
   * acts as a multi-character wildcard. Backslash-escape `\`, `%`, and `_` in user-supplied input,
   * and note that literal `*` cannot be matched unescaped via `like()`.
   *
   * Behavior and side effects: mutates this builder's URL query parameters in place without network
   * I/O and returns `this`.
   *
   * @param column - Text PostgreSQL column name or JSON text path (`metadata->>key`).
   * @param pattern - SQL `LIKE` pattern containing `%` or `_` wildcards (`*` is also rewritten to `%`).
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Match event codes starting with an uppercase `'FB-'` prefix:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .like('code', 'FB-%');
   * ```
   *
   * @public
   */
  like(column: string, pattern: string): this;

  /**
   * Filters rows where text `column` case-sensitively matches every SQL `LIKE` pattern in `patterns` (`?column=like(all).{...}`).
   *
   * @remarks
   * Empty-array hazard: `patterns` is not validated client-side—passing an empty array `[]` sends
   * `like(all).{}`, which matches every row in the table. Guard dynamic lists with
   * `if (patterns.length > 0)` before chaining (especially in `update()` and `delete()` chains).
   *
   * Behavior and side effects: joins `patterns` with commas inside `{...}` without quoting (do not
   * pass patterns containing commas, double quotes, `{`, or `}`), and PostgREST rewrites `*` to
   * `%` (backslash-escape `\`, `%`, `_` in user input). Mutates URL query parameters in place
   * without network I/O and returns `this` (see {@link FilterBuilder.likeAnyOf} to match any pattern).
   *
   * @param column - Text PostgreSQL column name.
   * @param patterns - Non-empty list of SQL `LIKE` patterns that must all match `column` (not validated client-side; `[]` matches all rows).
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Match event codes that both start with `'FB-'` and end with `'-2026'`:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .likeAllOf('code', ['FB-%', '%-2026']);
   * ```
   *
   * @public
   */
  likeAllOf(column: string, patterns: readonly string[]): this;

  /**
   * Filters rows where text `column` case-sensitively matches at least one SQL `LIKE` pattern in `patterns` (`?column=like(any).{...}`).
   *
   * @remarks
   * Behavior and side effects: joins `patterns` with commas inside `{...}` without quoting (do not
   * pass patterns containing commas, double quotes, `{`, or `}`; passing `[]` sends `like(any).{}`,
   * matching zero rows), and PostgREST rewrites `*` to `%` (backslash-escape `\`, `%`, `_` in user
   * input). Mutates URL query parameters in place without network I/O and returns `this` (see
   * {@link FilterBuilder.likeAllOf} when every pattern must match).
   *
   * @param column - Text PostgreSQL column name.
   * @param patterns - List of SQL `LIKE` patterns where any match qualifies the row.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Match event codes starting with either `'KEYNOTE-'` or `'WORKSHOP-'`:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .likeAnyOf('code', ['KEYNOTE-%', 'WORKSHOP-%']);
   * ```
   *
   * @public
   */
  likeAnyOf(column: string, patterns: readonly string[]): this;

  /**
   * Filters rows where text `column` matches SQL `ILIKE` `pattern` case-insensitively (`?column=ilike.<pattern>`).
   *
   * @remarks
   * When to use: case-insensitive prefix, suffix, or substring matching using `%` and `_` SQL
   * wildcards (see {@link FilterBuilder.like} for case-sensitive `LIKE` or
   * {@link FilterBuilder.textSearch} for indexed full-text stemming search).
   *
   * Wildcard and escaping note: PostgREST rewrites every `*` in `pattern` to SQL `%`, so `*` always
   * acts as a multi-character wildcard. Backslash-escape `\`, `%`, and `_` in user-supplied input.
   *
   * Behavior and side effects: mutates this builder's URL query parameters in place without network
   * I/O and returns `this`.
   *
   * @param column - Text PostgreSQL column name or JSON text path (`metadata->>key`).
   * @param pattern - Case-insensitive SQL `ILIKE` pattern containing `%` or `_` wildcards (`*` is also rewritten to `%`).
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Search event titles containing `'summit'` regardless of case:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .ilike('title', '%summit%');
   * ```
   *
   * @public
   */
  ilike(column: string, pattern: string): this;

  /**
   * Filters rows where text `column` case-insensitively matches every SQL `ILIKE` pattern in `patterns` (`?column=ilike(all).{...}`).
   *
   * @remarks
   * Empty-array hazard: `patterns` is not validated client-side—passing an empty array `[]` sends
   * `ilike(all).{}`, which matches every row in the table. Guard dynamic lists with
   * `if (patterns.length > 0)` before chaining (especially in `update()` and `delete()` chains).
   *
   * Behavior and side effects: joins `patterns` with commas inside `{...}` without quoting (do not
   * pass patterns containing commas, double quotes, `{`, or `}`), and PostgREST rewrites `*` to
   * `%` (backslash-escape `\`, `%`, `_` in user input). Mutates URL query parameters in place
   * without network I/O and returns `this` (see {@link FilterBuilder.ilikeAnyOf} to match any pattern).
   *
   * @param column - Text PostgreSQL column name.
   * @param patterns - Non-empty list of SQL `ILIKE` patterns that must all match `column` (not validated client-side; `[]` matches all rows).
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Find events whose title mentions both `'firebase'` and `'workshop'` (any case):
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title')
   *   .ilikeAllOf('title', ['%firebase%', '%workshop%']);
   * ```
   *
   * @public
   */
  ilikeAllOf(column: string, patterns: readonly string[]): this;

  /**
   * Filters rows where text `column` case-insensitively matches at least one SQL `ILIKE` pattern in `patterns` (`?column=ilike(any).{...}`).
   *
   * @remarks
   * Behavior and side effects: joins `patterns` with commas inside `{...}` without quoting (do not
   * pass patterns containing commas, double quotes, `{`, or `}`; passing `[]` sends `ilike(any).{}`,
   * matching zero rows), and PostgREST rewrites `*` to `%` (backslash-escape `\`, `%`, `_` in user
   * input). Mutates URL query parameters in place without network I/O and returns `this` (see
   * {@link FilterBuilder.ilikeAllOf} when every pattern must match).
   *
   * @param column - Text PostgreSQL column name.
   * @param patterns - List of SQL `ILIKE` patterns where any match qualifies the row.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Find registrations with `@example.com` or `@google.com` email domains (case-insensitive):
   * ```ts
   * const res = await sql
   *   .from('registrations')
   *   .select('id, attendee_email, role')
   *   .ilikeAnyOf('attendee_email', ['%@example.com', '%@google.com']);
   * ```
   *
   * @public
   */
  ilikeAnyOf(column: string, patterns: readonly string[]): this;

  /**
   * Filters rows where text `column` matches POSIX regular expression `pattern` case-sensitively (`?column=match.<pattern>`, PostgreSQL `~` operator).
   *
   * @remarks
   * When to use: structural string validation (such as structured ticket codes or slugs) using
   * PostgreSQL POSIX regular expressions (see {@link FilterBuilder.regexIMatch} for
   * case-insensitive `~*`). Mutates URL query parameters in place without network I/O and returns `this`.
   *
   * @param column - Text PostgreSQL column name.
   * @param pattern - Case-sensitive PostgreSQL POSIX regular expression pattern.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Match uppercase event codes formatted as `EVT-` followed by 4 digits:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .regexMatch('code', '^EVT-[0-9]{4}$');
   * ```
   *
   * @public
   */
  regexMatch(column: string, pattern: string): this;

  /**
   * Filters rows where text `column` matches POSIX regular expression `pattern` case-insensitively (`?column=imatch.<pattern>`, PostgreSQL `~*` operator).
   *
   * @remarks
   * Behavior and side effects: mutates this builder's URL query parameters in place without network
   * I/O and returns `this` (see {@link FilterBuilder.regexMatch} for case-sensitive `~`).
   *
   * @param column - Text PostgreSQL column name.
   * @param pattern - Case-insensitive PostgreSQL POSIX regular expression pattern.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Match venue slugs ending in `-west` or `-east` regardless of case:
   * ```ts
   * const res = await sql
   *   .from('venues')
   *   .select('id, slug, name')
   *   .regexIMatch('slug', '-(west|east)$');
   * ```
   *
   * @public
   */
  regexIMatch(column: string, pattern: string): this;

  /**
   * Filters rows where `column` `IS NULL`, `IS TRUE`, or `IS FALSE` (`?column=is.<value>`).
   *
   * @remarks
   * When to use: testing nullable columns (`venue_id`, `checked_in_at`) against `null`, or testing
   * boolean columns (`is_featured`) with SQL `IS TRUE` / `IS FALSE` semantics.
   *
   * Do not use for `IS NOT NULL` (use {@link FilterBuilder.(not:1) | .not(column, 'is', null)}
   * instead) or for comparing strings or numbers (use {@link FilterBuilder.eq}).
   *
   * Behavior and side effects: mutates this builder's URL query parameters in place without network
   * I/O and returns `this`.
   *
   * @param column - PostgreSQL column name to test with SQL `IS`.
   * @param value - Literal `null`, `true`, or `false`.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Find registrations that have not checked in yet (`checked_in_at IS NULL`):
   * ```ts
   * const uncheckedRes = await sql
   *   .from('registrations')
   *   .select('id, attendee_email')
   *   .eq('event_id', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')
   *   .is('checked_in_at', null);
   * ```
   *
   * @public
   */
  is(column: string, value: boolean | null): this;

  /**
   * Filters rows where `column IS DISTINCT FROM value` (`?column=isdistinct.<value>`) for a non-null `value`.
   *
   * @remarks
   * When to use: null-including inequality checks against a non-null `value` (rows where
   * `column IS NULL` match because `NULL` is distinct from any non-null `value`; use
   * {@link FilterBuilder.neq} instead when `NULL` rows should be excluded).
   *
   * Do not pass `null` or `undefined`: `value` is interpolated into `isdistinct.${value}` as the
   * literal text `'null'` or `'undefined'`, causing PostgREST to emit `IS DISTINCT FROM 'null'` (a
   * string literal—matching `NULL` rows on `text` columns or failing with SQLSTATE `'22P02'` on
   * typed columns such as `uuid`). For `IS NOT NULL`, use
   * {@link FilterBuilder.(not:1) | .not(column, 'is', null)}; for `IS NULL`, use
   * {@link FilterBuilder.is | .is(column, null)}.
   *
   * Behavior and side effects: mutates this builder's URL query parameters in place without network
   * I/O and returns `this`.
   *
   * @param column - PostgreSQL column name to compare with `IS DISTINCT FROM`.
   * @param value - Non-null value to compare with `IS DISTINCT FROM`. Do not pass `null` or `undefined`: they are sent as the literal text `'null'`/`'undefined'` and compared as strings (or rejected with `'22P02'`). For `IS NOT NULL`, use {@link FilterBuilder.(not:1) | .not(column, 'is', null)}.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Match events assigned to a different venue or virtual events (`venue_id IS NULL`):
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, venue_id')
   *   .isDistinct('venue_id', '550e8400-e29b-41d4-a716-446655440000');
   * ```
   *
   * @public
   */
  isDistinct(column: string, value: unknown): this;

  /**
   * Filters rows where `column` equals any element in `values` (`?column=in.(...)`, SQL `IN`).
   *
   * @remarks
   * When to use: matching a scalar column against a finite set of non-null candidate IDs, slugs, or
   * enum strings (see {@link FilterBuilder.notIn} for exclusion).
   *
   * Do not use to filter PostgreSQL array columns (`tags text[]`) for element membership (use
   * {@link FilterBuilder.contains} or {@link FilterBuilder.overlaps}), and avoid passing hundreds
   * of UUIDs that push the URL length past HTTP header limits (chunk large lists or pass an array
   * parameter to a stored function via {@link FirebaseSql.rpc}).
   *
   * Do not pass `null` or `undefined` inside `values`: elements are interpolated as the literal
   * text `'null'` or `'undefined'` and compared as strings (or rejected with SQLSTATE `'22P02'` on
   * typed columns), not as SQL `NULL`. To match either a set of values or `NULL`, combine `in` and
   * `is.null` inside {@link FilterBuilder.or | .or()}.
   *
   * Behavior and side effects: deduplicates `values` via `Set`, wraps string elements containing
   * `,`, `(`, or `)` in double quotes (embedded `"` or `\` characters inside strings are not
   * escaped automatically), and mutates URL query parameters in place without network I/O. Passing
   * an empty array `[]` sends `in.()`, matching zero rows.
   *
   * @param column - Scalar PostgreSQL column name.
   * @param values - Non-null candidate scalar values to include.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Fetch events that are either `'draft'` or `'published'`:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, status')
   *   .in('status', ['draft', 'published']);
   * ```
   *
   * @public
   */
  in(column: string, values: readonly unknown[]): this;

  /**
   * Filters rows where `column` does not equal any element in `values` (`?column=not.in.(...)`, SQL `NOT IN`).
   *
   * @remarks
   * When to use: excluding a set of known non-null scalar values on a column (see
   * {@link FilterBuilder.in} for inclusion).
   *
   * Do not pass `null` or `undefined` inside `values`: elements are sent as the literal text
   * `'null'` or `'undefined'` and compared as strings (or rejected with SQLSTATE `'22P02'` on typed
   * columns), not as SQL `NULL`. Also note that SQL `NOT IN` excludes rows where `column IS NULL`;
   * to include `NULL` rows alongside non-matching values, combine with `is.null` inside
   * {@link FilterBuilder.or | .or()}.
   *
   * Behavior and side effects: deduplicates `values` via `Set`, wraps string elements containing
   * `,`, `(`, or `)` in double quotes (embedded `"` or `\` characters inside strings are not
   * escaped automatically), and mutates URL query parameters in place without network I/O.
   *
   * @param column - Scalar PostgreSQL column name.
   * @param values - Non-null scalar values to exclude.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Exclude cancelled and archived events:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title, status')
   *   .notIn('status', ['cancelled', 'archived']);
   * ```
   *
   * @public
   */
  notIn(column: string, values: readonly unknown[]): this;

  /**
   * Filters array, `jsonb`, or range `column` values that contain all elements, key-value pairs, or bounds of `value` (`?column=cs.<value>`, PostgreSQL `@>` operator).
   *
   * @remarks
   * When to use: on array columns (`tags text[]`), pass a non-empty JS array (such as
   * `['firebase', 'sql']`) to match rows whose array contains every listed element (for matching at
   * least one element, use {@link FilterBuilder.overlaps}; for inverse `<@` containment, use
   * {@link FilterBuilder.containedBy}). On `jsonb` columns (`metadata jsonb`), pass a plain JS
   * object (such as `{ track: 'ai' }`) to match JSON documents containing those key-value pairs. On
   * range columns (`schedule tstzrange`), pass a PostgreSQL range literal string; to test whether a
   * range contains a single point, pass a one-point inclusive range such as
   * `'[2026-10-15T09:30:00Z,2026-10-15T09:30:00Z]'` (passing a bare timestamp string fails with
   * SQLSTATE `'22P02'`).
   *
   * Empty-array hazard: array inputs are not validated client-side—passing an empty array `[]`
   * sends `cs.{}`, which matches every non-null array row in the table. Guard dynamic arrays with
   * `if (items.length > 0)` before chaining (especially in `update()` and `delete()` chains).
   *
   * Behavior and side effects: serializes strings verbatim, JS arrays via unquoted comma-joining
   * `{a,b}` (JS array elements are never quoted—if any element contains `,`, `"`, `{`, `}`, or
   * leading/trailing whitespace, pass a pre-quoted PostgreSQL array literal `string` such as
   * `'{"cloud, sql","ai"}'` instead of a JS array), and plain objects via `JSON.stringify`,
   * mutating URL query parameters in place without network I/O.
   *
   * @typeParam Value - Non-iterable plain object type when filtering `jsonb` columns.
   * @param column - PostgreSQL array (`text[]`), `jsonb`, or range (`tstzrange`) column name.
   * @param value - Non-empty JS array (for simple SQL array elements; not validated—`[]` matches all rows), plain object (for `jsonb`), or PostgreSQL range/array literal string.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Match events tagged with both `'firebase'` and `'postgres'`, and `jsonb` metadata `{ track: 'backend' }`:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, tags, metadata')
   *   .contains('tags', ['firebase', 'postgres'])
   *   .contains('metadata', { track: 'backend' });
   * ```
   *
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
   * When to use: on range columns (`schedule tstzrange`), pass a bounding window string
   * (`'[2026-10-15T00:00:00Z,2026-10-16T00:00:00Z)'`) to find events scheduled entirely inside that
   * window (use {@link FilterBuilder.overlaps} for partial overlap, or {@link FilterBuilder.contains}
   * for `@>` superset containment). On array columns (`tags text[]`), pass a superset JS array so
   * only rows whose elements are a subset of `value` match. On `jsonb` columns (`metadata jsonb`),
   * pass a superset plain object.
   *
   * Behavior and side effects: serializes strings verbatim, JS arrays via unquoted comma-joining
   * `{a,b}` (pass a pre-quoted PostgreSQL array literal `string` such as `'{"cloud, sql","ai"}'` if
   * elements contain `,`, `"`, `{`, `}`, or leading/trailing whitespace), and plain objects via
   * `JSON.stringify`, mutating URL query parameters in place without network I/O.
   *
   * @typeParam Value - Non-iterable plain object type when filtering `jsonb` columns.
   * @param column - PostgreSQL array, `jsonb`, or range column name.
   * @param value - Superset JS array, plain object, or PostgreSQL range/array literal string.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Find events scheduled entirely within a single conference day:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title, schedule')
   *   .containedBy('schedule', '[2026-10-15T00:00:00Z,2026-10-16T00:00:00Z)');
   * ```
   *
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
   * Filters PostgreSQL range `column` values positioned strictly right of (after) `range` (`?column=sr.<range>`, PostgreSQL `>>` operator).
   *
   * @remarks
   * When to use: finding ranges (`tstzrange`, `daterange`, `int4range`) where every point in
   * `column` is strictly greater than every point in `range` (see {@link FilterBuilder.rangeGte}
   * for `&>` and {@link FilterBuilder.rangeLt} for `<<`). Mutates URL query parameters in place
   * without network I/O and returns `this`.
   *
   * @param column - PostgreSQL range column name (such as `schedule`).
   * @param range - PostgreSQL range literal using `[` / `]` for inclusive bounds and `(` / `)` for exclusive bounds.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Find events starting strictly after a morning keynote slot ends:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, schedule')
   *   .rangeGt('schedule', '[2026-10-15T09:00:00Z,2026-10-15T10:00:00Z)');
   * ```
   *
   * @public
   */
  rangeGt(column: string, range: string): this;

  /**
   * Filters PostgreSQL range `column` values that do not extend to the left of `range` (`?column=nxl.<range>`, PostgreSQL `&>` operator).
   *
   * @remarks
   * When to use: matching ranges whose lower bound is greater than or equal to the lower bound of
   * `range` (see {@link FilterBuilder.rangeGt} for strictly-right-of `>>`). Mutates URL query
   * parameters in place without network I/O and returns `this`.
   *
   * @param column - PostgreSQL range column name (such as `schedule`).
   * @param range - PostgreSQL range literal (for example, `'[2026-10-15T09:00:00Z,2026-10-15T12:00:00Z)'`).
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Find events whose `schedule` does not start before `09:00 UTC`:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, schedule')
   *   .rangeGte('schedule', '[2026-10-15T09:00:00Z,2026-10-15T10:00:00Z)');
   * ```
   *
   * @public
   */
  rangeGte(column: string, range: string): this;

  /**
   * Filters PostgreSQL range `column` values positioned strictly left of (before) `range` (`?column=sl.<range>`, PostgreSQL `<<` operator).
   *
   * @remarks
   * When to use: finding ranges where every point in `column` is strictly less than every point in
   * `range` (see {@link FilterBuilder.rangeLte} for `&<` and {@link FilterBuilder.rangeGt} for `>>`).
   * Mutates URL query parameters in place without network I/O and returns `this`.
   *
   * @param column - PostgreSQL range column name (such as `schedule`).
   * @param range - PostgreSQL range literal using `[` / `]` (inclusive) and `(` / `)` (exclusive).
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Find events finishing strictly before an evening reception slot begins:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, schedule')
   *   .rangeLt('schedule', '[2026-10-15T18:00:00Z,2026-10-15T20:00:00Z)');
   * ```
   *
   * @public
   */
  rangeLt(column: string, range: string): this;

  /**
   * Filters PostgreSQL range `column` values that do not extend to the right of `range` (`?column=nxr.<range>`, PostgreSQL `&<` operator).
   *
   * @remarks
   * When to use: matching ranges whose upper bound is less than or equal to the upper bound of
   * `range` (see {@link FilterBuilder.rangeLt} for strictly-left-of `<<`). Mutates URL query
   * parameters in place without network I/O and returns `this`.
   *
   * @param column - PostgreSQL range column name (such as `schedule`).
   * @param range - PostgreSQL range literal (for example, `'[2026-10-15T09:00:00Z,2026-10-15T17:00:00Z)'`).
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Find events whose `schedule` ends no later than `17:00 UTC`:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, schedule')
   *   .rangeLte('schedule', '[2026-10-15T09:00:00Z,2026-10-15T17:00:00Z)');
   * ```
   *
   * @public
   */
  rangeLte(column: string, range: string): this;

  /**
   * Filters PostgreSQL range `column` values that are immediately adjacent to `range` with no gap and no overlap (`?column=adj.<range>`, PostgreSQL `-|-` operator).
   *
   * @remarks
   * Behavior and side effects: mutates this builder's URL query parameters in place without network
   * I/O and returns `this` (see {@link FilterBuilder.overlaps} for ranges sharing at least one
   * point in common).
   *
   * @param column - PostgreSQL range column name (such as `schedule`).
   * @param range - PostgreSQL range literal (for example, `'[2026-10-15T09:00:00Z,2026-10-15T10:00:00Z)'` is adjacent to `'[2026-10-15T10:00:00Z,2026-10-15T11:00:00Z)'`).
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Find sessions scheduled back-to-back with a `09:00–10:00 UTC` keynote:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, schedule')
   *   .rangeAdjacent('schedule', '[2026-10-15T09:00:00Z,2026-10-15T10:00:00Z)');
   * ```
   *
   * @public
   */
  rangeAdjacent(column: string, range: string): this;

  /**
   * Filters PostgreSQL array or range `column` values that share at least one element or point in common with `value` (`?column=ov.<value>`, PostgreSQL `&&` operator).
   *
   * @remarks
   * When to use: on array columns (`tags text[]`), match rows tagged with any tag in `value`
   * (logical `OR` across tags; use {@link FilterBuilder.contains} when every tag in `value` must be
   * present). On range columns (`schedule tstzrange`), detect schedule conflicts or find events
   * overlapping a time window.
   *
   * Do not use on `jsonb` columns—PostgreSQL's `&&` operator is defined on arrays and ranges, not
   * `jsonb` (use {@link FilterBuilder.contains} for `jsonb`).
   *
   * Behavior and side effects: serializes strings verbatim (for ranges or pre-quoted PostgreSQL
   * array literals such as `'{"cloud, sql","ai"}'`) and JS arrays via unquoted comma-joining
   * `{a,b}` (JS array elements are never quoted—do not pass JS array elements containing `,`, `"`,
   * `{`, `}`, or leading/trailing whitespace), mutating URL query parameters in place without
   * network I/O.
   *
   * @param column - PostgreSQL array (`text[]`) or range (`tstzrange`) column name.
   * @param value - JS array of simple candidate elements (for SQL arrays) or PostgreSQL range/array literal string.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Find events tagged `ai` or `serverless` that also overlap a 10:00–12:00 UTC slot:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, title, tags, schedule')
   *   .overlaps('tags', ['ai', 'serverless'])
   *   .overlaps('schedule', '[2026-10-15T10:00:00Z,2026-10-15T12:00:00Z)');
   * ```
   *
   * @public
   */
  overlaps(column: string, value: string | readonly unknown[]): this;

  /**
   * Filters `tsvector` or `text` `column` values matching full-text search `query` (`?column=[pl|ph|w]fts[(config)].<query>`, PostgreSQL `@@` operator).
   *
   * @remarks
   * When to use: stemmed, natural-language full-text search against indexed `tsvector` columns
   * (such as `events.search_doc`) or `text` columns. Always pass `{ type: 'websearch' }` (or
   * `'plain'` / `'phrase'`) in {@link FilterTextSearchOptions} when `query` comes from raw user
   * input; omitting `options.type` uses PostgreSQL `to_tsquery`, which fails with a syntax error if
   * `query` is not valid `tsquery` boolean syntax (such as `'firebase' & 'sql'`).
   *
   * Behavior and side effects: mutates this builder's URL query parameters in place without network
   * I/O and returns `this`.
   *
   * @param column - PostgreSQL `tsvector` or `text` column name.
   * @param query - Search query string interpreted according to `options.type`.
   * @param options - Optional text search dictionary (`config`) and parser mode (`type`, see {@link FilterTextSearchType}). See {@link FilterTextSearchOptions}.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Search `events.search_doc` safely from user input using `'websearch'` mode:
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
   * When to use: concise multi-column equality filtering from a plain criteria object (see
   * {@link FilterBuilder.eq} for single-column equality). Properties whose value is `undefined` are
   * automatically omitted.
   *
   * Do not pass `null` property values—`match({ venue_id: null })` emits `?venue_id=eq.null`
   * instead of `IS NULL`; use {@link FilterBuilder.is | .is('venue_id', null)} for `NULL` checks.
   *
   * Behavior and side effects: mutates this builder's URL query parameters in place without network
   * I/O and returns `this`.
   *
   * @typeParam Query - Non-iterable plain object mapping column names to expected values.
   * @param query - Plain object of `{ column: value }` equality predicates (`undefined` values are skipped).
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Match featured published events using a single object:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .match({ status: 'published', is_featured: true });
   * ```
   *
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
   * When to use: excluding `NULL` values on nullable columns (such as `events.venue_id` or
   * `registrations.checked_in_at`; see {@link FilterBuilder.is} for `IS NULL` checks). On default
   * untyped chains (`T = Array<Record<string, unknown>>`), declare the narrowed column as non-null
   * directly in your terminal `.overrideTypes<Row[], { merge: false }>()` interface
   * (`NarrowResultColumn` only narrows pre-typed `FilterBuilder<Row[]>` references).
   *
   * Behavior and side effects: mutates this builder's URL query parameters in place without network
   * I/O and returns `this`.
   *
   * @typeParam ColumnName - Literal column name key to narrow to `NonNullable` in `T`.
   * @param column - PostgreSQL column name that must be non-null.
   * @param operator - Must be `'is'` for `IS NOT NULL` type narrowing.
   * @param value - Must be `null`.
   * @returns This {@link FilterBuilder} with `T`'s `ColumnName` property narrowed to `NonNullable`.
   *
   * @example
   * Exclude virtual events (`venue_id IS NOT NULL`):
   * ```ts
   * const inPersonRes = await sql
   *   .from('events')
   *   .select('id, title, venue_id')
   *   .not('venue_id', 'is', null)
   *   .overrideTypes<Array<{ id: string; title: string; venue_id: string }>, { merge: false }>();
   * ```
   *
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
   * When to use: negating operators that lack a dedicated negated helper (for example,
   * `.not('tags', 'cs', '{archived}')` or `.not('title', 'ilike', '%test%')`; prefer
   * {@link FilterBuilder.neq} and {@link FilterBuilder.notIn} for simple inequality and list
   * exclusion).
   *
   * Behavior and side effects: appends `not.${operator}.${value}` verbatim to URL query parameter
   * `column` with no quoting or escaping—sanitize untrusted user input, and format list/array
   * operands in PostgREST wire syntax (such as `'(draft,cancelled)'` for `'in'`).
   *
   * @param column - PostgreSQL column name to filter.
   * @param operator - PostgREST {@link FilterOperator} name (such as `'eq'`, `'ilike'`, `'cs'`, `'ov'`).
   * @param value - Raw PostgREST operand formatted for `operator` (interpolated verbatim).
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Exclude archived events:
   * ```ts
   * const activeRes = await sql
   *   .from('events')
   *   .select('id, code, status')
   *   .not('status', 'eq', 'archived');
   * ```
   *
   * @public
   */
  not(
    column: string,
    operator: FilterOperator | (string & {}),
    value: unknown
  ): this;

  /**
   * Filters rows satisfying at least one comma-separated raw PostgREST predicate (`?or=(<filters>)` or `?<referencedTable>.or=(<filters>)`).
   *
   * @remarks
   * When to use: logical `OR` conditions (including nested `and(...)` groups such as
   * `'is_featured.eq.true,and(status.eq.published,ticket_price.eq.0)'`). Cannot span columns from
   * different tables in a single `.or()` expression; pass `{ referencedTable }` in
   * {@link FilterOrOptions} to scope an `.or()` expression to one embedded relation.
   *
   * Security and escaping warning: `filters` is inserted verbatim inside `or=(...)`; the SDK
   * performs no escaping. Because PostgREST terminates a double-quoted operand at the next
   * unescaped `"`, double-quoting alone is insufficient for untrusted input—wrap every untrusted
   * string operand in double quotes and backslash-escape both `\` and `"` inside it (see second
   * example below).
   *
   * Behavior and side effects: mutates this builder's URL query parameters in place without network
   * I/O and returns `this`.
   *
   * @param filters - Comma-separated PostgREST filter expressions (without surrounding `or=(...)` parentheses).
   * @param options - Optional `referencedTable` to scope the disjunction to an embedded relation. See {@link FilterOrOptions}.
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Match events that are either free (`ticket_price = 0`) or featured and under $50:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title, ticket_price, is_featured')
   *   .eq('status', 'published')
   *   .or('ticket_price.eq.0,and(is_featured.eq.true,ticket_price.lt.50)');
   * ```
   *
   * @example
   * Safely quote and escape untrusted user input inside `.or()`:
   * ```ts
   * const quoteOrValue = (raw: string): string =>
   *   '"' + raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
   *
   * const searchTerm = 'Firebase "SQL", Live';
   * const quoted = quoteOrValue(searchTerm);
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .or(`title.eq.${quoted},code.eq.${quoted}`);
   * ```
   *
   * @public
   */
  or(filters: string, options?: Readonly<FilterOrOptions> | undefined): this;

  /**
   * Appends a raw PostgREST filter parameter (`?column=<operator>.<value>`) for built-in PostgREST operator forms without a dedicated method.
   *
   * @remarks
   * When to use: invoking built-in PostgREST operator variants without a dedicated helper method,
   * such as quantified operators (`'eq(any)'`, `'like(all)'`) or negated operators (`'not.ov'`).
   * PostgREST supports only its built-in operators (see {@link FilterOperator}); unsupported
   * operator names fail with HTTP `400` (`'PGRST100'`).
   *
   * Prefer dedicated methods ({@link FilterBuilder.eq}, {@link FilterBuilder.in},
   * {@link FilterBuilder.contains}, {@link FilterBuilder.is}) when available, while noting that
   * those helpers also insert values nearly verbatim: only `in()` and `notIn()` add double quotes
   * (for string elements containing `,`, `(`, or `)`), and `contains()`, `containedBy()`, and
   * `overlaps()` never quote array elements. Filtering an embedded column (`'venues.city'`) filters
   * only the embedded rows unless the relation is selected with `!inner`.
   *
   * Behavior and side effects: appends `${operator}.${value}` verbatim to URL query parameter
   * `column` without quoting or escaping `value`, and returns `this`.
   *
   * @param column - PostgreSQL column name, JSON path, or `embedded_table.column` reference.
   * @param operator - Built-in PostgREST {@link FilterOperator} (optionally prefixed with `'not.'` or quantified such as `'eq(any)'`).
   * @param value - Raw PostgREST-formatted operand (such as `'(speaker,organizer)'` for `'in'` or `'{ai,sql}'` for `'cs'`).
   * @returns This {@link FilterBuilder} for continued chaining.
   *
   * @example
   * Apply a raw PostgREST `'eq(any)'` quantifier filter on `events.status`:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, status')
   *   .filter('status', 'eq(any)', '{draft,published}');
   * ```
   *
   * @public
   */
  filter(
    column: string,
    operator: `${'' | 'not.'}${FilterOperator}` | (string & {}),
    value: unknown
  ): this;
}
