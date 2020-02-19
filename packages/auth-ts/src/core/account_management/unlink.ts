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

import { ProviderId } from '../providers';
import { Auth } from '../..';
import { User } from '../../model/user';
import { checkIfAlreadyLinked } from '../strategies';
import { deleteLinkedAccounts } from '../../api/account_management';

export async function unlink(
  auth: Auth,
  user: User,
  providerId: ProviderId
): Promise<User> {
  await checkIfAlreadyLinked(auth, user, providerId, true);
  const idToken = await user.getIdToken();
  const {providerUserInfo} = await deleteLinkedAccounts(auth, {
    idToken,
    deleteProvider: [providerId],
  });

  const providersLeft = (providerUserInfo || [])
      .map(i => i.providerId);

  user.providerData = user.providerData.filter(
      pd => providersLeft.includes(pd.providerId || undefined));
  if (!providersLeft.includes(ProviderId.PHONE)) {
    user.phoneNumber = null;
  }

  return user;
  auth.updateCurrentUser(user);
}