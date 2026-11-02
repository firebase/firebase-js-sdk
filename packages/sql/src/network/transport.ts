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

import { FirebaseAuthTokenData } from '@firebase/auth-interop-types';
import { decode, isCloudWorkstation } from '@firebase/util';

import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import { SqlServiceSettings } from '../core/settings';
import type {
  BuilderExecutionTracker,
  CreateBuilderFetch,
  SqlClientState
} from '../core/state';
import { AppCheckTokenProvider } from '../core/tokenProviders/AppCheckTokenProvider';
import { FirebaseAuthTokenProvider } from '../core/tokenProviders/FirebaseAuthTokenProvider';

import { Fetch, getFetch } from './fetch';
import { FirebaseHeaders, resolveRequestHeaders } from './headers';

/**
 * Extracts the user UID from an Auth ID token's `sub` claim.
 *
 * The "sub" claim is documented to be "a non-empty string and must be the uid of the user or device"
 * (see http://goo.gle/4oGjEQt). Extracting the UID directly from the cryptographic token avoids race
 * conditions where the auth manager's current UID may have changed since the token was issued.
 *
 * @internal
 */
export function getAuthUidFromToken(
  token: string | null | undefined
): string | null {
  if (!token) {
    return null;
  }
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const claims = decode(token).claims;
    const sub = claims?.sub;
    return typeof sub === 'string' && sub.length > 0 ? sub : null;
  } catch {
    return null;
  }
}

/**
 * Normalizes an AbortSignal abort reason or thrown error into a standard AbortError,
 * preserving any existing FirebaseSqlError, AbortError, or TimeoutError.
 *
 * @internal
 */
export function toAbortError(signal: AbortSignal, thrown?: unknown): Error {
  const reason: unknown = thrown !== undefined ? thrown : signal.reason;
  if (
    reason instanceof Error &&
    (reason.name === 'AbortError' ||
      reason.name === 'TimeoutError' ||
      reason instanceof FirebaseSqlError)
  ) {
    return reason;
  }
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === 'string'
        ? reason
        : 'This operation was aborted';
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

/**
 * Composes two AbortSignals into a single effective AbortSignal.
 *
 * @internal
 */
export function composeSignals(
  signal1: AbortSignal | undefined,
  signal2: AbortSignal | undefined
): { signal: AbortSignal | undefined; cleanup: () => void } {
  if (!signal1) {
    return { signal: signal2, cleanup: () => {} };
  }
  if (!signal2) {
    return { signal: signal1, cleanup: () => {} };
  }
  if (signal1.aborted) {
    return { signal: signal1, cleanup: () => {} };
  }
  if (signal2.aborted) {
    return { signal: signal2, cleanup: () => {} };
  }

  if (typeof AbortSignal.any === 'function') {
    return {
      signal: AbortSignal.any([signal1, signal2]),
      cleanup: () => {}
    };
  }

  const controller = new AbortController();
  const onAbort1 = () => controller.abort(signal1.reason);
  const onAbort2 = () => controller.abort(signal2.reason);
  signal1.addEventListener('abort', onAbort1, { once: true });
  signal2.addEventListener('abort', onAbort2, { once: true });

  const cleanup = () => {
    signal1.removeEventListener('abort', onAbort1);
    signal2.removeEventListener('abort', onAbort2);
  };
  return { signal: controller.signal, cleanup };
}

/**
 * Interface defining the external API of the transport layer.
 * @internal
 */
export interface FirebaseSqlTransportInterface {
  readonly settings?: SqlServiceSettings;

  /**
   * Constructs and executes an FSQL HTTP request, and returns the response.
   */
  invokePostgrestOperation(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response>;

  /**
   * Returns a standard `fetch` implementation bound to this transport instance,
   * optionally tracking `FirebaseSqlError` instances on `tracker.clientError` and
   * throwing `AbortError` to immediately short-circuit PostgREST retries.
   */
  toFetch(tracker?: BuilderExecutionTracker): typeof fetch;
}

/**
 * Configuration options for FirebaseSqlTransport.
 * @internal
 */
export interface FirebaseSqlTransportOptions {
  settings?: SqlServiceSettings;
  appId?: string | undefined;
  authTokenProvider?: FirebaseAuthTokenProvider | undefined;
  appCheckTokenProvider?: AppCheckTokenProvider | undefined;
  terminationSignal?: AbortSignal | undefined;
  state?: SqlClientState | undefined;
}

/**
 * HTTP transport layer for Firebase SQL.
 * @internal
 */
export class FirebaseSqlTransport implements FirebaseSqlTransportInterface {
  readonly settings?: SqlServiceSettings;
  protected _appId?: string;
  // TODO: Update _isUsingEmulator if we add emulator support in the future.
  protected _isUsingEmulator = false;
  protected authProvider?: FirebaseAuthTokenProvider;
  protected appCheckProvider?: AppCheckTokenProvider;
  protected _terminationSignal?: AbortSignal;
  protected _state?: SqlClientState;

  constructor(options: FirebaseSqlTransportOptions = {}) {
    this.settings = options.settings;
    this._appId = options.appId;
    this.authProvider = options.authTokenProvider;
    this.appCheckProvider = options.appCheckTokenProvider;
    this._terminationSignal = options.terminationSignal;
    this._state = options.state;
  }

  /**
   * Constructs and executes an FSQL HTTP request, and returns the response.
   */
  async invokePostgrestOperation(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    if (this._state && this._state.active === null) {
      throw new FirebaseSqlError(
        Code.NOT_INITIALIZED,
        'The Firebase SQL client has been terminated.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }

    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const authProvider =
      this._state?.active?.authTokenProvider ?? this.authProvider;
    const appCheckProvider =
      this._state?.active?.appCheckTokenProvider ?? this.appCheckProvider;
    const appId = this._state?.active?.appId ?? this._appId;
    const terminationSignal =
      this._state?.terminationSignal ?? this._terminationSignal;

    if (terminationSignal?.aborted) {
      throw toAbortError(terminationSignal);
    }

    const inputSignal =
      init?.signal !== undefined
        ? (init.signal ?? undefined)
        : typeof Request !== 'undefined' && input instanceof Request
          ? input.signal
          : undefined;

    const { signal: effectiveSignal, cleanup } = composeSignals(
      inputSignal,
      terminationSignal
    );

    const isRequest =
      typeof Request !== 'undefined' && input instanceof Request;
    let mergedHeadersInit: HeadersInit | undefined = init?.headers;
    if (isRequest) {
      if (init?.headers === undefined) {
        mergedHeadersInit = input.headers;
      } else {
        const combined = new Headers(input.headers);
        new Headers(init.headers).forEach((value, key) => {
          combined.set(key, value);
        });
        mergedHeadersInit = combined;
      }
    }

    const mergedInit: RequestInit = {
      ...(isRequest
        ? {
            method: input.method,
            body: input.body,
            mode: input.mode,
            credentials: input.credentials,
            cache: input.cache,
            redirect: input.redirect,
            referrer: input.referrer,
            integrity: input.integrity
          }
        : undefined),
      ...init,
      headers: mergedHeadersInit
    };

    try {
      const fetchImpl = getFetch();

      let authToken: FirebaseAuthTokenData | null = null;
      let appCheckToken: { token: string } | null = null;

      try {
        const [authData, appCheckData] = await Promise.all([
          authProvider
            ? authProvider.getToken({ forceRefresh: false })
            : Promise.resolve(null),
          appCheckProvider
            ? appCheckProvider
                .getToken({ forceRefresh: false })
                .catch(() => null)
            : Promise.resolve(null)
        ]);
        authToken = authData;
        appCheckToken = appCheckData;
      } catch (err) {
        if (this._state && this._state.active === null) {
          throw new FirebaseSqlError(
            Code.NOT_INITIALIZED,
            'The Firebase SQL client has been terminated.',
            FirebaseSqlErrorCategory.SQL_CLIENT
          );
        }
        if (effectiveSignal?.aborted) {
          throw toAbortError(effectiveSignal, err);
        }
        throw err;
      }

      if (this._state && this._state.active === null) {
        throw new FirebaseSqlError(
          Code.NOT_INITIALIZED,
          'The Firebase SQL client has been terminated.',
          FirebaseSqlErrorCategory.SQL_CLIENT
        );
      }
      if (effectiveSignal?.aborted) {
        throw toAbortError(effectiveSignal);
      }

      const headers = resolveRequestHeaders(
        authToken,
        appCheckToken,
        mergedInit,
        appId
      );
      const requestInit = this.buildRequestInit(
        mergedInit,
        headers,
        url,
        effectiveSignal
      );
      const initialUid = getAuthUidFromToken(authToken?.accessToken);
      const canReplayBody = !(
        typeof ReadableStream !== 'undefined' &&
        (requestInit.body instanceof ReadableStream ||
          (isRequest && init?.body === undefined && input.bodyUsed))
      );

      return await fetchImpl(url, requestInit)
        .then(async response => {
          if (this._state && this._state.active === null) {
            if (typeof response.body?.cancel === 'function') {
              await response.body.cancel().catch(() => {});
            }
            throw new FirebaseSqlError(
              Code.NOT_INITIALIZED,
              'The Firebase SQL client has been terminated.',
              FirebaseSqlErrorCategory.SQL_CLIENT
            );
          }
          if (
            response.status === 401 &&
            authToken &&
            canReplayBody &&
            authProvider
          ) {
            return await this.refreshAuthAndRefetch(
              fetchImpl,
              url,
              requestInit,
              headers,
              authToken,
              response,
              initialUid,
              authProvider
            );
          }
          return response;
        })
        .catch(async err => {
          if (this._state && this._state.active === null) {
            throw new FirebaseSqlError(
              Code.NOT_INITIALIZED,
              'The Firebase SQL client has been terminated.',
              FirebaseSqlErrorCategory.SQL_CLIENT
            );
          }
          if (effectiveSignal?.aborted) {
            throw toAbortError(effectiveSignal, err);
          }
          throw err;
        });
    } finally {
      cleanup();
    }
  }

  /**
   * Constructs the final `RequestInit` configuration by merging caller-supplied init options
   * and normalized headers, while applying Cloud Workstation credentials if applicable.
   */
  private buildRequestInit(
    init: RequestInit | undefined,
    headers: Record<string, string>,
    requestUrl: string,
    signal?: AbortSignal | undefined
  ): RequestInit {
    const requestInit: RequestInit = Object.assign({}, init, { headers });
    if (signal !== undefined) {
      requestInit.signal = signal;
    }

    // Forward workstation auth cookies when targeting an emulator host in
    // Cloud Workstations, where forwarded ports require cookie auth.
    if (
      isCloudWorkstation(requestUrl) &&
      this._isUsingEmulator &&
      !requestInit.credentials
    ) {
      requestInit.credentials = 'include';
    }

    return requestInit;
  }

  /**
   * Force-refreshes the Firebase Auth token and retries the request once if a new token was
   * successfully obtained.
   */
  private async refreshAuthAndRefetch(
    fetchImpl: Fetch,
    requestUrl: string,
    requestInit: RequestInit,
    headers: Record<string, string>,
    currentToken: FirebaseAuthTokenData,
    originalResponse: Response,
    initialUid: string | null,
    authProvider: FirebaseAuthTokenProvider
  ): Promise<Response> {
    if (!authProvider) {
      return originalResponse;
    }

    const signal = requestInit.signal;
    if (signal?.aborted) {
      if (typeof originalResponse.body?.cancel === 'function') {
        await originalResponse.body.cancel().catch(() => {});
      }
      throw toAbortError(signal);
    }

    if (this._state && this._state.active === null) {
      if (typeof originalResponse.body?.cancel === 'function') {
        await originalResponse.body.cancel().catch(() => {});
      }
      throw new FirebaseSqlError(
        Code.NOT_INITIALIZED,
        'The Firebase SQL client has been terminated.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }

    // Check cached token first to avoid redundant Auth network trips if another
    // concurrent request already refreshed the token in the background.
    let refreshedToken: FirebaseAuthTokenData | null = null;
    try {
      refreshedToken = await authProvider
        .getToken({ forceRefresh: false })
        .then(data => data ?? null)
        .catch(() => null);

      if (signal?.aborted) {
        if (typeof originalResponse.body?.cancel === 'function') {
          await originalResponse.body.cancel().catch(() => {});
        }
        throw toAbortError(signal);
      }

      if (this._state && this._state.active === null) {
        if (typeof originalResponse.body?.cancel === 'function') {
          await originalResponse.body.cancel().catch(() => {});
        }
        throw new FirebaseSqlError(
          Code.NOT_INITIALIZED,
          'The Firebase SQL client has been terminated.',
          FirebaseSqlErrorCategory.SQL_CLIENT
        );
      }

      if (
        !refreshedToken?.accessToken ||
        refreshedToken.accessToken === currentToken.accessToken
      ) {
        refreshedToken = await authProvider
          .getToken({ forceRefresh: true })
          .then(data => data ?? null)
          .catch(() => null);
      }
    } catch (err) {
      if (typeof originalResponse.body?.cancel === 'function') {
        await originalResponse.body.cancel().catch(() => {});
      }
      if (this._state && this._state.active === null) {
        throw new FirebaseSqlError(
          Code.NOT_INITIALIZED,
          'The Firebase SQL client has been terminated.',
          FirebaseSqlErrorCategory.SQL_CLIENT
        );
      }
      if (signal?.aborted) {
        throw toAbortError(signal, err);
      }
      throw err;
    }

    if (signal?.aborted) {
      if (typeof originalResponse.body?.cancel === 'function') {
        await originalResponse.body.cancel().catch(() => {});
      }
      throw toAbortError(signal);
    }

    if (this._state && this._state.active === null) {
      if (typeof originalResponse.body?.cancel === 'function') {
        await originalResponse.body.cancel().catch(() => {});
      }
      throw new FirebaseSqlError(
        Code.NOT_INITIALIZED,
        'The Firebase SQL client has been terminated.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }

    if (
      refreshedToken?.accessToken &&
      refreshedToken.accessToken !== currentToken.accessToken
    ) {
      const refreshedUid = getAuthUidFromToken(refreshedToken.accessToken);
      if (initialUid !== null && refreshedUid !== initialUid) {
        return originalResponse;
      }

      // Cancel original response body ReadableStream if it exists
      if (typeof originalResponse.body?.cancel === 'function') {
        await originalResponse.body.cancel().catch(() => {});
      }
      const retryHeaders: Record<string, string> = Object.assign({}, headers);
      retryHeaders[FirebaseHeaders.FIREBASE_AUTH_TOKEN] =
        refreshedToken.accessToken;
      const retryRequestInit: RequestInit = Object.assign({}, requestInit, {
        headers: retryHeaders
      });
      return fetchImpl(requestUrl, retryRequestInit);
    }
    return originalResponse;
  }

  /**
   * Returns a standard `fetch` implementation bound to this transport instance,
   * optionally tracking `FirebaseSqlError` instances on `tracker.clientError` and
   * throwing `AbortError` to immediately short-circuit PostgREST retries.
   */
  toFetch(tracker?: BuilderExecutionTracker): typeof fetch {
    return async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      try {
        return await this.invokePostgrestOperation(input, init);
      } catch (err) {
        const errorToTrack =
          this._state && this._state.active === null
            ? new FirebaseSqlError(
                Code.NOT_INITIALIZED,
                'The Firebase SQL client has been terminated.',
                FirebaseSqlErrorCategory.SQL_CLIENT
              )
            : err instanceof FirebaseSqlError
              ? err
              : null;

        if (tracker && errorToTrack) {
          tracker.clientError = errorToTrack;
          const abortError = new Error(errorToTrack.message);
          abortError.name = 'AbortError';
          throw abortError;
        }
        throw err;
      }
    };
  }
}

/** @internal */
export const createBuilderFetch: CreateBuilderFetch = (state, tracker) => {
  const transport = new FirebaseSqlTransport({ state });
  return transport.toFetch(tracker);
};
