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

import { User } from '../../model/user';
import { updateEmailPassword } from '../../api/account_management';
import { Auth } from '../../model/auth';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';

export async function updateEmail(
  auth: Auth,
  user: User,
  email: string
): Promise<void> {
  const idToken = await user.getIdToken();
  const response = await updateEmailPassword(auth, {
    idToken,
    email,
  });
  user.stsTokenManager.updateFromServerResponse(response);
  await user.reload(auth);
}

export async function updatePassword(
  auth: Auth,
  user: User,
  password: string
): Promise<void> {
  if (!password) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.WEAK_PASSWORD, {
      appName: auth.name,
    });
  }

  const idToken = await user.getIdToken();
  const response = await updateEmailPassword(auth, {
    idToken,
    password,
  });
  user.stsTokenManager.updateFromServerResponse(response);
  await user.reload(auth);
}