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
  TotpMultiFactorAssertion,
  MultiFactorSession,
  FactorId
} from '../../model/public_types';
import { AuthInternal } from '../../model/auth';
import {
  finalizeEnrollTotpMfa,
  startEnrollTotpMfa,
  StartTotpMfaEnrollmentResponse,
  TotpVerificationInfo
} from '../../api/account_management/mfa';
import { FinalizeMfaResponse } from '../../api/authentication/mfa';
import { MultiFactorAssertionImpl } from '../../mfa/mfa_assertion';
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
    const response = await startEnrollTotpMfa(mfaSession.auth, {
      idToken: mfaSession.credential,
      totpEnrollmentInfo: {}
    });
    return TotpSecret._fromStartTotpMfaEnrollmentResponse(
      response,
      mfaSession.auth
    );
  }

  /**
   * The identifier of the TOTP second factor: `totp`.
   */
  static FACTOR_ID = FactorId.TOTP;
}

export class TotpMultiFactorAssertionImpl
  extends MultiFactorAssertionImpl
  implements TotpMultiFactorAssertion
{
  constructor(
    readonly otp: string,
    readonly enrollmentId?: string,
    readonly secret?: TotpSecret
  ) {
    super(FactorId.TOTP);
  }

  /** @internal */
  static _fromSecret(
    secret: TotpSecret,
    otp: string
  ): TotpMultiFactorAssertionImpl {
    return new TotpMultiFactorAssertionImpl(otp, undefined, secret);
  }

  /** @internal */
  static _fromEnrollmentId(
    enrollmentId: string,
    otp: string
  ): TotpMultiFactorAssertionImpl {
    return new TotpMultiFactorAssertionImpl(otp, enrollmentId);
  }

  /** @internal */
  _finalizeEnroll(
    auth: AuthInternal,
    idToken: string,
    displayName?: string | null
  ): Promise<FinalizeMfaResponse> {
    _assert(
      typeof this.secret !== 'undefined',
      auth,
      AuthErrorCode.ARGUMENT_ERROR
    );
    return finalizeEnrollTotpMfa(auth, {
      idToken,
      displayName,
      totpVerificationInfo: this.secret._makeTotpVerificationInfo(this.otp)
    });
  }

  /** @internal */
  _finalizeSignIn(
    _auth: AuthInternal,
    _mfaPendingCredential: string
  ): Promise<FinalizeMfaResponse> {
    throw new Error('method not implemented');
  }
}

/**
 * Provider for generating a {@link TotpMultiFactorAssertion}.
 *
 * Stores the shared secret key and other parameters to generate time-based OTPs.
 * Implements methods to retrieve the shared secret key, generate a QRCode URL.
 * @public
 */
export class TotpSecret {
  /**
   * Shared secret key/seed used for enrolling in TOTP MFA and generating otps.
   */
  readonly secretKey: string;
  /**
   * Hashing algorithm used.
   */
  readonly hashingAlgorithm: string;
  /**
   * Length of the one-time passwords to be generated.
   */
  readonly codeLength: number;
  /**
   * The interval (in seconds) when the OTP codes should change.
   */
  readonly codeIntervalSeconds: number;
  // TODO(prameshj) - make this public after API review.
  // This can be used by callers to show a countdown of when to enter OTP code by.
  private readonly finalizeEnrollmentBy: string;

  // The public members are declared outside the constructor so the docs can be generated.
  private constructor(
    secretKey: string,
    hashingAlgorithm: string,
    codeLength: number,
    codeIntervalSeconds: number,
    finalizeEnrollmentBy: string,
    private readonly sessionInfo: string,
    private readonly auth: AuthInternal
  ) {
    this.secretKey = secretKey;
    this.hashingAlgorithm = hashingAlgorithm;
    this.codeLength = codeLength;
    this.codeIntervalSeconds = codeIntervalSeconds;
    this.finalizeEnrollmentBy = finalizeEnrollmentBy;
  }

  /** @internal */
  static _fromStartTotpMfaEnrollmentResponse(
    response: StartTotpMfaEnrollmentResponse,
    auth: AuthInternal
  ): TotpSecret {
    return new TotpSecret(
      response.totpSessionInfo.sharedSecretKey,
      response.totpSessionInfo.hashingAlgorithm,
      response.totpSessionInfo.verificationCodeLength,
      response.totpSessionInfo.periodSec,
      new Date(response.totpSessionInfo.finalizeEnrollmentTime).toUTCString(),
      response.totpSessionInfo.sessionInfo,
      auth
    );
  }

  /** @internal */
  _makeTotpVerificationInfo(otp: string): TotpVerificationInfo {
    return { sessionInfo: this.sessionInfo, verificationCode: otp };
  }

  /**
   * Returns a QRCode URL as described in
   * https://github.com/google/google-authenticator/wiki/Key-Uri-Format
   * This can be displayed to the user as a QRCode to be scanned into a TOTP App like Google Authenticator.
   * If the optional parameters are unspecified, an accountName of <userEmail> and issuer of <firebaseAppName> are used.
   *
   * @param accountName the name of the account/app along with a user identifier.
   * @param issuer issuer of the TOTP(likely the app name).
   * @returns A QRCode URL string.
   */
  generateQrCodeUrl(accountName?: string, issuer?: string): string {
    let useDefaults = false;
    if (_isEmptyString(accountName) || _isEmptyString(issuer)) {
      useDefaults = true;
    }
    if (useDefaults) {
      if (_isEmptyString(accountName)) {
        accountName = this.auth.currentUser?.email || 'unknownuser';
      }
      if (_isEmptyString(issuer)) {
        issuer = this.auth.name;
      }
    }
    return `otpauth://totp/${issuer}:${accountName}?secret=${this.secretKey}&issuer=${issuer}&algorithm=${this.hashingAlgorithm}&digits=${this.codeLength}`;
  }
}

/** @internal */
function _isEmptyString(input?: string): boolean {
  return typeof input === 'undefined' || input?.length === 0;
}
