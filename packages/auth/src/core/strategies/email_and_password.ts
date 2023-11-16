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

import {
  ActionCodeInfo,
  ActionCodeOperation,
  ActionCodeSettings,
  Auth,
  UserCredential
} from '../../model/public_types';

import * as account from '../../api/account_management/email_and_password';
import * as authentication from '../../api/authentication/email_and_password';
import { signUp, SignUpRequest } from '../../api/authentication/sign_up';
import { MultiFactorInfoImpl } from '../../mfa/mfa_info';
import { EmailAuthProvider } from '../providers/email';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { _assert } from '../util/assert';
import { _setActionCodeSettingsOnRequest } from './action_code_settings';
import { signInWithCredential } from './credential';
import { _castAuth } from '../auth/auth_impl';
import { AuthErrorCode } from '../errors';
import { getModularInstance } from '@firebase/util';
import { OperationType } from '../../model/enums';
import { handleRecaptchaFlow } from '../../platform_browser/recaptcha/recaptcha_enterprise_verifier';
import { IdTokenResponse } from '../../model/id_token';
import { RecaptchaActionName, RecaptchaClientType } from '../../api';

/**
 * Updates the password policy cached in the {@link Auth} instance if a policy is already
 * cached for the project or tenant.
 *
 * @remarks
 * We only fetch the password policy if the password did not meet policy requirements and
 * there is an existing policy cached. A developer must call validatePassword at least
 * once for the cache to be automatically updated.
 *
 * @param auth - The {@link Auth} instance.
 *
 * @private
 */
async function recachePasswordPolicy(auth: Auth): Promise<void> {
  const authInternal = _castAuth(auth);
  if (authInternal._getPasswordPolicyInternal()) {
    await authInternal._updatePasswordPolicy();
  }
}

/**
 * Sends a password reset email to the given email address. This method does not throw an error when
 * there's no user account with the given email address and
 * [Email Enumeration Protection](https://cloud.google.com/identity-platform/docs/admin/email-enumeration-protection) is enabled.
 *
 * @remarks
 * To complete the password reset, call {@link confirmPasswordReset} with the code supplied in
 * the email sent to the user, along with the new password specified by the user.
 *
 * @example
 * ```javascript
 * const actionCodeSettings = {
 *   url: 'https://www.example.com/?email=user@example.com',
 *   iOS: {
 *      bundleId: 'com.example.ios'
 *   },
 *   android: {
 *     packageName: 'com.example.android',
 *     installApp: true,
 *     minimumVersion: '12'
 *   },
 *   handleCodeInApp: true
 * };
 * await sendPasswordResetEmail(auth, 'user@example.com', actionCodeSettings);
 * // Obtain code from user.
 * await confirmPasswordReset('user@example.com', code);
 * ```
 *
 * @param auth - The {@link Auth} instance.
 * @param email - The user's email address.
 * @param actionCodeSettings - The {@link ActionCodeSettings}.
 *
 * @public
 */
export async function sendPasswordResetEmail(
  auth: Auth,
  email: string,
  actionCodeSettings?: ActionCodeSettings
): Promise<void> {
  const authInternal = _castAuth(auth);
  const request: authentication.PasswordResetRequest = {
    requestType: ActionCodeOperation.PASSWORD_RESET,
    email,
    clientType: RecaptchaClientType.WEB
  };
  if (actionCodeSettings) {
    _setActionCodeSettingsOnRequest(authInternal, request, actionCodeSettings);
  }
  await handleRecaptchaFlow(
    authInternal,
    request,
    RecaptchaActionName.GET_OOB_CODE,
    authentication.sendPasswordResetEmail
  );
}

/**
 * Completes the password reset process, given a confirmation code and new password.
 *
 * @param auth - The {@link Auth} instance.
 * @param oobCode - A confirmation code sent to the user.
 * @param newPassword - The new password.
 *
 * @public
 */
export async function confirmPasswordReset(
  auth: Auth,
  oobCode: string,
  newPassword: string
): Promise<void> {
  await account
    .resetPassword(getModularInstance(auth), {
      oobCode,
      newPassword
    })
    .catch(async error => {
      if (
        error.code ===
        `auth/${AuthErrorCode.PASSWORD_DOES_NOT_MEET_REQUIREMENTS}`
      ) {
        void recachePasswordPolicy(auth);
      }

      throw error;
    });
  // Do not return the email.
}

/**
 * Applies a verification code sent to the user by email or other out-of-band mechanism.
 *
 * @param auth - The {@link Auth} instance.
 * @param oobCode - A verification code sent to the user.
 *
 * @public
 */
export async function applyActionCode(
  auth: Auth,
  oobCode: string
): Promise<void> {
  await account.applyActionCode(getModularInstance(auth), { oobCode });
}

/**
 * Checks a verification code sent to the user by email or other out-of-band mechanism.
 *
 * @returns metadata about the code.
 *
 * @param auth - The {@link Auth} instance.
 * @param oobCode - A verification code sent to the user.
 *
 * @public
 */
export async function checkActionCode(
  auth: Auth,
  oobCode: string
): Promise<ActionCodeInfo> {
  const authModular = getModularInstance(auth);
  const response = await account.resetPassword(authModular, { oobCode });

  // Email could be empty only if the request type is EMAIL_SIGNIN or
  // VERIFY_AND_CHANGE_EMAIL.
  // New email should not be empty if the request type is
  // VERIFY_AND_CHANGE_EMAIL.
  // Multi-factor info could not be empty if the request type is
  // REVERT_SECOND_FACTOR_ADDITION.
  const operation = response.requestType;
  _assert(operation, authModular, AuthErrorCode.INTERNAL_ERROR);
  switch (operation) {
    case ActionCodeOperation.EMAIL_SIGNIN:
      break;
    case ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL:
      _assert(response.newEmail, authModular, AuthErrorCode.INTERNAL_ERROR);
      break;
    case ActionCodeOperation.REVERT_SECOND_FACTOR_ADDITION:
      _assert(response.mfaInfo, authModular, AuthErrorCode.INTERNAL_ERROR);
    // fall through
    default:
      _assert(response.email, authModular, AuthErrorCode.INTERNAL_ERROR);
  }

  // The multi-factor info for revert second factor addition
  let multiFactorInfo: MultiFactorInfoImpl | null = null;
  if (response.mfaInfo) {
    multiFactorInfo = MultiFactorInfoImpl._fromServerResponse(
      _castAuth(authModular),
      response.mfaInfo
    );
  }

  return {
    data: {
      email:
        (response.requestType === ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL
          ? response.newEmail
          : response.email) || null,
      previousEmail:
        (response.requestType === ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL
          ? response.email
          : response.newEmail) || null,
      multiFactorInfo
    },
    operation
  };
}

/**
 * Checks a password reset code sent to the user by email or other out-of-band mechanism.
 *
 * @returns the user's email address if valid.
 *
 * @param auth - The {@link Auth} instance.
 * @param code - A verification code sent to the user.
 *
 * @public
 */
export async function verifyPasswordResetCode(
  auth: Auth,
  code: string
): Promise<string> {
  const { data } = await checkActionCode(getModularInstance(auth), code);
  // Email should always be present since a code was sent to it
  return data.email!;
}

/**
 * Creates a new user account associated with the specified email address and password.
 *
 * @remarks
 * On successful creation of the user account, this user will also be signed in to your application.
 *
 * User account creation can fail if the account already exists or the password is invalid.
 *
 * Note: The email address acts as a unique identifier for the user and enables an email-based
 * password reset. This function will create a new user account and set the initial user password.
 *
 * @param auth - The {@link Auth} instance.
 * @param email - The user's email address.
 * @param password - The user's chosen password.
 *
 * @public
 */
export async function createUserWithEmailAndPassword(
  auth: Auth,
  email: string,
  password: string
): Promise<UserCredential> {
  const authInternal = _castAuth(auth);
  const request: SignUpRequest = {
    returnSecureToken: true,
    email,
    password,
    clientType: RecaptchaClientType.WEB
  };
  const signUpResponse: Promise<IdTokenResponse> = handleRecaptchaFlow(
    authInternal,
    request,
    RecaptchaActionName.SIGN_UP_PASSWORD,
    signUp
  );
  const response = await signUpResponse.catch(error => {
    if (
      error.code === `auth/${AuthErrorCode.PASSWORD_DOES_NOT_MEET_REQUIREMENTS}`
    ) {
      void recachePasswordPolicy(auth);
    }

    throw error;
  });

  const userCredential = await UserCredentialImpl._fromIdTokenResponse(
    authInternal,
    OperationType.SIGN_IN,
    response
  );
  await authInternal._updateCurrentUser(userCredential.user);

  return userCredential;
}

/**
 * Asynchronously signs in using an email and password.
 *
 * @remarks
 * Fails with an error if the email address and password do not match.
 * When [Email Enumeration Protection](https://cloud.google.com/identity-platform/docs/admin/email-enumeration-protection) is enabled,
 * this method fails with "auth/invalid-credential" in case of an invalid email/password.
 *
 * Note: The user's password is NOT the password used to access the user's email account. The
 * email address serves as a unique identifier for the user, and the password is used to access
 * the user's account in your Firebase project. See also: {@link createUserWithEmailAndPassword}.
 *
 * @param auth - The {@link Auth} instance.
 * @param email - The users email address.
 * @param password - The users password.
 *
 * @public
 */
export function signInWithEmailAndPassword(
  auth: Auth,
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithCredential(
    getModularInstance(auth),
    EmailAuthProvider.credential(email, password)
  ).catch(async error => {
    if (
      error.code === `auth/${AuthErrorCode.PASSWORD_DOES_NOT_MEET_REQUIREMENTS}`
    ) {
      void recachePasswordPolicy(auth);
    }

    throw error;
  });
}
