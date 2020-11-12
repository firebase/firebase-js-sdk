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
import { querystring } from '@firebase/util';

import {
  signInWithIdp,
  SignInWithIdpRequest
} from '../../api/authentication/idp';
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { AuthErrorCode } from '../errors';
import { _fail } from '../util/assert';
import { AuthCredential } from './auth_credential';

const IDP_REQUEST_URI = 'http://localhost';

/**
 * @internal
 */
export interface OAuthCredentialParams {
  // OAuth 2 uses either id token or access token
  idToken?: string | null;
  accessToken?: string | null;

  // These fields are used with OAuth 1
  oauthToken?: string;
  secret?: string;
  oauthTokenSecret?: string;

  // Nonce is only set if pendingToken is not present
  nonce?: string;
  pendingToken?: string;

  // Utilities
  providerId: string;
  signInMethod: string;
}

/**
 * {@inheritdoc @firebase/auth-types#OAuthCredential}
 *
 * @public
 */
export class OAuthCredential
  extends AuthCredential
  implements externs.OAuthCredential {
  /** {@inheritdoc @firebase/auth-types#OAuthCredential.idToken} @readonly */
  idToken?: string;
  /** {@inheritdoc @firebase/auth-types#OAuthCredential.accessToken} @readonly */
  accessToken?: string;
  /** {@inheritdoc @firebase/auth-types#OAuthCredential.secret} @readonly */
  secret?: string;
  /** @internal */
  nonce?: string;
  private pendingToken: string | null = null;

  /** @internal */
  static _fromParams(params: OAuthCredentialParams): OAuthCredential {
    const cred = new OAuthCredential(params.providerId, params.signInMethod);

    if (params.idToken || params.accessToken) {
      // OAuth 2 and either ID token or access token.
      if (params.idToken) {
        cred.idToken = params.idToken;
      }

      if (params.accessToken) {
        cred.accessToken = params.accessToken;
      }

      // Add nonce if available and no pendingToken is present.
      if (params.nonce && !params.pendingToken) {
        cred.nonce = params.nonce;
      }

      if (params.pendingToken) {
        cred.pendingToken = params.pendingToken;
      }
    } else if (params.oauthToken && params.oauthTokenSecret) {
      // OAuth 1 and OAuth token with token secret
      cred.accessToken = params.oauthToken;
      cred.secret = params.oauthTokenSecret;
    } else {
      _fail(AuthErrorCode.ARGUMENT_ERROR);
    }

    return cred;
  }

  /** {@inheritdoc @firebase/auth-types#OAuthCredential.toJSON}  */
  toJSON(): object {
    return {
      idToken: this.idToken,
      accessToken: this.accessToken,
      secret: this.secret,
      nonce: this.nonce,
      pendingToken: this.pendingToken,
      providerId: this.providerId,
      signInMethod: this.signInMethod
    };
  }

  /** {@inheritdoc @firebase/auth-types#OAuthCredential.fromJSON} */
  static fromJSON(json: string | object): OAuthCredential | null {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    const { providerId, signInMethod, ...rest }: Partial<OAuthCredential> = obj;
    if (!providerId || !signInMethod) {
      return null;
    }

    const cred = new OAuthCredential(providerId, signInMethod);
    Object.assign(cred, rest);
    return cred;
  }

  /** @internal */
  _getIdTokenResponse(auth: Auth): Promise<IdTokenResponse> {
    const request = this.buildRequest();
    return signInWithIdp(auth, request);
  }

  /** @internal */
  _linkToIdToken(auth: Auth, idToken: string): Promise<IdTokenResponse> {
    const request = this.buildRequest();
    request.idToken = idToken;
    return signInWithIdp(auth, request);
  }

  /** @internal */
  _getReauthenticationResolver(auth: Auth): Promise<IdTokenResponse> {
    const request = this.buildRequest();
    request.autoCreate = false;
    return signInWithIdp(auth, request);
  }

  private buildRequest(): SignInWithIdpRequest {
    const request: SignInWithIdpRequest = {
      requestUri: IDP_REQUEST_URI,
      returnSecureToken: true,
      postBody: null
    };

    if (this.pendingToken) {
      request.pendingToken = this.pendingToken;
    } else {
      const postBody: Record<string, string> = {};
      if (this.idToken) {
        postBody['id_token'] = this.idToken;
      }
      if (this.accessToken) {
        postBody['access_token'] = this.accessToken;
      }
      if (this.secret) {
        postBody['oauth_token_secret'] = this.secret;
      }

      postBody['providerId'] = this.providerId;
      if (this.nonce && !this.pendingToken) {
        postBody['nonce'] = this.nonce;
      }

      request.postBody = querystring(postBody);
    }

    return request;
  }
}
