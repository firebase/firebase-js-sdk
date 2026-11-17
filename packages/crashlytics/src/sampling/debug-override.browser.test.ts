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
import {
  isGlobalTelemetryDebugEnabled,
  syncTelemetryDebugQueryParam
} from './debug-override';

describe('debug override', () => {
  const originalUrl = window.location.href;
  let unsubscribe: (() => void) | undefined;

  beforeEach(() => {
    sessionStorage.clear();
    delete (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG];
  });

  afterEach(() => {
    unsubscribe?.();
    unsubscribe = undefined;
    window.history.replaceState(null, '', originalUrl);
    sessionStorage.clear();
    delete (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG];
  });

  it('is disabled by default', () => {
    expect(isGlobalTelemetryDebugEnabled()).toBe(false);
    unsubscribe = syncTelemetryDebugQueryParam();
    expect(isGlobalTelemetryDebugEnabled()).toBe(false);
  });

  it('is enabled by the FIREBASE_TELEMETRY_DEBUG global', () => {
    (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] = true;
    expect(isGlobalTelemetryDebugEnabled()).toBe(true);
    (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
      'true';
    expect(isGlobalTelemetryDebugEnabled()).toBe(true);
  });

  it('ignores falsy or unrelated global values', () => {
    (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
      false;
    expect(isGlobalTelemetryDebugEnabled()).toBe(false);
    (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
      'yes';
    expect(isGlobalTelemetryDebugEnabled()).toBe(false);
  });

  it('mirrors a persisted sessionStorage marker into the global flag', () => {
    sessionStorage.setItem(SESSION_STORAGE_DEBUG_KEY, 'true');
    expect(isGlobalTelemetryDebugEnabled()).toBe(false);
    unsubscribe = syncTelemetryDebugQueryParam();
    expect(isGlobalTelemetryDebugEnabled()).toBe(true);
  });

  it('is enabled by the query parameter and persists it for the session', () => {
    window.history.replaceState(
      null,
      '',
      '?foo=1&firebase_telemetry_debug=true'
    );
    unsubscribe = syncTelemetryDebugQueryParam();
    expect(isGlobalTelemetryDebugEnabled()).toBe(true);
    expect(sessionStorage.getItem(SESSION_STORAGE_DEBUG_KEY)).toBe('true');

    // Simulates a full-page reload/navigation without the query parameter.
    unsubscribe();
    delete (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG];
    window.history.replaceState(null, '', originalUrl);
    unsubscribe = syncTelemetryDebugQueryParam();
    expect(isGlobalTelemetryDebugEnabled()).toBe(true);
  });

  it('ignores other values of the query parameter', () => {
    window.history.replaceState(null, '', '?firebase_telemetry_debug=1');
    unsubscribe = syncTelemetryDebugQueryParam();
    expect(isGlobalTelemetryDebugEnabled()).toBe(false);
    expect(sessionStorage.getItem(SESSION_STORAGE_DEBUG_KEY)).toBeNull();
  });

  it('enables the global flag when popstate navigates to a debug query parameter and unsubscribes cleanly', () => {
    unsubscribe = syncTelemetryDebugQueryParam();
    expect(isGlobalTelemetryDebugEnabled()).toBe(false);

    window.history.replaceState(null, '', '?firebase_telemetry_debug=true');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(isGlobalTelemetryDebugEnabled()).toBe(true);
    expect(sessionStorage.getItem(SESSION_STORAGE_DEBUG_KEY)).toBe('true');

    // After unsubscribing and resetting state, popstate no longer flips the flag.
    unsubscribe();
    unsubscribe = undefined;
    sessionStorage.clear();
    delete (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG];
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(isGlobalTelemetryDebugEnabled()).toBe(false);
  });

  it('clears the global flag and sessionStorage marker when query parameter is false', () => {
    window.history.replaceState(null, '', '?firebase_telemetry_debug=true');
    unsubscribe = syncTelemetryDebugQueryParam();
    expect(isGlobalTelemetryDebugEnabled()).toBe(true);
    expect(sessionStorage.getItem(SESSION_STORAGE_DEBUG_KEY)).toBe('true');

    window.history.replaceState(null, '', '?firebase_telemetry_debug=false');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(isGlobalTelemetryDebugEnabled()).toBe(false);
    expect(sessionStorage.getItem(SESSION_STORAGE_DEBUG_KEY)).toBeNull();
  });
});
