import { Auth } from '../model/auth';
import { IdToken } from '../model/id_token';

// TODO: pass this in for tests
const PRODUCTION_URL = 'https://identitytoolkit.googleapis.com';

export interface SignUpRequest {
  returnSecureToken?: boolean;
  email?: string;
  password?: string;
}

export interface SignUpResponse {
  localId: string;
  idToken?: IdToken;
  displayName?: string;
  email?: string;
  refreshToken?: string;
  expiresIn?: number;
}

async function performApiRequest(
  auth: Auth,
  method: string,
  path: string,
  request: object
): Promise<object> {
  const response = await fetch(
    `${PRODUCTION_URL}${path}?key=${auth.config.apiKey}`,
    {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      referrerPolicy: 'no-referrer',
      body: JSON.stringify(request)
    }
  );
  return response.json();
}

export async function signUp(
  auth: Auth,
  request: SignUpRequest
): Promise<SignUpResponse> {
  return performApiRequest(
    auth,
    'POST',
    '/v1/accounts:signUp',
    request
  ) as Promise<SignUpResponse>;
}

export interface SignInWithPasswordRequest {
  returnSecureToken?: boolean;
  email: string;
  password: string;
}

export interface SignInWithPasswordResponse {
  localId: string;
  email?: string;
  displayName?: string;
  idToken?: IdToken;
  refreshToken?: string;
}

export async function signInWithPassword(
  auth: Auth,
  request: SignInWithPasswordRequest
): Promise<SignInWithPasswordResponse> {
  return performApiRequest(
    auth,
    'POST',
    '/v1/accounts:signInWithPassword',
    request
  ) as Promise<SignInWithPasswordResponse>;
}
