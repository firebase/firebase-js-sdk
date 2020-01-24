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

import { AuthProvider } from '.';
import { AuthCredential } from '../../model/auth_credential';
import { UserCredential } from '../../model/user_credential';
import { AuthError } from '../errors';
import { Auth } from '../../model/auth';
import { ApplicationVerifier } from '../../model/application_verifier';
import { MultiFactorSession } from '../../model/multifactor';

export class PhoneAuthProvider implements AuthProvider {
  static readonly PROVIDER_ID: string;
  static readonly PHONE_SIGN_IN_METHOD: string;
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
  static credentialFromError(error: AuthError): AuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromJSON(json: object): AuthCredential {
    throw new Error('not implemented');
  }
  constructor(auth?: Auth | null) {
    throw new Error('not implemented');
  }
  readonly providerId: string = 'phone';
  verifyPhoneNumber(
    phoneNumber: string,
    applicationVerifier: ApplicationVerifier,
    multiFactorSession?: MultiFactorSession
  ): Promise<string> {
    throw new Error('not implemented');
  }
}
