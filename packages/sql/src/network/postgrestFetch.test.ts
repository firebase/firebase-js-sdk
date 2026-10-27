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

import type { AppCheckTokenResult } from '@firebase/app-check-interop-types';
import type { FirebaseAuthTokenData } from '@firebase/auth-interop-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import type {
  BuilderExecutionTracker,
  MutableSqlClientState
} from '../core/state';
import type { AppCheckTokenProvider } from '../core/tokenProviders/AppCheckTokenProvider';
import type { FirebaseAuthTokenProvider } from '../core/tokenProviders/FirebaseAuthTokenProvider';
import { SDK_VERSION, setSDKVersion } from '../core/version';

import { getFetch, initializeFetch } from './fetch';
import { createBuilderFetch } from './postgrestFetch';

import { createBuilderFetch as reExportedCreateBuilderFetch } from './index';

interface MockProviders {
  authGetToken: ReturnType<
    typeof vi.fn<
      (options?: {
        forceRefresh?: boolean;
      }) => Promise<FirebaseAuthTokenData | null>
    >
  >;
  appCheckGetToken: ReturnType<
    typeof vi.fn<
      (options?: {
        forceRefresh?: boolean;
      }) => Promise<AppCheckTokenResult | null>
    >
  >;
  authProvider: FirebaseAuthTokenProvider;
  appCheckProvider: AppCheckTokenProvider;
}

function createMockProviders(
  initialAuth: string | null = 'auth-token-1',
  initialAppCheck: string | null = 'appcheck-token-1'
): MockProviders {
  const authGetToken = vi.fn<
    (options?: {
      forceRefresh?: boolean;
    }) => Promise<FirebaseAuthTokenData | null>
  >(async () => (initialAuth !== null ? { accessToken: initialAuth } : null));

  const appCheckGetToken = vi.fn<
    (options?: {
      forceRefresh?: boolean;
    }) => Promise<AppCheckTokenResult | null>
  >(async () => (initialAppCheck !== null ? { token: initialAppCheck } : null));

  const authProvider: FirebaseAuthTokenProvider = {
    getToken: authGetToken,
    getAuth: () => undefined,
    addTokenChangeListener: vi.fn(),
    removeTokenChangeListener: vi.fn(),
    terminate: vi.fn()
  };

  const appCheckProvider: AppCheckTokenProvider = {
    getToken: appCheckGetToken,
    addTokenChangeListener: vi.fn(),
    removeTokenChangeListener: vi.fn(),
    terminate: vi.fn()
  };

  return {
    authGetToken,
    appCheckGetToken,
    authProvider,
    appCheckProvider
  };
}

describe('createBuilderFetch', () => {
  const originalFetch = getFetch();
  const originalSdkVersion = SDK_VERSION;

  beforeEach(() => {
    setSDKVersion('1.2.3');
  });

  afterEach(() => {
    initializeFetch(originalFetch);
    setSDKVersion(originalSdkVersion);
  });

  it('is re-exported from network/index', () => {
    expect(reExportedCreateBuilderFetch).toBe(createBuilderFetch);
  });

  it('injects all required Firebase SQL headers and omits apiKey and forbidden headers', async () => {
    const providers = createMockProviders('jwt-abc', 'appcheck-xyz');
    const state: MutableSqlClientState = {
      active: {
        appId: '1:123456:web:abcdef',
        authTokenProvider: providers.authProvider,
        appCheckTokenProvider: providers.appCheckProvider
      }
    };
    const tracker: BuilderExecutionTracker = { clientError: null };

    const mockFetch = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify([{ id: 1 }]), { status: 200 })
    );
    initializeFetch(mockFetch);

    const builderFetch = createBuilderFetch(state, tracker);
    const response = await builderFetch('https://example.com/postgrest/users', {
      method: 'GET',
      headers: {
        'x-custom-header': 'custom-val',
        accept: 'application/json'
      }
    });

    expect(response.status).toBe(200);
    expect(tracker.clientError).toBeNull();
    expect(providers.authGetToken).toHaveBeenCalledWith({
      forceRefresh: false
    });
    expect(providers.appCheckGetToken).toHaveBeenCalledWith({
      forceRefresh: false
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe('https://example.com/postgrest/users');
    const sentHeaders = calledInit?.headers as Record<string, string>;
    expect(sentHeaders).toEqual({
      'x-custom-header': 'custom-val',
      accept: 'application/json',
      'x-goog-api-client': 'gl-js/ fire/1.2.3',
      'x-client-version': 'web/1.2.3',
      'x-firebase-gmpid': '1:123456:web:abcdef',
      'x-firebase-auth-token': 'jwt-abc',
      'x-firebase-appcheck': 'appcheck-xyz'
    });
    expect('x-goog-api-key' in sentHeaders).toBe(false);
    expect('authorization' in sentHeaders).toBe(false);
    expect('x-firebase-sqlconnect-affinity' in sentHeaders).toBe(false);
    expect('x-goog-request-params' in sentHeaders).toBe(false);
    expect('x-firebase-client' in sentHeaders).toBe(false);
    expect('x-firebase-client-log-type' in sentHeaders).toBe(false);
  });

  it('omits optional appId, auth, and appcheck headers when absent and supports Headers and tuple arrays', async () => {
    const providers = createMockProviders(null, null);
    const state: MutableSqlClientState = {
      active: {
        appId: undefined,
        authTokenProvider: providers.authProvider,
        appCheckTokenProvider: providers.appCheckProvider
      }
    };
    const tracker: BuilderExecutionTracker = { clientError: null };

    const mockFetch = vi.fn<typeof fetch>(
      async () => new Response('[]', { status: 200 })
    );
    initializeFetch(mockFetch);

    const builderFetch = createBuilderFetch(state, tracker);
    await builderFetch('https://example.com/postgrest/users', {
      method: 'GET',
      headers: new Headers({ 'X-From-Headers': 'one' })
    });
    await builderFetch('https://example.com/postgrest/users', {
      method: 'POST',
      headers: [['x-from-tuples', 'two']]
    });

    const firstHeaders = mockFetch.mock.calls[0][1]?.headers as Record<
      string,
      string
    >;
    expect(firstHeaders).toEqual({
      'x-from-headers': 'one',
      'x-goog-api-client': 'gl-js/ fire/1.2.3',
      'x-client-version': 'web/1.2.3'
    });

    const secondHeaders = mockFetch.mock.calls[1][1]?.headers as Record<
      string,
      string
    >;
    expect(secondHeaders).toEqual({
      'x-from-tuples': 'two',
      'x-goog-api-client': 'gl-js/ fire/1.2.3',
      'x-client-version': 'web/1.2.3'
    });
  });

  it('records NOT_INITIALIZED and throws AbortError when state is already terminated', async () => {
    const state: MutableSqlClientState = { active: null };
    const tracker: BuilderExecutionTracker = { clientError: null };
    const mockFetch = vi.fn<typeof fetch>();
    initializeFetch(mockFetch);

    const builderFetch = createBuilderFetch(state, tracker);
    let thrown: unknown;
    try {
      await builderFetch('https://example.com/postgrest/users');
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).name).toBe('AbortError');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(tracker.clientError).toBeInstanceOf(FirebaseSqlError);
    expect((tracker as BuilderExecutionTracker).clientError?.code).toBe(
      Code.NOT_INITIALIZED
    );
    expect(tracker.clientError?.category).toBe(
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  });

  it('records NOT_SUPPORTED and throws AbortError when no fetch implementation is available', async () => {
    const providers = createMockProviders();
    const state: MutableSqlClientState = {
      active: {
        appId: 'app-id',
        authTokenProvider: providers.authProvider,
        appCheckTokenProvider: providers.appCheckProvider
      }
    };
    const tracker: BuilderExecutionTracker = { clientError: null };
    initializeFetch(null);

    const builderFetch = createBuilderFetch(state, tracker);
    await expect(
      builderFetch('https://example.com/postgrest/users')
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(tracker.clientError).toBeInstanceOf(FirebaseSqlError);
    expect(tracker.clientError?.code).toBe(Code.NOT_SUPPORTED);
    expect(tracker.clientError?.category).toBe(
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  });

  it('records clientError and throws AbortError on token provider failure or mid-flight termination', async () => {
    const providers = createMockProviders();
    providers.authGetToken.mockRejectedValueOnce(new Error('auth token boom'));

    const state: MutableSqlClientState = {
      active: {
        appId: 'app-id',
        authTokenProvider: providers.authProvider,
        appCheckTokenProvider: providers.appCheckProvider
      }
    };
    const tracker: BuilderExecutionTracker = { clientError: null };
    const mockFetch = vi.fn<typeof fetch>();
    initializeFetch(mockFetch);

    const builderFetch = createBuilderFetch(state, tracker);
    await expect(
      builderFetch('https://example.com/postgrest/users')
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(tracker.clientError?.code).toBe(Code.OTHER);
    expect(tracker.clientError?.message).toBe('auth token boom');
    expect(tracker.clientError?.category).toBe(
      FirebaseSqlErrorCategory.SQL_CLIENT
    );

    // Mid-flight termination while awaiting getToken resolves
    tracker.clientError = null;
    providers.authGetToken.mockImplementationOnce(async () => {
      state.active = null;
      return { accessToken: 'late-token' };
    });
    await expect(
      builderFetch('https://example.com/postgrest/users')
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(mockFetch).not.toHaveBeenCalled();
    expect((tracker as BuilderExecutionTracker).clientError?.code).toBe(
      Code.NOT_INITIALIZED
    );
  });

  it('propagates genuine baseFetch network errors untouched without setting tracker.clientError', async () => {
    const providers = createMockProviders();
    const state: MutableSqlClientState = {
      active: {
        appId: 'app-id',
        authTokenProvider: providers.authProvider,
        appCheckTokenProvider: providers.appCheckProvider
      }
    };
    const tracker: BuilderExecutionTracker = { clientError: null };
    const networkErr = new TypeError('Failed to fetch');
    const mockFetch = vi.fn<typeof fetch>().mockRejectedValueOnce(networkErr);
    initializeFetch(mockFetch);

    const builderFetch = createBuilderFetch(state, tracker);
    await expect(
      builderFetch('https://example.com/postgrest/users')
    ).rejects.toBe(networkErr);
    expect(tracker.clientError).toBeNull();
  });

  describe('1x 401 token-refresh retry', () => {
    it('retries exactly once with forceRefresh: true when refreshed auth token differs', async () => {
      const providers = createMockProviders('stale-jwt', 'appcheck-1');
      providers.authGetToken
        .mockResolvedValueOnce({ accessToken: 'stale-jwt' })
        .mockResolvedValueOnce({ accessToken: 'fresh-jwt' });

      const state: MutableSqlClientState = {
        active: {
          appId: 'app-id',
          authTokenProvider: providers.authProvider,
          appCheckTokenProvider: providers.appCheckProvider
        }
      };
      const tracker: BuilderExecutionTracker = { clientError: null };

      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              error: {
                code: 401,
                status: 'UNAUTHENTICATED',
                message: 'Expired'
              }
            }),
            { status: 401 }
          )
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ id: 42 }]), { status: 200 })
        );
      initializeFetch(mockFetch);

      const builderFetch = createBuilderFetch(state, tracker);
      const res = await builderFetch('https://example.com/postgrest/users', {
        method: 'POST',
        body: '{"name":"Alice"}'
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([{ id: 42 }]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(providers.authGetToken).toHaveBeenNthCalledWith(1, {
        forceRefresh: false
      });
      expect(providers.authGetToken).toHaveBeenNthCalledWith(2, {
        forceRefresh: true
      });

      const firstSentHeaders = mockFetch.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      const secondSentHeaders = mockFetch.mock.calls[1][1]?.headers as Record<
        string,
        string
      >;
      expect(firstSentHeaders['x-firebase-auth-token']).toBe('stale-jwt');
      expect(secondSentHeaders['x-firebase-auth-token']).toBe('fresh-jwt');
    });

    it('does not retry a second time if the retried request also returns 401', async () => {
      const providers = createMockProviders('jwt-1', null);
      providers.authGetToken
        .mockResolvedValueOnce({ accessToken: 'jwt-1' })
        .mockResolvedValueOnce({ accessToken: 'jwt-2' });

      const state: MutableSqlClientState = {
        active: {
          appId: 'app-id',
          authTokenProvider: providers.authProvider,
          appCheckTokenProvider: providers.appCheckProvider
        }
      };
      const tracker: BuilderExecutionTracker = { clientError: null };

      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response('{"code":"42501"}', { status: 401 })
        )
        .mockResolvedValueOnce(
          new Response('{"code":"42501"}', { status: 401 })
        );
      initializeFetch(mockFetch);

      const builderFetch = createBuilderFetch(state, tracker);
      const res = await builderFetch('https://example.com/postgrest/users');

      expect(res.status).toBe(401);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(providers.authGetToken).toHaveBeenCalledTimes(2);
    });

    it('does not retry when forceRefresh returns null or the same auth token', async () => {
      // Anonymous request receiving 401 (e.g., anon RLS 42501) where forceRefresh is still null
      const anonProviders = createMockProviders(null, null);
      const state: MutableSqlClientState = {
        active: {
          appId: 'app-id',
          authTokenProvider: anonProviders.authProvider,
          appCheckTokenProvider: anonProviders.appCheckProvider
        }
      };
      const tracker: BuilderExecutionTracker = { clientError: null };

      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('{"code":"42501"}', { status: 401 }));
      initializeFetch(mockFetch);

      const builderFetch = createBuilderFetch(state, tracker);
      const anonRes = await builderFetch('https://example.com/postgrest/users');
      expect(anonRes.status).toBe(401);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Authenticated request where forceRefresh returns the identical token
      const sameProviders = createMockProviders(
        'unchanged-jwt',
        'bad-appcheck'
      );
      state.active = {
        appId: 'app-id',
        authTokenProvider: sameProviders.authProvider,
        appCheckTokenProvider: sameProviders.appCheckProvider
      };
      mockFetch.mockClear();

      const sameRes = await builderFetch('https://example.com/postgrest/users');
      expect(sameRes.status).toBe(401);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('records clientError and throws AbortError if forceRefresh fails or instance terminates during 401 refresh', async () => {
      const providers = createMockProviders('jwt-1', null);
      const customSqlErr = new FirebaseSqlError(
        Code.UNAUTHORIZED,
        'Refresh rejected',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
      providers.authGetToken
        .mockResolvedValueOnce({ accessToken: 'jwt-1' })
        .mockRejectedValueOnce(customSqlErr);

      const state: MutableSqlClientState = {
        active: {
          appId: 'app-id',
          authTokenProvider: providers.authProvider,
          appCheckTokenProvider: providers.appCheckProvider
        }
      };
      const tracker: BuilderExecutionTracker = { clientError: null };
      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('unauthorized', { status: 401 }));
      initializeFetch(mockFetch);

      const builderFetch = createBuilderFetch(state, tracker);
      await expect(
        builderFetch('https://example.com/postgrest/users')
      ).rejects.toMatchObject({ name: 'AbortError' });
      expect(tracker.clientError).toBe(customSqlErr);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
