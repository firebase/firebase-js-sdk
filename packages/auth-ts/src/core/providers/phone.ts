/**
 * @license
 * Copyright 2019 Google Inc.
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

import { AuthProvider, ProviderId, SignInMethod } from '../providers';
import { AuthCredential } from '../strategies/auth_credential';
import { UserCredential } from '../../model/user_credential';
import { AuthErrorCode } from '../errors';
import { Auth } from '../../model/auth';
import { ApplicationVerifier } from '../../model/application_verifier';
import { MultiFactorSession } from '../../model/multifactor';
import { initializeAuth } from '../initialize_auth';
import { sendPhoneVerificationCode } from '../../api/authentication';

export class PhoneAuthProvider implements AuthProvider {
  static readonly PROVIDER_ID = ProviderId.PHONE;
  static readonly PHONE_SIGN_IN_METHOD = SignInMethod.PHONE;
  static credential(
    verificationId: string,
    verificationCode: string
  ): AuthCredential {
    throw new Error('not implemented');
  }
  static credentialFromResult(
    userCredential: UserCredential
  ): AuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromError(error: AuthErrorCode): AuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromJSON(json: object): AuthCredential {
    throw new Error('not implemented');
  }
  
  readonly auth: Auth;
  readonly providerId: ProviderId = PhoneAuthProvider.PROVIDER_ID;
  constructor(auth?: Auth | null) {
    // This is what the current SDK does but perhaps it's worth revisiting
    this.auth = auth || initializeAuth();
  }

  async verifyPhoneNumber(
    phoneNumber: string,
    applicationVerifier: ApplicationVerifier,
    multiFactorSession?: MultiFactorSession
  ): Promise<string> {
    throw new Error('not implemented');
    // const 
    // const response = await sendPhoneVerificationCode(this.auth, {})
  }
}
