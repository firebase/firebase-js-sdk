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
  ActionCodeOperation,
  ActionCodeSettings,
  Auth,
  User
} from '../../model/public_types';

import {
  createAuthUri,
  CreateAuthUriRequest
} from '../../api/authentication/create_auth_uri';
import * as api from '../../api/authentication/email_and_password';
import { UserInternal } from '../../model/user';
import { _getCurrentUrl, _isHttpOrHttps } from '../util/location';
import { _setActionCodeSettingsOnRequest } from './action_code_settings';
import { getModularInstance } from '@firebase/util';

/**
 * Gets the list of possible sign in methods for the given email address. This method returns an
 * empty list when [Email Enumeration Protection](https://cloud.google.com/identity-platform/docs/admin/email-enumeration-protection) is enabled, irrespective of the number of
 * authentication methods available for the given email.
 *
 * @remarks
 * This is useful to differentiate methods of sign-in for the same provider, eg.
 * {@link EmailAuthProvider} which has 2 methods of sign-in,
 * {@link SignInMethod}.EMAIL_PASSWORD and
 * {@link SignInMethod}.EMAIL_LINK.
 *
 * @param auth - The {@link Auth} instance.
 * @param email - The user's email address.
 *
 * Deprecated. Migrating off of this method is recommended as a security best-practice.
 * Learn more in the Identity Platform documentation for [Email Enumeration Protection](https://cloud.google.com/identity-platform/docs/admin/email-enumeration-protection).
 * @public
 */
export async function fetchSignInMethodsForEmail(
  auth: Auth,
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

  const { signinMethods } = await createAuthUri(
    getModularInstance(auth),
    request
  );

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
 * @param actionCodeSettings - The {@link ActionCodeSettings}.
 *
 * @public
 */
export async function sendEmailVerification(
  user: User,
  actionCodeSettings?: ActionCodeSettings | null
): Promise<void> {
  const userInternal = getModularInstance(user) as UserInternal;
  const idToken = await user.getIdToken();
  const request: api.VerifyEmailRequest = {
    requestType: ActionCodeOperation.VERIFY_EMAIL,
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
 * @param actionCodeSettings - The {@link ActionCodeSettings}.
 *
 * @public
 */
export async function verifyBeforeUpdateEmail(
  user: User,
  newEmail: string,
  actionCodeSettings?: ActionCodeSettings | null
): Promise<void> {
  const userInternal = getModularInstance(user) as UserInternal;
  const idToken = await user.getIdToken();
  const request: api.VerifyAndChangeEmailRequest = {
    requestType: ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL,
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
