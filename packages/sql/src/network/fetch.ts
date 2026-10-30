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
  FirebaseSqlErrorCategory,
  Code,
  FirebaseSqlError
} from '../core/error';

/** @internal */
export type Fetch = typeof fetch;

let sqlFetch: Fetch | null = globalThis.fetch;

/**
 * Sets the fetch implementation used for Firebase SQL network requests.
 *
 * @param fetchImpl - The fetch function to set as active, or null to clear it.
 * @internal
 */
export function initializeFetch(fetchImpl: Fetch | null): void {
  sqlFetch = fetchImpl;
}

/**
 * Retrieves the active fetch implementation.
 *
 * @returns The active fetch function.
 * @throws `FirebaseSqlError` if no fetch implementation is available.
 * @internal
 */
export function getFetch(): Fetch {
  if (!sqlFetch) {
    throw new FirebaseSqlError(
      Code.NOT_SUPPORTED,
      'No Fetch implementation detected in the current environment.',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }
  return sqlFetch;
}
