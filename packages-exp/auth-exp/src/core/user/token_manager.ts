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
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { AuthErrorCode } from '../errors';
import { PersistedBlob } from '../persistence';
import { _assert, debugFail } from '../util/assert';

/**
 * The number of milliseconds before the official expiration time of a token
 * to refresh that token, to provide a buffer for RPCs to complete.
 *
 * @internal
 */
export const enum Buffer {
  TOKEN_REFRESH = 30_000
}

export class StsTokenManager {
  refreshToken: string | null = null;
  accessToken: string | null = null;
  expirationTime: number | null = null;

  get isExpired(): boolean {
    return (
      !this.expirationTime ||
      Date.now() > this.expirationTime - Buffer.TOKEN_REFRESH
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

  async getToken(auth: Auth, forceRefresh = false): Promise<string | null> {
    _assert(
      !this.accessToken || this.refreshToken,
      auth,
      AuthErrorCode.TOKEN_EXPIRED,
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

  clearRefreshToken(): void {
    this.refreshToken = null;
  }

  private async refresh(auth: Auth, oldToken: string): Promise<void> {
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
    return manager;
  }

  toJSON(): object {
    return {
      refreshToken: this.refreshToken,
      accessToken: this.accessToken,
      expirationTime: this.expirationTime
    };
  }

  _assign(stsTokenManager: StsTokenManager): void {
    this.accessToken = stsTokenManager.accessToken;
    this.refreshToken = stsTokenManager.refreshToken;
    this.expirationTime = stsTokenManager.expirationTime;
  }

  _clone(): StsTokenManager {
    return Object.assign(new StsTokenManager(), this.toJSON());
  }

  _performRefresh(): never {
    return debugFail('not implemented');
  }
}
