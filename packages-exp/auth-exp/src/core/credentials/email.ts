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
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { AuthErrorCode } from '../errors';
import { fail } from '../util/assert';
import { AuthCredential } from './auth_credential';

export class EmailAuthCredential
  extends AuthCredential
  implements externs.AuthCredential {
  private constructor(
    readonly email: string,
    readonly password: string,
    signInMethod: externs.SignInMethod,
    readonly tenantId: string | null = null
  ) {
    super(externs.ProviderId.PASSWORD, signInMethod);
  }

  static _fromEmailAndPassword(
    email: string,
    password: string
  ): EmailAuthCredential {
    return new EmailAuthCredential(
      email,
      password,
      externs.SignInMethod.EMAIL_PASSWORD
    );
  }

  static _fromEmailAndCode(
    email: string,
    oobCode: string,
    tenantId: string | null = null
  ): EmailAuthCredential {
    return new EmailAuthCredential(
      email,
      oobCode,
      externs.SignInMethod.EMAIL_LINK,
      tenantId
    );
  }

  toJSON(): object {
    return {
      email: this.email,
      password: this.password,
      signInMethod: this.signInMethod,
      tenantId: this.tenantId
    };
  }

  static fromJSON(json: object | string): EmailAuthCredential | null {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    if (obj?.email && obj?.password) {
      if (obj.signInMethod === externs.SignInMethod.EMAIL_PASSWORD) {
        return this._fromEmailAndPassword(obj.email, obj.password);
      } else if (obj.signInMethod === externs.SignInMethod.EMAIL_LINK) {
        return this._fromEmailAndCode(obj.email, obj.password, obj.tenantId);
      }
    }
    return null;
  }

  async _getIdTokenResponse(auth: Auth): Promise<IdTokenResponse> {
    switch (this.signInMethod) {
      case externs.SignInMethod.EMAIL_PASSWORD:
        return signInWithPassword(auth, {
          returnSecureToken: true,
          email: this.email,
          password: this.password
        });
      case externs.SignInMethod.EMAIL_LINK:
        return signInWithEmailLink(auth, {
          email: this.email,
          oobCode: this.password
        });
      default:
        fail(AuthErrorCode.INTERNAL_ERROR, { appName: auth.name });
    }
  }

  async _linkToIdToken(
    auth: Auth,
    idToken: string
  ): Promise<IdTokenResponse> {
    switch (this.signInMethod) {
      case externs.SignInMethod.EMAIL_PASSWORD:
        return updateEmailPassword(auth, {
          idToken,
          returnSecureToken: true,
          email: this.email,
          password: this.password
        });
      case externs.SignInMethod.EMAIL_LINK:
        return signInWithEmailLinkForLinking(auth, {
          idToken,
          email: this.email,
          oobCode: this.password
        });
      default:
        fail(AuthErrorCode.INTERNAL_ERROR, { appName: auth.name });
    }
  }

  _getReauthenticationResolver(auth: Auth): Promise<IdTokenResponse> {
    return this._getIdTokenResponse(auth);
  }
}
