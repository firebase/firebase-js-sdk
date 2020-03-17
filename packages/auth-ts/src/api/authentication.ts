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
import { ServerErrorMap, ServerError } from './errors';
import { AuthErrorCode } from '../core/errors';

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
  request: SendPhoneVerificationCodeRequest
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
  autoCreate?: boolean;
}

export interface SignInWithIdpResponse extends IdTokenResponse {
  providerId?: string;
  oauthAccessToken?: string;
  oauthTokenSecret?: string;
  nonce?: string;
  oauthIdToken?: string;
  pendingToken?: string;
}

export async function signInWithIdp(
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

export async function getRecaptchaParams(auth: Auth): Promise<string> {
  return (
    (
      await performApiRequest<void, GetRecaptchaParamResponse>(
        auth,
        HttpMethod.GET,
        Endpoint.GET_RECAPTCHA_PARAM
      )
    ).recaptchaSiteKey || ''
  );
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
  return performApiRequest<
    SignInWithPhoneNumberRequest,
    SignInWithPhoneNumberResponse
  >(auth, HttpMethod.POST, Endpoint.SIGN_IN_WITH_PHONE_NUMBER, request);
}

export async function linkWithPhoneNumber(
  auth: Auth,
  request: LinkWithPhoneNumberRequest
): Promise<SignInWithPhoneNumberResponse> {
  return performApiRequest<
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
  return performApiRequest<
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

export interface VerifyAssertionRequest {
  autoCreate?: boolean;
  requestUri: string;
  postBody?: string;
  pendingIdToken?: string;
  sessionId?: string;
  idToken?: string;
  returnIdpCredential?: boolean;
  tenantId?: string;
}

// export interface VerifyAssertionResponse extends IdTokenResponse {
//   oauthIdToken?: string;
//   providerId?: string;
//   pendingToken?: string;
//   nonce?: string;
// }

// export async function verifyAssertion(
//   auth: Auth,
//   request: VerifyAssertionRequest,
// ): Promise<VerifyAssertionResponse> {
//   const response = await performApiRequest<
//   VerifyAssertionRequest,
//   VerifyAssertionResponse,
//   >(
//     auth,
//     HttpMethod.POST,
//     Endpoint.VERIFY_ASSERTION,
//     request,
//   );

// }

export type PhoneOrOauthTokenResponse =
  | SignInWithPhoneNumberResponse
  | SignInWithIdpResponse
  | IdTokenResponse;

//   function(request; response) {
//     // This makes it possible for OIDC providers to:
//     // 1. Initialize an OIDC Auth credential on successful response.
//     // 2. Initialize an OIDC Auth credential within the recovery error.

//     // When request has sessionId and response has OIDC ID token and no pending
//     // token, a credential with raw nonce and OIDC ID token needs to be returned.
//     if (response[fireauth.RpcHandler.AuthServerField.OAUTH_ID_TOKEN] &&
//         response[fireauth.RpcHandler.AuthServerField.PROVIDER_ID] &&
//         response[fireauth.RpcHandler.AuthServerField.PROVIDER_ID]
//             .indexOf(fireauth.constants.OIDC_PREFIX) == 0 &&
//         // Use pendingToken instead of idToken and rawNonce when available.
//         !response[fireauth.RpcHandler.AuthServerField.PENDING_TOKEN]) {
//       if (request[fireauth.RpcHandler.AuthServerField.SESSION_ID]) {
//         // For full OAuth flow, the nonce is in the session ID.
//         response[fireauth.RpcHandler.InjectedResponseField.NONCE] =
//             request[fireauth.RpcHandler.AuthServerField.SESSION_ID];
//       } else if (request[fireauth.RpcHandler.AuthServerField.POST_BODY]) {
//         // For credential flow, the nonce is in the postBody nonce field.
//         var queryData = new goog.Uri.QueryData(
//             request[fireauth.RpcHandler.AuthServerField.POST_BODY]);
//         if (queryData.containsKey(
//                 fireauth.RpcHandler.InjectedResponseField.NONCE)) {
//           response[fireauth.RpcHandler.InjectedResponseField.NONCE] =
//               queryData.get(fireauth.RpcHandler.InjectedResponseField.NONCE);
//         }
//       }
//     }
//     return response;
