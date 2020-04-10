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

import { User } from '../model/user';
import { Auth } from '../model/auth';
import { IdTokenResult } from '../model/id_token';
import { ProviderId } from './providers';

export interface UserParameters {
  uid: string;
  auth: Auth;

  displayName?: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
}

export class UserImpl implements User {
  // For the user object, provider is always Firebase.
  readonly providerId = ProviderId.FIREBASE;

  uid: string;
  auth: Auth;

  // Optional fields from UserInfo
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;

  constructor({ uid, auth, ...opt }: UserParameters) {
    this.uid = uid;
    this.auth = auth;
    this.displayName = opt.displayName || null;
    this.email = opt.email || null;
    this.phoneNumber = opt.phoneNumber || null;
    this.photoURL = opt.photoURL || null;
  }

  getIdToken(forceRefresh?: boolean): Promise<string> {
    throw new Error(`Method not implemented. forceRefresh: ${forceRefresh}`);
  }

  getIdTokenResult(forceRefresh?: boolean): Promise<IdTokenResult> {
    throw new Error(`Method not implemented. forceRefresh: ${forceRefresh}`);
  }

  reload(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  delete(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
