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

import { FirebaseSqlErrorCategory, Code, FirebaseSqlError } from './error';

/**
 * Connection and routing configuration for a {@link FirebaseSql} service client instance
 * initialized via {@link (getSql:1) | getSql()}.
 *
 * @remarks
 * Passed to {@link (getSql:1) | getSql()}, which validates `serviceId`, `location`, and `port`,
 * creates a shallow frozen copy, and resolves the PostgREST endpoint URL as
 * `{http|https}://{host}[:{port}]/v1/projects/{projectId}/locations/{location}/services/{serviceId}/postgrest`.
 *
 * Instance caching and HTTP headers: {@link (getSql:1) | getSql()} deduplicates instances by
 * `(app, resolvedEndpointUrl, schemaName)`. Use {@link FirebaseSql.setHeaders} to configure
 * client-wide static headers while {@link FirebaseSql.mutable} is `true`, and use
 * {@link Builder.setHeader} for per-request header overrides. See {@link (getSql:1) | getSql()} for
 * client initialization and error rules.
 *
 * @example
 * Configure a `ServiceConfig` using the default schema:
 * ```ts
 * import type { ServiceConfig } from 'firebase/sql';
 *
 * const serviceConfig: ServiceConfig = {
 *   serviceId: 'events-db',
 *   location: 'us-central1'
 * };
 * ```
 *
 * @example
 * Configure a `ServiceConfig` targeting a non-default PostgreSQL schema:
 * ```ts
 * import type { ServiceConfig } from 'firebase/sql';
 *
 * const analyticsServiceConfig: ServiceConfig = {
 *   serviceId: 'events-db',
 *   location: 'us-central1',
 *   schemaName: 'analytics'
 * };
 * ```
 *
 * @public
 */
export interface ServiceConfig {
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
 * Creates a mutable shallow copy of a {@link ServiceConfig} object (`Object.assign({}, serviceConfig)`).
 *
 * @remarks
 * When to use: deriving a modified configuration (for example, targeting another `schemaName` or
 * `serviceId`) from an existing or frozen {@link ServiceConfig} object without mutating the
 * original.
 *
 * Behavior and side effects: pure synchronous shallow copy with no network I/O or validation. The
 * returned object is unfrozen and safe to mutate before passing to {@link (getSql:1) | getSql()}.
 *
 * @param serviceConfig - Source {@link ServiceConfig} object to copy.
 * @returns A new mutable shallow copy of `serviceConfig`.
 *
 * @example
 * Derive a secondary schema client from an existing ServiceConfig object:
 * ```ts
 * import {
 *   copyServiceConfig,
 *   getSql,
 *   type ServiceConfig
 * } from 'firebase/sql';
 *
 * const baseServiceConfig: ServiceConfig = {
 *   serviceId: 'events-db',
 *   location: 'us-central1'
 * };
 * const sql = getSql(baseServiceConfig);
 *
 * const analyticsServiceConfig = copyServiceConfig(baseServiceConfig);
 * analyticsServiceConfig.schemaName = 'analytics';
 * const analyticsSql = getSql(analyticsServiceConfig);
 * ```
 *
 * @public
 */
export function copyServiceConfig(serviceConfig: ServiceConfig): ServiceConfig {
  return Object.assign({}, serviceConfig);
}

/**
 * Freezes a `ServiceConfig` object in place using `Object.freeze` and returns `void`.
 * @internal
 */
export function freezeServiceConfig(serviceConfig: ServiceConfig): void {
  Object.freeze(serviceConfig);
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
 * Copies the given `ServiceConfig` via {@link copyServiceConfig}, freezes the copy in
 * place, validates required fields (`serviceId`, `location`) and optional `port`, and returns the
 * frozen copy.
 *
 * @returns a frozen shallow copy of the ServiceConfig.
 * @throws `FirebaseSqlError` with `Code.INVALID_ARGUMENT` and `FirebaseSqlErrorCategory.SQL_CLIENT` if `serviceConfig` is missing or any validated field is invalid.
 * @internal
 */
export function validateServiceConfig(
  serviceConfig: ServiceConfig
): ServiceConfig {
  if (!serviceConfig) {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      'ServiceConfig must be provided.',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }

  serviceConfig = copyServiceConfig(serviceConfig);
  freezeServiceConfig(serviceConfig);

  if (!serviceConfig.serviceId) {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      'serviceId is required.',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }
  if (!serviceConfig.location) {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      'location is required.',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }
  validatePort(serviceConfig.port);

  return serviceConfig;
}
