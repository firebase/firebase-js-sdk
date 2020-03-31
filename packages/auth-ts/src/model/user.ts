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
import { ProviderId } from '../core/providers/index';
import { reload } from '../core/account_management/reload';
import { MultiFactorInfo } from './multi_factor';

export interface UserInfo {
  readonly uid: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly phoneNumber: string | null;
  readonly providerId: string | null;
  readonly photoURL: string | null;
}

export interface AdditionalUserInfo {
  readonly isNewUser: boolean;
  readonly profile: ProfileInfo;
  readonly providerId: string;
  readonly username?: string | null;
}

export interface UserMetadata {
  readonly creationTime?: string;
  readonly lastSignInTime?: string;
}

export interface ProfileInfo {
  displayName?: string | null;
  photoURL?: string | null;
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
  stsTokenManager: StsTokenManager;
  uid: string;
  displayName: string | null;
  email: string | null;
  emailVerified: boolean = false;
  phoneNumber: string | null;
  photoURL: string | null;
  metadata: UserMetadata = {};
  tenantId?: string | null = null;
  isAnonymous: boolean;
  providerData: UserInfo[] = [];
  redirectEventId_: string | null = null;
  mfaInfo_: MultiFactorInfo[] | null = null;

  // On the root user object
  readonly providerId = ProviderId.FIREBASE;

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

  async reload(auth: Auth): Promise<void> {
    return reload(auth, this);
  }

  async delete(auth: Auth): Promise<void> {
    return deleteUser(auth, this);
  }

  static fromPlainObject(object: { [key: string]: any }): User {
    const {
      stsTokenManager: managerObject,
      uid,
      displayName,
      email,
      emailVerified,
      phoneNumber,
      photoURL,
      metadata,
      tenantId,
      isAnonymous,
      providerData,
      redirectEventId_,
      mfaInfo_
    } = object;
    const stsTokenManager = StsTokenManager.fromPlainObject(managerObject);
    const user = new User({
      stsTokenManager,
      uid,
      displayName,
      email,
      phoneNumber,
      photoURL,
      isAnonymous
    });
    Object.assign(user, {
      emailVerified,
      metadata,
      tenantId,
      providerData,
      redirectEventId_,
      mfaInfo_
    });

    return user;
  }
}

export class StsTokenManager {
  // Bang-assert all of these as they are set in the constructor no
  // matter what (just using a helper method)
  refreshToken!: string;
  accessToken!: IdToken;
  expirationTime!: number;

  constructor(idTokenResponse: IdTokenResponse | null) {
    if (idTokenResponse) {
      this.updateFromServerResponse(idTokenResponse);
    }
  }

  updateFromServerResponse(idTokenResponse: IdTokenResponse) {
    if (!idTokenResponse.idToken) {
      return;
    }

    this.refreshToken = idTokenResponse.refreshToken;
    this.accessToken = idTokenResponse.idToken;
    this.expirationTime = StsTokenManager.calcOffsetTimestamp_(
      idTokenResponse.expiresIn
    );
  }

  private static calcOffsetTimestamp_(offset: string): number {
    return Date.now() + +offset * 1000;
  }

  static fromPlainObject(object: { [key: string]: any }): StsTokenManager {
    const manager = new StsTokenManager(null);
    const { refreshToken, accessToken, expirationTime } = object;
    Object.assign(manager, { refreshToken, accessToken, expirationTime });
    return manager;
  }
}
