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

import { Code, FirebaseSqlError, FirebaseSqlErrorCategory } from '../core/error';
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

function copyHeadersInit(
  headersInit: HeadersInit | undefined
): Record<string, string> {
  const merged: Record<string, string> = {};
  if (!headersInit) {
    return merged;
  }
  if (headersInit instanceof Headers) {
    headersInit.forEach((value, key) => {
      merged[key] = value;
    });
  } else if (Array.isArray(headersInit)) {
    for (const [key, value] of headersInit) {
      merged[key] = value;
    }
  } else {
    for (const [key, value] of Object.entries(headersInit)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }
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
    try {
      const [authTokenData, appCheckTokenResult] = await Promise.all([
        active.authTokenProvider.getToken({ forceRefresh: false }),
        active.appCheckTokenProvider.getToken({ forceRefresh: false })
      ]);
      authToken = authTokenData?.accessToken ? authTokenData.accessToken : null;
      appCheckToken = appCheckTokenResult?.token
        ? appCheckTokenResult.token
        : null;
    } catch (err) {
      throwTrackedClientError(tracker, resolveClientError(state, err));
    }

    if (state.active === null) {
      throwTrackedClientError(tracker, createTerminatedError());
    }

    const mergedHeaders = copyHeadersInit(init?.headers);
    mergedHeaders['x-goog-api-client'] = 'gl-js/ fire/' + SDK_VERSION;
    mergedHeaders['x-client-version'] = 'web/' + SDK_VERSION;
    if (active.appId) {
      mergedHeaders['x-firebase-gmpid'] = active.appId;
    }
    if (authToken) {
      mergedHeaders['x-firebase-auth-token'] = authToken;
    }
    if (appCheckToken) {
      mergedHeaders['x-firebase-appcheck'] = appCheckToken;
    }

    const response = await baseFetch(input, {
      ...init,
      headers: mergedHeaders
    });

    if (response.status === 401 && state.active !== null) {
      let refreshedAuthToken: string | null = null;
      try {
        const refreshedTokenData = await active.authTokenProvider.getToken({
          forceRefresh: true
        });
        refreshedAuthToken = refreshedTokenData?.accessToken
          ? refreshedTokenData.accessToken
          : null;
      } catch (err) {
        throwTrackedClientError(tracker, resolveClientError(state, err));
      }

      if (state.active === null) {
        throwTrackedClientError(tracker, createTerminatedError());
      }

      // Only retry when force-refresh yields a non-null token distinct from the
      // initial attempt; avoids redundant round-trips on anonymous RLS 401s or
      // non-Auth 401 rejections (such as invalid App Check tokens).
      if (refreshedAuthToken !== null && refreshedAuthToken !== authToken) {
        await response.text().catch(() => {});
        return baseFetch(input, {
          ...init,
          headers: {
            ...mergedHeaders,
            'x-firebase-auth-token': refreshedAuthToken
          }
        });
      }
    }

    return response;
  };
