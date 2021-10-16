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

import * as exp from '@firebase/auth/internal';
import * as compat from '@firebase/auth-types';
import { Compat } from '@firebase/util';
import { _savePersistenceForRedirect } from './persistence';
import { CompatPopupRedirectResolver } from './popup_redirect';
import {
  convertConfirmationResult,
  convertCredential
} from './user_credential';

export class User implements compat.User, Compat<exp.User> {
  // Maintain a map so that there's always a 1:1 mapping between new User and
  // legacy compat users
  private static readonly USER_MAP = new WeakMap<exp.User, User>();

  readonly multiFactor: compat.MultiFactorUser;

  private constructor(readonly _delegate: exp.User) {
    this.multiFactor = exp.multiFactor(_delegate);
  }

  static getOrCreate(user: exp.User): User {
    if (!User.USER_MAP.has(user)) {
      User.USER_MAP.set(user, new User(user));
    }

    return User.USER_MAP.get(user)!;
  }

  delete(): Promise<void> {
    return this._delegate.delete();
  }
  reload(): Promise<void> {
    return this._delegate.reload();
  }
  toJSON(): object {
    return this._delegate.toJSON();
  }
  getIdTokenResult(forceRefresh?: boolean): Promise<compat.IdTokenResult> {
    return this._delegate.getIdTokenResult(forceRefresh);
  }
  getIdToken(forceRefresh?: boolean): Promise<string> {
    return this._delegate.getIdToken(forceRefresh);
  }
  linkAndRetrieveDataWithCredential(
    credential: compat.AuthCredential
  ): Promise<compat.UserCredential> {
    return this.linkWithCredential(credential);
  }
  async linkWithCredential(
    credential: compat.AuthCredential
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth,
      exp.linkWithCredential(this._delegate, credential as exp.AuthCredential)
    );
  }
  async linkWithPhoneNumber(
    phoneNumber: string,
    applicationVerifier: compat.ApplicationVerifier
  ): Promise<compat.ConfirmationResult> {
    return convertConfirmationResult(
      this.auth,
      exp.linkWithPhoneNumber(this._delegate, phoneNumber, applicationVerifier)
    );
  }
  async linkWithPopup(
    provider: compat.AuthProvider
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth,
      exp.linkWithPopup(
        this._delegate,
        provider as exp.AuthProvider,
        CompatPopupRedirectResolver
      )
    );
  }
  async linkWithRedirect(provider: compat.AuthProvider): Promise<void> {
    await _savePersistenceForRedirect(exp._castAuth(this.auth));
    return exp.linkWithRedirect(
      this._delegate,
      provider as exp.AuthProvider,
      CompatPopupRedirectResolver
    );
  }
  reauthenticateAndRetrieveDataWithCredential(
    credential: compat.AuthCredential
  ): Promise<compat.UserCredential> {
    return this.reauthenticateWithCredential(credential);
  }
  async reauthenticateWithCredential(
    credential: compat.AuthCredential
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth as unknown as exp.Auth,
      exp.reauthenticateWithCredential(
        this._delegate,
        credential as exp.AuthCredential
      )
    );
  }
  reauthenticateWithPhoneNumber(
    phoneNumber: string,
    applicationVerifier: compat.ApplicationVerifier
  ): Promise<compat.ConfirmationResult> {
    return convertConfirmationResult(
      this.auth,
      exp.reauthenticateWithPhoneNumber(
        this._delegate,
        phoneNumber,
        applicationVerifier
      )
    );
  }
  reauthenticateWithPopup(
    provider: compat.AuthProvider
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth,
      exp.reauthenticateWithPopup(
        this._delegate,
        provider as exp.AuthProvider,
        CompatPopupRedirectResolver
      )
    );
  }
  async reauthenticateWithRedirect(
    provider: compat.AuthProvider
  ): Promise<void> {
    await _savePersistenceForRedirect(exp._castAuth(this.auth));
    return exp.reauthenticateWithRedirect(
      this._delegate,
      provider as exp.AuthProvider,
      CompatPopupRedirectResolver
    );
  }
  sendEmailVerification(
    actionCodeSettings?: compat.ActionCodeSettings | null
  ): Promise<void> {
    return exp.sendEmailVerification(this._delegate, actionCodeSettings);
  }
  async unlink(providerId: string): Promise<compat.User> {
    await exp.unlink(this._delegate, providerId);
    return this;
  }
  updateEmail(newEmail: string): Promise<void> {
    return exp.updateEmail(this._delegate, newEmail);
  }
  updatePassword(newPassword: string): Promise<void> {
    return exp.updatePassword(this._delegate, newPassword);
  }
  updatePhoneNumber(phoneCredential: compat.AuthCredential): Promise<void> {
    return exp.updatePhoneNumber(
      this._delegate,
      phoneCredential as exp.PhoneAuthCredential
    );
  }
  updateProfile(profile: {
    displayName?: string | null;
    photoURL?: string | null;
  }): Promise<void> {
    return exp.updateProfile(this._delegate, profile);
  }
  verifyBeforeUpdateEmail(
    newEmail: string,
    actionCodeSettings?: compat.ActionCodeSettings | null
  ): Promise<void> {
    return exp.verifyBeforeUpdateEmail(
      this._delegate,
      newEmail,
      actionCodeSettings
    );
  }
  get emailVerified(): boolean {
    return this._delegate.emailVerified;
  }
  get isAnonymous(): boolean {
    return this._delegate.isAnonymous;
  }
  get metadata(): compat.UserMetadata {
    return this._delegate.metadata;
  }
  get phoneNumber(): string | null {
    return this._delegate.phoneNumber;
  }
  get providerData(): Array<compat.UserInfo | null> {
    return this._delegate.providerData;
  }
  get refreshToken(): string {
    return this._delegate.refreshToken;
  }
  get tenantId(): string | null {
    return this._delegate.tenantId;
  }
  get displayName(): string | null {
    return this._delegate.displayName;
  }
  get email(): string | null {
    return this._delegate.email;
  }
  get photoURL(): string | null {
    return this._delegate.photoURL;
  }
  get providerId(): string {
    return this._delegate.providerId;
  }
  get uid(): string {
    return this._delegate.uid;
  }
  private get auth(): exp.Auth {
    return (this._delegate as exp.UserImpl).auth as unknown as exp.Auth;
  }
}
