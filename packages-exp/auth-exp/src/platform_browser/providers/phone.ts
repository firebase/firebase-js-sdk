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
  Auth,
  PhoneAuthProvider as PhoneAuthProviderType,
  PhoneInfoOptions,
  ProviderId,
  SignInMethod,
  ApplicationVerifier,
  UserCredential,
  AuthCredential
} from '../../model/public_types';

import { SignInWithPhoneNumberResponse } from '../../api/authentication/sms';
import { ApplicationVerifierInternal as ApplicationVerifierInternal } from '../../model/application_verifier';
import { AuthInternal as AuthInternal } from '../../model/auth';
import { UserCredentialInternal as UserCredentialInternal } from '../../model/user';
import { PhoneAuthCredentialImpl } from '../../core/credentials/phone';
import { AuthErrorCode } from '../../core/errors';
import { _verifyPhoneNumber } from '../strategies/phone';
import { _assert, _fail } from '../../core/util/assert';
import { _castAuth } from '../../core/auth/auth_impl';

/**
 * {@inheritdoc @firebase/auth-types#PhoneAuthProvider}
 * @public
 */
export class PhoneAuthProvider implements PhoneAuthProviderType {
  /** {@inheritdoc @firebase/auth-types#PhoneAuthProvider.PROVIDER_ID} */
  static readonly PROVIDER_ID = ProviderId.PHONE;
  /** {@inheritdoc @firebase/auth-types#PhoneAuthProvider.PHONE_SIGN_IN_METHOD} */
  static readonly PHONE_SIGN_IN_METHOD = SignInMethod.PHONE;

  /** {@inheritdoc @firebase/auth-types#PhoneAuthProvider.providerId} */
  readonly providerId = PhoneAuthProvider.PROVIDER_ID;
  private readonly auth: AuthInternal;

  constructor(auth: Auth) {
    this.auth = _castAuth(auth);
  }

  /** {@inheritdoc @firebase/auth-types#PhoneAuthProvider.verifyPhoneNumber} */
  verifyPhoneNumber(
    phoneOptions: PhoneInfoOptions | string,
    applicationVerifier: ApplicationVerifier
  ): Promise<string> {
    return _verifyPhoneNumber(
      this.auth,
      phoneOptions,
      applicationVerifier as ApplicationVerifierInternal
    );
  }

  /** {@inheritdoc @firebase/auth-types#PhoneAuthProvider.credential} */
  static credential(
    verificationId: string,
    verificationCode: string
  ): PhoneAuthCredentialImpl {
    return PhoneAuthCredentialImpl._fromVerification(
      verificationId,
      verificationCode
    );
  }

  static credentialFromResult(
    userCredential: UserCredential
  ): AuthCredential | null {
    const credential = userCredential as UserCredentialInternal;
    _assert(
      credential._tokenResponse,
      credential.user.auth,
      AuthErrorCode.ARGUMENT_ERROR
    );
    const {
      phoneNumber,
      temporaryProof
    } = credential._tokenResponse as SignInWithPhoneNumberResponse;
    if (phoneNumber && temporaryProof) {
      return PhoneAuthCredentialImpl._fromTokenResponse(
        phoneNumber,
        temporaryProof
      );
    }

    _fail(credential.user.auth, AuthErrorCode.ARGUMENT_ERROR);
  }
}
