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
import { Auth } from '../../model/auth';
import { AuthErrorCode } from '../errors';
import { EmailAuthProvider } from '../providers/email';
import { setActionCodeSettingsOnRequest } from './action_code_settings';
import { signInWithCredential } from './credential';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { signUp } from '../../api/authentication/sign_up';
import { assert } from '../util/assert';

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

  await authentication.sendPasswordResetEmail(auth as Auth, request);
}

export async function confirmPasswordReset(
  auth: externs.Auth,
  oobCode: string,
  newPassword: string
): Promise<void> {
  await account.resetPassword(auth as Auth, {
    oobCode,
    newPassword
  });
  // Do not return the email.
}

export async function applyActionCode(
  auth: externs.Auth,
  oobCode: string
): Promise<void> {
  await account.applyActionCode(auth as Auth, { oobCode });
}

export async function checkActionCode(
  auth: externs.Auth,
  oobCode: string
): Promise<externs.ActionCodeInfo> {
  const response = await account.resetPassword(auth as Auth, { oobCode });

  // Email could be empty only if the request type is EMAIL_SIGNIN or
  // VERIFY_AND_CHANGE_EMAIL.
  // New email should not be empty if the request type is
  // VERIFY_AND_CHANGE_EMAIL.
  const operation = response.requestType;
  assert(operation, auth.name, AuthErrorCode.INTERNAL_ERROR);
  switch (operation) {
    case externs.Operation.EMAIL_SIGNIN:
      break;
    case externs.Operation.VERIFY_AND_CHANGE_EMAIL:
      assert(response.newEmail, auth.name, AuthErrorCode.INTERNAL_ERROR);
      break;
    default:
      assert(response.email, auth.name, AuthErrorCode.INTERNAL_ERROR);
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
          : response.newEmail) || null
      /* multiFactorInfo: MultiFactorInfo | null; */
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
  authExtern: externs.Auth,
  email: string,
  password: string
): Promise<externs.UserCredential> {
  const auth = authExtern as Auth;

  const response = await signUp(auth, {
    returnSecureToken: true,
    email,
    password
  });

  const userCredential = await UserCredentialImpl._fromIdTokenResponse(
    auth,
    EmailAuthProvider.credential(email, password),
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
