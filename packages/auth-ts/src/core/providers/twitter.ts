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

import { AuthProvider, ProviderId, SignInMethod } from '../providers';
import { UserCredential } from '../../model/user_credential';
import { AuthErrorCode, AUTH_ERROR_FACTORY } from '../errors';
import { CustomParameters, OAuthProvider } from './oauth';
import { AuthCredential, OAuthCredential } from '../../model/auth_credential';
import { GenericOAuthCredential } from './oauth_credential';

// var tokenObject = tokenOrObject;
//   if (!goog.isObject(tokenObject)) {
//     tokenObject = {
//       'oauthToken': tokenOrObject,
//       'oauthTokenSecret': secret
//     };
//   }

//   if (!tokenObject['oauthToken'] || !tokenObject['oauthTokenSecret']) {
//     throw new fireauth.AuthError(fireauth.authenum.Error.ARGUMENT_ERROR,
//         'credential failed: expected 2 arguments (the OAuth access token ' +
//         'and secret).');
//   }

//   return new fireauth.OAuthCredential(fireauth.idp.ProviderId.TWITTER,
//       /** @type {!fireauth.OAuthResponse} */ (tokenObject),
//       fireauth.idp.SignInMethod.TWITTER);

export interface TwitterToken {
  oauthToken: string;
  oauthTokenSecret: string;
}

export class TwitterAuthProvider extends OAuthProvider {
  static readonly PROVIDER_ID = ProviderId.TWITTER;
  static readonly TWITTER_SIGN_IN_METHOD = SignInMethod.TWITTER;
  readonly providerId = TwitterAuthProvider.PROVIDER_ID;
  static credential(
    token: string | TwitterToken,
    secret: string
  ): AuthCredential {
    let tokenObject: TwitterToken;
    if (typeof token === 'string') {
      tokenObject = {
        oauthToken: token,
        oauthTokenSecret: secret
      };
    } else {
      tokenObject = token;
    }

    if (!tokenObject.oauthToken || !tokenObject.oauthTokenSecret) {
      throw AUTH_ERROR_FACTORY.create(AuthErrorCode.ARGUMENT_ERROR, {
        appName: 'todo'
      });
    }

    return new GenericOAuthCredential({
      ...tokenObject,
      providerId: TwitterAuthProvider.PROVIDER_ID,
      signInMethod: TwitterAuthProvider.TWITTER_SIGN_IN_METHOD
    });
  }
  static credentialFromResult(
    userCredential: UserCredential
  ): OAuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromError(error: AuthErrorCode): OAuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromJSON(json: object): OAuthCredential {
    throw new Error('not implemented');
  }
  setCustomParameters(customOAuthParameters: CustomParameters): AuthProvider {
    throw new Error('not implemented');
  }
  getCustomParameters(): CustomParameters {
    return {};
  }
}
