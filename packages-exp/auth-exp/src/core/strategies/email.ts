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
import { _setActionCodeSettingsOnRequest } from './action_code_settings';

/**
 * Gets the list of possible sign in methods for the given email address.
 *
 * @remarks
 * This is useful to differentiate methods of sign-in for the same provider, eg.
 * {@link EmailAuthProvider} which has 2 methods of sign-in,
 * {@link @firebase/auth-types#SignInMethod.EMAIL_PASSWORD} and
 * {@link @firebase/auth-types#SignInMethod.EMAIL_LINK} .
 *
 * @param auth - The Auth instance.
 * @param email - The user's email address.
 *
 * @public
 */
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

/**
 * Sends a verification email to a user.
 *
 * @remarks
 * The verification process is completed by calling {@link applyActionCode}.
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
 * await sendEmailVerification(user, actionCodeSettings);
 * // Obtain code from the user.
 * await applyActionCode(auth, code);
 * ```
 *
 * @param user - The user.
 * @param actionCodeSettings - The {@link @firebase/auth-types#ActionCodeSettings}.
 *
 * @public
 */
export async function sendEmailVerification(
  user: externs.User,
  actionCodeSettings?: externs.ActionCodeSettings | null
): Promise<void> {
  const userInternal = user as User;
  const idToken = await user.getIdToken();
  const request: api.VerifyEmailRequest = {
    requestType: externs.Operation.VERIFY_EMAIL,
    idToken
  };
  if (actionCodeSettings) {
    _setActionCodeSettingsOnRequest(
      userInternal.auth,
      request,
      actionCodeSettings
    );
  }

  const { email } = await api.sendEmailVerification(userInternal.auth, request);

  if (email !== user.email) {
    await user.reload();
  }
}

/**
 * Sends a verification email to a new email address.
 *
 * @remarks
 * The user's email will be updated to the new one after being verified.
 *
 * If you have a custom email action handler, you can complete the verification process by calling
 * {@link applyActionCode}.
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
 * await verifyBeforeUpdateEmail(user, 'newemail@example.com', actionCodeSettings);
 * // Obtain code from the user.
 * await applyActionCode(auth, code);
 * ```
 *
 * @param user - The user.
 * @param newEmail - The new email address to be verified before update.
 * @param actionCodeSettings - The {@link @firebase/auth-types#ActionCodeSettings}.
 *
 * @public
 */
export async function verifyBeforeUpdateEmail(
  user: externs.User,
  newEmail: string,
  actionCodeSettings?: externs.ActionCodeSettings | null
): Promise<void> {
  const userInternal = user as User;
  const idToken = await user.getIdToken();
  const request: api.VerifyAndChangeEmailRequest = {
    requestType: externs.Operation.VERIFY_AND_CHANGE_EMAIL,
    idToken,
    newEmail
  };
  if (actionCodeSettings) {
    _setActionCodeSettingsOnRequest(
      userInternal.auth,
      request,
      actionCodeSettings
    );
  }

  const { email } = await api.verifyAndChangeEmail(userInternal.auth, request);

  if (email !== user.email) {
    // If the local copy of the email on user is outdated, reload the
    // user.
    await user.reload();
  }
}
