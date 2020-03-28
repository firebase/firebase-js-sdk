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

import {
  MultiFactorAssertion,
  MultiFactorSession,
  EnrollmentRequestInfo,
  MultiFactorActionOutcome,
  MultiFactorSessionType,
  SignInRequestInfo
} from '../../model/multi_factor';
import { ProviderId } from '../providers';
import { PhoneAuthCredential } from '../providers/phone';
import { enrollPhoneMfa } from '../../api/account_management';
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { finalizeSignInPhoneMfa } from '../../api/authentication';

abstract class AbstractMultiFactorAssertion implements MultiFactorAssertion {
  constructor(readonly factorId: ProviderId, readonly auth: Auth) {}

  process(
    session: MultiFactorSession,
    displayName?: string
  ): Promise<IdTokenResponse> {
    switch (session.type) {
      case MultiFactorSessionType.ENROLL:
        return this.handleEnroll(session, displayName);
      case MultiFactorSessionType.SIGN_IN:
        return this.handleSignIn(session);
    }
  }

  private handleEnroll(
    session: MultiFactorSession,
    displayName?: string
  ): Promise<IdTokenResponse> {
    const idToken = session.rawSession;
    const request: EnrollmentRequestInfo = { idToken };
    if (displayName) {
      request.displayName = displayName;
    }

    return this.finalizeEnrollment(request);
  }

  private handleSignIn(session: MultiFactorSession): Promise<IdTokenResponse> {
    const mfaPendingCredential = session.rawSession;
    const request: SignInRequestInfo = { mfaPendingCredential };

    return this.finalizeSignIn(request);
  }

  abstract finalizeEnrollment(
    request: EnrollmentRequestInfo
  ): Promise<IdTokenResponse>;
  abstract finalizeSignIn(request: SignInRequestInfo): Promise<IdTokenResponse>;
}

export class PhoneMultiFactorAssertion extends AbstractMultiFactorAssertion {
  constructor(private readonly credential: PhoneAuthCredential, auth: Auth) {
    super(credential.providerId, auth);
  }

  finalizeEnrollment(request: EnrollmentRequestInfo): Promise<IdTokenResponse> {
    const phoneVerificationInfo = this.credential.makeVerificationRequest();
    return enrollPhoneMfa(this.auth, { ...request, phoneVerificationInfo });
  }

  finalizeSignIn(request: SignInRequestInfo): Promise<IdTokenResponse> {
    const phoneVerificationInfo = this.credential.makeVerificationRequest();
    return finalizeSignInPhoneMfa(this.auth, {
      ...request,
      phoneVerificationInfo
    });
  }
}

export class PhoneMultiFactorGenerator {
  private constructor() {}

  static assertion(
    auth: Auth,
    credential: PhoneAuthCredential
  ): MultiFactorAssertion {
    return new PhoneMultiFactorAssertion(credential, auth);
  }
}
