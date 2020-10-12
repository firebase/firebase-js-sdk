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

import * as account from '../../api/account_management/email_and_password';
import * as authentication from '../../api/authentication/email_and_password';
import { signUp } from '../../api/authentication/sign_up';
import { MultiFactorInfo } from '../../mfa/mfa_info';
import { EmailAuthProvider } from '../providers/email';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { assert } from '../util/assert';
import { setActionCodeSettingsOnRequest } from './action_code_settings';
import { signInWithCredential } from './credential';
import { _castAuth } from '../auth/auth_impl';
import { AuthErrorCode } from '../errors';

export async function sendPasswordResetEmail(
  auth: externs.Auth,
  email: string,
  actionCodeSettings?: externs.ActionCodeSettings
): Promise<void> {
  const request: authentication.PasswordResetRequest = {
    requestType: externs.Operation.PASSWORD_RESET,
    email
  };
  if (actionCodeSettings) {
    setActionCodeSettingsOnRequest(request, actionCodeSettings);
  }

  await authentication.sendPasswordResetEmail(auth, request);
}

export async function confirmPasswordReset(
  auth: externs.Auth,
  oobCode: string,
  newPassword: string
): Promise<void> {
  await account.resetPassword(auth, {
    oobCode,
    newPassword
  });
  // Do not return the email.
}

export async function applyActionCode(
  auth: externs.Auth,
  oobCode: string
): Promise<void> {
  await account.applyActionCode(auth, { oobCode });
}

export async function checkActionCode(
  auth: externs.Auth,
  oobCode: string
): Promise<externs.ActionCodeInfo> {
  const response = await account.resetPassword(auth, { oobCode });

  // Email could be empty only if the request type is EMAIL_SIGNIN or
  // VERIFY_AND_CHANGE_EMAIL.
  // New email should not be empty if the request type is
  // VERIFY_AND_CHANGE_EMAIL.
  // Multi-factor info could not be empty if the request type is
  // REVERT_SECOND_FACTOR_ADDITION.
  const operation = response.requestType;
  assert(operation, AuthErrorCode.INTERNAL_ERROR, { appName: auth.name });
  switch (operation) {
    case externs.Operation.EMAIL_SIGNIN:
      break;
    case externs.Operation.VERIFY_AND_CHANGE_EMAIL:
      assert(response.newEmail, AuthErrorCode.INTERNAL_ERROR, {
        appName: auth.name
      });
      break;
    case externs.Operation.REVERT_SECOND_FACTOR_ADDITION:
      assert(response.mfaInfo, AuthErrorCode.INTERNAL_ERROR, {
        appName: auth.name
      });
    // fall through
    default:
      assert(response.email, AuthErrorCode.INTERNAL_ERROR, {
        appName: auth.name
      });
  }

  // The multi-factor info for revert second factor addition
  let multiFactorInfo: MultiFactorInfo | null = null;
  if (response.mfaInfo) {
    multiFactorInfo = MultiFactorInfo._fromServerResponse(
      _castAuth(auth),
      response.mfaInfo
    );
  }

  return {
    data: {
      email:
        (response.requestType === externs.Operation.VERIFY_AND_CHANGE_EMAIL
          ? response.newEmail
          : response.email) || null,
      previousEmail:
        (response.requestType === externs.Operation.VERIFY_AND_CHANGE_EMAIL
          ? response.email
          : response.newEmail) || null,
      multiFactorInfo
    },
    operation
  };
}

export async function verifyPasswordResetCode(
  auth: externs.Auth,
  code: string
): Promise<string> {
  const { data } = await checkActionCode(auth, code);
  // Email should always be present since a code was sent to it
  return data.email!;
}

export async function createUserWithEmailAndPassword(
  auth: externs.Auth,
  email: string,
  password: string
): Promise<externs.UserCredential> {
  const response = await signUp(auth, {
    returnSecureToken: true,
    email,
    password
  });

  const userCredential = await UserCredentialImpl._fromIdTokenResponse(
    _castAuth(auth),
    externs.OperationType.SIGN_IN,
    response
  );
  await auth.updateCurrentUser(userCredential.user);

  return userCredential;
}

export function signInWithEmailAndPassword(
  auth: externs.Auth,
  email: string,
  password: string
): Promise<externs.UserCredential> {
  return signInWithCredential(
    auth,
    EmailAuthProvider.credential(email, password)
  );
}
