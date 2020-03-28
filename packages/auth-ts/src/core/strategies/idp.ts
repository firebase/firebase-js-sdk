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
import { User } from '../../model/user';
import { verifyTokenResponseUid } from '../../model/id_token';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { callApiWithMfaContext } from '../mfa/error_processor';

export interface IdpTaskParams {
  auth: Auth;
  requestUri: string;
  sessionId?: string;
  tenantId?: string;
  postBody?: string;
  pendingToken?: string;
  user?: User;
}

export type IdpTask = (params: IdpTaskParams) => Promise<UserCredential>;

function paramsToRequest({
  auth,
  requestUri,
  sessionId,
  tenantId,
  pendingToken,
  postBody
}: IdpTaskParams): SignInWithIdpRequest {
  return {
    requestUri,
    sessionId,
    postBody: postBody || null,
    tenantId,
    pendingToken,
    returnSecureToken: true
  };
}

export async function signIn(params: IdpTaskParams): Promise<UserCredential> {
  const request = paramsToRequest(params);
  const auth = params.auth;

  const response = await callApiWithMfaContext(
    () => signInWithIdp(auth, request),
    OperationType.SIGN_IN
  );
  const user = await initializeCurrentUserFromIdTokenResponse(auth, response);
  const credential = authCredentialFromTokenResponse(response);
  return new UserCredential(user, credential, OperationType.SIGN_IN);
}

export async function reauth(params: IdpTaskParams): Promise<UserCredential> {
  const { auth, user } = params;

  if (!user) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, {
      appName: auth.name
    });
  }
  const request = paramsToRequest(params);

  const requestPromise = callApiWithMfaContext(
    () => signInWithIdp(auth, request),
    OperationType.REAUTHENTICATE,
    user
  );
  const idTokenResponse = await verifyTokenResponseUid(
    requestPromise,
    user.uid,
    auth.name
  );
  user.stsTokenManager.updateFromServerResponse(idTokenResponse);
  const cred = authCredentialFromTokenResponse(idTokenResponse);
  const userCred = new UserCredential(user, cred, OperationType.REAUTHENTICATE);

  await user.reload(auth);
  return userCred;
}

export async function link(params: IdpTaskParams): Promise<UserCredential> {
  const { auth, user } = params;
  if (!user) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, {
      appName: auth.name
    });
  }
  const request = paramsToRequest(params);
  request.idToken = await user.getIdToken();

  const idTokenResponse = await callApiWithMfaContext(
    () => signInWithIdp(auth, request),
    OperationType.LINK,
    user
  );
  user.stsTokenManager.updateFromServerResponse(idTokenResponse);
  const cred = authCredentialFromTokenResponse(idTokenResponse);
  const userCred = new UserCredential(user, cred, OperationType.LINK);

  await user.reload(auth);
  return userCred;
}
