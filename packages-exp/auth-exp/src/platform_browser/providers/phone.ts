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
// eslint-disable-next-line import/no-extraneous-dependencies
import { FirebaseError } from '@firebase/util';

import { SignInWithPhoneNumberResponse } from '../../api/authentication/sms';
import { AuthImplCompat } from '../../core/auth/auth_impl';
import { PhoneAuthCredential } from '../../core/credentials/phone';
import { AuthErrorCode } from '../../core/errors';
import { assert, assertTypes, debugFail, fail } from '../../core/util/assert';
import { ApplicationVerifier } from '../../model/application_verifier';
import { AuthCore } from '../../model/auth';
import { TaggedWithTokenResponse } from '../../model/id_token';
import { UserCredential } from '../../model/user';
import { RecaptchaVerifier } from '../recaptcha/recaptcha_verifier';
import { _verifyPhoneNumber } from '../strategies/phone';

export class PhoneAuthProvider implements externs.PhoneAuthProvider {
  static readonly PROVIDER_ID = externs.ProviderId.PHONE;
  static readonly PHONE_SIGN_IN_METHOD = externs.SignInMethod.PHONE;

  readonly providerId = PhoneAuthProvider.PROVIDER_ID;

  constructor(private readonly auth: AuthCore) {
    assertTypes(arguments, AuthImplCompat);
  }

  verifyPhoneNumber(
    phoneOptions: externs.PhoneInfoOptions | string,
    applicationVerifier: externs.ApplicationVerifier
  ): Promise<string> {
    assertTypes(arguments, 'string|object', RecaptchaVerifier);
    return _verifyPhoneNumber(
      this.auth,
      phoneOptions,
      applicationVerifier as ApplicationVerifier
    );
  }

  static credential(
    verificationId: string,
    verificationCode: string
  ): PhoneAuthCredential {
    assertTypes(arguments, 'string', 'string');
    return PhoneAuthCredential._fromVerification(
      verificationId,
      verificationCode
    );
  }

  static credentialFromResult(
    userCredential: externs.UserCredential
  ): externs.AuthCredential | null {
    assertTypes(arguments, { _tokenResponse: 'object' });
    return PhoneAuthProvider.credentialFromTaggedObject(
      userCredential as TaggedWithTokenResponse
    );
  }

  static credentialFromError(
    error: FirebaseError
  ): externs.AuthCredential | null {
    assertTypes(arguments, { _tokenResponse: 'object' });
    return PhoneAuthProvider.credentialFromTaggedObject(
      error as TaggedWithTokenResponse
    );
  }

  private static credentialFromTaggedObject(
    result: TaggedWithTokenResponse
  ): externs.AuthCredential | null {
    const {
      phoneNumber,
      temporaryProof
    } = result._tokenResponse as SignInWithPhoneNumberResponse;
    if (phoneNumber && temporaryProof) {
      return PhoneAuthCredential._fromTokenResponse(
        phoneNumber,
        temporaryProof
      );
    }

    return null;
  }

  static _credentialFromJSON(json: string | object): externs.AuthCredential {
    void json;
    return debugFail('not implemented');
  }
}
