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
import {
  signInWithCredential,
  linkWithCredential,
  reauthenticateWithCredential
} from './auth_credential';
import { User } from '../../model/user';
import { checkIfAlreadyLinked } from '.';
import { ProviderId } from '../providers';
import { verifyPhoneNumberForExisting } from '../../api/authentication';
import { verifyTokenResponseUid } from '../../model/id_token';

export async function signInWithPhoneNumber(
  auth: Auth,
  phoneNumber: string,
  appVerifier: ApplicationVerifier
): Promise<ConfirmationResult> {
  const verificationId = await getVerificationId_(
    auth,
    phoneNumber,
    appVerifier
  );
  return new ConfirmationResult(verificationId, cred =>
    signInWithCredential(auth, cred)
  );
}

export async function linkWithPhoneNumber(
  auth: Auth,
  user: User,
  phoneNumber: string,
  appVerifier: ApplicationVerifier
): Promise<ConfirmationResult> {
  checkIfAlreadyLinked(auth, user, ProviderId.PHONE);
  const verificationId = await getVerificationId_(
    auth,
    phoneNumber,
    appVerifier
  );
  return new ConfirmationResult(verificationId, cred =>
    linkWithCredential(auth, user, cred)
  );
}

export async function reauthenticateWithPhoneNumber(
  auth: Auth,
  user: User,
  phoneNumber: string,
  appVerifier: ApplicationVerifier
): Promise<ConfirmationResult> {
  const verificationId = await getVerificationId_(
    auth,
    phoneNumber,
    appVerifier
  );
  // This maps to matchIdTokenWithUid
  return new ConfirmationResult(verificationId, cred => {
    return reauthenticateWithCredential(auth, user, cred);
  });
}

function getVerificationId_(
  auth: Auth,
  phoneNumber: string,
  appVerifier: ApplicationVerifier
): Promise<string> {
  return new PhoneAuthProvider(auth).verifyPhoneNumber(
    phoneNumber,
    appVerifier
  );
}

// function
