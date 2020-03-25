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

  async unenroll(option: MultiFactorInfo|string): Promise<void> {

  }

  get enrolledFactors(): MultiFactorInfo[] {
    return this.user.mfaInfo_ || [];
  }
}

export function multiFactor(user: User): MultiFactorUser {
  return new MultiFactorUserImpl(user);
}