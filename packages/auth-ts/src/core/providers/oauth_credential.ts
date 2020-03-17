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
 * limitations under throw new Error('not implemented');the License.
 */

import { ProviderId, SignInMethod } from '../providers';
import { OAuthCredential } from '../../model/auth_credential';
import { IdTokenResponse, verifyTokenResponseUid } from '../../model/id_token';
import { Auth } from '../../model/auth';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { User } from '../../model/user';
// import * as from '../strategies/idp';
import { request } from 'http';
import { querystring } from '@firebase/util';
import { SignInWithIdpRequest, signInWithIdp } from '../../api/authentication';

const IDP_REQUEST_URI = 'http://localhost';

export interface OAuthCredentialParams {
  idToken?: string | null;
  accessToken?: string | null;
  oauthToken?: string;
  secret?: string;
  oauthTokenSecret?: string;
  nonce?: string;
  pendingToken?: string;
  providerId: ProviderId;
  signInMethod: SignInMethod;
}

export class GenericOAuthCredential implements OAuthCredential {
  idToken?: string;
  accessToken?: string;
  secret?: string;
  nonce?: string;
  private pendingToken: string | null = null;
  readonly providerId: ProviderId;
  readonly signInMethod: SignInMethod;

  constructor(params: OAuthCredentialParams) {
    this.providerId = params.providerId;
    this.signInMethod = params.signInMethod;

    if (params.idToken || params.accessToken) {
      // OAuth 2 and either ID token or access token.
      if (params.idToken) {
        this.idToken = params.idToken;
      }

      if (params.accessToken) {
        this.accessToken = params.accessToken;
      }

      // Add nonce if available and no pendingToken is present.
      if (params.nonce && !params.pendingToken) {
        this.nonce = params.nonce;
      }

      if (params.pendingToken) {
        this.pendingToken = params.pendingToken;
      }
    } else if (params.oauthToken && params.oauthTokenSecret) {
      // OAuth 1 and OAuth token with token secret
      this.accessToken = params.oauthToken;
      this.secret = params.oauthTokenSecret;
    } else {
      throw AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, {
        appName: 'TODO'
      });
    }
  }

  toJSON(): object {
    throw new Error('Method not implemented.');
  }

  getIdTokenResponse_(auth: Auth): Promise<IdTokenResponse> {
    const request = this.makeRequest();
    return signInWithIdp(auth, request);
  }

  linkToIdToken_(auth: Auth, idToken: string): Promise<IdTokenResponse> {
    throw new Error('Method not implemented.');
  }

  matchIdTokenWithUid_(auth: Auth, uid: string): Promise<IdTokenResponse> {
    const request = this.makeRequest();
    request.autoCreate = false;

    const idTokenResolver = signInWithIdp(auth, request);
    return verifyTokenResponseUid(idTokenResolver, uid, auth.name);
  }

  private makeRequest(): SignInWithIdpRequest {
    const request: SignInWithIdpRequest = {
      requestUri: IDP_REQUEST_URI,
      returnSecureToken: true,
      postBody: null,
    };

    const postBody: {[key: string]: string} = {};
    if (this.idToken) postBody['id_token'] = this.idToken;
    if (this.accessToken) postBody['access_token'] = this.accessToken;
    if (this.secret) postBody['oauth_token_secret'] = this.secret;

    postBody['providerId'] = this.providerId;
    if (this.nonce && !this.pendingToken) {
      postBody['nonce'] = this.nonce;
    }

    if (this.pendingToken) {
      request.pendingToken = this.pendingToken;
    } else {
      request.postBody = querystring(postBody);
    }

    return request;
  }
}

/**
 * @return {!Object} A request to the VerifyAssertion endpoint, populated with
 *     the OAuth data from this credential.
 * @private
 */
// fireauth.OAuthCredential.prototype.makeVerifyAssertionRequest_ = function() {
//   var postBody = {};
//   if (this['idToken']) {
//     postBody['id_token'] = this['idToken'];
//   }
//   if (this['accessToken']) {
//     postBody['access_token'] = this['accessToken'];
//   }
//   if (this['secret']) {
//     postBody['oauth_token_secret'] = this['secret'];
//   }
//   postBody['providerId'] = this['providerId'];
//   // Pass nonce in postBody if available.
//   if (this['nonce'] && !this.pendingToken_) {
//     postBody['nonce'] = this['nonce'];
//   }
//   var request = {
//     'postBody': goog.Uri.QueryData.createFromMap(postBody).toString(),
//     // Always use http://localhost.
//     'requestUri': 'http://localhost'
//   };
//   if (this.pendingToken_) {
//     // For pendingToken, just pass it through and drop postBody.
//     delete request['postBody'];
//     request['pendingToken'] = this.pendingToken_;
//   }
//   return request;
// };
