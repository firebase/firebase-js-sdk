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
/**
 * Row-counting strategy sent in the PostgREST `Prefer: count=<strategy>` request header.
 *
 * @remarks
 * Controls how `result.count` on {@link OperationSuccess} is computed. `'exact'` executes a full
 * `COUNT(*)` query (accurate at any scale, incurs table or index scan cost). `'planned'` reads row
 * estimates from PostgreSQL planner statistics (`EXPLAIN`; near-zero overhead, approximate).
 * `'estimated'` uses `'exact'` below PostgREST's `db-max-rows` threshold and `'planned'` above it.
 *
 * Only the exact lowercase literals `'exact'`, `'planned'`, and `'estimated'` (case-sensitive)
 * populate `result.count`; any other string is sent verbatim in `Prefer: count=<value>` while
 * `result.count` remains `null`. When combined with {@link TransformBuilder.limit} or
 * {@link TransformBuilder.range}, `result.count` reflects total rows matching the query filters
 * prior to pagination, not `result.data.length`.
 *
 * @example
 * Request an estimated total row count:
 * ```ts
 * import type { QueryCountStrategy } from 'firebase/sql';
 *
 * const strategy: QueryCountStrategy = 'estimated';
 * const res = await sql.from('events').select('id', { count: strategy }).limit(20);
 * if (res.success) {
 *   console.log('Estimated total:', res.count);
 * }
 * ```
 *
 * @public
 */
export type QueryCountStrategy =
  'exact' | 'planned' | 'estimated' | (string & {});

/**
 * Execution options for {@link QueryBuilder.select}.
 *
 * @example
 * Request an exact row count via a metadata-only `HEAD` request:
 * ```ts
 * import type { QuerySelectOptions } from 'firebase/sql';
 *
 * const selectOpts: QuerySelectOptions = { head: true, count: 'exact' };
 * const res = await sql.from('events').select('*', selectOpts);
 * if (res.success && res.count !== null) {
 *   console.log('Exact row count:', res.count);
 * }
 * ```
 *
 * @public
 */
export interface QuerySelectOptions {
  /**
   * Sends an HTTP `HEAD` request so PostgREST returns headers (including `count`) with an empty body (`result.data` resolves to `null`).
   *
   * @remarks
   * Defaults to `false`. Combine with `count: 'exact'` (or `'estimated'`) to count matching rows
   * without transferring row payloads.
   *
   * Compile-time type caveat: setting `head: true` does not narrow the static TypeScript type of
   * `result.data` away from `Array<Record<string, unknown>>`, even though `result.data` is `null`
   * at runtime—read `result.count` only and never access array properties (such as `.length`) on
   * `result.data`.
   *
   * Empty-body `HEAD` error caveat: because `HEAD` responses have no body, an HTTP `404` (such as a
   * misspelled or unexposed table) is normalized to `status: 204` with `success: true` and
   * `count: null`, and other `HEAD` failures carry no PostgREST or SQLSTATE error code (mapping to
   * category `'sql-platform'`). Always treat `count === null` as a failed count when `count` was
   * requested with `head: true`.
   */
  head?: boolean | undefined;

  /**
   * Row-counting algorithm used to populate `result.count` on {@link OperationSuccess}.
   *
   * @remarks
   * Defaults to `undefined` (PostgREST does not compute a total count and `result.count` is `null`).
   * Only exact lowercase `'exact'`, `'planned'`, or `'estimated'` populate `result.count`.
   */
  count?: QueryCountStrategy | undefined;
}

/**
 * Execution options for {@link QueryBuilder.insert}.
 *
 * @example
 * Preserve PostgreSQL column `DEFAULT` expressions on sparse bulk inserts:
 * ```ts
 * import type { QueryInsertOptions } from 'firebase/sql';
 *
 * const insertOpts: QueryInsertOptions = { defaultToNull: false, count: 'exact' };
 * const res = await sql.from('events').insert(
 *   [
 *     { code: 'EVT-1', title: 'Keynote', schedule: '[2026-10-15T09:00:00Z,2026-10-15T10:00:00Z)' },
 *     { code: 'EVT-2', title: 'Workshop', status: 'published', schedule: '[2026-10-15T11:00:00Z,2026-10-15T13:00:00Z)' }
 *   ],
 *   insertOpts
 * );
 * if (!res.success) {
 *   console.error('Bulk insert failed:', res.error.code, res.error.message);
 * }
 * ```
 *
 * @public
 */
export interface QueryInsertOptions {
  /**
   * Row-counting algorithm used to populate `result.count` with the number of inserted rows.
   *
   * @remarks
   * Defaults to `undefined` (`result.count` is `null`). Only exact lowercase `'exact'`, `'planned'`,
   * or `'estimated'` populate `result.count`.
   */
  count?: QueryCountStrategy | undefined;

  /**
   * Controls how omitted columns in bulk array inserts are populated by PostgreSQL.
   *
   * @remarks
   * Defaults to `true`. Only affects array inputs (single-object `insert({...})` never sets
   * `?columns=...` and always uses PostgreSQL column `DEFAULT` expressions for omitted keys).
   *
   * When inserting an array of objects, the SDK sets `?columns="..."` to the `Object.keys(...)`
   * union across all elements. When `defaultToNull` is `true` (default), omitted keys (or keys
   * explicitly set to `undefined`, which `Object.keys` includes in `?columns` while `JSON.stringify`
   * strips from the body) are inserted as `NULL`. When `defaultToNull` is `false`, the SDK appends
   * `Prefer: missing=default` so PostgreSQL applies each column's schema `DEFAULT` expression
   * instead of `NULL`.
   */
  defaultToNull?: boolean | undefined;
}

/**
 * Conflict-resolution and execution options for {@link QueryBuilder.upsert}.
 *
 * @example
 * Configure conflict resolution on a composite unique key:
 * ```ts
 * import type { QueryUpsertOptions } from 'firebase/sql';
 *
 * const upsertOpts: QueryUpsertOptions = {
 *   onConflict: 'event_id,attendee_email',
 *   ignoreDuplicates: false,
 *   count: 'exact'
 * };
 *
 * const res = await sql.from('registrations').upsert(
 *   {
 *     event_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
 *     user_uid: 'uid_alice',
 *     attendee_email: 'alice@example.com',
 *     role: 'speaker'
 *   },
 *   upsertOpts
 * );
 * if (!res.success) {
 *   console.error('Upsert failed:', res.error.code, res.error.message);
 * }
 * ```
 *
 * @public
 */
export interface QueryUpsertOptions {
  /**
   * Comma-separated column name(s) forming a `PRIMARY KEY` or `UNIQUE` constraint used to detect conflicts (sent as `?on_conflict=...`).
   *
   * @remarks
   * Defaults to `undefined` (PostgREST defaults conflict detection to the table's primary key). Do
   * not include spaces around commas (for example, `'event_id,attendee_email'`, or `'code'` for a
   * single column).
   */
  onConflict?: string | undefined;

  /**
   * Conflict action applied when an incoming row matches an existing row on `onConflict` (or primary key).
   *
   * @remarks
   * Defaults to `false`, which sends `Prefer: resolution=merge-duplicates` (`ON CONFLICT DO UPDATE`),
   * updating every column in the payload (and for bulk arrays, every key in the `?columns` union
   * across all elements) on the conflicting row. Setting `true` sends
   * `Prefer: resolution=ignore-duplicates` (`ON CONFLICT DO NOTHING`), skipping conflicting rows.
   */
  ignoreDuplicates?: boolean | undefined;

  /**
   * Row-counting algorithm used to populate `result.count` with the number of affected rows.
   *
   * @remarks
   * Defaults to `undefined` (`result.count` is `null`). Only exact lowercase `'exact'`, `'planned'`,
   * or `'estimated'` populate `result.count`.
   */
  count?: QueryCountStrategy | undefined;

  /**
   * Controls the value used for keys omitted by an array element (or set to `undefined`): `NULL` when `true` (default), or the PostgreSQL column `DEFAULT` expression when `false` (`Prefer: missing=default`).
   *
   * @remarks
   * Defaults to `true`. On `merge-duplicates` (`ignoreDuplicates: false`) conflicts, PostgREST emits
   * `DO UPDATE SET <col> = EXCLUDED.<col>` for every column in `?columns`. Because bulk arrays set
   * `?columns` to the union of keys across all elements, an omitted key on a conflicting row
   * overwrites the existing database column with `NULL` (`true`) or the column `DEFAULT` (`false`)—it
   * does not preserve the existing row's value. Give every element in a bulk upsert array the exact
   * same keys, or split batches by key set. Has no effect on single-object upserts.
   */
  defaultToNull?: boolean | undefined;
}

/**
 * Execution options for {@link QueryBuilder.update}.
 *
 * @example
 * Count rows modified by an `update()`:
 * ```ts
 * import type { QueryUpdateOptions } from 'firebase/sql';
 *
 * const updateOpts: QueryUpdateOptions = { count: 'exact' };
 * const res = await sql
 *   .from('events')
 *   .update({ is_featured: false }, updateOpts)
 *   .eq('status', 'archived');
 * if (!res.success) {
 *   console.error('Update failed:', res.error.message);
 * }
 * ```
 *
 * @public
 */
export interface QueryUpdateOptions {
  /**
   * Row-counting algorithm used to populate `result.count` with the number of updated rows.
   *
   * @remarks
   * Defaults to `undefined` (`result.count` is `null`). Only exact lowercase `'exact'`, `'planned'`,
   * or `'estimated'` populate `result.count`.
   */
  count?: QueryCountStrategy | undefined;
}

/**
 * Execution options for {@link QueryBuilder.delete}.
 *
 * @example
 * Count rows removed by a `delete()`:
 * ```ts
 * import type { QueryDeleteOptions } from 'firebase/sql';
 *
 * const deleteOpts: QueryDeleteOptions = { count: 'exact' };
 * const res = await sql
 *   .from('events')
 *   .delete(deleteOpts)
 *   .eq('status', 'cancelled');
 * if (!res.success) {
 *   console.error('Delete failed:', res.error.message);
 * }
 * ```
 *
 * @public
 */
export interface QueryDeleteOptions {
  /**
   * Row-counting algorithm used to populate `result.count` with the number of deleted rows.
   *
   * @remarks
   * Defaults to `undefined` (`result.count` is `null`). Only exact lowercase `'exact'`, `'planned'`,
   * or `'estimated'` populate `result.count`.
   */
  count?: QueryCountStrategy | undefined;
}

/**
 * Compile-time constraint rejecting iterable types (`Array`, `Map`, `Set`, `string`) by forbidding `[Symbol.iterator]`; does not by itself require `T` to be a plain object unless intersected with `object`.
 *
 * @typeParam T - Type to constrain against `[Symbol.iterator]`.
 *
 * @example
 * Constrain a generic patch helper to non-iterable single-row objects:
 * ```ts
 * import type { NonIterable } from 'firebase/sql';
 *
 * function patchEvent<Patch extends NonIterable<Record<string, unknown>>>(id: string, patch: Patch) {
 *   return sql.from('events').update(patch).eq('id', id);
 * }
 * ```
 *
 * @public
 */
export type NonIterable<T> = T & { readonly [Symbol.iterator]?: never };

/**
 * Entry builder scoped to a single PostgreSQL table or view, returned by {@link FirebaseSql.from}.
 *
 * @remarks
 * Stateless and safely reusable: every verb method (`select`, `insert`, `upsert`, `update`, `delete`)
 * clones the underlying URL and headers before returning a fresh lazy {@link FilterBuilder}.
 *
 * @example
 * Store a reusable `QueryBuilder` for a table:
 * ```ts
 * import type { QueryBuilder } from 'firebase/sql';
 *
 * const venues: QueryBuilder = sql.from('venues');
 * const seattleVenues = await venues.select('id, slug, name').eq('city', 'Seattle');
 * ```
 *
 * @public
 */
export interface QueryBuilder {
  /**
   * Starts a lazy `SELECT` (`GET` or `HEAD`) query on the target table or view, supporting column
   * projection, aliases, JSON path extraction, and embedded foreign-key joins.
   *
   * @remarks
   * When to use: reading rows, embedding parent/child relations via foreign keys, or counting
   * matching rows (`{ head: true, count: 'exact' }`). Chain {@link FilterBuilder} predicates and
   * {@link TransformBuilder} ordering/pagination methods before awaiting.
   *
   * Do not use to return mutated rows from `insert`, `upsert`, `update`, or `delete`—call
   * {@link TransformBuilder.select} after those mutation verbs instead.
   *
   * Behavior and side effects: builder progression is
   * `QueryBuilder -> FilterBuilder<Array<Record<string, unknown>>, 'GET', false>`. Lazy—performs no
   * network I/O until `await`ed or `.then()` is invoked (each `await` sends a new HTTP request).
   * Unquoted whitespace in `columns` is stripped automatically while preserving whitespace inside
   * double-quoted identifiers (such as `'id, "display name"'`). Untyped `data` defaults to
   * `Array<Record<string, unknown>>`; chain `.overrideTypes<MyRow[], { merge: false }>()` at the
   * end of the chain—or `.single()` + `.overrideTypes<MyRow, { merge: false }>()` for single-row
   * lookups—to strongly type `result.data`. Automatic retries (`retry(true)`) are enabled by
   * default for transient network errors and HTTP `503`/`520` responses.
   *
   * `head: true` caveats: when `options.head` is `true`, `result.data` resolves to `null` at
   * runtime even though TypeScript still statically types `result.data` as
   * `Array<Record<string, unknown>>`—never access `.length` on `result.data`. Because `HEAD`
   * responses carry no body, an HTTP `404` (for example, an unknown table) resolves as
   * `status: 204` with `success: true` and `count: null`, and other `HEAD` failures carry no
   * PostgREST/SQLSTATE code (mapping to `'sql-platform'`); treat `count === null` as a failure when
   * `count` was requested.
   *
   * Embedded relation syntax and `.overrideTypes()` shapes: many-to-one (FK on parent, such as
   * `events.venue_id -> venues.id`) or one-to-one (`UNIQUE` FK) embeds resolve to
   * `RelatedRow | null` by default, or non-null `RelatedRow` when `!inner` is appended
   * (`'venue:venues!inner(name, city)'`). One-to-many (FK on child, such as
   * `registrations.event_id -> events.id`) or many-to-many embeds resolve to `RelatedRow[]` (`[]`
   * when empty, never `null`). Use an empty `!inner()` projection
   * (`select('id, title, venues!inner()').eq('venues.city', 'Seattle')`) to filter parent rows
   * without returning child columns, or `select('id, title, registrations(count)')` to receive
   * `registrations: Array<{ count: number }>`. Place `!fkey_name` before `!inner`
   * (`'venue:venues!events_venue_id_fkey!inner(name)'`), and once aliased (`venue:venues(...)`),
   * reference the alias in filters and transforms (`'venue.city'`, `{ referencedTable: 'venue' }`).
   *
   * `jsonb` operators (`->` vs. `->>`): single-arrow `'level:metadata->level'` extracts a typed
   * JSON value (`number | boolean | object | null`) for numeric/boolean comparisons and numeric
   * sorting; double-arrow `'track:metadata->>track'` extracts plain `text` (`string | null`) for
   * string equality (`.eq()`) and pattern matching (`.ilike()`).
   *
   * Error handling: resolves to {@link OperationFailure} (`{ success: false, error: FirebaseSqlError }`)
   * on invalid column names (`'42703'`), ambiguous foreign-key embeddings (`'PGRST201'`—disambiguate
   * using `alias:table!fkey_name(...)` from `error.hint`), out-of-bounds `.range()` offsets
   * (`'PGRST103'`, HTTP `416`), missing table privileges (`'42501'`; note that PostgreSQL Row-Level
   * Security `USING` policies never raise errors on reads—they silently omit unauthorized rows and
   * return `200`), or gateway auth failures (`Code.UNAUTHORIZED`). Chain
   * {@link Builder.throwOnError} to reject instead.
   *
   * @param columns - Comma-separated PostgREST projection string (defaults to `'*'`). Supports aliases (`'eventCode:code'`), JSON operators (`'metadata->level, metadata->>track'`), and foreign-table embeddings (`'*, venue:venues(name, city), registrations(attendee_email, role)'` or `'venues!inner(city)'`).
   * @param options - Optional `head` (metadata-only `HEAD` request) and `count` strategy. See {@link QuerySelectOptions}.
   * @returns A lazy {@link FilterBuilder} for chaining row filters, ordering, pagination, and type overrides.
   *
   * @example
   * Full `SELECT` chain with filters, embedded relations, type narrowing, pagination, and exact count:
   * ```ts
   * interface EventFeedItem {
   *   id: string;
   *   code: string;
   *   title: string;
   *   ticket_price: number;
   *   venue_id: string;
   *   venue: { name: string; city: string } | null;
   *   registrations: Array<{ attendee_email: string; role: 'attendee' | 'speaker' | 'organizer' }>;
   * }
   *
   * const result = await sql
   *   .from('events')
   *   .select(
   *     'id, code, title, ticket_price, venue_id, venue:venues(name, city), registrations(attendee_email, role)',
   *     { count: 'exact' }
   *   )
   *   .eq('status', 'published')
   *   .not('venue_id', 'is', null)
   *   .order('created_at', { ascending: false })
   *   .order('checked_in_at', {
   *     referencedTable: 'registrations',
   *     ascending: false,
   *     nullsFirst: false
   *   })
   *   .limit(5, { referencedTable: 'registrations' })
   *   .range(0, 19)
   *   .overrideTypes<EventFeedItem[], { merge: false }>();
   *
   * if (!result.success) {
   *   console.error(`[${result.error.category}] ${result.error.code}: ${result.error.message}`);
   * } else {
   *   const page: EventFeedItem[] = result.data;
   *   const totalCount: number | null = result.count;
   *   console.log(`Loaded ${page.length} of ${totalCount} published events`);
   * }
   * ```
   *
   * @example
   * Filter parent rows by an embedded foreign table using `!inner` join:
   * ```ts
   * // Without `!inner`, non-matching venues return `venue: null` while keeping parent event rows.
   * // With `!inner`, only events hosted at a venue in Seattle are returned.
   * const seattleEvents = await sql
   *   .from('events')
   *   .select('id, code, title, venue:venues!inner(name, city)')
   *   .eq('venue.city', 'Seattle')
   *   .overrideTypes<
   *     Array<{ id: string; code: string; title: string; venue: { name: string; city: string } }>,
   *     { merge: false }
   *   >();
   * ```
   *
   * @example
   * Column aliasing and `jsonb` path extraction (`->>` as text vs. `->` as typed JSON):
   * ```ts
   * const tracksRes = await sql
   *   .from('events')
   *   .select('id, eventCode:code, track:metadata->>track, level:metadata->level')
   *   .eq('status', 'published')
   *   .overrideTypes<
   *     Array<{ id: string; eventCode: string; track: string | null; level: number | null }>,
   *     { merge: false }
   *   >();
   * ```
   *
   * @example
   * Count-only query without transferring row payloads (`head: true`):
   * ```ts
   * const countRes = await sql
   *   .from('registrations')
   *   .select('*', { head: true, count: 'exact' })
   *   .eq('event_id', '6ba7b810-9dad-11d1-80b4-00c04fd430c8');
   *
   * if (countRes.success && countRes.count !== null) {
   *   console.log('Total registrations:', countRes.count); // countRes.data is null at runtime
   * }
   * ```
   *
   * @public
   */
  select(
    columns?: string | undefined,
    options?: Readonly<QuerySelectOptions> | undefined
  ): FilterBuilder<Array<Record<string, unknown>>, 'GET'>;

  /**
   * Starts a lazy `INSERT` (`POST`) operation to create a single row or a bulk batch of rows.
   *
   * @remarks
   * When to use: inserting new records that must fail on primary-key or unique-constraint collisions.
   *
   * Do not use for idempotent insert-or-update workflows where existing rows should be merged or
   * skipped on conflict; use {@link QueryBuilder.upsert} instead.
   *
   * Behavior and side effects: builder progression is `QueryBuilder -> FilterBuilder<null, 'POST', false>`.
   * Each `await` or `.then()` call sends a new `POST` request; awaiting an `insert()` builder more
   * than once duplicates inserted rows, so await each mutation builder at most once.
   *
   * Returns `null` by default: PostgREST omits inserted row payloads (`status: 201`, `data: null`)
   * unless you chain {@link TransformBuilder.select | .select(columns?)} to send
   * `Prefer: return=representation`.
   *
   * Single-object inputs automatically apply PostgreSQL column `DEFAULT` values for omitted keys.
   * For array inputs, the SDK computes `?columns="..."` as the union of `Object.keys(...)` across
   * all elements (in `O(rows^2)` time on the client thread—chunk large bulk inserts to at most
   * `1,000` rows per call); pass `{ defaultToNull: false }` (and avoid `{ key: undefined }`
   * properties) so omitted keys in sparse array elements receive PostgreSQL `DEFAULT` values
   * instead of `NULL`. Automatic transient-error retries are not performed for `POST` requests
   * (except a single automatic Firebase Auth token refresh retry on HTTP 401).
   *
   * Error handling: unique-constraint or primary-key conflicts resolve to {@link OperationFailure}
   * with SQLSTATE `code === '23505'` (`category === 'sql-postgrest'`, HTTP 409); inspect
   * `error.details` for the conflicting key or switch to {@link QueryBuilder.upsert}. Chain
   * {@link Builder.throwOnError} to throw {@link FirebaseSqlError} instead.
   *
   * @typeParam Row - Non-iterable row object type being inserted.
   * @param values - Single row object or readonly array of row objects to insert. Serialized via `JSON.stringify` (`bigint` values serialize via `.toString()`, `undefined` property values and functions are omitted, `NaN`/`Infinity` serialize as `null`, `Date` serializes to ISO-8601, and circular references resolve at `await` time as `res.status === 0`, `res.error.category === 'sql-client'`, `res.error.code === 'other'`).
   * @param options - Optional `count` strategy and `defaultToNull` handling for sparse bulk inserts. See {@link QueryInsertOptions}.
   * @returns A lazy {@link FilterBuilder} with `data` typed as `null` until `.select()` is chained.
   *
   * @example
   * Full `INSERT` chain creating a row with DB defaults, returning a single typed record, and throwing on error:
   * ```ts
   * import { FirebaseSqlError } from 'firebase/sql';
   *
   * interface CreatedEvent {
   *   id: string;
   *   code: string;
   *   title: string;
   *   status: 'draft' | 'published' | 'cancelled' | 'archived';
   *   created_at: string;
   * }
   *
   * try {
   *   const { data: created } = await sql
   *     .from('events')
   *     .insert({
   *       venue_id: '8f14e45f-ceea-467a-9538-1536b58f2b01',
   *       code: 'FIREBASE-SUMMIT-2026',
   *       title: 'Firebase SQL Deep Dive',
   *       ticket_price: 49.0,
   *       tags: ['firebase', 'postgres'],
   *       metadata: { track: 'backend', level: 300 },
   *       schedule: '[2026-10-15T16:00:00Z,2026-10-15T18:00:00Z)'
   *     })
   *     .select('id, code, title, status, created_at')
   *     .single()
   *     .overrideTypes<CreatedEvent, { merge: false }>()
   *     .throwOnError();
   *
   *   console.log('Created event:', created.id, created.status);
   * } catch (err) {
   *   if (err instanceof FirebaseSqlError) {
   *     console.error(err.code, err.details, err.hint);
   *   }
   * }
   * ```
   *
   * @example
   * Bulk insert sparse rows preserving PostgreSQL `DEFAULT` values (`defaultToNull: false`):
   * ```ts
   * const batchRes = await sql
   *   .from('registrations')
   *   .insert(
   *     [
   *       // Omitted `role` receives PostgreSQL DEFAULT `'attendee'` instead of NULL
   *       {
   *         event_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
   *         user_uid: 'uid_dan',
   *         attendee_email: 'dan@example.com'
   *       },
   *       {
   *         event_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
   *         user_uid: 'uid_erin',
   *         attendee_email: 'erin@example.com',
   *         role: 'organizer'
   *       }
   *     ],
   *     { defaultToNull: false, count: 'exact' }
   *   )
   *   .select('id, attendee_email, role')
   *   .overrideTypes<
   *     Array<{ id: string; attendee_email: string; role: 'attendee' | 'speaker' | 'organizer' }>,
   *     { merge: false }
   *   >();
   *
   * if (!batchRes.success) {
   *   console.error('Batch insert failed:', batchRes.error.code, batchRes.error.message);
   * }
   * ```
   *
   * @example
   * Minimal insert without returning row payloads (`data` is `null`) and duplicate-key check:
   * ```ts
   * const res = await sql.from('venues').insert({
   *   slug: 'moscone-west',
   *   name: 'Moscone West',
   *   city: 'San Francisco',
   *   capacity: 2500
   * });
   *
   * if (!res.success && res.error.code === '23505') {
   *   console.warn('Venue slug already exists:', res.error.details);
   * }
   * ```
   *
   * @public
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
   * Starts a lazy `UPSERT` (`POST` with `Prefer: resolution=merge-duplicates` or `ignore-duplicates`)
   * to insert rows or resolve conflicts on a primary key or unique constraint.
   *
   * @remarks
   * When to use: idempotent writes, synchronization jobs, or create-or-update operations keyed on a
   * primary key (`id`), single unique column (`code`, `slug`), or composite unique constraint
   * (`event_id,attendee_email`). See {@link QueryUpsertOptions}.
   *
   * Do not use for partial updates to existing rows when non-nullable `INSERT` columns are unknown;
   * because PostgreSQL evaluates `INSERT` constraints before `ON CONFLICT DO UPDATE`, omitted
   * `NOT NULL` columns without defaults will fail—use {@link QueryBuilder.update} with filters instead.
   *
   * Preconditions: every column participating in the target `PRIMARY KEY` or `options.onConflict`
   * `UNIQUE` constraint must be present in `values` (or generated by a non-conflicting default).
   *
   * Behavior and side effects: builder progression is `QueryBuilder -> FilterBuilder<null, 'POST', false>`.
   * Each `await` or `.then()` call sends a new `POST` request; awaiting an `upsert()` builder more
   * than once executes the write repeatedly, so await each mutation builder at most once.
   *
   * Returns `null` by default: chain {@link TransformBuilder.select | .select(columns?)} to return
   * inserted or merged rows. When `ignoreDuplicates: true` skips a conflicting row, PostgREST omits
   * the skipped row from `.select()` output.
   *
   * Bulk array column-overwrite warning: for array inputs, the SDK builds `?columns="..."` as the
   * union of `Object.keys(...)` across all elements (in `O(rows^2)` time on the client thread—chunk
   * large batches to at most `1,000` rows per call), and on `merge-duplicates` conflicts PostgREST
   * updates every column in `?columns` (`DO UPDATE SET col = EXCLUDED.col`). Any key omitted (or set
   * to `undefined`) on one element overwrites that column on conflicting existing rows with `NULL`
   * (`defaultToNull: true`) or the column `DEFAULT` (`defaultToNull: false`). Always supply identical
   * keys on every object in a bulk upsert array, or split batches by key set.
   *
   * Error handling: SQLSTATE `'42P10'` indicates `options.onConflict` does not match a `UNIQUE` or
   * `PRIMARY KEY` constraint on the table. SQLSTATE `'23505'` occurs when `onConflict` was omitted
   * (defaulting to primary key) while a different unique column (such as `events.code`) collided;
   * set `onConflict: 'code'`.
   *
   * @typeParam Row - Non-iterable row object type being upserted.
   * @param values - Single row object or readonly array of row objects to upsert. Serialized via `JSON.stringify` (`bigint` values serialize via `.toString()`, `undefined` property values and functions are omitted, `NaN`/`Infinity` serialize as `null`, `Date` serializes to ISO-8601, and circular references resolve at `await` time as `res.status === 0`, `res.error.category === 'sql-client'`, `res.error.code === 'other'`).
   * @param options - Conflict target (`onConflict`), duplicate strategy (`ignoreDuplicates`), `count`, and `defaultToNull`. See {@link QueryUpsertOptions}.
   * @returns A lazy {@link FilterBuilder} with `data` typed as `null` until `.select()` is chained.
   *
   * @example
   * Full `UPSERT` chain batch-syncing uniform rows on a composite unique constraint:
   * ```ts
   * interface SyncedRegistration {
   *   id: string;
   *   attendee_email: string;
   *   role: 'attendee' | 'speaker' | 'organizer';
   * }
   *
   * const result = await sql
   *   .from('registrations')
   *   .upsert(
   *     [
   *       {
   *         event_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
   *         user_uid: 'uid_alice',
   *         attendee_email: 'alice@example.com',
   *         role: 'speaker'
   *       },
   *       {
   *         event_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
   *         user_uid: 'uid_bob',
   *         attendee_email: 'bob@example.com',
   *         role: 'attendee'
   *       }
   *     ],
   *     {
   *       onConflict: 'event_id,attendee_email',
   *       ignoreDuplicates: false,
   *       count: 'exact'
   *     }
   *   )
   *   .select('id, attendee_email, role')
   *   .order('attendee_email', { ascending: true })
   *   .overrideTypes<SyncedRegistration[], { merge: false }>();
   *
   * if (!result.success) {
   *   console.error('Upsert failed:', result.error.code, result.error.message);
   * } else {
   *   console.log(`Synced ${result.count} registrations:`, result.data);
   * }
   * ```
   *
   * @example
   * Single-row upsert on a unique `slug` column (`ON CONFLICT DO UPDATE`):
   * ```ts
   * const venueRes = await sql
   *   .from('venues')
   *   .upsert(
   *     { slug: 'bell-harbor', name: 'Bell Harbor International Conference Center', city: 'Seattle', capacity: 1200 },
   *     { onConflict: 'slug' }
   *   )
   *   .select('id, slug, capacity')
   *   .single()
   *   .overrideTypes<{ id: string; slug: string; capacity: number }, { merge: false }>();
   *
   * if (!venueRes.success) {
   *   console.error('Venue upsert failed:', venueRes.error.message);
   * }
   * ```
   *
   * @example
   * Insert-if-absent (`ignoreDuplicates: true` / `DO NOTHING`) returning `0` or `1` row:
   * ```ts
   * // Conflict target `(event_id, attendee_email)` is UNIQUE, so at most 1 row can be inserted
   * const seedRes = await sql
   *   .from('registrations')
   *   .upsert(
   *     {
   *       event_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
   *       user_uid: 'uid_alice',
   *       attendee_email: 'alice@example.com'
   *     },
   *     { onConflict: 'event_id,attendee_email', ignoreDuplicates: true }
   *   )
   *   .select('id, role')
   *   .maybeSingle()
   *   .overrideTypes<{ id: string; role: string }, { merge: false }>();
   *
   * if (!seedRes.success) {
   *   console.error('Seed upsert failed:', seedRes.error.message);
   * }
   * ```
   *
   * @public
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
   * Starts a lazy `UPDATE` (`PATCH`) operation to modify columns on all rows matching subsequent filters.
   *
   * @remarks
   * When to use: modifying a subset of columns on existing row(s) selected via
   * {@link FilterBuilder} predicates (`.eq()`, `.in()`, `.lt()`, etc.).
   *
   * Do not use unfiltered `update(values)` calls unless intentionally updating every visible row in
   * the table—always chain at least one {@link FilterBuilder} predicate and consider
   * {@link TransformBuilder.maxAffected} (on PostgREST v13+) or {@link TransformBuilder.single} to
   * guard against accidental broad updates. Do not rely on {@link TransformBuilder.maybeSingle} to
   * guard an `update()`, because `maybeSingle()` checks row count client-side after the server has
   * already committed updates to all matched rows. `update` accepts a single partial-row patch
   * object (for per-row bulk writes, use {@link QueryBuilder.upsert}).
   *
   * Behavior and side effects: builder progression is `QueryBuilder -> FilterBuilder<null, 'PATCH', false>`.
   * Each `await` or `.then()` call sends a new `PATCH` request; awaiting an `update()` builder more
   * than once executes the update repeatedly, so await each mutation builder at most once.
   *
   * Returns `null` by default: resolves with `status: 204` and `data: null` unless
   * {@link TransformBuilder.select | .select(columns?)} is chained to return updated rows. Updating
   * a `jsonb` column (such as `events.metadata`) replaces the column value as a whole; for
   * server-side partial JSON merges, use {@link FirebaseSql.rpc}.
   *
   * Error handling: on PostgREST v13+, exceeding {@link TransformBuilder.maxAffected} aborts the
   * transaction and resolves to {@link OperationFailure} (`res.error.category === 'sql-postgrest'`,
   * `res.error.code === 'PGRST124'`). Rows hidden by PostgreSQL Row-Level Security `USING` policies
   * are silently skipped (`status: 204`, `success: true`, `0` rows updated) rather than raising
   * `'42501'`—pass `{ count: 'exact' }` and check `result.count === 0`, or chain
   * `.select('id').single()`, when a missing or unauthorized target row must be detected (chaining
   * `.select()` also requires a `SELECT` policy permitting visibility of the updated row).
   *
   * @typeParam Row - Non-iterable partial-row patch object type.
   * @param values - Column-value map of fields to update on matching rows. Serialized via `JSON.stringify` (`bigint` values serialize via `.toString()`, `undefined` property values and functions are omitted, `NaN`/`Infinity` serialize as `null`, `Date` serializes to ISO-8601, and circular references resolve at `await` time as `res.status === 0`, `res.error.category === 'sql-client'`, `res.error.code === 'other'`).
   * @param options - Optional `count` strategy for counting updated rows. See {@link QueryUpdateOptions}.
   * @returns A lazy {@link FilterBuilder} with method tag `'PATCH'` (supporting {@link TransformBuilder.maxAffected}).
   *
   * @example
   * Full `UPDATE` chain filtering a unique row and capping affected rows with `maxAffected(1)`:
   * ```ts
   * interface UpdatedEventSummary {
   *   id: string;
   *   code: string;
   *   status: 'draft' | 'published' | 'cancelled' | 'archived';
   *   is_featured: boolean;
   * }
   *
   * // `code` is UNIQUE and `maxAffected(1)` enforces the 1-row ceiling on PostgREST v13+
   * const result = await sql
   *   .from('events')
   *   .update({ status: 'published', is_featured: true }, { count: 'exact' })
   *   .eq('code', 'FIREBASE-SUMMIT-2026')
   *   .eq('status', 'draft')
   *   .maxAffected(1)
   *   .select('id, code, status, is_featured')
   *   .overrideTypes<UpdatedEventSummary[], { merge: false }>();
   *
   * if (!result.success) {
   *   console.error('Update failed:', result.error.code, result.error.message);
   * } else if (result.data.length === 0) {
   *   console.warn('No draft event matched FIREBASE-SUMMIT-2026.');
   * } else {
   *   console.log('Published event:', result.data[0]?.id);
   * }
   * ```
   *
   * @example
   * Batch-archive past published events and count affected rows (`data` is `null`):
   * ```ts
   * const archiveRes = await sql
   *   .from('events')
   *   .update({ status: 'archived', is_featured: false }, { count: 'exact' })
   *   .eq('status', 'published')
   *   .lt('created_at', '2026-01-01T00:00:00Z');
   *
   * if (!archiveRes.success) {
   *   console.error('Archive failed:', archiveRes.error.message);
   * } else {
   *   console.log(`Archived ${archiveRes.count} events.`);
   * }
   * ```
   *
   * @example
   * Request a rolled-back preview of an update (only if the server permits `Prefer: tx=rollback`):
   * ```ts
   * // WARNING: If the backend's PostgREST db-tx-end setting does not allow overrides,
   * // PostgREST ignores Prefer: tx=rollback and this UPDATE COMMITS while still returning 2xx.
   * const previewRes = await sql
   *   .from('events')
   *   .update({ ticket_price: 79.0 })
   *   .eq('code', 'FIREBASE-SUMMIT-2026')
   *   .maxAffected(1)
   *   .select('id, code, ticket_price')
   *   .rollback()
   *   .overrideTypes<Array<{ id: string; code: string; ticket_price: number }>, { merge: false }>();
   *
   * if (!previewRes.success) {
   *   console.error('Preview failed:', previewRes.error.message);
   * }
   * ```
   *
   * @public
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
   * Starts a lazy `DELETE` operation to remove all rows matching subsequent filters.
   *
   * @remarks
   * When to use: permanently removing one or more rows targeted via {@link FilterBuilder}
   * predicates (such as `.eq('id', id)` or `.in('id', ids)`; when passing `.in('id', ids)`, every ID
   * is encoded into the URL query string, so chunk large ID lists to stay within HTTP URL limits).
   *
   * Do not use unfiltered `delete()` calls unless intentionally deleting every visible row in the
   * table—always chain explicit {@link FilterBuilder} predicates and consider
   * {@link TransformBuilder.maxAffected} (on PostgREST v13+) as a row-count cap.
   *
   * Behavior and side effects: builder progression is `QueryBuilder -> FilterBuilder<null, 'DELETE', false>`.
   * Each `await` or `.then()` call sends a new `DELETE` request; awaiting a `delete()` builder more
   * than once repeats the request, so await each mutation builder at most once.
   *
   * Returns `null` by default: resolves with `status: 204` and `data: null` unless
   * {@link TransformBuilder.select | .select(columns?)} is chained to return deleted rows. Matching
   * zero rows—including when PostgreSQL Row-Level Security `USING` policies hide the target row—is
   * not an error (`success: true`, `status: 204`, or `data: []` when `.select()` is chained). Pass
   * `{ count: 'exact' }` and check `result.count === 0` (or chain `.select('id').single()`) when a
   * missing or RLS-filtered row must be detected.
   *
   * Error handling: foreign-key `RESTRICT` or `NO ACTION` references from child tables fail with
   * SQLSTATE `'23503'` (`res.error.category === 'sql-postgrest'`); delete dependent rows first or
   * configure `ON DELETE CASCADE`. On PostgREST v13+, exceeding {@link TransformBuilder.maxAffected}
   * rolls back the deletion and returns `'PGRST124'`.
   *
   * @param options - Optional `count` strategy for counting deleted rows. See {@link QueryDeleteOptions}.
   * @returns A lazy {@link FilterBuilder} with method tag `'DELETE'` (supporting {@link TransformBuilder.maxAffected}).
   *
   * @example
   * Full `DELETE` chain filtering rows, capping `maxAffected`, and returning deleted records:
   * ```ts
   * interface DeletedRegistration {
   *   id: string;
   *   attendee_email: string;
   * }
   *
   * // Note: abortSignal cancels only the client fetch; if a timeout fires after the request
   * // reaches the server, the delete may still commit even though result.status === 0.
   * const result = await sql
   *   .from('registrations')
   *   .delete({ count: 'exact' })
   *   .eq('event_id', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')
   *   .is('checked_in_at', null)
   *   .maxAffected(100)
   *   .abortSignal(AbortSignal.timeout(5000))
   *   .select('id, attendee_email')
   *   .overrideTypes<DeletedRegistration[], { merge: false }>();
   *
   * if (!result.success) {
   *   console.error('Delete failed or timed out:', result.error.code, result.error.message);
   * } else {
   *   console.log(`Removed ${result.count} unchecked-in registrations:`, result.data);
   * }
   * ```
   *
   * @example
   * Delete a single record by primary key without returning row payload (`status: 204`):
   * ```ts
   * const delRes = await sql
   *   .from('registrations')
   *   .delete()
   *   .eq('id', 'c9a646d3-9c61-4cb7-bfcd-ee2522c8f633')
   *   .maxAffected(1);
   *
   * if (!delRes.success) {
   *   console.error('Delete failed:', delRes.error.message);
   * }
   * ```
   *
   * @example
   * Batch-delete multiple draft events by ID list:
   * ```ts
   * const batchDel = await sql
   *   .from('events')
   *   .delete({ count: 'exact' })
   *   .in('id', ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'])
   *   .eq('status', 'draft');
   *
   * if (!batchDel.success) {
   *   console.error('Batch delete failed:', batchDel.error.message);
   * }
   * ```
   *
   * @public
   */
  delete(
    options?: Readonly<QueryDeleteOptions> | undefined
  ): FilterBuilder<null, 'DELETE'>;
}
