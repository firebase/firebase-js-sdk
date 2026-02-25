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

/** Label keys that we write in telemetry log entries. */
export const LOG_ENTRY_ATTRIBUTE_KEYS = {
  APP_VERSION: 'app_version',
  SESSION_ID: 'session_id',
  USER_ID: 'user_id'
};

const NEXTJS_LABEL_NAMESPACE = 'nextjs';

/**
 * The namespace for Next.js request attributes that we write in telemetry log entries.
 */
export const NEXTJS_REQUEST_LABEL_KEYS = {
  NEXTJS_PATH: `${NEXTJS_LABEL_NAMESPACE}.path`,
  NEXTJS_METHOD: `${NEXTJS_LABEL_NAMESPACE}.method`,
  NEXTJS_ROUTER_KIND: `${NEXTJS_LABEL_NAMESPACE}.router_kind`,
  NEXTJS_ROUTE_PATH: `${NEXTJS_LABEL_NAMESPACE}.route_path`,
  NEXTJS_ROUTE_TYPE: `${NEXTJS_LABEL_NAMESPACE}.route_type`
};
