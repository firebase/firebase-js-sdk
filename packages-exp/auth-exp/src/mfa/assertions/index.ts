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
import { debugFail } from '../../core/util/assert';
import { MultiFactorSession, MultiFactorSessionType } from '../mfa_session';
import { FinalizeMfaResponse } from '../../api/authentication/mfa';
import { AuthCore } from '../../model/auth';

export abstract class MultiFactorAssertion
  implements externs.MultiFactorAssertion {
  protected constructor(readonly factorId: string) {}

  _process(
    auth: AuthCore,
    session: MultiFactorSession,
    displayName?: string | null
  ): Promise<FinalizeMfaResponse> {
    switch (session.type) {
      case MultiFactorSessionType.ENROLL:
        return this._finalizeEnroll(auth, session.credential, displayName);
      case MultiFactorSessionType.SIGN_IN:
        return this._finalizeSignIn(auth, session.credential);
      default:
        return debugFail('unexpected MultiFactorSessionType');
    }
  }

  abstract _finalizeEnroll(
    auth: AuthCore,
    idToken: string,
    displayName?: string | null
  ): Promise<FinalizeMfaResponse>;
  abstract _finalizeSignIn(
    auth: AuthCore,
    mfaPendingCredential: string
  ): Promise<FinalizeMfaResponse>;
}
