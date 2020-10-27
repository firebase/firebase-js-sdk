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
import { OperationType, UserCredential } from '@firebase/auth-types-exp';

import { _processCredentialSavingMfaContextIfNecessary } from '../../mfa/mfa_error';
import { Auth } from '../../model/auth';
import { User } from '../../model/user';
import { AuthCredential } from '../credentials';
import { _assertLinkedStatus, _link } from '../user/link_unlink';
import { _reauthenticate } from '../user/reauthenticate';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { _castAuth } from '../auth/auth_impl';

/** @internal */
export async function _signInWithCredential(
  auth: Auth,
  credential: AuthCredential
): Promise<UserCredential> {
  const operationType = OperationType.SIGN_IN;
  const response = await _processCredentialSavingMfaContextIfNecessary(
    auth,
    operationType,
    credential
  );
  const userCredential = await UserCredentialImpl._fromIdTokenResponse(
    auth,
    operationType,
    response
  );
  await auth._updateCurrentUser(userCredential.user);
  return userCredential;
}

/**
 * Asynchronously signs in with the given credentials.
 *
 * @remarks
 * An {@link @firebase/auth-types#AuthProvider} can be used to generate the credential.
 *
 * @param auth - The Auth instance.
 * @param credential - The auth credential.
 *
 * @public
 */
export async function signInWithCredential(
  auth: externs.Auth,
  credential: externs.AuthCredential
): Promise<externs.UserCredential> {
  return _signInWithCredential(_castAuth(auth), credential as AuthCredential);
}

/**
 * Links the user account with the given credentials.
 *
 * @remarks
 * An {@link @firebase/auth-types#AuthProvider} can be used to generate the credential.
 *
 * @param user - The user.
 * @param credential - The auth credential.
 *
 * @public
 */
export async function linkWithCredential(
  user: externs.User,
  credential: externs.AuthCredential
): Promise<UserCredential> {
  const userInternal = user as User;

  await _assertLinkedStatus(false, userInternal, credential.providerId);

  return _link(userInternal, credential as AuthCredential);
}

/**
 * Re-authenticates a user using a fresh credential.
 *
 * @remarks
 * Use before operations such as {@link updatePassword} that require tokens from recent sign-in
 * attempts. This method can be used to recover from a
 * {@link AuthErrorCode.CREDENTIAL_TOO_OLD_LOGIN_AGAIN} error.
 *
 * @param user - The user.
 * @param credential - The auth credential.
 *
 * @public
 */
export async function reauthenticateWithCredential(
  user: externs.User,
  credential: externs.AuthCredential
): Promise<externs.UserCredential> {
  return _reauthenticate(user as User, credential as AuthCredential);
}
