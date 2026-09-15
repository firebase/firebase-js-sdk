/**
 * @license
 * Copyright 2026 Google LLC
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

import { testAuth, testUser } from '../../../test/helpers/mock_auth';
import { AuthInternal } from '../../model/auth';
import { UserInternal } from '../../model/user';
import { AuthErrorCode } from '../errors';
import { _logoutIfInvalidated } from './invalidation';
import { _createError } from '../util/assert';
describe('core/user/invalidation', () => {
  let user: UserInternal;
  let auth: AuthInternal;

  beforeEach(async () => {
    auth = await testAuth();
    user = testUser(auth, 'uid');
    await auth._updateCurrentUser(user);
  });

  function makeError(code: AuthErrorCode): FirebaseError {
    return _createError(auth, code);
  }

  it('leaves non-invalidation errors alone', async () => {
    const error = makeError(AuthErrorCode.TOO_MANY_ATTEMPTS_TRY_LATER);
    await expect(
      _logoutIfInvalidated(user, Promise.reject(error))
    ).rejects.toThrow(error);
    expect(auth.currentUser).toBe(user);
  });

  it('does nothing if the promise resolves', async () => {
    await _logoutIfInvalidated(user, Promise.resolve({}));
    expect(auth.currentUser).toBe(user);
  });

  it('logs out the user if the error is user_disabled', async () => {
    const error = makeError(AuthErrorCode.USER_DISABLED);
    await expect(
      _logoutIfInvalidated(user, Promise.reject(error))
    ).rejects.toThrow(error);
    expect(auth.currentUser).toBeNull();
  });

  it('does not log out if bypass auth state is true', async () => {
    const error = makeError(AuthErrorCode.USER_DISABLED);
    try {
      await _logoutIfInvalidated(user, Promise.reject(error), true);
    } catch {}
    expect(auth.currentUser).toBe(user);
  });

  it('logs out the user if the error is token_expired', async () => {
    const error = makeError(AuthErrorCode.TOKEN_EXPIRED);
    await expect(
      _logoutIfInvalidated(user, Promise.reject(error))
    ).rejects.toThrow(error);
    expect(auth.currentUser).toBeNull();
  });

  describe('with another logged in user', () => {
    let user2: UserInternal;

    beforeEach(async () => {
      user2 = testUser(auth, 'uid2');
      await auth._updateCurrentUser(user2);
    });

    it('does not log out user2 if the error is user_disabled', async () => {
      const error = makeError(AuthErrorCode.USER_DISABLED);
      await expect(
        _logoutIfInvalidated(user, Promise.reject(error))
      ).rejects.toThrow(error);
      expect(auth.currentUser).toBe(user2);
    });
  });
});
