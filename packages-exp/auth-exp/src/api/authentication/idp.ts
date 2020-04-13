import { Auth } from '../../model/auth';
import { IdToken, IdTokenResponse } from '../../model/id_token';
import { performSignInRequest, HttpMethod, Endpoint } from '..';

export interface SignInWithIdpRequest {
  requestUri: string;
  postBody: string | null;
  sessionId?: string;
  tenantId?: string;
  returnSecureToken: boolean;
  idToken?: IdToken;
  autoCreate?: boolean;
  pendingToken?: string;
}

export interface SignInWithIdpResponse extends IdTokenResponse {
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
  return performSignInRequest<SignInWithIdpRequest, SignInWithIdpResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.SIGN_IN_WITH_IDP,
    request
  );
}