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

import { Endpoint, HttpMethod, _performSignInRequest } from '../index';
import { IdTokenResponse } from '../../model/id_token';
import { Auth } from '@firebase/auth-types-exp';

export interface SignUpRequest {
  returnSecureToken?: boolean;
  email?: string;
  password?: string;
}

export interface SignUpResponse extends IdTokenResponse {
  displayName?: string;
  email?: string;
}

export async function signUp(
  auth: Auth,
  request: SignUpRequest
): Promise<SignUpResponse> {
  return _performSignInRequest<SignUpRequest, SignUpResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.SIGN_UP,
    request
  );
}
