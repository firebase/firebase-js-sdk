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

export async function signInWithCredential(
  auth: externs.Auth,
  credential: externs.AuthCredential
): Promise<externs.UserCredential> {
  return _signInWithCredential(_castAuth(auth), credential as AuthCredential);
}

export async function linkWithCredential(
  userExtern: externs.User,
  credentialExtern: externs.AuthCredential
): Promise<UserCredential> {
  const user = userExtern as User;
  const credential = credentialExtern as AuthCredential;

  await _assertLinkedStatus(false, user, credential.providerId);

  return _link(user, credential);
}

export async function reauthenticateWithCredential(
  userExtern: externs.User,
  credentialExtern: externs.AuthCredential
): Promise<externs.UserCredential> {
  const credential = credentialExtern as AuthCredential;
  const user = userExtern as User;

  return _reauthenticate(user, credential);
}
