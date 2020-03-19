/**
 * @license
 * Copyright 2019 Google Inc.
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
import { OperationType, UserCredential } from '../../model/user_credential';
import { IdTokenResponse } from '../../model/id_token';
import { signInWithCustomToken as getIdTokenResponse } from '../../api/authentication';
import { initializeCurrentUserFromIdTokenResponse } from './index';

export async function signInWithCustomToken(
  auth: Auth,
  customToken: string
): Promise<UserCredential> {
  const response: IdTokenResponse = await getIdTokenResponse(auth, {
    token: customToken
  });
  const user = await initializeCurrentUserFromIdTokenResponse(auth, response);
  return new UserCredential(user, null, OperationType.SIGN_IN);
}
