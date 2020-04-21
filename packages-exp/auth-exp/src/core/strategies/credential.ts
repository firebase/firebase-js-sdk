/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Auth } from '../../model/auth';
import { AuthCredential } from '../../model/auth_credential';
import { OperationType, UserCredential } from '../../model/user_credential';
import { UserCredentialImpl } from '../user/user_credential_impl';

export async function signInWithCredential(
  auth: Auth,
  credential: AuthCredential
): Promise<UserCredential> {
  // TODO: handle mfa by wrapping with callApiWithMfaContext
  const response = await credential._getIdTokenResponse(auth);
  return UserCredentialImpl._fromIdTokenResponse(
    auth,
    credential,
    OperationType.SIGN_IN,
    response
  );
}
