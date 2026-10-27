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

/** The default endpoint for the Cloud Client Telemetry API. */
export const DEFAULT_TELEMETRY_ENDPOINT =
  'https://clienttelemetry.googleapis.com';

/** Default region for telemetry data. */
export const DEFAULT_TELEMETRY_REGION = 'global';

/**
 * The default endpoint for the Firebase Telemetry API, which serves the client telemetry
 * configuration (`GetClientConfig`) used for client-side session sampling.
 */
export const DEFAULT_CLIENT_CONFIG_ENDPOINT =
  'https://firebasetelemetry.googleapis.com';

/** API version of the `GetClientConfig` RPC on the Firebase Telemetry API. */
export const CLIENT_CONFIG_API_VERSION = 'v1alpha';

/**
 * How often long-running apps re-fetch the client telemetry configuration to pick up sampling
 * rate changes. Matches the `Cache-Control: max-age` the server sets on `GetClientConfig`.
 */
export const CLIENT_CONFIG_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

/** Timeout for a single `GetClientConfig` fetch (matches the RPC deadline). */
export const CLIENT_CONFIG_FETCH_TIMEOUT_MS = 5000;

/**
 * Maximum time the first telemetry export waits for the initial `GetClientConfig` fetch before
 * making the session sampling decision with the cached (or default) configuration.
 */
export const CLIENT_CONFIG_INITIAL_WAIT_MS = 2000;

/** localStorage key prefix for the cached client telemetry configuration (per app and region). */
export const LOCAL_STORAGE_CLIENT_CONFIG_KEY_PREFIX =
  'firebasecrashlytics.clientconfig';

/** sessionStorage key for the persisted session sampling decision. */
export const SESSION_STORAGE_SAMPLING_DECISION_KEY =
  'firebasecrashlytics.sampling';

/** sessionStorage key marking that the telemetry debug override is active for this session. */
export const SESSION_STORAGE_DEBUG_KEY = 'firebasecrashlytics.debug';

/** Global flag developers can set to force 100% telemetry collection on a device. */
export const TELEMETRY_DEBUG_GLOBAL_FLAG = 'FIREBASE_TELEMETRY_DEBUG';

/** URL query parameter that enables the telemetry debug override for the browser session. */
export const TELEMETRY_DEBUG_QUERY_PARAM = 'firebase_telemetry_debug';

/**
 * Attribute stamped on every exported log record and span with the session sampling rate that
 * was in effect when the session's sampling decision was made. The backend uses it as the
 * extrapolation weight (`1 / rate`) and to reconcile stale client rates with the live config.
 */
export const ATTR_KEY_SESSION_SAMPLING_RATE = 'session.sampling.rate';

/**
 * Number of hash buckets used by the deterministic session sampling decision. Must stay in sync
 * with the backend, which re-evaluates the same decision when the configured rate is lowered.
 */
export const SESSION_SAMPLING_HASH_BUCKETS = 10000;

/** Label keys for resource attributes in telemetry providers. */
export const RESOURCE_ATTRIBUTE_KEYS = {
  GCP_PROJECT_ID: 'gcp.project_id',
  GCP_FIREBASE_APP_ID: 'gcp.firebase.app_id',
  CLOUD_REGION: 'cloud.region'
};

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
