import { performApiRequest, Endpoint, HttpMethod } from '..';
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { Operation } from '../../model/action_code_info';

export interface ResetPasswordRequest {
  oobCode: string;
  newPassword?: string;
}

export interface ResetPasswordResponse {
  email: string;
  newEmail?: string;
  requestType?: Operation;
}

export async function resetPassword(
  auth: Auth,
  request: ResetPasswordRequest
): Promise<ResetPasswordResponse> {
  return performApiRequest<ResetPasswordRequest, ResetPasswordResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.RESET_PASSWORD,
    request
  );
}
export interface UpdateEmailPasswordRequest {
  idToken: string;
  returnSecureToken?: boolean;
  email?: string;
  password?: string;
}

export interface UpdateEmailPasswordResponse extends IdTokenResponse {}

export async function updateEmailPassword(
  auth: Auth,
  request: UpdateEmailPasswordRequest
): Promise<UpdateEmailPasswordResponse> {
  return performApiRequest<
    UpdateEmailPasswordRequest,
    UpdateEmailPasswordResponse
  >(auth, HttpMethod.POST, Endpoint.SET_ACCOUNT_INFO, request);
}
