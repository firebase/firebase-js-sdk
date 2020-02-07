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

import { Auth } from '../..';
import { IdTokenResponse } from '../../model/id_token';
import { User, StsTokenManager } from '../../model/user';

export function userFromIdTokenResponse(
  idTokenResponse: IdTokenResponse
): Promise<User> {
  const stsTokenManager = new StsTokenManager(idTokenResponse);
  // Initialize the Firebase Auth user.
  const user = new User(stsTokenManager, idTokenResponse.localId);

  // Updates the user info and data and resolves with a user instance.
  return user.reload();
}

export async function initializeCurrentUserFromIdTokenResponse(
  auth: Auth,
  idTokenResponse: IdTokenResponse
): Promise<User> {
  await auth.isInitialized();

  const user: User = await userFromIdTokenResponse(idTokenResponse);
  await auth.setCurrentUser(user);
  return user;
}
