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

import type { FirebaseSqlContext } from '../core/context';
import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import { mapPostgrestFailureToFirebaseSqlError } from '../core/errorMapper';
import { ServiceConfig, validateServiceConfig } from '../core/serviceConfig';
import { AppCheckProvider } from '../core/tokenProviders/AppCheckTokenProvider';
import { FirebaseAuthProvider } from '../core/tokenProviders/FirebaseAuthTokenProvider';
import type {
  UntypedClientOptions,
  UntypedDatabase,
  UntypedSchema
} from '../core/untypedSchema';
import { logDebug } from '../logger';
import { validateHeaders } from '../network/headers';
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
 * Configure read-only `GET` execution with exact row counting:
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
   * Defaults to `false`. Takes precedence over `get` when both are `true`.
   *
   * Parameters are serialized as URL query parameters unless any parameter value is a non-null
   * object (including plain objects, `Date`, `Map`, or an array containing an object), in which
   * case the client falls back to `POST` with `Prefer: return=minimal` because object arguments
   * cannot be encoded as PostgREST URL parameters. That `POST` fallback executes the function in a
   * read-write transaction on PostgREST and disables automatic `GET`/`HEAD` retries.
   *
   * Because `HEAD` responses carry no body, an HTTP `404` (for example, an unknown function) is
   * normalized to `status: 204` with `success: true` and `count: null`, and other `HEAD` failures
   * carry no PostgREST error code; treat `count === null` as a failed count when `count` was requested.
   */
  head?: boolean | undefined;

  /**
   * Calls the PostgreSQL function via HTTP `GET` with arguments encoded in the URL query string.
   *
   * @remarks
   * Defaults to `false`.
   *
   * When to use: invoking `IMMUTABLE` or `STABLE` read-only PostgreSQL functions with primitive or
   * flat-array arguments so automatic transient-error retries (`retry(true)`) apply.
   *
   * Do not use for functions that perform `INSERT`, `UPDATE`, or `DELETE` side effects or accept
   * nested JSON object parameters; omit `get` (or pass `false`) so arguments are sent in a `POST`
   * JSON body. Arguments with `undefined` values are omitted from the query string, top-level
   * arrays are formatted unquoted as `{a,b}` (`{value.join(',')}`), and all other non-array values
   * are stringified via `String(value)` (pass ISO strings via `date.toISOString()`, never raw `Date`).
   */
  get?: boolean | undefined;

  /**
   * Row-counting strategy sent via the `Prefer: count=<strategy>` header for set-returning (`RETURNS SETOF` / `RETURNS TABLE`) functions.
   *
   * @remarks
   * Defaults to `undefined`. Only the exact lowercase literals `'exact'` (full `COUNT(*)` scan),
   * `'planned'` (PostgreSQL planner estimate), and `'estimated'` (exact for small result sets,
   * planner estimate above PostgREST's threshold) populate `result.count` on
   * {@link OperationSuccess}; other strings are sent verbatim in `Prefer` while `result.count`
   * remains `null`.
   */
  count?: QueryCountStrategy | undefined;
}

/**
 * Service client bound to a `FirebaseApp` and a specific Firebase SQL PostgREST endpoint.
 *
 * @remarks
 * Do not instantiate directly: obtain instances via {@link (getSql:1) | getSql()}, which validates
 * the `ServiceConfig` and deduplicates clients per `(app, restUrl, schemaName)`.
 * Configure the target PostgreSQL schema via `schemaName` in {@link ServiceConfig} when calling
 * {@link (getSql:1) | getSql()} (you can also derive a modified `ServiceConfig` from an existing
 * {@link ServiceConfig} object via {@link copyServiceConfig}; `FirebaseSql` does not
 * expose a `.schema(name)` method).
 *
 * Read {@link FirebaseSql.restUrl} and {@link FirebaseSql.schemaName} to inspect the resolved
 * endpoint URL and active schema. Client-wide static HTTP headers can be configured via
 * {@link FirebaseSql.setHeaders} while {@link FirebaseSql.isMutable} is `true` (before the first call
 * to {@link FirebaseSql.from} or {@link FirebaseSql.rpc}). See {@link terminate} for shutting down
 * a client and evicting it from the app registry.
 *
 * Automatically attaches Firebase Authentication ID tokens (`x-firebase-auth-token`, with a single
 * automatic token refresh and retry on HTTP 401 when the authenticated UID is unchanged) and
 * Firebase App Check tokens (`x-firebase-appcheck`) when those services are registered on `app`
 * (including static `authIdToken` and `appCheckToken` credentials configured on a `FirebaseServerApp`
 * via `initializeServerApp`). If App Check cannot obtain a real token, it resolves with a
 * placeholder dummy token sent in `x-firebase-appcheck` (which the backend rejects when App Check
 * is enforced; `x-firebase-appcheck` is omitted only if the App Check provider itself rejects).
 * Auth `getToken()` rejections fail the request. When Auth or App Check has not finished
 * initializing yet, the SDK waits one macrotask (`setTimeout(..., 0)`) for initialization and
 * attaches the token if available; otherwise the request is sent without that token.
 *
 * @example
 * Query a table and invoke a stored function using a `FirebaseSql` client:
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
 *   .returns<number>();
 *
 * if (venuesRes.success && seatsRes.success) {
 *   console.log(venuesRes.data.length, seatsRes.data);
 * }
 * ```
 *
 * @public
 */
export class FirebaseSql {
  /**
   * The bound {@link @firebase/app#FirebaseApp} instance.
   *
   * @remarks
   * Supplies `options.projectId` for endpoint construction as well as optional `appId`, Firebase
   * Authentication, and Firebase App Check providers.
   *
   * @public
   */
  readonly app: FirebaseApp;

  /**
   * The resolved PostgREST base URL used to communicate with the backend Firebase SQL server.
   *
   * @remarks
   * Formatted as `{http|https}://{host}[:{port}]/v1/projects/{projectId}/locations/{location}/services/{serviceId}/postgrest`,
   * defaulting to `https` (unless `sslEnabled === false`) and
   * `'firebasedataconnect.googleapis.com'` (when `host` is omitted). The `projectId`,
   * `location`, and `serviceId` path segments are percent-encoded with `encodeURIComponent`.
   *
   * @public
   */
  readonly restUrl: string;

  /**
   * The PostgreSQL schema name sent over the wire for queries and RPC calls, or `undefined` to use
   * the server's default exposed schema.
   *
   * @remarks
   * Equals `serviceConfig.schemaName` passed to {@link (getSql:1) | getSql()}. When defined, sends
   * `Accept-Profile: <schemaName>` on `GET` and `HEAD` requests and `Content-Profile: <schemaName>`
   * on `POST`, `PATCH`, and `DELETE` mutations; when `undefined`, profile headers are omitted so
   * PostgREST uses the server's default schema. Included in the {@link (getSql:1) | getSql()}
   * instance cache key.
   *
   * @public
   */
  readonly schemaName: string | undefined;

  /**
   * Whether this client is still in the mutable configuration state where mutator methods such as
   * {@link FirebaseSql.setHeaders} are allowed.
   *
   * @remarks
   * Starts as `true` on newly created `FirebaseSql` instances and permanently transitions to `false`
   * on the first call to {@link FirebaseSql.from} or {@link FirebaseSql.rpc}, or when terminated via
   * {@link terminate} or `deleteApp()`.
   *
   * Because {@link (getSql:1) | getSql()} returns cached instances shared per
   * `(app, restUrl, schemaName)`, `isMutable` will already be `false` on a returned
   * instance if it was previously used.
   *
   * @public
   */
  get isMutable(): boolean {
    return this._state.name === 'mutable';
  }

  /** @internal */
  private _state: FirebaseSqlState;

  /**
   * Should only be called by {@link (getSql:1) | getSql()}, after validating inputs.
   * @internal
   */
  constructor(parameters: {
    app: FirebaseApp;
    serviceConfig: ServiceConfig;
    instanceIdentifier: string;
    authProvider: Provider<FirebaseAuthInternalName>;
    appCheckProvider: Provider<AppCheckInternalComponentName>;
  }) {
    const {
      app,
      serviceConfig,
      instanceIdentifier,
      authProvider,
      appCheckProvider
    } = parameters;

    this.app = app;
    this.schemaName = serviceConfig.schemaName;
    this.restUrl = resolvePostgrestUrl(serviceConfig, app.options.projectId!);

    this._state = {
      name: 'mutable',
      instanceIdentifier,
      headers: new Headers(),
      authProvider,
      appCheckProvider
    };
  }

  /**
   * Called by `@firebase/app` when the bound `FirebaseApp` is deleted.
   * @internal
   */
  _delete(): Promise<void> {
    if (this._state.name === 'terminated') {
      return Promise.resolve();
    }
    if (this._state.name === 'mutable') {
      const { instanceIdentifier } = this._state;
      this._state = { name: 'terminated' };
      _removeServiceInstance(
        this.app,
        FIREBASE_SQL_COMPONENT_NAME,
        instanceIdentifier
      );
      return Promise.resolve();
    }

    const { context, instanceIdentifier, abortController } = this._state;
    this._state = { name: 'terminated' };
    const { resources } = context;
    context.resources = null;

    abortController.abort(
      new FirebaseSqlError(
        Code.NOT_INITIALIZED,
        'The Firebase SQL client has been terminated.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      )
    );
    if (resources !== null) {
      resources.appCheckTokenProvider.terminate();
      resources.authTokenProvider.terminate();
    }
    _removeServiceInstance(
      this.app,
      FIREBASE_SQL_COMPONENT_NAME,
      instanceIdentifier
    );

    return Promise.resolve();
  }

  /**
   * Sets the client-wide static HTTP headers included on every outgoing request from this client,
   * overwriting any headers set by an earlier `setHeaders()` call.
   *
   * @remarks
   * When to use: configuring shared custom HTTP headers (such as tenant, locale, or correlation
   * headers) while {@link FirebaseSql.isMutable} is `true`, before calling {@link FirebaseSql.from}
   * or {@link FirebaseSql.rpc}. Use {@link Builder.setHeader} to attach or override a header for a
   * single request; a same-named header passed to `Builder.setHeader()` overrides the client-level
   * header for that request.
   *
   * Behavior and side effects: accepts any `HeadersInit` (`Record<string, string>`,
   * `[string, string][]`, or `Headers`), defensively copies it into a new `Headers` instance (so
   * mutating the caller's object, array, or `Headers` afterward has no effect), and replaces—rather
   * than merges with—any previously set client headers.
   *
   * Validation and error precedence: `headers` is parsed (`new Headers(headers)`) and checked for
   * protected header names synchronously before checking client lifecycle state (`mutable` or
   * terminated). A failing call leaves {@link FirebaseSql.isMutable} and any previously set headers
   * unchanged.
   *
   * Disallowed headers: do not pass authentication, App Check, or reserved Firebase telemetry and
   * routing headers (`Authorization`, `x-firebase-auth-token`, `x-firebase-appcheck`,
   * `x-goog-api-client`, `x-client-version`, `x-firebase-gmpid`, `x-firebase-client`,
   * `x-firebase-client-log-type`, `x-goog-request-params`, `x-firebase-sqlconnect-affinity`),
   * matched trimmed and case-insensitively. Firebase Auth and App Check tokens are attached
   * automatically when configured on {@link FirebaseSql.app}.
   *
   * @param headers - Static HTTP headers (`Record<string, string>`, `[string, string][]`, or `Headers`) to include on every outgoing request.
   *
   * @throws `TypeError`
   * Thrown synchronously if `headers` is a malformed `HeadersInit` or contains invalid HTTP header
   * names or values rejected by the Fetch `Headers` constructor (for example, spaces in header
   * names, CR/LF, or non-Latin-1 characters). Evaluated before lifecycle state checks.
   * @throws {@link FirebaseSqlError} (`invalid-argument`, category `'sql-client'`)
   * Thrown synchronously if any header name (trimmed, case-insensitive) matches a protected auth,
   * App Check, or Firebase telemetry/routing header (`Authorization`, `x-firebase-auth-token`,
   * `x-firebase-appcheck`, `x-goog-api-client`, `x-client-version`, `x-firebase-gmpid`,
   * `x-firebase-client`, `x-firebase-client-log-type`, `x-goog-request-params`,
   * `x-firebase-sqlconnect-affinity`). Evaluated before lifecycle state checks.
   * @throws {@link FirebaseSqlError} (`already-initialized`, category `'sql-client'`)
   * Thrown synchronously if {@link FirebaseSql.isMutable} is `false` because {@link FirebaseSql.from}
   * or {@link FirebaseSql.rpc} has already been called on this client.
   * @throws {@link FirebaseSqlError} (`not-initialized`, category `'sql-client'`)
   * Thrown synchronously if this client has been terminated via {@link terminate} or `deleteApp()`.
   *
   * @example
   * Configure client-wide headers before executing queries, overriding per-request as needed:
   * ```ts
   * import { getSql } from 'firebase/sql';
   *
   * const sql = getSql({
   *   serviceId: 'events-db',
   *   location: 'us-central1'
   * });
   *
   * if (sql.isMutable) {
   *   sql.setHeaders({
   *     'x-app-locale': 'en-US',
   *     'x-client-session': 'sess-42'
   *   });
   * }
   *
   * // Overwrites previous client headers with only 'x-app-locale'
   * sql.setHeaders([['x-app-locale', 'fr-FR']]);
   *
   * // First from() call locks setHeaders() (sql.isMutable becomes false)
   * const res = await sql
   *   .from('events')
   *   .select('id, title')
   *   .setHeader('x-app-locale', 'de-DE'); // Overrides for this request only
   * ```
   *
   * @public
   */
  setHeaders(headers: HeadersInit): void {
    const headersCopy = new Headers(headers);
    validateHeaders(headersCopy);

    if (this._state.name === 'immutable') {
      throw new FirebaseSqlError(
        Code.ALREADY_INITIALIZED,
        'The Firebase SQL client is no longer mutable; ' +
          'therefore, the headers may not be changed.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }
    if (this._state.name === 'terminated') {
      throw new FirebaseSqlError(
        Code.NOT_INITIALIZED,
        'The Firebase SQL client has been terminated; ' +
          'therefore, the headers may not be changed.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }

    this._state.headers = headersCopy;
  }

  private _assertNotTerminated(): void {
    if (this._state.name === 'terminated') {
      this._throwTerminatedError();
    }
  }

  private _throwTerminatedError(): never {
    throw new FirebaseSqlError(
      Code.NOT_INITIALIZED,
      'The Firebase SQL client has been terminated.',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }

  private _ensureImmutableStateOrThrow(): FirebaseSqlStateImmutable {
    if (this._state.name === 'terminated') {
      this._throwTerminatedError();
    }

    if (this._state.name === 'immutable') {
      return this._state;
    }

    const { instanceIdentifier, headers, authProvider, appCheckProvider } =
      this._state;

    // PostgrestClient is deliberately instantiated without a static `fetch` option.
    // Instead, `createBuilderFetch` is passed down to query/filter builders, which
    // bind an execution-isolated `fetch` dynamically on each query execution to ensure
    // concurrent executions of the same builder instance do not share a single
    // `BuilderExecutionTracker` closure.
    const postgrestClient = new PostgrestClient(this.restUrl, {
      headers,
      schema: this.schemaName
    });

    const abortController = new AbortController();
    const context: FirebaseSqlContext = {
      resources: {
        appId: this.app.options.appId,
        authTokenProvider: new FirebaseAuthProvider(this.app, authProvider),
        appCheckTokenProvider: new AppCheckProvider(this.app, appCheckProvider)
      },
      abortSignal: abortController.signal
    };

    this._state = {
      name: 'immutable',
      instanceIdentifier,
      abortController,
      postgrestClient,
      context
    };

    return this._state;
  }

  // Encode table and RPC names so `/`, `?`, `#`, and dot-segments cannot traverse out of
  // `/postgrest` or inject query parameters on the shared `firebasedataconnect.googleapis.com`
  // origin (deviating from `PostgrestClient`'s raw URL interpolation).
  private _encodePathSegment(segment: string): string {
    if (segment === '.' || segment === '..') {
      throw new FirebaseSqlError(
        Code.INVALID_ARGUMENT,
        `Invalid resource name "${segment}".`,
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }
    if (typeof segment !== 'string' || segment.length === 0) {
      return segment;
    }
    return encodeURIComponent(segment);
  }

  private _encodeTableName(table: string): string {
    if (!table || typeof table !== 'string' || table.trim() === '') {
      throw new Error(
        'Invalid relation name: relation must be a non-empty string.'
      );
    }
    return this._encodePathSegment(table);
  }

  private _encodeFunctionName(fn: string): string {
    return this._encodePathSegment(fn);
  }

  /**
   * Creates a reusable {@link QueryBuilder} scoped to a PostgreSQL table, view, or materialized view.
   *
   * @remarks
   * When to use: starting any `SELECT`, `INSERT`, `UPSERT`, `UPDATE`, or `DELETE` chain against a
   * relation in the client's configured PostgreSQL schema ({@link FirebaseSql.schemaName}, or the
   * server default schema when `undefined`). See {@link QueryBuilder} for available SQL verbs.
   *
   * Do not use for calling stored functions or procedures (use {@link FirebaseSql.rpc} instead),
   * passing `<Row>` type generics (`sql.from<EventRow>('events')` is not supported; apply
   * {@link Builder.returns} or {@link Builder.overrideTypes} later in the chain), or
   * schema-qualifying `table` as `'analytics.events'` (`table` is URI-encoded as a single path
   * segment; configure `schemaName: 'analytics'` in {@link (getSql:1) | getSql()} instead).
   *
   * Preconditions: this `FirebaseSql` instance must not have been terminated via {@link terminate}
   * or `deleteApp()`.
   *
   * Behavior and side effects: synchronous and performs no network I/O. On the first successful
   * call to `from()` or {@link FirebaseSql.rpc}, this client permanently transitions
   * {@link FirebaseSql.isMutable} to `false` (locking {@link FirebaseSql.setHeaders}) and lazily
   * initializes the underlying PostgREST client along with Firebase Authentication and App Check
   * token listeners. Terminated state (`not-initialized`) is checked before validating `table`,
   * and a throwing call leaves {@link FirebaseSql.isMutable} unchanged. The returned
   * {@link QueryBuilder} clones URL and header state on each verb call (`select`, `insert`, etc.),
   * so a single `sql.from('events')` reference can be safely stored and reused across concurrent
   * queries. Special URI characters (`/`, `?`, `#`) in `table` are percent-encoded to prevent
   * path traversal.
   *
   * @param table - Non-empty PostgreSQL table or view name (must not be `'.'`, `'..'`, or blank/whitespace).
   * @returns A stateless {@link QueryBuilder} for starting SQL verb chains on `table`.
   *
   * @throws {@link FirebaseSqlError} (`not-initialized`, category `'sql-client'`)
   * Thrown synchronously when called after {@link terminate} or `deleteApp()` (evaluated before
   * argument validation). Obtain a fresh client via {@link (getSql:1) | getSql()}.
   * @throws {@link FirebaseSqlError} (`invalid-argument`, category `'sql-client'`)
   * Thrown synchronously when `table` is `'.'` or `'..'`. Pass a valid PostgreSQL relation identifier.
   * @throws `Error`
   * Thrown synchronously when `table` is empty (`''`) or whitespace-only. Provide a non-blank table
   * or view name.
   *
   * @example
   * Reuse a table `QueryBuilder` across concurrent `Promise.all` reads:
   * ```ts
   * const eventsTable = sql.from('events');
   *
   * const [featuredRes, countRes] = await Promise.all([
   *   eventsTable.select('id, code, title').eq('is_featured', true),
   *   eventsTable.select('*', { head: true, count: 'exact' }).eq('status', 'published')
   * ]);
   *
   * if (featuredRes.success && countRes.success) {
   *   console.log(featuredRes.data.length, countRes.count);
   * }
   * ```
   *
   * @example
   * Perform CRUD operations against a shared table reference:
   * ```ts
   * const registrationsTable = sql.from('registrations');
   *
   * const created = await registrationsTable
   *   .insert({
   *     event_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
   *     user_uid: 'uid_carol',
   *     attendee_email: 'carol@example.com'
   *   })
   *   .select('id')
   *   .single()
   *   .returns<{ id: string }>();
   *
   * if (created.success) {
   *   const checkInRes = await registrationsTable
   *     .update({ checked_in_at: '2026-10-15T15:55:00Z' })
   *     .eq('id', created.data.id);
   *   if (!checkInRes.success) {
   *     console.error('Check-in update failed:', checkInRes.error.message);
   *   }
   * }
   * ```
   *
   * @public
   */
  from(table: string): QueryBuilder {
    this._assertNotTerminated();
    const encodedTable = this._encodeTableName(table);
    const { context, postgrestClient } = this._ensureImmutableStateOrThrow();
    const postgrestQueryBuilder = postgrestClient.from(encodedTable);
    return new QueryBuilderImpl(
      postgrestQueryBuilder,
      context,
      createBuilderFetch,
      mapPostgrestFailureToFirebaseSqlError
    );
  }

  /**
   * Creates a lazy {@link FilterBuilder} that invokes a PostgreSQL stored function or procedure (`RPC`).
   *
   * @remarks
   * When to use: calling custom server-side SQL or PL/pgSQL functions—including multi-statement
   * transactional workflows, server-side aggregations (`remaining_seats`), or set-returning
   * functions (`RETURNS SETOF` / `RETURNS TABLE` such as `list_events_by_city`) whose output rows
   * need further PostgREST filtering, ordering, or pagination.
   *
   * Do not use for standard single-table CRUD operations; prefer {@link FirebaseSql.from}.
   *
   * Preconditions: this `FirebaseSql` instance must not have been terminated via {@link terminate}
   * or `deleteApp()`. `Args` must be a plain non-iterable key-value object matching the PostgreSQL
   * function's named parameter names (arrays cannot be passed as the top-level `params` argument;
   * wrap array parameters inside an object key, such as `{ target_tags: ['firebase', 'ai'] }`).
   *
   * Behavior and side effects: builder progression is `FirebaseSql -> FilterBuilder<unknown, 'RPC', false>`.
   * On the first successful call to `rpc()` or {@link FirebaseSql.from}, this client permanently
   * transitions {@link FirebaseSql.isMutable} to `false` (locking {@link FirebaseSql.setHeaders})
   * and lazily initializes the underlying PostgREST client along with Firebase Authentication and
   * App Check token listeners. Terminated state (`not-initialized`) is checked before validating
   * `fn`, and a throwing call leaves {@link FirebaseSql.isMutable} unchanged. No HTTP request is
   * sent until the returned builder is `await`ed or `.then()` is invoked. Each `await` or
   * `.then()` call sends a new HTTP request (results are not cached); awaiting the same `rpc()`
   * builder twice executes the function twice and duplicates side effects for write functions, so
   * await each mutation RPC builder at most once.
   *
   * Defaults to `POST /rpc/{fn}` with JSON body `params ?? {}` (omit `params` for zero-argument
   * functions: `sql.rpc('fn')`). Set `options.get: true` in {@link FirebaseSqlRpcOptions} for
   * read-only functions to use `GET` with query parameters (enabling automatic transient-error
   * retries). Functions declared `RETURNS void` resolve with HTTP `204` and `data: null`.
   *
   * Untyped `data` defaults to `unknown`. `<Args>` types input `params` only—chain
   * {@link TransformBuilder.returns | .returns()} (or {@link Builder.returns} after `.single()` /
   * `.maybeSingle()`) to assign a full static return type to `result.data`, or chain
   * {@link Builder.overrideTypes | .overrideTypes()} when partially refining fields on a typed row.
   *
   * For set-returning functions (`RETURNS SETOF` / `RETURNS TABLE`), you can chain
   * {@link FilterBuilder} filters (`.eq()`, `.overlaps()`), {@link TransformBuilder} modifiers
   * (`.select()`, `.order()`, `.limit()`, `.single()`, `.maxAffected()`), and {@link Builder}
   * modifiers before awaiting.
   *
   * Error handling: resolves to {@link OperationFailure} (`{ success: false, error: FirebaseSqlError }`)
   * on HTTP, PostgREST (`'sql-postgrest'`, such as `'PGRST202'` when function signature or parameter
   * names do not match), gateway (`'sql-platform'`), or network (`'sql-client'`) failures. Chain
   * {@link Builder.throwOnError} to reject with {@link FirebaseSqlError} instead.
   *
   * @typeParam Args - Non-iterable object mapping PostgreSQL function parameter names to values.
   * @param fn - PostgreSQL function name in the active schema ({@link FirebaseSql.schemaName}, or the server default schema when `undefined`; must not be `'.'` or `'..'`; special URI characters are percent-encoded).
   * @param params - Named arguments object passed to the PostgreSQL function. In `POST` mode, serialized with `JSON.stringify` (`bigint` values serialize via `.toString()`, `undefined` properties and functions are omitted, `NaN`/`Infinity` serialize as `null`, `Date` serializes to ISO-8601, and circular references resolve at `await` time as `res.status === 0`, `res.error.category === 'sql-client'`, `res.error.code === 'other'`).
   * @param options - HTTP verb (`get`, `head`) and `count` configuration. See {@link FirebaseSqlRpcOptions}.
   * @returns A lazy {@link FilterBuilder} with untyped result `unknown` and method tag `'RPC'`.
   *
   * @throws {@link FirebaseSqlError} (`not-initialized`, category `'sql-client'`)
   * Thrown synchronously when called after {@link terminate} or `deleteApp()` (evaluated before
   * argument validation). Re-initialize a client with {@link (getSql:1) | getSql()}.
   * @throws {@link FirebaseSqlError} (`invalid-argument`, category `'sql-client'`)
   * Thrown synchronously when `fn` is `'.'` or `'..'`. Pass a valid PostgreSQL function name.
   *
   * @example
   * Full RPC verb chain on a set-returning function (`RETURNS SETOF events`):
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
   *   .returns<EventRow[]>();
   *
   * if (!cityEvents.success) {
   *   console.error(cityEvents.error.code, cityEvents.error.hint);
   * } else {
   *   console.log(`Showing ${cityEvents.data.length} of ${cityEvents.count} events`);
   * }
   * ```
   *
   * @example
   * Scalar read-only RPC returning a primitive value (`{ get: true }`):
   * ```ts
   * const seatsRes = await sql
   *   .rpc(
   *     'remaining_seats',
   *     { target_event_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' },
   *     { get: true }
   *   )
   *   .returns<number>();
   *
   * if (seatsRes.success) {
   *   console.log('Remaining seats:', seatsRes.data);
   * }
   * ```
   *
   * @example
   * Set-returning RPC sent via default `POST` JSON body with `.throwOnError()`:
   * ```ts
   * const { data } = await sql
   *   .rpc('list_events_by_city', { target_city: 'San Francisco' })
   *   .select('id, code, title')
   *   .returns<Array<{ id: string; code: string; title: string }>>()
   *   .throwOnError();
   * ```
   *
   * @example
   * Count-only `HEAD` RPC check (`data` resolves to `null`):
   * ```ts
   * const headRes = await sql.rpc(
   *   'list_events_by_city',
   *   { target_city: 'Seattle' },
   *   { head: true, count: 'exact' }
   * );
   *
   * if (headRes.success && headRes.count !== null) {
   *   console.log('Matching Seattle events:', headRes.count);
   * }
   * ```
   *
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
    this._assertNotTerminated();
    const encodedFn = this._encodeFunctionName(fn);
    const { context, postgrestClient } = this._ensureImmutableStateOrThrow();
    const postgrestFilterBuilder = postgrestClient.rpc(
      encodedFn,
      params,
      options
    );
    return new FilterBuilderImpl<unknown, 'RPC'>(
      postgrestFilterBuilder,
      context,
      createBuilderFetch,
      mapPostgrestFailureToFirebaseSqlError
    );
  }
}

/**
 * Returns the cached or newly initialized {@link FirebaseSql} client bound to the default
 * {@link @firebase/app#FirebaseApp} and the specified {@link ServiceConfig}.
 *
 * @remarks
 * When to use: standard single-app setups where `initializeApp({ projectId, ... })` has already
 * been called for the default Firebase app.
 *
 * Do not use in multi-app environments targeting a named secondary `FirebaseApp` (pass `app`
 * explicitly via {@link (getSql:2) | getSql(app, serviceConfig)}).
 *
 * Preconditions: the default `FirebaseApp` must be initialized via `initializeApp(...)` with a
 * non-empty `options.projectId`.
 *
 * Behavior and side effects: synchronous, performs no network I/O, copies and freezes
 * `serviceConfig`, and caches the resulting {@link FirebaseSql} instance on the default app keyed by
 * `(restUrl, schemaName)`. Repeated calls with the same resolved endpoint and
 * `schemaName` return the shared cached instance, including its {@link FirebaseSql.isMutable} and
 * {@link FirebaseSql.setHeaders} state—if the cached instance has already been used, `isMutable` is
 * `false`; use {@link Builder.setHeader} for per-request headers or call {@link terminate} first
 * to obtain a fresh mutable client. Note that if `serviceConfig.host` contains a scheme or path (such
 * as `'http://example.com'`), it does not throw—it resolves to the unintended hostname `'http'` and
 * overwrites the path, so always pass a bare hostname.
 *
 * @param serviceConfig - Required service connection configuration (`serviceId` and `location` are mandatory). See {@link ServiceConfig}.
 * @returns The cached or newly created {@link FirebaseSql} client instance.
 *
 * @throws `FirebaseError` (`app/no-app`)
 * Thrown when no default `FirebaseApp` has been initialized. Call `initializeApp({ projectId: '...' })`
 * before calling `getSql(serviceConfig)`.
 * @throws {@link FirebaseSqlError} (`invalid-argument`, category `'sql-client'`)
 * Thrown when `serviceConfig` is missing or not an object, `serviceId` or `location` is empty, `port`
 * is outside `1..65535` or non-integer, or `app.options.projectId` is missing/empty. Supply
 * non-empty `projectId`, `serviceId`, and `location`, and an integer `port` in `1..65535`.
 * @throws `TypeError`
 * Thrown synchronously (before cache lookup) when `serviceConfig.host` cannot be parsed as a valid URL
 * host by `new URL(...)` (such as `''`). Note that a scheme or path in `serviceConfig.host` is not
 * rejected by `URL` and silently produces a wrong endpoint.
 *
 * @example
 * Initialize Firebase SQL using the default schema:
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
 * Initialize Firebase SQL targeting a non-default schema:
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
 * @public
 */
export function getSql(serviceConfig: ServiceConfig): FirebaseSql;

/**
 * Returns the cached or newly initialized {@link FirebaseSql} client bound to the given
 * {@link @firebase/app#FirebaseApp} and {@link ServiceConfig}.
 *
 * @remarks
 * When to use: binding to a specific `FirebaseApp` instance (including named secondary apps or
 * `FirebaseServerApp` instances created via `initializeServerApp`) or maintaining explicit
 * dependency injection of `app`.
 *
 * Preconditions: `app.options.projectId` must be a non-empty string.
 *
 * Behavior and side effects: synchronous, performs no network I/O, copies and freezes
 * `serviceConfig`, and caches the {@link FirebaseSql} instance on `app` keyed by
 * `(restUrl, schemaName)`. Repeated calls with the same resolved endpoint and
 * `schemaName` return the shared cached instance, sharing its {@link FirebaseSql.isMutable} and
 * {@link FirebaseSql.setHeaders} state—if the cached instance has already been used, `isMutable` is
 * `false`; use {@link Builder.setHeader} for per-operation headers, or call {@link terminate} to
 * evict the cached instance and obtain a fresh mutable client. Note that passing a scheme or path
 * in `serviceConfig.host` does not throw and silently produces a wrong endpoint (for example,
 * `'http://example.com'` resolves to hostname `'http'`).
 *
 * @param app - The {@link @firebase/app#FirebaseApp} instance whose `projectId`, Auth, and App Check providers will be used.
 * @param serviceConfig - Required service connection configuration (`serviceId` and `location` are mandatory). See {@link ServiceConfig}.
 * @returns The cached or newly created {@link FirebaseSql} client instance for `app`.
 *
 * @throws {@link FirebaseSqlError} (`invalid-argument`, category `'sql-client'`)
 * Thrown when `app` is not an object with an `options` property (note that passing `undefined` as
 * `app` falls back to the default app via `getApp()`, which throws `FirebaseError` `app/no-app` if
 * no default app exists), `app.options.projectId` is missing/empty, `serviceConfig` is null or not an
 * object, `serviceId` or `location` is missing/empty, or `port` is not an integer in `1..65535`.
 * @throws `TypeError`
 * Thrown synchronously (before cache lookup) when `serviceConfig.host` cannot be parsed as a valid URL
 * host by `new URL(...)` (such as `''`). Note that a scheme or path in `serviceConfig.host` is not
 * rejected by `URL` and silently produces a wrong endpoint.
 *
 * @example
 * Initialize Firebase SQL with an explicit `FirebaseApp` using the default schema:
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
 * Initialize Firebase SQL with an explicit `FirebaseApp` targeting a non-default schema:
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
 * @public
 */
export function getSql(
  app: FirebaseApp,
  serviceConfig: ServiceConfig
): FirebaseSql;

export function getSql(
  appOrServiceConfig: FirebaseApp | ServiceConfig,
  serviceConfig?: ServiceConfig
): FirebaseSql {
  let app: FirebaseApp;
  let rawServiceConfig: ServiceConfig;

  if (serviceConfig === undefined) {
    app = getApp();
    rawServiceConfig = appOrServiceConfig as ServiceConfig;
  } else {
    if (appOrServiceConfig === undefined) {
      app = getApp();
    } else if (
      !appOrServiceConfig ||
      typeof appOrServiceConfig !== 'object' ||
      !('options' in appOrServiceConfig)
    ) {
      throw new FirebaseSqlError(
        Code.INVALID_ARGUMENT,
        'First argument passed to getSql() must be a FirebaseApp or ServiceConfig instance.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    } else {
      app = appOrServiceConfig;
    }
    rawServiceConfig = serviceConfig;
  }

  const validatedServiceConfig = validateServiceConfig(rawServiceConfig);

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
    validatedServiceConfig,
    app.options.projectId
  );
  const provider = _getProvider(app, FIREBASE_SQL_COMPONENT_NAME);

  if (provider.isInitialized(instanceIdentifier)) {
    logDebug('Re-using cached Firebase SQL instance');
    return provider.getImmediate({ identifier: instanceIdentifier });
  }

  logDebug('Creating new Firebase SQL instance');
  return provider.initialize({
    instanceIdentifier,
    options: validatedServiceConfig
  });
}

/**
 * Terminates a {@link FirebaseSql} client, aborts any in-flight HTTP requests, cancels pending
 * Auth and App Check initialization subscriptions, and evicts the instance from its `FirebaseApp`
 * component cache.
 *
 * @remarks
 * When to use: tearing down a client during test cleanup, user session isolation, or evicting a
 * used client so a subsequent {@link (getSql:1) | getSql()} call creates a fresh client with
 * {@link FirebaseSql.isMutable} equal to `true` (for example, to call {@link FirebaseSql.setHeaders}
 * again after queries have started).
 *
 * Behavior and side effects: idempotent—calling `terminate(sql)` repeatedly on an
 * already-terminated instance resolves immediately without side effects and will not evict a newer
 * client created afterward via {@link (getSql:1) | getSql()}.
 *
 * After termination, calling {@link FirebaseSql.from}, {@link FirebaseSql.rpc}, or
 * {@link FirebaseSql.setHeaders} (after header syntax and protected-header validation) throws
 * {@link FirebaseSqlError} (`not-initialized`, category `'sql-client'`) synchronously. Pre-existing
 * builders created before `terminate(sql)` continue chaining synchronously without throwing, but
 * awaiting them (or any request already in flight) settles with {@link FirebaseSqlError}
 * (`not-initialized`, category `'sql-client'`).
 *
 * @param sql - The {@link FirebaseSql} client instance to terminate.
 * @returns A `Promise` that resolves immediately after the instance is marked terminated, pending initialization subscriptions are cancelled, and the instance is removed from the registry.
 *
 * @example
 * Terminate a client and create a fresh instance:
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
 * Handle `Code.NOT_INITIALIZED` on builders created before termination:
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
 * @public
 */
export function terminate(sql: FirebaseSql): Promise<void> {
  return sql._delete();
}

/**
 * Computes a deterministic JSON instance identifier string.
 * Assumes `serviceConfig` has been validated!
 * @internal
 */
export function getInstanceIdentifier(
  serviceConfig: ServiceConfig,
  projectId: string
): string {
  const resolvedUrl = resolvePostgrestUrl(serviceConfig, projectId);
  return JSON.stringify({
    resolvedUrl,
    schemaName: serviceConfig.schemaName
  });
}

type FirebaseSqlState =
  | FirebaseSqlStateMutable
  | FirebaseSqlStateImmutable
  | FirebaseSqlStateTerminated;

interface FirebaseSqlStateMutable {
  name: 'mutable';
  instanceIdentifier: string;
  headers: Headers;
  authProvider: Provider<FirebaseAuthInternalName>;
  appCheckProvider: Provider<AppCheckInternalComponentName>;
}

interface FirebaseSqlStateImmutable {
  name: 'immutable';
  instanceIdentifier: string;
  abortController: AbortController;
  postgrestClient: PostgrestClient<
    UntypedDatabase,
    UntypedClientOptions,
    string,
    UntypedSchema
  >;
  context: FirebaseSqlContext;
}

interface FirebaseSqlStateTerminated {
  name: 'terminated';
}
