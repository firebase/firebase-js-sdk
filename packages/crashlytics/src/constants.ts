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

/** The name of the tracer for Firebase Crashlytics. */
export const CRASHLYTICS_TRACER_NAME = 'firebase.crashlytics';

/** The default endpoint for the Firebase Telemetry API. */
export const DEFAULT_TELEMETRY_ENDPOINT =
  'https://firebasetelemetry.googleapis.com';

/** Default region for telemetry data. */
export const DEFAULT_TELEMETRY_REGION = 'global';

/** Symbol for the internal flag indicating an error has already been logged. */
export const ALREADY_LOGGED_FLAG = Symbol('firebase_crashlytics_logged');

/** Resource attribute key representing the web application domain in the tracing provider. */
export const GCP_FIREBASE_DOMAIN = 'gcp.firebase.domain';

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

/**
 * Maximum safe payload size (in bytes) to use with keepalive: true.
 * Browsers limit total keepalive data to 64KB, which includes both the request body
 * and all HTTP request headers. We use 60,000 bytes as a safe limit to leave a buffer
 * of ~5KB for headers (such as large App Check tokens, API keys, and content-type).
 */
export const KEEPALIVE_MAX_PAYLOAD_SIZE = 60000;
