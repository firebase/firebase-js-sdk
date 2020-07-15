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

import { deleteAccount } from '../../api/account_management/account';
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { User } from '../../model/user';
import { PersistedBlob } from '../persistence';
import { assert } from '../util/assert';
import { getIdTokenResult } from './id_token_result';
import { _reloadWithoutSaving, reload } from './reload';
import { StsTokenManager } from './token_manager';
import { FinalizeMfaResponse } from '../../api/authentication/mfa';

export interface UserParameters {
  uid: string;
  auth: Auth;
  stsTokenManager: StsTokenManager;

  displayName?: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
  isAnonymous?: boolean;
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
  readonly providerId = externs.ProviderId.FIREBASE;
  stsTokenManager: StsTokenManager;

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
  isAnonymous: boolean = false;

  _redirectEventId?: string;

  constructor({ uid, auth, stsTokenManager, ...opt }: UserParameters) {
    this.uid = uid;
    this.auth = auth;
    this.stsTokenManager = stsTokenManager;
    this.displayName = opt.displayName || null;
    this.email = opt.email || null;
    this.phoneNumber = opt.phoneNumber || null;
    this.photoURL = opt.photoURL || null;
    this.isAnonymous = opt.isAnonymous || false;
  }

  async getIdToken(forceRefresh?: boolean): Promise<string> {
    const tokens = await this.stsTokenManager.getToken(this.auth, forceRefresh);
    assert(tokens, this.auth.name);

    const { accessToken, wasRefreshed } = tokens;

    if (wasRefreshed) {
      await this.auth._persistUserIfCurrent(this);
      this.auth._notifyListenersIfCurrent(this);
    }

    return accessToken;
  }

  getIdTokenResult(forceRefresh?: boolean): Promise<externs.IdTokenResult> {
    return getIdTokenResult(this, forceRefresh);
  }

  reload(): Promise<void> {
    return reload(this);
  }

  async _updateTokensIfNecessary(
    response: IdTokenResponse | FinalizeMfaResponse,
    reload = false
  ): Promise<void> {
    let tokensRefreshed = false;
    if (
      response.idToken &&
      response.idToken !== this.stsTokenManager.accessToken
    ) {
      this.stsTokenManager.updateFromServerResponse(response);
      tokensRefreshed = true;
    }

    if (reload) {
      await _reloadWithoutSaving(this);
    }

    await this.auth._persistUserIfCurrent(this);
    if (tokensRefreshed) {
      this.auth._notifyListenersIfCurrent(this);
    }
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
      photoURL: this.phoneNumber || undefined,
      _redirectEventId: this._redirectEventId,
    };
  }

  get refreshToken(): string {
    return this.stsTokenManager.refreshToken || '';
  }

  static fromPlainObject(auth: Auth, object: PersistedBlob): User {
    const {
      uid,
      stsTokenManager: plainObjectTokenManager,
      displayName,
      email,
      phoneNumber,
      photoURL,
      _redirectEventId,
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
    assertStringOrUndefined(_redirectEventId, auth.name);
    const user = new UserImpl({
      uid,
      auth,
      stsTokenManager,
      displayName,
      email,
      phoneNumber,
      photoURL
    });
    if (_redirectEventId) {
      user._redirectEventId = _redirectEventId;
    }

    return user;
  }

  /**
   * Initialize a User from an idToken server response
   * @param auth
   * @param idTokenResponse
   */
  static async _fromIdTokenResponse(
    auth: Auth,
    idTokenResponse: IdTokenResponse,
    isAnonymous: boolean = false
  ): Promise<User> {
    const stsTokenManager = new StsTokenManager();
    stsTokenManager.updateFromServerResponse(idTokenResponse);

    // Initialize the Firebase Auth user.
    const user = new UserImpl({
      uid: idTokenResponse.localId,
      auth,
      stsTokenManager,
      isAnonymous
    });

    // Updates the user info and data and resolves with a user instance.
    await _reloadWithoutSaving(user);
    return user;
  }
}
