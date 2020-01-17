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
import { UserCredential } from '../../model/user_credential';
import { User } from '../../model/user';
import { signUp, signInWithPassword } from '../../api/authentication';

export async function createUserWithEmailAndPassword(
  auth: Auth,
  email: string,
  password: string
): Promise<UserCredential> {
  const { refreshToken, localId, idToken } = await signUp(auth, {
    returnSecureToken: true,
    email,
    password
  });
  if (!refreshToken || !idToken) {
    throw new Error('token missing');
  }
  const user = await auth.setCurrentUser(
    new User(refreshToken, localId, idToken)
  );
  return new UserCredential(user);
}

export async function signInWithEmailAndPassword(
  auth: Auth,
  email: string,
  password: string
): Promise<UserCredential> {
  const { refreshToken, localId, idToken } = await signInWithPassword(auth, {
    email,
    password
  });
  if (!refreshToken || !idToken) {
    throw new Error('token missing');
  }
  const user = await auth.setCurrentUser(
    new User(refreshToken, localId, idToken)
  );
  return new UserCredential(user);
}
