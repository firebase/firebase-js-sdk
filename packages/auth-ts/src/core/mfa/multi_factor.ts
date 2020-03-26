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

import { MultiFactorUser, MultiFactorInfo, MultiFactorSession, MultiFactorAssertion } from "../../model/multi_factor";
import { User } from '../../model/user';
import { Auth } from '../../model/auth';
import { withdrawMfa } from '../../api/account_management';
import { AuthErrorCode } from '../errors';

class MultiFactorUserImpl implements MultiFactorUser {
  constructor(readonly user: User) {}

  async getSession(): Promise<MultiFactorSession> {
    return new MultiFactorSession(await this.user.getIdToken(), null);
  }

  async enroll(auth: Auth, assertion: MultiFactorAssertion, displayName?: string): Promise<void> {
    const session = await this.getSession();
    const idTokenResponse = await assertion.process(session, displayName);
    this.user.stsTokenManager.updateFromServerResponse(idTokenResponse);
    await this.user.reload(auth);
  }

  async unenroll(auth: Auth, option: MultiFactorInfo|string): Promise<void> {
    const mfaEnrollmentId = typeof option === 'string' ? option : option.uid;
    const idToken = await this.user.getIdToken();
    const response = await withdrawMfa(auth, {idToken, mfaEnrollmentId});
    this.user.mfaInfo_ = this.user.mfaInfo_?.filter(ifo => ifo.uid !== mfaEnrollmentId) || null;
    this.user.stsTokenManager.updateFromServerResponse(response);
    try {
      await this.user.reload(auth);
    } catch (e) {
      if (e.code !== `auth/${AuthErrorCode.TOKEN_EXPIRED}`) {
        throw e;
      }
    }
  }

  get enrolledFactors(): MultiFactorInfo[] {
    return this.user.mfaInfo_ || [];
  }
}

export function multiFactor(user: User): MultiFactorUser {
  return new MultiFactorUserImpl(user);
}