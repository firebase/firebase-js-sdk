/**
 * @license
 * Copyright 2019 Google LLC
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

import {
  signInWithIdp,
  SignInWithIdpRequest
} from '../../api/authentication/idp';
import { PhoneOrOauthTokenResponse } from '../../api/authentication/mfa';
import { AuthInternal } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { UserInternal, UserCredentialInternal } from '../../model/user';
import { AuthCredential } from '../credentials';
import { _link as _linkUser } from '../user/link_unlink';
import { _reauthenticate } from '../user/reauthenticate';
import { _assert } from '../util/assert';
import { _signInWithCredential } from './credential';
import { AuthErrorCode } from '../errors';
import { ProviderId } from '../../model/enums';

export interface IdpTaskParams {
  auth: AuthInternal;
  requestUri: string;
  sessionId?: string;
  tenantId?: string;
  postBody?: string;
  pendingToken?: string;
  user?: UserInternal;
  bypassAuthState?: boolean;
}

export type IdpTask = (
  params: IdpTaskParams
) => Promise<UserCredentialInternal>;

class IdpCredential extends AuthCredential {
  constructor(readonly params: IdpTaskParams) {
    super(ProviderId.CUSTOM, ProviderId.CUSTOM);
  }

  _getIdTokenResponse(auth: AuthInternal): Promise<PhoneOrOauthTokenResponse> {
    return signInWithIdp(auth, this._buildIdpRequest());
  }

  _linkToIdToken(
    auth: AuthInternal,
    idToken: string
  ): Promise<IdTokenResponse> {
    return signInWithIdp(auth, this._buildIdpRequest(idToken));
  }

  _getReauthenticationResolver(auth: AuthInternal): Promise<IdTokenResponse> {
    return signInWithIdp(auth, this._buildIdpRequest());
  }

  private _buildIdpRequest(idToken?: string): SignInWithIdpRequest {
    const request: SignInWithIdpRequest = {
      requestUri: this.params.requestUri,
      sessionId: this.params.sessionId,
      postBody: this.params.postBody,
      tenantId: this.params.tenantId,
      pendingToken: this.params.pendingToken,
      returnSecureToken: true,
      returnIdpCredential: true
    };

    if (idToken) {
      request.idToken = idToken;
    }

    return request;
  }
}

export function _signIn(
  params: IdpTaskParams
): Promise<UserCredentialInternal> {
  return _signInWithCredential(
    params.auth,
    new IdpCredential(params),
    params.bypassAuthState
  ) as Promise<UserCredentialInternal>;
}

export function _reauth(
  params: IdpTaskParams
): Promise<UserCredentialInternal> {
  const { auth, user } = params;
  _assert(user, auth, AuthErrorCode.INTERNAL_ERROR);
  return _reauthenticate(
    user,
    new IdpCredential(params),
    params.bypassAuthState
  );
}

export async function _link(
  params: IdpTaskParams
): Promise<UserCredentialInternal> {
  const { auth, user } = params;
  _assert(user, auth, AuthErrorCode.INTERNAL_ERROR);
  return _linkUser(user, new IdpCredential(params), params.bypassAuthState);
}
