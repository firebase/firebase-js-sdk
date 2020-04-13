import { Auth } from '../../model/auth';
import { performApiRequest, HttpMethod, Endpoint } from '..';

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