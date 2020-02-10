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
import { deleteAccount } from '../../api/account_management';
import { Auth } from '../../model/auth';

export async function deleteUser(auth: Auth, user: User): Promise<void> {
  const idToken = await user.getIdToken();
  await deleteAccount(auth, { idToken });
  return auth.signOut();
}
