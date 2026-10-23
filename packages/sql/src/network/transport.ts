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
import { isCloudWorkstation } from '@firebase/util';

import { SqlServiceSettings } from '../core/settings';
import { AppCheckTokenProvider } from '../core/tokenProviders/AppCheckTokenProvider';
import { FirebaseAuthTokenProvider } from '../core/tokenProviders/FirebaseAuthTokenProvider';
import { logDebug } from '../logger';

import { Fetch, getFetch } from './fetch';
import { FirebaseHeaders, resolveRequestHeaders } from './headers';

/**
 * Interface defining the external API of the transport layer.
 * @internal
 */
export interface FirebaseSqlTransportInterface {
  readonly settings?: SqlServiceSettings;

  /**
   * Constructs and executes an FSQL HTTP request, and returns the response.
   */
  invokePostgrestOperation(url: string, init?: RequestInit): Promise<Response>;

  /**
   * Callback invoked when the Firebase Auth token is refreshed or changed. Note that this callback
   * is called immediately asynchronously when the Auth Provider is initialized to provide
   * the initial auth state.
   * @param token The new access token or null if signed out.
   */
  onAuthTokenChanged: (token: string | null) => void;
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
}

/**
 * HTTP transport layer for Firebase SQL.
 * @internal
 */
export class FirebaseSqlTransport implements FirebaseSqlTransportInterface {
  readonly settings?: SqlServiceSettings;
  protected _appId?: string;
  protected _authToken: string | null = null;
  protected authProvider?: FirebaseAuthTokenProvider;
  protected appCheckProvider?: AppCheckTokenProvider;

  constructor(options: FirebaseSqlTransportOptions = {}) {
    this.settings = options.settings;
    this._appId = options.appId;
    this.authProvider = options.authTokenProvider;
    this.appCheckProvider = options.appCheckTokenProvider;
    this.authProvider?.addTokenChangeListener(token => {
      this.onAuthTokenChanged(token);
    });
  }

  /**
   * Callback invoked when the Firebase Auth token is refreshed or changed.
   */
  onAuthTokenChanged = (token: string | null): void => {
    logDebug(`Auth Token Changed: ${token}`);
    this._authToken = token;
  };

  /**
   * Constructs and executes an FSQL HTTP request, and returns the response.
   */
  async invokePostgrestOperation(
    url: string,
    init?: RequestInit
  ): Promise<Response> {
    const fetchImpl = getFetch();

    const [authToken, appCheckToken] = await Promise.all([
      this.authProvider
        ? this.authProvider.getToken({ forceRefresh: false }).catch(() => null)
        : Promise.resolve(null),
      this.appCheckProvider
        ? this.appCheckProvider
            .getToken({ forceRefresh: false })
            .catch(() => null)
        : Promise.resolve(null)
    ]);

    const headers = resolveRequestHeaders(
      authToken,
      appCheckToken,
      init,
      this._appId
    );
    const requestInit = this.buildRequestInit(init, headers, url);

    return fetchImpl(url, requestInit).then(response => {
      if (response.status === 401 && authToken) {
        return this.refreshAuthAndRefetch(
          fetchImpl,
          url,
          requestInit,
          headers,
          authToken,
          response
        );
      }
      return response;
    });
  }

  /**
   * Constructs the final `RequestInit` configuration by merging caller-supplied init options
   * and normalized headers, while applying Cloud Workstation credentials if applicable.
   */
  private buildRequestInit(
    init: RequestInit | undefined,
    headers: Record<string, string>,
    requestUrl: string
  ): RequestInit {
    const requestInit: RequestInit = Object.assign({}, init, { headers });

    // Forward workstation auth cookies when targeting a custom/emulator host in
    // Cloud Workstations, where forwarded ports require cookie auth.
    if (
      !!this.settings?.host &&
      isCloudWorkstation(requestUrl) &&
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
    originalResponse: Response
  ): Promise<Response> {
    const refreshedToken = await this.authProvider
      ?.getToken({ forceRefresh: true })
      .then(data => data ?? null)
      .catch(() => null);
    if (
      refreshedToken?.accessToken &&
      refreshedToken.accessToken !== currentToken.accessToken
    ) {
      originalResponse.body && originalResponse.body.cancel().catch(() => {});
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
}
