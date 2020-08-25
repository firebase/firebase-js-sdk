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
import {
  APIUserInfo,
  deleteAccount
} from '../../api/account_management/account';
import { FinalizeMfaResponse } from '../../api/authentication/mfa';
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { MutableUserInfo, User, UserParameters } from '../../model/user';
import { AuthErrorCode } from '../errors';
import { PersistedBlob } from '../persistence';
import { assert } from '../util/assert';
import { getIdTokenResult } from './id_token_result';
import { ProactiveRefresh } from './proactive_refresh';
import { reload, _reloadWithoutSaving } from './reload';
import { StsTokenManager } from './token_manager';
import { UserMetadata } from './user_metadata';

function assertStringOrUndefined(
  assertion: unknown,
  appName: string
): asserts assertion is string | undefined {
  assert(
    typeof assertion === 'string' || typeof assertion === 'undefined',
    AuthErrorCode.INTERNAL_ERROR,
    { appName }
  );
}

export class UserImpl implements User {
  // For the user object, provider is always Firebase.
  readonly providerId = externs.ProviderId.FIREBASE;
  stsTokenManager: StsTokenManager;
  // Last known accessToken so we know when it changes
  private accessToken: string | null;

  uid: string;
  auth: Auth;
  emailVerified = false;
  isAnonymous = false;
  tenantId: string | null = null;
  readonly metadata: UserMetadata;
  providerData: MutableUserInfo[] = [];

  // Optional fields from UserInfo
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;

  _redirectEventId?: string;
  private readonly proactiveRefresh = new ProactiveRefresh(this);

  constructor({ uid, auth, stsTokenManager, ...opt }: UserParameters) {
    this.uid = uid;
    this.auth = auth;
    this.stsTokenManager = stsTokenManager;
    this.accessToken = stsTokenManager.accessToken;
    this.displayName = opt.displayName || null;
    this.email = opt.email || null;
    this.phoneNumber = opt.phoneNumber || null;
    this.photoURL = opt.photoURL || null;
    this.isAnonymous = opt.isAnonymous || false;
    this.metadata = new UserMetadata(opt.createdAt, opt.lastLoginAt);
  }

  async getIdToken(forceRefresh?: boolean): Promise<string> {
    const accessToken = await this.stsTokenManager.getToken(
      this.auth,
      forceRefresh
    );
    assert(accessToken, AuthErrorCode.INTERNAL_ERROR, {
      appName: this.auth.name
    });

    if (this.accessToken !== accessToken) {
      this.accessToken = accessToken;
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

  private reloadUserInfo: APIUserInfo | null = null;
  private reloadListener: NextFn<APIUserInfo> | null = null;

  _copy(user: User): void {
    if (this === user) {
      return;
    }
    assert(this.uid === user.uid, AuthErrorCode.INTERNAL_ERROR, {
      appName: this.auth.name
    });
    this.displayName = user.displayName;
    this.photoURL = user.photoURL;
    this.email = user.email;
    this.emailVerified = user.emailVerified;
    this.phoneNumber = user.phoneNumber;
    this.isAnonymous = user.isAnonymous;
    this.tenantId = user.tenantId;
    this.providerData = user.providerData.map(userInfo => ({ ...userInfo }));
    this.metadata._copy(user.metadata);
    this.stsTokenManager._copy(user.stsTokenManager);
  }

  _onReload(callback: NextFn<APIUserInfo>): void {
    // There should only ever be one listener, and that is a single instance of MultiFactorUser
    assert(!this.reloadListener, AuthErrorCode.INTERNAL_ERROR, {
      appName: this.auth.name
    });
    this.reloadListener = callback;
    if (this.reloadUserInfo) {
      this._notifyReloadListener(this.reloadUserInfo);
      this.reloadUserInfo = null;
    }
  }

  _notifyReloadListener(userInfo: APIUserInfo): void {
    if (this.reloadListener) {
      this.reloadListener(userInfo);
    } else {
      // If no listener is subscribed yet, save the result so it's available when they do subscribe
      this.reloadUserInfo = userInfo;
    }
  }

  _startProactiveRefresh(): void {
    this.proactiveRefresh._start();
  }

  _stopProactiveRefresh(): void {
    this.proactiveRefresh._stop();
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

  toJSON(): PersistedBlob {
    return {
      uid: this.uid,
      email: this.email || undefined,
      emailVerified: this.emailVerified,
      displayName: this.displayName || undefined,
      isAnonymous: this.isAnonymous,
      photoURL: this.photoURL || undefined,
      phoneNumber: this.phoneNumber || undefined,
      tenantId: this.tenantId || undefined,
      providerData: this.providerData.map(userInfo => ({ ...userInfo })),
      stsTokenManager: this.stsTokenManager.toJSON(),
      // Redirect event ID must be maintained in case there is a pending
      // redirect event.
      _redirectEventId: this._redirectEventId,
      ...this.metadata.toJSON()
    };
  }

  get refreshToken(): string {
    return this.stsTokenManager.refreshToken || '';
  }

  static _fromJSON(auth: Auth, object: PersistedBlob): User {
    const {
      uid,
      email,
      emailVerified,
      displayName,
      isAnonymous,
      photoURL,
      phoneNumber,
      tenantId,
      providerData,
      stsTokenManager: plainObjectTokenManager,
      _redirectEventId,
      createdAt,
      lastLoginAt
    } = object;

    assert(uid && plainObjectTokenManager, AuthErrorCode.INTERNAL_ERROR, {
      appName: auth.name
    });

    const stsTokenManager = StsTokenManager.fromJSON(
      this.name,
      plainObjectTokenManager as PersistedBlob
    );

    assert(typeof uid === 'string', AuthErrorCode.INTERNAL_ERROR, {
      appName: auth.name
    });
    assertStringOrUndefined(displayName, auth.name);
    assertStringOrUndefined(email, auth.name);
    assert(typeof emailVerified === 'boolean', AuthErrorCode.INTERNAL_ERROR, {
      appName: auth.name
    });
    assert(typeof isAnonymous === 'boolean', AuthErrorCode.INTERNAL_ERROR, {
      appName: auth.name
    });
    assertStringOrUndefined(phoneNumber, auth.name);
    assertStringOrUndefined(photoURL, auth.name);
    assertStringOrUndefined(tenantId, auth.name);
    assertStringOrUndefined(_redirectEventId, auth.name);
    assertStringOrUndefined(createdAt, auth.name);
    assertStringOrUndefined(lastLoginAt, auth.name);
    const user = auth._createUser({
      uid,
      auth,
      email,
      emailVerified,
      displayName,
      isAnonymous,
      photoURL,
      phoneNumber,
      tenantId,
      stsTokenManager,
      createdAt,
      lastLoginAt
    });

    if (providerData && Array.isArray(providerData)) {
      user.providerData = providerData.map(userInfo => ({ ...userInfo }));
    }

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
    const user = auth._createUser({
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
