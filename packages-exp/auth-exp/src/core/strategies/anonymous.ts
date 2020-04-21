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
import { OperationType, UserCredential } from '../../model/user_credential';
import { AnonymousProvider } from '../providers/anonymous';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { signInWithCredential } from './credential';
export async function signInAnonymously(auth: Auth): Promise<UserCredential> {
  const credential = AnonymousProvider.credential();
  if (auth.currentUser?.isAnonymous) {
    // If an anonymous user is already signed in, no need to sign them in again.
    return new UserCredentialImpl(
      auth.currentUser,
      credential,
      OperationType.SIGN_IN
    );
  }
  return signInWithCredential(auth, credential);
}