import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { performSignInRequest, HttpMethod, Endpoint } from '..';

export interface SignInWithCustomTokenRequest {
  token: string;
}

export interface SignInWithCustomTokenResponse extends IdTokenResponse {}

export async function signInWithCustomToken(
  auth: Auth,
  request: SignInWithCustomTokenRequest
): Promise<SignInWithCustomTokenResponse> {
  return performSignInRequest<
    SignInWithCustomTokenRequest,
    SignInWithCustomTokenResponse
  >(auth, HttpMethod.POST, Endpoint.SIGN_IN_WITH_CUSTOM_TOKEN, request);
}