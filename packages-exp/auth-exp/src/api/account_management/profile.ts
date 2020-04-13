import { IdTokenResponse } from '../../model/id_token';
import { Auth } from '../../model/auth';
import { performApiRequest, HttpMethod, Endpoint } from '..';

export interface UpdateProfileRequest {
  idToken: string;
  displayName?: string | null;
  photoUrl?: string | null;
}

export interface UpdateProfileResponse extends IdTokenResponse {
  displayName?: string | null;
  photoUrl?: string | null;
}

export async function updateProfile(
  auth: Auth,
  request: UpdateProfileRequest
): Promise<UpdateProfileResponse> {
  return performApiRequest<UpdateProfileRequest, UpdateProfileResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.SET_ACCOUNT_INFO,
    request
  );
}
