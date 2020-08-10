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

import { User } from '../../model/user';
import { AuthImplCompat } from '../auth/auth_impl';
import { AnonymousProvider } from '../providers/anonymous';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { assertTypes } from '../util/assert';
import { signInWithCredential } from './credential';

export async function signInAnonymously(
  auth: externs.Auth
): Promise<externs.UserCredential> {
  assertTypes([auth], AuthImplCompat);
  const credential = AnonymousProvider.credential();
  if (auth.currentUser?.isAnonymous) {
    // If an anonymous user is already signed in, no need to sign them in again.
    return new UserCredentialImpl({
      user: auth.currentUser as User,
      providerId: null,
      operationType: externs.OperationType.SIGN_IN
    });
  }
  return signInWithCredential(auth, credential);
}
