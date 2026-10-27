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
import type {
  FirebaseAuthInternal,
  FirebaseAuthTokenData
} from '@firebase/auth-interop-types';
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
  setUid: (uid: string | null | undefined) => void;
  authProvider: FirebaseAuthTokenProvider;
  appCheckProvider: AppCheckTokenProvider;
}

function createMockProviders(
  initialAuth: string | null = 'auth-token-1',
  initialAppCheck: string | null = 'appcheck-token-1',
  initialUid?: string | null
): MockProviders {
  let currentUid: string | null | undefined = initialUid;
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

  const mockAuth: FirebaseAuthInternal = {
    getToken: authGetToken,
    getUid: () => currentUid ?? null,
    addAuthTokenListener: vi.fn(),
    removeAuthTokenListener: vi.fn()
  };

  const authProvider: FirebaseAuthTokenProvider = {
    getToken: authGetToken,
    getAuth: () => (currentUid === undefined ? undefined : mockAuth),
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
    setUid: uid => {
      currentUid = uid;
    },
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
      expect(providers.authGetToken).toHaveBeenCalledTimes(3);
      expect(providers.authGetToken).toHaveBeenNthCalledWith(1, {
        forceRefresh: false
      });
      expect(providers.authGetToken).toHaveBeenNthCalledWith(2, {
        forceRefresh: false
      });
      expect(providers.authGetToken).toHaveBeenNthCalledWith(3, {
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
      expect(providers.authGetToken).toHaveBeenCalledTimes(3);
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
      expect(sameProviders.authGetToken).toHaveBeenCalledTimes(3);
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

      // Termination during the initial { forceRefresh: false } check skips { forceRefresh: true }
      const termProviders = createMockProviders('jwt-1', null);
      let callCount = 0;
      termProviders.authGetToken.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          state.active = null;
        }
        return { accessToken: 'jwt-1' };
      });
      state.active = {
        appId: 'app-id',
        authTokenProvider: termProviders.authProvider,
        appCheckTokenProvider: termProviders.appCheckProvider
      };
      const termTracker: BuilderExecutionTracker = { clientError: null };
      const termFetch = createBuilderFetch(state, termTracker);
      await expect(
        termFetch('https://example.com/postgrest/users')
      ).rejects.toMatchObject({ name: 'AbortError' });
      expect(termTracker.clientError).toMatchObject({
        code: Code.NOT_INITIALIZED
      });
      expect(termProviders.authGetToken).toHaveBeenCalledTimes(2);
    });

    it('does not forceRefresh or replay an anonymous 401 request when a user signs in mid-flight', async () => {
      const providers = createMockProviders(null, null, null);
      const state: MutableSqlClientState = {
        active: {
          appId: 'app-id',
          authTokenProvider: providers.authProvider,
          appCheckTokenProvider: providers.appCheckProvider
        }
      };
      const tracker: BuilderExecutionTracker = { clientError: null };

      const originalResponse = new Response('{"code":"42501"}', {
        status: 401
      });
      const mockFetch = vi.fn<typeof fetch>(async () => {
        providers.setUid('uid-signed-in');
        providers.authGetToken.mockResolvedValue({
          accessToken: 'signed-in-jwt'
        });
        return originalResponse;
      });
      initializeFetch(mockFetch);

      const builderFetch = createBuilderFetch(state, tracker);
      const res = await builderFetch('https://example.com/postgrest/users', {
        method: 'POST',
        body: '{"note":"anon"}'
      });

      expect(res).toBe(originalResponse);
      expect(res.status).toBe(401);
      expect(providers.authGetToken).toHaveBeenCalledTimes(1);
      expect(providers.authGetToken).toHaveBeenCalledWith({
        forceRefresh: false
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does not replay a 401 request across principals when account switches mid-flight', async () => {
      const providers = createMockProviders(
        'user-a-jwt',
        'appcheck-1',
        'uid-a'
      );
      const state: MutableSqlClientState = {
        active: {
          appId: 'app-id',
          authTokenProvider: providers.authProvider,
          appCheckTokenProvider: providers.appCheckProvider
        }
      };
      const tracker: BuilderExecutionTracker = { clientError: null };

      const originalResponse = new Response(
        JSON.stringify({
          error: {
            code: 401,
            status: 'UNAUTHENTICATED',
            message: 'Expired'
          }
        }),
        { status: 401 }
      );
      const mockFetch = vi.fn<typeof fetch>(async () => {
        providers.setUid('uid-b');
        providers.authGetToken.mockResolvedValue({
          accessToken: 'user-b-jwt'
        });
        return originalResponse;
      });
      initializeFetch(mockFetch);

      const builderFetch = createBuilderFetch(state, tracker);
      const res = await builderFetch('https://example.com/postgrest/users', {
        method: 'DELETE'
      });

      expect(res).toBe(originalResponse);
      expect(res.status).toBe(401);
      expect(providers.authGetToken).toHaveBeenCalledTimes(2);
      expect(providers.authGetToken).toHaveBeenNthCalledWith(1, {
        forceRefresh: false
      });
      expect(providers.authGetToken).toHaveBeenNthCalledWith(2, {
        forceRefresh: false
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('replays once when same principal refreshes to a new token', async () => {
      const providers = createMockProviders(
        'user-a-stale-jwt',
        'appcheck-1',
        'uid-a'
      );
      providers.authGetToken
        .mockResolvedValueOnce({ accessToken: 'user-a-stale-jwt' })
        .mockResolvedValueOnce({ accessToken: 'user-a-stale-jwt' })
        .mockResolvedValueOnce({ accessToken: 'user-a-fresh-jwt' });

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
          new Response(JSON.stringify([{ id: 7 }]), { status: 200 })
        );
      initializeFetch(mockFetch);

      const builderFetch = createBuilderFetch(state, tracker);
      const res = await builderFetch('https://example.com/postgrest/users');

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([{ id: 7 }]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const firstHeaders = mockFetch.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      const secondHeaders = mockFetch.mock.calls[1][1]?.headers as Record<
        string,
        string
      >;
      expect(firstHeaders['x-firebase-auth-token']).toBe('user-a-stale-jwt');
      expect(secondHeaders['x-firebase-auth-token']).toBe('user-a-fresh-jwt');
    });

    it('reuses rotated cached token on staggered 401 responses without redundant forceRefresh calls', async () => {
      const providers = createMockProviders(
        'expired-jwt',
        'appcheck-1',
        'uid-a'
      );
      let cachedToken = 'expired-jwt';
      providers.authGetToken.mockImplementation(async options => {
        if (options?.forceRefresh) {
          cachedToken = 'rotated-jwt';
        }
        return { accessToken: cachedToken };
      });

      const state: MutableSqlClientState = {
        active: {
          appId: 'app-id',
          authTokenProvider: providers.authProvider,
          appCheckTokenProvider: providers.appCheckProvider
        }
      };

      let releaseSecond401!: () => void;
      const second401Gate = new Promise<void>(resolve => {
        releaseSecond401 = resolve;
      });

      const mockFetch = vi.fn<typeof fetch>(async (input, init) => {
        const url = String(input);
        const sentToken = (init?.headers as Record<string, string>)[
          'x-firebase-auth-token'
        ];
        if (url.endsWith('/req1')) {
          if (sentToken === 'expired-jwt') {
            return new Response('{"message":"Expired"}', { status: 401 });
          }
          releaseSecond401();
          return new Response(JSON.stringify([{ req: 1 }]), { status: 200 });
        }
        if (sentToken === 'expired-jwt') {
          await second401Gate;
          return new Response('{"message":"Expired"}', { status: 401 });
        }
        return new Response(JSON.stringify([{ req: 2 }]), { status: 200 });
      });
      initializeFetch(mockFetch);

      const tracker1: BuilderExecutionTracker = { clientError: null };
      const tracker2: BuilderExecutionTracker = { clientError: null };
      const fetch1 = createBuilderFetch(state, tracker1);
      const fetch2 = createBuilderFetch(state, tracker2);

      const [res1, res2] = await Promise.all([
        fetch1('https://example.com/postgrest/req1'),
        fetch2('https://example.com/postgrest/req2')
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(await res1.json()).toEqual([{ req: 1 }]);
      expect(await res2.json()).toEqual([{ req: 2 }]);
      expect(mockFetch).toHaveBeenCalledTimes(4);

      const req2RetryCall = mockFetch.mock.calls.find(
        ([callInput, callInit]) =>
          String(callInput).endsWith('/req2') &&
          (callInit?.headers as Record<string, string>)[
            'x-firebase-auth-token'
          ] === 'rotated-jwt'
      );
      expect(req2RetryCall).toBeDefined();

      const forceRefreshCalls = providers.authGetToken.mock.calls.filter(
        ([opts]) => opts?.forceRefresh === true
      );
      expect(forceRefreshCalls).toHaveLength(1);
    });

    it('cancels discarded 401 response.body without calling response.text() on refresh failure, termination, and retry', async () => {
      const make401WithSpies = (): {
        response: Response;
        cancelSpy: ReturnType<typeof vi.fn>;
        textSpy: ReturnType<typeof vi.spyOn>;
      } => {
        const cancelSpy = vi.fn(async () => {});
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"error":"expired"}'));
          },
          cancel: cancelSpy
        });
        const response = new Response(stream, { status: 401 });
        const textSpy = vi.spyOn(response, 'text');
        return { response, cancelSpy, textSpy };
      };

      // 1. Refresh failure cancels response.body without buffering via text()
      const failProviders = createMockProviders('jwt-1', null, 'uid-a');
      failProviders.authGetToken
        .mockResolvedValueOnce({ accessToken: 'jwt-1' })
        .mockResolvedValueOnce({ accessToken: 'jwt-1' })
        .mockRejectedValueOnce(new Error('Refresh failed'));

      const state: MutableSqlClientState = {
        active: {
          appId: 'app-id',
          authTokenProvider: failProviders.authProvider,
          appCheckTokenProvider: failProviders.appCheckProvider
        }
      };
      const failCase = make401WithSpies();
      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(failCase.response);
      initializeFetch(mockFetch);

      const failTracker: BuilderExecutionTracker = { clientError: null };
      await expect(
        createBuilderFetch(
          state,
          failTracker
        )('https://example.com/postgrest/users')
      ).rejects.toMatchObject({ name: 'AbortError' });
      expect(failCase.cancelSpy).toHaveBeenCalledTimes(1);
      expect(failCase.textSpy).not.toHaveBeenCalled();

      // 2. Mid-refresh termination cancels response.body without buffering via text()
      const termProviders = createMockProviders('jwt-1', null, 'uid-a');
      let termTokenCalls = 0;
      termProviders.authGetToken.mockImplementation(async () => {
        termTokenCalls++;
        if (termTokenCalls === 3) {
          state.active = null;
        }
        return { accessToken: 'jwt-1' };
      });
      state.active = {
        appId: 'app-id',
        authTokenProvider: termProviders.authProvider,
        appCheckTokenProvider: termProviders.appCheckProvider
      };
      const termCase = make401WithSpies();
      mockFetch.mockResolvedValueOnce(termCase.response);

      const termTracker: BuilderExecutionTracker = { clientError: null };
      await expect(
        createBuilderFetch(
          state,
          termTracker
        )('https://example.com/postgrest/users')
      ).rejects.toMatchObject({ name: 'AbortError' });
      expect(termTracker.clientError).toMatchObject({
        code: Code.NOT_INITIALIZED
      });
      expect(termCase.cancelSpy).toHaveBeenCalledTimes(1);
      expect(termCase.textSpy).not.toHaveBeenCalled();

      // 3. Successful 401 retry cancels discarded 401 response.body without calling text()
      const retryProviders = createMockProviders('jwt-1', null, 'uid-a');
      retryProviders.authGetToken
        .mockResolvedValueOnce({ accessToken: 'jwt-1' })
        .mockResolvedValueOnce({ accessToken: 'jwt-1' })
        .mockResolvedValueOnce({ accessToken: 'jwt-2' });
      state.active = {
        appId: 'app-id',
        authTokenProvider: retryProviders.authProvider,
        appCheckTokenProvider: retryProviders.appCheckProvider
      };
      const retryCase = make401WithSpies();
      mockFetch
        .mockResolvedValueOnce(retryCase.response)
        .mockResolvedValueOnce(new Response('[{"id":1}]', { status: 200 }));

      const retryTracker: BuilderExecutionTracker = { clientError: null };
      const retryRes = await createBuilderFetch(
        state,
        retryTracker
      )('https://example.com/postgrest/users');
      expect(retryRes.status).toBe(200);
      expect(retryCase.cancelSpy).toHaveBeenCalledTimes(1);
      expect(retryCase.textSpy).not.toHaveBeenCalled();
    });
  });
});
