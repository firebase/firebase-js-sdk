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

import { updateEmailPassword } from '../../api/account_management/email_and_password';
import { signInWithPassword } from '../../api/authentication/email_and_password';
import {
    signInWithEmailLink, signInWithEmailLinkForLinking
} from '../../api/authentication/email_link';
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { AuthErrorCode } from '../errors';
import { EmailAuthProvider } from '../providers/email';
import { debugFail, fail } from '../util/assert';
import { AuthCredential } from './';

export class EmailAuthCredential implements AuthCredential {
  readonly providerId = EmailAuthProvider.PROVIDER_ID;

  constructor(
    readonly email: string,
    readonly password: string,
    readonly signInMethod: externs.SignInMethod
  ) {}

  toJSON(): never {
    debugFail('Method not implemented.');
  }

  static fromJSON(_json: object | string): EmailAuthCredential | null {
    debugFail('Method not implemented');
  }

  async _getIdTokenResponse(auth: Auth): Promise<IdTokenResponse> {
    switch (this.signInMethod) {
      case EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD:
        return signInWithPassword(auth, {
          returnSecureToken: true,
          email: this.email,
          password: this.password
        });
      case EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD:
        return signInWithEmailLink(auth, {
          email: this.email,
          oobCode: this.password
        });
      default:
        fail(auth.name, AuthErrorCode.INTERNAL_ERROR);
    }
  }

  async _linkToIdToken(auth: Auth, idToken: string): Promise<IdTokenResponse> {
    switch (this.signInMethod) {
      case EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD:
        return updateEmailPassword(auth, {
          idToken,
          returnSecureToken: true,
          email: this.email,
          password: this.password
        });
      case EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD:
        return signInWithEmailLinkForLinking(auth, {
          idToken,
          email: this.email,
          oobCode: this.password
        });
      default:
        fail(auth.name, AuthErrorCode.INTERNAL_ERROR);
    }
  }

  _getReauthenticationResolver(auth: Auth): Promise<IdTokenResponse> {
    return this._getIdTokenResponse(auth);
  }
}
