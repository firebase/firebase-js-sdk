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

import {
  Endpoint,
  HttpMethod,
  performApiRequest,
  performSignInRequest
} from '..';
import { AuthErrorCode } from '../../core/errors';
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { ServerError, ServerErrorMap } from '../errors';

export interface SendPhoneVerificationCodeRequest {
  phoneNumber: string;
  recaptchaToken: string;
}

export interface SendPhoneVerificationCodeResponse {
  sessionInfo: string;
}

export async function sendPhoneVerificationCode(
  auth: Auth,
  request: SendPhoneVerificationCodeRequest
): Promise<SendPhoneVerificationCodeResponse> {
  return performApiRequest<
    SendPhoneVerificationCodeRequest,
    SendPhoneVerificationCodeResponse
  >(auth, HttpMethod.POST, Endpoint.SEND_VERIFICATION_CODE, request);
}

export interface SignInWithPhoneNumberRequest {
  temporaryProof?: string;
  phoneNumber?: string;
  sessionInfo?: string;
  code?: string;
}

export interface LinkWithPhoneNumberRequest
  extends SignInWithPhoneNumberRequest {
  idToken: string;
}

export interface SignInWithPhoneNumberResponse extends IdTokenResponse {
  temporaryProof?: string;
  phoneNumber?: string;
}

export async function signInWithPhoneNumber(
  auth: Auth,
  request: SignInWithPhoneNumberRequest
): Promise<SignInWithPhoneNumberResponse> {
  return performSignInRequest<
    SignInWithPhoneNumberRequest,
    SignInWithPhoneNumberResponse
  >(auth, HttpMethod.POST, Endpoint.SIGN_IN_WITH_PHONE_NUMBER, request);
}

export async function linkWithPhoneNumber(
  auth: Auth,
  request: LinkWithPhoneNumberRequest
): Promise<SignInWithPhoneNumberResponse> {
  return performSignInRequest<
    LinkWithPhoneNumberRequest,
    SignInWithPhoneNumberResponse
  >(auth, HttpMethod.POST, Endpoint.SIGN_IN_WITH_PHONE_NUMBER, request);
}

interface VerifyPhoneNumberForExistingRequest
  extends SignInWithPhoneNumberRequest {
  operation: 'REAUTH';
}

const VERIFY_PHONE_NUMBER_FOR_EXISTING_ERROR_MAP_: Partial<ServerErrorMap<
  ServerError
>> = {
  [ServerError.USER_NOT_FOUND]: AuthErrorCode.USER_DELETED
};

export async function verifyPhoneNumberForExisting(
  auth: Auth,
  request: SignInWithPhoneNumberRequest
): Promise<SignInWithPhoneNumberResponse> {
  const apiRequest: VerifyPhoneNumberForExistingRequest = {
    ...request,
    operation: 'REAUTH'
  };
  return performSignInRequest<
    VerifyPhoneNumberForExistingRequest,
    SignInWithPhoneNumberResponse
  >(
    auth,
    HttpMethod.POST,
    Endpoint.SIGN_IN_WITH_PHONE_NUMBER,
    apiRequest,
    VERIFY_PHONE_NUMBER_FOR_EXISTING_ERROR_MAP_
  );
}
