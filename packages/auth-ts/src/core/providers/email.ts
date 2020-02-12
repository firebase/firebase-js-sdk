/**
 * @license
 * Copyright 2019 Google Inc.
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

import { AuthProvider, ProviderId, SignInMethod } from '../providers';
import { AuthCredential } from '../strategies/auth_credential';
import { Auth } from '../../model/auth';
import { getCurrentUrl } from '../util/location';
import { actionCodeURLfromLink } from '../../model/action_code_url';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { IdTokenResponse } from '../../model/id_token';
import {
  signInWithEmailLink,
  signInWithPassword
} from '../../api/authentication';

export class EmailAuthCredential implements AuthCredential {
  constructor(
    readonly email: string,
    readonly password: string,
    readonly providerId: typeof EmailAuthProvider.PROVIDER_ID,
    readonly signInMethod: SignInMethod
  ) {}
  toJSON(): object {
    return {
      email: this.email,
      password: this.password,
      providerId: this.providerId,
      signInMethod: this.signInMethod
    };
  }
  async getIdTokenResponse_(auth: Auth): Promise<IdTokenResponse> {
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
}

export class EmailAuthProvider implements AuthProvider {
  static readonly PROVIDER_ID = ProviderId.PASSWORD;
  static readonly EMAIL_PASSWORD_SIGN_IN_METHOD = SignInMethod.EMAIL_PASSWORD;
  static readonly EMAIL_LINK_SIGN_IN_METHOD = SignInMethod.EMAIL_LINK;
  readonly providerId: ProviderId = EmailAuthProvider.PROVIDER_ID;
  static credential(
    email: string,
    password: string,
    signInMethod?: SignInMethod
  ): EmailAuthCredential {
    return new EmailAuthCredential(
      email,
      password,
      EmailAuthProvider.PROVIDER_ID,
      signInMethod || this.EMAIL_PASSWORD_SIGN_IN_METHOD
    );
  }
}

/**
 * Generates an AuthCredential from email & emailLink, using the actionCodeUrl.code in lieu of password
 *
 * @param auth
 * @param email
 * @param emailLink Link from which to extract the credential
 */
export function emailAuthCredentialWithLink(
  auth: Auth,
  email: string,
  emailLink?: string
): EmailAuthCredential {
  const link = emailLink || getCurrentUrl();
  const actionCodeUrl = actionCodeURLfromLink(auth, link);
  if (!actionCodeUrl) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.ARGUMENT_ERROR, {
      appName: auth.name
    });
  }

  const credential: EmailAuthCredential = EmailAuthProvider.credential(
    email,
    actionCodeUrl.code,
    EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD
  );

  // Check if the tenant ID in the email link matches the tenant ID on Auth
  // instance.
  if (actionCodeUrl.tenantId !== auth.tenantId) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.TENANT_ID_MISMATCH, {
      appName: auth.name
    });
  }

  return credential;
}
