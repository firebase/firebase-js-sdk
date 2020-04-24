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
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { SignInWithPhoneNumberRequest } from '../authentication/sms';

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
  return _performApiRequest<
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
  return _performApiRequest<
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
  return _performApiRequest<WithdrawMfaRequest, WithdrawMfaResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.WITHDRAW_MFA,
    request
  );
}
