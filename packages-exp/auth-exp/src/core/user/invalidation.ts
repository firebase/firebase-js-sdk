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

import { FirebaseError } from '@firebase/util';

import { User } from '../../model/user';
import { AuthErrorCode } from '../errors';

export async function _logoutIfInvalidated<T>(
  user: User,
  promise: Promise<T>
): Promise<T> {
  try {
    return await promise;
  } catch (e) {
    if (e instanceof FirebaseError && isUserInvalidated(e)) {
      if (user.auth.currentUser === user) {
        await user.auth.signOut();
      }
    }

    throw e;
  }
}

function isUserInvalidated({ code }: FirebaseError): boolean {
  return (
    code === `auth/${AuthErrorCode.USER_DISABLED}` ||
    code === `auth/${AuthErrorCode.TOKEN_EXPIRED}`
  );
}
