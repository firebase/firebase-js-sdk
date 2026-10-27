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
 * Returns whether the telemetry debug override is active, forcing 100% telemetry collection for
 * this device regardless of the configured sampling rate.
 *
 * The override is enabled by any of:
 * - `self.FIREBASE_TELEMETRY_DEBUG = true` (set by a developer in code or the dev console),
 * - a `?firebase_telemetry_debug=true` query parameter on the page URL, which is then persisted
 *   in `sessionStorage` so it stays active for the lifetime of the browser session,
 * - the persisted `sessionStorage` marker from a previous page load in the same session.
 * @param search - The page's query string. Defaults to `location.search`; exposed for tests.
 *
 * @internal
 */
export function isTelemetryDebugEnabled(
  search: string | undefined = typeof location !== 'undefined'
    ? location.search
    : undefined
): boolean {
  const globalFlag = (globalThis as unknown as Record<string, unknown>)[
    TELEMETRY_DEBUG_GLOBAL_FLAG
  ];
  if (globalFlag === true || globalFlag === 'true') {
    return true;
  }

  if (typeof sessionStorage === 'undefined') {
    return false;
  }

  try {
    if (sessionStorage.getItem(SESSION_STORAGE_DEBUG_KEY) === 'true') {
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
        return true;
      }
    }
  } catch (e) {
    // Ignore malformed URLs or restricted `location` access.
  }

  return false;
}
