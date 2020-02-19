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

import { User, ProfileInfo } from '../../model/user';
import {
  UpdateProfileRequest,
  updateProfile as apiUpdateProfile
} from '../../api/account_management';
import { Auth } from '../../model/auth';
import { Mutable } from '../util/mutable';
import { reload } from './reload';

export async function updateProfile(
  auth: Auth,
  user: User,
  profile: ProfileInfo
): Promise<void> {
  const idToken = await user.getIdToken();
  const request: UpdateProfileRequest = {
    idToken,
    displayName: profile.displayName,
    photoUrl: profile.photoURL
  };

  const response = await apiUpdateProfile(auth, request);
  const mutUser: Mutable<User> = user;
  mutUser.displayName = response.displayName || null;
  mutUser.photoURL = response.photoUrl || null;
  mutUser.stsTokenManager.updateFromServerResponse(response);

  await reload(auth, user);
}
