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

import { PersistedBlob } from '../core/persistence';
import { ProviderId } from '../core/providers';
import { Auth } from './auth';

export interface UserMetadata {
  readonly creationTime?: string;
  readonly lastSignInTime?: string;
}

export interface User extends externs.User {
  uid: string;
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;

  auth: Auth;
  providerId: ProviderId.FIREBASE;
  refreshToken: string;
  emailVerified: boolean;
  tenantId: string | null;
  providerData: externs.UserInfo[];
  metadata: UserMetadata;

  getIdToken(forceRefresh?: boolean): Promise<string>;
  getIdTokenResult(forceRefresh?: boolean): Promise<externs.IdTokenResult>;
  reload(): Promise<void>;
  delete(): Promise<void>;
  toPlainObject(): PersistedBlob;
}
