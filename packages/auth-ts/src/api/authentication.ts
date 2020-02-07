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

// TODO: do we really need this? probably safe to ignore
enum Kind {
  SIGN_UP = 'identitytoolkit#SignupNewUserResponse',
  SIGN_IN_WITH_EMAIL_LINK = 'identitytoolkit#EmailLinkSigninResponse',
  SIGN_IN_WITH_PASSWORD = 'identitytoolkit#VerifyPasswordResponse',
  SEND_VERIFICATION_CODE = '',
  SEND_OOB_CODE = "identitytoolkit#GetOobConfirmationCodeResponse"
}

export interface SignUpRequest {
  returnSecureToken?: boolean;
  email?: string;
  password?: string;
}

export interface SignUpResponse extends IdTokenResponse {
  kind: typeof Kind.SIGN_UP;
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
  kind: typeof Kind.SIGN_IN_WITH_PASSWORD;
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
  requestType: GetOobCodeRequestType.VERIFY_EMAIL,
  idToken: IdToken
}

export interface PasswordResetRequest extends GetOobCodeRequest {
  requestType: GetOobCodeRequestType.PASSWORD_RESET,
  email: string
}

export interface EmailSigninRequest extends GetOobCodeRequest {
  requestType: GetOobCodeRequestType.EMAIL_SIGNIN,
  email: string
}

export interface GetOobCodeResponse {
  kind: typeof Kind.SEND_OOB_CODE;
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
  email: string,
  oobCode: string,
}

export interface SignInWithEmailLinkResponse extends IdTokenResponse {
  kind: Kind.SIGN_IN_WITH_EMAIL_LINK,
  email: string,
  isNewUser: boolean
}

export async function signInWithEmailLink(auth: Auth, request: SignInWithEmailLinkRequest): Promise< SignInWithEmailLinkResponse> {
  return performApiRequest<SignInWithEmailLinkRequest, SignInWithEmailLinkResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.SIGN_IN_WITH_EMAIL_LINK,
    request
  );
}