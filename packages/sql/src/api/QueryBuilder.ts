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
 * Controls how `result.count` on {@link OperationSuccess} is computed:
 * - `'exact'`: Executes a full `COUNT(*)` query; accurate at any scale but incurs table/index scan cost.
 * - `'planned'`: Reads row estimates from PostgreSQL planner statistics (`EXPLAIN`); near-zero overhead but approximate.
 * - `'estimated'`: Uses `'exact'` below PostgREST's `db-max-rows` threshold and `'planned'` above it.
 *
 * When combined with {@link TransformBuilder.limit} or {@link TransformBuilder.range}, `result.count`
 * reflects the **total** rows matching the query filters prior to pagination, not `result.data.length`.
 *
 * @example
 * **Select a counting strategy based on table size**
 * ```ts
 * import type { QueryCountStrategy } from 'firebase/sql';
 *
 * const strategy: QueryCountStrategy = 'estimated';
 * const res = await sql.from('events').select('id', { count: strategy }).limit(20);
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
 * **Request an exact row count via a metadata-only `HEAD` request**
 * ```ts
 * import type { QuerySelectOptions } from 'firebase/sql';
 *
 * const selectOpts: QuerySelectOptions = { head: true, count: 'exact' };
 * const res = await sql.from('events').select('*', selectOpts);
 * ```
 *
 * @public
 */
export interface QuerySelectOptions {
  /**
   * Sends an HTTP `HEAD` request so PostgREST returns headers (including `count`) with an empty body (`result.data` resolves to `null`).
   *
   * @remarks
   * Combine with `count: 'exact'` (or `'estimated'`) to count matching rows without transferring row payloads.
   * **Compile-Time Type Caveat:** Setting `head: true` does **not** narrow the static TypeScript type of
   * `result.data` away from `Array<Record<string, unknown>>`, even though `result.data` is `null` at
   * runtime—read `result.count` only and never access array properties (such as `.length`) on `result.data`.
   *
   * @defaultValue `false`
   */
  head?: boolean | undefined;

  /**
   * Row-counting algorithm used to populate `result.count` on {@link OperationSuccess}.
   *
   * @remarks
   * When omitted, PostgREST does not compute a total count and `result.count` is `null`.
   *
   * @defaultValue `undefined`
   */
  count?: QueryCountStrategy | undefined;
}

/**
 * Execution options for {@link QueryBuilder.insert}.
 *
 * @example
 * **Preserve PostgreSQL column `DEFAULT` expressions on sparse bulk inserts**
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
 * ```
 *
 * @public
 */
export interface QueryInsertOptions {
  /**
   * Row-counting algorithm used to populate `result.count` with the number of inserted rows.
   *
   * @defaultValue `undefined`
   */
  count?: QueryCountStrategy | undefined;

  /**
   * Controls how omitted columns in **bulk array** inserts are populated by PostgreSQL.
   *
   * @remarks
   * Only affects array inputs (single-object `insert({...})` never sets `?columns=...` and always
   * uses PostgreSQL column `DEFAULT` expressions for omitted keys). When inserting an array of
   * objects, the SDK sets `?columns="..."` to the `Object.keys(...)` union across all elements:
   * - `true` (default): Omitted keys (or keys explicitly set to `undefined`, which `Object.keys`
   *   includes in `?columns` while `JSON.stringify` strips from the body) are inserted as `NULL`.
   * - `false`: Appends `Prefer: missing=default` so PostgreSQL applies each column's schema `DEFAULT`
   *   expression instead of `NULL`.
   *
   * @defaultValue `true`
   */
  defaultToNull?: boolean | undefined;
}

/**
 * Conflict-resolution and execution options for {@link QueryBuilder.upsert}.
 *
 * @example
 * **Configure conflict resolution on a composite unique key**
 * ```ts
 * import type { QueryUpsertOptions } from 'firebase/sql';
 *
 * const upsertOpts: QueryUpsertOptions = {
 *   onConflict: 'event_id,attendee_email',
 *   ignoreDuplicates: false,
 *   defaultToNull: false,
 *   count: 'exact'
 * };
 * ```
 *
 * @public
 */
export interface QueryUpsertOptions {
  /**
   * Comma-separated column name(s) forming a `PRIMARY KEY` or `UNIQUE` constraint used to detect conflicts (sent as `?on_conflict=...`).
   *
   * @remarks
   * Do **not** include spaces around commas (for example, `'event_id,attendee_email'`, or `'code'` for a single column).
   * When omitted, PostgREST defaults conflict detection to the table's primary key.
   *
   * @defaultValue `undefined`
   */
  onConflict?: string | undefined;

  /**
   * Conflict action applied when an incoming row matches an existing row on `onConflict` (or primary key).
   *
   * @remarks
   * - `false` (default): Sends `Prefer: resolution=merge-duplicates` (`ON CONFLICT DO UPDATE`), overwriting conflicting rows.
   * - `true`: Sends `Prefer: resolution=ignore-duplicates` (`ON CONFLICT DO NOTHING`), silently skipping conflicting rows.
   *
   * @defaultValue `false`
   */
  ignoreDuplicates?: boolean | undefined;

  /**
   * Row-counting algorithm used to populate `result.count` with the number of affected rows.
   *
   * @defaultValue `undefined`
   */
  count?: QueryCountStrategy | undefined;

  /**
   * Controls whether omitted (or `undefined`-valued) properties in **bulk array** upserts default to `NULL` (`true`) or use PostgreSQL column `DEFAULT` expressions (`false`, sends `Prefer: missing=default`).
   *
   * @remarks
   * Only affects newly inserted rows during bulk array upserts; does not overwrite existing columns during conflict merges, and is unnecessary for single-object upserts.
   *
   * @defaultValue `true`
   */
  defaultToNull?: boolean | undefined;
}

/**
 * Execution options for {@link QueryBuilder.update}.
 *
 * @example
 * **Count rows modified by an `update()`**
 * ```ts
 * import type { QueryUpdateOptions } from 'firebase/sql';
 *
 * const updateOpts: QueryUpdateOptions = { count: 'exact' };
 * const res = await sql.from('events').update({ is_featured: false }, updateOpts).eq('status', 'archived');
 * ```
 *
 * @public
 */
export interface QueryUpdateOptions {
  /**
   * Row-counting algorithm used to populate `result.count` with the number of updated rows.
   *
   * @defaultValue `undefined`
   */
  count?: QueryCountStrategy | undefined;
}

/**
 * Execution options for {@link QueryBuilder.delete}.
 *
 * @example
 * **Count rows removed by a `delete()`**
 * ```ts
 * import type { QueryDeleteOptions } from 'firebase/sql';
 *
 * const deleteOpts: QueryDeleteOptions = { count: 'exact' };
 * const res = await sql.from('events').delete(deleteOpts).eq('status', 'cancelled');
 * ```
 *
 * @public
 */
export interface QueryDeleteOptions {
  /**
   * Row-counting algorithm used to populate `result.count` with the number of deleted rows.
   *
   * @defaultValue `undefined`
   */
  count?: QueryCountStrategy | undefined;
}

/**
 * Compile-time constraint ensuring `T` is a plain non-iterable object (rejecting `Array`, `Map`, `Set`, and strings).
 *
 * @typeParam T - Object type to constrain against `[Symbol.iterator]`.
 *
 * @example
 * **Constrain a generic patch helper to plain single-row objects**
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
 * **Store a reusable `QueryBuilder` for a table**
 * ```ts
 * import type { QueryBuilder } from 'firebase/sql';
 *
 * const venues: QueryBuilder = sql.from('venues');
 * const seattleVenues = await venues.select('id, slug, name').eq('city', 'Seattle');
 * ```
 *
 * @see {@link FirebaseSql.from} for creating a `QueryBuilder`.
 * @public
 */
export interface QueryBuilder {
  /**
   * Starts a lazy `SELECT` (`GET` or `HEAD`) query on the target table or view, supporting column
   * projection, aliases, JSON path extraction, and embedded foreign-key joins.
   *
   * @remarks
   * **When to use:** Reading rows, embedding parent/child relations via foreign keys, or counting
   * matching rows (`{ head: true, count: 'exact' }`).
   *
   * **Do NOT use:** Returning mutated rows from `insert`, `upsert`, `update`, or `delete`—call
   * {@link TransformBuilder.select} *after* those mutation verbs instead.
   *
   * **Behavior & Side Effects:**
   * - **Builder Progression:** `QueryBuilder -> FilterBuilder<Array<Record<string, unknown>>, 'GET', false>`.
   * - Lazy: performs no network I/O until `await`ed or `.then()` is invoked. Unquoted whitespace in
   *   `columns` is stripped automatically while preserving whitespace inside double-quoted identifiers
   *   (such as `'id, "display name"'`).
   * - Untyped `data` defaults to `Array<Record<string, unknown>>`. Chain
   *   `.overrideTypes<MyRow[], { merge: false }>()` at the end of the chain—or `.single()` +
   *   `.overrideTypes<MyRow, { merge: false }>()` for single-row lookups—to strongly type `result.data`.
   * - **Compile-Time Type Caveat (`head: true`):** When `options.head` is `true`, `result.data`
   *   resolves to `null` at runtime, even though TypeScript still statically types `result.data` as
   *   `Array<Record<string, unknown>>`—read `result.count` only and never access `.length` on `result.data`.
   * - Idempotent retries (`retry(true)`) are enabled by default for transient network errors and
   *   HTTP `503`/`520` responses.
   *
   * **Embedded Relation Syntax & `.overrideTypes()` Shapes:**
   * - **Many-to-one** (FK on parent, e.g. `events.venue_id -> venues.id`) or **one-to-one** (`UNIQUE` FK):
   *   resolves to `RelatedRow | null` by default, or non-null `RelatedRow` when `!inner` is appended (`'venue:venues!inner(name, city)'`).
   * - **One-to-many** (FK on child, e.g. `registrations.event_id -> events.id`) or **many-to-many** (join table):
   *   resolves to `RelatedRow[]` (`[]` when empty, never `null`).
   * - **Filter parent rows without returning child columns:** Use an empty `!inner()` projection
   *   (`select('id, title, venues!inner()').eq('venues.city', 'Seattle')`).
   * - **Embedded child count:** `select('id, title, registrations(count)')` returns `registrations: Array<{ count: number }>`.
   * - **FK disambiguation & alias targeting:** Place `!fkey_name` *before* `!inner` (`'venue:venues!events_venue_id_fkey!inner(name)'`),
   *   and once aliased (`venue:venues(...)`), reference the **alias** in filters and transforms (`'venue.city'`, `{ referencedTable: 'venue' }`).
   *
   * **`jsonb` Operators (`->` vs. `->>`):**
   * - Single arrow `'level:metadata->level'` extracts a **typed JSON value** (`number | boolean | object | null`); use `->` for numeric/boolean comparisons and numeric sorting.
   * - Double arrow `'track:metadata->>track'` extracts **plain `text`** (`string | null`); use `->>` for string equality (`.eq()`) and pattern matching (`.ilike()`).
   *
   * **Error Handling & Remediation:**
   * - Resolves to {@link OperationFailure} (`{ success: false, error: FirebaseSqlError }`) on invalid
   *   column names (`'42703'`), ambiguous foreign-key embeddings (`'PGRST201'`—disambiguate using
   *   `alias:table!fkey_name(...)` from `error.hint`), out-of-bounds `.range()` offsets (`'PGRST103'`, HTTP `416`),
   *   RLS/privilege denials (`'42501'`), or gateway auth failures (`Code.UNAUTHORIZED`). Chain
   *   {@link Builder.throwOnError} to reject instead.
   *
   * @param columns - Comma-separated PostgREST projection string (defaults to `'*'`). Supports
   *   aliases (`'eventCode:code'`), JSON operators (`'metadata->level, metadata->>track'`), and foreign-table
   *   embeddings (`'*, venue:venues(name, city), registrations(attendee_email, role)'` or `'venues!inner(city)'`).
   * @param options - Optional `head` (metadata-only `HEAD` request) and `count` strategy. See {@link QuerySelectOptions}.
   * @returns A lazy {@link FilterBuilder} for chaining row filters, ordering, pagination, and type overrides.
   *
   * @example
   * **Full `SELECT` chain: filters, embedded relations, type narrowing, pagination, and exact count**
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
   * **Filter parent rows by an embedded foreign table using `!inner` join**
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
   * **Column aliasing and `jsonb` path extraction (`->>` as text vs. `->` as typed JSON)**
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
   * **Count-only query without transferring row payloads (`head: true`)**
   * ```ts
   * const countRes = await sql
   *   .from('registrations')
   *   .select('*', { head: true, count: 'exact' })
   *   .eq('event_id', '6ba7b810-9dad-11d1-80b4-00c04fd430c8');
   *
   * if (countRes.success) {
   *   console.log('Total registrations:', countRes.count); // countRes.data is null at runtime
   * }
   * ```
   *
   * @see {@link FilterBuilder} for chaining `WHERE` filters.
   * @see {@link TransformBuilder} for ordering, pagination, `.single()`, and `.csv()`.
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
   * **When to use:** Inserting new records that must fail on primary-key or unique-constraint collisions.
   *
   * **Do NOT use:** Idempotent insert-or-update workflows where existing rows should be merged or
   * skipped on conflict; use {@link QueryBuilder.upsert} instead.
   *
   * **Behavior & Side Effects:**
   * - **Builder Progression:** `QueryBuilder -> FilterBuilder<null, 'POST', false>`.
   * - **Returns `null` by default:** PostgREST omits inserted row payloads (`status: 201`, `data: null`)
   *   unless you chain {@link TransformBuilder.select | .select(columns?)} to send
   *   `Prefer: return=representation`.
   * - Single-object inputs automatically apply PostgreSQL column `DEFAULT` values for omitted keys.
   *   For **array** inputs, the SDK sets `?columns="..."` to the union of `Object.keys(...)` across
   *   all elements; pass `{ defaultToNull: false }` (and avoid `{ key: undefined }` properties) so
   *   omitted keys in sparse array elements receive PostgreSQL `DEFAULT` values instead of `NULL`.
   * - Non-idempotent (`POST`): automatic transient-error retries are not performed (except a single
   *   automatic Firebase Auth token refresh retry on HTTP 401).
   *
   * **Error Handling & Remediation:**
   * - Unique-constraint or primary-key conflicts resolve to {@link OperationFailure} with SQLSTATE
   *   `code === '23505'` (`category === 'sql-postgrest'`, HTTP 409); inspect `error.details` for the
   *   conflicting key or switch to {@link QueryBuilder.upsert}. Chain {@link Builder.throwOnError}
   *   to throw {@link FirebaseSqlError} instead.
   *
   * @typeParam Row - Plain non-iterable row object type being inserted.
   * @param values - Single row object or readonly array of row objects to insert.
   * @param options - Optional `count` strategy and `defaultToNull` handling for sparse bulk inserts. See {@link QueryInsertOptions}.
   * @returns A lazy {@link FilterBuilder} with `data` typed as `null` until `.select()` is chained.
   *
   * @example
   * **Full `INSERT` chain: create row using DB defaults, return single typed record, and throw on error**
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
   * **Bulk insert sparse rows preserving PostgreSQL `DEFAULT` values (`defaultToNull: false`)**
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
   * ```
   *
   * @example
   * **Minimal insert without returning row payloads (`data` is `null`) and duplicate-key check**
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
   * @see {@link TransformBuilder.select} for returning inserted rows.
   * @see {@link QueryBuilder.upsert} for conflict-tolerant inserts.
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
   * **When to use:** Idempotent writes, synchronization jobs, or "create-or-update" operations keyed
   * on a primary key (`id`), single unique column (`code`, `slug`), or composite unique constraint
   * (`event_id,attendee_email`).
   *
   * **Do NOT use:** Partial updates to existing rows when non-nullable `INSERT` columns are unknown;
   * because PostgreSQL evaluates `INSERT` constraints before `ON CONFLICT DO UPDATE`, omitted
   * `NOT NULL` columns without defaults will fail—use {@link QueryBuilder.update} with filters instead.
   *
   * **Preconditions:**
   * - Every column participating in the target `PRIMARY KEY` or `options.onConflict` `UNIQUE`
   *   constraint must be present in `values` (or generated by a non-conflicting default).
   *
   * **Behavior & Side Effects:**
   * - **Builder Progression:** `QueryBuilder -> FilterBuilder<null, 'POST', false>`.
   * - **Returns `null` by default:** Chain {@link TransformBuilder.select | .select(columns?)} to
   *   return the inserted/merged rows. Note: when `ignoreDuplicates: true` skips a conflicting row,
   *   PostgREST omits the skipped row from `.select()` output (so `.maybeSingle()` is safer than
   *   `.single()` on single-row `ignoreDuplicates: true` upserts).
   * - In bulk array upserts, avoid setting optional keys to `undefined` (or set `defaultToNull: false`),
   *   because `Object.keys(...)` includes `undefined`-valued keys in `?columns="..."` while
   *   `JSON.stringify` omits them, causing PostgreSQL to treat them as `NULL`.
   *
   * **Error Handling & Remediation:**
   * - SQLSTATE `'42P10'` ("there is no unique or exclusion constraint matching the ON CONFLICT
   *   specification") indicates `options.onConflict` does not match a `UNIQUE` or `PRIMARY KEY`
   *   constraint on the table.
   * - SQLSTATE `'23505'` occurs when `onConflict` was omitted (defaulting to primary key) while a
   *   *different* unique column (such as `events.code`) collided; set `onConflict: 'code'`.
   *
   * @typeParam Row - Plain non-iterable row object type being upserted.
   * @param values - Single row object or readonly array of row objects to upsert.
   * @param options - Conflict target (`onConflict`), duplicate strategy (`ignoreDuplicates`), `count`, and `defaultToNull`. See {@link QueryUpsertOptions}.
   * @returns A lazy {@link FilterBuilder} with `data` typed as `null` until `.select()` is chained.
   *
   * @example
   * **Full `UPSERT` chain: batch-sync rows on a composite unique constraint and return sorted results**
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
   *       defaultToNull: false,
   *       count: 'exact'
   *     }
   *   )
   *   .select('id, attendee_email, role')
   *   .order('attendee_email', { ascending: true })
   *   .overrideTypes<SyncedRegistration[], { merge: false }>();
   *
   * if (result.success) {
   *   console.log(`Synced ${result.count} registrations:`, result.data);
   * }
   * ```
   *
   * @example
   * **Single-row upsert on a unique `slug` column (`ON CONFLICT DO UPDATE`)**
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
   * ```
   *
   * @example
   * **Insert-if-absent (`ignoreDuplicates: true` / `DO NOTHING`) paired with `.maybeSingle()`**
   * ```ts
   * // Returns the newly inserted row, or `data: null` if `(event_id, attendee_email)` already existed
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
   * ```
   *
   * @see {@link QueryUpsertOptions} for `onConflict` and `ignoreDuplicates` behavior.
   * @see {@link TransformBuilder.select} for returning upserted rows.
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
   * **When to use:** Modifying a subset of columns on existing row(s) selected via
   * {@link FilterBuilder} predicates (`.eq()`, `.in()`, `.lt()`, etc.).
   *
   * **Do NOT use:**
   * - Unfiltered `update(values)` calls unless intentionally updating every visible row in the table—always
   *   chain at least one {@link FilterBuilder} predicate and consider {@link TransformBuilder.maxAffected}
   *   to guard against accidental broad updates.
   * - Passing an array of rows (`update` accepts a single partial-row patch object; for per-row bulk
   *   writes use {@link QueryBuilder.upsert}).
   *
   * **Behavior & Side Effects:**
   * - **Builder Progression:** `QueryBuilder -> FilterBuilder<null, 'PATCH', false>`.
   * - **Returns `null` by default:** Resolves with `status: 204` and `data: null` unless
   *   {@link TransformBuilder.select | .select(columns?)} is chained to return updated rows.
   * - Updating a `jsonb` column (such as `events.metadata`) replaces the column value as a whole;
   *   for server-side partial JSON merges, use {@link FirebaseSql.rpc}.
   *
   * **Error Handling & Remediation:**
   * - Exceeding {@link TransformBuilder.maxAffected} aborts the transaction on PostgREST and resolves
   *   to {@link OperationFailure} (`category === 'sql-postgrest'`, code `'PGRST124'`).
   * - **Silent 0-Row RLS Filtering:** Rows hidden by PostgreSQL Row-Level Security `USING` policies
   *   are silently skipped (`status: 204`, `success: true`, `0` rows updated) rather than raising
   *   `'42501'`—pass `{ count: 'exact' }` and check `result.count === 0`, or chain `.select('id').single()`,
   *   when a missing or unauthorized target row must be detected! (Chaining `.select()` also requires
   *   a `SELECT` policy permitting visibility of the updated row.)
   *
   * @typeParam Row - Plain non-iterable partial-row patch object type.
   * @param values - Column-value map of fields to update on matching rows.
   * @param options - Optional `count` strategy for counting updated rows. See {@link QueryUpdateOptions}.
   * @returns A lazy {@link FilterBuilder} with method tag `'PATCH'` (supporting {@link TransformBuilder.maxAffected}).
   *
   * @example
   * **Full `UPDATE` chain: filter target row, cap blast radius with `maxAffected(1)`, and unwrap via `maybeSingle()`**
   * ```ts
   * interface UpdatedEventSummary {
   *   id: string;
   *   code: string;
   *   status: 'draft' | 'published' | 'cancelled' | 'archived';
   *   is_featured: boolean;
   * }
   *
   * const result = await sql
   *   .from('events')
   *   .update({ status: 'published', is_featured: true }, { count: 'exact' })
   *   .eq('code', 'FIREBASE-SUMMIT-2026')
   *   .eq('status', 'draft')
   *   .maxAffected(1)
   *   .select('id, code, status, is_featured')
   *   .maybeSingle()
   *   .overrideTypes<UpdatedEventSummary, { merge: false }>();
   *
   * if (!result.success) {
   *   console.error('Update failed:', result.error.code, result.error.message);
   * } else if (result.data === null) {
   *   console.warn('No draft event matched FIREBASE-SUMMIT-2026.');
   * } else {
   *   console.log('Published event:', result.data.id);
   * }
   * ```
   *
   * @example
   * **Batch-archive past published events and count affected rows (`data` is `null`)**
   * ```ts
   * const archiveRes = await sql
   *   .from('events')
   *   .update({ status: 'archived', is_featured: false }, { count: 'exact' })
   *   .eq('status', 'published')
   *   .lt('created_at', '2026-01-01T00:00:00Z');
   *
   * if (archiveRes.success) {
   *   console.log(`Archived ${archiveRes.count} events.`);
   * }
   * ```
   *
   * @example
   * **Dry-run a price update without committing changes using `.rollback()`**
   * ```ts
   * const previewRes = await sql
   *   .from('events')
   *   .update({ ticket_price: 79.0 })
   *   .contains('tags', ['workshop'])
   *   .select('id, code, ticket_price')
   *   .rollback()
   *   .overrideTypes<Array<{ id: string; code: string; ticket_price: number }>, { merge: false }>();
   * ```
   *
   * @see {@link TransformBuilder.maxAffected} for capping the maximum number of updated rows.
   * @see {@link TransformBuilder.select} for returning updated rows.
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
   * **When to use:** Permanently removing one or more rows targeted via {@link FilterBuilder}
   * predicates (such as `.eq('id', id)` or `.in('id', ids)`).
   *
   * **Do NOT use:** Unfiltered `delete()` calls unless intentionally deleting every visible row in
   * the table—always chain explicit {@link FilterBuilder} predicates and consider
   * {@link TransformBuilder.maxAffected} as a row-count safety guard.
   *
   * **Behavior & Side Effects:**
   * - **Builder Progression:** `QueryBuilder -> FilterBuilder<null, 'DELETE', false>`.
   * - **Returns `null` by default:** Resolves with `status: 204` and `data: null` unless
   *   {@link TransformBuilder.select | .select(columns?)} is chained to return deleted rows.
   * - Matching zero rows—including when PostgreSQL Row-Level Security `USING` policies hide the
   *   target row—is **not** an error (resolves with `success: true`, `status: 204`, or `data: []`
   *   when `.select()` is chained). Pass `{ count: 'exact' }` and check `result.count === 0` (or
   *   chain `.select('id').single()`) when a missing or RLS-filtered row must be detected!
   *
   * **Error Handling & Remediation:**
   * - Foreign-key `RESTRICT`/`NO ACTION` references from child tables fail with SQLSTATE `'23503'`
   *   (`category === 'sql-postgrest'`); delete dependent rows first or configure `ON DELETE CASCADE`.
   * - Exceeding {@link TransformBuilder.maxAffected} rolls back the deletion and returns `'PGRST124'`.
   *
   * @param options - Optional `count` strategy for counting deleted rows. See {@link QueryDeleteOptions}.
   * @returns A lazy {@link FilterBuilder} with method tag `'DELETE'` (supporting {@link TransformBuilder.maxAffected}).
   *
   * @example
   * **Full `DELETE` chain: filter rows, guard with `maxAffected`, attach timeout, and return deleted records**
   * ```ts
   * interface DeletedRegistration {
   *   id: string;
   *   attendee_email: string;
   * }
   *
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
   * if (result.success) {
   *   console.log(`Removed ${result.count} unchecked-in registrations:`, result.data);
   * }
   * ```
   *
   * @example
   * **Delete a single record by primary key without returning row payload (`status: 204`)**
   * ```ts
   * const delRes = await sql
   *   .from('registrations')
   *   .delete()
   *   .eq('id', 'c9a646d3-9c61-4cb7-bfcd-ee2522c8f633')
   *   .maxAffected(1);
   * ```
   *
   * @example
   * **Batch-delete multiple draft events by ID list**
   * ```ts
   * const batchDel = await sql
   *   .from('events')
   *   .delete({ count: 'exact' })
   *   .in('id', ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'])
   *   .eq('status', 'draft');
   * ```
   *
   * @see {@link TransformBuilder.maxAffected} for preventing unintended bulk deletions.
   * @see {@link TransformBuilder.select} for returning deleted rows.
   * @public
   */
  delete(
    options?: Readonly<QueryDeleteOptions> | undefined
  ): FilterBuilder<null, 'DELETE'>;
}
