/**
 * @license
 * Copyright 2019 Google LLC
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

import { vi, afterEach } from 'vitest';
import { clear } from '../helpers/idb-manager';

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', event => {
    if (
      event.reason?.message?.includes('app-offline') ||
      event.reason?.code?.includes('app-offline')
    ) {
      event.preventDefault();
    }
  });
}

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  if (typeof indexedDB !== 'undefined') {
    await clear();
  }
});
