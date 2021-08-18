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

import { Auth, UserCredential } from '../../model/public_types';
import { signUp } from '../../api/authentication/sign_up';
import { UserInternal } from '../../model/user';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { _castAuth } from '../auth/auth_impl';
import { OperationType } from '../../model/enums';

/**
 * Asynchronously signs in as an anonymous user.
 *
 * @remarks
 * If there is already an anonymous user signed in, that user will be returned; otherwise, a
 * new anonymous user identity will be created and returned.
 *
 * @param auth - The {@link Auth} instance.
 *
 * @public
 */
export async function signInAnonymously(auth: Auth): Promise<UserCredential> {
  const authInternal = _castAuth(auth);
  await authInternal._initializationPromise;
  if (authInternal.currentUser?.isAnonymous) {
    // If an anonymous user is already signed in, no need to sign them in again.
    return new UserCredentialImpl({
      user: authInternal.currentUser as UserInternal,
      providerId: null,
      operationType: OperationType.SIGN_IN
    });
  }
  const response = await signUp(authInternal, {
    returnSecureToken: true
  });
  const userCredential = await UserCredentialImpl._fromIdTokenResponse(
    authInternal,
    OperationType.SIGN_IN,
    response,
    true
  );
  await authInternal._updateCurrentUser(userCredential.user);
  return userCredential;
}
