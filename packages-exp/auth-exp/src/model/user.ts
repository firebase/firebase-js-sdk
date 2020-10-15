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

import * as externs from '@firebase/auth-types-exp';
import { NextFn } from '@firebase/util';
import { APIUserInfo } from '../api/account_management/account';
import { FinalizeMfaResponse } from '../api/authentication/mfa';
import { PersistedBlob } from '../core/persistence';
import { StsTokenManager } from '../core/user/token_manager';
import { UserMetadata } from '../core/user/user_metadata';
import { Auth } from './auth';
import { IdTokenResponse, TaggedWithTokenResponse } from './id_token';

/** @internal */
export type MutableUserInfo = {
  -readonly [K in keyof externs.UserInfo]: externs.UserInfo[K];
};

/** @internal */
export interface UserParameters {
  uid: string;
  auth: Auth;
  stsTokenManager: StsTokenManager;

  displayName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  photoURL?: string | null;
  isAnonymous?: boolean | null;
  emailVerified?: boolean | null;
  tenantId?: string | null;

  createdAt?: string | null;
  lastLoginAt?: string | null;
}

/** {@inheritdoc @firebase/auth-types#User} */
export interface User extends externs.User {
  /**
   * {@inheritdoc @firebase/auth-types#UserInfo.displayName}
   * @readonly
   */
  displayName: string | null;
  /**
   * {@inheritdoc @firebase/auth-types#UserInfo.email}
   * @readonly
   */
  email: string | null;
  /**
   * {@inheritdoc @firebase/auth-types#UserInfo.phoneNumber}
   * @readonly
   */
  phoneNumber: string | null;
  /**
   * {@inheritdoc @firebase/auth-types#UserInfo.photoURL}
   * @readonly
   */
  photoURL: string | null;

  /** @internal */
  auth: Auth;
  /**
   * {@inheritdoc @firebase/auth-types#UserInfo.providerId}
   * @readonly
   */
  providerId: externs.ProviderId.FIREBASE;
  /**
   * {@inheritdoc @firebase/auth-types#User.refreshToken}
   * @readonly
   */
  refreshToken: string;
  /**
   * {@inheritdoc @firebase/auth-types#User.emailVerified}
   * @readonly
   */
  emailVerified: boolean;
  /**
   * {@inheritdoc @firebase/auth-types#User.tenantId}
   * @readonly
   */
  tenantId: string | null;
  /**
   * {@inheritdoc @firebase/auth-types#User.providerData}
   * @readonly
   */
  providerData: MutableUserInfo[];
  /**
   * {@inheritdoc @firebase/auth-types#User.metadata}
   * @readonly
   */
  metadata: UserMetadata;

  /** @internal */
  stsTokenManager: StsTokenManager;
  /** @internal */
  _redirectEventId?: string;

  /** @internal */
  _updateTokensIfNecessary(
    response: IdTokenResponse | FinalizeMfaResponse,
    reload?: boolean
  ): Promise<void>;

  /** @internal */
  _assign(user: User): void;
  /** @internal */
  _clone(): User;
  /** @internal */
  _onReload: (cb: NextFn<APIUserInfo>) => void;
  /** @internal */
  _notifyReloadListener: NextFn<APIUserInfo>;
  /** @internal */
  _startProactiveRefresh: () => void;
  /** @internal */
  _stopProactiveRefresh: () => void;

  /** {@inheritdoc @firebase/auth-types#User.getIdToken} */
  getIdToken(forceRefresh?: boolean): Promise<string>;
  /** {@inheritdoc @firebase/auth-types#User.getIdTokenResult} */
  getIdTokenResult(forceRefresh?: boolean): Promise<externs.IdTokenResult>;
  /** {@inheritdoc @firebase/auth-types#User.reload} */
  reload(): Promise<void>;
  /** {@inheritdoc @firebase/auth-types#User.delete} */
  delete(): Promise<void>;
  /** {@inheritdoc @firebase/auth-types#User.toJSON} */
  toJSON(): PersistedBlob;
}

/** {@inheritdoc @firebase/auth-types#UserCredential} */
export interface UserCredential
  extends externs.UserCredential,
    TaggedWithTokenResponse {
  /** {@inheritdoc @firebase/auth-types#UserCredential.user} */
  user: User;
}
