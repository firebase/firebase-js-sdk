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

import { IdTokenResponse } from '../../model/id_token';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';

/**
 * The number of milliseconds before the official expiration time of a token
 * to refresh that token, to provide a buffer for RPCs to complete.
 */
export const TOKEN_REFRESH_BUFFER_MS = 30_000;

export interface Tokens {
  accessToken: string;
  refreshToken: string | null;
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

  updateFromServerResponse({
    idToken,
    refreshToken,
    expiresIn: expiresInSec
  }: IdTokenResponse): void {
    this.refreshToken = refreshToken;
    this.accessToken = idToken;
    this.expirationTime = Date.now() + Number(expiresInSec) * 1000;
  }

  async getToken(forceRefresh = false): Promise<Tokens> {
    if (!forceRefresh && this.accessToken && !this.isExpired) {
      return {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken
      };
    }

    throw new Error('StsTokenManager: token refresh not implemented');
  }

  toPlainObject(): object {
    return {
      refreshToken: this.refreshToken,
      accessToken: this.accessToken,
      expirationTime: this.expirationTime
    };
  }

  static fromPlainObject(
    appName: string,
    object: { [key: string]: unknown }
  ): StsTokenManager {
    const { refreshToken, accessToken, expirationTime } = object;
    const internalError = AUTH_ERROR_FACTORY.create(
      AuthErrorCode.INTERNAL_ERROR,
      { appName }
    );
    if (refreshToken && typeof refreshToken !== 'string') {
      throw internalError;
    }
    if (accessToken && typeof accessToken !== 'string') {
      throw internalError;
    }
    if (expirationTime && typeof expirationTime !== 'number') {
      throw internalError;
    }

    const manager = new StsTokenManager();
    Object.assign(manager, { refreshToken, accessToken, expirationTime });
    return manager;
  }

  // TODO: There are a few more methods in here that need implemented:
  //    # toPlainObject
  //    # fromPlainObject
  //    # (private) performRefresh
}
