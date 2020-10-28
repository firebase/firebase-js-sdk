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

import { startEnrollPhoneMfa } from '../../api/account_management/mfa';
import { startSignInPhoneMfa } from '../../api/authentication/mfa';
import { sendPhoneVerificationCode } from '../../api/authentication/sms';
import { ApplicationVerifier } from '../../model/application_verifier';
import { PhoneAuthCredential } from '../../core/credentials/phone';
import { AuthErrorCode } from '../../core/errors';
import { _assertLinkedStatus, _link } from '../../core/user/link_unlink';
import { _assert } from '../../core/util/assert';
import { Auth } from '../../model/auth';
import {
  linkWithCredential,
  reauthenticateWithCredential,
  signInWithCredential
} from '../../core/strategies/credential';
import {
  MultiFactorSession,
  MultiFactorSessionType
} from '../../mfa/mfa_session';
import { User } from '../../model/user';
import { RECAPTCHA_VERIFIER_TYPE } from '../recaptcha/recaptcha_verifier';
import { _castAuth } from '../../core/auth/auth_impl';

interface OnConfirmationCallback {
  (credential: PhoneAuthCredential): Promise<externs.UserCredential>;
}

class ConfirmationResult implements externs.ConfirmationResult {
  constructor(
    readonly verificationId: string,
    private readonly onConfirmation: OnConfirmationCallback
  ) {}

  confirm(verificationCode: string): Promise<externs.UserCredential> {
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
 * phone number, and returns a {@link @firebase/auth-types#ConfirmationResult}. After the user
 * provides the code sent to their phone, call {@link @firebase/auth-types#ConfirmationResult.confirm}
 * with the code to sign the user in.
 *
 * For abuse prevention, this method also requires a {@link @firebase/auth-types#ApplicationVerifier}.
 * This SDK includes a reCAPTCHA-based implementation, {@link RecaptchaVerifier}.
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
 * @param auth - The Auth instance.
 * @param phoneNumber - The user's phone number in E.164 format (e.g. +16505550101).
 * @param appVerifier - The {@link @firebase/auth-types#ApplicationVerifier}.
 *
 * @public
 */
export async function signInWithPhoneNumber(
  auth: externs.Auth,
  phoneNumber: string,
  appVerifier: externs.ApplicationVerifier
): Promise<externs.ConfirmationResult> {
  const verificationId = await _verifyPhoneNumber(
    _castAuth(auth),
    phoneNumber,
    appVerifier as ApplicationVerifier
  );
  return new ConfirmationResult(verificationId, cred =>
    signInWithCredential(auth, cred)
  );
}

/**
 * Links the user account with the given phone number.
 *
 * @param user - The user.
 * @param phoneNumber - The user's phone number in E.164 format (e.g. +16505550101).
 * @param appVerifier - The {@link @firebase/auth-types#ApplicationVerifier}.
 *
 * @public
 */
export async function linkWithPhoneNumber(
  user: externs.User,
  phoneNumber: string,
  appVerifier: externs.ApplicationVerifier
): Promise<externs.ConfirmationResult> {
  const userInternal = user as User;
  await _assertLinkedStatus(false, userInternal, externs.ProviderId.PHONE);
  const verificationId = await _verifyPhoneNumber(
    userInternal.auth,
    phoneNumber,
    appVerifier as ApplicationVerifier
  );
  return new ConfirmationResult(verificationId, cred =>
    linkWithCredential(user, cred)
  );
}

/**
 * Re-authenticates a user using a fresh phne credential.
 *
 * @remarks Use before operations such as {@link updatePassword} that require tokens from recent sign-in attempts.
 *
 * @param user - The user.
 * @param phoneNumber - The user's phone number in E.164 format (e.g. +16505550101).
 * @param appVerifier - The {@link @firebase/auth-types#ApplicationVerifier}.
 *
 * @public
 */
export async function reauthenticateWithPhoneNumber(
  user: externs.User,
  phoneNumber: string,
  appVerifier: externs.ApplicationVerifier
): Promise<externs.ConfirmationResult> {
  const userInternal = user as User;
  const verificationId = await _verifyPhoneNumber(
    userInternal.auth,
    phoneNumber,
    appVerifier as ApplicationVerifier
  );
  return new ConfirmationResult(verificationId, cred =>
    reauthenticateWithCredential(user, cred)
  );
}

/**
 * Returns a verification ID to be used in conjunction with the SMS code that is sent.
 *
 * @internal
 */
export async function _verifyPhoneNumber(
  auth: Auth,
  options: externs.PhoneInfoOptions | string,
  verifier: ApplicationVerifier
): Promise<string> {
  const recaptchaToken = await verifier.verify();

  try {
    _assert(typeof recaptchaToken === 'string', auth, AuthErrorCode.ARGUMENT_ERROR);
    _assert(
      verifier.type === RECAPTCHA_VERIFIER_TYPE,
      auth,
      AuthErrorCode.ARGUMENT_ERROR,);

    let phoneInfoOptions: externs.PhoneInfoOptions;

    if (typeof options === 'string') {
      phoneInfoOptions = {
        phoneNumber: options
      };
    } else {
      phoneInfoOptions = options;
    }

    if ('session' in phoneInfoOptions) {
      const session = phoneInfoOptions.session as MultiFactorSession;

      if ('phoneNumber' in phoneInfoOptions) {
        _assert(
          session.type === MultiFactorSessionType.ENROLL,
          auth,
          AuthErrorCode.INTERNAL_ERROR,);
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
          AuthErrorCode.INTERNAL_ERROR,);
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
  user: externs.User,
  credential: externs.PhoneAuthCredential
): Promise<void> {
  await _link(user as User, credential as PhoneAuthCredential);
}
