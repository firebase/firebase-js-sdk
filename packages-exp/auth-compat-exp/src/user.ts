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

import * as exp from '@firebase/auth-exp/internal';
import * as compat from '@firebase/auth-types';
import { _savePersistenceForRedirect } from './persistence';
import { CompatPopupRedirectResolver } from './popup_redirect';
import {
  convertConfirmationResult,
  convertCredential
} from './user_credential';
import { unwrap, Wrapper } from './wrap';

export class User implements compat.User, Wrapper<exp.User> {
  // Maintain a map so that there's always a 1:1 mapping between new User and
  // legacy compat users
  private static readonly USER_MAP = new WeakMap<exp.User, User>();

  readonly multiFactor: compat.MultiFactorUser;

  private constructor(private readonly user: exp.User) {
    this.multiFactor = exp.multiFactor(user);
  }

  static getOrCreate(user: exp.User): User {
    if (!User.USER_MAP.has(user)) {
      User.USER_MAP.set(user, new User(user));
    }

    return User.USER_MAP.get(user)!;
  }

  delete(): Promise<void> {
    return this.user.delete();
  }
  reload(): Promise<void> {
    return this.user.reload();
  }
  toJSON(): object {
    return this.user.toJSON();
  }
  getIdTokenResult(forceRefresh?: boolean): Promise<compat.IdTokenResult> {
    return this.user.getIdTokenResult(forceRefresh);
  }
  getIdToken(forceRefresh?: boolean): Promise<string> {
    return this.user.getIdToken(forceRefresh);
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
      exp.linkWithCredential(this.user, credential as exp.AuthCredential)
    );
  }
  async linkWithPhoneNumber(
    phoneNumber: string,
    applicationVerifier: compat.ApplicationVerifier
  ): Promise<compat.ConfirmationResult> {
    return convertConfirmationResult(
      this.auth,
      exp.linkWithPhoneNumber(
        this.user,
        phoneNumber,
        unwrap(applicationVerifier)
      )
    );
  }
  async linkWithPopup(
    provider: compat.AuthProvider
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth,
      exp.linkWithPopup(
        this.user,
        provider as exp.AuthProvider,
        CompatPopupRedirectResolver
      )
    );
  }
  async linkWithRedirect(provider: compat.AuthProvider): Promise<void> {
    await _savePersistenceForRedirect(exp._castAuth(this.auth));
    return exp.linkWithRedirect(
      this.user,
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
      (this.auth as unknown) as exp.Auth,
      exp.reauthenticateWithCredential(
        this.user,
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
        this.user,
        phoneNumber,
        unwrap(applicationVerifier)
      )
    );
  }
  reauthenticateWithPopup(
    provider: compat.AuthProvider
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth,
      exp.reauthenticateWithPopup(
        this.user,
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
      this.user,
      provider as exp.AuthProvider,
      CompatPopupRedirectResolver
    );
  }
  sendEmailVerification(
    actionCodeSettings?: compat.ActionCodeSettings | null
  ): Promise<void> {
    return exp.sendEmailVerification(this.user, actionCodeSettings);
  }
  async unlink(providerId: string): Promise<compat.User> {
    await exp.unlink(this.user, providerId as exp.ProviderId);
    return this;
  }
  updateEmail(newEmail: string): Promise<void> {
    return exp.updateEmail(this.user, newEmail);
  }
  updatePassword(newPassword: string): Promise<void> {
    return exp.updatePassword(this.user, newPassword);
  }
  updatePhoneNumber(phoneCredential: compat.AuthCredential): Promise<void> {
    return exp.updatePhoneNumber(
      this.user,
      phoneCredential as exp.PhoneAuthCredential
    );
  }
  updateProfile(profile: {
    displayName?: string | null;
    photoURL?: string | null;
  }): Promise<void> {
    return exp.updateProfile(this.user, profile);
  }
  verifyBeforeUpdateEmail(
    newEmail: string,
    actionCodeSettings?: compat.ActionCodeSettings | null
  ): Promise<void> {
    return exp.verifyBeforeUpdateEmail(this.user, newEmail, actionCodeSettings);
  }
  unwrap(): exp.User {
    return this.user;
  }
  get emailVerified(): boolean {
    return this.user.emailVerified;
  }
  get isAnonymous(): boolean {
    return this.user.isAnonymous;
  }
  get metadata(): compat.UserMetadata {
    return this.user.metadata;
  }
  get phoneNumber(): string | null {
    return this.user.phoneNumber;
  }
  get providerData(): Array<compat.UserInfo | null> {
    return this.user.providerData;
  }
  get refreshToken(): string {
    return this.user.refreshToken;
  }
  get tenantId(): string | null {
    return this.user.tenantId;
  }
  get displayName(): string | null {
    return this.user.displayName;
  }
  get email(): string | null {
    return this.user.email;
  }
  get photoURL(): string | null {
    return this.user.photoURL;
  }
  get providerId(): string {
    return this.user.providerId;
  }
  get uid(): string {
    return this.user.uid;
  }
  private get auth(): exp.Auth {
    return ((this.user as exp.UserImpl).auth as unknown) as exp.Auth;
  }
}
