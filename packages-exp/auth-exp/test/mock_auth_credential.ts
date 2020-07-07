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
import { AuthCredential } from '../src/core/credentials';
import { Auth } from '../src/model/auth';
import { IdTokenResponse } from '../src/model/id_token';

export class MockAuthCredential implements AuthCredential {
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

  async _getIdTokenResponse(_auth: Auth): Promise<PhoneOrOauthTokenResponse> {
    throw new Error('Method not implemented.');
  }

  async _linkToIdToken(
    _auth: Auth,
    _idToken: string
  ): Promise<IdTokenResponse> {
    throw new Error('Method not implemented.');
  }

  async _getReauthenticationResolver(_auth: Auth): Promise<IdTokenResponse> {
    throw new Error('Method not implemented.');
  }
}
