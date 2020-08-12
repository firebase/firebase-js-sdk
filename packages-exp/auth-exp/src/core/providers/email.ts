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

import { ActionCodeURL } from '../action_code_url';
import { EmailAuthCredential } from '../credentials/email';
import { AuthErrorCode } from '../errors';
import { assert } from '../util/assert';

export class EmailAuthProvider implements externs.EmailAuthProvider {
  static readonly PROVIDER_ID = externs.ProviderId.PASSWORD;
  static readonly EMAIL_PASSWORD_SIGN_IN_METHOD =
    externs.SignInMethod.EMAIL_PASSWORD;
  static readonly EMAIL_LINK_SIGN_IN_METHOD = externs.SignInMethod.EMAIL_LINK;
  readonly providerId = EmailAuthProvider.PROVIDER_ID;

  static credential(email: string, password: string): EmailAuthCredential {
    return EmailAuthCredential._fromEmailAndPassword(email, password);
  }

  static credentialWithLink(
    email: string,
    emailLink: string
  ): EmailAuthCredential {
    const actionCodeUrl = ActionCodeURL.parseLink(emailLink);
    assert(actionCodeUrl, AuthErrorCode.ARGUMENT_ERROR, {});

    return EmailAuthCredential._fromEmailAndCode(
      email,
      actionCodeUrl.code,
      actionCodeUrl.tenantId
    );
  }
}
