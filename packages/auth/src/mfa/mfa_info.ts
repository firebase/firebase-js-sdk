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
  MultiFactorInfo,
  PhoneMultiFactorInfo,
  TotpMultiFactorInfo
} from '../model/public_types';
import {
  PhoneMfaEnrollment,
  MfaEnrollment,
  TotpMfaEnrollment
} from '../api/account_management/mfa';
import { AuthErrorCode } from '../core/errors';
import { _fail } from '../core/util/assert';
import { AuthInternal } from '../model/auth';

export abstract class MultiFactorInfoImpl implements MultiFactorInfo {
  readonly uid: string;
  readonly displayName?: string | null;
  readonly enrollmentTime: string;

  protected constructor(readonly factorId: FactorId, response: MfaEnrollment) {
    this.uid = response.mfaEnrollmentId;
    this.enrollmentTime = new Date(response.enrolledAt).toUTCString();
    this.displayName = response.displayName;
  }

  static _fromServerResponse(
    auth: AuthInternal,
    enrollment: MfaEnrollment
  ): MultiFactorInfoImpl {
    if ('phoneInfo' in enrollment) {
      return PhoneMultiFactorInfoImpl._fromServerResponse(auth, enrollment);
    } else if ('totpInfo' in enrollment) {
      return TotpMultiFactorInfoImpl._fromServerResponse(auth, enrollment);
    }
    return _fail(auth, AuthErrorCode.INTERNAL_ERROR);
  }
}

export class PhoneMultiFactorInfoImpl
  extends MultiFactorInfoImpl
  implements PhoneMultiFactorInfo
{
  readonly phoneNumber: string;

  private constructor(response: PhoneMfaEnrollment) {
    super(FactorId.PHONE, response);
    this.phoneNumber = response.phoneInfo;
  }

  static _fromServerResponse(
    _auth: AuthInternal,
    enrollment: MfaEnrollment
  ): PhoneMultiFactorInfoImpl {
    return new PhoneMultiFactorInfoImpl(enrollment as PhoneMfaEnrollment);
  }
}
export class TotpMultiFactorInfoImpl
  extends MultiFactorInfoImpl
  implements TotpMultiFactorInfo
{
  private constructor(response: TotpMfaEnrollment) {
    super(FactorId.TOTP, response);
  }

  static _fromServerResponse(
    _auth: AuthInternal,
    enrollment: MfaEnrollment
  ): TotpMultiFactorInfoImpl {
    return new TotpMultiFactorInfoImpl(enrollment as TotpMfaEnrollment);
  }
}
