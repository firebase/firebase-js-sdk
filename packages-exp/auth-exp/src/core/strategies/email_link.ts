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

import * as api from '../../api/authentication/email_and_password';
import { ActionCodeURL } from '../action_code_url';
import { AuthImplCompat } from '../auth/auth_impl';
import { EmailAuthProvider } from '../providers/email';
import { assertTypes, opt } from '../util/assert';
import { _getCurrentUrl } from '../util/location';
import { setActionCodeSettingsOnRequest } from './action_code_settings';
import { signInWithCredential } from './credential';

export async function sendSignInLinkToEmail(
  auth: externs.Auth,
  email: string,
  actionCodeSettings?: externs.ActionCodeSettings
): Promise<void> {
  assertTypes([auth, email, actionCodeSettings], AuthImplCompat, 'string', opt('object'));
  const request: api.EmailSignInRequest = {
    requestType: externs.Operation.EMAIL_SIGNIN,
    email
  };
  if (actionCodeSettings) {
    setActionCodeSettingsOnRequest(request, actionCodeSettings);
  }

  await api.sendSignInLinkToEmail(auth, request);
}

export function isSignInWithEmailLink(
  auth: externs.Auth,
  emailLink: string
): boolean {
  assertTypes(arguments, AuthImplCompat, 'string');
  const actionCodeUrl = ActionCodeURL.parseLink(auth, emailLink);
  return actionCodeUrl?.operation === externs.Operation.EMAIL_SIGNIN;
}

export async function signInWithEmailLink(
  auth: externs.Auth,
  email: string,
  emailLink?: string
): Promise<externs.UserCredential> {
  assertTypes([auth, email, emailLink], AuthImplCompat, 'string', opt('string'));
  return signInWithCredential(
    auth,
    EmailAuthProvider.credentialWithLink(
      auth,
      email,
      emailLink || _getCurrentUrl()
    )
  );
}
