/**
 * @license
 * Copyright 2019 Google Inc.
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

import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { User, StsTokenManager } from '../../model/user';
import { ProviderId } from '../providers';
import { reloadWithoutSaving } from '../account_management/reload';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { AuthCredential } from '../../model/auth_credential';
import { updateAdditionalUserInfoFromIdTokenResponse } from '../account_management/additional_user_info';
import { OperationType, UserCredential } from '../../model/user_credential';

export async function userFromIdTokenResponse(
  auth: Auth,
  idTokenResponse: IdTokenResponse
): Promise<User> {
  const stsTokenManager = new StsTokenManager(idTokenResponse);
  // Initialize the Firebase Auth user.
  const user = new User({ stsTokenManager, uid: idTokenResponse.localId });

  // Updates the user info and data and resolves with a user instance.
  await user.reload(auth);
  return user;
}

export async function createUserCredentialFromIdTokenResponse(
  auth: Auth,
  credential: AuthCredential | null,
  operationType: OperationType,
  idTokenResponse: IdTokenResponse
): Promise<UserCredential> {
  const user = await initializeCurrentUserFromIdTokenResponse(
    auth,
    idTokenResponse
  );
  const userCred = new UserCredential(user, credential, operationType);
  updateAdditionalUserInfoFromIdTokenResponse(userCred, idTokenResponse);
  return userCred;
}

async function initializeCurrentUserFromIdTokenResponse(
  auth: Auth,
  idTokenResponse: IdTokenResponse
): Promise<User> {
  await auth.isInitialized();

  const user: User = await userFromIdTokenResponse(auth, idTokenResponse);
  await auth.updateCurrentUser(user);
  return user;
}

export async function checkIfAlreadyLinked(
  auth: Auth,
  user: User,
  provider: ProviderId,
  expected = false
) {
  await reloadWithoutSaving(auth, user);
  const providerIds = user.providerData.map(({ providerId }) => providerId);
  if (providerIds.includes(provider) !== expected) {
    const code =
      expected === false
        ? AuthErrorCode.PROVIDER_ALREADY_LINKED
        : AuthErrorCode.NO_SUCH_PROVIDER;
    throw AUTH_ERROR_FACTORY.create(code, {
      appName: auth.name
    });
  }
}
