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

import * as externs from '@firebase/auth-types-exp';
import {
  signInWithIdp,
  SignInWithIdpRequest
} from '../../api/authentication/idp';
import { PhoneOrOauthTokenResponse } from '../../api/authentication/mfa';
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { User, UserCredential } from '../../model/user';
import { AuthCredential } from '../credentials';
import { _link as _linkUser } from '../user/link_unlink';
import { _reauthenticate } from '../user/reauthenticate';
import { _assert } from '../util/assert';
import { _signInWithCredential } from './credential';
import { AuthErrorCode } from '../errors';

/** @internal */
export interface IdpTaskParams {
  auth: Auth;
  requestUri: string;
  sessionId?: string;
  tenantId?: string;
  postBody?: string;
  pendingToken?: string;
  user?: User;
  bypassAuthState?: boolean;
}

/** @internal */
export type IdpTask = (params: IdpTaskParams) => Promise<UserCredential>;

/** @internal */
class IdpCredential extends AuthCredential {
  constructor(readonly params: IdpTaskParams) {
    super(externs.ProviderId.CUSTOM, externs.ProviderId.CUSTOM);
  }

  _getIdTokenResponse(auth: Auth): Promise<PhoneOrOauthTokenResponse> {
    return signInWithIdp(auth, this._buildIdpRequest());
  }

  _linkToIdToken(auth: Auth, idToken: string): Promise<IdTokenResponse> {
    return signInWithIdp(auth, this._buildIdpRequest(idToken));
  }

  _getReauthenticationResolver(auth: Auth): Promise<IdTokenResponse> {
    return signInWithIdp(auth, this._buildIdpRequest());
  }

  private _buildIdpRequest(idToken?: string): SignInWithIdpRequest {
    const request: SignInWithIdpRequest = {
      requestUri: this.params.requestUri,
      sessionId: this.params.sessionId,
      postBody: this.params.postBody || null,
      tenantId: this.params.tenantId,
      pendingToken: this.params.pendingToken,
      returnSecureToken: true
    };

    if (idToken) {
      request.idToken = idToken;
    }

    return request;
  }
}

/** @internal */
export function _signIn(params: IdpTaskParams): Promise<UserCredential> {
  return _signInWithCredential(
    params.auth,
    new IdpCredential(params),
    params.bypassAuthState
  ) as Promise<UserCredential>;
}

/** @internal */
export function _reauth(params: IdpTaskParams): Promise<UserCredential> {
  const { auth, user } = params;
  _assert(user, auth, AuthErrorCode.INTERNAL_ERROR);
  return _reauthenticate(
    user,
    new IdpCredential(params),
    params.bypassAuthState
  );
}

/** @internal */
export async function _link(params: IdpTaskParams): Promise<UserCredential> {
  const { auth, user } = params;
  _assert(user, auth, AuthErrorCode.INTERNAL_ERROR);
  return _linkUser(user, new IdpCredential(params), params.bypassAuthState);
}
