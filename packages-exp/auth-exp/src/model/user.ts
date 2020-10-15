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

/** @internal */
export interface User extends externs.User {
  /** @internal */
  displayName: string | null;
  /** @internal */
  email: string | null;
  /** @internal */
  phoneNumber: string | null;
  /** @internal */
  photoURL: string | null;

  /** @internal */
  auth: Auth;
  /** @internal  */
  providerId: externs.ProviderId.FIREBASE;
  /** @internal */
  refreshToken: string;
  /** @internal */
  emailVerified: boolean;
  /** @internal */
  tenantId: string | null;
  /** @internal */
  providerData: MutableUserInfo[];
  /** @internal */
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

  /** @internal */
  getIdToken(forceRefresh?: boolean): Promise<string>;
  /** @internal */
  getIdTokenResult(forceRefresh?: boolean): Promise<externs.IdTokenResult>;
  /** @internal */
  reload(): Promise<void>;
  /** @internal */
  delete(): Promise<void>;
  /** @internal */
  toJSON(): PersistedBlob;
}

/** @internal*/
export interface UserCredential
  extends externs.UserCredential,
    TaggedWithTokenResponse {
  /** @internal */
  user: User;
}
