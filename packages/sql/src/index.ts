/**
 * PostgREST-compatible SQL client SDK (`firebase/sql`) for querying PostgreSQL databases
 * hosted on Firebase SQL with automatic Firebase Authentication and App Check integration.
 *
 * @remarks
 * **Application Import Path:** Install `firebase` and import from `firebase/sql` (do not import
 * `@firebase/sql` directly in application code).
 *
 * **Builder State Machine & Chain Order:**
 * Queries and mutations progress through four lazy TypeScript builder interfaces:
 * 1. {@link FirebaseSql}: Entry client (`sql.from(table)` or `sql.rpc(fn, params, options)`).
 * 2. {@link QueryBuilder}: SQL table verb (`select`, `insert`, `upsert`, `update`, `delete`).
 * 3. {@link FilterBuilder}: Row filters (`eq`, `in`, `gte`, `contains`, `or`, `not`, etc.).
 * 4. {@link TransformBuilder}: Ordering, pagination, post-mutation `select()`, safety caps (`maxAffected`), and cardinality/format modifiers (`single`, `maybeSingle`, `csv`, `geojson`, `explain`).
 * 5. {@link Builder}: Type overrides (`overrideTypes`), `stripNulls`, `setHeader`, `retry`, `throwOnError`, and `PromiseLike` execution (`await`).
 *
 * Always apply {@link FilterBuilder} and {@link TransformBuilder} methods **before** calling
 * `.single()`, `.maybeSingle()`, `.csv()`, `.geojson()`, `.explain()`, or `.overrideTypes()`,
 * because those methods narrow the return type to {@link Builder}.
 *
 * **Untyped Defaults & Type Narrowing:**
 * - {@link (getSql:1) | getSql()} and {@link FirebaseSql.from} do **not** accept `<Database>` or `<Row>` generics, and there is no `sql.schema()` method (pass `schemaName` in {@link SqlServiceSettings} to {@link (getSql:1) | getSql()} instead).
 * - `select()` defaults `data` to `Array<Record<string, unknown>>`.
 * - `insert()`, `upsert()`, `update()`, and `delete()` default `data` to `null` unless `.select()` is chained.
 * - `rpc()` defaults `data` to `unknown` (its `<Args>` generic types input parameters only).
 * - Call `.overrideTypes<Row[], { merge: false }>()` at the end of table chains (or `.overrideTypes<T>()` on direct `rpc()` chains; pass `{ merge: false }` if `.single()` or `.maybeSingle()` is chained on `rpc()`) to assign a static TypeScript type to `data`.
 *
 * **Result Envelope vs. Throwing Mode:**
 * - By default, `await builder` **never rejects** on HTTP, PostgREST, platform, or client failures; it resolves to {@link OperationResult} (`{ success: true, data, count, error: null, status, statusText }` or `{ success: false, data: null, count: null, error: FirebaseSqlError, status, statusText }`). Narrow via `if (!res.success)` or `const { data, error } = await ...; if (error)`—never narrow with `if (!data)` when `data` can legitimately be `null` (such as `.maybeSingle()`, `head: true`, or mutations without `.select()`).
 * - Chain {@link Builder.throwOnError | .throwOnError()} to reject with {@link FirebaseSqlError} on failure and narrow the resolved envelope to {@link OperationSuccess} (still destructure `const { data } = await query.throwOnError()`, as it resolves `{ data, count, status, statusText, success: true, error: null }`, not raw `T`).
 *
 * **Reference Schema Used Across SDK Examples:**
 * Examples across this package share a 3-table PostgreSQL schema (`venues`, `events`, `registrations`)
 * plus two stored functions (`remaining_seats`, `list_events_by_city`):
 * - `venues(id uuid PK, slug text UNIQUE, name text, city text, capacity int4, coords geography(Point, 4326))`
 * - `events(id uuid PK, venue_id uuid FK NULL, code text UNIQUE, title text, status text DEFAULT 'draft', is_featured bool DEFAULT false, ticket_price numeric, tags text[], metadata jsonb, schedule tstzrange, search_doc tsvector, created_at timestamptz DEFAULT now())`
 * - `registrations(id uuid PK, event_id uuid FK, user_uid text, attendee_email text, role text DEFAULT 'attendee', checked_in_at timestamptz NULL, UNIQUE (event_id, attendee_email))`
 *
 * @packageDocumentation
 */

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

import { registerSql } from './register';

export * from './api';

registerSql();
