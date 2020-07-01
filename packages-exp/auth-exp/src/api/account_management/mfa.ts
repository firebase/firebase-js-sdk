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
import { SignInWithPhoneNumberRequest } from '../authentication/sms';
import { FinalizeMfaResponse } from '../authentication/mfa';

/**
 * MFA Info as returned by the API
 */
interface BaseMfaEnrollment {
  mfaEnrollmentId: string;
  enrolledAt: number;
  displayName?: string;
}

/**
 * An MFA provided by SMS verification
 */
export interface PhoneMfaEnrollment extends BaseMfaEnrollment {
  phoneInfo: string;
}

/**
 * MfaEnrollment can be any subtype of BaseMfaEnrollment, currently only PhoneMfaEnrollment is supported
 */
export type MfaEnrollment = PhoneMfaEnrollment;

export interface StartPhoneMfaEnrollmentRequest {
  idToken: string;
  phoneEnrollmentInfo: {
    phoneNumber: string;
    recaptchaToken: string;
  };
  tenantId: string | null;
}

export interface StartPhoneMfaEnrollmentResponse {
  phoneSessionInfo: {
    sessionInfo: string;
  };
}

export function startEnrollPhoneMfa(
  auth: Auth,
  request: Omit<StartPhoneMfaEnrollmentRequest, 'tenantId'>
): Promise<StartPhoneMfaEnrollmentResponse> {
  return _performApiRequest<
    StartPhoneMfaEnrollmentRequest,
    StartPhoneMfaEnrollmentResponse
  >(auth, HttpMethod.POST, Endpoint.START_PHONE_MFA_ENROLLMENT, {
    tenantId: auth.tenantId,
    ...request
  });
}

export interface FinalizePhoneMfaEnrollmentRequest {
  idToken: string;
  phoneVerificationInfo: SignInWithPhoneNumberRequest;
  displayName?: string | null;
  tenantId: string | null;
}

export interface FinalizePhoneMfaEnrollmentResponse
  extends FinalizeMfaResponse {}

export function finalizeEnrollPhoneMfa(
  auth: Auth,
  request: Omit<FinalizePhoneMfaEnrollmentRequest, 'tenantId'>
): Promise<FinalizePhoneMfaEnrollmentResponse> {
  return _performApiRequest<
    FinalizePhoneMfaEnrollmentRequest,
    FinalizePhoneMfaEnrollmentResponse
  >(auth, HttpMethod.POST, Endpoint.FINALIZE_PHONE_MFA_ENROLLMENT, {
    tenantId: auth.tenantId,
    ...request
  });
}

export interface WithdrawMfaRequest {
  idToken: string;
  mfaEnrollmentId: string;
  tenantId: string | null;
}

export interface WithdrawMfaResponse extends FinalizeMfaResponse {}

export function withdrawMfa(
  auth: Auth,
  request: Omit<WithdrawMfaRequest, 'tenantId'>
): Promise<WithdrawMfaResponse> {
  return _performApiRequest<WithdrawMfaRequest, WithdrawMfaResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.WITHDRAW_MFA,
    {
      tenantId: auth.tenantId,
      ...request
    }
  );
}
