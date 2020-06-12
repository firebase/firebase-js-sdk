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

import { ProviderId, SignInMethod } from '@firebase/auth-types-exp';

import { PhoneOrOauthTokenResponse } from '../src/api/authentication/mfa';
import { Auth } from '../src/model/auth';
import { IdTokenResponse } from '../src/model/id_token';
import { AuthCredential } from '../src/core/credentials';

export class MockAuthCredential implements AuthCredential {
  response?: PhoneOrOauthTokenResponse;

  constructor(
    readonly providerId: ProviderId,
    readonly signInMethod: SignInMethod
  ) {}

  toJSON(): object {
    throw new Error('Method not implemented.');
  }

  fromJSON(_json: string | object): AuthCredential | null {
    throw new Error('Method not implemented.');
  }

  /**
   * For testing purposes only
   * @param response
   */
  _setIdTokenResponse(response: PhoneOrOauthTokenResponse): void {
    this.response = response;
  }

  async _getIdTokenResponse(_auth: Auth): Promise<PhoneOrOauthTokenResponse> {
    return this.response!;
  }

  async _linkToIdToken(
    _auth: Auth,
    _idToken: string
  ): Promise<IdTokenResponse> {
    return this.response!;
  }

  _matchIdTokenWithUid(_auth: Auth, _uid: string): Promise<IdTokenResponse> {
    throw new Error('Method not implemented.');
  }
}
