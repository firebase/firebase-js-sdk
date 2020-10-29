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
  updateEmailPassword as apiUpdateEmailPassword,
  UpdateEmailPasswordRequest
} from '../../api/account_management/email_and_password';
import { updateProfile as apiUpdateProfile } from '../../api/account_management/profile';
import { User } from '../../model/user';
import { _logoutIfInvalidated } from './invalidation';
import { _reloadWithoutSaving } from './reload';

interface Profile {
  displayName?: string | null;
  photoURL?: string | null;
}

/**
 * Updates a user's profile data.
 *
 * @param user - The user.
 * @param profile - The profile's `displayName` and `photoURL` to update.
 *
 * @public
 */
export async function updateProfile(
  user: externs.User,
  { displayName, photoURL: photoUrl }: Profile
): Promise<void> {
  if (displayName === undefined && photoUrl === undefined) {
    return;
  }

  const userInternal = user as User;
  const idToken = await user.getIdToken();
  const profileRequest = { idToken, displayName, photoUrl };
  const response = await _logoutIfInvalidated(
    userInternal,
    apiUpdateProfile(userInternal.auth, profileRequest)
  );

  userInternal.displayName = response.displayName || null;
  userInternal.photoURL = response.photoUrl || null;

  // Update the password provider as well
  const passwordProvider = userInternal.providerData.find(
    ({ providerId }) => providerId === externs.ProviderId.PASSWORD
  );
  if (passwordProvider) {
    passwordProvider.displayName = user.displayName;
    passwordProvider.photoURL = user.photoURL;
  }

  await userInternal._updateTokensIfNecessary(response);
}

/**
 * Updates the user's email address.
 *
 * @remarks
 * An email will be sent to the original email address (if it was set) that allows to revoke the
 * email address change, in order to protect them from account hijacking.
 *
 * Important: this is a security sensitive operation that requires the user to have recently signed
 * in. If this requirement isn't met, ask the user to authenticate again and then call
 * {@link reauthenticateWithCredential}.
 *
 * @param user - The user.
 * @param newEmail - The new email address.
 *
 * @public
 */
export function updateEmail(
  user: externs.User,
  newEmail: string
): Promise<void> {
  return updateEmailOrPassword(user as User, newEmail, null);
}

/**
 * Updates the user's password.
 *
 * @remarks
 * Important: this is a security sensitive operation that requires the user to have recently signed
 * in. If this requirement isn't met, ask the user to authenticate again and then call
 * {@link reauthenticateWithCredential}.
 *
 * @param user - The user.
 * @param newPassword - The new password.
 *
 * @public
 */
export function updatePassword(
  user: externs.User,
  newPassword: string
): Promise<void> {
  return updateEmailOrPassword(user as User, null, newPassword);
}

/** @internal */
async function updateEmailOrPassword(
  user: User,
  email: string | null,
  password: string | null
): Promise<void> {
  const { auth } = user;
  const idToken = await user.getIdToken();
  const request: UpdateEmailPasswordRequest = { idToken };

  if (email) {
    request.email = email;
  }

  if (password) {
    request.password = password;
  }

  const response = await _logoutIfInvalidated(
    user,
    apiUpdateEmailPassword(auth, request)
  );
  await user._updateTokensIfNecessary(response, /* reload */ true);
}
