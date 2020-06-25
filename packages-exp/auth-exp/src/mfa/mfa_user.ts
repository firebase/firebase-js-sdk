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

import { User } from '../model/user';
import { MultiFactorSessionType, MultiFactorSession } from './mfa_session';
import { MultiFactorAssertion } from './assertions';
import { withdrawMfa } from '../api/account_management/mfa';
import { AuthErrorCode } from '../core/errors';

export class MultiFactorUser implements externs.MultiFactorUser {
  // TODO(avolkovi): Set these correctly from getAccountInfo on reload
  enrolledFactors: externs.MultiFactorInfo[] = [];

  constructor(readonly user: User) {}

  async getSession(): Promise<MultiFactorSession> {
    return new MultiFactorSession(
      MultiFactorSessionType.ENROLL,
      await this.user.getIdToken()
    );
  }

  async enroll(
    assertionExtern: externs.MultiFactorAssertion,
    displayName?: string | null
  ): Promise<void> {
    const assertion = assertionExtern as MultiFactorAssertion;
    const session = await this.getSession();
    const idTokenResponse = await assertion._process(session, displayName);
    // New tokens will be issued after enrollment of the new second factors.
    // They need to be updated on the user.
    await this.user._updateTokensIfNecessary(idTokenResponse);
    // The user needs to be reloaded to get the new multi-factor information
    // from server. USER_RELOADED event will be triggered and `enrolledFactors`
    // will be updated.
    return this.user.reload();
  }

  async unenroll(infoOrUid: externs.MultiFactorInfo | string): Promise<void> {
    const mfaEnrollmentId =
      typeof infoOrUid === 'string' ? infoOrUid : infoOrUid.uid;
    const idToken = await this.user.getIdToken();
    const idTokenResponse = await withdrawMfa(this.user.auth, {
      idToken,
      mfaEnrollmentId
    });
    // Remove the second factor from the user's list.
    this.enrolledFactors = this.enrolledFactors.filter(
      info => info.uid !== mfaEnrollmentId
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

export function multiFactor(user: externs.User): externs.MultiFactorUser {
  return new MultiFactorUser(user as User);
}
