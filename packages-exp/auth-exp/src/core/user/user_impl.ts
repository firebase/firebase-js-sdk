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

import { IdTokenResult } from '@firebase/auth-types-exp';

import { deleteAccount } from '../../api/account_management/account';
import { Auth } from '../../model/auth';
import { User } from '../../model/user';
import { PersistedBlob } from '../persistence';
import { ProviderId } from '../providers';
import { assert } from '../util/assert';
import { getIdTokenResult } from './id_token_result';
import { reload } from './reload';
import { StsTokenManager } from './token_manager';

export interface UserParameters {
  uid: string;
  auth: Auth;
  stsTokenManager: StsTokenManager;

  displayName?: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
}

function assertStringOrUndefined(
  assertion: unknown,
  appName: string
): asserts assertion is string | undefined {
  assert(
    typeof assertion === 'string' || typeof assertion === 'undefined',
    appName
  );
}

export class UserImpl implements User {
  // For the user object, provider is always Firebase.
  readonly providerId = ProviderId.FIREBASE;
  stsTokenManager: StsTokenManager;
  refreshToken = '';

  uid: string;
  auth: Auth;
  emailVerified = false;
  tenantId = null;
  metadata = {};
  providerData = [];

  // Optional fields from UserInfo
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  isAnonymous = false;

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
    const tokens = await this.stsTokenManager.getToken(this.auth, forceRefresh);
    assert(tokens, this.auth.name);

    const { refreshToken, accessToken, wasRefreshed } = tokens;
    this.refreshToken = refreshToken || '';

    if (wasRefreshed && this.auth.currentUser === this) {
      this.auth._notifyStateListeners();
    }

    return accessToken;
  }

  getIdTokenResult(forceRefresh?: boolean): Promise<IdTokenResult> {
    return getIdTokenResult(this, forceRefresh);
  }

  reload(): Promise<void> {
    return reload(this);
  }

  async delete(): Promise<void> {
    const idToken = await this.getIdToken();
    await deleteAccount(this.auth, { idToken });
    this.stsTokenManager.clearRefreshToken();

    // TODO: Determine if cancellable-promises are necessary to use in this class so that delete()
    //       cancels pending actions...

    return this.auth.signOut();
  }

  toPlainObject(): PersistedBlob {
    return {
      uid: this.uid,
      stsTokenManager: this.stsTokenManager.toPlainObject(),
      displayName: this.displayName || undefined,
      email: this.email || undefined,
      phoneNumber: this.phoneNumber || undefined,
      photoURL: this.phoneNumber || undefined
    };
  }

  static fromPlainObject(auth: Auth, object: PersistedBlob): User {
    const {
      uid,
      stsTokenManager: plainObjectTokenManager,
      displayName,
      email,
      phoneNumber,
      photoURL
    } = object;

    assert(uid && plainObjectTokenManager, auth.name);

    const stsTokenManager = StsTokenManager.fromPlainObject(
      auth.name,
      plainObjectTokenManager as PersistedBlob
    );

    assert(typeof uid === 'string', auth.name);
    assertStringOrUndefined(displayName, auth.name);
    assertStringOrUndefined(email, auth.name);
    assertStringOrUndefined(phoneNumber, auth.name);
    assertStringOrUndefined(photoURL, auth.name);
    return new UserImpl({
      uid,
      auth,
      stsTokenManager,
      displayName,
      email,
      phoneNumber,
      photoURL
    });
  }
}
