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
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory,
  type FirebaseSqlErrorCode
} from './error';
import type { MapPostgrestError } from './state';

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

function normalizeNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function normalizeDetails(details: unknown): string | undefined {
  const stringDetails = normalizeNonEmptyString(details);
  if (stringDetails !== undefined) {
    return stringDetails;
  }
  // PostgREST PGRST201 (ambiguous embedding) and Google OnePlatform RPC errors
  // emit structured object/array details rather than strings.
  if (typeof details === 'object' && details !== null) {
    return JSON.stringify(details);
  }
  return undefined;
}

function normalizeHint(hint: unknown): string | undefined {
  return normalizeNonEmptyString(hint);
}

function mapPlatformStatusToCode(
  status: number,
  rpcStatus?: unknown
): FirebaseSqlErrorCode {
  if (
    status === 401 ||
    status === 403 ||
    rpcStatus === 'UNAUTHENTICATED' ||
    rpcStatus === 'PERMISSION_DENIED'
  ) {
    return Code.UNAUTHORIZED;
  }
  if (status === 400 || rpcStatus === 'INVALID_ARGUMENT') {
    return Code.INVALID_ARGUMENT;
  }
  if (status === 501 || rpcStatus === 'UNIMPLEMENTED') {
    return Code.NOT_SUPPORTED;
  }
  return Code.OTHER;
}

/**
 * Maps low-level transport and PostgREST HTTP failures into canonical `FirebaseSqlError` instances.
 *
 * Cross-Platform Architecture Note (see go/fsql-postgrest-sdk):
 * All Firebase SQL client platforms (Web/JS, Android/Kotlin, Apple/Swift, Flutter/Dart) communicate
 * with the same Google Cloud PostgREST backend behind Google's ESF gateway and encounter three
 * identical tiers of error responses:
 *
 * 1. `SQL_CLIENT`: Local client or network transport failures (offline, network drops, client termination
 *    via `NOT_INITIALIZED`, or invalid client configuration).
 * 2. `SQL_PLATFORM`: Google OnePlatform / ESF pre-adapter JSON envelopes (`{ error: { code, message, status, details } }`)
 *    emitted by Google Cloud infrastructure before reaching PostgREST (e.g. invalid App Check token,
 *    IAM authentication/permission rejections, quota limits).
 * 3. `POSTGREST`: PostgREST JSON envelopes (`{ code, message, details, hint }`) containing PostgREST
 *    error codes or PostgreSQL SQLSTATE codes (`23505` uniqueness violation, `42P01` undefined table, etc.)
 *    mapped to canonical `Code.*` values.
 *
 * @internal
 */
export const mapPostgrestFailureToFirebaseSqlError: MapPostgrestError = (
  rawError,
  status,
  statusText
) => {
  if (rawError instanceof FirebaseSqlError) {
    return rawError;
  }

  const normalizedStatus = status > 0 ? status : undefined;

  if (status === 0) {
    const message =
      isPlainRecord(rawError) &&
      typeof rawError.message === 'string' &&
      rawError.message.length > 0
        ? rawError.message
        : rawError instanceof Error && rawError.message.length > 0
          ? rawError.message
          : typeof rawError === 'string' && rawError.length > 0
            ? rawError
            : 'Network request failed.';
    const details = isPlainRecord(rawError)
      ? normalizeDetails(rawError.details)
      : rawError instanceof Error
        ? normalizeDetails(rawError.stack)
        : undefined;
    const hint = isPlainRecord(rawError)
      ? normalizeHint(rawError.hint)
      : undefined;
    return new FirebaseSqlError(
      Code.OTHER,
      message,
      FirebaseSqlErrorCategory.SQL_CLIENT,
      details,
      hint
    );
  }

  const envelopeCandidate =
    Array.isArray(rawError) && rawError.length === 1 ? rawError[0] : rawError;

  // Google OnePlatform / ESF pre-adapter rejections wrap errors under a top-level
  // `error` envelope (`{ error: { code, message, status, details } }` or single-element
  // array `[{ error: { ... } }]`), which PostgrestBuilder leaves nested via raw JSON.parse.
  if (
    isPlainRecord(envelopeCandidate) &&
    isPlainRecord(envelopeCandidate.error)
  ) {
    const inner = envelopeCandidate.error;
    const code = mapPlatformStatusToCode(status, inner.status);
    const message =
      typeof inner.message === 'string' && inner.message.length > 0
        ? inner.message
        : statusText || `HTTP Error ${status}`;
    return new FirebaseSqlError(
      code,
      message,
      FirebaseSqlErrorCategory.SQL_PLATFORM,
      normalizeDetails(inner.details),
      normalizeHint(inner.hint),
      normalizedStatus
    );
  }

  if (
    isPlainRecord(rawError) &&
    typeof rawError.error === 'string' &&
    rawError.error.length > 0
  ) {
    const message =
      typeof rawError.error_description === 'string' &&
      rawError.error_description.length > 0
        ? rawError.error_description
        : typeof rawError.message === 'string' && rawError.message.length > 0
          ? rawError.message
          : rawError.error;
    return new FirebaseSqlError(
      mapPlatformStatusToCode(status, rawError.status),
      message,
      FirebaseSqlErrorCategory.SQL_PLATFORM,
      normalizeDetails(rawError.details),
      normalizeHint(rawError.hint),
      normalizedStatus
    );
  }

  if (
    isPlainRecord(rawError) &&
    typeof rawError.code === 'string' &&
    rawError.code.length > 0 &&
    typeof rawError.status !== 'string'
  ) {
    const message =
      typeof rawError.message === 'string' && rawError.message.length > 0
        ? rawError.message
        : statusText || rawError.code;
    return new FirebaseSqlError(
      rawError.code,
      message,
      FirebaseSqlErrorCategory.SQL_POSTGREST,
      normalizeDetails(rawError.details),
      normalizeHint(rawError.hint),
      normalizedStatus
    );
  }

  const fallbackMessage =
    isPlainRecord(rawError) &&
    typeof rawError.message === 'string' &&
    rawError.message.length > 0
      ? rawError.message
      : typeof rawError === 'string' && rawError.length > 0
        ? rawError
        : statusText || `HTTP Error ${status}`;
  const fallbackDetails = isPlainRecord(rawError)
    ? normalizeDetails(rawError.details)
    : Array.isArray(rawError)
      ? normalizeDetails(rawError)
      : undefined;
  const fallbackHint = isPlainRecord(rawError)
    ? normalizeHint(rawError.hint)
    : undefined;

  return new FirebaseSqlError(
    mapPlatformStatusToCode(
      status,
      isPlainRecord(rawError) ? rawError.status : undefined
    ),
    fallbackMessage,
    FirebaseSqlErrorCategory.SQL_PLATFORM,
    fallbackDetails,
    fallbackHint,
    normalizedStatus
  );
};
