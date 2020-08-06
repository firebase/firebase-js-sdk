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
import { Auth } from './auth';
import { IdTokenResponse } from './id_token';

type MutableUserInfo = {
  -readonly [K in keyof externs.UserInfo]: externs.UserInfo[K];
};

export interface User extends externs.User {
  uid: string;
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;

  auth: Auth;
  providerId: externs.ProviderId.FIREBASE;
  refreshToken: string;
  emailVerified: boolean;
  tenantId: string | null;
  providerData: MutableUserInfo[];
  metadata: externs.UserMetadata;

  _updateTokensIfNecessary(
    response: IdTokenResponse | FinalizeMfaResponse,
    reload?: boolean
  ): Promise<void>;

  _onReload: (cb: NextFn<APIUserInfo>) => void;
  _notifyReloadListener: NextFn<APIUserInfo>;

  getIdToken(forceRefresh?: boolean): Promise<string>;
  getIdTokenResult(forceRefresh?: boolean): Promise<externs.IdTokenResult>;
  reload(): Promise<void>;
  delete(): Promise<void>;
  toPlainObject(): PersistedBlob;
}

export interface UserCredential extends externs.UserCredential {
  user: User;
}
