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

import { validateHeaders } from '../network/headers';

import { FirebaseSqlErrorCategory, Code, FirebaseSqlError } from './error';

/**
 * Connection and routing configuration for a {@link FirebaseSql} service client instance
 * initialized via {@link (getSql:1) | getSql()}.
 *
 * @remarks
 * Passed to {@link (getSql:1) | getSql()}, which validates `serviceId`, `location`, `port`, and
 * protected `headers` keys, creates a deep frozen copy, and resolves the PostgREST endpoint URL as
 * `{http|https}://{host}[:{port}]/v1/projects/{projectId}/locations/{location}/services/{serviceId}/postgrest`.
 *
 * Instance caching: {@link (getSql:1) | getSql()} deduplicates instances by `(app, resolvedUrl, schemaName)`.
 * Different `headers` objects passed with an already-initialized `(app, resolvedUrl, schemaName)`
 * reuse the cached {@link FirebaseSql} instance and its original `headers`; use
 * {@link Builder.setHeader} for per-request header overrides. See {@link (getSql:1) | getSql()} for
 * client initialization and error rules.
 *
 * @example
 * Configure settings using the default schema:
 * ```ts
 * import type { SqlServiceSettings } from 'firebase/sql';
 *
 * const settings: SqlServiceSettings = {
 *   serviceId: 'events-db',
 *   location: 'us-central1'
 * };
 * ```
 *
 * @example
 * Configure settings targeting a non-default PostgreSQL schema:
 * ```ts
 * import type { SqlServiceSettings } from 'firebase/sql';
 *
 * const analyticsSettings: SqlServiceSettings = {
 *   serviceId: 'events-db',
 *   location: 'us-central1',
 *   schemaName: 'analytics'
 * };
 * ```
 *
 * @public
 */
export interface SqlServiceSettings {
  /**
   * Target PostgreSQL schema exposed by PostgREST (for example, `'analytics'`).
   *
   * @remarks
   * Defaults to `undefined`. When specified, sends `Accept-Profile: <schemaName>` on `GET` and
   * `HEAD` requests and `Content-Profile: <schemaName>` on `POST`, `PATCH`, and `DELETE` mutations.
   * Omitting `schemaName` (or passing `undefined`) omits profile headers and uses the server's
   * default exposed schema, so specifying `'public'` is unnecessary when `'public'` is the default
   * schema.
   *
   * Do not pass an empty string `''`—it sends an empty profile header that PostgREST rejects with
   * HTTP `406` (`'PGRST106'`). Must be a valid HTTP header value (Latin-1 characters with no CR or
   * LF); otherwise awaiting any builder on the client rejects with a `TypeError` when setting the
   * profile header. Note that omitting `schemaName` and passing an explicit `schemaName` string
   * produce distinct cached {@link FirebaseSql} instances.
   */
  schemaName?: string | undefined;

  /**
   * Static custom HTTP headers included on every outgoing request from this client instance.
   *
   * @remarks
   * Defaults to `undefined`. Do not use for authentication or App Check tokens (`Authorization`,
   * `x-firebase-auth-token`, `x-firebase-appcheck`) or reserved Firebase telemetry and routing
   * headers (`x-goog-api-client`, `x-client-version`, `x-firebase-gmpid`, `x-firebase-client`,
   * `x-firebase-client-log-type`, `x-goog-request-params`, `x-firebase-sqlconnect-affinity`).
   * Supplying any protected header key (case-insensitive) causes {@link (getSql:1) | getSql()} to
   * throw {@link FirebaseSqlError} (`invalid-argument`). Every header name and value must also be a
   * valid HTTP header accepted by the Fetch `Headers` constructor (no spaces in header names, no
   * CR/LF, and Latin-1 characters only), or {@link (getSql:1) | getSql()} throws a `TypeError`
   * synchronously when creating a new client (if a client is already cached for the same endpoint
   * and `schemaName`, `getSql()` returns the cached client and ignores `settings.headers`).
   * Firebase Auth and App Check tokens are attached automatically when configured on
   * the bound `FirebaseApp`.
   *
   * Excluded from the {@link (getSql:1) | getSql()} instance cache key; use {@link Builder.setHeader}
   * for request-scoped headers.
   */
  headers?: Record<string, string> | undefined;

  /**
   * Non-empty Firebase SQL service identifier within the Firebase project (for example, `'events-db'`).
   *
   * @remarks
   * Required. Passing an empty string causes {@link (getSql:1) | getSql()} to throw
   * {@link FirebaseSqlError} (`invalid-argument`). Percent-encoded when constructing the
   * `/services/{serviceId}/postgrest` URL path.
   */
  serviceId: string;

  /**
   * Non-empty Google Cloud region hosting the Firebase SQL service (for example, `'us-central1'`).
   *
   * @remarks
   * Required. Passing an empty string causes {@link (getSql:1) | getSql()} to throw
   * {@link FirebaseSqlError} (`invalid-argument`). Percent-encoded when constructing the
   * `/locations/{location}/` URL path.
   */
  location: string;

  /**
   * Custom endpoint hostname (without protocol or path) overriding the default Firebase SQL service host.
   *
   * @remarks
   * Defaults to `'firebasedataconnect.googleapis.com'`. Must be a bare hostname (optionally
   * `host:port`) with no scheme or path. Only values rejected by the WHATWG `URL` parser when
   * prefixed with `https://` (such as `''`) cause {@link (getSql:1) | getSql()} to throw a
   * `TypeError`; passing a scheme or path is not rejected and silently produces a wrong endpoint
   * (for example, `'http://example.com'` resolves to hostname `'http'`, and any path segment is
   * overwritten).
   */
  host?: string | undefined;

  /**
   * Custom TCP port number appended to the resolved service endpoint URL.
   *
   * @remarks
   * Defaults to `undefined`. When provided, must be an integer between `1` and `65535` inclusive;
   * non-integers or out-of-range values cause {@link (getSql:1) | getSql()} to throw
   * {@link FirebaseSqlError} (`invalid-argument`).
   */
  port?: number | undefined;

  /**
   * Controls whether requests use `https:` (`true` or `undefined`) or `http:` (`false`).
   *
   * @remarks
   * Defaults to `true`. Omitting `sslEnabled` and setting `sslEnabled: true` resolve to the same
   * `https:` endpoint and share the same cached {@link FirebaseSql} instance.
   */
  sslEnabled?: boolean | undefined;
}

/**
 * Creates a mutable deep copy of a {@link SqlServiceSettings} object, cloning nested `headers` if present.
 *
 * @remarks
 * When to use: cloning a frozen `sql.settings` object (returned by {@link FirebaseSql.settings})
 * to derive configuration for another {@link FirebaseSql} instance (such as targeting a different
 * `schemaName` or `serviceId`).
 *
 * Behavior and side effects: pure synchronous clone with no network I/O or validation. Unlike
 * `sql.settings`, the returned object and its `headers` map are unfrozen and safe to mutate before
 * passing to {@link (getSql:1) | getSql()}.
 *
 * @param settings - Source {@link SqlServiceSettings} object to clone.
 * @returns A new mutable {@link SqlServiceSettings} object with an independent copy of `headers`.
 *
 * @example
 * Derive a secondary schema client from existing settings:
 * ```ts
 * import { copySqlServiceSettings, getSql } from 'firebase/sql';
 *
 * const sql = getSql({ serviceId: 'events-db', location: 'us-central1' });
 * const analyticsSettings = copySqlServiceSettings(sql.settings);
 * analyticsSettings.schemaName = 'analytics';
 *
 * const analyticsSql = getSql(sql.app, analyticsSettings);
 * ```
 *
 * @public
 */
export function copySqlServiceSettings(
  settings: SqlServiceSettings
): SqlServiceSettings {
  const settingsCopy: SqlServiceSettings = Object.assign({}, settings);
  if (settings.headers !== undefined) {
    settingsCopy.headers = Object.assign({}, settings.headers);
  }
  return settingsCopy;
}

/**
 * Freezes a deep copy of the `SqlServiceSettings`.
 * @internal
 */
export function freezeSqlServiceSettings(
  settings: SqlServiceSettings
): SqlServiceSettings {
  const settingsCopy = copySqlServiceSettings(settings);
  if (settingsCopy.headers !== undefined) {
    Object.freeze(settingsCopy.headers);
  }
  return Object.freeze(settingsCopy);
}

/**
 * Validates that the provided port is a valid TCP port number.
 *
 * @throws `FirebaseSqlError` with `Code.INVALID_ARGUMENT` and `FirebaseSqlErrorCategory.SQL_CLIENT` if port is invalid.
 */
function validatePort(port: unknown): void {
  if (port === undefined) {
    return;
  }
  if (
    typeof port !== 'number' ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      `Port must be a valid integer between 1 and 65535 if provided. Received: ${String(port)}.`,
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }
}

/**
 * Validates required `SqlServiceSettings` fields.
 *
 * @returns a deep, frozen copy of the settings.
 * @throws `FirebaseSqlError` with `Code.INVALID_ARGUMENT` and `FirebaseSqlErrorCategory.SQL_CLIENT` if required fields are missing or invalid.
 * @internal
 */
export function validateSqlServiceSettings(
  settings: SqlServiceSettings
): SqlServiceSettings {
  if (!settings) {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      'SqlServiceSettings must be provided.',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }
  if (!settings.serviceId) {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      'serviceId is required.',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }
  if (!settings.location) {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      'location is required.',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }
  validatePort(settings.port);
  validateHeaders(settings.headers);
  return freezeSqlServiceSettings(settings);
}
