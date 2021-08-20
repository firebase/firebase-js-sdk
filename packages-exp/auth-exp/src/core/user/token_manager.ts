/**
 * @license
 * Copyright 2020 Google LLC
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

import { FinalizeMfaResponse } from '../../api/authentication/mfa';
import { requestStsToken } from '../../api/authentication/token';
import { AuthInternal } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { AuthErrorCode } from '../errors';
import { PersistedBlob } from '../persistence';
import { _assert, debugFail } from '../util/assert';
import { _tokenExpiresIn } from './id_token_result';

/**
 * The number of milliseconds before the official expiration time of a token
 * to refresh that token, to provide a buffer for RPCs to complete.
 */
export const enum Buffer {
  TOKEN_REFRESH = 30_000
}

/**
 * We need to mark this class as internal explicitly to exclude it in the public typings, because
 * it references AuthInternal which has a circular dependency with UserInternal.
 *
 * @internal
 */
export class StsTokenManager {
  refreshToken: string | null = null;
  accessToken: string | null = null;
  expirationTime: number | null = null;
  isPassthroughMode: boolean = false;

  get isExpired(): boolean {
    return (
      !this.expirationTime ||
      Date.now() > this.expirationTime - Buffer.TOKEN_REFRESH
    );
  }

  updateFromServerResponse(
    response: IdTokenResponse | FinalizeMfaResponse
  ): void {
    _assert(response.idToken, AuthErrorCode.INTERNAL_ERROR);
    const expiresIn =
      'expiresIn' in response && typeof response.expiresIn !== 'undefined'
        ? Number(response.expiresIn)
        : _tokenExpiresIn(response.idToken);
    this.updateTokensAndExpiration(
      response.idToken,
      response.refreshToken,
      expiresIn
    );
  }

  async getToken(
    auth: AuthInternal,
    forceRefresh = false
  ): Promise<string | null> {
    if (this.isPassthroughMode) {
      return this.getTokenAndTriggerCallback(auth, forceRefresh);
    } else {
      return this.getTokenAndRefreshIfNeeded(auth, forceRefresh);
    }
  }

  private async getTokenAndRefreshIfNeeded(
    auth: AuthInternal,
    forceRefresh = false
  ): Promise<string | null> {
    _assert(
      !this.accessToken || this.refreshToken,
      auth,
      AuthErrorCode.TOKEN_EXPIRED
    );

    if (!forceRefresh && this.accessToken && !this.isExpired) {
      return this.accessToken;
    }

    if (this.refreshToken) {
      await this.refresh(auth, this.refreshToken!);
      return this.accessToken;
    }

    return null;
  }

  private async getTokenAndTriggerCallback(
    auth: AuthInternal,
    forceRefresh = false
  ): Promise<string | null> {
    if (forceRefresh) {
      _assert(
        auth._refreshWithCustomTokenProvider,
        auth,
        AuthErrorCode.TOKEN_REFRESH_UNAVAILABLE
      );
      return auth._refreshWithCustomTokenProvider();
    }

    if (!this.isExpired) {
      return this.accessToken;
    }

    // isExpired includes a buffer window, during which the access token will still be returned even
    // if a customTokenProvider is not set yet.
    if (!auth._refreshWithCustomTokenProvider) {
      _assert(
        this.expirationTime && Date.now() < this.expirationTime,
        auth,
        AuthErrorCode.TOKEN_REFRESH_UNAVAILABLE
      );
      return this.accessToken;
    }
    return auth._refreshWithCustomTokenProvider();
  }

  clearRefreshToken(): void {
    this.refreshToken = null;
  }

  private async refresh(auth: AuthInternal, oldToken: string): Promise<void> {
    const { accessToken, refreshToken, expiresIn } = await requestStsToken(
      auth,
      oldToken
    );
    this.updateTokensAndExpiration(
      accessToken,
      refreshToken,
      Number(expiresIn)
    );
  }

  private updateTokensAndExpiration(
    accessToken: string,
    refreshToken: string | undefined,
    expiresInSec: number
  ): void {
    this.refreshToken = refreshToken || null;
    this.accessToken = accessToken || null;
    this.expirationTime = Date.now() + expiresInSec * 1000;
    this.isPassthroughMode = !this.refreshToken;
  }

  static fromJSON(appName: string, object: PersistedBlob): StsTokenManager {
    const { refreshToken, accessToken, expirationTime, isPassthroughMode } =
      object;

    const manager = new StsTokenManager();
    if (refreshToken) {
      _assert(typeof refreshToken === 'string', AuthErrorCode.INTERNAL_ERROR, {
        appName
      });
      manager.refreshToken = refreshToken;
    }
    if (accessToken) {
      _assert(typeof accessToken === 'string', AuthErrorCode.INTERNAL_ERROR, {
        appName
      });
      manager.accessToken = accessToken;
    }
    if (expirationTime) {
      _assert(
        typeof expirationTime === 'number',
        AuthErrorCode.INTERNAL_ERROR,
        {
          appName
        }
      );
      manager.expirationTime = expirationTime;
    }
    if (isPassthroughMode) {
      _assert(
        typeof isPassthroughMode === 'boolean',
        AuthErrorCode.INTERNAL_ERROR,
        {
          appName
        }
      );
      manager.isPassthroughMode = isPassthroughMode;
    }
    return manager;
  }

  toJSON(): object {
    return {
      refreshToken: this.refreshToken,
      accessToken: this.accessToken,
      expirationTime: this.expirationTime,
      isPassthroughMode: this.isPassthroughMode
    };
  }

  _assign(stsTokenManager: StsTokenManager): void {
    this.accessToken = stsTokenManager.accessToken;
    this.refreshToken = stsTokenManager.refreshToken;
    this.expirationTime = stsTokenManager.expirationTime;
    this.isPassthroughMode = stsTokenManager.isPassthroughMode;
  }

  _clone(): StsTokenManager {
    return Object.assign(new StsTokenManager(), this.toJSON());
  }

  _performRefresh(): never {
    return debugFail('not implemented');
  }
}
