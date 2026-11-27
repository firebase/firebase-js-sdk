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

import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import { SDK_VERSION, setSDKVersion } from '../core/version';

import {
  FirebaseHeaders,
  LOWERCASE_DISALLOWED_HEADER_KEYS,
  resolveRequestHeaders,
  validateHeaderName,
  validateHeaders
} from './headers';

describe('validateHeaders()', () => {
  it('succeeds for allowed headers', () => {
    expect(() =>
      validateHeaders(new Headers({ 'X-Custom': '1', 'X-Trace': 'abc' }))
    ).not.toThrow();
  });

  it('includes all required, forbidden, auth, impersonation, and PostgREST reserved headers', () => {
    const expectedReservedHeaders = [
      'x-goog-api-client',
      'x-client-version',
      'x-firebase-gmpid',
      'x-firebase-auth-token',
      'x-firebase-appcheck',
      'x-firebase-sqlconnect-affinity',
      'x-goog-request-params',
      'x-firebase-client',
      'x-firebase-client-log-type',
      'authorization',
      'x-firebase-auth-impersonate',
      'accept-profile',
      'content-profile',
      'x-retry-count',
      'prefer',
      'accept',
      'content-type',
      'range',
      'range-unit'
    ];
    expect(Array.from(LOWERCASE_DISALLOWED_HEADER_KEYS).sort()).toEqual(
      expectedReservedHeaders.slice().sort()
    );
  });

  it('throws FirebaseSqlError(INVALID_ARGUMENT, SQL_CLIENT) for every disallowed header key', () => {
    for (const key of LOWERCASE_DISALLOWED_HEADER_KEYS) {
      let caughtError: unknown;
      try {
        validateHeaders(new Headers({ [key.toUpperCase()]: 'val' }));
      } catch (err) {
        caughtError = err;
      }
      expect(caughtError).toBeInstanceOf(FirebaseSqlError);
      expect((caughtError as FirebaseSqlError).code).toBe(
        Code.INVALID_ARGUMENT
      );
      expect((caughtError as FirebaseSqlError).category).toBe(
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }
  });

  it('rejects newly reserved headers case-insensitively with surrounding whitespace in validateHeaderName()', () => {
    const cases = [
      '  X-Firebase-Auth-Impersonate  ',
      'Accept-Profile',
      ' CONTENT-PROFILE ',
      'X-Retry-Count',
      'Prefer',
      'Accept',
      'Content-Type',
      'Range',
      'Range-Unit'
    ];
    for (const name of cases) {
      let caughtError: unknown;
      try {
        validateHeaderName(name);
      } catch (err) {
        caughtError = err;
      }
      expect(caughtError).toBeInstanceOf(FirebaseSqlError);
      expect((caughtError as FirebaseSqlError).code).toBe(
        Code.INVALID_ARGUMENT
      );
      expect((caughtError as FirebaseSqlError).category).toBe(
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }
  });
});

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
        'Authorization': 'Bearer secret-token',
        'X-Firebase-Auth-Impersonate': 'uid-impersonated',
        'x-custom-header': 'custom-val'
      }
    });

    expect(result['x-firebase-sqlconnect-affinity']).toBeUndefined();
    expect(result['x-goog-request-params']).toBeUndefined();
    expect(result['x-firebase-client']).toBeUndefined();
    expect(result['x-firebase-client-log-type']).toBeUndefined();
    expect(result['authorization']).toBeUndefined();
    expect(result['x-firebase-auth-impersonate']).toBeUndefined();
    expect(result['x-custom-header']).toBe('custom-val');
  });

  it('preserves PostgREST-managed headers attached before transport fetch', () => {
    const result = resolveRequestHeaders(null, null, {
      headers: {
        'Accept-Profile': 'analytics',
        'Content-Profile': 'public',
        'X-Retry-Count': '2',
        'Prefer': 'count=exact',
        'Accept': 'application/vnd.pgrst.object+json',
        'Content-Type': 'application/json',
        'Range': '0-9',
        'Range-Unit': 'items'
      }
    });

    expect(result['accept-profile']).toBe('analytics');
    expect(result['content-profile']).toBe('public');
    expect(result['x-retry-count']).toBe('2');
    expect(result['prefer']).toBe('count=exact');
    expect(result['accept']).toBe('application/vnd.pgrst.object+json');
    expect(result['content-type']).toBe('application/json');
    expect(result['range']).toBe('0-9');
    expect(result['range-unit']).toBe('items');
  });

  it('attaches default telemetry', () => {
    const result = resolveRequestHeaders(null, null, undefined, 'app-123');
    expect(result[FirebaseHeaders.GOOG_API_CLIENT]).toBe('gl-js/ fire/1.2.3');
    expect(result[FirebaseHeaders.CLIENT_VERSION]).toBe('web/1.2.3');
    expect(result[FirebaseHeaders.FIREBASE_GMPID]).toBe('app-123');
  });

  it('overwrites caller-supplied telemetry headers', () => {
    const result = resolveRequestHeaders(
      null,
      null,
      {
        headers: {
          [FirebaseHeaders.GOOG_API_CLIENT]: 'custom-client/9.9',
          [FirebaseHeaders.CLIENT_VERSION]: 'custom-client-version',
          [FirebaseHeaders.FIREBASE_GMPID]: 'custom-gmpid'
        }
      },
      'app-123'
    );
    expect(result[FirebaseHeaders.GOOG_API_CLIENT]).toBe('gl-js/ fire/1.2.3');
    expect(result[FirebaseHeaders.CLIENT_VERSION]).toBe('web/1.2.3');
    expect(result[FirebaseHeaders.FIREBASE_GMPID]).toBe('app-123');
  });
});
