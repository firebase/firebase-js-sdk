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

import { IdTokenResult } from '../../model/public_types';
import { NextFn } from '@firebase/util';

import {
  APIUserInfo,
  deleteAccount
} from '../../api/account_management/account';
import { FinalizeMfaResponse } from '../../api/authentication/mfa';
import { AuthInternal } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import {
  MutableUserInfo,
  UserInternal,
  UserParameters
} from '../../model/user';
import { AuthErrorCode } from '../errors';
import { PersistedBlob } from '../persistence';
import { _assert } from '../util/assert';
import { getIdTokenResult } from './id_token_result';
import { _logoutIfInvalidated } from './invalidation';
import { ProactiveRefresh } from './proactive_refresh';
import { _reloadWithoutSaving, reload } from './reload';
import { StsTokenManager } from './token_manager';
import { UserMetadata } from './user_metadata';
import { ProviderId } from '../../model/enums';

function assertStringOrUndefined(
  assertion: unknown,
  appName: string
): asserts assertion is string | undefined {
  _assert(
    typeof assertion === 'string' || typeof assertion === 'undefined',
    AuthErrorCode.INTERNAL_ERROR,
    { appName }
  );
}

export class UserImpl implements UserInternal {
  // For the user object, provider is always Firebase.
  readonly providerId = ProviderId.FIREBASE;
  stsTokenManager: StsTokenManager;
  // Last known accessToken so we know when it changes
  private accessToken: string | null;

  uid: string;
  auth: AuthInternal;
  emailVerified: boolean;
  isAnonymous: boolean;
  tenantId: string | null;
  readonly metadata: UserMetadata;
  providerData: MutableUserInfo[];

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
    this.emailVerified = opt.emailVerified || false;
    this.phoneNumber = opt.phoneNumber || null;
    this.photoURL = opt.photoURL || null;
    this.isAnonymous = opt.isAnonymous || false;
    this.tenantId = opt.tenantId || null;
    this.providerData = opt.providerData ? [...opt.providerData] : [];
    this.metadata = new UserMetadata(
      opt.createdAt || undefined,
      opt.lastLoginAt || undefined
    );
  }

  async getIdToken(forceRefresh?: boolean): Promise<string> {
    const accessToken = await _logoutIfInvalidated(
      this,
      this.stsTokenManager.getToken(this.auth, forceRefresh)
    );
    _assert(accessToken, this.auth, AuthErrorCode.INTERNAL_ERROR);

    if (this.accessToken !== accessToken) {
      this.accessToken = accessToken;
      await this.auth._persistUserIfCurrent(this);
      this.auth._notifyListenersIfCurrent(this);
    }

    return accessToken;
  }

  getIdTokenResult(forceRefresh?: boolean): Promise<IdTokenResult> {
    return getIdTokenResult(this, forceRefresh);
  }

  reload(): Promise<void> {
    return reload(this);
  }

  private reloadUserInfo: APIUserInfo | null = null;
  private reloadListener: NextFn<APIUserInfo> | null = null;

  _assign(user: UserInternal): void {
    if (this === user) {
      return;
    }
    _assert(this.uid === user.uid, this.auth, AuthErrorCode.INTERNAL_ERROR);
    this.displayName = user.displayName;
    this.photoURL = user.photoURL;
    this.email = user.email;
    this.emailVerified = user.emailVerified;
    this.phoneNumber = user.phoneNumber;
    this.isAnonymous = user.isAnonymous;
    this.tenantId = user.tenantId;
    this.providerData = user.providerData.map(userInfo => ({ ...userInfo }));
    this.metadata._copy(user.metadata);
    this.stsTokenManager._assign(user.stsTokenManager);
  }

  _clone(auth: AuthInternal): UserInternal {
    const newUser = new UserImpl({
      ...this,
      auth,
      stsTokenManager: this.stsTokenManager._clone()
    });
    newUser.metadata._copy(this.metadata);
    return newUser;
  }

  _onReload(callback: NextFn<APIUserInfo>): void {
    // There should only ever be one listener, and that is a single instance of MultiFactorUser
    _assert(!this.reloadListener, this.auth, AuthErrorCode.INTERNAL_ERROR);
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
    await _logoutIfInvalidated(this, deleteAccount(this.auth, { idToken }));
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
      ...this.metadata.toJSON(),

      // Required for compatibility with the legacy SDK (go/firebase-auth-sdk-persistence-parsing):
      apiKey: this.auth.config.apiKey,
      appName: this.auth.name
      // Missing authDomain will be tolerated by the legacy SDK.
      // stsTokenManager.apiKey isn't actually required (despite the legacy SDK persisting it).
    };
  }

  get refreshToken(): string {
    return this.stsTokenManager.refreshToken || '';
  }

  static _fromJSON(auth: AuthInternal, object: PersistedBlob): UserInternal {
    const displayName = object.displayName ?? undefined;
    const email = object.email ?? undefined;
    const phoneNumber = object.phoneNumber ?? undefined;
    const photoURL = object.photoURL ?? undefined;
    const tenantId = object.tenantId ?? undefined;
    const _redirectEventId = object._redirectEventId ?? undefined;
    const createdAt = object.createdAt ?? undefined;
    const lastLoginAt = object.lastLoginAt ?? undefined;
    const {
      uid,
      emailVerified,
      isAnonymous,
      providerData,
      stsTokenManager: plainObjectTokenManager
    } = object;

    _assert(uid && plainObjectTokenManager, auth, AuthErrorCode.INTERNAL_ERROR);

    const stsTokenManager = StsTokenManager.fromJSON(
      this.name,
      plainObjectTokenManager as PersistedBlob
    );

    _assert(typeof uid === 'string', auth, AuthErrorCode.INTERNAL_ERROR);
    assertStringOrUndefined(displayName, auth.name);
    assertStringOrUndefined(email, auth.name);
    _assert(
      typeof emailVerified === 'boolean',
      auth,
      AuthErrorCode.INTERNAL_ERROR
    );
    _assert(
      typeof isAnonymous === 'boolean',
      auth,
      AuthErrorCode.INTERNAL_ERROR
    );
    assertStringOrUndefined(phoneNumber, auth.name);
    assertStringOrUndefined(photoURL, auth.name);
    assertStringOrUndefined(tenantId, auth.name);
    assertStringOrUndefined(_redirectEventId, auth.name);
    assertStringOrUndefined(createdAt, auth.name);
    assertStringOrUndefined(lastLoginAt, auth.name);
    const user = new UserImpl({
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
    auth: AuthInternal,
    idTokenResponse: IdTokenResponse,
    isAnonymous: boolean = false
  ): Promise<UserInternal> {
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
