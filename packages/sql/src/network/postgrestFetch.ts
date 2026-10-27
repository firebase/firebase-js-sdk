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
import { DISALLOWED_HEADER_KEYS } from '../core/settings';
import type {
  BuilderExecutionTracker,
  CreateBuilderFetch,
  ReadonlySqlClientState
} from '../core/state';
import { SDK_VERSION } from '../core/version';

import { getFetch } from './fetch';

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
      if (!DISALLOWED_HEADER_KEYS.has(key.trim().toLowerCase())) {
        headers.append(key, value);
      }
    });
  } else if (Array.isArray(source)) {
    for (const [key, value] of source) {
      if (!DISALLOWED_HEADER_KEYS.has(key.trim().toLowerCase())) {
        headers.append(key, value);
      }
    }
  } else if (source) {
    for (const [key, value] of Object.entries(source)) {
      if (
        value !== undefined &&
        !DISALLOWED_HEADER_KEYS.has(key.trim().toLowerCase())
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
      throwTrackedClientError(tracker, resolveClientError(state, err));
    }

    if (state.active === null) {
      throwTrackedClientError(tracker, createTerminatedError());
    }

    const mergedHeaders = buildRequestHeaders(
      input,
      init?.headers,
      active.appId,
      authToken,
      appCheckToken
    );

    const response = await baseFetch(input, {
      ...init,
      headers: mergedHeaders
    });

    if (
      response.status === 401 &&
      authToken !== null &&
      state.active !== null
    ) {
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
        throwTrackedClientError(tracker, resolveClientError(state, err));
      }

      if (state.active === null) {
        await response.body?.cancel().catch(() => {});
        throwTrackedClientError(tracker, createTerminatedError());
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
        return baseFetch(input, {
          ...init,
          headers: retryHeaders
        });
      }
    }

    return response;
  };
