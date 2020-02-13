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
import { IdToken, IdTokenResponse } from '../model/id_token';
import { performApiRequest, Endpoint, HttpMethod } from '.';

export interface CreateAuthUriRequest {
  identifier: string;
  continueUri: string;
}

export interface CreateAuthUriResponse {
  signinMethods: string[];
}

export async function createAuthUri(
  auth: Auth,
  request: CreateAuthUriRequest
): Promise<CreateAuthUriResponse> {
  return performApiRequest<CreateAuthUriRequest, CreateAuthUriResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.CREATE_AUTH_URI,
    request
  );
}

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
  return performApiRequest<SignUpRequest, SignUpResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.SIGN_UP,
    request
  );
}

export interface SignInWithPasswordRequest {
  returnSecureToken?: boolean;
  email: string;
  password: string;
}

export interface SignInWithPasswordResponse extends IdTokenResponse {
  email: string;
  displayName: string;
}

export async function signInWithPassword(
  auth: Auth,
  request: SignInWithPasswordRequest
): Promise<SignInWithPasswordResponse> {
  return performApiRequest<
    SignInWithPasswordRequest,
    SignInWithPasswordResponse
  >(auth, HttpMethod.POST, Endpoint.SIGN_IN_WITH_PASSWORD, request);
}

export enum GetOobCodeRequestType {
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_SIGNIN = 'EMAIL_SIGNIN',
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  VERIFY_AND_CHANGE_EMAIL = 'VERIFY_AND_CHANGE_EMAIL'
}

export interface GetOobCodeRequest {
  requestType: GetOobCodeRequestType;
  email?: string; // Everything except VERIFY_AND_CHANGE_EMAIL
  // captchaResp?: string, // RESET_PASSWORD
  // userIp?: string, // RESET_PASSWORD,
  // newEmail?: string, // VERIFY_AND_CHANGE_EMAIL,
  idToken?: IdToken; // VERIFY_EMAIL, VERIFY_AND_CHANGE_EMAIL
  continueUrl?: string;
  iosBundleId?: string;
  iosAppStoreId?: string;
  androidPackageName?: string;
  androidInstallApp?: boolean;
  androidMinimumVersionCode?: string;
  canHandleCodeInApp?: boolean;
  dynamicLinkDomain?: string;
  // tenantId?: string,
  // targetProjectid?: string,
}

export interface VerifyEmailRequest extends GetOobCodeRequest {
  requestType: GetOobCodeRequestType.VERIFY_EMAIL;
  idToken: IdToken;
}

export interface PasswordResetRequest extends GetOobCodeRequest {
  requestType: GetOobCodeRequestType.PASSWORD_RESET;
  email: string;
}

export interface EmailSigninRequest extends GetOobCodeRequest {
  requestType: GetOobCodeRequestType.EMAIL_SIGNIN;
  email: string;
}

export interface GetOobCodeResponse {
  email: string;
}

export async function sendOobCode(
  auth: Auth,
  request: GetOobCodeRequest
): Promise<GetOobCodeResponse> {
  return performApiRequest<GetOobCodeRequest, GetOobCodeResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.SEND_OOB_CODE,
    request
  );
}

export interface SignInWithEmailLinkRequest {
  email: string;
  oobCode: string;
}

export interface SignInWithEmailLinkResponse extends IdTokenResponse {
  email: string;
  isNewUser: boolean;
}

export async function signInWithEmailLink(
  auth: Auth,
  request: SignInWithEmailLinkRequest
): Promise<SignInWithEmailLinkResponse> {
  return performApiRequest<
    SignInWithEmailLinkRequest,
    SignInWithEmailLinkResponse
  >(auth, HttpMethod.POST, Endpoint.SIGN_IN_WITH_EMAIL_LINK, request);
}

export interface SendPhoneVerificationCodeRequest {
  phoneNumber: string;
  recaptchaToken: string;
}

export interface SendPhoneVerificationCodeResponse {
  sessionInfo: string;
}

export async function sendPhoneVerificationCode(
  auth: Auth,
  request: SendPhoneVerificationCodeRequest,
): Promise<SendPhoneVerificationCodeResponse> {
  return performApiRequest<
    SendPhoneVerificationCodeRequest,
    SendPhoneVerificationCodeResponse
  >(auth, HttpMethod.POST, Endpoint.SEND_VERIFICATION_CODE, request);
}

export interface SignInWithIdpRequest {
  requestUri: string;
  postBody: string | null;
  sessionId: string;
  tenantId?: string;
  returnSecureToken: true;
  idToken?: IdToken;
}

export interface SignInWithIdpResponse extends IdTokenResponse {}

export async function SignInWithIdp(
  auth: Auth,
  request: SignInWithIdpRequest
): Promise<SignInWithIdpResponse> {
  return performApiRequest<SignInWithIdpRequest, SignInWithIdpResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.SIGN_IN_WITH_IDP,
    request
  );
}

interface GetRecaptchaParamResponse {
  recaptchaSiteKey?: string;
}

export async function getRecaptchaParams(
  auth: Auth,
): Promise<string> {
  return (await performApiRequest<void, GetRecaptchaParamResponse>(
    auth,
    HttpMethod.GET,
    Endpoint.GET_RECAPTCHA_PARAM,
  )).recaptchaSiteKey || '';
}