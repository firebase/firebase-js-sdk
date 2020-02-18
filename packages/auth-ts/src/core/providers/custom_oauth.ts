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

import { AuthProvider } from '../providers';
import { UserCredential } from '../../model/user_credential';
import { AuthErrorCode } from '../errors';
import { OAuthProvider, CustomParameters } from './oauth';
import { OAuthCredential } from '../../model/auth_credential';

export class CustomOAuthProvider extends OAuthProvider {
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
  addScope(scope: string): AuthProvider {
    throw new Error('not implemented');
  }
  credential(
    idToken?: string,
    accessToken?: string,
    rawNonce?: string
  ): OAuthCredential {
    throw new Error('not implemented');
  }
  setCustomParameters(customOAuthParameters: CustomParameters): AuthProvider {
    throw new Error('not implemented');
  }
}
