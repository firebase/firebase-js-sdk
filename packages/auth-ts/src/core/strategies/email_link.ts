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

import { Auth } from '../../model/auth';
import * as api from '../../api/authentication';
import { UserCredential } from '../../model/user_credential';
import { Operation } from '../../model/action_code_info';
import { emailAuthCredentialWithLink } from '../providers/email';
import {
  ActionCodeSettings,
  setActionCodeSettingsOnRequest
} from '../../model/action_code_settings';
import { actionCodeURLfromLink } from '../../model/action_code_url';
import { signInWithCredential } from './auth_credential';

export async function sendSignInLinkToEmail(
  auth: Auth,
  email: string,
  actionCodeSettings?: ActionCodeSettings
): Promise<void> {
  const request: api.EmailSigninRequest = {
    requestType: api.GetOobCodeRequestType.EMAIL_SIGNIN,
    email
  };
  if (actionCodeSettings) {
    setActionCodeSettingsOnRequest(request, actionCodeSettings);
  }

  await api.sendOobCode(auth, request);
}

export function isSignInWithEmailLink(auth: Auth, emailLink: string): boolean {
  const actionCodeUrl = actionCodeURLfromLink(auth, emailLink);
  return !!(
    actionCodeUrl && actionCodeUrl.operation === Operation.EMAIL_SIGNIN
  );
}

export async function signInWithEmailLink(
  auth: Auth,
  email: string,
  emailLink?: string
): Promise<UserCredential> {
  return signInWithCredential(
    auth,
    emailAuthCredentialWithLink(auth, email, emailLink)
  );
}
