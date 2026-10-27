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

import { AppCheckTokenResult } from '@firebase/app-check-interop-types';
import { FirebaseAuthTokenData } from '@firebase/auth-interop-types';

import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import { SDK_VERSION } from '../core/version';

/**
 * Lowercased HTTP header keys used by transport for authorization, telemetry, etc.
 * @internal
 */
export type FirebaseHeaders = Lowercase<
  | 'x-goog-api-client'
  | 'x-client-version'
  | 'x-firebase-gmpid'
  | 'x-firebase-auth-token'
  | 'x-firebase-appcheck'
>;

/**
 * Lowercased HTTP Header keys used by transport for authorization, telemetry, etc.
 * @internal
 */
export const FirebaseHeaders = Object.freeze({
  GOOG_API_CLIENT: 'x-goog-api-client' as const satisfies FirebaseHeaders,
  CLIENT_VERSION: 'x-client-version' as const satisfies FirebaseHeaders,
  FIREBASE_GMPDID: 'x-firebase-gmpid' as const satisfies FirebaseHeaders,
  FIREBASE_AUTH_TOKEN:
    'x-firebase-auth-token' as const satisfies FirebaseHeaders,
  FIREBASE_APPCHECK: 'x-firebase-appcheck' as const satisfies FirebaseHeaders
});

/** Lowerecased HTTP Header keys forbidden for FSQL SDK */
const FORBIDDEN_HEADERS = new Set<string>([
  'X-Firebase-SqlConnect-Affinity',
  'X-Goog-Request-Params',
  'X-Firebase-Client',
  'X-Firebase-Client-Log-Type'
]);

/** @internal */
export const LOWERCASE_DISALLOWED_HEADER_KEYS = new Set<string>([
  ...Object.values(FirebaseHeaders),
  ...Array.from(FORBIDDEN_HEADERS).map(key => key.toLowerCase())
]);

/**
 * Returns the {@linkcode FirebaseHeaders.GOOG_API_CLIENT | 'x-goog-api-client'} header value.
 * @internal
 */
export function getGoogApiClientValue(): string {
  return 'gl-js/ fire/' + SDK_VERSION;
}

/**
 * Validates that the given headers do not contain any protected header keys (case-insensitive).
 * @throws `FirebaseSqlError` with `Code.INVALID_ARGUMENT` and `FirebaseSqlErrorCategory.SQL_CLIENT` if the headers contain any protected header keys.
 * @internal
 */
export function validateHeaders(
  headers?: Record<string, string> | undefined
): void {
  if (!headers) {
    return;
  }
  for (const key of Object.keys(headers)) {
    if (LOWERCASE_DISALLOWED_HEADER_KEYS.has(key.toLowerCase())) {
      throw new FirebaseSqlError(
        Code.INVALID_ARGUMENT,
        `Cannot set protected header ${key}.`,
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }
  }
}

/**
 * Merges headers from any valid `HeadersInit` source into a target `Headers` instance.
 * Normalizes across `Headers` instances, plain records, and tuple arrays using the standard
 * `Headers` constructor.
 *
 * @param target - The destination `Headers` instance to mutate.
 * @param source - Source headers in any valid `HeadersInit` format.
 * @returns The mutated `target` `Headers` instance for convenient chaining.
 * @internal
 */
export function mergeHeadersInit(
  target: Headers,
  source?: HeadersInit
): Headers {
  if (source) {
    new Headers(source).forEach((value, key) => {
      target.set(key, value);
    });
  }
  return target;
}

/**
 * Resolves and normalizes wire-level request headers from request init options,
 * telemetry, and SDK auth / App Check providers.
 * @internal
 */
export function resolveRequestHeaders(
  authToken: FirebaseAuthTokenData | null,
  appCheckToken: AppCheckTokenResult | null,
  init?: RequestInit,
  _appId?: string
): Record<string, string> {
  const headers = new Headers();

  mergeHeadersInit(headers, init?.headers);

  // Firebase token headers
  // user-supplied authorization headers are overwritten
  authToken &&
    authToken.accessToken &&
    headers.set(FirebaseHeaders.FIREBASE_AUTH_TOKEN, authToken.accessToken);
  appCheckToken &&
    headers.set(FirebaseHeaders.FIREBASE_APPCHECK, appCheckToken.token);

  // Telemetry headers
  headers.set(FirebaseHeaders.GOOG_API_CLIENT, getGoogApiClientValue());
  _appId && headers.set(FirebaseHeaders.FIREBASE_GMPDID, _appId);

  // Normalize headers
  const headersRecord: Record<string, string> = {};
  headers.forEach((value, key) => {
    headersRecord[key] = value;
  });
  return headersRecord;
}
