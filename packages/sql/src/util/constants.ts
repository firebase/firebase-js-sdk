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

/** @internal */
export const FIREBASE_SQL_COMPONENT_NAME = 'firebase-sql';

/** @internal */
export const FIREBASE_SQL_PACKAGE_NAME = '@firebase/sql';

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
  FIREBASE_GMPID: 'x-firebase-gmpid' as const satisfies FirebaseHeaders,
  FIREBASE_AUTH_TOKEN:
    'x-firebase-auth-token' as const satisfies FirebaseHeaders,
  FIREBASE_APPCHECK: 'x-firebase-appcheck' as const satisfies FirebaseHeaders
});

/**
 * Lowercased HTTP header keys forbidden for FSQL SDK.
 * Keep in sync with go/firebasesql:sdk:headers.
 * @internal
 */
export const FORBIDDEN_HEADERS = [
  'x-firebase-sqlconnect-affinity',
  'x-goog-request-params',
  'x-firebase-client',
  'x-firebase-client-log-type',
  'authorization'
] as const;

/** @internal */
export const LOWERCASE_DISALLOWED_HEADER_KEYS: ReadonlySet<string> =
  new Set<string>([...Object.values(FirebaseHeaders), ...FORBIDDEN_HEADERS]);
