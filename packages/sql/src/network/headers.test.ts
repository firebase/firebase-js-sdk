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

import { expect, describe, it, beforeEach, afterEach } from 'vitest';

import { SDK_VERSION, setSDKVersion } from '../core/version';

import { FirebaseHeaders, resolveRequestHeaders } from './headers';

describe('resolveRequestHeaders()', () => {
  const originalVersion = SDK_VERSION;

  beforeEach(() => {
    setSDKVersion('1.2.3');
  });

  afterEach(() => {
    setSDKVersion(originalVersion);
  });

  it('attaches auth and App Check tokens when provided', () => {
    const result = resolveRequestHeaders(
      { accessToken: 'my-auth-token' },
      { token: 'my-appcheck-token' }
    );

    expect(result[FirebaseHeaders.FIREBASE_AUTH_TOKEN]).toBe('my-auth-token');
    expect(result[FirebaseHeaders.FIREBASE_APPCHECK]).toBe('my-appcheck-token');
  });

  it('omits token headers when tokens are null', () => {
    const result = resolveRequestHeaders(null, null);
    expect(result[FirebaseHeaders.FIREBASE_AUTH_TOKEN]).toBeUndefined();
    expect(result[FirebaseHeaders.FIREBASE_APPCHECK]).toBeUndefined();
  });

  it('overwrites caller-supplied auth and App Check tokens with SDK tokens', () => {
    const result = resolveRequestHeaders(
      { accessToken: 'sdk-auth-token' },
      { token: 'sdk-appcheck-token' },
      {
        headers: {
          [FirebaseHeaders.FIREBASE_AUTH_TOKEN]: 'caller-auth-token',
          [FirebaseHeaders.FIREBASE_APPCHECK]: 'caller-appcheck-token'
        }
      }
    );

    expect(result[FirebaseHeaders.FIREBASE_AUTH_TOKEN]).toBe('sdk-auth-token');
    expect(result[FirebaseHeaders.FIREBASE_APPCHECK]).toBe(
      'sdk-appcheck-token'
    );
  });

  it('omits token headers when tokens are empty strings', () => {
    const result = resolveRequestHeaders(
      { accessToken: '' },
      { token: '' },
      {
        headers: {
          [FirebaseHeaders.FIREBASE_AUTH_TOKEN]: 'caller-auth-token',
          [FirebaseHeaders.FIREBASE_APPCHECK]: 'caller-appcheck-token'
        }
      }
    );
    expect(result[FirebaseHeaders.FIREBASE_AUTH_TOKEN]).toBeUndefined();
    expect(result[FirebaseHeaders.FIREBASE_APPCHECK]).toBeUndefined();
  });

  it('strips forbidden headers supplied by caller', () => {
    const result = resolveRequestHeaders(null, null, {
      headers: {
        'x-firebase-sqlconnect-affinity': 'affinity-val',
        'X-Goog-Request-Params': 'params-val',
        'x-firebase-client': 'client-val',
        'X-Firebase-Client-Log-Type': 'log-val',
        'x-custom-header': 'custom-val'
      }
    });

    expect(result['x-firebase-sqlconnect-affinity']).toBeUndefined();
    expect(result['x-goog-request-params']).toBeUndefined();
    expect(result['x-firebase-client']).toBeUndefined();
    expect(result['x-firebase-client-log-type']).toBeUndefined();
    expect(result['x-custom-header']).toBe('custom-val');
  });

  it('attaches default telemetry', () => {
    const result = resolveRequestHeaders(null, null, undefined, 'app-123');
    expect(result[FirebaseHeaders.GOOG_API_CLIENT]).toBe('gl-js/ fire/1.2.3');
    expect(result[FirebaseHeaders.FIREBASE_GMPID]).toBe('app-123');
  });

  it('overwrites caller-supplied telemetry headers', () => {
    const result = resolveRequestHeaders(
      null,
      null,
      {
        headers: {
          [FirebaseHeaders.GOOG_API_CLIENT]: 'custom-client/9.9',
          [FirebaseHeaders.FIREBASE_GMPID]: 'custom-gmpid'
        }
      },
      'app-123'
    );
    expect(result[FirebaseHeaders.GOOG_API_CLIENT]).toBe('gl-js/ fire/1.2.3');
    expect(result[FirebaseHeaders.FIREBASE_GMPID]).toBe('app-123');
  });
});
