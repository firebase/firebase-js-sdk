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
import { Auth } from '../../model/auth';
import { User } from '../../model/user';
import { RECAPTCHA_VERIFIER_TYPE } from '../../platform_browser/recaptcha/recaptcha_verifier';
import { PhoneAuthCredential } from '../credentials/phone';
import { AuthErrorCode } from '../errors';
import { _assertLinkedStatus, _link } from '../user/link_unlink';
import { assert } from '../util/assert';
import {
  linkWithCredential,
  reauthenticateWithCredential,
  signInWithCredential
} from './credential';
import {
  MultiFactorSession,
  MultiFactorSessionType
} from '../../mfa/mfa_session';
import { MultiFactorInfo } from '../../mfa/mfa_info';

interface OnConfirmationCallback {
  (credential: PhoneAuthCredential): Promise<externs.UserCredential>;
}

interface PhoneInfoOptions extends externs.PhoneInfoOptions {
  phoneNumber: string;
  session?: MultiFactorSession;
  multiFactorHint?: MultiFactorInfo;
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

export async function signInWithPhoneNumber(
  auth: externs.Auth,
  phoneNumber: string,
  appVerifier: externs.ApplicationVerifier
): Promise<externs.ConfirmationResult> {
  const verificationId = await _verifyPhoneNumber(
    auth as Auth,
    phoneNumber,
    appVerifier as ApplicationVerifier
  );
  return new ConfirmationResult(verificationId, cred =>
    signInWithCredential(auth, cred)
  );
}

export async function linkWithPhoneNumber(
  userExtern: externs.User,
  phoneNumber: string,
  appVerifier: externs.ApplicationVerifier
): Promise<externs.ConfirmationResult> {
  const user = userExtern as User;
  await _assertLinkedStatus(false, user, externs.ProviderId.PHONE);
  const verificationId = await _verifyPhoneNumber(
    user.auth,
    phoneNumber,
    appVerifier as ApplicationVerifier
  );
  return new ConfirmationResult(verificationId, cred =>
    linkWithCredential(user, cred)
  );
}

export async function reauthenticateWithPhoneNumber(
  userExtern: externs.User,
  phoneNumber: string,
  appVerifier: externs.ApplicationVerifier
): Promise<externs.ConfirmationResult> {
  const user = userExtern as User;
  const verificationId = await _verifyPhoneNumber(
    user.auth,
    phoneNumber,
    appVerifier as ApplicationVerifier
  );
  return new ConfirmationResult(verificationId, cred =>
    reauthenticateWithCredential(user, cred)
  );
}

/**
 *  Returns a verification ID to be used in conjunction with the SMS code that
 *  is sent.
 */
export async function _verifyPhoneNumber(
  auth: Auth,
  options: externs.PhoneInfoOptions | string,
  verifier: ApplicationVerifier
): Promise<string> {
  const recaptchaToken = await verifier.verify();

  try {
    assert(
      typeof recaptchaToken === 'string',
      auth.name,
      AuthErrorCode.ARGUMENT_ERROR
    );
    assert(
      verifier.type === RECAPTCHA_VERIFIER_TYPE,
      auth.name,
      AuthErrorCode.ARGUMENT_ERROR
    );

    const phoneInfoOptions: PhoneInfoOptions =
      typeof options === 'string'
        ? { phoneNumber: options }
        : (options as PhoneInfoOptions);

    if (phoneInfoOptions.session?.type === MultiFactorSessionType.ENROLL) {
      const response = await startEnrollPhoneMfa(auth, {
        idToken: phoneInfoOptions.session.credential,
        phoneEnrollmentInfo: {
          phoneNumber: phoneInfoOptions.phoneNumber,
          recaptchaToken
        }
      });
      return response.phoneSessionInfo.sessionInfo;
    } else if (
      phoneInfoOptions.session?.type === MultiFactorSessionType.SIGN_IN
    ) {
      assert(phoneInfoOptions.multiFactorHint, auth.name);
      const response = await startSignInPhoneMfa(auth, {
        mfaPendingCredential: phoneInfoOptions.session.credential,
        mfaEnrollmentId: phoneInfoOptions.multiFactorHint.uid,
        phoneSignInInfo: {
          recaptchaToken
        }
      });
      return response.phoneResponseInfo.sessionInfo;
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

export async function updatePhoneNumber(
  user: externs.User,
  credential: externs.PhoneAuthCredential
): Promise<void> {
  await _link(user as User, credential as PhoneAuthCredential);
}
