/**
 * @license
 * Copyright 2023 Google LLC
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

import { Auth } from '../../model/public_types';

import {
  Endpoint,
  HttpMethod,
  _addTidIfNecessary,
  _performApiRequest
} from '../index';
import { IdTokenResponse } from '../../model/id_token';

interface AuthenticatorResponseJSON {
  clientDataJSON: string;
  attestationObject?: string;
  authenticatorData?: string;
  signature?: string;
  userHandle?: string;
}

export interface PublicKeyCredentialJSON {
  id: string;
  type: string;
  rawId: string;
  response: AuthenticatorResponseJSON;
}

export function publicKeyCredentialToJSON(
  pubKeyCred: PublicKeyCredential
): PublicKeyCredentialJSON {
  // Convert ArrayBuffer to Base64
  function bufferToBase64(buffer: ArrayBuffer): string {
    const byteArray = Array.from(new Uint8Array(buffer));
    return btoa(String.fromCharCode.apply(null, byteArray));
  }

  const clientDataJSON = bufferToBase64(pubKeyCred.response.clientDataJSON);

  let result = {};

  // Handle Attestation Response (Registration)
  if (pubKeyCred.response instanceof AuthenticatorAttestationResponse) {
    const attestationObject = bufferToBase64(
      pubKeyCred.response.attestationObject
    );
    result = {
      id: pubKeyCred.id,
      type: pubKeyCred.type,
      rawId: bufferToBase64(pubKeyCred.rawId),
      response: {
        clientDataJSON,
        attestationObject
      }
    };
  }

  // Handle Assertion Response (Authentication)
  if (pubKeyCred.response instanceof AuthenticatorAssertionResponse) {
    const authenticatorData = bufferToBase64(
      pubKeyCred.response.authenticatorData
    );
    const signature = bufferToBase64(pubKeyCred.response.signature);
    const userHandle = pubKeyCred.response.userHandle
      ? bufferToBase64(pubKeyCred.response.userHandle)
      : undefined;
    result = {
      id: pubKeyCred.id,
      type: pubKeyCred.type,
      rawId: bufferToBase64(pubKeyCred.rawId),
      response: {
        clientDataJSON,
        authenticatorData,
        signature,
        userHandle
      }
    };
  }

  return result as PublicKeyCredentialJSON;
}

export interface PasskeyInfo {
  credentialId: string;
  name?: string;
}

// Enrollment types.
export interface StartPasskeyEnrollmentRequest {
  idToken?: string;
  tenantId?: string;
}

export interface StartPasskeyEnrollmentResponse {
  credentialCreationOptions?: PublicKeyCredentialCreationOptions;
}

export async function startPasskeyEnrollment(
  auth: Auth,
  request: StartPasskeyEnrollmentRequest
): Promise<StartPasskeyEnrollmentResponse> {
  return _performApiRequest<
    StartPasskeyEnrollmentRequest,
    StartPasskeyEnrollmentResponse
  >(
    auth,
    HttpMethod.POST,
    Endpoint.START_PASSKEY_ENROLLMENT,
    _addTidIfNecessary(auth, request)
  );
}

export interface FinalizePasskeyEnrollmentRequest {
  idToken?: string;
  tenantId?: string;
  authenticatorRegistrationResponse?: PublicKeyCredentialJSON;
  name?: string;
  displayName?: string;
}

export interface FinalizePasskeyEnrollmentResponse extends IdTokenResponse {
  localId: string;
  idToken?: string;
  refreshToken?: string;
}

export async function finalizePasskeyEnrollment(
  auth: Auth,
  request: FinalizePasskeyEnrollmentRequest
): Promise<FinalizePasskeyEnrollmentResponse> {
  return _performApiRequest<
    FinalizePasskeyEnrollmentRequest,
    FinalizePasskeyEnrollmentResponse
  >(
    auth,
    HttpMethod.POST,
    Endpoint.FINALIZE_PASSKEY_ENROLLMENT,
    _addTidIfNecessary(auth, request)
  );
}

// Sign-in types.
export interface StartPasskeySignInRequest {
  tenantId?: string;
}

export interface StartPasskeySignInResponse extends IdTokenResponse {
  credentialRequestOptions: PublicKeyCredentialRequestOptions;
}

export async function startPasskeySignIn(
  auth: Auth,
  request: StartPasskeySignInRequest
): Promise<StartPasskeySignInResponse> {
  return _performApiRequest<
    StartPasskeySignInRequest,
    StartPasskeySignInResponse
  >(
    auth,
    HttpMethod.POST,
    Endpoint.START_PASSKEY_SIGNIN,
    _addTidIfNecessary(auth, request)
  );
}

export interface FinalizePasskeySignInRequest {
  tenantId?: string;
  authenticatorAuthenticationResponse?: PublicKeyCredentialJSON;
  name?: string;
  displayName?: string;
}

export interface FinalizePasskeySignInResponse extends IdTokenResponse {
  idToken?: string;
  refreshToken?: string;
}

export async function finalizePasskeySignIn(
  auth: Auth,
  request: FinalizePasskeySignInRequest
): Promise<FinalizePasskeySignInResponse> {
  return _performApiRequest<
    FinalizePasskeySignInRequest,
    FinalizePasskeySignInResponse
  >(
    auth,
    HttpMethod.POST,
    Endpoint.FINALIZE_PASSKEY_SIGNIN,
    _addTidIfNecessary(auth, request)
  );
}

export interface PasskeyUnenrollRequest {
  idToken?: string;
  deletePasskey: string[];
}

export interface PasskeyUnenrollResponse {}

export async function passkeyUnenroll(
  auth: Auth,
  request: PasskeyUnenrollRequest
): Promise<PasskeyUnenrollResponse> {
  return _performApiRequest<PasskeyUnenrollRequest, PasskeyUnenrollResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.SET_ACCOUNT_INFO,
    request
  );
}
