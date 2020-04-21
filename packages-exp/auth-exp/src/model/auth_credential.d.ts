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

import { ProviderId, SignInMethod } from '../core/providers';
import { Auth } from './auth';
import { IdTokenResponse } from './id_token';
import { PhoneOrOauthTokenResponse } from '../api/authentication/mfa';

export interface AuthCredential {
  readonly providerId: ProviderId;
  readonly signInMethod: SignInMethod;
  toJSON(): object;
  _getIdTokenResponse(auth: Auth): Promise<PhoneOrOauthTokenResponse>;
  _linkToIdToken(auth: Auth, idToken: string): Promise<IdTokenResponse>;
  _matchIdTokenWithUid(auth: Auth, uid: string): Promise<IdTokenResponse>;
}

export interface OAuthCredential extends AuthCredential {
  readonly idToken?: string;
  readonly accessToken?: string;
  readonly secret?: string;
}