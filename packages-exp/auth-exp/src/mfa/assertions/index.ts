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
import { IdTokenResponse } from '../../model/id_token';
import { MultiFactorSession, MultiFactorSessionType } from '../mfa_session';

export abstract class MultiFactorAssertion
  implements externs.MultiFactorAssertion {
  constructor(readonly factorId: externs.ProviderId) {}

  _process(
    session: MultiFactorSession,
    displayName?: string | null
  ): Promise<IdTokenResponse> {
    switch (session.type) {
      case MultiFactorSessionType.ENROLL:
        return this._finalizeEnroll(session.credential, displayName);
      case MultiFactorSessionType.SIGN_IN:
        return this._finalizeSignIn(session.credential);
      default:
        return debugFail('unexpected MultiFactorSessionType');
    }
  }

  abstract _finalizeEnroll(
    idToken: string,
    displayName?: string | null
  ): Promise<IdTokenResponse>;
  abstract _finalizeSignIn(
    mfaPendingCredential: string
  ): Promise<IdTokenResponse>;
}
