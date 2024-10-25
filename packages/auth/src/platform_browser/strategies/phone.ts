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

import {
  startEnrollPhoneMfa,
  StartPhoneMfaEnrollmentRequest,
  StartPhoneMfaEnrollmentResponse
} from '../../api/account_management/mfa';
import {
  startSignInPhoneMfa,
  StartPhoneMfaSignInRequest,
  StartPhoneMfaSignInResponse
} from '../../api/authentication/mfa';
import {
  sendPhoneVerificationCode,
  SendPhoneVerificationCodeRequest,
  SendPhoneVerificationCodeResponse
} from '../../api/authentication/sms';
import {
  RecaptchaActionName,
  RecaptchaClientType,
  RecaptchaAuthProvider
} from '../../api';
import { ApplicationVerifierInternal } from '../../model/application_verifier';
import { PhoneAuthCredential } from '../../core/credentials/phone';
import { AuthErrorCode } from '../../core/errors';
import { _assertLinkedStatus, _link } from '../../core/user/link_unlink';
import {
  _assert,
  _serverAppCurrentUserOperationNotSupportedError
} from '../../core/util/assert';
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
import {
  FAKE_TOKEN,
  handleRecaptchaFlow,
  _initializeRecaptchaConfig
} from '../recaptcha/recaptcha_enterprise_verifier';
import { _isFirebaseServerApp } from '@firebase/app';

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
 * For abuse prevention, this method requires a {@link ApplicationVerifier}.
 * This SDK includes an implementation based on reCAPTCHA v2, {@link RecaptchaVerifier}.
 * This function can work on other platforms that do not support the
 * {@link RecaptchaVerifier} (like React Native), but you need to use a
 * third-party {@link ApplicationVerifier} implementation.
 *
 * If you've enabled project-level reCAPTCHA Enterprise bot protection in
 * Enforce mode, you can omit the {@link ApplicationVerifier}.
 *
 * This method does not work in a Node.js environment or with {@link Auth} instances created with a
 * {@link @firebase/app#FirebaseServerApp}.
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
  appVerifier?: ApplicationVerifier
): Promise<ConfirmationResult> {
  if (_isFirebaseServerApp(auth.app)) {
    return Promise.reject(
      _serverAppCurrentUserOperationNotSupportedError(auth)
    );
  }
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
  appVerifier?: ApplicationVerifier
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
 * This method does not work in a Node.js environment or on any {@link User} signed in by
 * {@link Auth} instances created with a {@link @firebase/app#FirebaseServerApp}.
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
  appVerifier?: ApplicationVerifier
): Promise<ConfirmationResult> {
  const userInternal = getModularInstance(user) as UserInternal;
  if (_isFirebaseServerApp(userInternal.auth.app)) {
    return Promise.reject(
      _serverAppCurrentUserOperationNotSupportedError(userInternal.auth)
    );
  }
  const verificationId = await _verifyPhoneNumber(
    userInternal.auth,
    phoneNumber,
    getModularInstance(appVerifier as ApplicationVerifierInternal)
  );
  return new ConfirmationResultImpl(verificationId, cred =>
    reauthenticateWithCredential(userInternal, cred)
  );
}

type PhoneApiCaller<TRequest, TResponse> = (
  auth: AuthInternal,
  request: TRequest
) => Promise<TResponse>;

/**
 * Returns a verification ID to be used in conjunction with the SMS code that is sent.
 *
 */
export async function _verifyPhoneNumber(
  auth: AuthInternal,
  options: PhoneInfoOptions | string,
  verifier?: ApplicationVerifierInternal
): Promise<string> {
  if (!auth._getRecaptchaConfig()) {
    try {
      await _initializeRecaptchaConfig(auth);
    } catch (error) {
      // If an error occurs while fetching the config, there is no way to know the enablement state
      // of Phone provider, so we proceed with recaptcha V2 verification.
      // The error is likely "recaptchaKey undefined", as reCAPTCHA Enterprise is not
      // enabled for any provider.
      console.log(
        'Failed to initialize reCAPTCHA Enterprise config. Triggering the reCAPTCHA v2 verification.'
      );
    }
  }

  try {
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

        const startPhoneMfaEnrollmentRequest: StartPhoneMfaEnrollmentRequest = {
          idToken: session.credential,
          phoneEnrollmentInfo: {
            phoneNumber: phoneInfoOptions.phoneNumber,
            clientType: RecaptchaClientType.WEB
          }
        };

        const startEnrollPhoneMfaActionCallback: PhoneApiCaller<
          StartPhoneMfaEnrollmentRequest,
          StartPhoneMfaEnrollmentResponse
        > = async (
          authInstance: AuthInternal,
          request: StartPhoneMfaEnrollmentRequest
        ) => {
          // If reCAPTCHA Enterprise token is FAKE_TOKEN, fetch reCAPTCHA v2 token and inject into request.
          if (request.phoneEnrollmentInfo.captchaResponse === FAKE_TOKEN) {
            _assert(
              verifier?.type === RECAPTCHA_VERIFIER_TYPE,
              authInstance,
              AuthErrorCode.ARGUMENT_ERROR
            );

            const requestWithRecaptchaV2 = await injectRecaptchaV2Token(
              authInstance,
              request,
              verifier
            );
            return startEnrollPhoneMfa(authInstance, requestWithRecaptchaV2);
          }
          return startEnrollPhoneMfa(authInstance, request);
        };

        const startPhoneMfaEnrollmentResponse: Promise<StartPhoneMfaEnrollmentResponse> =
          handleRecaptchaFlow(
            auth,
            startPhoneMfaEnrollmentRequest,
            RecaptchaActionName.MFA_SMS_ENROLLMENT,
            startEnrollPhoneMfaActionCallback,
            RecaptchaAuthProvider.PHONE_PROVIDER
          );

        const response = await startPhoneMfaEnrollmentResponse.catch(error => {
          return Promise.reject(error);
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

        const startPhoneMfaSignInRequest: StartPhoneMfaSignInRequest = {
          mfaPendingCredential: session.credential,
          mfaEnrollmentId,
          phoneSignInInfo: {
            clientType: RecaptchaClientType.WEB
          }
        };

        const startSignInPhoneMfaActionCallback: PhoneApiCaller<
          StartPhoneMfaSignInRequest,
          StartPhoneMfaSignInResponse
        > = async (
          authInstance: AuthInternal,
          request: StartPhoneMfaSignInRequest
        ) => {
          // If reCAPTCHA Enterprise token is FAKE_TOKEN, fetch reCAPTCHA v2 token and inject into request.
          if (request.phoneSignInInfo.captchaResponse === FAKE_TOKEN) {
            _assert(
              verifier?.type === RECAPTCHA_VERIFIER_TYPE,
              authInstance,
              AuthErrorCode.ARGUMENT_ERROR
            );

            const requestWithRecaptchaV2 = await injectRecaptchaV2Token(
              authInstance,
              request,
              verifier
            );
            return startSignInPhoneMfa(authInstance, requestWithRecaptchaV2);
          }
          return startSignInPhoneMfa(authInstance, request);
        };

        const startPhoneMfaSignInResponse: Promise<StartPhoneMfaSignInResponse> =
          handleRecaptchaFlow(
            auth,
            startPhoneMfaSignInRequest,
            RecaptchaActionName.MFA_SMS_SIGNIN,
            startSignInPhoneMfaActionCallback,
            RecaptchaAuthProvider.PHONE_PROVIDER
          );

        const response = await startPhoneMfaSignInResponse.catch(error => {
          return Promise.reject(error);
        });

        return response.phoneResponseInfo.sessionInfo;
      }
    } else {
      const sendPhoneVerificationCodeRequest: SendPhoneVerificationCodeRequest =
        {
          phoneNumber: phoneInfoOptions.phoneNumber,
          clientType: RecaptchaClientType.WEB
        };

      const sendPhoneVerificationCodeActionCallback: PhoneApiCaller<
        SendPhoneVerificationCodeRequest,
        SendPhoneVerificationCodeResponse
      > = async (
        authInstance: AuthInternal,
        request: SendPhoneVerificationCodeRequest
      ) => {
        // If reCAPTCHA Enterprise token is FAKE_TOKEN, fetch reCAPTCHA v2 token and inject into request.
        if (request.captchaResponse === FAKE_TOKEN) {
          _assert(
            verifier?.type === RECAPTCHA_VERIFIER_TYPE,
            authInstance,
            AuthErrorCode.ARGUMENT_ERROR
          );

          const requestWithRecaptchaV2 = await injectRecaptchaV2Token(
            authInstance,
            request,
            verifier
          );
          return sendPhoneVerificationCode(
            authInstance,
            requestWithRecaptchaV2
          );
        }
        return sendPhoneVerificationCode(authInstance, request);
      };

      const sendPhoneVerificationCodeResponse: Promise<SendPhoneVerificationCodeResponse> =
        handleRecaptchaFlow(
          auth,
          sendPhoneVerificationCodeRequest,
          RecaptchaActionName.SEND_VERIFICATION_CODE,
          sendPhoneVerificationCodeActionCallback,
          RecaptchaAuthProvider.PHONE_PROVIDER
        );

      const response = await sendPhoneVerificationCodeResponse.catch(error => {
        return Promise.reject(error);
      });

      return response.sessionInfo;
    }
  } finally {
    verifier?._reset();
  }
}

/**
 * Updates the user's phone number.
 *
 * @remarks
 * This method does not work in a Node.js environment or on any {@link User} signed in by
 * {@link Auth} instances created with a {@link @firebase/app#FirebaseServerApp}.
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
  const userInternal = getModularInstance(user) as UserInternal;
  if (_isFirebaseServerApp(userInternal.auth.app)) {
    return Promise.reject(
      _serverAppCurrentUserOperationNotSupportedError(userInternal.auth)
    );
  }
  await _link(userInternal, credential);
}

// Helper function that fetches and injects a reCAPTCHA v2 token into the request.
export async function injectRecaptchaV2Token<T extends object>(
  auth: AuthInternal,
  request: T,
  recaptchaV2Verifier: ApplicationVerifierInternal
): Promise<T> {
  _assert(
    recaptchaV2Verifier.type === RECAPTCHA_VERIFIER_TYPE,
    auth,
    AuthErrorCode.ARGUMENT_ERROR
  );

  const recaptchaV2Token = await recaptchaV2Verifier.verify();

  _assert(
    typeof recaptchaV2Token === 'string',
    auth,
    AuthErrorCode.ARGUMENT_ERROR
  );

  const newRequest = { ...request };

  if ('phoneEnrollmentInfo' in newRequest) {
    const phoneNumber = (
      newRequest as unknown as StartPhoneMfaEnrollmentRequest
    ).phoneEnrollmentInfo.phoneNumber;
    const captchaResponse = (
      newRequest as unknown as StartPhoneMfaEnrollmentRequest
    ).phoneEnrollmentInfo.captchaResponse;
    const clientType = (newRequest as unknown as StartPhoneMfaEnrollmentRequest)
      .phoneEnrollmentInfo.clientType;
    const recaptchaVersion = (
      newRequest as unknown as StartPhoneMfaEnrollmentRequest
    ).phoneEnrollmentInfo.recaptchaVersion;

    Object.assign(newRequest, {
      'phoneEnrollmentInfo': {
        phoneNumber,
        recaptchaToken: recaptchaV2Token,
        captchaResponse,
        clientType,
        recaptchaVersion
      }
    });

    return newRequest;
  } else if ('phoneSignInInfo' in newRequest) {
    const captchaResponse = (
      newRequest as unknown as StartPhoneMfaSignInRequest
    ).phoneSignInInfo.captchaResponse;
    const clientType = (newRequest as unknown as StartPhoneMfaSignInRequest)
      .phoneSignInInfo.clientType;
    const recaptchaVersion = (
      newRequest as unknown as StartPhoneMfaSignInRequest
    ).phoneSignInInfo.recaptchaVersion;

    Object.assign(newRequest, {
      'phoneSignInInfo': {
        recaptchaToken: recaptchaV2Token,
        captchaResponse,
        clientType,
        recaptchaVersion
      }
    });

    return newRequest;
  } else {
    Object.assign(newRequest, { 'recaptchaToken': recaptchaV2Token });
    return newRequest;
  }
}
