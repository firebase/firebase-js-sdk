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

import { Auth } from '../../model/auth';
import { User } from '../../model/user';
import { AuthCredential } from '../credentials';
import { _parseToken } from '../user/id_token_result';
import { _assertLinkedStatus, _link } from '../user/link_unlink';
import { _reauthenticate } from '../user/reauthenticate';
import { _reloadWithoutSaving } from '../user/reload';
import { UserCredentialImpl } from '../user/user_credential_impl';

export async function signInWithCredential<T extends externs.AuthCredential|null>(
  authExtern: externs.Auth,
  credentialExtern: externs.AuthCredential
): Promise<UserCredential<T>> {
  const auth = authExtern as Auth;
  const credential = credentialExtern as AuthCredential;
  // TODO: handle mfa by wrapping with callApiWithMfaContext
  const response = await credential._getIdTokenResponse(auth);
  const userCredential = await UserCredentialImpl._fromIdTokenResponse<T>(
    auth,
    credential,
    OperationType.SIGN_IN,
    response
  );
  await auth.updateCurrentUser(userCredential.user);
  return userCredential;
}

export async function linkWithCredential<T extends externs.AuthCredential|null>(
  userExtern: externs.User,
  credentialExtern: externs.AuthCredential
): Promise<UserCredential<T>> {
  const user = userExtern as User;
  const credential = credentialExtern as AuthCredential;

  await _assertLinkedStatus(false, user, credential.providerId);

  return _link(user, credential._linkToIdToken(
    user.auth,
    await user.getIdToken(),
  ));
}

export async function reauthenticateWithCredential<T extends externs.AuthCredential|null>(
  userExtern: externs.User,
  credentialExtern: externs.AuthCredential
): Promise<externs.UserCredential<T>> {
  const credential = credentialExtern as AuthCredential;
  const user = userExtern as User;

  return _reauthenticate(user, credential._getReauthenticationResolver(user.auth));
}

