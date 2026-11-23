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
  initTelemetryDebugOverride,
  isTelemetryDebugEnabled
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
    expect(isTelemetryDebugEnabled()).toBe(false);
    unsubscribe = initTelemetryDebugOverride();
    expect(isTelemetryDebugEnabled()).toBe(false);
  });

  it('is enabled by the FIREBASE_TELEMETRY_DEBUG global', () => {
    (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] = true;
    expect(isTelemetryDebugEnabled()).toBe(true);
    (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
      'true';
    expect(isTelemetryDebugEnabled()).toBe(true);
  });

  it('ignores falsy or unrelated global values', () => {
    (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
      false;
    expect(isTelemetryDebugEnabled()).toBe(false);
    (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
      'yes';
    expect(isTelemetryDebugEnabled()).toBe(false);
  });

  it('mirrors a persisted sessionStorage marker into the global flag', () => {
    sessionStorage.setItem(SESSION_STORAGE_DEBUG_KEY, 'true');
    expect(isTelemetryDebugEnabled()).toBe(false);
    unsubscribe = initTelemetryDebugOverride();
    expect(isTelemetryDebugEnabled()).toBe(true);
  });

  it('is enabled by the query parameter and persists it for the session', () => {
    window.history.replaceState(
      null,
      '',
      '?foo=1&firebase_telemetry_debug=true'
    );
    unsubscribe = initTelemetryDebugOverride();
    expect(isTelemetryDebugEnabled()).toBe(true);
    expect(sessionStorage.getItem(SESSION_STORAGE_DEBUG_KEY)).toBe('true');

    // Simulates a full-page reload/navigation without the query parameter.
    unsubscribe();
    delete (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG];
    window.history.replaceState(null, '', originalUrl);
    unsubscribe = initTelemetryDebugOverride();
    expect(isTelemetryDebugEnabled()).toBe(true);
  });

  it('ignores other values of the query parameter', () => {
    window.history.replaceState(null, '', '?firebase_telemetry_debug=1');
    unsubscribe = initTelemetryDebugOverride();
    expect(isTelemetryDebugEnabled()).toBe(false);
    expect(sessionStorage.getItem(SESSION_STORAGE_DEBUG_KEY)).toBeNull();
  });

  it('enables the global flag when popstate navigates to a debug query parameter and unsubscribes cleanly', () => {
    unsubscribe = initTelemetryDebugOverride();
    expect(isTelemetryDebugEnabled()).toBe(false);

    window.history.replaceState(null, '', '?firebase_telemetry_debug=true');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(isTelemetryDebugEnabled()).toBe(true);
    expect(sessionStorage.getItem(SESSION_STORAGE_DEBUG_KEY)).toBe('true');

    // After unsubscribing and resetting state, popstate no longer flips the flag.
    unsubscribe();
    unsubscribe = undefined;
    sessionStorage.clear();
    delete (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG];
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(isTelemetryDebugEnabled()).toBe(false);
  });

  it('clears the global flag and sessionStorage marker when query parameter is false', () => {
    window.history.replaceState(null, '', '?firebase_telemetry_debug=true');
    unsubscribe = initTelemetryDebugOverride();
    expect(isTelemetryDebugEnabled()).toBe(true);
    expect(sessionStorage.getItem(SESSION_STORAGE_DEBUG_KEY)).toBe('true');

    window.history.replaceState(null, '', '?firebase_telemetry_debug=false');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(isTelemetryDebugEnabled()).toBe(false);
    expect(sessionStorage.getItem(SESSION_STORAGE_DEBUG_KEY)).toBeNull();
  });

  it('clears a persisted sessionStorage marker when startup query parameter is false', () => {
    sessionStorage.setItem(SESSION_STORAGE_DEBUG_KEY, 'true');
    window.history.replaceState(null, '', '?firebase_telemetry_debug=false');
    unsubscribe = initTelemetryDebugOverride();
    expect(isTelemetryDebugEnabled()).toBe(false);
    expect(sessionStorage.getItem(SESSION_STORAGE_DEBUG_KEY)).toBeNull();
  });

  it('does not re-read sessionStorage on popstate', () => {
    unsubscribe = initTelemetryDebugOverride();
    sessionStorage.setItem(SESSION_STORAGE_DEBUG_KEY, 'true');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(isTelemetryDebugEnabled()).toBe(false);
  });
});
