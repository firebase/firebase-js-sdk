/**
 * @license
 * Copyright 2019 Google LLC
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

import { deleteLinkedAccounts } from '../../api/account_management/account';
import { User } from '../../model/user';
import { _assertLinkedStatus } from '../strategies/credential';
import { providerDataAsNames } from '../util/providers';

export async function unlink(
  userExtern: externs.User,
  providerId: externs.ProviderId
): Promise<externs.User> {
  const user = userExtern as User;
  await _assertLinkedStatus(true, user, providerId);
  const { providerUserInfo } = await deleteLinkedAccounts(user.auth, {
    idToken: await user.getIdToken(),
    deleteProvider: [providerId]
  });

  const providersLeft = providerDataAsNames(providerUserInfo || []);

  user.providerData = user.providerData.filter(pd =>
    providersLeft.has(pd.providerId)
  );
  if (!providersLeft.has(externs.ProviderId.PHONE)) {
    user.phoneNumber = null;
  }

  await user.auth._persistUserIfCurrent(user);
  return user;
}
