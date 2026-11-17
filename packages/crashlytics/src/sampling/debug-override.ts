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
 * Checks whether the telemetry debug override is active from the global flag, persisted
 * `sessionStorage` marker, or URL query parameter (`?firebase_telemetry_debug=true`).
 *
 * When enabled via `sessionStorage` or the query parameter, this also sets
 * `FIREBASE_TELEMETRY_DEBUG = true` in memory (and persists the query parameter in `sessionStorage`
 * so it survives full-page reloads/navigations before an export occurs). Subsequent per-decision
 * checks can then inspect {@link isGlobalTelemetryDebugEnabled} alone.
 *
 * @param search - The page's query string. Defaults to `location.search`; exposed for tests.
 *
 * @internal
 */
export function isTelemetryDebugEnabled(
  search: string | undefined = typeof location !== 'undefined'
    ? location.search
    : undefined
): boolean {
  if (isGlobalTelemetryDebugEnabled()) {
    return true;
  }

  if (typeof sessionStorage === 'undefined') {
    return false;
  }

  try {
    if (sessionStorage.getItem(SESSION_STORAGE_DEBUG_KEY) === 'true') {
      (globalThis as unknown as Record<string, unknown>)[
        TELEMETRY_DEBUG_GLOBAL_FLAG
      ] = true;
      return true;
    }
  } catch (e) {
    // Ignore errors accessing sessionStorage (e.g. security restrictions)
  }

  try {
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
        return true;
      }
    }
  } catch (e) {
    // Ignore malformed URLs or restricted `location` access.
  }

  return false;
}

/**
 * Syncs the debug override from `sessionStorage` / `location.search` into the global flag at
 * startup and whenever the URL changes via browser history navigation (`popstate`), returning an
 * unsubscribe function.
 *
 * @internal
 */
export function observeTelemetryDebugQueryParam(): () => void {
  isTelemetryDebugEnabled();
  if (typeof window === 'undefined') {
    return () => {};
  }
  const onUrlChange = (): void => {
    isTelemetryDebugEnabled();
  };
  window.addEventListener('popstate', onUrlChange);
  return () => {
    window.removeEventListener('popstate', onUrlChange);
  };
}
