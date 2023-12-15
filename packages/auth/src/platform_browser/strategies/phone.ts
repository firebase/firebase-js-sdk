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
import { AuthErrorCode, WebOTPError } from '../../core/errors';
import { _assertLinkedStatus, _link } from '../../core/user/link_unlink';
import { _assert, _errorWithCustomMessage } from '../../core/util/assert';
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

// interfaces added to provide typescript support for webOTP autofill
interface OTPCredentialRequestOptions extends CredentialRequestOptions {
  otp: OTPOptions;
}

interface OTPOptions {
  transport: string[];
}

interface OTPCredential extends Credential {
  code?: string;
}

class ConfirmationResultImpl implements ConfirmationResult {
  constructor(
    readonly verificationId: string,
    private readonly onConfirmation: OnConfirmationCallback
  ) {}

  private confirmInProgress = false;
  private confirmResolve: (
    value: UserCredential | PromiseLike<UserCredential>
  ) => void = () => {};
  private confirmReject: (reason: Error) => void = () => {};

  // confirm method with minimal changes
  async confirm(verificationCode: string): Promise<UserCredential> {
    this.confirmInProgress = true;
    try {
      const authCredential = PhoneAuthCredential._fromVerification(
        this.verificationId,
        verificationCode
      );
      const userCredential = await this.onConfirmation(authCredential);
      this.confirmResolve(userCredential); // Resolve any waiting confirmed promise
      return userCredential;
    } catch (error) {
      this.confirmReject(error as Error); // Reject any waiting confirmed promise
      throw error;
    } finally {
      this.confirmInProgress = false;
    }
  }

  // New confirmed method
  confirmed(auth: Auth): Promise<UserCredential> {
    // If confirm is already in progress, we return a promise that will be resolved
    // or rejected by the ongoing confirm operation.
    if (this.confirmInProgress) {
      return new Promise<UserCredential>((resolve, reject) => {
        this.confirmResolve = resolve;
        this.confirmReject = reject;
      });
    } else {
      // If confirm is not in progress, we race confirmWithWebOTP with a promise
      // that can be resolved or rejected by a future confirm call.
      const manualConfirmationPromise = new Promise<UserCredential>(
        (resolve, reject) => {
          this.confirmResolve = resolve;
          this.confirmReject = reject;
        }
      );

      // Immediately invoke confirmWithWebOTP to start the WebOTP process
      const webOTPConfirmationPromise = this.confirmWithWebOTP(auth, 30);

      // Race the manual confirmation promise against the WebOTP confirmation promise
      return Promise.race([
        manualConfirmationPromise,
        webOTPConfirmationPromise
      ]);
    }
  }

  async confirmWithWebOTP(
    auth: Auth,
    webOTPTimeoutSeconds: number
  ): Promise<UserCredential> {
    if ('OTPCredential' in window) {
      const abortController = new AbortController();
      const timer = setTimeout(() => {
        abortController.abort();

        const myErr = _errorWithCustomMessage(
          auth,
          AuthErrorCode.WEB_OTP_NOT_RETRIEVED,
          `Web OTP code is not fetched before timeout`
        ) as WebOTPError;
        myErr.confirmationResult = this;
        throw myErr;
      }, webOTPTimeoutSeconds * 1000);

      const o: OTPCredentialRequestOptions = {
        otp: { transport: ['sms'] },
        signal: abortController.signal
      };

      let code: string = '';
      await (
        window.navigator['credentials'].get(o) as Promise<OTPCredential | null>
      )
        .then(async content => {
          if (
            content === undefined ||
            content === null ||
            content.code === undefined
          ) {
            const myErr = _errorWithCustomMessage(
              auth,
              AuthErrorCode.WEB_OTP_NOT_RETRIEVED,
              `the auto-retrieved credential or code is not defined`
            ) as WebOTPError;
            myErr.confirmationResult = this;
            throw myErr;
          } else {
            clearTimeout(timer);
            code = content.code;
          }
        })
        .catch(() => {
          clearTimeout(timer);
          const myErr = _errorWithCustomMessage(
            auth,
            AuthErrorCode.WEB_OTP_NOT_RETRIEVED,
            `Web OTP get method failed to retrieve the code`
          ) as WebOTPError;
          myErr.confirmationResult = this;
          throw myErr;
        });
      try {
        return this.confirm(code);
      } catch {
        const myErr = _errorWithCustomMessage(
          auth,
          AuthErrorCode.WEB_OTP_NOT_RETRIEVED,
          `Web OTP code received is incorrect`
        ) as WebOTPError;
        myErr.confirmationResult = this;
        throw myErr;
      }
    } else {
      const myErr = _errorWithCustomMessage(
        auth,
        AuthErrorCode.WEB_OTP_NOT_RETRIEVED,
        `Web OTP is not supported`
      ) as WebOTPError;
      myErr.confirmationResult = this;
      throw myErr;
    }
  }
}

/**
 * Asynchronously signs in using a phone number.
 *
 * @remarks
 * This method sends a code via SMS to the given phone number,
 * and returns a {@link ConfirmationResult}. After the user
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
 * @param webOTPTimtout - Errors would be thrown if WebOTP autofill is used and does not resolve within this specified timeout parameter (milliseconds).
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
    let verificationId = '';
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
        verificationId = response.phoneSessionInfo.sessionInfo;
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
        verificationId = response.phoneResponseInfo.sessionInfo;
      }
    } else {
      const { sessionInfo } = await sendPhoneVerificationCode(auth, {
        phoneNumber: phoneInfoOptions.phoneNumber,
        recaptchaToken
      });
      verificationId = sessionInfo;
    }
    return verificationId;
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
