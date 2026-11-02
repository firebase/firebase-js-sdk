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

import { AppCheckTokenResult } from '@firebase/app-check-interop-types';
import { FirebaseAuthTokenData } from '@firebase/auth-interop-types';
import { isCloudWorkstation } from '@firebase/util';

import type { OperationFailure, OperationResult } from '../api/Builder';
import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import type { PostgrestRequestHeaders, PostgrestRequestInfo } from '../core/OperationManager';
import { SqlServiceSettings } from '../core/settings';
import { TokenOptions } from '../core/tokenProviders/AbstractTokenProvider';
import { AppCheckTokenProvider } from '../core/tokenProviders/AppCheckTokenProvider';
import { FirebaseAuthTokenProvider } from '../core/tokenProviders/FirebaseAuthTokenProvider';
import { SDK_VERSION } from '../core/version';
import { FORBIDDEN_HEADERS, FirebaseHeaders } from '../util/constants';

import { getFetch } from './fetch';

const MAX_FETCH_RETRIES = 3;
const MIN_EXPONENTIAL_BACKOFF_MS = 1_000;
const MAX_EXPONENTIAL_BACKOFF_MS = 30_000;

/**
 * Checks if an operation is retryable. Only idempotent operations are retryable.
 */
function isRetryableOperation(requestInfo: PostgrestRequestInfo): boolean {
  return requestInfo.method === 'GET' || requestInfo.method === 'HEAD';
}


/**
 * Returns the {@linkcode FirebaseHeaders.GOOG_API_CLIENT | 'x-goog-api-client'} header value.
 * @internal
 */
export function getGoogApiClientValue(): string {
  return 'gl-js/ fire/' + SDK_VERSION;
}

/**
 * Builds wire-level request headers from `PostgrestRequestInfo`,
 * telemetry, and SDK Auth / App Check providers.
 * @internal
 */
export function buildRequestHeaders(
  authToken: FirebaseAuthTokenData | null,
  appCheckToken: AppCheckTokenResult | null,
  requestInfo?: PostgrestRequestInfo,
  appId?: string
): Record<string, string> {
  const headers = new Headers();

  if (requestInfo?.headers) {
    for (const [key, value] of Object.entries(requestInfo.headers)) {
      if (value !== undefined) {
        headers.set(key, value);
      }
    }
  }

  const method = (requestInfo?.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    headers.set('content-type', 'application/json');
  } else {
    headers.delete('content-type');
  }

  for (const key of FORBIDDEN_HEADERS) {
    headers.delete(key);
  }

  // Firebase token headers
  // user-supplied authorization headers are overwritten
  if (authToken?.accessToken) {
    headers.set(FirebaseHeaders.FIREBASE_AUTH_TOKEN, authToken.accessToken);
  } else {
    headers.delete(FirebaseHeaders.FIREBASE_AUTH_TOKEN);
  }

  if (appCheckToken?.token) {
    headers.set(FirebaseHeaders.FIREBASE_APPCHECK, appCheckToken.token);
  } else {
    headers.delete(FirebaseHeaders.FIREBASE_APPCHECK);
  }

  // Telemetry headers
  headers.set(FirebaseHeaders.GOOG_API_CLIENT, getGoogApiClientValue());
  if (appId !== undefined) {
    headers.set(FirebaseHeaders.FIREBASE_GMPID, appId);
  } else {
    headers.delete(FirebaseHeaders.FIREBASE_GMPID);
  }

  // Normalize headers
  const headersRecord: Record<string, string> = {};
  headers.forEach((value, key) => {
    headersRecord[key] = value;
  });
  return headersRecord;
}

/**
 * Pauses execution for the specified duration or until the provided AbortSignal is aborted.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const id = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort(): void {
      clearTimeout(id);
      resolve();
    }
    signal?.addEventListener('abort', onAbort);
  });
}

/**
 * Computes the backoff delay for a retryable HTTP response, honoring `Retry-After` if present.
 * Minimum of {@linkcode MIN_EXPONENTIAL_BACKOFF_MS} and maximum of {@linkcode MAX_EXPONENTIAL_BACKOFF_MS}.
 */
function getRetryDelay(res: Response, attempt: number): number {
  const baseDelay = Math.min(1_000 * 2 ** (attempt - 1), MAX_EXPONENTIAL_BACKOFF_MS);
  const jitter = Math.abs((Math.random() - 0.5) * baseDelay);
  const exponentialBackoff = Math.max(MIN_EXPONENTIAL_BACKOFF_MS, Math.round(baseDelay + jitter));

  let retryHeaderDelay = 0;
  const retryAfterHeader = res.headers?.get('Retry-After');
  if (retryAfterHeader !== null) {
    retryHeaderDelay = (Number.parseInt(retryAfterHeader, 10) || 0) * 1000;
  }

  return Math.max(retryHeaderDelay, exponentialBackoff);
}

// /**
//  * Extracts the row count from the `Content-Range` response header when requested via `Prefer`.
//  */
// function extractCount(
//   res: Response,
//   headers: Record<string, string> | undefined
// ): number | null {
//   const countHeader = headers?.['prefer']?.match(
//     /count=(exact|planned|estimated)/
//   );
//   const contentRange = res.headers.get('content-range')?.split('/');
//   if (countHeader && contentRange && contentRange.length > 1) {
//     const parsedCount = Number.parseInt(contentRange[1]!, 10);
//     return Number.isNaN(parsedCount) ? null : parsedCount;
//   }
//   return null;
// }

/**
 * Per-request transport execution options passed alongside {@link PostgrestRequestInfo}.
 * @internal
 */
export interface PostgrestTransportOptions {
  signal?: AbortSignal;
  retry?: boolean;
}

/**
 * Interface defining the external API of the transport layer.
 * @internal
 */
export interface FirebaseSqlTransportInterface {
  readonly settings: SqlServiceSettings;

  /**
   * Constructs and executes an FSQL HTTP request, and parses the response into {@link OperationResult}.
   */
  invokePostgrestOperation<T = unknown>(
    requestInfo: PostgrestRequestInfo,
    options?: PostgrestTransportOptions
  ): Promise<OperationResult<T>>;
}

/**
 * Configuration options for {@link FirebaseSqlTransport}.
 * @internal
 */
export interface FirebaseSqlTransportOptions {
  settings?: SqlServiceSettings;
  appId?: string | undefined;
  authTokenProvider?: FirebaseAuthTokenProvider | undefined;
  appCheckTokenProvider?: AppCheckTokenProvider | undefined;
}

/**
 * HTTP transport layer for Firebase SQL.
 * @internal
 */
export class FirebaseSqlTransport implements FirebaseSqlTransportInterface {
  readonly settings: SqlServiceSettings;
  protected _appId?: string;
  // TODO: Update _isUsingEmulator if we add emulator support in the future.
  protected _isUsingEmulator = false;
  protected authProvider?: FirebaseAuthTokenProvider;
  protected appCheckProvider?: AppCheckTokenProvider;

  constructor(options: FirebaseSqlTransportOptions = {}) {
    this.settings = options.settings as SqlServiceSettings;
    this._appId = options.appId;
    this.authProvider = options.authTokenProvider;
    this.appCheckProvider = options.appCheckTokenProvider;
  }

  /**
   * Resolves and returns the auth and app check tokens from the auth and app check providers in parallel.
   */
  private async resolveFirebaseTokens(
    options: TokenOptions = { forceRefresh: false }
  ): Promise<[FirebaseAuthTokenData | null, AppCheckTokenResult | null]> {
    return Promise.all([
      this.authProvider
        ? this.authProvider.getToken(options)
        : Promise.resolve(null),
      this.appCheckProvider
        ? this.appCheckProvider.getToken(options).catch(() => null)
        : Promise.resolve(null)
    ]);
  }

  /**
   * Builds the `RequestInit` options for a single `fetch` attempt.
   */
  private buildRequest(
    requestInfo: PostgrestRequestInfo,
    requestHeaders: Record<string, string>,
    signal?: AbortSignal
  ): RequestInit {
    const headers: Record<string, string> = { ...requestHeaders };
    const requestInit: RequestInit = {
      method: requestInfo.method,
      headers,
      body: JSON.stringify(requestInfo.body, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ),
      signal
    };
    if (isCloudWorkstation(requestInfo.url) && this._isUsingEmulator) {
      requestInit.credentials = 'include';
    }
    return requestInit;
  }

  /**
   * Constructs and executes an FSQL HTTP request and parses the response into {@link OperationResult}.
   * Handles retries up to {@linkcode MAX_FETCH_RETRIES}, including one automatic retry attempt if the previous attempt returned a 401 unauthorized status.
   * 
   * If an error is thrown by the fetch implementation (ex: `AbortError`, or `TypeError: Failed to fetch`), the error is raised as-is.
   */
  async invokePostgrestOperation<T = unknown>(
    requestInfo: PostgrestRequestInfo,
    options?: PostgrestTransportOptions
  ): Promise<OperationResult<T>> {
    const fetchImpl = getFetch();
    // Build headers and RequestInit with current auth and app check tokens
    let [authToken, appCheckToken] = await this.resolveFirebaseTokens();
    let requestHeaders = buildRequestHeaders(
      authToken,
      appCheckToken,
      requestInfo,
      this._appId
    );
    let requestInit = this.buildRequest(
      requestInfo,
      requestHeaders,
      options?.signal
    );

    let response: Response;
    let authRefreshed = false;

    const maxAttempts = (isRetryableOperation(requestInfo) && options?.retry) ? MAX_FETCH_RETRIES : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt > 1) {
        await sleep(getRetryDelay(response!, attempt), options?.signal);
      }
      response = await fetchImpl(requestInfo.url, requestInit);
      if (response.status === 401 && !authRefreshed) {
        // Rebuild headers and RequestInit with new auth token, and retry the request once.
        // Does not count towards the maximum number of attempts.
        if (attempt > 1) {
          await sleep(getRetryDelay(response!, attempt), options?.signal);
        }
        authRefreshed = true;
        const oldAuthToken = authToken;
        authToken = await this.authProvider?.getToken({ forceRefresh: true }) ?? null;
        if (oldAuthToken?.accessToken !== authToken?.accessToken) {
          requestHeaders = buildRequestHeaders(
            authToken,
            appCheckToken,
            requestInfo,
            this._appId
          );
          requestInit = this.buildRequest(
            requestInfo,
            requestHeaders,
            options?.signal
          );
          response = await fetchImpl(requestInfo.url, requestInit);
        }
      }
    }
    return this.processResponse<T>(response!, requestInfo.method, requestInfo.headers);
  }

  /**
   * Process a fetch response and return the standardized OperationResult.
   */
  private async processResponse<T>(
    response: Response,
    method: string,
    headers?: PostgrestRequestHeaders
  ): Promise<OperationResult<T>> {
    if (response.ok) {
      return this.processSuccessResponse<T>(response, method, headers);
    }
    return this.processErrorResponse(response);
  }

  // TODO: review
  /**
   * Parses a 2xx HTTP response into an {@link OperationResult}.
   */
  private async processSuccessResponse<T>(
    response: Response,
    method: string,
    headers: PostgrestRequestHeaders | undefined
  ): Promise<OperationResult<T>> {
    // let data: unknown = null;

    // if (method !== 'HEAD') {
    //   const body = await res.text();
    //   if (body === '') {
    //     // Prefer: return=minimal
    //   } else if (
    //     headers?.['accept'] === 'text/csv' ||
    //     headers?.['accept']?.includes('application/vnd.pgrst.plan+text')
    //   ) {
    //     data = body;
    //   } else {
    //     try {
    //       data = JSON.parse(body);
    //     } catch {
    //       // A 2xx status doesn't guarantee a JSON body; mirror the non-2xx fallback below.
    //       return {
    //         success: false,
    //         error: new FirebaseSqlError(
    //           Code.OTHER,
    //           body,
    //           FirebaseSqlErrorCategory.SQL_POSTGREST,
    //           undefined,
    //           undefined,
    //           res.status
    //         ),
    //         data: null,
    //         count: null,
    //         status: res.status,
    //         statusText: res.statusText
    //       };
    //     }
    //   }
    // }

    // return {
    //   success: true,
    //   error: null,
    //   data: data as T,
    //   count: extractCount(res, headers),
    //   status: res.status,
    //   statusText: res.statusText
    // };

    return {
      success: true,
      error: null,
      data: new FirebaseSqlError(Code.OTHER, "processSuccessResponse() NOT YET IMPLEMENTED", FirebaseSqlErrorCategory.SQL_CLIENT) as T,
      count: null,
      status: response.status,
      statusText: response.statusText
    };
  }

  // TODO: review
  /**
   * Parses a non-2xx HTTP response into an {@link OperationResult}, applying PostgREST 404 workarounds.
   */
  private processErrorResponse(
    response: Response
  ): OperationFailure {
    return {
      success: false,
      error: new FirebaseSqlError(Code.OTHER, "processErrorResponse() NOT YET IMPLEMENTED", FirebaseSqlErrorCategory.SQL_CLIENT),
      data: null,
      count: null,
      status: response.status,
      statusText: response.statusText
    };
  }
}
