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

import * as externs from '@firebase/auth-types-exp';

import { signInWithCustomToken as getIdTokenResponse } from '../../api/authentication/custom_token';
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { UserCredentialImpl } from '../user/user_credential_impl';

export async function signInWithCustomToken(
  authExtern: externs.Auth,
  customToken: string
): Promise<externs.UserCredential> {
  const auth = authExtern as Auth;
  const response: IdTokenResponse = await getIdTokenResponse(auth, {
    token: customToken
  });
  const cred = await UserCredentialImpl._fromIdTokenResponse(
    auth,
    null,
    externs.OperationType.SIGN_IN,
    response
  );
  await auth.updateCurrentUser(cred.user);
  return cred;
}
