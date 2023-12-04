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

import { ProviderId, SignInMethod } from '../../model/enums';

import { linkEmailPassword } from '../../api/account_management/email_and_password';
import {
  signInWithPassword,
  SignInWithPasswordRequest
} from '../../api/authentication/email_and_password';
import {
  signInWithEmailLink,
  signInWithEmailLinkForLinking
} from '../../api/authentication/email_link';
import { AuthInternal } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { AuthErrorCode } from '../errors';
import { _fail } from '../util/assert';
import { AuthCredential } from './auth_credential';
import { handleRecaptchaFlow } from '../../platform_browser/recaptcha/recaptcha_enterprise_verifier';
import { RecaptchaActionName, RecaptchaClientType } from '../../api';
import { SignUpRequest } from '../../api/authentication/sign_up';
/**
 * Interface that represents the credentials returned by {@link EmailAuthProvider} for
 * {@link ProviderId}.PASSWORD
 *
 * @remarks
 * Covers both {@link SignInMethod}.EMAIL_PASSWORD and
 * {@link SignInMethod}.EMAIL_LINK.
 *
 * @public
 */
export class EmailAuthCredential extends AuthCredential {
  /** @internal */
  private constructor(
    /** @internal */
    readonly _email: string,
    /** @internal */
    readonly _password: string,
    signInMethod: SignInMethod,
    /** @internal */
    readonly _tenantId: string | null = null
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

  /** {@inheritdoc AuthCredential.toJSON} */
  toJSON(): object {
    return {
      email: this._email,
      password: this._password,
      signInMethod: this.signInMethod,
      tenantId: this._tenantId
    };
  }

  /**
   * Static method to deserialize a JSON representation of an object into an {@link  AuthCredential}.
   *
   * @param json - Either `object` or the stringified representation of the object. When string is
   * provided, `JSON.parse` would be called first.
   *
   * @returns If the JSON input does not represent an {@link AuthCredential}, null is returned.
   */
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
        const request: SignInWithPasswordRequest = {
          returnSecureToken: true,
          email: this._email,
          password: this._password,
          clientType: RecaptchaClientType.WEB
        };
        return handleRecaptchaFlow(
          auth,
          request,
          RecaptchaActionName.SIGN_IN_WITH_PASSWORD,
          signInWithPassword
        );
      case SignInMethod.EMAIL_LINK:
        return signInWithEmailLink(auth, {
          email: this._email,
          oobCode: this._password
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
        const request: SignUpRequest = {
          idToken,
          returnSecureToken: true,
          email: this._email,
          password: this._password,
          clientType: RecaptchaClientType.WEB
        };
        return handleRecaptchaFlow(
          auth,
          request,
          RecaptchaActionName.SIGN_UP_PASSWORD,
          linkEmailPassword
        );
      case SignInMethod.EMAIL_LINK:
        return signInWithEmailLinkForLinking(auth, {
          idToken,
          email: this._email,
          oobCode: this._password
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
