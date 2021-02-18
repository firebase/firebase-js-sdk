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
  FactorId,
  PhoneAuthCredential,
  PhoneMultiFactorAssertion,
  PhoneMultiFactorGenerator
} from '../../../model/public_types';

import { MultiFactorAssertionImpl } from '../../../mfa/mfa_assertion';
import { AuthInternal } from '../../../model/auth';
import { finalizeEnrollPhoneMfa } from '../../../api/account_management/mfa';
import { PhoneAuthCredentialImpl } from '../../../core/credentials/phone';
import {
  finalizeSignInPhoneMfa,
  FinalizeMfaResponse
} from '../../../api/authentication/mfa';

/**
 * {@inheritdoc @firebase/auth-types#PhoneMultiFactorAssertion}
 *
 * @public
 */
export class PhoneMultiFactorAssertionImpl
  extends MultiFactorAssertionImpl
  implements PhoneMultiFactorAssertion {
  private constructor(private readonly credential: PhoneAuthCredentialImpl) {
    super(FactorId.PHONE);
  }

  /** @internal */
  static _fromCredential(
    credential: PhoneAuthCredentialImpl
  ): PhoneMultiFactorAssertionImpl {
    return new PhoneMultiFactorAssertionImpl(credential);
  }

  /** @internal */
  _finalizeEnroll(
    auth: AuthInternal,
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
    auth: AuthInternal,
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
export class PhoneMultiFactorGeneratorImpl
  implements PhoneMultiFactorGenerator {
  private constructor() {}

  /** {@inheritdoc @firebase/auth-types#PhoneMultiFactorGenerator.assertion} */
  static assertion(credential: PhoneAuthCredential): PhoneMultiFactorAssertion {
    return PhoneMultiFactorAssertionImpl._fromCredential(
      credential as PhoneAuthCredentialImpl
    );
  }
}
