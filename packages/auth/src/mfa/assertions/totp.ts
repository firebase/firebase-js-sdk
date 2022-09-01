/**
 * @license
 * Copyright 2022 Google LLC
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
  TotpSecret,
  TotpMultiFactorAssertionImpl
} from '../../platform_browser/mfa/assertions/totp';
import {
  TotpMultiFactorAssertion,
  MultiFactorSession,
  FactorId
} from '../../model/public_types';
import { startEnrollTotpMfa } from '../../api/account_management/mfa';
import { MultiFactorSessionImpl } from '../mfa_session';
import { AuthErrorCode } from '../../core/errors';
import { _assert } from '../../core/util/assert';
/**
 * Provider for generating a {@link TotpMultiFactorAssertion}.
 *
 * @public
 */
export class TotpMultiFactorGenerator {
  /**
   * Provides a {@link TotpMultiFactorAssertion} to confirm ownership of
   * the totp(Time-based One Time Password) second factor.
   * This assertion is used to complete enrollment in TOTP second factor.
   *
   * @param secret {@link TotpSecret}.
   * @param oneTimePassword One-time password from TOTP App.
   * @returns A {@link TotpMultiFactorAssertion} which can be used with
   * {@link MultiFactorUser.enroll}.
   */
  static assertionForEnrollment(
    secret: TotpSecret,
    oneTimePassword: string
  ): TotpMultiFactorAssertion {
    return TotpMultiFactorAssertionImpl._fromSecret(secret, oneTimePassword);
  }
  /**
   * Provides a {@link TotpMultiFactorAssertion} to confirm ownership of the totp second factor.
   * This assertion is used to complete signIn with TOTP as the second factor.
   *
   * @param enrollmentId identifies the enrolled TOTP second factor.
   * @param oneTimePassword One-time password from TOTP App.
   * @returns A {@link TotpMultiFactorAssertion} which can be used with
   * {@link MultiFactorResolver.resolveSignIn}.
   */
  static assertionForSignIn(
    enrollmentId: string,
    oneTimePassword: string
  ): TotpMultiFactorAssertion {
    return TotpMultiFactorAssertionImpl._fromEnrollmentId(
      enrollmentId,
      oneTimePassword
    );
  }
  /**
   * Returns a promise to {@link TOTPSecret} which contains the TOTP shared secret key and other parameters.
   * Creates a TOTP secret as part of enrolling a TOTP second factor.
   * Used for generating a QRCode URL or inputting into a TOTP App.
   * This method uses the auth instance corresponding to the user in the multiFactorSession.
   *
   * @param session A link to {@MultiFactorSession}.
   * @returns A promise to {@link TotpSecret}.
   */
  static async generateSecret(
    session: MultiFactorSession
  ): Promise<TotpSecret> {
    const mfaSession = session as MultiFactorSessionImpl;
    _assert(
      typeof mfaSession.auth !== 'undefined',
      AuthErrorCode.INTERNAL_ERROR
    );
    const response = await startEnrollTotpMfa(mfaSession.auth!, {
      idToken: mfaSession.credential,
      totpEnrollmentInfo: {}
    });
    return TotpSecret.fromStartTotpMfaEnrollmentResponse(
      response,
      mfaSession.auth!.name
    );
  }
  /**
   * The identifier of the TOTP second factor: `totp`.
   */
  static FACTOR_ID = FactorId.TOTP;
}
