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
import { EmailAuthProvider } from '../providers/email';
import { _getCurrentUrl } from '../util/location';
import { _setActionCodeSettingsOnRequest } from './action_code_settings';
import { signInWithCredential } from './credential';
import { AuthErrorCode } from '../errors';
import { _assert } from '../util/assert';

/**
 * Sends a sign-in email link to the user with the specified email.
 *
 * @remarks
 * The sign-in operation has to always be completed in the app unlike other out of band email
 * actions (password reset and email verifications). This is because, at the end of the flow,
 * the user is expected to be signed in and their Auth state persisted within the app.
 *
 * To complete sign in with the email link, call {@link signInWithEmailLink} with the email
 * address and the email link supplied in the email sent to the user.
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
 * await sendSignInLinkToEmail(auth, 'user@example.com', actionCodeSettings);
 * // Obtain emailLink from the user.
 * if(isSignInWithEmailLink(auth, emailLink)) {
 *   await signInWithEmailLink('user@example.com', 'user@example.com', emailLink);
 * }
 * ```
 *
 * @param auth - The Auth instance.
 * @param email - The user's email address.
 * @param actionCodeSettings - The {@link @firebase/auth-types#ActionCodeSettings}.
 *
 * @public
 */
export async function sendSignInLinkToEmail(
  auth: externs.Auth,
  email: string,
  actionCodeSettings?: externs.ActionCodeSettings
): Promise<void> {
  const request: api.EmailSignInRequest = {
    requestType: externs.Operation.EMAIL_SIGNIN,
    email
  };
  _assert(
    actionCodeSettings?.handleCodeInApp,
    auth,
    AuthErrorCode.ARGUMENT_ERROR
  );
  if (actionCodeSettings) {
    _setActionCodeSettingsOnRequest(auth, request, actionCodeSettings);
  }

  await api.sendSignInLinkToEmail(auth, request);
}

/**
 * Checks if an incoming link is a sign-in with email link suitable for {@link signInWithEmailLink}.
 *
 * @param auth - The Auth instance.
 * @param emailLink - The link sent to the user's email address.
 *
 * @public
 */
export function isSignInWithEmailLink(
  auth: externs.Auth,
  emailLink: string
): boolean {
  const actionCodeUrl = ActionCodeURL.parseLink(emailLink);
  return actionCodeUrl?.operation === externs.Operation.EMAIL_SIGNIN;
}

/**
 * Asynchronously signs in using an email and sign-in email link.
 *
 * @remarks
 * If no link is passed, the link is inferred from the current URL.
 *
 * Fails with an error if the email address is invalid or OTP in email link expires.
 *
 * Note: Confirm the link is a sign-in email link before calling this method firebase.auth.Auth.isSignInWithEmailLink.
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
 * await sendSignInLinkToEmail(auth, 'user@example.com', actionCodeSettings);
 * // Obtain emailLink from the user.
 * if(isSignInWithEmailLink(auth, emailLink)) {
 *   await signInWithEmailLink('user@example.com', 'user@example.com', emailLink);
 * }
 * ```
 *
 * @param auth - The Auth instance.
 * @param email - The user's email address.
 * @param emailLink - The link sent to the user's email address.
 *
 * @public
 */
export async function signInWithEmailLink(
  auth: externs.Auth,
  email: string,
  emailLink?: string
): Promise<externs.UserCredential> {
  const credential = EmailAuthProvider.credentialWithLink(
    email,
    emailLink || _getCurrentUrl()
  );
  // Check if the tenant ID in the email link matches the tenant ID on Auth
  // instance.
  _assert(
    credential.tenantId === (auth.tenantId || null),
    auth,
    AuthErrorCode.TENANT_ID_MISMATCH
  );
  return signInWithCredential(auth, credential);
}
