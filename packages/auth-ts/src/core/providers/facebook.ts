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
import { AuthErrorCode } from '../errors';
import { OAuthProvider, CustomParameters } from './oauth';
import { OAuthCredential } from '../../model/auth_credential';
import {GenericOAuthCredential} from './oauth_credential';

export class FacebookAuthProvider extends OAuthProvider {
  static readonly PROVIDER_ID = ProviderId.FACEBOOK;
  static readonly FACEBOOK_SIGN_IN_METHOD = SignInMethod.FACEBOOK;
  readonly providerId: ProviderId = FacebookAuthProvider.PROVIDER_ID;
  static credential(accessToken: string): OAuthCredential {
    return new GenericOAuthCredential({
      providerId: this.PROVIDER_ID,
      signInMethod: this.FACEBOOK_SIGN_IN_METHOD,
      accessToken
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
}
