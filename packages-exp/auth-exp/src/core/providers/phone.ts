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

import { FirebaseError } from '@firebase/util';
import { Auth } from '../../model/auth';
import { initializeAuth } from '../auth/auth_impl';
import { PhoneAuthCredential } from '../credentials/phone';
import { _verifyPhoneNumber } from '../strategies/phone';
import { debugFail } from '../util/assert';

export class PhoneAuthProvider implements externs.AuthProvider {
  static readonly PROVIDER_ID = externs.ProviderId.PHONE;
  static readonly PHONE_SIGN_IN_METHOD = externs.SignInMethod.PHONE;

  private readonly auth: Auth;
  readonly providerId = PhoneAuthProvider.PROVIDER_ID;

  constructor(auth?: externs.Auth | null) {
    this.auth = (auth || initializeAuth()) as Auth;
  }

  verifyPhoneNumber(
    phoneNumber: string,
    applicationVerifier: externs.ApplicationVerifier
    /* multiFactorSession?: MultiFactorSession, */
  ): Promise<string> {
    return _verifyPhoneNumber(this.auth, phoneNumber, applicationVerifier);
  }

  static credential(
    verificationId: string,
    verificationCode: string
  ): PhoneAuthCredential {
    return new PhoneAuthCredential({ verificationId, verificationCode });
  }

  static credentialFromResult(
    userCredential: externs.UserCredential
  ): externs.AuthCredential | null {
    void userCredential;
    return debugFail('not implemented');
  }

  static credentialFromError(
    error: FirebaseError
  ): externs.AuthCredential | null {
    void error;
    return debugFail('not implemented');
  }

  static credentialFromJSON(json: string | object): externs.AuthCredential {
    void json;
    return debugFail('not implemented');
  }
}
