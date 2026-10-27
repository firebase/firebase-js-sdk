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
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeDetails(details: unknown): string | undefined {
  if (typeof details === 'string') {
    return details.length > 0 ? details : undefined;
  }
  // PostgREST PGRST201 (ambiguous embedding) and Google OnePlatform RPC errors
  // emit structured object/array details rather than strings.
  if (typeof details === 'object' && details !== null) {
    return JSON.stringify(details);
  }
  return undefined;
}

function normalizeHint(hint: unknown): string | undefined {
  if (typeof hint === 'string' && hint.length > 0) {
    return hint;
  }
  return undefined;
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
        : typeof rawError === 'string' && rawError.length > 0
          ? rawError
          : 'Network request failed.';
    const details = isPlainRecord(rawError)
      ? normalizeDetails(rawError.details)
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

  // Google OnePlatform / ESF pre-adapter rejections wrap errors under a top-level
  // `error` envelope (`{ error: { code, message, status, details } }`), which
  // @supabase/postgrest-js leaves nested via raw JSON.parse.
  if (isPlainRecord(rawError) && isPlainRecord(rawError.error)) {
    const inner = rawError.error;
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
    typeof rawError.code === 'string' &&
    rawError.code.length > 0
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
      : statusText || `HTTP Error ${status}`;
  const fallbackDetails = isPlainRecord(rawError)
    ? normalizeDetails(rawError.details)
    : undefined;
  const fallbackHint = isPlainRecord(rawError)
    ? normalizeHint(rawError.hint)
    : undefined;

  return new FirebaseSqlError(
    mapPlatformStatusToCode(status),
    fallbackMessage,
    FirebaseSqlErrorCategory.SQL_PLATFORM,
    fallbackDetails,
    fallbackHint,
    normalizedStatus
  );
};
