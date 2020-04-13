import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { performSignInRequest, HttpMethod, Endpoint } from '..';

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
  return performSignInRequest<
    SignInWithEmailLinkRequest,
    SignInWithEmailLinkResponse
  >(auth, HttpMethod.POST, Endpoint.SIGN_IN_WITH_EMAIL_LINK, request);
}
