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
import {
  PhoneMfaEnrollment,
  MfaEnrollment
} from '../api/account_management/mfa';
import { AuthErrorCode } from '../core/errors';
import { fail } from '../core/util/assert';
import { Auth } from '../model/auth';

export abstract class MultiFactorInfo implements externs.MultiFactorInfo {
  readonly uid: string;
  readonly displayName?: string | null;
  readonly enrollmentTime: string;

  protected constructor(
    readonly factorId: externs.ProviderId,
    response: MfaEnrollment
  ) {
    this.uid = response.mfaEnrollmentId;
    this.enrollmentTime = new Date(response.enrolledAt).toUTCString();
    this.displayName = response.displayName;
  }

  static _fromServerResponse(
    auth: Auth,
    enrollment: MfaEnrollment
  ): MultiFactorInfo {
    if ('phoneInfo' in enrollment) {
      return PhoneMultiFactorInfo._fromServerResponse(auth, enrollment);
    }
    return fail(auth.name, AuthErrorCode.INTERNAL_ERROR);
  }
}

export class PhoneMultiFactorInfo extends MultiFactorInfo {
  readonly phoneNumber: string;

  private constructor(response: PhoneMfaEnrollment) {
    super(externs.ProviderId.PHONE, response);
    this.phoneNumber = response.phoneInfo;
  }

  static _fromServerResponse(
    _auth: Auth,
    enrollment: MfaEnrollment
  ): PhoneMultiFactorInfo {
    return new PhoneMultiFactorInfo(enrollment);
  }
}
