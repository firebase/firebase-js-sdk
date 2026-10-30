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

import type {
  OperationFailure,
  OperationResult,
  OperationSuccess
} from '../api/Builder';
import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import type { PostgrestRequestInfo } from '../core/OperationManager';
import { SqlServiceSettings } from '../core/settings';
import { AppCheckTokenProvider } from '../core/tokenProviders/AppCheckTokenProvider';
import { FirebaseAuthTokenProvider } from '../core/tokenProviders/FirebaseAuthTokenProvider';
import { SDK_VERSION } from '../core/version';
import { FORBIDDEN_HEADERS, FirebaseHeaders } from '../util/constants';

import { getFetch } from './fetch';

const DEFAULT_MAX_RETRIES = 3;
const RETRYABLE_METHODS = ['GET', 'HEAD', 'OPTIONS'] as const;
const RETRYABLE_STATUS_CODES = [520, 503] as const;

/**
 * Returns the {@linkcode FirebaseHeaders.GOOG_API_CLIENT | 'x-goog-api-client'} header value.
 * @internal
 */
export function getGoogApiClientValue(): string {
  return 'gl-js/ fire/' + SDK_VERSION;
}

/**
 * Resolves and normalizes wire-level request headers from `PostgrestRequestInfo`,
 * telemetry, and SDK Auth / App Check providers.
 * @internal
 */
export function resolveRequestHeaders(
  authToken: FirebaseAuthTokenData | null,
  appCheckToken: AppCheckTokenResult | null,
  requestInfo?: PostgrestRequestInfo,
  _appId?: string
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
  if (_appId !== undefined) {
    headers.set(FirebaseHeaders.FIREBASE_GMPID, _appId);
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

function getRetryDelay(attempt: number): number {
  return Math.min(1_000 * 2 ** attempt, 30_000);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    const onAbort = (): void => {
      clearTimeout(timerId);
      resolve();
    };
    const timerId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Per-request transport execution options passed alongside {@link PostgrestRequestInfo}.
 * @internal
 */
export interface PostgrestTransportOptions {
  signal?: AbortSignal | null;
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
   * Constructs and executes an FSQL HTTP request, and parses the response into {@link OperationResult}.
   */
  async invokePostgrestOperation<T = unknown>(
    requestInfo: PostgrestRequestInfo,
    options?: PostgrestTransportOptions
  ): Promise<OperationResult<T>> {
    const fetchImpl = getFetch();

    const [authToken, appCheckToken] = await Promise.all([
      this.authProvider
        ? this.authProvider.getToken({ forceRefresh: false })
        : Promise.resolve(null),
      this.appCheckProvider
        ? this.appCheckProvider
            .getToken({ forceRefresh: false })
            .catch(() => null)
        : Promise.resolve(null)
    ]);

    const baseHeaders = resolveRequestHeaders(
      authToken,
      appCheckToken,
      requestInfo,
      this._appId
    );
    const method = (requestInfo.method ?? 'GET').toUpperCase();

    let serializedBody: string | undefined;
    if (
      method !== 'GET' &&
      method !== 'HEAD' &&
      requestInfo.body !== undefined
    ) {
      serializedBody =
        typeof requestInfo.body === 'string'
          ? requestInfo.body
          : JSON.stringify(requestInfo.body, (_, value) =>
              typeof value === 'bigint' ? value.toString() : value
            );
    }

    const signal = options?.signal ?? undefined;
    const includeCredentials =
      isCloudWorkstation(requestInfo.url) && this._isUsingEmulator;

    const retryEnabled = options?.retry ?? true;
    let attemptCount = 0;
    let currentAuthToken: FirebaseAuthTokenData | null = authToken;
    let hasRefreshedAuth = false;
    let res: Response;

    while (true) {
      const attemptHeaders: Record<string, string> = { ...baseHeaders };
      if (attemptCount > 0) {
        attemptHeaders['X-Retry-Count'] = String(attemptCount);
      }

      const requestInit: RequestInit = {
        method,
        headers: attemptHeaders
      };
      if (serializedBody !== undefined) {
        requestInit.body = serializedBody;
      }
      if (signal !== undefined) {
        requestInit.signal = signal;
      }
      if (includeCredentials) {
        requestInit.credentials = 'include';
      }

      try {
        res = await fetchImpl(requestInfo.url, requestInit);
      } catch (fetchError: unknown) {
        const err = fetchError as { name?: string; code?: string } | undefined;
        const isAborted =
          err?.name === 'AbortError' ||
          err?.code === 'ABORT_ERR' ||
          (err?.name === 'TimeoutError' && Boolean(signal?.aborted));
        const isRetryableMethod = RETRYABLE_METHODS.includes(
          method as (typeof RETRYABLE_METHODS)[number]
        );

        if (
          !isAborted &&
          isRetryableMethod &&
          retryEnabled &&
          attemptCount < DEFAULT_MAX_RETRIES
        ) {
          const delay = getRetryDelay(attemptCount);
          attemptCount++;
          await sleep(delay, signal);
          continue;
        }
        throw fetchError;
      }

      if (
        res.status === 401 &&
        currentAuthToken?.accessToken &&
        !hasRefreshedAuth
      ) {
        hasRefreshedAuth = true;
        const refreshedToken = await this.authProvider
          ?.getToken({ forceRefresh: true })
          .then(data => data ?? null)
          .catch(() => null);
        if (
          refreshedToken?.accessToken &&
          refreshedToken.accessToken !== currentAuthToken.accessToken
        ) {
          if (typeof res.body?.cancel === 'function') {
            void res.body.cancel().catch(() => {});
          }
          currentAuthToken = refreshedToken;
          baseHeaders[FirebaseHeaders.FIREBASE_AUTH_TOKEN] =
            refreshedToken.accessToken;
          continue;
        }
      }

      if (
        retryEnabled &&
        attemptCount < DEFAULT_MAX_RETRIES &&
        RETRYABLE_METHODS.includes(
          method as (typeof RETRYABLE_METHODS)[number]
        ) &&
        RETRYABLE_STATUS_CODES.includes(
          res.status as (typeof RETRYABLE_STATUS_CODES)[number]
        )
      ) {
        const retryAfterHeader = res.headers?.get('Retry-After') ?? null;
        const parsedRetryAfter =
          retryAfterHeader !== null
            ? Number.parseInt(retryAfterHeader, 10)
            : Number.NaN;
        const delay = !Number.isNaN(parsedRetryAfter)
          ? Math.max(0, parsedRetryAfter) * 1000
          : getRetryDelay(attemptCount);
        await res.text().catch(() => {});
        attemptCount++;
        await sleep(delay, signal);
        continue;
      }

      break;
    }

    return this.processResponse<T>(res, method, baseHeaders);
  }

  /**
   * Parses the raw HTTP `Response` into an {@link OperationResult}.
   */
  private async processResponse<T>(
    res: Response,
    method: string,
    headers: Record<string, string>
  ): Promise<OperationResult<T>> {
    if (res.ok) {
      let data: unknown = null;
      let count: number | null = null;

      if (method !== 'HEAD') {
        const body = await res.text();
        if (body !== '') {
          const accept = headers['accept'];
          if (accept === 'text/csv') {
            data = body;
          } else if (accept?.includes('application/vnd.pgrst.plan+text')) {
            data = body;
          } else {
            try {
              data = JSON.parse(body);
            } catch {
              const failure: OperationFailure = {
                success: false,
                data: null,
                count: null,
                status: res.status,
                statusText: res.statusText,
                error: new FirebaseSqlError(
                  Code.OTHER,
                  body,
                  FirebaseSqlErrorCategory.SQL_POSTGREST,
                  undefined,
                  undefined,
                  res.status
                )
              };
              return failure;
            }
          }
        }
      }

      const countHeader = headers['prefer']?.match(
        /count=(exact|planned|estimated)/
      );
      const contentRange = res.headers?.get('content-range')?.split('/');
      if (countHeader && contentRange && contentRange.length > 1) {
        const parsedCount = Number.parseInt(contentRange[1]!, 10);
        count = Number.isNaN(parsedCount) ? null : parsedCount;
      }

      const successResult: OperationSuccess<T> = {
        success: true,
        error: null,
        data: data as T,
        count,
        status: res.status,
        statusText: res.statusText
      };
      return successResult;
    }

    const body = await res.text();
    let parsed: Record<string, unknown> | undefined;
    try {
      const json = JSON.parse(body);
      if (Array.isArray(json) && res.status === 404) {
        return {
          success: true,
          error: null,
          data: [] as unknown as T,
          count: null,
          status: 200,
          statusText: 'OK'
        };
      }
      if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
        parsed = json as Record<string, unknown>;
      }
    } catch {
      if (res.status === 404 && body === '') {
        return {
          success: true,
          error: null,
          data: null as T,
          count: null,
          status: 204,
          statusText: 'No Content'
        };
      }
    }

    // PostgREST / PostgreSQL error object ({ code, message, details, hint })
    if (typeof parsed?.code === 'string') {
      return {
        success: false,
        data: null,
        count: null,
        status: res.status,
        statusText: res.statusText,
        error: new FirebaseSqlError(
          parsed.code,
          typeof parsed.message === 'string' ? parsed.message : res.statusText,
          FirebaseSqlErrorCategory.SQL_POSTGREST,
          typeof parsed.details === 'string' ? parsed.details : undefined,
          typeof parsed.hint === 'string' ? parsed.hint : undefined,
          res.status
        )
      };
    }

    // Platform / gateway / fallback error
    const nestedError =
      typeof parsed?.error === 'object' && parsed.error !== null
        ? (parsed.error as Record<string, unknown>)
        : undefined;
    const message =
      (typeof nestedError?.message === 'string' && nestedError.message) ||
      (typeof parsed?.message === 'string' && parsed.message) ||
      body ||
      res.statusText;
    const code =
      res.status === 401 || res.status === 403 ? Code.UNAUTHORIZED : Code.OTHER;

    return {
      success: false,
      data: null,
      count: null,
      status: res.status,
      statusText: res.statusText,
      error: new FirebaseSqlError(
        code,
        message,
        FirebaseSqlErrorCategory.SQL_PLATFORM,
        undefined,
        undefined,
        res.status
      )
    };
  }
}
