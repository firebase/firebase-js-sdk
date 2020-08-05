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

import {
  createAuthUri,
  CreateAuthUriRequest
} from '../../api/authentication/create_auth_uri';
import * as api from '../../api/authentication/email_and_password';
import { User } from '../../model/user';
import { _getCurrentUrl, _isHttpOrHttps } from '../util/location';
import { setActionCodeSettingsOnRequest } from './action_code_settings';
import { _castAuth } from '../auth/auth_impl';

export async function fetchSignInMethodsForEmail(
  auth: externs.Auth,
  email: string
): Promise<string[]> {
  // createAuthUri returns an error if continue URI is not http or https.
  // For environments like Cordova, Chrome extensions, native frameworks, file
  // systems, etc, use http://localhost as continue URL.
  const continueUri = _isHttpOrHttps() ? _getCurrentUrl() : 'http://localhost';
  const request: CreateAuthUriRequest = {
    identifier: email,
    continueUri
  };

  const { signinMethods } = await createAuthUri(auth, request);

  return signinMethods || [];
}

export async function sendEmailVerification(
  userExtern: externs.User,
  actionCodeSettings?: externs.ActionCodeSettings | null
): Promise<void> {
  const user = userExtern as User;
  const idToken = await user.getIdToken();
  const request: api.VerifyEmailRequest = {
    requestType: externs.Operation.VERIFY_EMAIL,
    idToken
  };
  if (actionCodeSettings) {
    setActionCodeSettingsOnRequest(request, actionCodeSettings);
  }

  const { email } = await api.sendEmailVerification(user.auth, request);

  if (email !== user.email) {
    await user.reload();
  }
}

export async function verifyBeforeUpdateEmail(
  userExtern: externs.User,
  newEmail: string,
  actionCodeSettings?: externs.ActionCodeSettings | null
): Promise<void> {
  const user = userExtern as User;
  const idToken = await user.getIdToken();
  const request: api.VerifyAndChangeEmailRequest = {
    requestType: externs.Operation.VERIFY_AND_CHANGE_EMAIL,
    idToken,
    newEmail
  };
  if (actionCodeSettings) {
    setActionCodeSettingsOnRequest(request, actionCodeSettings);
  }

  const { email } = await api.verifyAndChangeEmail(user.auth, request);

  if (email !== user.email) {
    // If the local copy of the email on user is outdated, reload the
    // user.
    await user.reload();
  }
}
