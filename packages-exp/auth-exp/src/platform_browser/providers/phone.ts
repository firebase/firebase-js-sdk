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
  Auth,
  PhoneInfoOptions,
  ProviderId,
  SignInMethod,
  ApplicationVerifier,
  UserCredential
} from '../../model/public_types';

import { SignInWithPhoneNumberResponse } from '../../api/authentication/sms';
import { ApplicationVerifierInternal as ApplicationVerifierInternal } from '../../model/application_verifier';
import { AuthInternal as AuthInternal } from '../../model/auth';
import { UserCredentialInternal as UserCredentialInternal } from '../../model/user';
import { PhoneAuthCredential } from '../../core/credentials/phone';
import { AuthErrorCode } from '../../core/errors';
import { _verifyPhoneNumber } from '../strategies/phone';
import { _assert, _fail } from '../../core/util/assert';
import { _castAuth } from '../../core/auth/auth_impl';
import { AuthCredential } from '../../core';

/**
 * Provider for generating an {@link PhoneAuthCredential}.
 *
 * @example
 * ```javascript
 * // 'recaptcha-container' is the ID of an element in the DOM.
 * const applicationVerifier = new RecaptchaVerifier('recaptcha-container');
 * const provider = new PhoneAuthProvider(auth);
 * const verificationId = await provider.verifyPhoneNumber('+16505550101', applicationVerifier);
 * // Obtain the verificationCode from the user.
 * const phoneCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
 * const userCredential = await signInWithCredential(auth, phoneCredential);
 * ```
 *
 * @public
 */
export class PhoneAuthProvider {
  /** Always set to {@link ProviderId.PHONE}. */
  static readonly PROVIDER_ID = ProviderId.PHONE;
  /** Always set to {@link SignInMethod.PHONE}. */
  static readonly PHONE_SIGN_IN_METHOD = SignInMethod.PHONE;

  /** Always set to {@link ProviderId.PHONE}. */
  readonly providerId = PhoneAuthProvider.PROVIDER_ID;
  private readonly auth: AuthInternal;

  /**
   * @param auth - The Firebase Auth instance in which sign-ins should occur.
   *
   */
  constructor(auth: Auth) {
    this.auth = _castAuth(auth);
  }

  /**
   *
   * Starts a phone number authentication flow by sending a verification code to the given phone
   * number.
   *
   * @example
   * ```javascript
   * const provider = new PhoneAuthProvider(auth);
   * const verificationId = await provider.verifyPhoneNumber(phoneNumber, applicationVerifier);
   * // Obtain verificationCode from the user.
   * const authCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
   * const userCredential = await signInWithCredential(auth, authCredential);
   * ```
   *
   * @example
   * An alternative flow is provided using the `signInWithPhoneNumber` method.
   * ```javascript
   * const confirmationResult = signInWithPhoneNumber(auth, phoneNumber, applicationVerifier);
   * // Obtain verificationCode from the user.
   * const userCredential = confirmationResult.confirm(verificationCode);
   * ```
   *
   * @param phoneInfoOptions - The user's {@link PhoneInfoOptions}. The phone number should be in
   * E.164 format (e.g. +16505550101).
   * @param applicationVerifier - For abuse prevention, this method also requires a
   * {@link ApplicationVerifier}. This SDK includes a reCAPTCHA-based implementation,
   * {@link RecaptchaVerifier}.
   *
   * @returns A Promise for a verification ID that can be passed to
   * {@link PhoneAuthProvider.credential} to identify this flow..
   */
  verifyPhoneNumber(
    phoneOptions: PhoneInfoOptions | string,
    applicationVerifier: ApplicationVerifier
  ): Promise<string> {
    return _verifyPhoneNumber(
      this.auth,
      phoneOptions,
      applicationVerifier as ApplicationVerifierInternal
    );
  }

  /**
   * Creates a phone auth credential, given the verification ID from
   * {@link PhoneAuthProvider.verifyPhoneNumber} and the code that was sent to the user's
   * mobile device.
   *
   * @example
   * ```javascript
   * const provider = new PhoneAuthProvider(auth);
   * const verificationId = provider.verifyPhoneNumber(phoneNumber, applicationVerifier);
   * // Obtain verificationCode from the user.
   * const authCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
   * const userCredential = signInWithCredential(auth, authCredential);
   * ```
   *
   * @example
   * An alternative flow is provided using the `signInWithPhoneNumber` method.
   * ```javascript
   * const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, applicationVerifier);
   * // Obtain verificationCode from the user.
   * const userCredential = await confirmationResult.confirm(verificationCode);
   * ```
   *
   * @param verificationId - The verification ID returned from {@link PhoneAuthProvider.verifyPhoneNumber}.
   * @param verificationCode - The verification code sent to the user's mobile device.
   *
   * @returns The auth provider credential.
   */
  static credential(
    verificationId: string,
    verificationCode: string
  ): PhoneAuthCredential {
    return PhoneAuthCredential._fromVerification(
      verificationId,
      verificationCode
    );
  }

  static credentialFromResult(
    userCredential: UserCredential
  ): AuthCredential | null {
    const credential = userCredential as UserCredentialInternal;
    _assert(
      credential._tokenResponse,
      credential.user.auth,
      AuthErrorCode.ARGUMENT_ERROR
    );
    const {
      phoneNumber,
      temporaryProof
    } = credential._tokenResponse as SignInWithPhoneNumberResponse;
    if (phoneNumber && temporaryProof) {
      return PhoneAuthCredential._fromTokenResponse(
        phoneNumber,
        temporaryProof
      );
    }

    _fail(credential.user.auth, AuthErrorCode.ARGUMENT_ERROR);
  }
}
