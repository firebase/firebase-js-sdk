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
import { ApplicationVerifier } from '../../model/application_verifier';
import { Auth } from '../../model/auth';
import { User } from '../../model/user';
import { RECAPTCHA_VERIFIER_TYPE } from '../../platform_browser/recaptcha/recaptcha_verifier';
import { PhoneAuthCredential } from '../credentials/phone';
import { AuthErrorCode } from '../errors';
import { _assertLinkedStatus } from '../user/link_unlink';
import { assert } from '../util/assert';
import {
  linkWithCredential,
  reauthenticateWithCredential,
  signInWithCredential
} from './credential';

interface OnConfirmationCallback {
  (credential: PhoneAuthCredential): Promise<
    externs.UserCredential<externs.PhoneAuthCredential>
  >;
}

class ConfirmationResult implements externs.ConfirmationResult {
  constructor(
    readonly verificationId: string,
    private readonly onConfirmation: OnConfirmationCallback
  ) {}

  confirm(
    verificationCode: string
  ): Promise<externs.UserCredential<externs.PhoneAuthCredential>> {
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
    verifier._reset();
  }
}
