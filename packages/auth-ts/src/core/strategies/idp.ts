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

import { Auth } from '../..';
import { UserCredential, OperationType } from '../../model/user_credential';
import { SignInWithIdpRequest, signInWithIdp } from '../../api/authentication';
import { initializeCurrentUserFromIdTokenResponse } from '.';
import { authCredentialFromTokenResponse } from './auth_credential';

export type IdpTask = (
  auth: Auth,
  requestUri: string,
  sessionId: string,
  tenantId: string,
  postBody?: string
) => Promise<UserCredential>;

export async function signIn(
  auth: Auth,
  requestUri: string,
  sessionId: string,
  tenantId: string,
  postBody?: string
): Promise<UserCredential> {
  const request: SignInWithIdpRequest = {
    requestUri,
    sessionId,
    postBody: postBody || null,
    tenantId,
    returnSecureToken: true
  };

  const response = await signInWithIdp(auth, request);
  const user = await initializeCurrentUserFromIdTokenResponse(auth, response);
  const credential = authCredentialFromTokenResponse(response);
  auth.updateCurrentUser(user);
  return new UserCredential(user, credential, OperationType.SIGN_IN);
}
