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

import { Endpoint, HttpMethod, _performApiRequest } from '../index';
import { MfaEnrollment } from './mfa';
import { Auth } from '../../model/public_types';

export interface DeleteAccountRequest {
  idToken: string;
}

export async function deleteAccount(
  auth: Auth,
  request: DeleteAccountRequest
): Promise<void> {
  return _performApiRequest<DeleteAccountRequest, void>(
    auth,
    HttpMethod.POST,
    Endpoint.DELETE_ACCOUNT,
    request
  );
}

export interface ProviderUserInfo {
  providerId: string;
  rawId?: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  phoneNumber?: string;
}

export interface DeleteLinkedAccountsRequest {
  idToken: string;
  deleteProvider: string[];
}

export interface DeleteLinkedAccountsResponse {
  providerUserInfo: ProviderUserInfo[];
}

export async function deleteLinkedAccounts(
  auth: Auth,
  request: DeleteLinkedAccountsRequest
): Promise<DeleteLinkedAccountsResponse> {
  return _performApiRequest<
    DeleteLinkedAccountsRequest,
    DeleteLinkedAccountsResponse
  >(auth, HttpMethod.POST, Endpoint.SET_ACCOUNT_INFO, request);
}

export interface APIUserInfo {
  localId?: string;
  displayName?: string;
  photoUrl?: string;
  email?: string;
  emailVerified?: boolean;
  phoneNumber?: string;
  lastLoginAt?: number;
  createdAt?: number;
  tenantId?: string;
  passwordHash?: string;
  providerUserInfo?: ProviderUserInfo[];
  mfaInfo?: MfaEnrollment[];
}

export interface GetAccountInfoRequest {
  idToken: string;
}

export interface GetAccountInfoResponse {
  users: APIUserInfo[];
}

export async function getAccountInfo(
  auth: Auth,
  request: GetAccountInfoRequest
): Promise<GetAccountInfoResponse> {
  return _performApiRequest<GetAccountInfoRequest, GetAccountInfoResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.GET_ACCOUNT_INFO,
    request
  );
}
