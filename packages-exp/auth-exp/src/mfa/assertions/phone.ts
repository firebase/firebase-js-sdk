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

import { IdTokenResponse } from '../../model/id_token';
import { MultiFactorAssertion } from '.';
import { Auth } from '../../model/auth';
import { finalizeEnrollPhoneMfa } from '../../api/account_management/mfa';
import { PhoneAuthCredential } from '../../core/credentials/phone';
import { finalizeSignInPhoneMfa } from '../../api/authentication/mfa';

export class PhoneMultiFactorAssertion extends MultiFactorAssertion
  implements externs.PhoneMultiFactorAssertion {
  private constructor(
    private readonly auth: Auth,
    private readonly credential: PhoneAuthCredential
  ) {
    super(credential.providerId);
  }

  static _fromCredential(
    auth: Auth,
    credential: PhoneAuthCredential
  ): PhoneMultiFactorAssertion {
    return new PhoneMultiFactorAssertion(auth, credential);
  }

  _finalizeEnroll(
    idToken: string,
    displayName?: string | null
  ): Promise<IdTokenResponse> {
    return finalizeEnrollPhoneMfa(this.auth, {
      idToken,
      displayName,
      phoneVerificationInfo: this.credential._makeVerificationRequest()
    });
  }

  _finalizeSignIn(mfaPendingCredential: string): Promise<IdTokenResponse> {
    return finalizeSignInPhoneMfa(this.auth, {
      mfaPendingCredential,
      phoneVerificationInfo: this.credential._makeVerificationRequest()
    });
  }
}

export class PhoneMultiFactorGenerator
  implements externs.PhoneMultiFactorGenerator {
  private constructor() {}

  static assertion(
    auth: externs.Auth,
    credential: externs.PhoneAuthCredential
  ): externs.PhoneMultiFactorAssertion {
    return PhoneMultiFactorAssertion._fromCredential(
      auth as Auth,
      credential as PhoneAuthCredential
    );
  }
}
