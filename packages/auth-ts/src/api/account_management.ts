import { Auth } from '..';
import { performApiRequest, HttpMethod, Endpoint } from '.';
import { Operation } from '../model/action_code_info';

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
