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

import { ActionCodeOperation, Auth } from '../../model/public_types';

import {
  Endpoint,
  HttpMethod,
  _addTidIfNecessary,
  _performApiRequest
} from '../index';
import { IdTokenResponse } from '../../model/id_token';
import { MfaEnrollment } from './mfa';
import { SignUpRequest, SignUpResponse } from '../authentication/sign_up';

export interface ResetPasswordRequest {
  oobCode: string;
  newPassword?: string;
  tenantId?: string;
}

export interface ResetPasswordResponse {
  email: string;
  newEmail?: string;
  requestType?: ActionCodeOperation;
  mfaInfo?: MfaEnrollment;
}

export async function resetPassword(
  auth: Auth,
  request: ResetPasswordRequest
): Promise<ResetPasswordResponse> {
  return _performApiRequest<ResetPasswordRequest, ResetPasswordResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.RESET_PASSWORD,
    _addTidIfNecessary(auth, request)
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

// Used for linking an email/password account to an existing idToken. Uses the same request/response
// format as updateEmailPassword.
export async function linkEmailPassword(
  auth: Auth,
  request: SignUpRequest
): Promise<SignUpResponse> {
  return _performApiRequest<SignUpRequest, SignUpResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.SIGN_UP,
    request
  );
}

export interface ApplyActionCodeRequest {
  oobCode: string;
  tenantId?: string;
}

export interface ApplyActionCodeResponse {}

export async function applyActionCode(
  auth: Auth,
  request: ApplyActionCodeRequest
): Promise<ApplyActionCodeResponse> {
  return _performApiRequest<ApplyActionCodeRequest, ApplyActionCodeResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.SET_ACCOUNT_INFO,
    _addTidIfNecessary(auth, request)
  );
}
