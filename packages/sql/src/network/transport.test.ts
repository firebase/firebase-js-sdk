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
import { SqlServiceSettings } from '../core/settings';
import { TokenOptions } from '../core/tokenProviders/AbstractTokenProvider';
import { FirebaseAuthProvider } from '../core/tokenProviders/FirebaseAuthTokenProvider';
import { SDK_VERSION, setSDKVersion } from '../core/version';

import { Fetch, getFetch, initializeFetch } from './fetch';
import { FirebaseHeaders, getGoogApiClientValue } from './headers';
import { FirebaseSqlTransport } from './transport';

const TEST_URL =
  'https://firebasedataconnect.googleapis.com/v1/projects/p/locations/l/services/s/postgrest/todos';
const BASE_SETTINGS: SqlServiceSettings = { serviceId: 's', location: 'l' };

type FirebaseSqlTransportWithInternalProperties = FirebaseSqlTransport & {
  _isUsingEmulator: boolean;
};

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
  const originalFetch = getFetch();
  const originalVersion = SDK_VERSION;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setSDKVersion('1.2.3');
    mockFetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
    );
    initializeFetch(mockFetch as Fetch);
  });

  afterEach(async () => {
    initializeFetch(originalFetch);
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
            : Promise.resolve({ accessToken: 'initial-concurrent-token' })
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
      const authProvider = new MockAuthProvider('stale-token', 'fresh-token');
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
        forceRefresh: true
      });
      expect(
        getHeadersFromCall(mockFetch, 0).get(
          FirebaseHeaders.FIREBASE_AUTH_TOKEN
        )
      ).toBe('stale-token');
      expect(
        getHeadersFromCall(mockFetch, 1).get(
          FirebaseHeaders.FIREBASE_AUTH_TOKEN
        )
      ).toBe('fresh-token');

      const failedRetryResponse =
        await transport.invokePostgrestOperation(TEST_URL);
      expect(failedRetryResponse).toBe(retryTwoResponse);
      expect(mockFetch).toHaveBeenCalledTimes(4);
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
      resolveFirstRefresh({ accessToken: 'shared-refreshed-token' });

      const [r1, r2, r3] = await batch;
      expect([r1, r2, r3]).toEqual([retryRes1, retryRes2, retryRes3]);
      expect(mockFetch).toHaveBeenCalledTimes(6);
      expect(
        getHeadersFromCall(mockFetch, 3).get(
          FirebaseHeaders.FIREBASE_AUTH_TOKEN
        )
      ).toBe('shared-refreshed-token');
      expect(
        getHeadersFromCall(mockFetch, 4).get(
          FirebaseHeaders.FIREBASE_AUTH_TOKEN
        )
      ).toBe('shared-refreshed-token');
      expect(
        getHeadersFromCall(mockFetch, 5).get(
          FirebaseHeaders.FIREBASE_AUTH_TOKEN
        )
      ).toBe('shared-refreshed-token');
    });

    it('triggers a fresh getToken(true) refresh on a subsequent 401 after a concurrent batch settles', async () => {
      const mockForceRefresh = vi
        .fn<() => Promise<FirebaseAuthTokenData | null>>()
        .mockResolvedValueOnce({ accessToken: 'shared-refreshed-token' })
        .mockResolvedValueOnce({ accessToken: 'refreshed-token-2' });
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
      ).toBe('refreshed-token-2');
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

      const sameTokenProvider = new MockAuthProvider(
        'same-token',
        'same-token'
      );
      const res = await new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: sameTokenProvider
      }).invokePostgrestOperation(TEST_URL);

      expect(res).toBe(unauthorizedRes);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(sameTokenProvider.getToken).toHaveBeenCalledTimes(2);
      expect(sameTokenProvider.getToken).toHaveBeenNthCalledWith(1, {
        forceRefresh: false
      });
      expect(sameTokenProvider.getToken).toHaveBeenNthCalledWith(2, {
        forceRefresh: true
      });
    });

    it('returns the original 401 response if getToken({ forceRefresh: true }) rejects', async () => {
      const authProvider = new MockAuthProvider('initial-token');
      authProvider.getToken.mockImplementation(
        async (options?: TokenOptions) =>
          options?.forceRefresh
            ? Promise.reject(new Error('auth-refresh-network-error'))
            : { accessToken: 'initial-token' }
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
      const authProvider = new MockAuthProvider('initial-token', null);
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
  });
});
