/**
 * @license
 * Copyright 2019 Google Inc.
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

import { IdTokenResult, IdToken, parseIdToken, IdTokenResponse } from './id_token';
import { Auth } from '..';

export interface UserInfo {
  readonly uid: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly phoneNumber: string | null;
  readonly photoURL: string | null;
}

export class User implements UserInfo {
  readonly apiKey: string;
  readonly appName: string;
  readonly authDomain?: string;
  constructor(
    auth: Auth, 
    public readonly stsTokenManager: StsTokenManager,
    public readonly uid: string,
    public readonly displayName: string | null = null,
    public readonly email: string | null = null,
    public readonly phoneNumber: string | null = null,
    public readonly photoURL: string | null = null,
    public readonly isAnonymous: boolean = false
  ) {
    this.apiKey = auth.config.apiKey;
    this.appName = auth.name;
    this.authDomain = auth.config.authDomain;
  }

  getIdToken(forceRefresh: boolean = false): Promise<IdToken> {
    return Promise.resolve(this.stsTokenManager.accessToken);
  }

  async getIdTokenResult(
    forceRefresh: boolean = false
  ): Promise<IdTokenResult> {
    return parseIdToken(this.stsTokenManager.accessToken);
  }

  async reload(): Promise<User> {
    // TODO: this should call getAccountInfo and set all the additional fields
    return this;
  }
}

export class StsTokenManager {
  readonly refreshToken: string;
  readonly accessToken: IdToken;
  readonly expirationTime: number;
  constructor(public readonly apiKey: string, idTokenResponse: IdTokenResponse) {
    this.refreshToken = idTokenResponse.refreshToken;
    this.accessToken = idTokenResponse.idToken;
    this.expirationTime = StsTokenManager.calcOffsetTimestamp_(idTokenResponse.expiresIn);
  }

  private static calcOffsetTimestamp_(offset: string): number {
    return Date.now() + +offset * 1000;
  }
}