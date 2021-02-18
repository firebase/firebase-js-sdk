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

import {
  AuthCredential as AuthCredentialPublic,
  ProviderId,
  SignInMethod
} from '../../model/public_types';

import { updateEmailPassword } from '../../api/account_management/email_and_password';
import { signInWithPassword } from '../../api/authentication/email_and_password';
import {
  signInWithEmailLink,
  signInWithEmailLinkForLinking
} from '../../api/authentication/email_link';
import { AuthInternal } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { AuthErrorCode } from '../errors';
import { _fail } from '../util/assert';
import { AuthCredential } from './auth_credential';

/**
 * Interface that represents the credentials returned by {@link EmailAuthProvider} for
 * {@link @firebase/auth-types#ProviderId.PASSWORD}
 *
 * @remarks
 * Covers both {@link @firebase/auth-types#SignInMethod.EMAIL_PASSWORD} and
 * {@link @firebase/auth-types#SignInMethod.EMAIL_LINK}.
 *
 * @public
 */
export class EmailAuthCredential
  extends AuthCredential
  implements AuthCredentialPublic {
  /** @internal */
  private constructor(
    readonly email: string,
    readonly password: string,
    signInMethod: SignInMethod,
    readonly tenantId: string | null = null
  ) {
    super(ProviderId.PASSWORD, signInMethod);
  }

  /** @internal */
  static _fromEmailAndPassword(
    email: string,
    password: string
  ): EmailAuthCredential {
    return new EmailAuthCredential(
      email,
      password,
      SignInMethod.EMAIL_PASSWORD
    );
  }

  /** @internal */
  static _fromEmailAndCode(
    email: string,
    oobCode: string,
    tenantId: string | null = null
  ): EmailAuthCredential {
    return new EmailAuthCredential(
      email,
      oobCode,
      SignInMethod.EMAIL_LINK,
      tenantId
    );
  }

  /** {@inheritdoc @firebase/auth-types#AuthCredential.toJSON} */
  toJSON(): object {
    return {
      email: this.email,
      password: this.password,
      signInMethod: this.signInMethod,
      tenantId: this.tenantId
    };
  }

  /** {@inheritdoc @firebase/auth-types#AuthCredential.fromJSON} */
  static fromJSON(json: object | string): EmailAuthCredential | null {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    if (obj?.email && obj?.password) {
      if (obj.signInMethod === SignInMethod.EMAIL_PASSWORD) {
        return this._fromEmailAndPassword(obj.email, obj.password);
      } else if (obj.signInMethod === SignInMethod.EMAIL_LINK) {
        return this._fromEmailAndCode(obj.email, obj.password, obj.tenantId);
      }
    }
    return null;
  }

  /** @internal */
  async _getIdTokenResponse(auth: AuthInternal): Promise<IdTokenResponse> {
    switch (this.signInMethod) {
      case SignInMethod.EMAIL_PASSWORD:
        return signInWithPassword(auth, {
          returnSecureToken: true,
          email: this.email,
          password: this.password
        });
      case SignInMethod.EMAIL_LINK:
        return signInWithEmailLink(auth, {
          email: this.email,
          oobCode: this.password
        });
      default:
        _fail(auth, AuthErrorCode.INTERNAL_ERROR);
    }
  }

  /** @internal */
  async _linkToIdToken(
    auth: AuthInternal,
    idToken: string
  ): Promise<IdTokenResponse> {
    switch (this.signInMethod) {
      case SignInMethod.EMAIL_PASSWORD:
        return updateEmailPassword(auth, {
          idToken,
          returnSecureToken: true,
          email: this.email,
          password: this.password
        });
      case SignInMethod.EMAIL_LINK:
        return signInWithEmailLinkForLinking(auth, {
          idToken,
          email: this.email,
          oobCode: this.password
        });
      default:
        _fail(auth, AuthErrorCode.INTERNAL_ERROR);
    }
  }

  /** @internal */
  _getReauthenticationResolver(auth: AuthInternal): Promise<IdTokenResponse> {
    return this._getIdTokenResponse(auth);
  }
}
