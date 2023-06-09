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
import {
  MultiFactorAssertion,
  MultiFactorInfo,
  MultiFactorSession,
  MultiFactorUser,
  User
} from '../model/public_types';

import { withdrawMfa } from '../api/account_management/mfa';
import { _logoutIfInvalidated } from '../core/user/invalidation';
import { UserInternal } from '../model/user';
import { MultiFactorAssertionImpl } from './mfa_assertion';
import { MultiFactorInfoImpl } from './mfa_info';
import { MultiFactorSessionImpl } from './mfa_session';
import { getModularInstance } from '@firebase/util';

export class MultiFactorUserImpl implements MultiFactorUser {
  enrolledFactors: MultiFactorInfo[] = [];

  private constructor(readonly user: UserInternal) {
    user._onReload(userInfo => {
      if (userInfo.mfaInfo) {
        this.enrolledFactors = userInfo.mfaInfo.map(enrollment =>
          MultiFactorInfoImpl._fromServerResponse(user.auth, enrollment)
        );
      }
    });
  }

  static _fromUser(user: UserInternal): MultiFactorUserImpl {
    return new MultiFactorUserImpl(user);
  }

  async getSession(): Promise<MultiFactorSession> {
    return MultiFactorSessionImpl._fromIdtoken(
      await this.user.getIdToken(),
      this.user
    );
  }

  async enroll(
    assertionExtern: MultiFactorAssertion,
    displayName?: string | null
  ): Promise<void> {
    const assertion = assertionExtern as MultiFactorAssertionImpl;
    const session = (await this.getSession()) as MultiFactorSessionImpl;
    const finalizeMfaResponse = await _logoutIfInvalidated(
      this.user,
      assertion._process(this.user.auth, session, displayName)
    );
    // New tokens will be issued after enrollment of the new second factors.
    // They need to be updated on the user.
    await this.user._updateTokensIfNecessary(finalizeMfaResponse);
    // The user needs to be reloaded to get the new multi-factor information
    // from server. USER_RELOADED event will be triggered and `enrolledFactors`
    // will be updated.
    return this.user.reload();
  }

  async unenroll(infoOrUid: MultiFactorInfo | string): Promise<void> {
    const mfaEnrollmentId =
      typeof infoOrUid === 'string' ? infoOrUid : infoOrUid.uid;
    const idToken = await this.user.getIdToken();
    try {
      const idTokenResponse = await _logoutIfInvalidated(
        this.user,
        withdrawMfa(this.user.auth, {
          idToken,
          mfaEnrollmentId
        })
      );
      // Remove the second factor from the user's list.
      this.enrolledFactors = this.enrolledFactors.filter(
        ({ uid }) => uid !== mfaEnrollmentId
      );
      // Depending on whether the backend decided to revoke the user's session,
      // the tokenResponse may be empty. If the tokens were not updated (and they
      // are now invalid), reloading the user will discover this and invalidate
      // the user's state accordingly.
      await this.user._updateTokensIfNecessary(idTokenResponse);
      await this.user.reload();
    } catch (e) {
      throw e;
    }
  }
}

const multiFactorUserCache = new WeakMap<User, MultiFactorUser>();

/**
 * The {@link MultiFactorUser} corresponding to the user.
 *
 * @remarks
 * This is used to access all multi-factor properties and operations related to the user.
 *
 * @param user - The user.
 *
 * @public
 */
export function multiFactor(user: User): MultiFactorUser {
  const userModular = getModularInstance(user);
  if (!multiFactorUserCache.has(userModular)) {
    multiFactorUserCache.set(
      userModular,
      MultiFactorUserImpl._fromUser(userModular as UserInternal)
    );
  }
  return multiFactorUserCache.get(userModular)!;
}
