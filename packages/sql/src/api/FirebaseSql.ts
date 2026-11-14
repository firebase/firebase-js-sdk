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

import {
  FirebaseApp,
  getApp,
  _getProvider,
  _removeServiceInstance
} from '@firebase/app';
import { AppCheckInternalComponentName } from '@firebase/app-check-interop-types';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';
import { PostgrestClient } from '@supabase/postgrest-js';

import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import { mapPostgrestFailureToFirebaseSqlError } from '../core/errorMapper';
import {
  SqlServiceSettings,
  validateSqlServiceSettings
} from '../core/settings';
import type { SqlClientState } from '../core/state';
import { AppCheckProvider } from '../core/tokenProviders/AppCheckTokenProvider';
import { FirebaseAuthProvider } from '../core/tokenProviders/FirebaseAuthTokenProvider';
import type {
  UntypedClientOptions,
  UntypedDatabase,
  UntypedSchema
} from '../core/untypedSchema';
import { logDebug } from '../logger';
import { createBuilderFetch } from '../network/transport';
import { FIREBASE_SQL_COMPONENT_NAME } from '../util/constants';
import { resolvePostgrestUrl } from '../util/url';

import type { FilterBuilder } from './FilterBuilder';
import { FilterBuilderImpl } from './impl/FilterBuilderImpl';
import { QueryBuilderImpl } from './impl/QueryBuilderImpl';
import type { QueryBuilder, QueryCountStrategy } from './QueryBuilder';

declare module '@firebase/component' {
  interface NameServiceMapping {
    [FIREBASE_SQL_COMPONENT_NAME]: FirebaseSql;
  }
}

/**
 * HTTP method and row-counting options for {@link FirebaseSql.rpc}.
 *
 * @example
 * **Configure read-only `GET` execution with exact row counting**
 * ```ts
 * import type { FirebaseSqlRpcOptions } from 'firebase/sql';
 *
 * const rpcOptions: FirebaseSqlRpcOptions = {
 *   get: true,
 *   count: 'exact'
 * };
 * ```
 *
 * @public
 */
export interface FirebaseSqlRpcOptions {
  /**
   * Sends an HTTP `HEAD` request to retrieve response headers and `count` without a response body (`data` resolves to `null`).
   *
   * @remarks
   * Parameters are serialized as URL query parameters unless any parameter value is a plain object
   * (or an array containing an object), in which case the client falls back to `POST` with
   * `Prefer: return=minimal` because nested objects cannot be encoded as PostgREST URL parameters
   * (note that this `POST` fallback disables automatic idempotent retries).
   * Takes precedence over `get` when both are `true`.
   *
   * @defaultValue `false`
   */
  head?: boolean | undefined;

  /**
   * Calls the PostgreSQL function via HTTP `GET` with arguments encoded in the URL query string.
   *
   * @remarks
   * **When to use:** Invoking `IMMUTABLE` or `STABLE` read-only PostgreSQL functions so that
   * idempotent transient-error retries (`retry(true)`) apply automatically.
   *
   * **Do NOT use:** Functions that perform `INSERT`/`UPDATE`/`DELETE` side effects or accept nested
   * JSON object parameters; omit `get` (or pass `false`) so arguments are sent in a `POST` JSON body.
   * Arguments with `undefined` values are omitted from the query string, and top-level arrays are
   * formatted using PostgreSQL array literal syntax (`{a,b}`).
   *
   * @defaultValue `false`
   */
  get?: boolean | undefined;

  /**
   * Row-counting strategy sent via the `Prefer: count=<strategy>` header for set-returning (`RETURNS SETOF` / `RETURNS TABLE`) functions.
   *
   * @remarks
   * Populates `result.count` on {@link OperationSuccess}:
   * - `'exact'`: Full `COUNT(*)` scan; accurate but slower on large result sets.
   * - `'planned'`: Fast estimate from the PostgreSQL query planner.
   * - `'estimated'`: Exact for small tables, planner estimate above PostgREST's threshold.
   *
   * @defaultValue `undefined`
   */
  count?: QueryCountStrategy | undefined;
}

/**
 * Service client bound to a `FirebaseApp` and a specific Firebase SQL PostgREST endpoint.
 *
 * @remarks
 * **Do NOT instantiate directly:** Obtain instances via {@link (getSql:1) | getSql()}, which validates settings
 * and deduplicates clients per `(app, resolvedEndpoint, schemaName)`. `FirebaseSql` does **not**
 * expose a `.schema(name)` method—configure `schemaName` in {@link SqlServiceSettings} when calling
 * {@link (getSql:1) | getSql()} (or clone `sql.settings` via {@link copySqlServiceSettings} to create
 * a client for another schema).
 *
 * Automatically attaches Firebase Authentication ID tokens (`x-firebase-auth-token`, with a single
 * automatic token refresh and retry on HTTP 401 when the authenticated UID is unchanged) and
 * Firebase App Check tokens (`x-firebase-appcheck`) when those services are registered on `app`
 * (including static `authIdToken` and `appCheckToken` credentials configured on a `FirebaseServerApp`
 * via `initializeServerApp` for SSR/server environments).
 *
 * @example
 * **Query a table and invoke a stored function using a `FirebaseSql` client**
 * ```ts
 * import { getSql, type FirebaseSql } from 'firebase/sql';
 *
 * const sql: FirebaseSql = getSql({
 *   serviceId: 'events-db',
 *   location: 'us-central1'
 * });
 *
 * const venuesRes = await sql.from('venues').select('id, slug, name, city');
 * const seatsRes = await sql
 *   .rpc('remaining_seats', { target_event_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' }, { get: true })
 *   .overrideTypes<number>();
 * ```
 *
 * @see {@link (getSql:1) | getSql()} for initializing or retrieving a cached `FirebaseSql` client.
 * @see {@link terminate} for shutting down a client and evicting it from the app registry.
 * @public
 */
export class FirebaseSql {
  /** @internal */
  readonly _postgrestUrl: string;

  /** @internal */
  private readonly _state: SqlClientState;

  private readonly _terminationController = new AbortController();

  private readonly _postgrestClient: PostgrestClient<
    UntypedDatabase,
    UntypedClientOptions,
    string,
    UntypedSchema
  >;

  /**
   * Should only be called by {@link (getSql:1) | getSql()}, after validating inputs.
   * @internal
   */
  constructor(
    /** The bound {@link @firebase/app#FirebaseApp} instance. */
    readonly app: FirebaseApp,
    /** Deeply frozen copy of the validated {@link SqlServiceSettings} used by this client. */
    readonly settings: SqlServiceSettings,
    /** @internal */
    readonly _instanceIdentifier: string,
    /** @internal */
    authInternalProvider: Provider<FirebaseAuthInternalName>,
    /** @internal */
    appCheckInternalProvider: Provider<AppCheckInternalComponentName>
  ) {
    this._postgrestUrl = resolvePostgrestUrl(
      this.settings,
      app.options.projectId!
    );

    this._state = {
      active: {
        appId: app.options.appId,
        authTokenProvider: new FirebaseAuthProvider(app, authInternalProvider),
        appCheckTokenProvider: new AppCheckProvider(
          app,
          appCheckInternalProvider
        )
      },
      terminationSignal: this._terminationController.signal
    };

    // PostgrestClient is deliberately instantiated without a static `fetch` option.
    // Instead, `createBuilderFetch` is passed down to query/filter builders, which
    // bind an execution-isolated `fetch` dynamically on each query execution to ensure
    // concurrent executions of the same builder instance do not share a single
    // `BuilderExecutionTracker` closure.
    this._postgrestClient = new PostgrestClient(this._postgrestUrl, {
      headers: this.settings.headers,
      schema: this.settings.schemaName
    });
  }

  /** @internal */
  _delete(): Promise<void> {
    if (this._state.active !== null) {
      const active = this._state.active;
      this._state.active = null;
      this._terminationController.abort(
        new FirebaseSqlError(
          Code.NOT_INITIALIZED,
          'The Firebase SQL client has been terminated.',
          FirebaseSqlErrorCategory.SQL_CLIENT
        )
      );
      active.appCheckTokenProvider.terminate();
      active.authTokenProvider.terminate();
      _removeServiceInstance(
        this.app,
        FIREBASE_SQL_COMPONENT_NAME,
        this._instanceIdentifier
      );
    }
    return Promise.resolve();
  }

  // Encode table and RPC names so `/`, `?`, `#`, and dot-segments cannot traverse out of
  // `/postgrest` or inject query parameters on the shared `firebasedataconnect.googleapis.com`
  // origin (deviating from `PostgrestClient`'s raw URL interpolation while leaving blank
  // `from('')` inputs untouched so `@supabase/postgrest-js`'s raw `Error` still propagates).
  private _encodeResourceSegment(
    segment: string,
    preserveBlank: boolean
  ): string {
    if (segment === '.' || segment === '..') {
      throw new FirebaseSqlError(
        Code.INVALID_ARGUMENT,
        `Invalid resource name "${segment}".`,
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }
    if (
      typeof segment !== 'string' ||
      segment.length === 0 ||
      (preserveBlank && segment.trim() === '')
    ) {
      return segment;
    }
    return encodeURIComponent(segment);
  }

  /**
   * Creates a reusable {@link QueryBuilder} scoped to a PostgreSQL table, view, or materialized view.
   *
   * @remarks
   * **When to use:** Starting any `SELECT`, `INSERT`, `UPSERT`, `UPDATE`, or `DELETE` chain against
   * a relation in the client's configured PostgreSQL schema (`settings.schemaName`, or the server
   * default schema).
   *
   * **Do NOT use:**
   * - Calling stored functions or procedures; use {@link FirebaseSql.rpc} instead.
   * - Passing `<Row>` type generics (`sql.from<EventRow>('events')` is not supported); apply
   *   {@link Builder.overrideTypes} or {@link TransformBuilder.returns} later in the chain.
   * - Schema-qualifying `table` as `'analytics.events'`—`table` is URI-encoded as a single path
   *   segment; configure `schemaName: 'analytics'` in {@link (getSql:1) | getSql()} instead.
   *
   * **Preconditions:**
   * - This `FirebaseSql` instance must not have been terminated via {@link terminate} or `deleteApp()`.
   *
   * **Behavior & Side Effects:** Synchronous and performs no network I/O. The returned
   * {@link QueryBuilder} clones URL and header state on each verb call (`select`, `insert`, etc.),
   * so a single `sql.from('events')` reference can be safely stored and reused across concurrent
   * queries. Special URI characters (`/`, `?`, `#`) in `table` are percent-encoded to prevent path
   * traversal.
   *
   * @param table - Non-empty PostgreSQL table or view name (must not be `'.'`, `'..'`, or blank/whitespace).
   * @returns A stateless {@link QueryBuilder} for starting SQL verb chains on `table`.
   *
   * @throws {@link FirebaseSqlError} (`not-initialized`, category `'sql-client'`)
   * Thrown synchronously when called after {@link terminate} or `deleteApp()`. **Remediation:**
   * Obtain a fresh client via {@link (getSql:1) | getSql()}.
   * @throws {@link FirebaseSqlError} (`invalid-argument`, category `'sql-client'`)
   * Thrown synchronously when `table` is `'.'` or `'..'`. **Remediation:** Pass a valid PostgreSQL
   * relation identifier.
   * @throws `Error`
   * Thrown synchronously when `table` is empty (`''`) or whitespace-only. **Remediation:** Provide
   * a non-blank table or view name.
   *
   * @example
   * **Reuse a table `QueryBuilder` across concurrent `Promise.all` reads**
   * ```ts
   * const eventsTable = sql.from('events');
   *
   * const [featuredRes, countRes] = await Promise.all([
   *   eventsTable.select('id, code, title').eq('is_featured', true),
   *   eventsTable.select('*', { head: true, count: 'exact' }).eq('status', 'published')
   * ]);
   * ```
   *
   * @example
   * **Perform CRUD operations against a shared table reference**
   * ```ts
   * const registrationsTable = sql.from('registrations');
   *
   * // Insert a new registration and return its generated UUID
   * const created = await registrationsTable
   *   .insert({
   *     event_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
   *     user_uid: 'uid_carol',
   *     attendee_email: 'carol@example.com'
   *   })
   *   .select('id')
   *   .single()
   *   .overrideTypes<{ id: string }, { merge: false }>();
   *
   * // Mark attendee checked in
   * if (created.success) {
   *   await registrationsTable
   *     .update({ checked_in_at: '2026-10-15T15:55:00Z' })
   *     .eq('id', created.data.id);
   * }
   * ```
   *
   * @see {@link QueryBuilder} for available SQL verbs (`select`, `insert`, `upsert`, `update`, `delete`).
   * @see {@link FirebaseSql.rpc} for calling PostgreSQL stored functions.
   * @public
   */
  from(table: string): QueryBuilder {
    if (this._state.active === null) {
      throw new FirebaseSqlError(
        Code.NOT_INITIALIZED,
        'FirebaseSql instance has been terminated.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }
    const delegate = this._postgrestClient.from(
      this._encodeResourceSegment(table, true)
    );
    return new QueryBuilderImpl(
      delegate,
      this._state,
      createBuilderFetch,
      mapPostgrestFailureToFirebaseSqlError
    );
  }

  /**
   * Creates a lazy {@link FilterBuilder} that invokes a PostgreSQL stored function or procedure (`RPC`).
   *
   * @remarks
   * **When to use:** Calling custom server-side SQL or PL/pgSQL functions—including multi-statement
   * transactional workflows, server-side aggregations (`remaining_seats`), or set-returning
   * functions (`RETURNS SETOF` / `RETURNS TABLE` such as `list_events_by_city`) whose output rows
   * need further PostgREST filtering, ordering, or pagination.
   *
   * **Do NOT use:** Standard single-table CRUD operations; prefer {@link FirebaseSql.from}.
   *
   * **Preconditions:**
   * - This `FirebaseSql` instance must not have been terminated via {@link terminate} or `deleteApp()`.
   * - `Args` must be a plain non-iterable key-value object matching the PostgreSQL function's
   *   named parameter names (arrays cannot be passed as the top-level `params` argument; wrap array
   *   parameters inside an object key, such as `{ target_tags: ['firebase', 'ai'] }`).
   *
   * **Behavior & Side Effects:**
   * - **Builder Progression:** `FirebaseSql -> FilterBuilder<unknown, 'RPC', false>`. No HTTP
   *   request is sent until the returned builder is `await`ed or `.then()` is invoked.
   * - Defaults to `POST /rpc/{fn}` with JSON body `params ?? {}` (omit `params` for zero-argument
   *   functions: `sql.rpc('fn')`). Set `options.get: true` for read-only functions to use `GET` with
   *   query parameters (enabling automatic transient-error retries). Functions declared `RETURNS void`
   *   resolve with HTTP `204` and `data: null`.
   * - Untyped `data` defaults to `unknown`. Note that `<Args>` types **input** `params` only—chain
   *   `.overrideTypes<ReturnType>()` at the end of direct `rpc()` chains to type `result.data` (no
   *   `{ merge: false }` needed when `T` is `unknown`, **except** when `.single()` or `.maybeSingle()`
   *   is chained first—those methods narrow `unknown` to `Record<string, unknown>`, so pass
   *   `.overrideTypes<RowType, { merge: false }>()` after `.single()` / `.maybeSingle()`).
   * - For set-returning functions (`RETURNS SETOF` / `RETURNS TABLE`), you can chain
   *   {@link FilterBuilder} filters (`.eq()`, `.overlaps()`), {@link TransformBuilder} modifiers
   *   (`.select()`, `.order()`, `.limit()`, `.single()`, `.maxAffected()`), and {@link Builder}
   *   modifiers before awaiting.
   *
   * **Error Handling & Remediation:**
   * - Resolves to {@link OperationFailure} (`{ success: false, error: FirebaseSqlError }`) on HTTP,
   *   PostgREST (`'sql-postgrest'`, e.g. `'PGRST202'` when function signature or parameter names do
   *   not match), gateway (`'sql-platform'`), or network (`'sql-client'`) failures. Chain
   *   {@link Builder.throwOnError} to reject with {@link FirebaseSqlError} instead.
   *
   * @typeParam Args - Non-iterable plain object mapping PostgreSQL function parameter names to values.
   * @param fn - PostgreSQL function name in the active schema (must not be `'.'` or `'..'`; special URI characters are percent-encoded).
   * @param params - Named arguments object passed to the PostgreSQL function.
   * @param options - HTTP verb (`get`, `head`) and `count` configuration. See {@link FirebaseSqlRpcOptions}.
   * @returns A lazy {@link FilterBuilder} with untyped result `unknown` and method tag `'RPC'`.
   *
   * @throws {@link FirebaseSqlError} (`not-initialized`, category `'sql-client'`)
   * Thrown synchronously when called after {@link terminate} or `deleteApp()`. **Remediation:**
   * Re-initialize a client with {@link (getSql:1) | getSql()}.
   * @throws {@link FirebaseSqlError} (`invalid-argument`, category `'sql-client'`)
   * Thrown synchronously when `fn` is `'.'` or `'..'`. **Remediation:** Pass a valid PostgreSQL
   * function name.
   *
   * @example
   * **Full RPC verb chain on a set-returning function (`RETURNS SETOF events`)**
   * ```ts
   * interface EventRow {
   *   id: string;
   *   venue_id: string | null;
   *   code: string;
   *   title: string;
   *   status: 'draft' | 'published' | 'cancelled' | 'archived';
   *   is_featured: boolean;
   *   ticket_price: number;
   *   tags: string[];
   *   metadata: Record<string, unknown>;
   *   schedule: string;
   *   created_at: string;
   * }
   *
   * const cityEvents = await sql
   *   .rpc('list_events_by_city', { target_city: 'Seattle' }, { get: true, count: 'exact' })
   *   .eq('status', 'published')
   *   .overlaps('tags', ['firebase', 'postgres'])
   *   .order('ticket_price', { ascending: true })
   *   .limit(10)
   *   .overrideTypes<EventRow[]>();
   *
   * if (!cityEvents.success) {
   *   console.error(cityEvents.error.code, cityEvents.error.hint);
   * } else {
   *   console.log(`Showing ${cityEvents.data.length} of ${cityEvents.count} events`);
   * }
   * ```
   *
   * @example
   * **Scalar read-only RPC returning a primitive value (`{ get: true }`)**
   * ```ts
   * const seatsRes = await sql
   *   .rpc(
   *     'remaining_seats',
   *     { target_event_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' },
   *     { get: true }
   *   )
   *   .overrideTypes<number>();
   *
   * if (seatsRes.success) {
   *   console.log('Remaining seats:', seatsRes.data);
   * }
   * ```
   *
   * @example
   * **Transactional write RPC sent via default `POST` JSON body with `.throwOnError()`**
   * ```ts
   * const { data } = await sql
   *   .rpc('list_events_by_city', { target_city: 'San Francisco' })
   *   .select('id, code, title')
   *   .overrideTypes<Array<{ id: string; code: string; title: string }>>()
   *   .throwOnError();
   * ```
   *
   * @example
   * **Count-only `HEAD` RPC check (`data` resolves to `null`)**
   * ```ts
   * const headRes = await sql.rpc(
   *   'list_events_by_city',
   *   { target_city: 'Seattle' },
   *   { head: true, count: 'exact' }
   * );
   *
   * if (headRes.success) {
   *   console.log('Matching Seattle events:', headRes.count);
   * }
   * ```
   *
   * @see {@link FirebaseSqlRpcOptions} for `get`, `head`, and `count` execution options.
   * @see {@link Builder.overrideTypes} for typing RPC results.
   * @public
   */
  rpc<
    Args extends object & {
      readonly [K in keyof Args]: unknown;
    } & {
      readonly [Symbol.iterator]?: never;
    } = Record<string, unknown>
  >(
    fn: string,
    params?: Args | undefined,
    options?: Readonly<FirebaseSqlRpcOptions> | undefined
  ): FilterBuilder<unknown, 'RPC'> {
    if (this._state.active === null) {
      throw new FirebaseSqlError(
        Code.NOT_INITIALIZED,
        'FirebaseSql instance has been terminated.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }
    const delegate = this._postgrestClient.rpc(
      this._encodeResourceSegment(fn, false),
      params as Record<string, unknown> | undefined,
      options
    );
    return new FilterBuilderImpl<unknown, 'RPC'>(
      delegate,
      this._state,
      createBuilderFetch,
      mapPostgrestFailureToFirebaseSqlError
    );
  }
}

/**
 * Returns the cached or newly initialized {@link FirebaseSql} client bound to the default
 * {@link @firebase/app#FirebaseApp} and the specified {@link SqlServiceSettings}.
 *
 * @remarks
 * **When to use:** Standard single-app setups where `initializeApp({ projectId, ... })` has already
 * been called for the default Firebase app.
 *
 * **Do NOT use:**
 * - Multi-app environments targeting a named secondary `FirebaseApp`; pass the `app` explicitly via
 *   the two-argument {@link (getSql:2) | getSql(app, settings)} overload.
 * - Varying `settings.headers` on the same `(serviceId, location, schemaName)` expecting separate
 *   clients—cached instances ignore subsequent `settings.headers`; use {@link Builder.setHeader}
 *   for per-request headers instead.
 *
 * **Preconditions:**
 * - The default `FirebaseApp` must be initialized via `initializeApp(...)` with a non-empty
 *   `options.projectId`.
 *
 * **Behavior & Side Effects:** Synchronous, performs no network I/O, deep-clones and freezes
 * `settings`, and caches the resulting {@link FirebaseSql} instance on the default app keyed by
 * `(resolvedEndpointUrl, schemaName)`.
 *
 * @param settings - Required service connection settings (`serviceId` and `location` are mandatory). See {@link SqlServiceSettings}.
 * @returns The cached or newly created {@link FirebaseSql} client instance.
 *
 * @throws `FirebaseError` (`app/no-app`)
 * Thrown when no default `FirebaseApp` has been initialized. **Remediation:** Call
 * `initializeApp({ projectId: '...' })` before calling `getSql(settings)`.
 * @throws {@link FirebaseSqlError} (`invalid-argument`, category `'sql-client'`)
 * Thrown when `settings` is missing, `serviceId` or `location` is empty, `port` is outside
 * `1..65535` or non-integer, `headers` contains a protected header key, or `app.options.projectId`
 * is missing/empty. **Remediation:** Supply non-empty `projectId`, `serviceId`, and `location`, an
 * integer `port` in `1..65535`, and remove disallowed auth/telemetry headers.
 * @throws `TypeError`
 * Thrown when `settings.host` is not a valid hostname accepted by the WHATWG `URL` constructor
 * (for example, `''` or a string including `http://`). **Remediation:** Pass a bare hostname without protocol or path.
 *
 * @example
 * **Initialize Firebase SQL using the default schema**
 * ```ts
 * import { initializeApp } from 'firebase/app';
 * import { getSql } from 'firebase/sql';
 *
 * initializeApp({
 *   apiKey: 'YOUR_API_KEY',
 *   appId: 'YOUR_APP_ID',
 *   projectId: 'my-firebase-project'
 * });
 *
 * const sql = getSql({
 *   serviceId: 'events-db',
 *   location: 'us-central1'
 * });
 * ```
 *
 * @example
 * **Initialize Firebase SQL targeting a non-default schema**
 * ```ts
 * import { getSql } from 'firebase/sql';
 *
 * const analyticsSql = getSql({
 *   serviceId: 'events-db',
 *   location: 'us-central1',
 *   schemaName: 'analytics'
 * });
 * ```
 *
 * @see {@link SqlServiceSettings} for optional `schemaName`, `headers`, `host`, `port`, and `sslEnabled` settings.
 * @see {@link terminate} for releasing a cached `FirebaseSql` instance.
 * @public
 */
export function getSql(settings: SqlServiceSettings): FirebaseSql;

/**
 * Returns the cached or newly initialized {@link FirebaseSql} client bound to the given
 * {@link @firebase/app#FirebaseApp} and {@link SqlServiceSettings}.
 *
 * @remarks
 * **When to use:** Binding to a specific `FirebaseApp` instance (including named secondary apps or
 * `FirebaseServerApp` instances created via `initializeServerApp`) or maintaining explicit dependency injection of `app`.
 *
 * **Preconditions:**
 * - `app.options.projectId` must be a non-empty string.
 *
 * **Behavior & Side Effects:** Synchronous, performs no network I/O, deep-clones and freezes
 * `settings`, and caches the {@link FirebaseSql} instance on `app` keyed by
 * `(resolvedEndpointUrl, schemaName)`. Note that `settings.headers` is excluded from the cache key;
 * use {@link Builder.setHeader} for per-operation headers.
 *
 * @param app - The {@link @firebase/app#FirebaseApp} instance whose `projectId`, Auth, and App Check providers will be used.
 * @param settings - Required service connection settings (`serviceId` and `location` are mandatory). See {@link SqlServiceSettings}.
 * @returns The cached or newly created {@link FirebaseSql} client instance for `app`.
 *
 * @throws {@link FirebaseSqlError} (`invalid-argument`, category `'sql-client'`)
 * Thrown when `app` is not a valid `FirebaseApp` object, `app.options.projectId` is missing/empty,
 * `settings`, `serviceId`, or `location` is missing/empty, `port` is not an integer in `1..65535`,
 * or `headers` includes a protected header name. **Remediation:** Pass a valid `FirebaseApp`
 * initialized with `projectId` and valid {@link SqlServiceSettings}.
 * @throws `TypeError`
 * Thrown when `settings.host` is not a valid hostname accepted by the WHATWG `URL` constructor
 * (for example, `''` or a string including `http://`). **Remediation:** Pass a bare hostname without protocol or path.
 *
 * @example
 * **Initialize Firebase SQL with an explicit `FirebaseApp` using the default schema**
 * ```ts
 * import { initializeApp } from 'firebase/app';
 * import { getSql } from 'firebase/sql';
 *
 * const app = initializeApp({
 *   apiKey: 'YOUR_API_KEY',
 *   appId: 'YOUR_APP_ID',
 *   projectId: 'my-firebase-project'
 * });
 *
 * const sql = getSql(app, {
 *   serviceId: 'events-db',
 *   location: 'us-central1'
 * });
 * ```
 *
 * @example
 * **Initialize Firebase SQL with an explicit `FirebaseApp` targeting a non-default schema**
 * ```ts
 * import { getApp } from 'firebase/app';
 * import { getSql } from 'firebase/sql';
 *
 * const app = getApp();
 *
 * const analyticsSql = getSql(app, {
 *   serviceId: 'events-db',
 *   location: 'us-central1',
 *   schemaName: 'analytics'
 * });
 * ```
 *
 * @see {@link SqlServiceSettings} for all configuration fields.
 * @see {@link terminate} for shutting down the returned instance.
 * @public
 */
export function getSql(
  app: FirebaseApp,
  settings: SqlServiceSettings
): FirebaseSql;

export function getSql(
  appOrSettings: FirebaseApp | SqlServiceSettings,
  settingsArg?: SqlServiceSettings
): FirebaseSql {
  let app: FirebaseApp;
  let rawSettings: SqlServiceSettings;

  if (settingsArg === undefined) {
    app = getApp();
    rawSettings = appOrSettings as SqlServiceSettings;
  } else {
    if (appOrSettings === undefined) {
      app = getApp();
    } else if (
      !appOrSettings ||
      typeof appOrSettings !== 'object' ||
      !('options' in appOrSettings)
    ) {
      throw new FirebaseSqlError(
        Code.INVALID_ARGUMENT,
        'First argument passed to getSql() must be a FirebaseApp or SqlServiceSettings instance.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    } else {
      app = appOrSettings;
    }
    rawSettings = settingsArg;
  }

  const validatedSettings = validateSqlServiceSettings(rawSettings);

  if (
    typeof app.options?.projectId !== 'string' ||
    app.options.projectId.length === 0
  ) {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      'Project ID must be provided in FirebaseApp options. Did you pass in a proper projectId to initializeApp?',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }

  const instanceIdentifier = getInstanceIdentifier(
    validatedSettings,
    app.options.projectId
  );
  const provider = _getProvider(app, FIREBASE_SQL_COMPONENT_NAME);

  if (provider.isInitialized(instanceIdentifier)) {
    logDebug(
      'Re-using cached instance (NOTE: custom headers set on the original FSQL client are RE-USED when that client is re-used from the instance cache. Creating multiple FSQL clients with the same settings and app, but different headers, is NOT supported. Instead, use .setHeaders() while building an operation chain to set custom headers for that specific operation.)'
    );
    return provider.getImmediate({ identifier: instanceIdentifier });
  }

  logDebug('Creating new Firebase SQL instance');
  return provider.initialize({
    instanceIdentifier,
    options: validatedSettings
  });
}

/**
 * Terminates a {@link FirebaseSql} client, aborts any in-flight HTTP requests, detaches Auth and
 * App Check token listeners, and evicts the instance from its `FirebaseApp` component cache.
 *
 * @remarks
 * **When to use:** Tearing down a client during test cleanup, user session isolation, or before
 * re-initializing a client with updated `headers` for the same `(app, serviceId, location, schemaName)`.
 *
 * **Behavior & Side Effects:**
 * - Idempotent: calling `terminate(sql)` repeatedly on an already-terminated instance resolves
 *   immediately without side effects and will not evict a newer client created afterward via {@link (getSql:1) | getSql()}.
 * - After termination, calling `sql.from()` or `sql.rpc()` throws {@link FirebaseSqlError}
 *   (`not-initialized`) synchronously.
 * - Pre-existing builders created before `terminate(sql)` continue chaining synchronously without
 *   throwing, but awaiting them (or any request already in flight) settles with
 *   {@link FirebaseSqlError} (`not-initialized`, category `'sql-client'`).
 *
 * @param sql - The {@link FirebaseSql} client instance to terminate.
 * @returns A `Promise` that resolves once token listeners are detached and the instance is removed from the registry.
 *
 * @example
 * **Terminate a client and create a fresh instance**
 * ```ts
 * import { getSql, terminate } from 'firebase/sql';
 *
 * const sql = getSql({ serviceId: 'events-db', location: 'us-central1' });
 * await terminate(sql);
 *
 * // Subsequent getSql() call creates a brand-new active instance
 * const nextSql = getSql({ serviceId: 'events-db', location: 'us-central1' });
 * ```
 *
 * @example
 * **Handle `Code.NOT_INITIALIZED` on builders created before termination**
 * ```ts
 * import { Code, getSql, terminate } from 'firebase/sql';
 *
 * const sql = getSql({ serviceId: 'events-db', location: 'us-central1' });
 * const pendingQuery = sql.from('events').select('id, title');
 *
 * await terminate(sql);
 *
 * const res = await pendingQuery;
 * if (!res.success && res.error.code === Code.NOT_INITIALIZED) {
 *   console.warn('Client was terminated before query executed.');
 * }
 * ```
 *
 * @see {@link (getSql:1) | getSql()} for creating a new client after termination.
 * @public
 */
export function terminate(sql: FirebaseSql): Promise<void> {
  return sql._delete();
}

/**
 * Computes a deterministic JSON instance identifier string.
 * Assumes settings have been validated!
 * @internal
 */
export function getInstanceIdentifier(
  settings: SqlServiceSettings,
  projectId: string
): string {
  const resolvedUrl = resolvePostgrestUrl(settings, projectId);
  return JSON.stringify({
    resolvedUrl,
    schemaName: settings.schemaName
  });
}
