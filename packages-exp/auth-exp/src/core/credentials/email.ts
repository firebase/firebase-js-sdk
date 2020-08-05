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
  signInWithEmailLink,
  signInWithEmailLinkForLinking
} from '../../api/authentication/email_link';
import { AuthCore } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { AuthErrorCode } from '../errors';
import { EmailAuthProvider } from '../providers/email';
import { fail } from '../util/assert';
import { AuthCredential } from './';

export class EmailAuthCredential implements AuthCredential {
  readonly providerId = EmailAuthProvider.PROVIDER_ID;

  private constructor(
    readonly email: string,
    readonly password: string,
    readonly signInMethod: externs.SignInMethod
  ) {}

  static _fromEmailAndPassword(
    email: string,
    password: string
  ): EmailAuthCredential {
    return new EmailAuthCredential(
      email,
      password,
      EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD
    );
  }

  static _fromEmailAndCode(
    email: string,
    oobCode: string
  ): EmailAuthCredential {
    return new EmailAuthCredential(
      email,
      oobCode,
      EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD
    );
  }

  toJSON(): object {
    return {
      email: this.email,
      password: this.password,
      signInMethod: this.signInMethod
    };
  }

  static fromJSON(json: object | string): EmailAuthCredential | null {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    if (obj?.email && obj?.password) {
      if (
        obj.signInMethod === EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD
      ) {
        return this._fromEmailAndPassword(obj.email, obj.password);
      } else if (
        obj.signInMethod === EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD
      ) {
        return this._fromEmailAndCode(obj.email, obj.password);
      }
    }
    return null;
  }

  async _getIdTokenResponse(auth: AuthCore): Promise<IdTokenResponse> {
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

  async _linkToIdToken(
    auth: AuthCore,
    idToken: string
  ): Promise<IdTokenResponse> {
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

  _getReauthenticationResolver(auth: AuthCore): Promise<IdTokenResponse> {
    return this._getIdTokenResponse(auth);
  }
}
