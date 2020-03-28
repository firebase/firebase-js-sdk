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

import { Auth } from '..';
import { performApiRequest, HttpMethod, Endpoint } from '.';
import { Operation } from '../model/action_code_info';
import { IdTokenResponse, APIMFAInfo } from '../model/id_token';
import { SignInWithPhoneNumberRequest } from './authentication';

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
  return performApiRequest<ResetPasswordRequest, ResetPasswordResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.RESET_PASSWORD,
    request
  );
}

export interface DeleteAccountRequest {
  idToken: string;
}

export async function deleteAccount(
  auth: Auth,
  request: DeleteAccountRequest
): Promise<void> {
  return performApiRequest<DeleteAccountRequest, void>(
    auth,
    HttpMethod.POST,
    Endpoint.DELETE_ACCOUNT,
    request
  );
}
export interface UpdateProfileRequest {
  idToken: string;
  displayName?: string | null;
  photoUrl?: string | null;
}

export interface UpdateProfileResponse extends IdTokenResponse {
  displayName?: string | null;
  photoUrl?: string | null;
}

export async function updateProfile(
  auth: Auth,
  request: UpdateProfileRequest
): Promise<UpdateProfileResponse> {
  return performApiRequest<UpdateProfileRequest, UpdateProfileResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.SET_ACCOUNT_INFO,
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
  return performApiRequest<
    UpdateEmailPasswordRequest,
    UpdateEmailPasswordResponse
  >(auth, HttpMethod.POST, Endpoint.SET_ACCOUNT_INFO, request);
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
  return performApiRequest<
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
  providerUserInfo: ProviderUserInfo[];
  mfaInfo?: APIMFAInfo[];
}

export interface ProviderUserInfo {
  rawId?: string;
  providerId?: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  phoneNumber?: string;
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
  return performApiRequest<GetAccountInfoRequest, GetAccountInfoResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.GET_ACCOUNT_INFO,
    request
  );
}

export interface StartPhoneMfaEnrollmentRequest {
  idToken: string;

  phoneEnrollmentInfo: {
    phoneNumber: string;
    recaptchaToken: string;
  };
}

export interface StartPhoneMfaEnrollmentResponse {
  phoneSessionInfo: {
    sessionInfo: string;
  };
}

export function startEnrollPhoneMfa(
  auth: Auth,
  request: StartPhoneMfaEnrollmentRequest
): Promise<StartPhoneMfaEnrollmentResponse> {
  return performApiRequest<
    StartPhoneMfaEnrollmentRequest,
    StartPhoneMfaEnrollmentResponse
  >(auth, HttpMethod.POST, Endpoint.START_PHONE_MFA_ENROLLMENT, request);
}

export interface PhoneMfaEnrollmentRequest {
  phoneVerificationInfo: SignInWithPhoneNumberRequest;
}

export interface PhoneMfaEnrollmentResponse extends IdTokenResponse {}

export function enrollPhoneMfa(
  auth: Auth,
  request: PhoneMfaEnrollmentRequest
): Promise<PhoneMfaEnrollmentResponse> {
  return performApiRequest<
    PhoneMfaEnrollmentRequest,
    PhoneMfaEnrollmentResponse
  >(auth, HttpMethod.POST, Endpoint.FINALIZE_PHONE_MFA_ENROLLMENT, request);
}

export interface WithdrawMfaRequest {
  idToken: string;
  mfaEnrollmentId: string;
}

export interface WithdrawMfaResponse extends IdTokenResponse {}

export function withdrawMfa(
  auth: Auth,
  request: WithdrawMfaRequest
): Promise<WithdrawMfaResponse> {
  return performApiRequest<WithdrawMfaRequest, WithdrawMfaResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.WITHDRAW_MFA,
    request
  );
}
