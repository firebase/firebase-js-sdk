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

import { _performApiRequest, Endpoint, HttpMethod } from '../';
import { AuthCore } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { MfaEnrollment } from '../account_management/mfa';
import { SignInWithIdpResponse } from './idp';
import {
  SignInWithPhoneNumberRequest,
  SignInWithPhoneNumberResponse
} from './sms';

export interface FinalizeMfaResponse {
  idToken: string;
  refreshToken: string;
}

export interface IdTokenMfaResponse extends IdTokenResponse {
  mfaPendingCredential?: string;
  mfaInfo?: MfaEnrollment[];
}

export interface StartPhoneMfaSignInRequest {
  mfaPendingCredential: string;
  mfaEnrollmentId: string;
  phoneSignInInfo: {
    recaptchaToken: string;
  };
  tenantId: string | null;
}

export interface StartPhoneMfaSignInResponse {
  phoneResponseInfo: {
    sessionInfo: string;
  };
}

export function startSignInPhoneMfa(
  auth: AuthCore,
  request: Omit<StartPhoneMfaSignInRequest, 'tenantId'>
): Promise<StartPhoneMfaSignInResponse> {
  return _performApiRequest<
    StartPhoneMfaSignInRequest,
    StartPhoneMfaSignInResponse
  >(auth, HttpMethod.POST, Endpoint.START_PHONE_MFA_SIGN_IN, {
    tenantId: auth.tenantId,
    ...request
  });
}

export interface FinalizePhoneMfaSignInRequest {
  mfaPendingCredential: string;
  phoneVerificationInfo: SignInWithPhoneNumberRequest;
  tenantId: string | null;
}

export interface FinalizePhoneMfaSignInResponse extends FinalizeMfaResponse {}

export function finalizeSignInPhoneMfa(
  auth: AuthCore,
  request: Omit<FinalizePhoneMfaSignInRequest, 'tenantId'>
): Promise<FinalizePhoneMfaSignInResponse> {
  return _performApiRequest<
    FinalizePhoneMfaSignInRequest,
    FinalizePhoneMfaSignInResponse
  >(auth, HttpMethod.POST, Endpoint.FINALIZE_PHONE_MFA_SIGN_IN, {
    tenantId: auth.tenantId,
    ...request
  });
}

export type PhoneOrOauthTokenResponse =
  | SignInWithPhoneNumberResponse
  | SignInWithIdpResponse
  | IdTokenResponse;
