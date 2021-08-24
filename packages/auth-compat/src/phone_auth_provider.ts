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

import * as exp from '@firebase/auth/internal';
import * as compat from '@firebase/auth-types';
import firebase from '@firebase/app-compat';
import { Compat } from '@firebase/util';
import { unwrap } from './wrap';

export class PhoneAuthProvider
  implements compat.PhoneAuthProvider, Compat<exp.PhoneAuthProvider>
{
  providerId = 'phone';
  readonly _delegate: exp.PhoneAuthProvider;

  static PHONE_SIGN_IN_METHOD = exp.PhoneAuthProvider.PHONE_SIGN_IN_METHOD;
  static PROVIDER_ID = exp.PhoneAuthProvider.PROVIDER_ID;

  static credential(
    verificationId: string,
    verificationCode: string
  ): compat.AuthCredential {
    return exp.PhoneAuthProvider.credential(verificationId, verificationCode);
  }

  constructor() {
    // TODO: remove ts-ignore when moving types from auth-types to auth-compat
    // @ts-ignore
    this._delegate = new exp.PhoneAuthProvider(unwrap(firebase.auth!()));
  }

  verifyPhoneNumber(
    phoneInfoOptions:
      | string
      | compat.PhoneSingleFactorInfoOptions
      | compat.PhoneMultiFactorEnrollInfoOptions
      | compat.PhoneMultiFactorSignInInfoOptions,
    applicationVerifier: compat.ApplicationVerifier
  ): Promise<string> {
    return this._delegate.verifyPhoneNumber(
      // The implementation matches but the types are subtly incompatible
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      phoneInfoOptions as any,
      applicationVerifier
    );
  }

  unwrap(): exp.PhoneAuthProvider {
    return this._delegate;
  }
}
