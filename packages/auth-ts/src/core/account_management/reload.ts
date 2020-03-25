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
import { User, UserInfo } from '../../model/user';
import { getAccountInfo, ProviderUserInfo, APIUserInfo } from '../../api/account_management';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { Mutable } from '../util/mutable';
import { MultiFactorInfo } from '../../model/multi_factor';
import { ProviderId } from '../providers';

export async function reloadWithoutSaving(
  auth: Auth,
  user: User
): Promise<void> {
  const idToken = await user.getIdToken();
  const response = await getAccountInfo(auth, { idToken });

  if (!response?.users.length) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, {
      appName: auth.name
    });
  }

  const coreAccount = response.users[0];
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
    mfaInfo_: extractMfaInfo(coreAccount),
    metadata: {
      creationTime: coreAccount.createdAt?.toString(),
      lastSignInTime: coreAccount.lastLoginAt?.toString()
    }
  };

  const mutUser: Mutable<User> = user;
  Object.assign(mutUser, updates);
}

export async function reload(auth: Auth, user: User): Promise<void> {
  await reloadWithoutSaving(auth, user);
  await auth.updateCurrentUser(user);
}

function mergeProviderData(
  original: UserInfo[],
  newData: UserInfo[]
): UserInfo[] {
  const deduped = original.filter(
    o => !newData.some(n => n.providerId == o.providerId)
  );
  return [...deduped, ...newData];
}

function extractMfaInfo(userInfo: APIUserInfo): MultiFactorInfo[]|undefined {
  // For now, only phone is supported
  const factorId = ProviderId.PHONE;

  return userInfo.mfaInfo?.map(ifo => {
    const enrollmentTime = ifo.enrolledAt ? 
        new Date(ifo.enrolledAt).toUTCString() : null;
    return {
      phoneNumber: ifo.phoneInfo,
      uid: ifo.mfaEnrollmentId!,
      enrollmentTime,
      displayName: ifo.displayName,
      factorId,
    };
  });
}

function extractProviderData(providers: ProviderUserInfo[]): UserInfo[] {
  return providers.map(provider => ({
    uid: provider.rawId || '',
    displayName: provider.displayName || null,
    email: provider.email || null,
    phoneNumber: provider.phoneNumber || null,
    providerId: provider.providerId || null,
    photoURL: provider.photoUrl || null
  }));
}
