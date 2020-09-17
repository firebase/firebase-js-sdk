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

import { getAccountInfo, ProviderUserInfo } from '../../api/account_management/account';
import { User } from '../../model/user';
import { AuthErrorCode } from '../errors';
import { assert } from '../util/assert';
import { _logoutIfInvalidated } from './invalidation';
import { UserMetadata } from './user_metadata';

export async function _reloadWithoutSaving(user: User): Promise<void> {
  const auth = user.auth;
  const idToken = await user.getIdToken();
  const response = await _logoutIfInvalidated(user, getAccountInfo(auth, { idToken }));

  assert(response?.users.length, AuthErrorCode.INTERNAL_ERROR, {
    appName: auth.name
  });

  const coreAccount = response.users[0];

  user._notifyReloadListener(coreAccount);

  const newProviderData = coreAccount.providerUserInfo?.length
    ? extractProviderData(coreAccount.providerUserInfo)
    : [];
  const updates: Partial<User> = {
    uid: coreAccount.localId,
    displayName: coreAccount.displayName || null,
    photoURL: coreAccount.photoUrl || null,
    email: coreAccount.email || null,
    emailVerified: coreAccount.emailVerified || false,
    phoneNumber: coreAccount.phoneNumber || null,
    tenantId: coreAccount.tenantId || null,
    providerData: mergeProviderData(user.providerData, newProviderData),
    metadata: new UserMetadata(coreAccount.createdAt, coreAccount.lastLoginAt)
  };

  Object.assign(user, updates);
}

export async function reload(externUser: externs.User): Promise<void> {
  const user: User = externUser as User;
  await _reloadWithoutSaving(user);

  // Even though the current user hasn't changed, update
  // current user will trigger a persistence update w/ the
  // new info.
  await user.auth._persistUserIfCurrent(user);
  user.auth._notifyListenersIfCurrent(user);
}

function mergeProviderData(
  original: externs.UserInfo[],
  newData: externs.UserInfo[]
): externs.UserInfo[] {
  const deduped = original.filter(
    o => !newData.some(n => n.providerId === o.providerId)
  );
  return [...deduped, ...newData];
}

function extractProviderData(
  providers: ProviderUserInfo[]
): externs.UserInfo[] {
  return providers.map(({ providerId, ...provider }) => {
    return {
      providerId,
      uid: provider.rawId || '',
      displayName: provider.displayName || null,
      email: provider.email || null,
      phoneNumber: provider.phoneNumber || null,
      photoURL: provider.photoUrl || null
    };
  });
}
