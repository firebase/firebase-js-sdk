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

import { ProviderId } from '../core/providers';
import { Auth } from '..';
import { PhoneOrOauthTokenResponse } from '../api/authentication';
import { IdTokenResponse } from './id_token';

export interface AuthCredential {
  readonly providerId: ProviderId;
  readonly signInMethod: string;
  toJSON(): object;
  getIdTokenResponse_(auth: Auth): Promise<PhoneOrOauthTokenResponse>;
  linkToIdToken_(auth: Auth, idToken: string): Promise<IdTokenResponse>;
  matchIdTokenWithUid_(auth: Auth, uid: string): Promise<IdTokenResponse>;
}

export interface OAuthCredential extends AuthCredential {
  readonly idToken?: string;
  readonly accessToken?: string;
  readonly secret?: string;
}
