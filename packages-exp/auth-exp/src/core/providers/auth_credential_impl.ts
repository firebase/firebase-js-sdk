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

import { AuthCredential } from '../../model/auth_credential';
import { ProviderId, SignInMethod } from '.';
import { IdTokenResponse } from '../../model/id_token';
import { PhoneOrOauthTokenResponse } from '../../api/authentication/mfa';
import { Auth } from '../../model/auth';

export class AuthCredentialImpl implements AuthCredential {
  constructor(
    readonly providerId: ProviderId,
    readonly signInMethod: SignInMethod
  ) {}

  toJSON(): object {
    throw new Error('Method not implemented.');
  }

  _getIdTokenResponse(_auth: Auth): Promise<PhoneOrOauthTokenResponse> {
    throw new Error('Method not implemented.');
  }

  _linkToIdToken(_auth: Auth, _idToken: string): Promise<IdTokenResponse> {
    throw new Error('Method not implemented.');
  }

  _matchIdTokenWithUid(_auth: Auth, _uid: string): Promise<IdTokenResponse> {
    throw new Error('Method not implemented.');
  }
}
