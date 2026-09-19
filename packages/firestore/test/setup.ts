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

import { Buffer } from 'buffer';

import { afterEach, vi } from 'vitest';

import '../src/api/pipeline_impl';
import '../src/lite-api/pipeline_impl';
import { registerFirestore as registerFirestoreLite } from '../lite/register';
import { registerFirestore } from '../src/register';

if (typeof globalThis.Buffer === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Buffer = Buffer;
}

registerFirestoreLite();
registerFirestore();
if ((process.env.TEST_PLATFORM || '').endsWith('_lite')) {
  registerFirestoreLite();
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
