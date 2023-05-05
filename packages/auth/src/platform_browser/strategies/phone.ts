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
  ApplicationVerifier,
  Auth,
  ConfirmationResult,
  PhoneInfoOptions,
  User,
  UserCredential
} from '../../model/public_types';

import { startEnrollPhoneMfa } from '../../api/account_management/mfa';
import { startSignInPhoneMfa } from '../../api/authentication/mfa';
import { sendPhoneVerificationCode } from '../../api/authentication/sms';
import { ApplicationVerifierInternal } from '../../model/application_verifier';
import { PhoneAuthCredential } from '../../core/credentials/phone';
import { AuthErrorCode } from '../../core/errors';
import { _assertLinkedStatus, _link } from '../../core/user/link_unlink';
import { _assert } from '../../core/util/assert';
import { AuthInternal } from '../../model/auth';
import {
  linkWithCredential,
  reauthenticateWithCredential,
  signInWithCredential
} from '../../core/strategies/credential';
import {
  MultiFactorSessionImpl,
  MultiFactorSessionType
} from '../../mfa/mfa_session';
import { UserInternal } from '../../model/user';
import { RECAPTCHA_VERIFIER_TYPE } from '../recaptcha/recaptcha_verifier';
import { _castAuth } from '../../core/auth/auth_impl';
import { getModularInstance } from '@firebase/util';
import { ProviderId } from '../../model/enums';

interface OnConfirmationCallback {
  (credential: PhoneAuthCredential): Promise<UserCredential>;
}

class ConfirmationResultImpl implements ConfirmationResult {
  constructor(
    readonly verificationId: string,
    private readonly onConfirmation: OnConfirmationCallback
  ) {}

  confirm(verificationCode: string): Promise<UserCredential> {
    const authCredential = PhoneAuthCredential._fromVerification(
      this.verificationId,
      verificationCode
    );
    return this.onConfirmation(authCredential);
  }
}

/**
 * Asynchronously signs in using a phone number.
 *
 * @remarks
 * This method sends a code via SMS to the given
 * phone number, and returns a {@link ConfirmationResult}. After the user
 * provides the code sent to their phone, call {@link ConfirmationResult.confirm}
 * with the code to sign the user in.
 *
 * For abuse prevention, this method also requires a {@link ApplicationVerifier}.
 * This SDK includes a reCAPTCHA-based implementation, {@link RecaptchaVerifier}.
 * This function can work on other platforms that do not support the
 * {@link RecaptchaVerifier} (like React Native), but you need to use a
 * third-party {@link ApplicationVerifier} implementation.
 *
 * This method does not work in a Node.js environment.
 *
 * @example
 * ```javascript
 * // 'recaptcha-container' is the ID of an element in the DOM.
 * const applicationVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container');
 * const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, applicationVerifier);
 * // Obtain a verificationCode from the user.
 * const credential = await confirmationResult.confirm(verificationCode);
 * ```
 *
 * @param auth - The {@link Auth} instance.
 * @param phoneNumber - The user's phone number in E.164 format (e.g. +16505550101).
 * @param appVerifier - The {@link ApplicationVerifier}.
 *
 * @public
 */
export async function signInWithPhoneNumber(
  auth: Auth,
  phoneNumber: string,
  appVerifier: ApplicationVerifier
): Promise<ConfirmationResult> {
  const authInternal = _castAuth(auth);
  const verificationId = await _verifyPhoneNumber(
    authInternal,
    phoneNumber,
    getModularInstance(appVerifier as ApplicationVerifierInternal)
  );
  return new ConfirmationResultImpl(verificationId, cred =>
    signInWithCredential(authInternal, cred)
  );
}

/**
 * Links the user account with the given phone number.
 *
 * @remarks
 * This method does not work in a Node.js environment.
 *
 * @param user - The user.
 * @param phoneNumber - The user's phone number in E.164 format (e.g. +16505550101).
 * @param appVerifier - The {@link ApplicationVerifier}.
 *
 * @public
 */
export async function linkWithPhoneNumber(
  user: User,
  phoneNumber: string,
  appVerifier: ApplicationVerifier
): Promise<ConfirmationResult> {
  const userInternal = getModularInstance(user) as UserInternal;
  await _assertLinkedStatus(false, userInternal, ProviderId.PHONE);
  const verificationId = await _verifyPhoneNumber(
    userInternal.auth,
    phoneNumber,
    getModularInstance(appVerifier as ApplicationVerifierInternal)
  );
  return new ConfirmationResultImpl(verificationId, cred =>
    linkWithCredential(userInternal, cred)
  );
}

/**
 * Re-authenticates a user using a fresh phone credential.
 *
 * @remarks
 * Use before operations such as {@link updatePassword} that require tokens from recent sign-in attempts.
 *
 * This method does not work in a Node.js environment.
 *
 * @param user - The user.
 * @param phoneNumber - The user's phone number in E.164 format (e.g. +16505550101).
 * @param appVerifier - The {@link ApplicationVerifier}.
 *
 * @public
 */
export async function reauthenticateWithPhoneNumber(
  user: User,
  phoneNumber: string,
  appVerifier: ApplicationVerifier
): Promise<ConfirmationResult> {
  const userInternal = getModularInstance(user) as UserInternal;
  const verificationId = await _verifyPhoneNumber(
    userInternal.auth,
    phoneNumber,
    getModularInstance(appVerifier as ApplicationVerifierInternal)
  );
  return new ConfirmationResultImpl(verificationId, cred =>
    reauthenticateWithCredential(userInternal, cred)
  );
}

/**
 * Returns a verification ID to be used in conjunction with the SMS code that is sent.
 *
 */
export async function _verifyPhoneNumber(
  auth: AuthInternal,
  options: PhoneInfoOptions | string,
  verifier: ApplicationVerifierInternal
): Promise<string> {
  const recaptchaToken = await verifier.verify();

  try {
    _assert(
      typeof recaptchaToken === 'string',
      auth,
      AuthErrorCode.ARGUMENT_ERROR
    );
    _assert(
      verifier.type === RECAPTCHA_VERIFIER_TYPE,
      auth,
      AuthErrorCode.ARGUMENT_ERROR
    );

    let phoneInfoOptions: PhoneInfoOptions;

    if (typeof options === 'string') {
      phoneInfoOptions = {
        phoneNumber: options
      };
    } else {
      phoneInfoOptions = options;
    }

    if ('session' in phoneInfoOptions) {
      const session = phoneInfoOptions.session as MultiFactorSessionImpl;

      if ('phoneNumber' in phoneInfoOptions) {
        _assert(
          session.type === MultiFactorSessionType.ENROLL,
          auth,
          AuthErrorCode.INTERNAL_ERROR
        );
        const response = await startEnrollPhoneMfa(auth, {
          idToken: session.credential,
          phoneEnrollmentInfo: {
            phoneNumber: phoneInfoOptions.phoneNumber,
            recaptchaToken
          }
        });
        return response.phoneSessionInfo.sessionInfo;
      } else {
        _assert(
          session.type === MultiFactorSessionType.SIGN_IN,
          auth,
          AuthErrorCode.INTERNAL_ERROR
        );
        const mfaEnrollmentId =
          phoneInfoOptions.multiFactorHint?.uid ||
          phoneInfoOptions.multiFactorUid;
        _assert(mfaEnrollmentId, auth, AuthErrorCode.MISSING_MFA_INFO);
        const response = await startSignInPhoneMfa(auth, {
          mfaPendingCredential: session.credential,
          mfaEnrollmentId,
          phoneSignInInfo: {
            recaptchaToken
          }
        });
        return response.phoneResponseInfo.sessionInfo;
      }
    } else {
      const { sessionInfo } = await sendPhoneVerificationCode(auth, {
        phoneNumber: phoneInfoOptions.phoneNumber,
        recaptchaToken
      });
      return sessionInfo;
    }
  } finally {
    verifier._reset();
  }
}

/**
 * Updates the user's phone number.
 *
 * @remarks
 * This method does not work in a Node.js environment.
 *
 * @example
 * ```
 * // 'recaptcha-container' is the ID of an element in the DOM.
 * const applicationVerifier = new RecaptchaVerifier('recaptcha-container');
 * const provider = new PhoneAuthProvider(auth);
 * const verificationId = await provider.verifyPhoneNumber('+16505550101', applicationVerifier);
 * // Obtain the verificationCode from the user.
 * const phoneCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
 * await updatePhoneNumber(user, phoneCredential);
 * ```
 *
 * @param user - The user.
 * @param credential - A credential authenticating the new phone number.
 *
 * @public
 */
export async function updatePhoneNumber(
  user: User,
  credential: PhoneAuthCredential
): Promise<void> {
  await _link(getModularInstance(user) as UserInternal, credential);
}
