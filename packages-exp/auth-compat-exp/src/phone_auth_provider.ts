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

import * as impl from '@firebase/auth-exp/internal';
import * as compat from '@firebase/auth-types';
import * as externs from '@firebase/auth-types-exp';
import firebase from '@firebase/app-compat';
import { unwrap, Wrapper } from './wrap';

export class PhoneAuthProvider
  implements compat.PhoneAuthProvider, Wrapper<externs.PhoneAuthProvider> {
  providerId = 'phone';
  private readonly phoneProvider: impl.PhoneAuthProvider;

  static PHONE_SIGN_IN_METHOD = impl.PhoneAuthProvider.PHONE_SIGN_IN_METHOD;
  static PROVIDER_ID = impl.PhoneAuthProvider.PROVIDER_ID;

  static credential(
    verificationId: string,
    verificationCode: string
  ): compat.AuthCredential {
    return impl.PhoneAuthProvider.credential(verificationId, verificationCode);
  }

  constructor() {
    this.phoneProvider = new impl.PhoneAuthProvider(unwrap(firebase.auth!()));
  }

  verifyPhoneNumber(
    phoneInfoOptions:
      | string
      | compat.PhoneSingleFactorInfoOptions
      | compat.PhoneMultiFactorEnrollInfoOptions
      | compat.PhoneMultiFactorSignInInfoOptions,
    applicationVerifier: compat.ApplicationVerifier
  ): Promise<string> {
    return this.phoneProvider.verifyPhoneNumber(
      // The implementation matches but the types are subtly incompatible
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      phoneInfoOptions as any,
      unwrap(applicationVerifier)
    );
  }

  unwrap(): externs.PhoneAuthProvider {
    return this.phoneProvider;
  }
}
