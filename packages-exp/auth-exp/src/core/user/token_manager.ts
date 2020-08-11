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

import { requestStsToken } from '../../api/authentication/token';
import { IdTokenResponse } from '../../model/id_token';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { PersistedBlob } from '../persistence';
import { assert, debugFail } from '../util/assert';
import { FinalizeMfaResponse } from '../../api/authentication/mfa';
import { AuthCore } from '../../model/auth';

/**
 * The number of milliseconds before the official expiration time of a token
 * to refresh that token, to provide a buffer for RPCs to complete.
 */
export const TOKEN_REFRESH_BUFFER_MS = 30_000;

export interface Tokens {
  accessToken: string;
  refreshToken: string | null;
  wasRefreshed: boolean;
}

export class StsTokenManager {
  refreshToken: string | null = null;
  accessToken: string | null = null;
  expirationTime: number | null = null;

  get isExpired(): boolean {
    return (
      !this.expirationTime ||
      Date.now() > this.expirationTime - TOKEN_REFRESH_BUFFER_MS
    );
  }

  updateFromServerResponse(
    response: IdTokenResponse | FinalizeMfaResponse
  ): void {
    this.updateTokensAndExpiration(
      response.idToken,
      response.refreshToken,
      'expiresIn' in response ? response.expiresIn : undefined
    );
  }

  async getToken(auth: AuthCore, forceRefresh = false): Promise<Tokens | null> {
    if (!forceRefresh && this.accessToken && !this.isExpired) {
      return {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        wasRefreshed: false
      };
    }

    if (this.accessToken && !this.refreshToken) {
      throw AUTH_ERROR_FACTORY.create(AuthErrorCode.TOKEN_EXPIRED, {
        appName: auth.name
      });
    }

    if (!this.refreshToken) {
      return null;
    }

    await this.refresh(auth, this.refreshToken);
    return {
      accessToken: this.accessToken!,
      refreshToken: this.refreshToken,
      wasRefreshed: true
    };
  }

  clearRefreshToken(): void {
    this.refreshToken = null;
  }

  private async refresh(auth: AuthCore, oldToken: string): Promise<void> {
    const { accessToken, refreshToken, expiresIn } = await requestStsToken(
      auth,
      oldToken
    );
    this.updateTokensAndExpiration(accessToken, refreshToken, expiresIn);
  }

  private updateTokensAndExpiration(
    accessToken?: string,
    refreshToken?: string,
    expiresInSec?: string
  ): void {
    this.refreshToken = refreshToken || null;
    this.accessToken = accessToken || null;
    if (expiresInSec) {
      this.expirationTime = Date.now() + Number(expiresInSec) * 1000;
    }
  }

  static fromJSON(appName: string, object: PersistedBlob): StsTokenManager {
    const { refreshToken, accessToken, expirationTime } = object;

    const manager = new StsTokenManager();
    if (refreshToken) {
      assert(typeof refreshToken === 'string', appName);
      manager.refreshToken = refreshToken;
    }
    if (accessToken) {
      assert(typeof accessToken === 'string', appName);
      manager.accessToken = accessToken;
    }
    if (expirationTime) {
      assert(typeof expirationTime === 'number', appName);
      manager.expirationTime = expirationTime;
    }
    return manager;
  }

  toJSON(): object {
    return {
      refreshToken: this.refreshToken,
      accessToken: this.accessToken,
      expirationTime: this.expirationTime
    };
  }

  _performRefresh(): never {
    return debugFail('not implemented');
  }
}
