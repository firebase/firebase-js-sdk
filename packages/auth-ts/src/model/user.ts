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

import {
  IdTokenResult,
  IdToken,
  parseIdToken,
  IdTokenResponse
} from './id_token';
import { deleteUser } from '../core/account_management/delete';
import { Auth } from './auth';

export interface UserInfo {
  readonly uid: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly phoneNumber: string | null;
  readonly photoURL: string | null;
}

export interface UserParameters {
  stsTokenManager: StsTokenManager;
  uid: string;
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
  isAnonymous?: boolean;
}

export class User implements UserInfo {
  readonly stsTokenManager: StsTokenManager;
  readonly uid: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly phoneNumber: string | null;
  readonly photoURL: string | null;
  readonly isAnonymous: boolean;

  constructor(params: UserParameters) {
    this.stsTokenManager = params.stsTokenManager;
    this.uid = params.uid;
    this.displayName = params.displayName || null;
    this.email = params.email || null;
    this.phoneNumber = params.phoneNumber || null;
    this.photoURL = params.photoURL || null;
    this.isAnonymous = params.isAnonymous || false;
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

  async delete(auth: Auth): Promise<void> {
    return deleteUser(auth, this);
  }
}

export class StsTokenManager {
  readonly refreshToken: string;
  readonly accessToken: IdToken;
  readonly expirationTime: number;
  constructor(idTokenResponse: IdTokenResponse) {
    this.refreshToken = idTokenResponse.refreshToken;
    this.accessToken = idTokenResponse.idToken;
    this.expirationTime = StsTokenManager.calcOffsetTimestamp_(
      idTokenResponse.expiresIn
    );
  }

  private static calcOffsetTimestamp_(offset: string): number {
    return Date.now() + +offset * 1000;
  }
}
