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
  TELEMETRY_DEBUG_GLOBAL_FLAG
} from '../constants';
import { isTelemetryDebugEnabled } from './debug-override';

describe('isTelemetryDebugEnabled', () => {
  beforeEach(() => {
    sessionStorage.clear();
    delete (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG];
  });

  afterEach(() => {
    sessionStorage.clear();
    delete (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG];
  });

  it('is disabled by default', () => {
    expect(isTelemetryDebugEnabled('')).toBe(false);
    expect(isTelemetryDebugEnabled()).toBe(false);
  });

  it('is enabled by the FIREBASE_TELEMETRY_DEBUG global', () => {
    (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] = true;
    expect(isTelemetryDebugEnabled('')).toBe(true);
  });

  it('ignores falsy or unrelated global values', () => {
    (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] = false;
    expect(isTelemetryDebugEnabled('')).toBe(false);
    (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] = 'yes';
    expect(isTelemetryDebugEnabled('')).toBe(false);
  });

  it('is enabled by the persisted sessionStorage marker', () => {
    sessionStorage.setItem(SESSION_STORAGE_DEBUG_KEY, 'true');
    expect(isTelemetryDebugEnabled('')).toBe(true);
  });

  it('is enabled by the query parameter and persists it for the session', () => {
    expect(isTelemetryDebugEnabled('?foo=1&firebase_telemetry_debug=true')).toBe(
      true
    );
    expect(sessionStorage.getItem(SESSION_STORAGE_DEBUG_KEY)).toBe('true');

    // Still enabled once the query parameter is gone (e.g. after an in-app navigation).
    expect(isTelemetryDebugEnabled('')).toBe(true);
  });

  it('ignores other values of the query parameter', () => {
    expect(isTelemetryDebugEnabled('?firebase_telemetry_debug=1')).toBe(false);
    expect(sessionStorage.getItem(SESSION_STORAGE_DEBUG_KEY)).toBeNull();
  });
});
