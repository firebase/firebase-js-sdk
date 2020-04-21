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

import { resetPassword } from '../../api/account_management/email_and_password';
import * as api from '../../api/authentication/email_and_password';
import { ActionCodeInfo, Operation } from '../../model/action_code_info';
import {
  ActionCodeSettings,
  setActionCodeSettingsOnRequest
} from '../../model/action_code_settings';
import { Auth } from '../../model/auth';
import { AuthErrorCode, AUTH_ERROR_FACTORY } from '../errors';

export async function sendPasswordResetEmail(
  auth: Auth,
  email: string,
  actionCodeSettings?: ActionCodeSettings
): Promise<void> {
  const request: api.PasswordResetRequest = {
    requestType: Operation.PASSWORD_RESET,
    email
  };
  if (actionCodeSettings) {
    setActionCodeSettingsOnRequest(request, actionCodeSettings);
  }

  await api.sendPasswordResetEmail(auth, request);
}

export async function confirmPasswordReset(
  auth: Auth,
  oobCode: string,
  newPassword: string
): Promise<void> {
  await resetPassword(auth, {
    oobCode,
    newPassword
  });
  // Do not return the email.
}

export async function checkActionCode(
  auth: Auth,
  oobCode: string
): Promise<ActionCodeInfo> {
  const response = await resetPassword(auth, {
    oobCode
  });
  if (!response.requestType) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, {
      appName: auth.name
    });
  }

  return {
    data: {
      email: response.email || null,
      fromEmail: response.newEmail || null
    },
    operation: response.requestType
  };
}

export async function verifyPasswordResetCode(
  auth: Auth,
  code: string
): Promise<string> {
  const { data } = await checkActionCode(auth, code);
  // Email should always be present since a code was sent to it
  return data.email!;
}
