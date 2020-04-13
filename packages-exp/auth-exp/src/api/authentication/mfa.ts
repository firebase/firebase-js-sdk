import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { HttpMethod, Endpoint, performApiRequest } from '..';
import {
  SignInWithPhoneNumberRequest,
  SignInWithPhoneNumberResponse
} from './sms';
import { SignInWithIdpResponse } from './idp';

export interface StartPhoneMfaSignInRequest {
  mfaPendingCredential: string;
  mfaEnrollmentId: string;
  phoneSignInInfo: {
    recaptchaToken: string;
  };
}

export interface StartPhoneMfaSignInResponse {
  phoneResponseInfo: {
    sessionInfo: string;
  };
}

export function startSignInPhoneMfa(
  auth: Auth,
  request: StartPhoneMfaSignInRequest
): Promise<StartPhoneMfaSignInResponse> {
  return performApiRequest<
    StartPhoneMfaSignInRequest,
    StartPhoneMfaSignInResponse
  >(auth, HttpMethod.POST, Endpoint.START_PHONE_MFA_SIGN_IN, request);
}

export interface FinalizePhoneMfaSignInRequest {
  mfaPendingCredential: string;
  phoneVerificationInfo: SignInWithPhoneNumberRequest;
}

export interface FinalizePhoneMfaSignInResponse extends IdTokenResponse {}

export function finalizeSignInPhoneMfa(
  auth: Auth,
  request: FinalizePhoneMfaSignInRequest
): Promise<FinalizePhoneMfaSignInResponse> {
  return performApiRequest<
    FinalizePhoneMfaSignInRequest,
    FinalizePhoneMfaSignInResponse
  >(auth, HttpMethod.POST, Endpoint.FINALIZE_PHONE_MFA_SIGN_IN, request);
}

export type PhoneOrOauthTokenResponse =
  | SignInWithPhoneNumberResponse
  | SignInWithIdpResponse
  | IdTokenResponse;
