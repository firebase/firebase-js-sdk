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

import * as impl from '@firebase/auth-exp/internal';
import * as compat from '@firebase/auth-types';
import * as externs from '@firebase/auth-types-exp';
import {
  convertConfirmationResult,
  convertCredential
} from './user_credential';
import { unwrap, Wrapper } from './wrap';

export class User implements compat.User, Wrapper<externs.User> {
  // Maintain a map so that there's always a 1:1 mapping between new User and
  // legacy compat users
  private static readonly USER_MAP = new Map<externs.User, User>();

  readonly multiFactor: compat.MultiFactorUser;

  private constructor(private readonly user: externs.User) {
    this.multiFactor = impl.multiFactor(user);
  }

  static getOrCreate(user: externs.User): User {
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
  toJSON(): Object {
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
      impl.linkWithCredential(this.user, credential as externs.AuthCredential)
    );
  }
  async linkWithPhoneNumber(
    phoneNumber: string,
    applicationVerifier: compat.ApplicationVerifier
  ): Promise<compat.ConfirmationResult> {
    return convertConfirmationResult(
      this.auth,
      impl.linkWithPhoneNumber(this.user, phoneNumber, unwrap(applicationVerifier))
    );
  }
  async linkWithPopup(
    provider: compat.AuthProvider
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth,
      impl.linkWithPopup(
        this.user,
        provider as externs.AuthProvider,
        impl.browserPopupRedirectResolver
      )
    );
  }
  linkWithRedirect(provider: compat.AuthProvider): Promise<void> {
    return impl.linkWithRedirect(
      this.user,
      provider as externs.AuthProvider,
      impl.browserPopupRedirectResolver
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
      (this.auth as unknown) as externs.Auth,
      impl.reauthenticateWithCredential(
        this.user,
        credential as externs.AuthCredential
      )
    );
  }
  reauthenticateWithPhoneNumber(
    phoneNumber: string,
    applicationVerifier: compat.ApplicationVerifier
  ): Promise<compat.ConfirmationResult> {
    return convertConfirmationResult(
      this.auth,
      impl.reauthenticateWithPhoneNumber(this.user, phoneNumber, unwrap(applicationVerifier))
    );
  }
  reauthenticateWithPopup(
    provider: compat.AuthProvider
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth,
      impl.reauthenticateWithPopup(
        this.user,
        provider as externs.AuthProvider,
        impl.browserPopupRedirectResolver
      )
    );
  }
  reauthenticateWithRedirect(provider: compat.AuthProvider): Promise<void> {
    return impl.reauthenticateWithRedirect(
      this.user,
      provider as externs.AuthProvider,
      impl.browserPopupRedirectResolver
    );
  }
  sendEmailVerification(
    actionCodeSettings?: compat.ActionCodeSettings | null
  ): Promise<void> {
    return impl.sendEmailVerification(this.user, actionCodeSettings);
  }
  async unlink(providerId: string): Promise<compat.User> {
    await impl.unlink(this.user, providerId as externs.ProviderId);
    return this;
  }
  updateEmail(newEmail: string): Promise<void> {
    return impl.updateEmail(this.user, newEmail);
  }
  updatePassword(newPassword: string): Promise<void> {
    return impl.updatePassword(this.user, newPassword);
  }
  updatePhoneNumber(phoneCredential: compat.AuthCredential): Promise<void> {
    return impl.updatePhoneNumber(
      this.user,
      phoneCredential as externs.AuthCredential
    );
  }
  updateProfile(profile: {
    displayName?: string | null;
    photoURL?: string | null;
  }): Promise<void> {
    return impl.updateProfile(this.user, profile);
  }
  verifyBeforeUpdateEmail(
    newEmail: string,
    actionCodeSettings?: compat.ActionCodeSettings | null
  ): Promise<void> {
    return impl.verifyBeforeUpdateEmail(this.user, newEmail, actionCodeSettings);
  }
  unwrap(): externs.User {
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
  get providerData(): (compat.UserInfo | null)[] {
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
  private get auth(): externs.Auth {
    return (this.user as impl.UserImpl).auth as unknown as externs.Auth;
  }
}
