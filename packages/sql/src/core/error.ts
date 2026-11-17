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

import { FirebaseError } from '@firebase/util';

/**
 * Canonical client and platform error codes emitted by Firebase SQL operations.
 *
 * @remarks
 * {@link FirebaseSqlError.code} is typed as `string` because errors with
 * `category === 'sql-postgrest'` preserve raw PostgreSQL SQLSTATE codes (such as `'23505'` for
 * unique-constraint violations or `'42501'` for insufficient privilege) and PostgREST `PGRST*`
 * codes (such as `'PGRST116'` when `.single()` or `.maybeSingle()` row-count expectations fail).
 * Client (`'sql-client'`) and non-PostgREST (`'sql-platform'`) errors emit values from
 * `FirebaseSqlErrorCode` (see runtime constants in {@link (Code:variable) | Code}).
 *
 * @example
 * Type-annotate a helper handling client and platform error codes:
 * ```ts
 * import { Code, type FirebaseSqlErrorCode } from 'firebase/sql';
 *
 * function isAuthFailure(code: FirebaseSqlErrorCode | string): boolean {
 *   return code === Code.UNAUTHORIZED;
 * }
 * ```
 *
 * @public
 */
export type FirebaseSqlErrorCode =
  | 'other'
  | 'already-initialized'
  | 'not-initialized'
  | 'not-supported'
  | 'invalid-argument'
  | 'partial-error'
  | 'unauthorized';

/**
 * Alias for {@link FirebaseSqlErrorCode}.
 *
 * @example
 * Reference `Code` as both a type and a runtime constant map:
 * ```ts
 * import { Code } from 'firebase/sql';
 *
 * const expected: Code = Code.NOT_INITIALIZED;
 * ```
 *
 * @public
 */
export type Code = FirebaseSqlErrorCode;

/**
 * Frozen map of canonical client and platform error code constants.
 *
 * @remarks
 * Compare against `error.code` when handling `'sql-client'` and `'sql-platform'` errors.
 *
 * `Code.INVALID_ARGUMENT` (`'invalid-argument'`): missing `projectId`, `serviceId`, or `location`
 * (in {@link (getSql:1) | getSql()}), invalid `port`, dot-segment resource name (`'.'` or `'..'`,
 * in {@link FirebaseSql.from} or {@link FirebaseSql.rpc}), disallowed HTTP header (in
 * {@link FirebaseSql.setHeaders} or {@link Builder.setHeader}), or HTTP 400 non-PostgREST gateway
 * rejection.
 *
 * `Code.NOT_INITIALIZED` (`'not-initialized'`): client method ({@link FirebaseSql.setHeaders},
 * {@link FirebaseSql.from}, {@link FirebaseSql.rpc}) or builder operation called or settled after
 * {@link terminate} or `deleteApp()`.
 *
 * `Code.NOT_SUPPORTED` (`'not-supported'`): global `fetch` unavailable in runtime (`'sql-client'`),
 * or HTTP 501 / `UNIMPLEMENTED` gateway rejection (`'sql-platform'`).
 *
 * `Code.UNAUTHORIZED` (`'unauthorized'`): emitted for `'sql-platform'` HTTP 401/403 or
 * `UNAUTHENTICATED` / `PERMISSION_DENIED` gateway, IAM, or App Check rejections. PostgreSQL and
 * PostgREST privilege errors preserve SQLSTATE `'42501'` or `'PGRST*'` under `'sql-postgrest'`, and
 * client-side Auth `getToken()` failures map to `Code.OTHER` under `'sql-client'`.
 *
 * `Code.OTHER` (`'other'`): network failure, aborted request, circular JSON request body,
 * client-side Auth token retrieval failure (`res.status === 0`, `'sql-client'`), or unmapped
 * `'sql-platform'` response (such as HTTP 502/504 or unparseable 2xx body).
 *
 * `Code.ALREADY_INITIALIZED` (`'already-initialized'`): thrown synchronously by
 * {@link FirebaseSql.setHeaders} (`category: 'sql-client'`) when called after the client has
 * transitioned to {@link FirebaseSql.mutable} === false (i.e., after the first
 * {@link FirebaseSql.from} or {@link FirebaseSql.rpc} call).
 *
 * `Code.PARTIAL_ERROR` (`'partial-error'`): reserved error code.
 *
 * @example
 * Branch on client and platform error codes:
 * ```ts
 * import { Code } from 'firebase/sql';
 *
 * const res = await sql.from('events').select('id, title');
 * if (!res.success && res.error.code === Code.UNAUTHORIZED) {
 *   console.error('Sign in or check App Check configuration:', res.error.message);
 * }
 * ```
 *
 * @public
 */
export const Code = Object.freeze({
  OTHER: 'other' as const satisfies FirebaseSqlErrorCode,
  ALREADY_INITIALIZED:
    'already-initialized' as const satisfies FirebaseSqlErrorCode,
  NOT_INITIALIZED: 'not-initialized' as const satisfies FirebaseSqlErrorCode,
  NOT_SUPPORTED: 'not-supported' as const satisfies FirebaseSqlErrorCode,
  INVALID_ARGUMENT: 'invalid-argument' as const satisfies FirebaseSqlErrorCode,
  PARTIAL_ERROR: 'partial-error' as const satisfies FirebaseSqlErrorCode,
  UNAUTHORIZED: 'unauthorized' as const satisfies FirebaseSqlErrorCode
});

/**
 * Origin tier discriminator identifying which layer produced a {@link FirebaseSqlError}.
 *
 * @remarks
 * {@link FirebaseSqlError.category} is typed as `string` at compile time, while SDK-generated
 * errors emit one of three values.
 *
 * `'sql-client'`: local SDK validation or client-state errors (in {@link (getSql:1) | getSql()},
 * {@link FirebaseSql.setHeaders}, {@link FirebaseSql.from}, {@link FirebaseSql.rpc}, or
 * {@link Builder.setHeader}), missing `fetch`, network drop, `AbortSignal` cancellation,
 * circular JSON body, Auth `getToken()` rejection, or terminated client (`error.status` is
 * `undefined`, while {@link OperationBase.status | OperationFailure.status} is `0`).
 *
 * `'sql-platform'`: any HTTP failure response whose body is not a PostgREST error envelope—typically
 * a Google Cloud gateway, IAM, or App Check rejection, but also proxy or gateway errors (such as
 * HTTP 502 or 504), body-less `HEAD` failures, or `2xx` responses with unparseable JSON bodies. Do
 * not assume the request had no effect on the server.
 *
 * `'sql-postgrest'`: PostgREST or PostgreSQL database execution failure (`code` contains a
 * PostgreSQL SQLSTATE or PostgREST `PGRST*` code).
 *
 * @example
 * Inspect an error category in a telemetry helper:
 * ```ts
 * import { Code, FirebaseSqlErrorCategory, type FirebaseSqlError } from 'firebase/sql';
 *
 * function describeOrigin(err: FirebaseSqlError): FirebaseSqlErrorCategory | 'custom' {
 *   if (
 *     err.category === FirebaseSqlErrorCategory.SQL_CLIENT ||
 *     err.category === FirebaseSqlErrorCategory.SQL_PLATFORM ||
 *     err.category === FirebaseSqlErrorCategory.SQL_POSTGREST
 *   ) {
 *     if (err.category === FirebaseSqlErrorCategory.SQL_CLIENT && err.code === Code.OTHER) {
 *       // Transport/abort failure: an in-flight write may or may not have reached the server.
 *     }
 *     return err.category;
 *   }
 *   return 'custom';
 * }
 * ```
 *
 * @public
 */
export type FirebaseSqlErrorCategory =
  'sql-postgrest' | 'sql-platform' | 'sql-client';

/**
 * Frozen map of {@link (FirebaseSqlErrorCategory:type) | FirebaseSqlErrorCategory} constants for discriminating error origin tiers.
 *
 * @example
 * Distinguish PostgreSQL errors from gateway or client failures:
 * ```ts
 * import { FirebaseSqlErrorCategory } from 'firebase/sql';
 *
 * const res = await sql.from('events').select('id, code');
 * if (!res.success && res.error.category === FirebaseSqlErrorCategory.SQL_POSTGREST) {
 *   console.error('Database error SQLSTATE/PGRST:', res.error.code, res.error.hint);
 * }
 * ```
 *
 * @public
 */
export const FirebaseSqlErrorCategory = Object.freeze({
  SQL_POSTGREST: 'sql-postgrest' as const satisfies FirebaseSqlErrorCategory,
  SQL_PLATFORM: 'sql-platform' as const satisfies FirebaseSqlErrorCategory,
  SQL_CLIENT: 'sql-client' as const satisfies FirebaseSqlErrorCategory
});

/**
 * Plain JSON-serializable object returned by {@link FirebaseSqlError.toJSON}.
 *
 * @example
 * Serialize a `FirebaseSqlError` for structured telemetry:
 * ```ts
 * import type { SerializedFirebaseSqlError } from 'firebase/sql';
 *
 * const res = await sql.from('events').select('id');
 * if (!res.success) {
 *   const payload: SerializedFirebaseSqlError = res.error.toJSON();
 *   console.error(JSON.stringify(payload));
 * }
 * ```
 *
 * @public
 */
export interface SerializedFirebaseSqlError {
  /**
   * Error class name (`'FirebaseSqlError'`).
   * @internal
   */
  name: string;
  /** PostgREST/PostgreSQL wire code (`'sql-postgrest'`) or {@link FirebaseSqlErrorCode} (`'sql-platform'` / `'sql-client'`). */
  code: string;
  /** Human-readable error message. */
  message: string;
  /** Origin tier (`'sql-postgrest'`, `'sql-platform'`, or `'sql-client'`). */
  category: string;
  /** Optional diagnostic detail (server-supplied, JSON-serialized structured details, or client error stack / cause chain on `'sql-client'` errors). */
  details?: string | undefined;
  /** Optional remediation hint (from PostgreSQL/PostgREST, or client-generated abort / header / URL-length hints on `'sql-client'` errors). */
  hint?: string | undefined;
  /** HTTP status code when an HTTP response was received; omitted (`undefined`) for local/network `'sql-client'` errors. */
  status?: number | undefined;
}

/**
 * Structured error class returned in {@link OperationFailure.error} or thrown synchronously / via {@link Builder.throwOnError}.
 *
 * @remarks
 * Extends `FirebaseError` from `@firebase/util`. Inspect {@link FirebaseSqlError.category},
 * {@link FirebaseSqlError.code}, {@link FirebaseSqlError.details}, and {@link FirebaseSqlError.hint}
 * together—PostgreSQL and PostgREST frequently populate `hint` and `details` with the exact column,
 * constraint, or SQL grant needed to fix a failing query (and `'sql-client'` errors may populate
 * them with client error stacks, `Caused by` chains, or cancellation/URL-length hints). See
 * {@link (Code:variable) | Code} for client and platform error codes and
 * {@link (FirebaseSqlErrorCategory:variable) | FirebaseSqlErrorCategory} for origin tiers.
 *
 * @example
 * Inspect error origin category, code, details, and hint:
 * ```ts
 * import { Code, FirebaseSqlErrorCategory } from 'firebase/sql';
 *
 * const res = await sql.from('events').select('id, title');
 * if (!res.success) {
 *   const { category, code, message, details, hint, status } = res.error;
 *   if (category === FirebaseSqlErrorCategory.SQL_POSTGREST && code === '42501') {
 *     console.error('Database privilege error:', message, hint);
 *   } else if (code === Code.UNAUTHORIZED) {
 *     console.error('Auth or App Check rejected:', status, details);
 *   }
 * }
 * ```
 *
 * @public
 */
export class FirebaseSqlError extends FirebaseError {
  /**
   * Error class name (`'FirebaseSqlError'`).
   * @internal
   */
  readonly name: string = 'FirebaseSqlError';
  /** PostgREST/PostgreSQL wire code (`'23505'`, `'PGRST116'`, etc.) or {@link FirebaseSqlErrorCode}. */
  readonly code: string;
  /** Origin tier (`'sql-postgrest'`, `'sql-platform'`, or `'sql-client'`; typed as `string` at compile time). */
  readonly category: string;
  /** Optional diagnostic explanation (server-supplied, JSON-serialized structured payload, or client error stack / cause chain on `'sql-client'` errors). */
  readonly details?: string | undefined;
  /** Optional actionable remediation hint (from PostgreSQL/PostgREST, or client-generated on `'sql-client'` errors). */
  readonly hint?: string | undefined;
  /** HTTP status code when an HTTP response was received (`undefined` for `'sql-client'` errors, where {@link OperationBase.status | OperationFailure.status} is `0`). */
  readonly status?: number | undefined;

  /**
   * Constructs a new `FirebaseSqlError` instance.
   *
   * @param code - PostgREST/SQLSTATE error code or {@link FirebaseSqlErrorCode} literal stored on `error.code`.
   * @param message - Human-readable failure description stored on `error.message`.
   * @param category - Origin tier identifier (see {@link (FirebaseSqlErrorCategory:variable) | FirebaseSqlErrorCategory}).
   * @param details - Server-supplied diagnostic detail string, JSON-serialized structured details, or client error stack; `undefined` when absent.
   * @param hint - Server-supplied remediation or URL-length hint; `undefined` when absent.
   * @param status - HTTP response status code, or `undefined` for client-side errors (stored verbatim without runtime validation).
   */
  constructor(
    code: string,
    message: string,
    category: string,
    details?: string | undefined,
    hint?: string | undefined,
    status?: number | undefined
  ) {
    super(code, message);
    this.code = code;
    this.category = category;
    this.details = details;
    this.hint = hint;
    this.status = status;

    // Ensure the instanceof operator works as expected on subclasses of Error.
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types
    // and https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget
    Object.setPrototypeOf(this, FirebaseSqlError.prototype);
  }

  /**
   * Serializes this error into a plain JSON-compatible object omitting `undefined` optional fields.
   *
   * @returns Plain {@link SerializedFirebaseSqlError} snapshot suitable for structured logging.
   *
   * @example
   * Convert a `FirebaseSqlError` to JSON:
   * ```ts
   * const res = await sql.from('venues').select('id').eq('slug', 'missing').single();
   * if (!res.success) {
   *   console.error(JSON.stringify(res.error.toJSON()));
   * }
   * ```
   */
  toJSON(): SerializedFirebaseSqlError {
    const serialized: SerializedFirebaseSqlError = {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category
    };
    if (this.details !== undefined) {
      serialized.details = this.details;
    }
    if (this.hint !== undefined) {
      serialized.hint = this.hint;
    }
    if (this.status !== undefined) {
      serialized.status = this.status;
    }
    return serialized;
  }

  /** @internal */
  toString(): string {
    const detailsText = this.details ? ` (details: ${this.details})` : '';
    const hintText = this.hint ? ` (hint: ${this.hint})` : '';
    return `${this.name}[code=${this.code}]: ${this.message}${detailsText}${hintText}`.trim();
  }
}
