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

import { sendPhoneVerificationCode } from '../../api/authentication/sms';
import { Auth } from '../../model/auth';
import { User } from '../../model/user';
import { RECAPTCHA_VERIFIER_TYPE } from '../../platform_browser/recaptcha/recaptcha_verifier';
import { AuthErrorCode } from '../errors';
import { assert } from '../util/assert';
<<<<<<< HEAD
import { signInWithCredential } from './credential';
import { PhoneAuthCredential } from '../credentials/phone';
=======
import { _assertLinkedStatus, linkWithCredential, signInWithCredential } from './credential';
import { PhoneAuthCredential } from './phone_credential';
>>>>>>> ffdb4d73... Add unlink(), linkWithCredential(), linkWithPhoneNumber()

interface OnConfirmationCallback {
  (credential: PhoneAuthCredential): Promise<externs.UserCredential>;
}

class ConfirmationResult implements externs.ConfirmationResult {
  constructor(
    readonly verificationId: string,
    private readonly onConfirmation: OnConfirmationCallback
  ) {}

  confirm(verificationCode: string): Promise<externs.UserCredential> {
    const authCredential = new PhoneAuthCredential({
      verificationId: this.verificationId,
      verificationCode
    });
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
    appVerifier
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
    appVerifier
  );
  return new ConfirmationResult(verificationId, cred =>
    linkWithCredential(user, cred)
  );
}

/**
 *  Returns a verification ID to be used in conjunction with the SMS code that
 *  is sent.
 */
export async function _verifyPhoneNumber(
  auth: Auth,
  options: externs.PhoneInfoOptions | string,
  verifier: externs.ApplicationVerifier
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

    let phoneNumber: string;
    if (typeof options === 'string') {
      phoneNumber = options;
    } else {
      phoneNumber = options.phoneNumber;
    }

    // MFA steps should happen here, before this next block
    const { sessionInfo } = await sendPhoneVerificationCode(auth, {
      phoneNumber,
      recaptchaToken
    });

    return sessionInfo;
  } finally {
    verifier.reset();
  }
}
