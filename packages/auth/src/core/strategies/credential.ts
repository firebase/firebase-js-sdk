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

import { UserCredential, Auth, User } from '../../model/public_types';

import { _processCredentialSavingMfaContextIfNecessary } from '../../mfa/mfa_error';
import { AuthInternal } from '../../model/auth';
import { UserInternal } from '../../model/user';
import { AuthCredential } from '../credentials';
import { _assertLinkedStatus, _link } from '../user/link_unlink';
import { _reauthenticate } from '../user/reauthenticate';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { _castAuth } from '../auth/auth_impl';
import { getModularInstance } from '@firebase/util';
import { OperationType } from '../../model/enums';

export async function _signInWithCredential(
  auth: AuthInternal,
  credential: AuthCredential,
  bypassAuthState = false
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

  if (!bypassAuthState) {
    await auth._updateCurrentUser(userCredential.user);
  }
  return userCredential;
}

/**
 * Asynchronously signs in with the given credentials.
 *
 * @remarks
 * An {@link AuthProvider} can be used to generate the credential.
 *
 * @param auth - The {@link Auth} instance.
 * @param credential - The auth credential.
 *
 * @public
 */
export async function signInWithCredential(
  auth: Auth,
  credential: AuthCredential
): Promise<UserCredential> {
  return _signInWithCredential(_castAuth(auth), credential);
}

/**
 * Links the user account with the given credentials.
 *
 * @remarks
 * An {@link AuthProvider} can be used to generate the credential.
 *
 * @param user - The user.
 * @param credential - The auth credential.
 *
 * @public
 */
export async function linkWithCredential(
  user: User,
  credential: AuthCredential
): Promise<UserCredential> {
  const userInternal = getModularInstance(user) as UserInternal;

  await _assertLinkedStatus(false, userInternal, credential.providerId);

  return _link(userInternal, credential);
}

/**
 * Re-authenticates a user using a fresh credential.
 *
 * @remarks
 * Use before operations such as {@link updatePassword} that require tokens from recent sign-in
 * attempts. This method can be used to recover from a `CREDENTIAL_TOO_OLD_LOGIN_AGAIN` error
 * or a `TOKEN_EXPIRED` error.
 *
 * @param user - The user.
 * @param credential - The auth credential.
 *
 * @public
 */
export async function reauthenticateWithCredential(
  user: User,
  credential: AuthCredential
): Promise<UserCredential> {
  return _reauthenticate(getModularInstance(user) as UserInternal, credential);
}
