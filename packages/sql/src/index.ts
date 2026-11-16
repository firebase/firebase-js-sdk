/**
 * PostgREST-compatible SQL client SDK (`firebase/sql`) for querying PostgreSQL databases
 * hosted on Firebase SQL with automatic Firebase Authentication and App Check integration.
 *
 * @remarks
 * Application import path: install `firebase` and import from `firebase/sql` (do not import
 * `@firebase/sql` directly in application code).
 *
 * Builder state machine and chain order: queries and mutations progress through five stages (the
 * entry client and four lazy TypeScript builder interfaces): (1) {@link FirebaseSql}, the entry client exposing
 * `sql.from(table)` and `sql.rpc(fn, params, options)`; (2) {@link QueryBuilder}, the SQL table
 * verb selector (`select`, `insert`, `upsert`, `update`, `delete`); (3) {@link FilterBuilder}, row
 * filters (`eq`, `in`, `gte`, `contains`, `or`, `not`, and related operators);
 * (4) {@link TransformBuilder}, ordering, pagination, post-mutation `select()`, server preferences
 * (`maxAffected`, `rollback`), cancellation (`abortSignal`), full-type narrowing (`returns`), and
 * cardinality/format modifiers (`single`, `maybeSingle`, `csv`, `geojson`, `explain`); and
 * (5) {@link Builder}, static result-type overrides (`returns`, `overrideTypes`), `stripNulls`,
 * `setHeader`, `retry`, `throwOnError`, and `PromiseLike` execution (`await`).
 *
 * Always apply {@link FilterBuilder} predicates before calling `.returns()`, and apply all
 * {@link FilterBuilder} and {@link TransformBuilder} methods before calling `.single()`,
 * `.maybeSingle()`, `.csv()`, `.geojson()`, `.explain()`, or `.overrideTypes()`, because those
 * methods narrow the static return type to {@link Builder}. Each `await` or `.then()` sends a new
 * HTTP request (results are never cached), so await each mutation builder at most once.
 *
 * Untyped defaults and type narrowing: {@link (getSql:1) | getSql()} and {@link FirebaseSql.from}
 * do not accept `<Database>` or `<Row>` generics, and there is no `sql.schema()` method (pass
 * `schemaName` in {@link SqlServiceSettings} to {@link (getSql:1) | getSql()} instead). Table
 * `select()` defaults `data` to `Array<Record<string, unknown>>`; `insert()`, `upsert()`,
 * `update()`, and `delete()` default `data` to `null` unless `.select()` is chained; and `rpc()`
 * defaults `data` to `unknown` (its `<Args>` generic types input parameters only). Chain
 * `.returns<Row[]>()` (or `.single().returns<Row>()` / `.returns<T>()` on `rpc()`) to assign a full
 * static TypeScript type to `data`, and use `.overrideTypes<PartialRow>()` when partially
 * overriding or refining specific fields on an already-typed builder.
 *
 * Result envelope vs. throwing mode: by default, `await builder` resolves to
 * {@link OperationResult} (`{ success: true, data, count, error: null, status, statusText }` or
 * `{ success: false, data: null, count: null, error: FirebaseSqlError, status, statusText }`) for
 * HTTP, PostgREST, platform, and network failures (note that a `settings.schemaName` containing
 * invalid HTTP header characters rejects with a `TypeError` when setting the profile header).
 * Narrow via `if (!res.success)` or `const { data, error } = await ...; if (error)`—never narrow
 * with `if (!data)` when `data` can legitimately be `null` (such as `.maybeSingle()`, `head: true`,
 * or mutations without `.select()`). Chain {@link Builder.throwOnError | .throwOnError()} to reject
 * with {@link FirebaseSqlError} on failure and narrow the resolved envelope to
 * {@link OperationSuccess} (still destructure `const { data } = await query.throwOnError()`, as it
 * resolves `{ data, count, status, statusText, success: true, error: null }`, not raw `T`).
 *
 * Example conventions and reference schema: code examples across this package assume an initialized
 * client `const sql = getSql({ serviceId: 'events-db', location: 'us-central1' });` unless client
 * initialization is shown explicitly, and share three PostgreSQL tables plus two stored functions:
 * `venues(id uuid PK, slug text UNIQUE, name text, city text, capacity int4, coords geography(Point, 4326))`,
 * `events(id uuid PK, venue_id uuid FK NULL, code text UNIQUE, title text, status text DEFAULT 'draft', is_featured bool DEFAULT false, ticket_price numeric, tags text[], metadata jsonb, schedule tstzrange, search_doc tsvector, created_at timestamptz DEFAULT now())`,
 * `registrations(id uuid PK, event_id uuid FK, user_uid text, attendee_email text, role text DEFAULT 'attendee', checked_in_at timestamptz NULL, UNIQUE (event_id, attendee_email))`,
 * `remaining_seats(target_event_id uuid) RETURNS int4`, and
 * `list_events_by_city(target_city text) RETURNS SETOF events`.
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
