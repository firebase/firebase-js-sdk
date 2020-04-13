import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import {
  performSignInRequest,
  HttpMethod,
  Endpoint,
  performApiRequest
} from '..';
import { ServerErrorMap, ServerError } from '../errors';
import { AuthErrorCode } from '../../core/errors';

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
