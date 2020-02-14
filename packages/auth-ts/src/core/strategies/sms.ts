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

import { Auth } from '../../model/auth';
import { ApplicationVerifier } from '../../model/application_verifier';
import { ConfirmationResult } from '../../model/confirmation_result';
import { PhoneAuthProvider } from '../providers/phone';

export async function signInWithPhoneNumber(
    auth: Auth, phoneNumber: string, appVerifier: ApplicationVerifier): Promise<ConfirmationResult> {
  const provider = new PhoneAuthProvider(auth);
  const verificationId = await provider.verifyPhoneNumber(phoneNumber, appVerifier);
  return new ConfirmationResult(verificationId, auth);
}