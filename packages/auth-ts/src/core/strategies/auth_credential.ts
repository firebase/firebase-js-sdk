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
import { UserCredential, OperationType } from '../../model/user_credential';
import { ProviderId, SignInMethod } from '../providers';
import { Auth } from '../..';
import { initializeCurrentUserFromIdTokenResponse, checkIfAlreadyLinked } from '.';
import { IdTokenResponse } from '../../model/id_token';
import { User } from '../../model/user';
import { PhoneOrOauthTokenResponse } from '../../api/authentication';

export interface AuthCredential {
  readonly providerId: ProviderId;
  readonly signInMethod: string;
  toJSON(): object;
  getIdTokenResponse_(auth: Auth): Promise<PhoneOrOauthTokenResponse>;
  linkToIdToken_(auth: Auth, idToken: string): Promise<IdTokenResponse>;
}

export interface OAuthCredential extends AuthCredential {
  readonly idToken?: string;
  readonly accessToken?: string;
  readonly secret?: string;
}

export async function signInWithCredential(
  auth: Auth,
  credential: AuthCredential
): Promise<UserCredential> {
  const response: IdTokenResponse = await credential.getIdTokenResponse_(auth);
  const user = await initializeCurrentUserFromIdTokenResponse(auth, response);
  return new UserCredential(user, credential, OperationType.SIGN_IN);
}

export async function linkWithCredential(
  auth: Auth,
  user: User,
  credential: AuthCredential
): Promise<UserCredential> {
  await checkIfAlreadyLinked(auth, user, credential.providerId);
  const token = await user.getIdToken();
  const response = await credential.linkToIdToken_(auth, token);
  const newCred = authCredentialFromTokenResponse(response);

  if (response.idToken) {
    user.stsTokenManager.updateFromServerResponse(response);
  }

  await user.reload(auth);
  return new UserCredential(user, newCred, OperationType.LINK);
}

export function authCredentialFromTokenResponse(
  response: PhoneOrOauthTokenResponse
): AuthCredential | null {
  return null;
}