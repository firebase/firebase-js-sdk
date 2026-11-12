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
  FirebaseApp,
  _addComponent,
  _getProvider,
  deleteApp,
  getApps,
  initializeApp
} from '@firebase/app';
import {
  FirebaseAuthInternal,
  FirebaseAuthInternalName,
  FirebaseAuthTokenData
} from '@firebase/auth-interop-types';
import {
  Component,
  ComponentType,
  InstantiationMode
} from '@firebase/component';
import { expect, vi } from 'vitest';

import { MockAppCheckProvider, MockAuthProvider } from '../../test/mocks';
import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import { SqlServiceSettings } from '../core/settings';
import type { BuilderExecutionTracker, SqlClientState } from '../core/state';
import { TokenOptions } from '../core/tokenProviders/AbstractTokenProvider';
import { FirebaseAuthProvider } from '../core/tokenProviders/FirebaseAuthTokenProvider';
import { SDK_VERSION, setSDKVersion } from '../core/version';

import { FirebaseHeaders, getGoogApiClientValue } from './headers';
import {
  FirebaseSqlTransport,
  composeSignals,
  createBuilderFetch,
  getAuthUidFromToken,
  toAbortError
} from './transport';

const TEST_URL =
  'https://firebasedataconnect.googleapis.com/v1/projects/p/locations/l/services/s/postgrest/todos';
const BASE_SETTINGS: SqlServiceSettings = { serviceId: 's', location: 'l' };

type FirebaseSqlTransportWithInternalProperties = FirebaseSqlTransport & {
  _isUsingEmulator: boolean;
};

/**
 * Creates a mock base64url-encoded JWT with a specified sub claim.
 */
function createMockJwt(uid: string, suffix = ''): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const payload = btoa(
    JSON.stringify({ sub: uid, aud: 'test-project', exp: 9999999999 })
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${payload}.sig${suffix}`;
}

/**
 * Extracts the `Headers` sent on a specific call to the mock `fetch` function.
 */
function getHeadersFromCall(
  mockFetch: ReturnType<typeof vi.fn>,
  callIndex = 0
): Headers {
  const init = mockFetch.mock.calls[callIndex]?.[1] as RequestInit | undefined;
  return new Headers(init?.headers);
}

describe('FirebaseSqlTransport', () => {
  const originalVersion = SDK_VERSION;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setSDKVersion('1.2.3');
    mockFetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
    );
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    setSDKVersion(originalVersion);
    vi.restoreAllMocks();
    await Promise.all(getApps().map(app => deleteApp(app)));
  });

  describe('invokePostgrestOperation', () => {
    it('forwards init.signal to fetch and propagates raw AbortError / TypeError unwrapped', async () => {
      const controller = new AbortController();
      const abortError = new DOMException(
        'The operation was aborted.',
        'AbortError'
      );
      mockFetch.mockRejectedValueOnce(abortError);
      const transport = new FirebaseSqlTransport({ settings: BASE_SETTINGS });

      await expect(
        transport.invokePostgrestOperation(TEST_URL, {
          signal: controller.signal
        })
      ).rejects.toBe(abortError);
      expect(
        (mockFetch.mock.calls[0]?.[1] as RequestInit | undefined)?.signal
      ).toBe(controller.signal);

      const networkError = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValueOnce(networkError);
      await expect(transport.invokePostgrestOperation(TEST_URL)).rejects.toBe(
        networkError
      );
    });

    describe('Headers', () => {
      it('sets credentials: include when emulator host is configured on a Cloud Workstation URL and preserves explicit credentials', async () => {
        const workstationUrl =
          'https://8080-my-workstation.cluster.cloudworkstations.dev/v1/projects/p/locations/l/services/s/postgrest/todos';
        const workstationTransport = new FirebaseSqlTransport({
          settings: {
            ...BASE_SETTINGS,
            host: '8080-my-workstation.cluster.cloudworkstations.dev'
          }
        });
        (
          workstationTransport as FirebaseSqlTransportWithInternalProperties
        )._isUsingEmulator = true;

        await workstationTransport.invokePostgrestOperation(workstationUrl);
        expect(
          (mockFetch.mock.calls[0]?.[1] as RequestInit | undefined)?.credentials
        ).toBe('include');

        await workstationTransport.invokePostgrestOperation(workstationUrl, {
          credentials: 'omit'
        });
        expect(
          (mockFetch.mock.calls[1]?.[1] as RequestInit | undefined)?.credentials
        ).toBe('omit');

        const nonEmulatorTransport = new FirebaseSqlTransport({
          settings: BASE_SETTINGS
        });
        await nonEmulatorTransport.invokePostgrestOperation(workstationUrl);
        expect(
          (mockFetch.mock.calls[2]?.[1] as RequestInit | undefined)?.credentials
        ).toBeUndefined();
      });

      it('produces identical wire fetch calls when init.headers is passed as a plain Record, Headers instance, or tuple array', async () => {
        const authProvider = new MockAuthProvider('auth-token');
        const appCheckProvider = new MockAppCheckProvider('appcheck-token');
        const transport = new FirebaseSqlTransport({
          settings: BASE_SETTINGS,
          appId: 'test-app',
          authTokenProvider: authProvider,
          appCheckTokenProvider: appCheckProvider
        });

        const customHeaders = { 'X-Custom-Header': 'custom-val' };
        const targetUrl = `${TEST_URL}?id=eq.1`;
        const bodyPayload = JSON.stringify({ key: 'val' });

        // 1. Plain Record headers
        await transport.invokePostgrestOperation(targetUrl, {
          method: 'POST',
          headers: customHeaders,
          body: bodyPayload
        });

        // 2. Headers instance
        await transport.invokePostgrestOperation(targetUrl, {
          method: 'POST',
          headers: new Headers(customHeaders),
          body: bodyPayload
        });

        // 3. Tuple array headers
        await transport.invokePostgrestOperation(targetUrl, {
          method: 'POST',
          headers: [['X-Custom-Header', 'custom-val']],
          body: bodyPayload
        });

        expect(mockFetch).toHaveBeenCalledTimes(3);

        const baselineUrl = mockFetch.mock.calls[0]?.[0];
        const baselineInit = mockFetch.mock.calls[0]?.[1] as RequestInit;

        expect(baselineUrl).toBe(targetUrl);
        expect(baselineInit.method).toBe('POST');
        expect(baselineInit.body).toBe(bodyPayload);

        const baselineHeaders = new Headers(baselineInit.headers);
        expect(baselineHeaders.get('x-custom-header')).toBe('custom-val');
        expect(baselineHeaders.get(FirebaseHeaders.FIREBASE_AUTH_TOKEN)).toBe(
          'auth-token'
        );
        expect(baselineHeaders.get(FirebaseHeaders.FIREBASE_APPCHECK)).toBe(
          'appcheck-token'
        );
        expect(baselineHeaders.get(FirebaseHeaders.GOOG_API_CLIENT)).toBe(
          'gl-js/ fire/1.2.3'
        );
        expect(baselineHeaders.get(FirebaseHeaders.FIREBASE_GMPID)).toBe(
          'test-app'
        );

        for (let i = 0; i < 3; i++) {
          const callUrl = mockFetch.mock.calls[i]?.[0];
          const callInit = mockFetch.mock.calls[i]?.[1] as RequestInit;

          expect(callUrl).toBe(baselineUrl);
          expect(callInit.method).toBe(baselineInit.method);
          expect(callInit.body).toBe(baselineInit.body);
          expect(callInit.headers).toEqual(baselineInit.headers);
        }
      });

      describe('Firebase Headers', () => {
        it('attaches x-firebase-auth-token, x-firebase-appcheck, and custom init headers when providers resolve tokens', async () => {
          const authProvider = new MockAuthProvider('my-auth-token');
          const appCheckProvider = new MockAppCheckProvider(
            'my-appcheck-token'
          );
          const transport = new FirebaseSqlTransport({
            settings: BASE_SETTINGS,
            authTokenProvider: authProvider,
            appCheckTokenProvider: appCheckProvider
          });

          await transport.invokePostgrestOperation(TEST_URL, {
            headers: {
              'X-Custom-Header': 'my-custom-value'
            }
          });

          expect(authProvider.getToken).toHaveBeenCalledWith({
            forceRefresh: false
          });
          expect(appCheckProvider.getToken).toHaveBeenCalledWith({
            forceRefresh: false
          });
          const headers = getHeadersFromCall(mockFetch);
          expect(headers.get(FirebaseHeaders.FIREBASE_AUTH_TOKEN)).toBe(
            'my-auth-token'
          );
          expect(headers.get(FirebaseHeaders.FIREBASE_APPCHECK)).toBe(
            'my-appcheck-token'
          );
          expect(headers.get('x-custom-header')).toBe('my-custom-value');
        });

        it('omits token headers when auth and App Check providers are omitted', async () => {
          const omittedTransport = new FirebaseSqlTransport({
            settings: BASE_SETTINGS
          });
          await omittedTransport.invokePostgrestOperation(TEST_URL);
          const headers = getHeadersFromCall(mockFetch);
          expect(headers.has(FirebaseHeaders.FIREBASE_AUTH_TOKEN)).toBe(false);
          expect(headers.has(FirebaseHeaders.FIREBASE_APPCHECK)).toBe(false);
        });

        it('omits token headers when providers return null or empty tokens', async () => {
          const nullTransport = new FirebaseSqlTransport({
            settings: BASE_SETTINGS,
            authTokenProvider: new MockAuthProvider(null),
            appCheckTokenProvider: new MockAppCheckProvider('')
          });
          await nullTransport.invokePostgrestOperation(TEST_URL);
          const headers = getHeadersFromCall(mockFetch);
          expect(headers.has(FirebaseHeaders.FIREBASE_AUTH_TOKEN)).toBe(false);
          expect(headers.has(FirebaseHeaders.FIREBASE_APPCHECK)).toBe(false);
        });

        it('rejects invokePostgrestOperation and does not call fetch when authProvider.getToken() rejects', async () => {
          const authError = new Error('auth failure');
          const rejectingAuth = new MockAuthProvider();
          rejectingAuth.getToken.mockRejectedValue(authError);
          const transport = new FirebaseSqlTransport({
            settings: BASE_SETTINGS,
            authTokenProvider: rejectingAuth
          });

          await expect(
            transport.invokePostgrestOperation(TEST_URL)
          ).rejects.toBe(authError);
          expect(mockFetch).not.toHaveBeenCalled();
        });

        it('executes successfully with auth token and omits App Check header when appCheckProvider.getToken() rejects', async () => {
          const authProvider = new MockAuthProvider('my-auth-token');
          const rejectingAppCheck = new MockAppCheckProvider('');
          rejectingAppCheck.getToken.mockRejectedValue(
            new Error('appcheck failure')
          );

          const expectedResponse = new Response('OK', { status: 200 });
          mockFetch.mockResolvedValueOnce(expectedResponse);
          const transport = new FirebaseSqlTransport({
            settings: BASE_SETTINGS,
            authTokenProvider: authProvider,
            appCheckTokenProvider: rejectingAppCheck
          });

          const response = await transport.invokePostgrestOperation(TEST_URL);
          expect(response).toBe(expectedResponse);
          const headers = getHeadersFromCall(mockFetch);
          expect(headers.get(FirebaseHeaders.FIREBASE_AUTH_TOKEN)).toBe(
            'my-auth-token'
          );
          expect(headers.has(FirebaseHeaders.FIREBASE_APPCHECK)).toBe(false);
        });

        it('overwrites caller-supplied auth and App Check tokens with SDK tokens', async () => {
          const authProvider = new MockAuthProvider('sdk-auth-token');
          const appCheckProvider = new MockAppCheckProvider(
            'sdk-appcheck-token'
          );
          const transport = new FirebaseSqlTransport({
            settings: BASE_SETTINGS,
            authTokenProvider: authProvider,
            appCheckTokenProvider: appCheckProvider
          });

          await transport.invokePostgrestOperation(TEST_URL, {
            headers: {
              [FirebaseHeaders.FIREBASE_AUTH_TOKEN]: 'caller-auth-token',
              [FirebaseHeaders.FIREBASE_APPCHECK]: 'caller-appcheck-token'
            }
          });

          const headers = getHeadersFromCall(mockFetch);
          expect(headers.get(FirebaseHeaders.FIREBASE_AUTH_TOKEN)).toBe(
            'sdk-auth-token'
          );
          expect(headers.get(FirebaseHeaders.FIREBASE_APPCHECK)).toBe(
            'sdk-appcheck-token'
          );
        });

        it('attaches x-goog-api-client and x-firebase-gmpid when appId is configured', async () => {
          await new FirebaseSqlTransport({
            settings: BASE_SETTINGS,
            appId: '1:123456:web:abcdef'
          }).invokePostgrestOperation(TEST_URL);
          const headers = getHeadersFromCall(mockFetch);
          expect(getGoogApiClientValue()).toBe('gl-js/ fire/1.2.3');
          expect(headers.get(FirebaseHeaders.GOOG_API_CLIENT)).toBe(
            'gl-js/ fire/1.2.3'
          );
          expect(headers.get(FirebaseHeaders.FIREBASE_GMPID)).toBe(
            '1:123456:web:abcdef'
          );
        });

        it('attaches x-goog-api-client and omits x-firebase-gmpid when appId is omitted', async () => {
          await new FirebaseSqlTransport({
            settings: BASE_SETTINGS
          }).invokePostgrestOperation(TEST_URL);
          const headers = getHeadersFromCall(mockFetch);
          expect(headers.get(FirebaseHeaders.GOOG_API_CLIENT)).toBe(
            'gl-js/ fire/1.2.3'
          );
          expect(headers.has(FirebaseHeaders.FIREBASE_GMPID)).toBe(false);
        });

        it('overwrites caller-supplied x-goog-api-client and x-firebase-gmpid headers', async () => {
          await new FirebaseSqlTransport({
            settings: BASE_SETTINGS,
            appId: 'default-gmpid'
          }).invokePostgrestOperation(TEST_URL, {
            headers: {
              'X-Goog-Api-Client': 'custom-client/1.0',
              'X-Firebase-GMPID': 'custom-gmpid'
            }
          });
          const headers = getHeadersFromCall(mockFetch);
          expect(headers.get(FirebaseHeaders.GOOG_API_CLIENT)).toBe(
            'gl-js/ fire/1.2.3'
          );
          expect(headers.get(FirebaseHeaders.FIREBASE_GMPID)).toBe(
            'default-gmpid'
          );
        });
      });
    });
  });

  describe('Deduplicated single-shot HTTP 401 force-refresh retry', () => {
    /**
     * Creates a real `FirebaseAuthProvider` backed by a mock `auth-internal` component
     * to exercise `AbstractTokenProvider`'s in-flight `forceRefresh` promise deduplication.
     */
    function createRealAuthProvider(
      mockForceRefresh: () => Promise<FirebaseAuthTokenData | null>
    ): FirebaseAuthProvider {
      const app: FirebaseApp = initializeApp({ projectId: 'test-project' });
      const mockAuthInternal: FirebaseAuthInternal = {
        getToken: vi.fn((forceRefresh?: boolean) =>
          forceRefresh
            ? mockForceRefresh()
            : Promise.resolve({
                accessToken: createMockJwt('uid-1', '-initial-concurrent')
              })
        ),
        getUid: vi.fn(() => 'uid-1'),
        addAuthTokenListener: vi.fn(),
        removeAuthTokenListener: vi.fn()
      };

      _addComponent(
        app,
        new Component(
          'auth-internal',
          () => mockAuthInternal,
          ComponentType.PRIVATE
        ).setInstantiationMode(InstantiationMode.EAGER)
      );
      const authInternalProvider = _getProvider(
        app,
        'auth-internal' as FirebaseAuthInternalName
      );
      return new FirebaseAuthProvider(app, authInternalProvider);
    }

    it('retries once with getToken({ forceRefresh: true }) on 401 when an auth token was attached and does not loop on persistent 401', async () => {
      const staleToken = createMockJwt('test-user', '-stale');
      const freshToken = createMockJwt('test-user', '-fresh');
      const authProvider = new MockAuthProvider(staleToken, freshToken);
      const requestOneResponse = new Response('Unauthorized', { status: 401 });
      const retryOneResponse = new Response(JSON.stringify([{ id: 1 }]), {
        status: 200
      });
      const requestTwoResponse = new Response('Unauthorized 1', {
        status: 401
      });
      const retryTwoResponse = new Response('Unauthorized 2', {
        status: 401
      });

      mockFetch
        .mockResolvedValueOnce(requestOneResponse)
        .mockResolvedValueOnce(retryOneResponse)
        .mockResolvedValueOnce(requestTwoResponse)
        .mockResolvedValueOnce(retryTwoResponse);

      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: authProvider
      });

      const succesfulRetryResponse =
        await transport.invokePostgrestOperation(TEST_URL);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(succesfulRetryResponse).toBe(retryOneResponse);
      expect(authProvider.getToken).toHaveBeenNthCalledWith(1, {
        forceRefresh: false
      });
      expect(authProvider.getToken).toHaveBeenNthCalledWith(2, {
        forceRefresh: false
      });
      expect(authProvider.getToken).toHaveBeenNthCalledWith(3, {
        forceRefresh: true
      });
      expect(
        getHeadersFromCall(mockFetch, 0).get(
          FirebaseHeaders.FIREBASE_AUTH_TOKEN
        )
      ).toBe(staleToken);
      expect(
        getHeadersFromCall(mockFetch, 1).get(
          FirebaseHeaders.FIREBASE_AUTH_TOKEN
        )
      ).toBe(freshToken);

      const failedRetryResponse =
        await transport.invokePostgrestOperation(TEST_URL);
      expect(failedRetryResponse).toBe(retryTwoResponse);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('retries with cached token on 401 if getToken({ forceRefresh: false }) returns a new token without calling forceRefresh', async () => {
      const staleToken = createMockJwt('test-user', '-stale');
      const cachedFreshToken = createMockJwt('test-user', '-cached-fresh');
      let callCount = 0;
      const authProvider = new MockAuthProvider();
      authProvider.getToken = vi.fn(
        async (
          options?: TokenOptions
        ): Promise<FirebaseAuthTokenData | null> => {
          callCount++;
          if (options?.forceRefresh) {
            return { accessToken: createMockJwt('test-user', '-forced') };
          }
          return callCount === 1
            ? { accessToken: staleToken }
            : { accessToken: cachedFreshToken };
        }
      );

      const requestOneResponse = new Response('Unauthorized', { status: 401 });
      const retryResponse = new Response(JSON.stringify([{ id: 1 }]), {
        status: 200
      });

      mockFetch
        .mockResolvedValueOnce(requestOneResponse)
        .mockResolvedValueOnce(retryResponse);

      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: authProvider
      });

      const response = await transport.invokePostgrestOperation(TEST_URL);
      expect(response).toBe(retryResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(
        getHeadersFromCall(mockFetch, 0).get(
          FirebaseHeaders.FIREBASE_AUTH_TOKEN
        )
      ).toBe(staleToken);
      expect(
        getHeadersFromCall(mockFetch, 1).get(
          FirebaseHeaders.FIREBASE_AUTH_TOKEN
        )
      ).toBe(cachedFreshToken);

      expect(authProvider.getToken).toHaveBeenCalledTimes(2);
      expect(authProvider.getToken).toHaveBeenNthCalledWith(1, {
        forceRefresh: false
      });
      expect(authProvider.getToken).toHaveBeenNthCalledWith(2, {
        forceRefresh: false
      });
    });

    it('deduplicates concurrent 401 responses into a single getToken(true) call with a real FirebaseAuthProvider', async () => {
      let resolveFirstRefresh!: (data: FirebaseAuthTokenData | null) => void;
      const mockForceRefresh = vi.fn(
        () =>
          new Promise<FirebaseAuthTokenData | null>(resolve => {
            resolveFirstRefresh = resolve;
          })
      );
      const realAuthProvider = createRealAuthProvider(mockForceRefresh);

      const retryRes1 = new Response('OK 1', { status: 200 });
      const retryRes2 = new Response('OK 2', { status: 200 });
      const retryRes3 = new Response('OK 3', { status: 200 });

      mockFetch
        // 3 concurrent initial requests -> 401
        .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
        .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
        .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
        // 3 deduplicated retries -> 200
        .mockResolvedValueOnce(retryRes1)
        .mockResolvedValueOnce(retryRes2)
        .mockResolvedValueOnce(retryRes3);

      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: realAuthProvider
      });
      const batch = Promise.all([
        transport.invokePostgrestOperation(`${TEST_URL}?id=1`),
        transport.invokePostgrestOperation(`${TEST_URL}?id=2`),
        transport.invokePostgrestOperation(`${TEST_URL}?id=3`)
      ]);

      await vi.waitFor(() => {
        expect(mockForceRefresh).toHaveBeenCalledTimes(1);
      });
      const sharedRefreshedToken = createMockJwt('uid-1', '-shared-refreshed');
      resolveFirstRefresh({ accessToken: sharedRefreshedToken });

      const [r1, r2, r3] = await batch;
      expect([r1, r2, r3]).toEqual([retryRes1, retryRes2, retryRes3]);
      expect(mockFetch).toHaveBeenCalledTimes(6);
      expect(
        getHeadersFromCall(mockFetch, 3).get(
          FirebaseHeaders.FIREBASE_AUTH_TOKEN
        )
      ).toBe(sharedRefreshedToken);
      expect(
        getHeadersFromCall(mockFetch, 4).get(
          FirebaseHeaders.FIREBASE_AUTH_TOKEN
        )
      ).toBe(sharedRefreshedToken);
      expect(
        getHeadersFromCall(mockFetch, 5).get(
          FirebaseHeaders.FIREBASE_AUTH_TOKEN
        )
      ).toBe(sharedRefreshedToken);
    });

    it('triggers a fresh getToken(true) refresh on a subsequent 401 after a concurrent batch settles', async () => {
      const sharedToken = createMockJwt('uid-1', '-shared-refreshed');
      const refreshedToken2 = createMockJwt('uid-1', '-refreshed-2');
      const mockForceRefresh = vi
        .fn<() => Promise<FirebaseAuthTokenData | null>>()
        .mockResolvedValueOnce({ accessToken: sharedToken })
        .mockResolvedValueOnce({ accessToken: refreshedToken2 });
      const realAuthProvider = createRealAuthProvider(mockForceRefresh);

      const subsequentRetryRes = new Response('OK 3', { status: 200 });

      mockFetch
        // First batch of 2 concurrent requests (2 x 401 -> 2 x 200)
        .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
        .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
        .mockResolvedValueOnce(new Response('OK 1', { status: 200 }))
        .mockResolvedValueOnce(new Response('OK 2', { status: 200 }))
        // Subsequent request after batch settles (401 -> 200)
        .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
        .mockResolvedValueOnce(subsequentRetryRes);

      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: realAuthProvider
      });

      await Promise.all([
        transport.invokePostgrestOperation(`${TEST_URL}?id=1`),
        transport.invokePostgrestOperation(`${TEST_URL}?id=2`)
      ]);
      expect(mockForceRefresh).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(4);

      const subsequentRes = await transport.invokePostgrestOperation(
        `${TEST_URL}?id=3`
      );
      expect(subsequentRes).toBe(subsequentRetryRes);
      expect(mockForceRefresh).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledTimes(6);
      expect(
        getHeadersFromCall(mockFetch, 5).get(
          FirebaseHeaders.FIREBASE_AUTH_TOKEN
        )
      ).toBe(refreshedToken2);
    });

    it('does not retry on 401 when authTokenProvider is omitted', async () => {
      const unauthorizedRes = new Response('Unauthorized', { status: 401 });
      mockFetch.mockResolvedValueOnce(unauthorizedRes);

      const res = await new FirebaseSqlTransport({
        settings: BASE_SETTINGS
      }).invokePostgrestOperation(TEST_URL, {
        headers: {
          Authorization: 'Bearer custom-jwt'
        }
      });

      expect(res).toBe(unauthorizedRes);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does not retry on 401 when unauthenticated (authTokenProvider returns null)', async () => {
      const unauthorizedRes = new Response('Unauthorized', { status: 401 });
      mockFetch.mockResolvedValueOnce(unauthorizedRes);

      const nullTokenProvider = new MockAuthProvider(null, 'should-not-use');
      const res = await new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: nullTokenProvider
      }).invokePostgrestOperation(TEST_URL);

      expect(res).toBe(unauthorizedRes);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(nullTokenProvider.getToken).toHaveBeenCalledExactlyOnceWith({
        forceRefresh: false
      });
    });

    it('does not retry on 401 when getToken({ forceRefresh: true }) returns the same token', async () => {
      const unauthorizedRes = new Response('Unauthorized', { status: 401 });
      mockFetch.mockResolvedValueOnce(unauthorizedRes);

      const sameToken = createMockJwt('user-1', '-same');
      const sameTokenProvider = new MockAuthProvider(sameToken, sameToken);
      const res = await new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: sameTokenProvider
      }).invokePostgrestOperation(TEST_URL);

      expect(res).toBe(unauthorizedRes);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(sameTokenProvider.getToken).toHaveBeenCalledTimes(3);
      expect(sameTokenProvider.getToken).toHaveBeenNthCalledWith(1, {
        forceRefresh: false
      });
      expect(sameTokenProvider.getToken).toHaveBeenNthCalledWith(2, {
        forceRefresh: false
      });
      expect(sameTokenProvider.getToken).toHaveBeenNthCalledWith(3, {
        forceRefresh: true
      });
    });

    it('returns the original 401 response if getToken({ forceRefresh: true }) rejects', async () => {
      const initialToken = createMockJwt('user-1', '-initial');
      const authProvider = new MockAuthProvider(initialToken);
      authProvider.getToken.mockImplementation(
        async (options?: TokenOptions) =>
          options?.forceRefresh
            ? Promise.reject(new Error('auth-refresh-network-error'))
            : { accessToken: initialToken }
      );

      const unauthorizedRes = new Response('Unauthorized', { status: 401 });
      mockFetch.mockResolvedValueOnce(unauthorizedRes);

      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: authProvider
      });

      expect(await transport.invokePostgrestOperation(TEST_URL)).toBe(
        unauthorizedRes
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('returns the original 401 response if getToken({ forceRefresh: true }) resolves null', async () => {
      const initialToken = createMockJwt('user-1', '-initial');
      const authProvider = new MockAuthProvider(initialToken, null);
      const unauthorizedRes = new Response('Unauthorized', { status: 401 });
      mockFetch.mockResolvedValueOnce(unauthorizedRes);

      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: authProvider
      });

      expect(await transport.invokePostgrestOperation(TEST_URL)).toBe(
        unauthorizedRes
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('aborts 401 retry and returns original response if refreshed token has a different sub claim (user switched accounts)', async () => {
      const initialToken = createMockJwt('user-alice', '-initial');
      const switchedUserToken = createMockJwt('user-bob', '-switched');
      const authProvider = new MockAuthProvider(
        initialToken,
        switchedUserToken
      );

      const unauthorizedRes = new Response('Unauthorized', { status: 401 });
      mockFetch.mockResolvedValueOnce(unauthorizedRes);

      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: authProvider
      });

      const res = await transport.invokePostgrestOperation(TEST_URL);

      expect(res).toBe(unauthorizedRes);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(
        getHeadersFromCall(mockFetch, 0).get(
          FirebaseHeaders.FIREBASE_AUTH_TOKEN
        )
      ).toBe(initialToken);
    });

    it('does not retry on 401 if request body is a ReadableStream', async () => {
      const initialToken = createMockJwt('user-1', '-initial');
      const freshToken = createMockJwt('user-1', '-fresh');
      const authProvider = new MockAuthProvider(initialToken, freshToken);

      const unauthorizedRes = new Response('Unauthorized', { status: 401 });
      mockFetch.mockResolvedValueOnce(unauthorizedRes);

      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: authProvider
      });

      const streamBody = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('stream content'));
          controller.close();
        }
      });

      const res = await transport.invokePostgrestOperation(TEST_URL, {
        method: 'POST',
        body: streamBody
      });

      expect(res).toBe(unauthorizedRes);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(authProvider.getToken).not.toHaveBeenCalledWith({
        forceRefresh: true
      });
      expect(authProvider.getToken).toHaveBeenCalledExactlyOnceWith({
        forceRefresh: false
      });
    });

    it('cancels response body, skips forceRefresh and retry, and rejects with AbortError if signal is already aborted on 401 response', async () => {
      const initialToken = createMockJwt('user-1', '-initial');
      const freshToken = createMockJwt('user-1', '-fresh');
      const authProvider = new MockAuthProvider(initialToken, freshToken);

      const controller = new AbortController();
      let cancelCalled = false;
      const mockResponseBody = {
        cancel: vi.fn(async () => {
          cancelCalled = true;
        })
      } as unknown as ReadableStream;

      const unauthorizedRes = new Response('Unauthorized', { status: 401 });
      Object.defineProperty(unauthorizedRes, 'body', {
        value: mockResponseBody,
        configurable: true
      });

      mockFetch.mockImplementation(async () => {
        controller.abort();
        return unauthorizedRes;
      });

      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: authProvider
      });

      const promise = transport.invokePostgrestOperation(TEST_URL, {
        signal: controller.signal
      });

      await expect(promise).rejects.toMatchObject({
        name: 'AbortError'
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(cancelCalled).toBe(true);
      expect(authProvider.getToken).not.toHaveBeenCalledWith({
        forceRefresh: true
      });
    });

    it('cancels response body and rejects with AbortError if signal is aborted while awaiting token refresh', async () => {
      const initialToken = createMockJwt('user-1', '-initial');
      const controller = new AbortController();

      let cancelCalled = false;
      const mockResponseBody = {
        cancel: vi.fn(async () => {
          cancelCalled = true;
        })
      } as unknown as ReadableStream;

      const unauthorizedRes = new Response('Unauthorized', { status: 401 });
      Object.defineProperty(unauthorizedRes, 'body', {
        value: mockResponseBody,
        configurable: true
      });

      let resolveForceRefresh!: (data: FirebaseAuthTokenData | null) => void;
      const authProvider = new MockAuthProvider(initialToken);
      authProvider.getToken = vi.fn(async (options?: TokenOptions) => {
        if (options?.forceRefresh) {
          return new Promise<FirebaseAuthTokenData | null>(resolve => {
            resolveForceRefresh = resolve;
          });
        }
        return { accessToken: initialToken };
      });

      mockFetch.mockResolvedValueOnce(unauthorizedRes);

      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: authProvider
      });

      const operationPromise = transport.invokePostgrestOperation(TEST_URL, {
        signal: controller.signal
      });

      await vi.waitFor(() => {
        expect(authProvider.getToken).toHaveBeenCalledWith({
          forceRefresh: true
        });
      });

      controller.abort();
      resolveForceRefresh({ accessToken: createMockJwt('user-1', '-fresh') });

      await expect(operationPromise).rejects.toMatchObject({
        name: 'AbortError'
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(cancelCalled).toBe(true);
    });
  });

  describe('terminationSignal integration', () => {
    it('throws immediately and makes no fetch calls when terminationSignal is already aborted', async () => {
      const terminationController = new AbortController();
      const terminationError = new FirebaseSqlError(
        Code.NOT_INITIALIZED,
        'The Firebase SQL client has been terminated.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
      terminationController.abort(terminationError);

      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        terminationSignal: terminationController.signal
      });

      await expect(transport.invokePostgrestOperation(TEST_URL)).rejects.toBe(
        terminationError
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('aborts the combined signal and rejects the operation when terminationSignal aborts in flight', async () => {
      const terminationController = new AbortController();
      let fetchSignal: AbortSignal | undefined;
      mockFetch.mockImplementation(async (_url: string, init?: RequestInit) => {
        fetchSignal = init?.signal;
        return new Promise<Response>((_resolve, reject) => {
          fetchSignal?.addEventListener('abort', () => {
            reject(toAbortError(fetchSignal!));
          });
        });
      });

      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        terminationSignal: terminationController.signal
      });

      const userController = new AbortController();
      const operationPromise = transport.invokePostgrestOperation(TEST_URL, {
        signal: userController.signal
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const terminationError = new FirebaseSqlError(
        Code.NOT_INITIALIZED,
        'The Firebase SQL client has been terminated.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
      terminationController.abort(terminationError);

      await expect(operationPromise).rejects.toBe(terminationError);
      expect(fetchSignal?.aborted).toBe(true);
    });

    describe('URL and Request input handling', () => {
      it('accepts a URL object as input', async () => {
        const transport = new FirebaseSqlTransport({ settings: BASE_SETTINGS });
        const urlObj = new URL(TEST_URL);
        await transport.invokePostgrestOperation(urlObj);
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch.mock.calls[0]?.[0]).toBe(TEST_URL);
      });

      it('accepts a Request object as input, preserving its headers and method', async () => {
        const transport = new FirebaseSqlTransport({ settings: BASE_SETTINGS });
        const requestObj = new Request(TEST_URL, {
          method: 'POST',
          headers: {
            'x-request-header': 'from-request',
            accept: 'application/json'
          },
          body: JSON.stringify({ item: 'test' })
        });
        await transport.invokePostgrestOperation(requestObj, {
          headers: { 'x-override-header': 'from-init' }
        });
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch.mock.calls[0]?.[0]).toBe(TEST_URL);
        const callInit = mockFetch.mock.calls[0]?.[1] as RequestInit;
        expect(callInit.method).toBe('POST');
        const headers = callInit.headers as Record<string, string>;
        expect(headers['x-request-header']).toBe('from-request');
        expect(headers['x-override-header']).toBe('from-init');
      });

      it('fails fast when state.active is null', async () => {
        const state: SqlClientState = { active: null };
        const transport = new FirebaseSqlTransport({ state });
        await expect(
          transport.invokePostgrestOperation(TEST_URL)
        ).rejects.toMatchObject({
          code: Code.NOT_INITIALIZED
        });
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('rejects URLs containing $-prefixed query parameters before fetching tokens or calling fetch', async () => {
        const authProvider = new MockAuthProvider('token-1');
        const transport = new FirebaseSqlTransport({
          settings: BASE_SETTINGS,
          authTokenProvider: authProvider
        });

        await expect(
          transport.invokePostgrestOperation(`${TEST_URL}?$id=eq.1`)
        ).rejects.toMatchObject({
          code: Code.INVALID_ARGUMENT,
          category: FirebaseSqlErrorCategory.SQL_CLIENT
        });
        expect(authProvider.getToken).not.toHaveBeenCalled();
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('toFetch', () => {
      it('populates tracker.clientError and throws AbortError when invokePostgrestOperation fails with FirebaseSqlError', async () => {
        const state: SqlClientState = { active: null };
        const tracker: BuilderExecutionTracker = { clientError: null };
        const transport = new FirebaseSqlTransport({ state });
        const boundFetch = transport.toFetch(tracker);

        await expect(boundFetch(TEST_URL)).rejects.toMatchObject({
          name: 'AbortError',
          message: expect.stringContaining('terminated')
        });

        expect(tracker.clientError).toBeInstanceOf(FirebaseSqlError);
        expect(tracker.clientError?.code).toBe(Code.NOT_INITIALIZED);
      });

      it('populates tracker.clientError with Code.OTHER and throws AbortError when authProvider.getToken() rejects with an Error or primitive value', async () => {
        const authError = new Error('auth/network-request-failed');
        const rejectingAuth = new MockAuthProvider();
        rejectingAuth.getToken.mockRejectedValueOnce(authError);
        rejectingAuth.getToken.mockRejectedValueOnce(
          'auth/primitive-rejection'
        );
        rejectingAuth.getToken.mockRejectedValueOnce('');
        const tracker: BuilderExecutionTracker = { clientError: null };
        const transport = new FirebaseSqlTransport({
          settings: BASE_SETTINGS,
          authTokenProvider: rejectingAuth
        });
        const invokeSpy = vi.spyOn(transport, 'invokePostgrestOperation');
        const boundFetch = transport.toFetch(tracker);

        await expect(boundFetch(TEST_URL)).rejects.toMatchObject({
          name: 'AbortError',
          message: 'auth/network-request-failed'
        });
        expect(invokeSpy).toHaveBeenCalledTimes(1);

        expect(tracker.clientError).toBeInstanceOf(FirebaseSqlError);
        expect(tracker.clientError?.code).toBe(Code.OTHER);
        expect(tracker.clientError?.category).toBe(
          FirebaseSqlErrorCategory.SQL_CLIENT
        );
        expect(tracker.clientError?.message).toBe(
          'auth/network-request-failed'
        );

        const primitiveTracker: BuilderExecutionTracker = { clientError: null };
        const primitiveFetch = transport.toFetch(primitiveTracker);
        await expect(primitiveFetch(TEST_URL)).rejects.toMatchObject({
          name: 'AbortError',
          message: 'auth/primitive-rejection'
        });
        expect(primitiveTracker.clientError).toBeInstanceOf(FirebaseSqlError);
        expect(primitiveTracker.clientError?.code).toBe(Code.OTHER);
        expect(primitiveTracker.clientError?.message).toBe(
          'auth/primitive-rejection'
        );

        const emptyTracker: BuilderExecutionTracker = { clientError: null };
        const emptyFetch = transport.toFetch(emptyTracker);
        await expect(emptyFetch(TEST_URL)).rejects.toMatchObject({
          name: 'AbortError',
          message: 'Failed to retrieve Auth token.'
        });
        expect(emptyTracker.clientError?.code).toBe(Code.OTHER);
        expect(emptyTracker.clientError?.message).toBe(
          'Failed to retrieve Auth token.'
        );
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('throws original error without AbortError wrapping when no tracker is provided', async () => {
        const state: SqlClientState = { active: null };
        const transport = new FirebaseSqlTransport({ state });
        const boundFetch = transport.toFetch();

        await expect(boundFetch(TEST_URL)).rejects.toBeInstanceOf(
          FirebaseSqlError
        );
      });

      it('does not leak auth rejection state from a direct invokePostgrestOperation call into a concurrent toFetch call', async () => {
        const sharedError = new Error('transient network failure');
        const authProvider = new MockAuthProvider('token-1');
        authProvider.getToken
          .mockResolvedValueOnce({ accessToken: 'token-1' })
          .mockRejectedValueOnce(sharedError);

        let rejectNetworkFetch!: (err: unknown) => void;
        mockFetch.mockImplementationOnce(
          () =>
            new Promise<Response>((_resolve, reject) => {
              rejectNetworkFetch = reject;
            })
        );

        const transport = new FirebaseSqlTransport({
          settings: BASE_SETTINGS,
          authTokenProvider: authProvider
        });
        const tracker: BuilderExecutionTracker = { clientError: null };
        const boundFetch = transport.toFetch(tracker);

        const inFlightToFetch = boundFetch(TEST_URL);
        await new Promise(resolve => setTimeout(resolve, 0));

        await expect(transport.invokePostgrestOperation(TEST_URL)).rejects.toBe(
          sharedError
        );

        rejectNetworkFetch(sharedError);
        await expect(inFlightToFetch).rejects.toBe(sharedError);
        expect(tracker.clientError).toBeNull();
      });
    });
  });

  describe('getAuthUidFromToken', () => {
    it('returns null for null, undefined, or empty token', () => {
      expect(getAuthUidFromToken(null)).toBeNull();
      expect(getAuthUidFromToken(undefined)).toBeNull();
      expect(getAuthUidFromToken('')).toBeNull();
    });

    it('returns null for tokens that do not have 3 parts', () => {
      expect(getAuthUidFromToken('singlepart')).toBeNull();
      expect(getAuthUidFromToken('part1.part2')).toBeNull();
      expect(getAuthUidFromToken('part1.part2.part3.part4')).toBeNull();
    });

    it('returns null for malformed base64 or invalid JSON payload', () => {
      expect(getAuthUidFromToken('invalid.payload.sig')).toBeNull();
      expect(getAuthUidFromToken(`header.${btoa('not json')}.sig`)).toBeNull();
    });

    it('returns null when sub claim is missing, empty, or not a string', () => {
      const noSubToken = `h.${btoa(JSON.stringify({ aud: 'test' }))}.s`;
      expect(getAuthUidFromToken(noSubToken)).toBeNull();

      const emptySubToken = `h.${btoa(JSON.stringify({ sub: '' }))}.s`;
      expect(getAuthUidFromToken(emptySubToken)).toBeNull();

      const numericSubToken = `h.${btoa(JSON.stringify({ sub: 12345 }))}.s`;
      expect(getAuthUidFromToken(numericSubToken)).toBeNull();
    });

    it('extracts uid from a valid JWT with sub claim', () => {
      const jwt = createMockJwt('uid-12345');
      expect(getAuthUidFromToken(jwt)).toBe('uid-12345');
    });
  });

  describe('toAbortError', () => {
    it('preserves a FirebaseSqlError attached as abort reason', () => {
      const controller = new AbortController();
      const sqlError = new FirebaseSqlError(
        Code.NOT_INITIALIZED,
        'The Firebase SQL client has been terminated.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
      controller.abort(sqlError);

      const result = toAbortError(controller.signal);
      expect(result).toBe(sqlError);
    });

    it('preserves existing AbortError and TimeoutError', () => {
      const controller = new AbortController();
      const abortError = new Error('aborted');
      abortError.name = 'AbortError';
      controller.abort(abortError);
      expect(toAbortError(controller.signal)).toBe(abortError);

      const timeoutController = new AbortController();
      const timeoutError = new Error('timed out');
      timeoutError.name = 'TimeoutError';
      timeoutController.abort(timeoutError);
      expect(toAbortError(timeoutController.signal)).toBe(timeoutError);
    });

    it('creates an AbortError with the string reason message', () => {
      const controller = new AbortController();
      controller.abort('custom reason');
      const err = toAbortError(controller.signal);
      expect(err.name).toBe('AbortError');
      expect(err.message).toBe('custom reason');
    });
  });

  describe('composeSignals', () => {
    it('returns signal2 when signal1 is undefined', () => {
      const controller = new AbortController();
      const { signal, cleanup } = composeSignals(undefined, controller.signal);
      expect(signal).toBe(controller.signal);
      cleanup();
    });

    it('returns signal1 when signal2 is undefined', () => {
      const controller = new AbortController();
      const { signal, cleanup } = composeSignals(controller.signal, undefined);
      expect(signal).toBe(controller.signal);
      cleanup();
    });

    it('returns undefined when both signals are undefined', () => {
      const { signal, cleanup } = composeSignals(undefined, undefined);
      expect(signal).toBeUndefined();
      cleanup();
    });

    it('returns signal1 immediately if signal1 is already aborted', () => {
      const c1 = new AbortController();
      c1.abort('reason1');
      const c2 = new AbortController();
      const { signal, cleanup } = composeSignals(c1.signal, c2.signal);
      expect(signal).toBe(c1.signal);
      expect(signal?.aborted).toBe(true);
      expect(signal?.reason).toBe('reason1');
      cleanup();
    });

    it('returns signal2 immediately if signal2 is already aborted', () => {
      const c1 = new AbortController();
      const c2 = new AbortController();
      c2.abort('reason2');
      const { signal, cleanup } = composeSignals(c1.signal, c2.signal);
      expect(signal).toBe(c2.signal);
      expect(signal?.aborted).toBe(true);
      expect(signal?.reason).toBe('reason2');
      cleanup();
    });

    it('aborts composed signal when signal1 aborts', () => {
      const c1 = new AbortController();
      const c2 = new AbortController();
      const { signal, cleanup } = composeSignals(c1.signal, c2.signal);
      expect(signal?.aborted).toBe(false);

      c1.abort('abort-from-1');
      expect(signal?.aborted).toBe(true);
      expect(signal?.reason).toBe('abort-from-1');
      cleanup();
    });

    it('aborts composed signal when signal2 aborts', () => {
      const c1 = new AbortController();
      const c2 = new AbortController();
      const { signal, cleanup } = composeSignals(c1.signal, c2.signal);
      expect(signal?.aborted).toBe(false);

      c2.abort('abort-from-2');
      expect(signal?.aborted).toBe(true);
      expect(signal?.reason).toBe('abort-from-2');
      cleanup();
    });

    it('cleanup unregisters event listeners when fallback AbortController is used', () => {
      const c1 = new AbortController();
      const c2 = new AbortController();
      const abortSignalWithAny = AbortSignal as unknown as Record<
        string,
        unknown
      >;
      const originalAny = abortSignalWithAny['any'];
      try {
        abortSignalWithAny['any'] = undefined;
        const { signal, cleanup } = composeSignals(c1.signal, c2.signal);
        cleanup();
        c1.abort();
        expect(signal?.aborted).toBe(false);
      } finally {
        abortSignalWithAny['any'] = originalAny;
      }
    });
  });

  describe('createBuilderFetch', () => {
    it('returns a functional fetch function that executes requests with state resources', async () => {
      const authProvider = new MockAuthProvider('builder-auth-token');
      const appCheckProvider = new MockAppCheckProvider(
        'builder-appcheck-token'
      );

      const state: SqlClientState = {
        active: {
          appId: '1:123456:web:builder-app',
          authTokenProvider:
            authProvider as unknown as FirebaseAuthTokenProvider,
          appCheckTokenProvider: appCheckProvider
        }
      };
      const tracker: BuilderExecutionTracker = { clientError: null };

      const builderFetch = createBuilderFetch(state, tracker);
      const response = await builderFetch(TEST_URL, {
        headers: { 'x-caller-header': 'val' }
      });

      expect(response.status).toBe(200);
      expect(tracker.clientError).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callInit = mockFetch.mock.calls[0]?.[1] as RequestInit;
      const headers = callInit.headers as Record<string, string>;
      expect(headers['x-caller-header']).toBe('val');
      expect(headers['x-firebase-auth-token']).toBe('builder-auth-token');
      expect(headers['x-firebase-appcheck']).toBe('builder-appcheck-token');
      expect(headers['x-firebase-gmpid']).toBe('1:123456:web:builder-app');
    });

    it('populates tracker.clientError and throws AbortError if client is terminated', async () => {
      const state: SqlClientState = { active: null };
      const tracker: BuilderExecutionTracker = { clientError: null };

      const builderFetch = createBuilderFetch(state, tracker);
      await expect(builderFetch(TEST_URL)).rejects.toMatchObject({
        name: 'AbortError',
        message: expect.stringContaining('terminated')
      });

      expect(tracker.clientError?.code).toBe(Code.NOT_INITIALIZED);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
