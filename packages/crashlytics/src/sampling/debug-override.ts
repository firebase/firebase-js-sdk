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
 * Syncs any persisted `sessionStorage` marker or `?firebase_telemetry_debug=true` URL query
 * parameter into `FIREBASE_TELEMETRY_DEBUG`, persisting the query parameter in `sessionStorage`
 * so it survives full-page reloads/navigations before an export occurs.
 */
function checkQueryParam(): void {
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
      return;
    }
  } catch (e) {
    // Ignore errors accessing sessionStorage (e.g. security restrictions)
  }

  try {
    const search =
      typeof location !== 'undefined' ? location.search : undefined;
    if (search) {
      const params = new URLSearchParams(search);
      if (params.get(TELEMETRY_DEBUG_QUERY_PARAM) === 'true') {
        try {
          sessionStorage.setItem(SESSION_STORAGE_DEBUG_KEY, 'true');
        } catch (e) {
          // Ignore errors accessing sessionStorage (e.g. security restrictions)
        }
        (globalThis as unknown as Record<string, unknown>)[
          TELEMETRY_DEBUG_GLOBAL_FLAG
        ] = true;
      }
    }
  } catch (e) {
    // Ignore malformed URLs or restricted `location` access.
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
