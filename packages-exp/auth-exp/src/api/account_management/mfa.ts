import { Endpoint, HttpMethod, performApiRequest } from '..';
import { SignInWithPhoneNumberRequest } from '../authentication/sms';
import { IdTokenResponse } from '../../model/id_token';
import { Auth } from '../../model/auth';

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

export interface PhoneMfaEnrollmentResponse extends IdTokenResponse { }

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

export interface WithdrawMfaResponse extends IdTokenResponse { }

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