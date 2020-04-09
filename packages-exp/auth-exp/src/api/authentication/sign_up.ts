import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { performSignInRequest, HttpMethod, Endpoint } from '..';

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
  return performSignInRequest<SignUpRequest, SignUpResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.SIGN_UP,
    request
  );
}