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
  SESSION_STORAGE_DEBUG_KEY,
  TELEMETRY_DEBUG_GLOBAL_FLAG,
  TELEMETRY_DEBUG_QUERY_PARAM
} from '../constants';

/**
 * Returns whether the in-memory `FIREBASE_TELEMETRY_DEBUG` global flag is active.
 *
 * This does not read `sessionStorage` or parse `location.search`, so it can be called on every
 * sampling decision without synchronous storage or URL parsing overhead.
 *
 * @internal
 */
export function isGlobalTelemetryDebugEnabled(): boolean {
  const globalFlag = (globalThis as unknown as Record<string, unknown>)[
    TELEMETRY_DEBUG_GLOBAL_FLAG
  ];
  return globalFlag === true || globalFlag === 'true';
}

/**
 * Syncs the persisted `sessionStorage` marker and `?firebase_telemetry_debug=true|false` URL query
 * parameter with `FIREBASE_TELEMETRY_DEBUG`:
 * - `?firebase_telemetry_debug=true` sets `FIREBASE_TELEMETRY_DEBUG = true` and persists it in
 *   `sessionStorage` so it survives full-page reloads/navigations before an export occurs.
 * - `?firebase_telemetry_debug=false` clears `FIREBASE_TELEMETRY_DEBUG` and removes the
 *   `sessionStorage` marker (an already-forced session stays forced per session-stickiness rules).
 * - Absent or unrecognized values leave any existing debug state unchanged.
 */
function checkQueryParam(): void {
  try {
    const search =
      typeof location !== 'undefined' ? location.search : undefined;
    if (search) {
      const debugParam = new URLSearchParams(search).get(
        TELEMETRY_DEBUG_QUERY_PARAM
      );
      if (debugParam === 'true') {
        try {
          sessionStorage.setItem(SESSION_STORAGE_DEBUG_KEY, 'true');
        } catch (e) {
          // Ignore errors accessing sessionStorage (e.g. security restrictions)
        }
        (globalThis as unknown as Record<string, unknown>)[
          TELEMETRY_DEBUG_GLOBAL_FLAG
        ] = true;
        return;
      }
      if (debugParam === 'false') {
        try {
          sessionStorage.removeItem(SESSION_STORAGE_DEBUG_KEY);
        } catch (e) {
          // Ignore errors accessing sessionStorage (e.g. security restrictions)
        }
        delete (globalThis as unknown as Record<string, unknown>)[
          TELEMETRY_DEBUG_GLOBAL_FLAG
        ];
        return;
      }
    }
  } catch (e) {
    // Ignore malformed URLs or restricted `location` access.
  }

  if (isGlobalTelemetryDebugEnabled()) {
    return;
  }

  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    if (sessionStorage.getItem(SESSION_STORAGE_DEBUG_KEY) === 'true') {
      (globalThis as unknown as Record<string, unknown>)[
        TELEMETRY_DEBUG_GLOBAL_FLAG
      ] = true;
    }
  } catch (e) {
    // Ignore errors accessing sessionStorage (e.g. security restrictions)
  }
}

/**
 * Syncs the debug override from `sessionStorage` / `location.search` into the global flag at
 * startup and whenever the URL changes via browser history navigation (`popstate`), returning an
 * unsubscribe function.
 *
 * @internal
 */
export function syncTelemetryDebugQueryParam(): () => void {
  checkQueryParam();
  if (typeof window === 'undefined') {
    return () => {};
  }
  const onUrlChange = (): void => {
    checkQueryParam();
  };
  window.addEventListener('popstate', onUrlChange);
  return () => {
    window.removeEventListener('popstate', onUrlChange);
  };
}
