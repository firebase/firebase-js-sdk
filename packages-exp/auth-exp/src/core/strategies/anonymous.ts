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
import { signUp } from '../../api/authentication/sign_up';
import { User } from '../../model/user';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { _castAuth } from '../auth/auth_impl';

export async function signInAnonymously(
  auth: externs.Auth
): Promise<externs.UserCredential> {
  const authInternal = _castAuth(auth);
  if (authInternal.currentUser?.isAnonymous) {
    // If an anonymous user is already signed in, no need to sign them in again.
    return new UserCredentialImpl({
      user: authInternal.currentUser as User,
      providerId: null,
      operationType: externs.OperationType.SIGN_IN
    });
  }
  const response = await signUp(authInternal, {
    returnSecureToken: true
  });
  const userCredential = await UserCredentialImpl._fromIdTokenResponse(
    authInternal,
    externs.OperationType.SIGN_IN,
    response,
    true
  );
  await authInternal._updateCurrentUser(userCredential.user);
  return userCredential;
}
