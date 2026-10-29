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
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import type {
  BuilderExecutionTracker,
  CreateBuilderFetch,
  ReadonlySqlClientState
} from '../core/state';
import { SDK_VERSION } from '../core/version';

import { getFetch } from './fetch';
import { LOWERCASE_DISALLOWED_HEADER_KEYS } from './headers';

const TERMINATED_MESSAGE = 'FirebaseSql instance has been terminated.';

function createTerminatedError(): FirebaseSqlError {
  return new FirebaseSqlError(
    Code.NOT_INITIALIZED,
    TERMINATED_MESSAGE,
    FirebaseSqlErrorCategory.SQL_CLIENT
  );
}

function throwTrackedClientError(
  tracker: BuilderExecutionTracker,
  clientError: FirebaseSqlError
): never {
  tracker.clientError = clientError;
  // Tag as AbortError so @supabase/postgrest-js's fetchWithRetry immediately
  // aborts without applying its 3x exponential backoff (1s/2s/4s) on GET/HEAD,
  // allowing the outer builder wrapper to surface tracker.clientError directly.
  const abortError = new Error(clientError.message);
  abortError.name = 'AbortError';
  throw abortError;
}

function resolveClientError(
  state: ReadonlySqlClientState,
  err: unknown
): FirebaseSqlError {
  if (state.active === null) {
    return createTerminatedError();
  }
  if (err instanceof FirebaseSqlError) {
    return err;
  }
  return new FirebaseSqlError(
    Code.OTHER,
    err instanceof Error ? err.message : String(err),
    FirebaseSqlErrorCategory.SQL_CLIENT
  );
}

function getEffectiveSignal(
  input: RequestInfo | URL,
  init: RequestInit | undefined
): AbortSignal | undefined {
  if (init?.signal !== undefined) {
    return init.signal ?? undefined;
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.signal;
  }
  return undefined;
}

function toAbortError(signal: AbortSignal, thrown?: unknown): Error {
  const reason: unknown = thrown !== undefined ? thrown : signal.reason;
  if (
    reason instanceof Error &&
    (reason.name === 'AbortError' || reason.name === 'TimeoutError')
  ) {
    return reason;
  }
  const message =
    reason instanceof Error
      ? reason.message
      : reason !== undefined
        ? String(reason)
        : 'The operation was aborted.';
  const abortError = new Error(message);
  abortError.name = 'AbortError';
  return abortError;
}

function buildRequestHeaders(
  input: RequestInfo | URL,
  headersInit: HeadersInit | undefined,
  appId: string | undefined,
  authToken: string | null,
  appCheckToken: string | null
): Record<string, string> {
  const headers = new Headers();
  const source =
    headersInit !== undefined
      ? headersInit
      : typeof Request !== 'undefined' && input instanceof Request
        ? input.headers
        : undefined;
  if (source instanceof Headers) {
    source.forEach((value, key) => {
      if (!LOWERCASE_DISALLOWED_HEADER_KEYS.has(key.trim().toLowerCase())) {
        headers.append(key, value);
      }
    });
  } else if (Array.isArray(source)) {
    for (const [key, value] of source) {
      if (!LOWERCASE_DISALLOWED_HEADER_KEYS.has(key.trim().toLowerCase())) {
        headers.append(key, value);
      }
    }
  } else if (source) {
    for (const [key, value] of Object.entries(source)) {
      if (
        value !== undefined &&
        !LOWERCASE_DISALLOWED_HEADER_KEYS.has(key.trim().toLowerCase())
      ) {
        headers.append(key, value);
      }
    }
  }

  headers.set('x-goog-api-client', 'gl-js/ fire/' + SDK_VERSION);
  headers.set('x-client-version', 'web/' + SDK_VERSION);
  if (appId) {
    headers.set('x-firebase-gmpid', appId);
  }
  if (authToken) {
    headers.set('x-firebase-auth-token', authToken);
  }
  if (appCheckToken) {
    headers.set('x-firebase-appcheck', appCheckToken);
  }

  const merged: Record<string, string> = {};
  headers.forEach((value, key) => {
    Object.defineProperty(merged, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true
    });
  });
  return merged;
}

export const createBuilderFetch: CreateBuilderFetch =
  (state, tracker) => async (input, init) => {
    const active = state.active;
    if (active === null) {
      throwTrackedClientError(tracker, createTerminatedError());
    }

    let baseFetch: typeof fetch;
    try {
      baseFetch = getFetch();
    } catch (err) {
      throwTrackedClientError(tracker, resolveClientError(state, err));
    }

    const signal = getEffectiveSignal(input, init);
    if (signal?.aborted) {
      throw toAbortError(signal);
    }

    let authToken: string | null = null;
    let appCheckToken: string | null = null;
    let initialUid: string | null | undefined;
    try {
      const [authTokenData, appCheckTokenResult] = await Promise.all([
        active.authTokenProvider.getToken({ forceRefresh: false }),
        active.appCheckTokenProvider.getToken({ forceRefresh: false })
      ]);
      authToken = authTokenData?.accessToken ? authTokenData.accessToken : null;
      appCheckToken = appCheckTokenResult?.token
        ? appCheckTokenResult.token
        : null;
      initialUid = active.authTokenProvider.getAuth()?.getUid();
    } catch (err) {
      if (state.active !== null && signal?.aborted) {
        throw toAbortError(signal);
      }
      throwTrackedClientError(tracker, resolveClientError(state, err));
    }

    if (state.active === null) {
      throwTrackedClientError(tracker, createTerminatedError());
    }
    if (signal?.aborted) {
      throw toAbortError(signal);
    }

    const mergedHeaders = buildRequestHeaders(
      input,
      init?.headers,
      active.appId,
      authToken,
      appCheckToken
    );

    const isRequestInput =
      typeof Request !== 'undefined' && input instanceof Request;
    const canReplayBody =
      !(
        typeof ReadableStream !== 'undefined' &&
        init?.body instanceof ReadableStream
      ) && !(isRequestInput && init?.body === undefined && input.bodyUsed);
    const retryInput =
      canReplayBody &&
      isRequestInput &&
      init?.body === undefined &&
      input.body !== null
        ? input.clone()
        : null;
    let retryInputConsumed = false;

    const executeFetch = async (
      targetInput: RequestInfo | URL,
      requestHeaders: Record<string, string>
    ): Promise<Response> => {
      if (state.active === null) {
        throwTrackedClientError(tracker, createTerminatedError());
      }
      if (signal?.aborted) {
        throw toAbortError(signal);
      }
      if (retryInput !== null && targetInput === retryInput) {
        retryInputConsumed = true;
      }
      let res: Response;
      try {
        res = await baseFetch(targetInput, {
          ...init,
          headers: requestHeaders
        });
      } catch (err) {
        if (state.active === null) {
          throwTrackedClientError(tracker, createTerminatedError());
        }
        if (signal?.aborted) {
          throw toAbortError(signal, err);
        }
        throw err;
      }
      if (state.active === null) {
        void res.body?.cancel().catch(() => {});
        throwTrackedClientError(tracker, createTerminatedError());
      }
      return res;
    };

    try {
      const response = await executeFetch(input, mergedHeaders);

      if (
        response.status === 401 &&
        authToken !== null &&
        canReplayBody &&
        state.active !== null
      ) {
        if (signal?.aborted) {
          await response.body?.cancel().catch(() => {});
          throw toAbortError(signal);
        }

        let refreshedAuthToken: string | null = null;
        try {
          const cachedTokenData = await active.authTokenProvider.getToken({
            forceRefresh: false
          });
          refreshedAuthToken = cachedTokenData?.accessToken
            ? cachedTokenData.accessToken
            : null;
          if (
            state.active !== null &&
            !signal?.aborted &&
            (refreshedAuthToken === null || refreshedAuthToken === authToken)
          ) {
            const refreshedTokenData = await active.authTokenProvider.getToken({
              forceRefresh: true
            });
            refreshedAuthToken = refreshedTokenData?.accessToken
              ? refreshedTokenData.accessToken
              : null;
          }
        } catch (err) {
          await response.body?.cancel().catch(() => {});
          if (state.active !== null && signal?.aborted) {
            throw toAbortError(signal);
          }
          throwTrackedClientError(tracker, resolveClientError(state, err));
        }

        if (state.active === null) {
          await response.body?.cancel().catch(() => {});
          throwTrackedClientError(tracker, createTerminatedError());
        }
        if (signal?.aborted) {
          await response.body?.cancel().catch(() => {});
          throw toAbortError(signal);
        }

        // Only retry when refresh yields a non-null token distinct from the
        // initial attempt for the same Auth principal; avoids redundant round-trips
        // on non-Auth 401 rejections (such as invalid App Check tokens) and prevents
        // replaying in-flight requests across mid-flight account switches.
        const refreshedUid = active.authTokenProvider.getAuth()?.getUid();
        if (
          refreshedAuthToken !== null &&
          refreshedAuthToken !== authToken &&
          refreshedUid === initialUid
        ) {
          await response.body?.cancel().catch(() => {});
          const retryHeaders: Record<string, string> = Object.defineProperties(
            {},
            Object.getOwnPropertyDescriptors(mergedHeaders)
          );
          retryHeaders['x-firebase-auth-token'] = refreshedAuthToken;
          return await executeFetch(retryInput ?? input, retryHeaders);
        }
      }

      return response;
    } finally {
      if (!retryInputConsumed) {
        void retryInput?.body?.cancel().catch(() => {});
      }
    }
  };
