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

import { signInWithPassword } from '../../api/authentication/email_and_password';
import { signInWithEmailLink } from '../../api/authentication/email_link';
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { EmailAuthProvider } from '../providers/email';
import { debugFail } from '../util/assert';
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
        throw AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, {
          appName: auth.name
        });
    }
  }

  async _linkToIdToken(_auth: Auth, _idToken: string): Promise<never> {
    debugFail('Method not implemented.');
  }

  _getReauthenticationResolver(_auth: Auth): Promise<never> {
    debugFail('Method not implemented.');
  }
}
