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

import { MultiFactorAssertion } from '../../../mfa/mfa_assertion';
import { Auth } from '../../../model/auth';
import { finalizeEnrollPhoneMfa } from '../../../api/account_management/mfa';
import { PhoneAuthCredential } from '../../../core/credentials/phone';
import {
  finalizeSignInPhoneMfa,
  FinalizeMfaResponse
} from '../../../api/authentication/mfa';

/**
 * {@inheritdoc @firebase/auth-types#PhoneMultiFactorAssertion}
 *
 * @public
 */
export class PhoneMultiFactorAssertion
  extends MultiFactorAssertion
  implements externs.PhoneMultiFactorAssertion {
  private constructor(private readonly credential: PhoneAuthCredential) {
    super(credential.providerId);
  }

  /** @internal */
  static _fromCredential(
    credential: PhoneAuthCredential
  ): PhoneMultiFactorAssertion {
    return new PhoneMultiFactorAssertion(credential);
  }

  /** @internal */
  _finalizeEnroll(
    auth: Auth,
    idToken: string,
    displayName?: string | null
  ): Promise<FinalizeMfaResponse> {
    return finalizeEnrollPhoneMfa(auth, {
      idToken,
      displayName,
      phoneVerificationInfo: this.credential._makeVerificationRequest()
    });
  }

  /** @internal */
  _finalizeSignIn(
    auth: Auth,
    mfaPendingCredential: string
  ): Promise<FinalizeMfaResponse> {
    return finalizeSignInPhoneMfa(auth, {
      mfaPendingCredential,
      phoneVerificationInfo: this.credential._makeVerificationRequest()
    });
  }
}

/**
 * {@inheritdoc @firebase/auth-types#PhoneMultiFactorGenerator}
 * @public
 */
export class PhoneMultiFactorGenerator
  implements externs.PhoneMultiFactorGenerator {
  private constructor() {}

  /** {@inheritdoc @firebase/auth-types#PhoneMultiFactorGenerator.assertion} */
  static assertion(
    credential: externs.PhoneAuthCredential
  ): externs.PhoneMultiFactorAssertion {
    return PhoneMultiFactorAssertion._fromCredential(
      credential as PhoneAuthCredential
    );
  }
}
