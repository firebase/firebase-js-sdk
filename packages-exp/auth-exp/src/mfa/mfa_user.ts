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

import { withdrawMfa } from '../api/account_management/mfa';
import { AuthErrorCode } from '../core/errors';
import { UserImpl } from '../core/user/user_impl';
import { assert, assertTypes, opt } from '../core/util/assert';
import { User } from '../model/user';
import { MultiFactorAssertion } from './assertions';
import { MultiFactorInfo } from './mfa_info';
import { MultiFactorSession } from './mfa_session';

export class MultiFactorUser implements externs.MultiFactorUser {
  enrolledFactors: externs.MultiFactorInfo[] = [];

  private constructor(readonly user: User) {
    user._onReload(userInfo => {
      if (userInfo.mfaInfo) {
        this.enrolledFactors = userInfo.mfaInfo.map(enrollment =>
          MultiFactorInfo._fromServerResponse(user.auth, enrollment)
        );
      }
    });
  }

  static _fromUser(user: User): MultiFactorUser {
    return new MultiFactorUser(user);
  }

  async getSession(): Promise<externs.MultiFactorSession> {
    return MultiFactorSession._fromIdtoken(await this.user.getIdToken());
  }

  async enroll(
    assertionExtern: externs.MultiFactorAssertion,
    displayName?: string | null
  ): Promise<void> {
    assertTypes(
      [assertionExtern, displayName],
      MultiFactorAssertion,
      opt('string|null')
    );
    const assertion = assertionExtern as MultiFactorAssertion;
    const session = (await this.getSession()) as MultiFactorSession;
    const finalizeMfaResponse = await assertion._process(
      this.user.auth,
      session,
      displayName
    );
    // New tokens will be issued after enrollment of the new second factors.
    // They need to be updated on the user.
    await this.user._updateTokensIfNecessary(finalizeMfaResponse);
    // The user needs to be reloaded to get the new multi-factor information
    // from server. USER_RELOADED event will be triggered and `enrolledFactors`
    // will be updated.
    return this.user.reload();
  }

  async unenroll(infoOrUid: externs.MultiFactorInfo | string): Promise<void> {
    const mfaEnrollmentId =
      typeof infoOrUid === 'string' ? infoOrUid : infoOrUid.uid;
    assert(
      typeof mfaEnrollmentId === 'string',
      this.user.auth.name,
      AuthErrorCode.ARGUMENT_ERROR
    );
    const idToken = await this.user.getIdToken();
    const idTokenResponse = await withdrawMfa(this.user.auth, {
      idToken,
      mfaEnrollmentId
    });
    // Remove the second factor from the user's list.
    this.enrolledFactors = this.enrolledFactors.filter(
      ({ uid }) => uid !== mfaEnrollmentId
    );
    // Depending on whether the backend decided to revoke the user's session,
    // the tokenResponse may be empty. If the tokens were not updated (and they
    // are now invalid), reloading the user will discover this and invalidate
    // the user's state accordingly.
    await this.user._updateTokensIfNecessary(idTokenResponse);
    try {
      await this.user.reload();
    } catch (e) {
      if (e.code !== `auth/${AuthErrorCode.TOKEN_EXPIRED}`) {
        throw e;
      }
    }
  }
}

const multiFactorUserCache = new WeakMap<
  externs.User,
  externs.MultiFactorUser
>();

export function multiFactor(user: externs.User): externs.MultiFactorUser {
  assertTypes(arguments, UserImpl);
  if (!multiFactorUserCache.has(user)) {
    multiFactorUserCache.set(user, MultiFactorUser._fromUser(user as User));
  }
  return multiFactorUserCache.get(user)!;
}
