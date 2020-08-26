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
import '@firebase/installations';
import {
  convertConfirmationResult,
  convertCredential
} from './user_credential';

export class User extends impl.UserImpl implements compat.User {
  readonly multiFactor: compat.MultiFactorUser;

  constructor(params: impl.UserParameters) {
    super(params);
    this.multiFactor = impl.multiFactor(this);
  }

  getIdTokenResult(forceRefresh?: boolean): Promise<compat.IdTokenResult> {
    return super.getIdTokenResult(forceRefresh);
  }
  getIdToken(forceRefresh?: boolean): Promise<string> {
    return super.getIdToken(forceRefresh);
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
      (this.auth as unknown) as externs.Auth,
      impl.linkWithCredential(this, credential as externs.AuthCredential)
    );
  }
  async linkWithPhoneNumber(
    phoneNumber: string,
    applicationVerifier: compat.ApplicationVerifier
  ): Promise<compat.ConfirmationResult> {
    return convertConfirmationResult(
      (this.auth as unknown) as externs.Auth,
      impl.linkWithPhoneNumber(this, phoneNumber, applicationVerifier)
    );
  }
  async linkWithPopup(
    provider: compat.AuthProvider
  ): Promise<compat.UserCredential> {
    return convertCredential(
      (this.auth as unknown) as externs.Auth,
      impl.linkWithPopup(
        this,
        provider as externs.AuthProvider,
        impl.browserPopupRedirectResolver
      )
    );
  }
  linkWithRedirect(provider: compat.AuthProvider): Promise<void> {
    return impl.linkWithRedirect(
      this,
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
        this,
        credential as externs.AuthCredential
      )
    );
  }
  reauthenticateWithPhoneNumber(
    phoneNumber: string,
    applicationVerifier: compat.ApplicationVerifier
  ): Promise<compat.ConfirmationResult> {
    return convertConfirmationResult(
      (this.auth as unknown) as externs.Auth,
      impl.reauthenticateWithPhoneNumber(this, phoneNumber, applicationVerifier)
    );
  }
  reauthenticateWithPopup(
    provider: compat.AuthProvider
  ): Promise<compat.UserCredential> {
    return convertCredential(
      (this.auth as unknown) as externs.Auth,
      impl.reauthenticateWithPopup(
        this,
        provider as externs.AuthProvider,
        impl.browserPopupRedirectResolver
      )
    );
  }
  reauthenticateWithRedirect(provider: compat.AuthProvider): Promise<void> {
    return impl.reauthenticateWithRedirect(
      this,
      provider as externs.AuthProvider,
      impl.browserPopupRedirectResolver
    );
  }
  sendEmailVerification(
    actionCodeSettings?: compat.ActionCodeSettings | null
  ): Promise<void> {
    return impl.sendEmailVerification(this, actionCodeSettings);
  }
  async unlink(providerId: string): Promise<compat.User> {
    await impl.unlink(this, providerId as externs.ProviderId);
    return this;
  }
  updateEmail(newEmail: string): Promise<void> {
    return impl.updateEmail(this, newEmail);
  }
  updatePassword(newPassword: string): Promise<void> {
    return impl.updatePassword(this, newPassword);
  }
  updatePhoneNumber(phoneCredential: compat.AuthCredential): Promise<void> {
    return impl.updatePhoneNumber(
      this,
      phoneCredential as externs.AuthCredential
    );
  }
  updateProfile(profile: {
    displayName?: string | null;
    photoURL?: string | null;
  }): Promise<void> {
    return impl.updateProfile(this, profile);
  }
  verifyBeforeUpdateEmail(
    newEmail: string,
    actionCodeSettings?: compat.ActionCodeSettings | null
  ): Promise<void> {
    return impl.verifyBeforeUpdateEmail(this, newEmail, actionCodeSettings);
  }
}
