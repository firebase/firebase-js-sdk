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

import { PhoneOrOauthTokenResponse } from '../../api/authentication/mfa';
import { AuthCore } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';

export abstract class AuthCredential implements externs.AuthCredential {
  abstract readonly providerId: externs.ProviderId;
  abstract readonly signInMethod: externs.SignInMethod;
  abstract toJSON(): object;
  abstract _getIdTokenResponse(
    auth: AuthCore
  ): Promise<PhoneOrOauthTokenResponse>;
  abstract _linkToIdToken(
    auth: AuthCore,
    idToken: string
  ): Promise<IdTokenResponse>;
  abstract _getReauthenticationResolver(
    auth: AuthCore
  ): Promise<IdTokenResponse>;
}
