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

/**
 * Retrieves the fetch implementation to use for a Firebase SQL network request.
 *
 * `globalThis.fetch` is read on every call (rather than captured once when this
 * module is loaded) so that replacing or stubbing the global, for example with
 * `vi.stubGlobal('fetch', ...)` in tests, takes effect regardless of module load
 * order.
 *
 * @returns The current `globalThis.fetch` function.
 * @throws `FirebaseSqlError` if no fetch implementation is available.
 * @internal
 */
export function getFetch(): Fetch {
  const fetchImpl: Fetch | undefined = globalThis.fetch;
  if (!fetchImpl) {
    throw new FirebaseSqlError(
      Code.NOT_SUPPORTED,
      'No Fetch implementation detected in the current environment.',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }
  return fetchImpl;
}
