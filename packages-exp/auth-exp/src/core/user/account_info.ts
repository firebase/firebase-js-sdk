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

import {
    updateEmailPassword as apiUpdateEmailPassword, UpdateEmailPasswordRequest
} from '../../api/account_management/email_and_password';
import { updateProfile as apiUpdateProfile } from '../../api/account_management/profile';
import { User } from '../../model/user';
import { ProviderId } from '../providers';
import { _reloadWithoutSaving } from './reload';

interface Profile {
  displayName?: string|null;
  photoURL?: string|null;
}

export async function updateProfile(externUser: externs.User, {displayName, photoURL: photoUrl}: Profile): Promise<void> {
  if (displayName === undefined && photoUrl === undefined) {
    return;
  }

  const user = externUser as User;
  const {auth} = user;
  const idToken = await user.getIdToken();
  const profileRequest = {idToken, displayName, photoUrl};
  const response = await apiUpdateProfile(user.auth, profileRequest);

  user.displayName = response.displayName || null;
  user.photoURL = response.photoUrl || null;

  // Update the password provider as well
  const passwordProvider = user.providerData.find(p => p.providerId === ProviderId.PASSWORD);
  if (passwordProvider) {
    passwordProvider.displayName = user.displayName;
    passwordProvider.photoURL = user.photoURL;
  }

  const tokensRefreshed = user._updateTokensIfNecessary(response);
  await auth._persistUserIfCurrent(user);
  if (tokensRefreshed) {
    auth._notifyListenersIfCurrent(user);
  }
}

export function updateEmail(externUser: externs.User, newEmail: string): Promise<void> {
  const user = externUser as User;
  return updateEmailOrPassword(user, newEmail, null);
}

export function updatePassword(externUser: externs.User, newPassword: string): Promise<void> {
  const user = externUser as User;
  return updateEmailOrPassword(user, null, newPassword);
}

async function updateEmailOrPassword(user: User, email: string|null, password: string|null): Promise<void> {
  const {auth} = user;
  const idToken = await user.getIdToken();
  const request: UpdateEmailPasswordRequest = {idToken};

  if (email) {
    request.email = email;
  }
  
  if (password) {
    request.password = password;
  }

  const response = await apiUpdateEmailPassword(auth, request);
  
  const tokensRefreshed = user._updateTokensIfNecessary(response);
  await _reloadWithoutSaving(user);
  await auth._persistUserIfCurrent(user);
  if (tokensRefreshed) {
    auth._notifyListenersIfCurrent(user);
  }
}