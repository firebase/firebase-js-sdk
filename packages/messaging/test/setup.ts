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

import { deleteDB } from 'idb';

afterEach(async () => {
  vi.useRealTimers();
  vi.resetAllMocks();
  vi.restoreAllMocks();
  // Use deleteDB directly rather than importing dbDelete from idb-manager so
  // setupFiles does not evaluate and cache idb-manager before test files run
  // vi.mock('../internals/idb-manager', { spy: true }).
  await deleteDB('firebase-messaging-database');
  await deleteDB('fcm_token_details_db');
});
