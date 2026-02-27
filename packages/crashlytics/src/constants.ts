/**
 * @license
 * Copyright 2025 Google LLC
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

/** Type constant for Firebase Crashlytics. */
export const CRASHLYTICS_TYPE = 'crashlytics';

/** Key for storing the session ID in sessionStorage. */
export const CRASHLYTICS_SESSION_ID_KEY = 'firebasecrashlytics.sessionid';

/** Label keys that we write in all telemetry log entries. */
export const LOG_ENTRY_ATTRIBUTE_KEYS = {
  APP_VERSION: 'app_version',
  SESSION_ID: 'session_id',
  USER_ID: 'user_id'
};

/**
 * Label keys that we write in log entries stemming from web framework wrappers.
 */
export const FRAMEWORK_ATTRIBUTE_KEYS = {
  ROUTE_PATH: 'route_path'
};

/**
 * The namespace for Next.js request attributes that we write in telemetry log entries.
 */
const NEXTJS_ATTRIBUTE_NAMESPACE = 'nextjs';

/**
 * The keys for Next.js request attributes that we write in telemetry log entries.
 */
export const NEXTJS_REQUEST_ATTRIBUTE_KEYS = {
  PATH: `${NEXTJS_ATTRIBUTE_NAMESPACE}.path`,
  METHOD: `${NEXTJS_ATTRIBUTE_NAMESPACE}.method`,
  ROUTER_KIND: `${NEXTJS_ATTRIBUTE_NAMESPACE}.router_kind`,
  ROUTE_TYPE: `${NEXTJS_ATTRIBUTE_NAMESPACE}.route_type`
};
