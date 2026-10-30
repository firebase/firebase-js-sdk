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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MockAppCheckProvider, MockAuthProvider } from '../../test/mocks';
import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import type { PostgrestRequestInfo } from '../core/OperationManager';
import { SqlServiceSettings } from '../core/settings';
import { TokenOptions } from '../core/tokenProviders/AbstractTokenProvider';
import { FirebaseAuthProvider } from '../core/tokenProviders/FirebaseAuthTokenProvider';
import { SDK_VERSION, setSDKVersion } from '../core/version';
import { FirebaseHeaders } from '../util/constants';

import { Fetch, getFetch, initializeFetch } from './fetch';
import {
  FirebaseSqlTransport,
  getGoogApiClientValue,
  resolveRequestHeaders
} from './transport';

const TEST_URL =
  'https://firebasedataconnect.googleapis.com/v1/projects/p/locations/l/services/s/postgrest/todos';
const BASE_SETTINGS: SqlServiceSettings = { serviceId: 's', location: 'l' };

const GET_REQ: PostgrestRequestInfo = {
  url: TEST_URL,
  method: 'GET'
};

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
      Promise.resolve(
        new Response(JSON.stringify([]), {
          status: 200,
          statusText: 'OK'
        })
      )
    );
    initializeFetch(mockFetch as Fetch);
  });

  afterEach(async () => {
    vi.useRealTimers();
    initializeFetch(originalFetch);
    setSDKVersion(originalVersion);
    vi.restoreAllMocks();
    await Promise.all(getApps().map(app => deleteApp(app)));
  });

  describe('TR-1 & TR-2: Token Resolution, Wire Request Assembly & Body Serialization', () => {
    it('TR-1: concurrently resolves auth and App Check tokens; propagates Auth getToken rejection without calling fetch; tolerates App Check getToken rejection as null', async () => {
      const authError = new Error('auth failure');
      const rejectingAuth = new MockAuthProvider();
      rejectingAuth.getToken.mockRejectedValue(authError);
      const transportWithRejectingAuth = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: rejectingAuth
      });

      await expect(
        transportWithRejectingAuth.invokePostgrestOperation(GET_REQ)
      ).rejects.toBe(authError);
      expect(mockFetch).not.toHaveBeenCalled();

      const authProvider = new MockAuthProvider('my-auth-token');
      const rejectingAppCheck = new MockAppCheckProvider('');
      rejectingAppCheck.getToken.mockRejectedValue(
        new Error('appcheck failure')
      );

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 1 }]), {
          status: 200,
          statusText: 'OK'
        })
      );
      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: authProvider,
        appCheckTokenProvider: rejectingAppCheck
      });

      const result = await transport.invokePostgrestOperation(GET_REQ);
      expect(result).toEqual({
        success: true,
        error: null,
        data: [{ id: 1 }],
        count: null,
        status: 200,
        statusText: 'OK'
      });
      const headers = getHeadersFromCall(mockFetch);
      expect(headers.get(FirebaseHeaders.FIREBASE_AUTH_TOKEN)).toBe(
        'my-auth-token'
      );
      expect(headers.has(FirebaseHeaders.FIREBASE_APPCHECK)).toBe(false);
    });

    it('TR-2: serializes requestInfo.body on POST/PATCH/DELETE (including bigint replacer and pre-serialized strings), omits body on GET/HEAD, forwards options.signal, and sets credentials: include on Cloud Workstation emulator URLs', async () => {
      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        appId: '1:123456:web:abcdef',
        authTokenProvider: new MockAuthProvider('my-auth-token'),
        appCheckTokenProvider: new MockAppCheckProvider('my-appcheck-token')
      });

      const controller = new AbortController();
      await transport.invokePostgrestOperation(
        {
          url: TEST_URL,
          method: 'POST',
          headers: { 'x-custom-header': 'custom-val' },
          body: { id: BigInt('9007199254740993'), name: 'Row' }
        },
        { signal: controller.signal }
      );

      const postInit = mockFetch.mock.calls[0]?.[1] as RequestInit;
      expect(postInit.method).toBe('POST');
      expect(postInit.body).toBe('{"id":"9007199254740993","name":"Row"}');
      expect(postInit.signal).toBe(controller.signal);
      const postHeaders = getHeadersFromCall(mockFetch, 0);
      expect(postHeaders.get('content-type')).toBe('application/json');
      expect(postHeaders.get('x-custom-header')).toBe('custom-val');
      expect(postHeaders.get(FirebaseHeaders.FIREBASE_AUTH_TOKEN)).toBe(
        'my-auth-token'
      );
      expect(postHeaders.get(FirebaseHeaders.FIREBASE_APPCHECK)).toBe(
        'my-appcheck-token'
      );
      expect(postHeaders.get(FirebaseHeaders.GOOG_API_CLIENT)).toBe(
        getGoogApiClientValue()
      );
      expect(postHeaders.get(FirebaseHeaders.FIREBASE_GMPID)).toBe(
        '1:123456:web:abcdef'
      );

      // Pre-serialized string body on PATCH
      await transport.invokePostgrestOperation({
        url: TEST_URL,
        method: 'PATCH',
        body: '{"raw":true}'
      });
      const patchInit = mockFetch.mock.calls[1]?.[1] as RequestInit;
      expect(patchInit.method).toBe('PATCH');
      expect(patchInit.body).toBe('{"raw":true}');
      expect(getHeadersFromCall(mockFetch, 1).get('content-type')).toBe(
        'application/json'
      );

      // GET and HEAD omit body and content-type even if body is provided
      await transport.invokePostgrestOperation({
        url: TEST_URL,
        method: 'GET',
        body: { ignored: true }
      });
      const getInit = mockFetch.mock.calls[2]?.[1] as RequestInit;
      expect(getInit.body).toBeUndefined();
      expect(getHeadersFromCall(mockFetch, 2).has('content-type')).toBe(false);

      await transport.invokePostgrestOperation({
        url: TEST_URL,
        method: 'HEAD',
        body: { ignored: true }
      });
      const headInit = mockFetch.mock.calls[3]?.[1] as RequestInit;
      expect(headInit.body).toBeUndefined();
      expect(getHeadersFromCall(mockFetch, 3).has('content-type')).toBe(false);

      // Cloud Workstation credentials: 'include' when _isUsingEmulator is true
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

      await workstationTransport.invokePostgrestOperation({
        url: workstationUrl,
        method: 'GET'
      });
      expect(
        (mockFetch.mock.calls[4]?.[1] as RequestInit | undefined)?.credentials
      ).toBe('include');

      await transport.invokePostgrestOperation({
        url: workstationUrl,
        method: 'GET'
      });
      expect(
        (mockFetch.mock.calls[5]?.[1] as RequestInit | undefined)?.credentials
      ).toBeUndefined();
    });
  });

  describe('TR-3, TR-4, TR-6: Idempotent Exponential Backoff Retry Loop', () => {
    it('TR-3, TR-6: retries GET and HEAD on HTTP 520 and 503 up to DEFAULT_MAX_RETRIES = 3 with 1s, 2s, 4s exponential backoff, X-Retry-Count header, and drains response body before each retry', async () => {
      vi.useFakeTimers();
      const transport = new FirebaseSqlTransport({ settings: BASE_SETTINGS });

      const drainSpies: Array<ReturnType<typeof vi.spyOn>> = [];
      const makeRetryableResponse = (
        status: number,
        statusText: string,
        bodyText: string
      ): Response => {
        const res = new Response(bodyText, { status, statusText });
        drainSpies.push(vi.spyOn(res, 'text'));
        return res;
      };

      mockFetch
        .mockResolvedValueOnce(
          makeRetryableResponse(503, 'Service Unavailable', 'err-1')
        )
        .mockResolvedValueOnce(
          makeRetryableResponse(520, 'Web Server Unknown Error', 'err-2')
        )
        .mockResolvedValueOnce(
          makeRetryableResponse(503, 'Service Unavailable', 'err-3')
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ id: 42 }]), {
            status: 200,
            statusText: 'OK'
          })
        );

      const promise = transport.invokePostgrestOperation(GET_REQ);

      await vi.advanceTimersByTimeAsync(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(getHeadersFromCall(mockFetch, 0).get('X-Retry-Count')).toBeNull();
      expect(drainSpies[0]).toHaveBeenCalledTimes(1);

      // Advance 1000ms for retry 1
      await vi.advanceTimersByTimeAsync(999);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(getHeadersFromCall(mockFetch, 1).get('X-Retry-Count')).toBe('1');
      expect(drainSpies[1]).toHaveBeenCalledTimes(1);

      // Advance 2000ms for retry 2
      await vi.advanceTimersByTimeAsync(1999);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(1);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(getHeadersFromCall(mockFetch, 2).get('X-Retry-Count')).toBe('2');
      expect(drainSpies[2]).toHaveBeenCalledTimes(1);

      // Advance 4000ms for retry 3
      await vi.advanceTimersByTimeAsync(3999);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      await vi.advanceTimersByTimeAsync(1);
      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(getHeadersFromCall(mockFetch, 3).get('X-Retry-Count')).toBe('3');

      const result = await promise;
      expect(result).toEqual({
        success: true,
        error: null,
        data: [{ id: 42 }],
        count: null,
        status: 200,
        statusText: 'OK'
      });

      // Also verify HEAD exhausting all 3 retries (4 total attempts) and returning final 503 OperationFailure
      mockFetch.mockClear();
      mockFetch
        .mockResolvedValueOnce(
          new Response('', { status: 503, statusText: 'Service Unavailable' })
        )
        .mockResolvedValueOnce(
          new Response('', { status: 520, statusText: 'Unknown Error' })
        )
        .mockResolvedValueOnce(
          new Response('', { status: 503, statusText: 'Service Unavailable' })
        )
        .mockResolvedValueOnce(
          new Response('', { status: 503, statusText: 'Service Unavailable' })
        );

      const headPromise = transport.invokePostgrestOperation({
        url: TEST_URL,
        method: 'HEAD'
      });
      await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000);
      const headResult = await headPromise;
      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(headResult.success).toBe(false);
      expect(headResult.status).toBe(503);
    });

    it('TR-6: honors integer Retry-After response header on 503/520 and falls back to exponential backoff when Retry-After is absent or non-numeric', async () => {
      vi.useFakeTimers();
      const transport = new FirebaseSqlTransport({ settings: BASE_SETTINGS });

      mockFetch
        .mockResolvedValueOnce(
          new Response('Service Unavailable', {
            status: 503,
            headers: { 'Retry-After': '5' }
          })
        )
        .mockResolvedValueOnce(
          new Response('Unknown Error', {
            status: 520,
            headers: { 'Retry-After': 'invalid-date' }
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ ok: true }]), { status: 200 })
        );

      const promise = transport.invokePostgrestOperation(GET_REQ);
      await vi.advanceTimersByTimeAsync(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Retry-After: 5 -> 5000ms delay
      await vi.advanceTimersByTimeAsync(4999);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Non-numeric Retry-After on attemptCount=1 -> falls back to getRetryDelay(1) = 2000ms
      await vi.advanceTimersByTimeAsync(1999);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(1);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ ok: true }]);
    });

    it('TR-3, TR-4, TR-6: does NOT retry non-idempotent methods (POST, PATCH, DELETE) on 503, 520, or network errors, and does NOT retry when options.retry === false', async () => {
      const transport = new FirebaseSqlTransport({ settings: BASE_SETTINGS });

      for (const method of ['POST', 'PATCH', 'DELETE'] as const) {
        mockFetch.mockClear();
        mockFetch.mockResolvedValueOnce(
          new Response('Unavailable', {
            status: 503,
            statusText: 'Service Unavailable'
          })
        );
        const statusResult = await transport.invokePostgrestOperation({
          url: TEST_URL,
          method,
          body: { a: 1 }
        });
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(statusResult.success).toBe(false);
        expect(statusResult.status).toBe(503);

        mockFetch.mockClear();
        const netErr = new TypeError('Failed to fetch');
        mockFetch.mockRejectedValueOnce(netErr);
        await expect(
          transport.invokePostgrestOperation({
            url: TEST_URL,
            method,
            body: { a: 1 }
          })
        ).rejects.toBe(netErr);
        expect(mockFetch).toHaveBeenCalledTimes(1);
      }

      // options.retry === false on GET
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce(
        new Response('Unavailable', {
          status: 503,
          statusText: 'Service Unavailable'
        })
      );
      const noRetryStatus = await transport.invokePostgrestOperation(GET_REQ, {
        retry: false
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(noRetryStatus.success).toBe(false);
      expect(noRetryStatus.status).toBe(503);

      mockFetch.mockClear();
      const netErr = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValueOnce(netErr);
      await expect(
        transport.invokePostgrestOperation(GET_REQ, { retry: false })
      ).rejects.toBe(netErr);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('TR-4: retries transient network errors (TypeError: Failed to fetch) on GET/HEAD up to 3 times with backoff, then re-throws the last network error when exhausted', async () => {
      vi.useFakeTimers();
      const transport = new FirebaseSqlTransport({ settings: BASE_SETTINGS });

      const err1 = new TypeError('Failed to fetch 1');
      const err2 = new TypeError('Failed to fetch 2');
      const err3 = new TypeError('Failed to fetch 3');
      const err4 = new TypeError('Failed to fetch 4');
      mockFetch
        .mockRejectedValueOnce(err1)
        .mockRejectedValueOnce(err2)
        .mockRejectedValueOnce(err3)
        .mockRejectedValueOnce(err4);

      const promise = transport.invokePostgrestOperation(GET_REQ);
      const expectation = expect(promise).rejects.toBe(err4);

      await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000);
      await expectation;
      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(getHeadersFromCall(mockFetch, 0).get('X-Retry-Count')).toBeNull();
      expect(getHeadersFromCall(mockFetch, 1).get('X-Retry-Count')).toBe('1');
      expect(getHeadersFromCall(mockFetch, 2).get('X-Retry-Count')).toBe('2');
      expect(getHeadersFromCall(mockFetch, 3).get('X-Retry-Count')).toBe('3');
    });

    it('TR-4: never retries AbortError, code: ABORT_ERR, or TimeoutError when signal.aborted === true, and wakes sleep early when signal aborts mid-backoff', async () => {
      vi.useFakeTimers();
      const transport = new FirebaseSqlTransport({ settings: BASE_SETTINGS });

      // 1. AbortError
      const abortErr = new DOMException('Aborted', 'AbortError');
      mockFetch.mockRejectedValueOnce(abortErr);
      await expect(transport.invokePostgrestOperation(GET_REQ)).rejects.toBe(
        abortErr
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 2. code: 'ABORT_ERR'
      mockFetch.mockClear();
      const codeAbortErr = Object.assign(new Error('Aborted by code'), {
        code: 'ABORT_ERR'
      });
      mockFetch.mockRejectedValueOnce(codeAbortErr);
      await expect(transport.invokePostgrestOperation(GET_REQ)).rejects.toBe(
        codeAbortErr
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 3. TimeoutError with signal.aborted === true
      mockFetch.mockClear();
      const abortedController = new AbortController();
      abortedController.abort();
      const timeoutAbortErr = new DOMException('Timed out', 'TimeoutError');
      mockFetch.mockRejectedValueOnce(timeoutAbortErr);
      await expect(
        transport.invokePostgrestOperation(GET_REQ, {
          signal: abortedController.signal
        })
      ).rejects.toBe(timeoutAbortErr);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 4. Signal aborts mid-backoff sleep after 503
      mockFetch.mockClear();
      const midSleepController = new AbortController();
      const midSleepAbortErr = new DOMException(
        'Aborted mid-sleep',
        'AbortError'
      );
      mockFetch
        .mockResolvedValueOnce(
          new Response('Unavailable', {
            status: 503,
            headers: { 'Retry-After': '30' }
          })
        )
        .mockImplementationOnce((_url: string, init?: RequestInit) => {
          if (init?.signal?.aborted) {
            return Promise.reject(midSleepAbortErr);
          }
          return Promise.resolve(new Response('[]', { status: 200 }));
        });

      const midSleepPromise = transport.invokePostgrestOperation(GET_REQ, {
        signal: midSleepController.signal
      });
      await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      // Abort the controller without advancing timers by 30s
      midSleepController.abort();
      await expect(midSleepPromise).rejects.toBe(midSleepAbortErr);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('TR-4: retries TimeoutError when signal?.aborted is false or undefined on GET/HEAD', async () => {
      vi.useFakeTimers();
      const transport = new FirebaseSqlTransport({ settings: BASE_SETTINGS });
      const activeController = new AbortController();
      const transientTimeoutErr = new DOMException(
        'Socket timeout',
        'TimeoutError'
      );

      mockFetch
        .mockRejectedValueOnce(transientTimeoutErr)
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ id: 7 }]), {
            status: 200,
            statusText: 'OK'
          })
        );

      const promise = transport.invokePostgrestOperation(GET_REQ, {
        signal: activeController.signal
      });
      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 7 }]);
    });
  });

  describe('TR-5: Deduplicated single-shot HTTP 401 force-refresh retry', () => {
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

    it('retries once with getToken({ forceRefresh: true }) on 401 when an auth token was attached, cancels original response body stream, and does not loop on persistent 401', async () => {
      const authProvider = new MockAuthProvider('stale-token', 'fresh-token');
      const cancelSpy = vi.fn(() => Promise.resolve());
      const requestOneResponse = new Response('Unauthorized', { status: 401 });
      if (requestOneResponse.body) {
        vi.spyOn(requestOneResponse.body, 'cancel').mockImplementation(
          cancelSpy
        );
      }
      const retryOneResponse = new Response(JSON.stringify([{ id: 1 }]), {
        status: 200,
        statusText: 'OK'
      });
      const requestTwoResponse = new Response(
        JSON.stringify({
          error: {
            code: 401,
            message: 'Unauthorized 1',
            status: 'UNAUTHENTICATED'
          }
        }),
        { status: 401, statusText: 'Unauthorized' }
      );
      const retryTwoResponse = new Response(
        JSON.stringify({
          error: {
            code: 401,
            message: 'Unauthorized 2',
            status: 'UNAUTHENTICATED'
          }
        }),
        { status: 401, statusText: 'Unauthorized' }
      );

      mockFetch
        .mockResolvedValueOnce(requestOneResponse)
        .mockResolvedValueOnce(retryOneResponse)
        .mockResolvedValueOnce(requestTwoResponse)
        .mockResolvedValueOnce(retryTwoResponse);

      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: authProvider
      });

      const successfulRetryResult =
        await transport.invokePostgrestOperation(GET_REQ);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(cancelSpy).toHaveBeenCalledTimes(1);
      expect(successfulRetryResult).toEqual({
        success: true,
        error: null,
        data: [{ id: 1 }],
        count: null,
        status: 200,
        statusText: 'OK'
      });
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
      expect(getHeadersFromCall(mockFetch, 1).get('X-Retry-Count')).toBeNull();

      const failedRetryResult =
        await transport.invokePostgrestOperation(GET_REQ);
      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(failedRetryResult.success).toBe(false);
      expect(failedRetryResult.status).toBe(401);
      expect(failedRetryResult.error?.message).toBe('Unauthorized 2');
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

      mockFetch
        .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
        .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
        .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ id: 1 }]), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ id: 2 }]), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ id: 3 }]), { status: 200 })
        );

      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: realAuthProvider
      });
      const batch = Promise.all([
        transport.invokePostgrestOperation({
          url: `${TEST_URL}?id=1`,
          method: 'GET'
        }),
        transport.invokePostgrestOperation({
          url: `${TEST_URL}?id=2`,
          method: 'GET'
        }),
        transport.invokePostgrestOperation({
          url: `${TEST_URL}?id=3`,
          method: 'GET'
        })
      ]);

      await vi.waitFor(() => {
        expect(mockForceRefresh).toHaveBeenCalledTimes(1);
      });
      resolveFirstRefresh({ accessToken: 'shared-refreshed-token' });

      const [r1, r2, r3] = await batch;
      expect(r1.data).toEqual([{ id: 1 }]);
      expect(r2.data).toEqual([{ id: 2 }]);
      expect(r3.data).toEqual([{ id: 3 }]);
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

    it('does not retry on 401 when authTokenProvider is omitted, returns null, returns same token, or rejects on forceRefresh', async () => {
      // 1. Omitted authTokenProvider
      mockFetch.mockResolvedValueOnce(
        new Response('Unauthorized', {
          status: 401,
          statusText: 'Unauthorized'
        })
      );
      const resOmitted = await new FirebaseSqlTransport({
        settings: BASE_SETTINGS
      }).invokePostgrestOperation(GET_REQ);
      expect(resOmitted.success).toBe(false);
      expect(resOmitted.status).toBe(401);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 2. Unauthenticated (initial token null)
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 })
      );
      const nullTokenProvider = new MockAuthProvider(null, 'should-not-use');
      const resNullInitial = await new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: nullTokenProvider
      }).invokePostgrestOperation(GET_REQ);
      expect(resNullInitial.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(nullTokenProvider.getToken).toHaveBeenCalledExactlyOnceWith({
        forceRefresh: false
      });

      // 3. Same token returned by forceRefresh
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 })
      );
      const sameTokenProvider = new MockAuthProvider(
        'same-token',
        'same-token'
      );
      const resSame = await new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: sameTokenProvider
      }).invokePostgrestOperation(GET_REQ);
      expect(resSame.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(sameTokenProvider.getToken).toHaveBeenCalledTimes(2);

      // 4. forceRefresh rejects
      mockFetch.mockClear();
      const rejectingRefreshProvider = new MockAuthProvider('initial-token');
      rejectingRefreshProvider.getToken.mockImplementation(
        async (options?: TokenOptions) =>
          options?.forceRefresh
            ? Promise.reject(new Error('auth-refresh-network-error'))
            : { accessToken: 'initial-token' }
      );
      mockFetch.mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 })
      );
      const resReject = await new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: rejectingRefreshProvider
      }).invokePostgrestOperation(GET_REQ);
      expect(resReject.success).toBe(false);
      expect(resReject.status).toBe(401);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 5. forceRefresh resolves null
      mockFetch.mockClear();
      const nullRefreshProvider = new MockAuthProvider('initial-token', null);
      mockFetch.mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 })
      );
      const resNullRefresh = await new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: nullRefreshProvider
      }).invokePostgrestOperation(GET_REQ);
      expect(resNullRefresh.success).toBe(false);
      expect(resNullRefresh.status).toBe(401);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 6. Initial authToken object has empty accessToken string ('')
      mockFetch.mockClear();
      const emptyInitialAuthProvider = new MockAuthProvider('', 'fresh-token');
      emptyInitialAuthProvider.getToken.mockImplementation(
        async (options?: TokenOptions) =>
          options?.forceRefresh
            ? { accessToken: 'fresh-token' }
            : { accessToken: '' }
      );
      mockFetch.mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 })
      );
      const resEmptyInitial = await new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: emptyInitialAuthProvider
      }).invokePostgrestOperation(GET_REQ);
      expect(resEmptyInitial.success).toBe(false);
      expect(resEmptyInitial.status).toBe(401);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(emptyInitialAuthProvider.getToken).toHaveBeenCalledExactlyOnceWith(
        {
          forceRefresh: false
        }
      );
    });

    it('TR-5 + TR-6: combines 503 backoff retry with single-shot 401 Auth token refresh while preserving X-Retry-Count', async () => {
      vi.useFakeTimers();
      const authProvider = new MockAuthProvider('stale-jwt', 'fresh-jwt');
      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS,
        authTokenProvider: authProvider
      });

      mockFetch
        .mockResolvedValueOnce(
          new Response('Service Unavailable', {
            status: 503,
            statusText: 'Service Unavailable'
          })
        )
        .mockResolvedValueOnce(
          new Response('Unauthorized', {
            status: 401,
            statusText: 'Unauthorized'
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ id: 1 }]), {
            status: 200,
            statusText: 'OK'
          })
        );

      const promise = transport.invokePostgrestOperation(GET_REQ);
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(3);
      // Attempt 0 (initial): stale-jwt, no X-Retry-Count
      expect(
        getHeadersFromCall(mockFetch, 0).get(
          FirebaseHeaders.FIREBASE_AUTH_TOKEN
        )
      ).toBe('stale-jwt');
      expect(getHeadersFromCall(mockFetch, 0).get('X-Retry-Count')).toBeNull();

      // Attempt 1 (after 503 retry): stale-jwt, X-Retry-Count: '1'
      expect(
        getHeadersFromCall(mockFetch, 1).get(
          FirebaseHeaders.FIREBASE_AUTH_TOKEN
        )
      ).toBe('stale-jwt');
      expect(getHeadersFromCall(mockFetch, 1).get('X-Retry-Count')).toBe('1');

      // Attempt 2 (after 401 refresh): fresh-jwt, X-Retry-Count still '1'
      expect(
        getHeadersFromCall(mockFetch, 2).get(
          FirebaseHeaders.FIREBASE_AUTH_TOKEN
        )
      ).toBe('fresh-jwt');
      expect(getHeadersFromCall(mockFetch, 2).get('X-Retry-Count')).toBe('1');

      expect(result).toEqual({
        success: true,
        error: null,
        data: [{ id: 1 }],
        count: null,
        status: 200,
        statusText: 'OK'
      });
    });
  });

  describe('PR-1..PR-8: processResponse() Response & Error Normalization', () => {
    it('PR-1: handles 2xx HEAD requests and 2xx empty body (e.g. 204 No Content) without calling JSON.parse', async () => {
      const transport = new FirebaseSqlTransport({ settings: BASE_SETTINGS });

      const headResponse = new Response('not-json-body', {
        status: 200,
        statusText: 'OK'
      });
      const textSpy = vi.spyOn(headResponse, 'text');
      mockFetch.mockResolvedValueOnce(headResponse);

      const headResult = await transport.invokePostgrestOperation({
        url: TEST_URL,
        method: 'HEAD'
      });
      expect(textSpy).not.toHaveBeenCalled();
      expect(headResult).toEqual({
        success: true,
        error: null,
        data: null,
        count: null,
        status: 200,
        statusText: 'OK'
      });

      mockFetch.mockResolvedValueOnce(
        new Response(null, { status: 204, statusText: 'No Content' })
      );
      const emptyResult = await transport.invokePostgrestOperation({
        url: TEST_URL,
        method: 'POST',
        body: { title: 'Test' }
      });
      expect(emptyResult).toEqual({
        success: true,
        error: null,
        data: null,
        count: null,
        status: 204,
        statusText: 'No Content'
      });
    });

    it('PR-2: returns raw text on 2xx with accept: text/csv or application/vnd.pgrst.plan+text, and returns OperationFailure(Code.OTHER, SQL_POSTGREST) on 2xx invalid JSON', async () => {
      const transport = new FirebaseSqlTransport({ settings: BASE_SETTINGS });

      // 1. text/csv
      const csvBody = 'id,title\n1,Inception\n';
      mockFetch.mockResolvedValueOnce(
        new Response(csvBody, { status: 200, statusText: 'OK' })
      );
      const csvResult = await transport.invokePostgrestOperation<string>({
        url: TEST_URL,
        method: 'GET',
        headers: { accept: 'text/csv' }
      });
      expect(csvResult).toEqual({
        success: true,
        error: null,
        data: csvBody,
        count: null,
        status: 200,
        statusText: 'OK'
      });

      // 2. application/vnd.pgrst.plan+text
      const explainBody = 'Aggregate  (cost=10.00..10.01 rows=1 width=32)';
      mockFetch.mockResolvedValueOnce(
        new Response(explainBody, { status: 200, statusText: 'OK' })
      );
      const explainResult = await transport.invokePostgrestOperation<string>({
        url: TEST_URL,
        method: 'GET',
        headers: {
          Accept: 'application/vnd.pgrst.plan+text; for="application/json"'
        }
      });
      expect(explainResult).toEqual({
        success: true,
        error: null,
        data: explainBody,
        count: null,
        status: 200,
        statusText: 'OK'
      });

      // 3. Invalid JSON on 200 OK
      const invalidJsonBody = '<html>proxy login</html>';
      mockFetch.mockResolvedValueOnce(
        new Response(invalidJsonBody, { status: 200, statusText: 'OK' })
      );
      const invalidJsonResult =
        await transport.invokePostgrestOperation(GET_REQ);
      expect(invalidJsonResult.success).toBe(false);
      expect(invalidJsonResult.data).toBeNull();
      expect(invalidJsonResult.count).toBeNull();
      expect(invalidJsonResult.status).toBe(200);
      expect(invalidJsonResult.statusText).toBe('OK');
      expect(invalidJsonResult.error).toBeInstanceOf(FirebaseSqlError);
      expect(invalidJsonResult.error?.code).toBe(Code.OTHER);
      expect(invalidJsonResult.error?.category).toBe(
        FirebaseSqlErrorCategory.SQL_POSTGREST
      );
      expect(invalidJsonResult.error?.message).toBe(invalidJsonBody);
      expect(invalidJsonResult.error?.status).toBe(200);
    });

    it('PR-3: extracts count from Content-Range when prefer matches count=(exact|planned|estimated) and leaves count: null otherwise', async () => {
      const transport = new FirebaseSqlTransport({ settings: BASE_SETTINGS });

      // 0-9/42 with count=exact -> 42
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 1 }]), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Range': '0-9/42' }
        })
      );
      const exactResult = await transport.invokePostgrestOperation({
        url: TEST_URL,
        method: 'GET',
        headers: { prefer: 'count=exact' }
      });
      expect(exactResult.count).toBe(42);

      // */0 with count=planned -> 0
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Range': '*/0' }
        })
      );
      const zeroResult = await transport.invokePostgrestOperation({
        url: TEST_URL,
        method: 'GET',
        headers: { prefer: 'return=representation,count=planned' }
      });
      expect(zeroResult.count).toBe(0);

      // 0-9/* with count=estimated -> null
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 1 }]), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Range': '0-9/*' }
        })
      );
      const unknownCountResult = await transport.invokePostgrestOperation({
        url: TEST_URL,
        method: 'GET',
        headers: { prefer: 'count=estimated' }
      });
      expect(unknownCountResult.count).toBeNull();

      // Content-Range present but prefer has no count=... -> null
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 1 }]), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Range': '0-9/42' }
        })
      );
      const noPreferCountResult =
        await transport.invokePostgrestOperation(GET_REQ);
      expect(noPreferCountResult.count).toBeNull();
    });

    it('PR-4: applies PostgREST 404 workarounds (404 with empty body -> 204 No Content; 404 with [] -> 200 OK)', async () => {
      const transport = new FirebaseSqlTransport({ settings: BASE_SETTINGS });

      // 404 with empty body '' -> 204 No Content
      mockFetch.mockResolvedValueOnce(
        new Response('', { status: 404, statusText: 'Not Found' })
      );
      const empty404 = await transport.invokePostgrestOperation({
        url: TEST_URL,
        method: 'POST',
        body: { id: 1 }
      });
      expect(empty404).toEqual({
        success: true,
        error: null,
        data: null,
        count: null,
        status: 204,
        statusText: 'No Content'
      });

      // 404 with JSON array [] -> 200 OK with data: []
      mockFetch.mockResolvedValueOnce(
        new Response('[]', { status: 404, statusText: 'Not Found' })
      );
      const array404 = await transport.invokePostgrestOperation(GET_REQ);
      expect(array404).toEqual({
        success: true,
        error: null,
        data: [],
        count: null,
        status: 200,
        statusText: 'OK'
      });
    });

    it('normalizes non-2xx PostgREST errors, platform envelopes, and plain-text fallbacks', async () => {
      const transport = new FirebaseSqlTransport({
        settings: BASE_SETTINGS
      });

      // 1. PostgREST / PostgreSQL error object ({ code, message, details, hint })
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 'PGRST205',
            details: null,
            hint: 'Verify table name',
            message:
              "Could not find the table 'public.missing' in the schema cache"
          }),
          { status: 404, statusText: 'Not Found' }
        )
      );
      const pgrst205 = await transport.invokePostgrestOperation(GET_REQ);
      expect(pgrst205.success).toBe(false);
      expect(pgrst205.error?.code).toBe('PGRST205');
      expect(pgrst205.error?.category).toBe(
        FirebaseSqlErrorCategory.SQL_POSTGREST
      );
      expect(pgrst205.error?.message).toBe(
        "Could not find the table 'public.missing' in the schema cache"
      );
      expect(pgrst205.error?.details).toBeUndefined();
      expect(pgrst205.error?.hint).toBe('Verify table name');
      expect(pgrst205.error?.status).toBe(404);

      // 2. Platform 401 / 403 error envelope -> Code.UNAUTHORIZED, SQL_PLATFORM
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 401,
              message: 'Firebase App Check token is invalid.',
              status: 'UNAUTHENTICATED'
            }
          }),
          { status: 401, statusText: 'Unauthorized' }
        )
      );
      const unauth = await transport.invokePostgrestOperation(GET_REQ);
      expect(unauth.success).toBe(false);
      expect(unauth.error?.code).toBe(Code.UNAUTHORIZED);
      expect(unauth.error?.category).toBe(
        FirebaseSqlErrorCategory.SQL_PLATFORM
      );
      expect(unauth.error?.message).toBe(
        'Firebase App Check token is invalid.'
      );
      expect(unauth.error?.status).toBe(401);

      // 3. Plain-text / empty body non-2xx fallbacks -> SQL_PLATFORM
      mockFetch.mockResolvedValueOnce(
        new Response('Something went wrong', {
          status: 500,
          statusText: 'Internal Server Error'
        })
      );
      const plain500 = await transport.invokePostgrestOperation(GET_REQ);
      expect(plain500.error?.code).toBe(Code.OTHER);
      expect(plain500.error?.category).toBe(
        FirebaseSqlErrorCategory.SQL_PLATFORM
      );
      expect(plain500.error?.message).toBe('Something went wrong');
      expect(plain500.error?.status).toBe(500);

      mockFetch.mockResolvedValueOnce(
        new Response('', { status: 502, statusText: 'Bad Gateway' })
      );
      const empty502 = await transport.invokePostgrestOperation(GET_REQ);
      expect(empty502.error?.code).toBe(Code.OTHER);
      expect(empty502.error?.category).toBe(
        FirebaseSqlErrorCategory.SQL_PLATFORM
      );
      expect(empty502.error?.message).toBe('Bad Gateway');
      expect(empty502.error?.status).toBe(502);

      mockFetch.mockResolvedValueOnce(
        new Response('Forbidden by WAF', {
          status: 403,
          statusText: 'Forbidden'
        })
      );
      const text403 = await transport.invokePostgrestOperation(GET_REQ);
      expect(text403.error?.code).toBe(Code.UNAUTHORIZED);
      expect(text403.error?.category).toBe(
        FirebaseSqlErrorCategory.SQL_PLATFORM
      );
      expect(text403.error?.message).toBe('Forbidden by WAF');
      expect(text403.error?.status).toBe(403);
    });
  });

  describe('resolveRequestHeaders() (HDR-2..HDR-6)', () => {
    it('HDR-2: copies defined entries from requestInfo.headers and ignores undefined values', () => {
      const requestInfo: PostgrestRequestInfo = {
        url: TEST_URL,
        method: 'GET',
        headers: {
          accept: 'application/vnd.pgrst.object+json',
          prefer: 'count=exact',
          'accept-profile': 'analytics',
          'content-profile': undefined,
          'X-Custom-Header': 'custom-val',
          'x-ignored': undefined
        }
      };

      const result = resolveRequestHeaders(null, null, requestInfo);
      expect(result['accept']).toBe('application/vnd.pgrst.object+json');
      expect(result['prefer']).toBe('count=exact');
      expect(result['accept-profile']).toBe('analytics');
      expect(result['x-custom-header']).toBe('custom-val');
      expect('content-profile' in result).toBe(false);
      expect('x-ignored' in result).toBe(false);
    });

    it('HDR-3: omits/deletes content-type when requestInfo.method is GET, HEAD, or omitted', () => {
      const omittedResult = resolveRequestHeaders(null, null);
      expect(omittedResult['content-type']).toBeUndefined();

      for (const method of ['GET', 'HEAD'] as const) {
        const result = resolveRequestHeaders(null, null, {
          url: TEST_URL,
          method,
          headers: {
            'content-type': 'text/plain',
            'x-custom': '1'
          }
        });
        expect(result['content-type']).toBeUndefined();
        expect(result['x-custom']).toBe('1');
      }
    });

    it('HDR-3: enforces content-type: application/json when requestInfo.method is POST, PATCH, or DELETE', () => {
      for (const method of ['POST', 'PATCH', 'DELETE'] as const) {
        const withoutCallerContentType = resolveRequestHeaders(null, null, {
          url: TEST_URL,
          method
        });
        expect(withoutCallerContentType['content-type']).toBe(
          'application/json'
        );

        const withCallerContentType = resolveRequestHeaders(null, null, {
          url: TEST_URL,
          method,
          headers: {
            'content-type': 'text/csv',
            'Content-Type': 'text/plain'
          }
        });
        expect(withCallerContentType['content-type']).toBe('application/json');
      }
    });

    it('HDR-4: strips all 5 FORBIDDEN_HEADERS supplied in requestInfo.headers while preserving custom headers', () => {
      const result = resolveRequestHeaders(null, null, {
        url: TEST_URL,
        method: 'GET',
        headers: {
          'x-firebase-sqlconnect-affinity': 'affinity-val',
          'X-Goog-Request-Params': 'params-val',
          'x-firebase-client': 'client-val',
          'X-Firebase-Client-Log-Type': 'log-val',
          Authorization: 'Bearer secret-jwt',
          'x-custom-header': 'custom-val'
        }
      });

      expect(result['x-firebase-sqlconnect-affinity']).toBeUndefined();
      expect(result['x-goog-request-params']).toBeUndefined();
      expect(result['x-firebase-client']).toBeUndefined();
      expect(result['x-firebase-client-log-type']).toBeUndefined();
      expect(result['authorization']).toBeUndefined();
      expect(result['x-custom-header']).toBe('custom-val');
    });

    it('HDR-5: attaches x-firebase-auth-token and x-firebase-appcheck when tokens are non-empty, overwrites caller values, and deletes them when null or empty', () => {
      const attached = resolveRequestHeaders(
        { accessToken: 'my-auth-token' },
        { token: 'my-appcheck-token' }
      );
      expect(attached[FirebaseHeaders.FIREBASE_AUTH_TOKEN]).toBe(
        'my-auth-token'
      );
      expect(attached[FirebaseHeaders.FIREBASE_APPCHECK]).toBe(
        'my-appcheck-token'
      );

      const nullTokens = resolveRequestHeaders(null, null);
      expect(nullTokens[FirebaseHeaders.FIREBASE_AUTH_TOKEN]).toBeUndefined();
      expect(nullTokens[FirebaseHeaders.FIREBASE_APPCHECK]).toBeUndefined();

      const overwritten = resolveRequestHeaders(
        { accessToken: 'sdk-auth-token' },
        { token: 'sdk-appcheck-token' },
        {
          url: TEST_URL,
          method: 'GET',
          headers: {
            [FirebaseHeaders.FIREBASE_AUTH_TOKEN]: 'caller-auth-token',
            [FirebaseHeaders.FIREBASE_APPCHECK]: 'caller-appcheck-token'
          }
        }
      );
      expect(overwritten[FirebaseHeaders.FIREBASE_AUTH_TOKEN]).toBe(
        'sdk-auth-token'
      );
      expect(overwritten[FirebaseHeaders.FIREBASE_APPCHECK]).toBe(
        'sdk-appcheck-token'
      );

      const emptyTokens = resolveRequestHeaders(
        { accessToken: '' },
        { token: '' },
        {
          url: TEST_URL,
          method: 'GET',
          headers: {
            [FirebaseHeaders.FIREBASE_AUTH_TOKEN]: 'caller-auth-token',
            [FirebaseHeaders.FIREBASE_APPCHECK]: 'caller-appcheck-token'
          }
        }
      );
      expect(emptyTokens[FirebaseHeaders.FIREBASE_AUTH_TOKEN]).toBeUndefined();
      expect(emptyTokens[FirebaseHeaders.FIREBASE_APPCHECK]).toBeUndefined();
    });

    it('HDR-6: attaches x-goog-api-client and attaches x-firebase-gmpid only when _appId is defined (overwriting caller values)', () => {
      const withAppId = resolveRequestHeaders(null, null, undefined, 'app-123');
      expect(withAppId[FirebaseHeaders.GOOG_API_CLIENT]).toBe(
        'gl-js/ fire/1.2.3'
      );
      expect(withAppId[FirebaseHeaders.FIREBASE_GMPID]).toBe('app-123');

      const withoutAppId = resolveRequestHeaders(
        null,
        null,
        {
          url: TEST_URL,
          method: 'GET',
          headers: {
            [FirebaseHeaders.GOOG_API_CLIENT]: 'custom-client/9.9',
            [FirebaseHeaders.FIREBASE_GMPID]: 'custom-gmpid'
          }
        },
        undefined
      );
      expect(withoutAppId[FirebaseHeaders.GOOG_API_CLIENT]).toBe(
        'gl-js/ fire/1.2.3'
      );
      expect(withoutAppId[FirebaseHeaders.FIREBASE_GMPID]).toBeUndefined();

      const overwrittenWithAppId = resolveRequestHeaders(
        null,
        null,
        {
          url: TEST_URL,
          method: 'GET',
          headers: {
            [FirebaseHeaders.GOOG_API_CLIENT]: 'custom-client/9.9',
            [FirebaseHeaders.FIREBASE_GMPID]: 'custom-gmpid'
          }
        },
        'app-123'
      );
      expect(overwrittenWithAppId[FirebaseHeaders.GOOG_API_CLIENT]).toBe(
        'gl-js/ fire/1.2.3'
      );
      expect(overwrittenWithAppId[FirebaseHeaders.FIREBASE_GMPID]).toBe(
        'app-123'
      );
    });
  });
});
