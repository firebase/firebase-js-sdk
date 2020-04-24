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

import { Endpoint, HttpMethod, _performApiRequest } from '..';
import { Operation } from '../../model/action_code_info';
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';

export interface ResetPasswordRequest {
  oobCode: string;
  newPassword?: string;
}

export interface ResetPasswordResponse {
  email: string;
  newEmail?: string;
  requestType?: Operation;
}

export async function resetPassword(
  auth: Auth,
  request: ResetPasswordRequest
): Promise<ResetPasswordResponse> {
  return _performApiRequest<ResetPasswordRequest, ResetPasswordResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.RESET_PASSWORD,
    request
  );
}
export interface UpdateEmailPasswordRequest {
  idToken: string;
  returnSecureToken?: boolean;
  email?: string;
  password?: string;
}

export interface UpdateEmailPasswordResponse extends IdTokenResponse {}

export async function updateEmailPassword(
  auth: Auth,
  request: UpdateEmailPasswordRequest
): Promise<UpdateEmailPasswordResponse> {
  return _performApiRequest<
    UpdateEmailPasswordRequest,
    UpdateEmailPasswordResponse
  >(auth, HttpMethod.POST, Endpoint.SET_ACCOUNT_INFO, request);
}
