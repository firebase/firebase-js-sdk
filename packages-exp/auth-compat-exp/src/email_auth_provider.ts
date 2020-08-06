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

import firebase from '@firebase/app';
import * as impl from '@firebase/auth-exp/internal';
import * as compat from '@firebase/auth-types';
import * as externs from '@firebase/auth-types-exp';

export class EmailAuthProvider implements compat.EmailAuthProvider {
  static readonly PROVIDER_ID = externs.ProviderId.PASSWORD;
  static readonly EMAIL_PASSWORD_SIGN_IN_METHOD =
    externs.SignInMethod.EMAIL_PASSWORD;
  static readonly EMAIL_LINK_SIGN_IN_METHOD = externs.SignInMethod.EMAIL_LINK;
  readonly providerId = EmailAuthProvider.PROVIDER_ID;

  static credential(email: string, password: string): compat.AuthCredential {
    return impl.EmailAuthProvider.credential(email, password);
  }

  static credentialWithLink(
    email: string,
    emailLink: string
  ): compat.AuthCredential {
    // TODO: support multiple app instances or revert this API change
    return impl.EmailAuthProvider.credentialWithLink(
      (firebase.auth!() as unknown) as externs.Auth,
      email,
      emailLink
    );
  }
}
