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

import { Auth } from '../model/auth';
import { IdToken } from '../model/id_token';

// TODO: pass this in for emulator
export const PRODUCTION_URL = 'https://identitytoolkit.googleapis.com';
export const SIGN_IN_WITH_PASSWORD_KIND = "identitytoolkit#VerifyPasswordResponse";
export const SIGN_UP_RESPONSE_KIND = "identitytoolkit#SignupNewUserResponse";

export interface SignUpRequest {
  returnSecureToken?: boolean;
  email?: string;
  password?: string;
}

export interface SignUpResponse {
  kind: typeof SIGN_UP_RESPONSE_KIND,
  localId: string;
  idToken?: IdToken;
  displayName?: string;
  email?: string;
  refreshToken?: string;
  expiresIn?: string;
}

async function performApiRequest(
  auth: Auth,
  method: string,
  path: string,
  request: object
): Promise<object> {
  const response = await fetch(
    `${PRODUCTION_URL}${path}?key=${auth.config.apiKey}`,
    {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      referrerPolicy: 'no-referrer',
      body: JSON.stringify(request)
    }
  );
  return response.json();
}

export async function signUp(
  auth: Auth,
  request: SignUpRequest
): Promise<SignUpResponse> {
  return performApiRequest(
    auth,
    'POST',
    '/v1/accounts:signUp',
    request
  ) as Promise<SignUpResponse>;
}

export interface SignInWithPasswordRequest {
  returnSecureToken?: boolean;
  email: string;
  password: string;
}

export interface SignInWithPasswordResponse {
  kind: typeof SIGN_IN_WITH_PASSWORD_KIND,
  localId: string;
  email?: string;
  displayName?: string;
  idToken?: IdToken;
  refreshToken?: string;
}

export async function signInWithPassword(
  auth: Auth,
  request: SignInWithPasswordRequest
): Promise<SignInWithPasswordResponse> {
  return performApiRequest(
    auth,
    'POST',
    '/v1/accounts:signInWithPassword',
    request
  ) as Promise<SignInWithPasswordResponse>;
}
