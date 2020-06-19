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

import { OperationType } from '@firebase/auth-types-exp';

import { signInWithIdp, SignInWithIdpRequest } from '../../api/authentication/idp';
import { Auth } from '../../model/auth';
import { User, UserCredential } from '../../model/user';
import { _authCredentialFromTokenResponse } from '../credentials/inferred';
import { _link as _linkUser } from '../user/link_unlink';
import { _reauthenticate } from '../user/reauthenticate';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { assert } from '../util/assert';

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

export async function _signIn(params: IdpTaskParams): Promise<UserCredential> {
  const request = paramsToRequest(params);
  const auth = params.auth;

  const response = await signInWithIdp(auth, request);

  const credential = _authCredentialFromTokenResponse(response);
  const userCredential = await UserCredentialImpl._fromIdTokenResponse(
    auth,
    credential,
    OperationType.SIGN_IN,
    response
  );

  return userCredential;
}

export async function _reauth(params: IdpTaskParams): Promise<UserCredential> {
  const { auth, user } = params;
  assert(user, auth.name);
  const requestPromise = signInWithIdp(auth, paramsToRequest(params));
  return _reauthenticate(user, requestPromise);
}

export async function _link(params: IdpTaskParams): Promise<UserCredential> {
  const { auth, user } = params;
  assert(user, auth.name);
  
  const request = paramsToRequest(params);
  request.idToken = await user.getIdToken();

  return _linkUser(user, signInWithIdp(auth, request));
}
