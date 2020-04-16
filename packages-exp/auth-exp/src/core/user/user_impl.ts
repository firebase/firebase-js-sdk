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

import { Auth } from '../../model/auth';
import { IdTokenResult } from '../../model/id_token';
import { User } from '../../model/user';
import { ProviderId } from '../providers';
import { StsTokenManager } from './token_manager';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';

export interface UserParameters {
  uid: string;
  auth: Auth;
  stsTokenManager: StsTokenManager;

  displayName?: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
}

export class UserImpl implements User {
  // For the user object, provider is always Firebase.
  readonly providerId = ProviderId.FIREBASE;
  stsTokenManager: StsTokenManager;
  refreshToken = '';

  uid: string;
  auth: Auth;

  // Optional fields from UserInfo
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;

  constructor({ uid, auth, stsTokenManager, ...opt }: UserParameters) {
    this.uid = uid;
    this.auth = auth;
    this.stsTokenManager = stsTokenManager;
    this.displayName = opt.displayName || null;
    this.email = opt.email || null;
    this.phoneNumber = opt.phoneNumber || null;
    this.photoURL = opt.photoURL || null;
  }

  async getIdToken(forceRefresh?: boolean): Promise<string> {
    const { refreshToken, accessToken } = await this.stsTokenManager.getToken(
      forceRefresh
    );
    this.refreshToken = refreshToken || '';

    // TODO: notify listeners at this point
    return accessToken;
  }

  async getIdTokenResult(forceRefresh?: boolean): Promise<IdTokenResult> {
    await this.getIdToken(forceRefresh);
    // TODO: Parse token
    throw new Error('Method not implemented');
  }

  reload(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  delete(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  static fromPlainObject(auth: Auth, object: { [key: string]: unknown }): User {
    const {
      uid,
      stsTokenManager: plainObjectTokenManager,
      displayName,
      email,
      phoneNumber,
      photoURL
    } = object;

    const internalError = AUTH_ERROR_FACTORY.create(
      AuthErrorCode.INTERNAL_ERROR,
      { appName: auth.name }
    );
    function assertStringIfExists(value: unknown): string | undefined {
      if (typeof value !== 'string' && typeof value !== 'undefined') {
        throw internalError;
      }
      return value;
    }

    if (typeof uid !== 'string' || !plainObjectTokenManager) {
      throw internalError;
    }

    const stsTokenManager = StsTokenManager.fromPlainObject(
      auth.name,
      plainObjectTokenManager as { [key: string]: unknown },
    );

    return new UserImpl({
      uid,
      auth,
      stsTokenManager,
      displayName: assertStringIfExists(displayName),
      email: assertStringIfExists(email),
      phoneNumber: assertStringIfExists(phoneNumber),
      photoURL: assertStringIfExists(photoURL)
    });
  }
}
