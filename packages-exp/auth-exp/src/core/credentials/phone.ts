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

import { PhoneOrOauthTokenResponse } from '../../api/authentication/mfa';
import {
  linkWithPhoneNumber,
  signInWithPhoneNumber,
  SignInWithPhoneNumberRequest,
  verifyPhoneNumberForExisting
} from '../../api/authentication/sms';
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { AuthCredential } from './auth_credential';

export interface PhoneAuthCredentialParameters {
  verificationId?: string;
  verificationCode?: string;
  phoneNumber?: string;
  temporaryProof?: string;
}

export class PhoneAuthCredential
  extends AuthCredential
  implements externs.PhoneAuthCredential {
  private constructor(private readonly params: PhoneAuthCredentialParameters) {
    super(externs.ProviderId.PHONE, externs.SignInMethod.PHONE);
  }

  static _fromVerification(
    verificationId: string,
    verificationCode: string
  ): PhoneAuthCredential {
    return new PhoneAuthCredential({ verificationId, verificationCode });
  }

  static _fromTokenResponse(
    phoneNumber: string,
    temporaryProof: string
  ): PhoneAuthCredential {
    return new PhoneAuthCredential({ phoneNumber, temporaryProof });
  }

  _getIdTokenResponse(auth: Auth): Promise<PhoneOrOauthTokenResponse> {
    return signInWithPhoneNumber(auth, this._makeVerificationRequest());
  }

  _linkToIdToken(auth: Auth, idToken: string): Promise<IdTokenResponse> {
    return linkWithPhoneNumber(auth, {
      idToken,
      ...this._makeVerificationRequest()
    });
  }

  _getReauthenticationResolver(auth: Auth): Promise<IdTokenResponse> {
    return verifyPhoneNumberForExisting(auth, this._makeVerificationRequest());
  }

  _makeVerificationRequest(): SignInWithPhoneNumberRequest {
    const {
      temporaryProof,
      phoneNumber,
      verificationId,
      verificationCode
    } = this.params;
    if (temporaryProof && phoneNumber) {
      return { temporaryProof, phoneNumber };
    }

    return {
      sessionInfo: verificationId,
      code: verificationCode
    };
  }

  toJSON(): object {
    const obj: Record<string, string> = {
      providerId: this.providerId
    };
    if (this.params.phoneNumber) {
      obj.phoneNumber = this.params.phoneNumber;
    }
    if (this.params.temporaryProof) {
      obj.temporaryProof = this.params.temporaryProof;
    }
    if (this.params.verificationCode) {
      obj.verificationCode = this.params.verificationCode;
    }
    if (this.params.verificationId) {
      obj.verificationId = this.params.verificationId;
    }

    return obj;
  }

  static fromJSON(json: object | string): PhoneAuthCredential | null {
    if (typeof json === 'string') {
      json = JSON.parse(json);
    }

    const {
      verificationId,
      verificationCode,
      phoneNumber,
      temporaryProof
    } = json as { [key: string]: string };
    if (
      !verificationCode &&
      !verificationId &&
      !phoneNumber &&
      !temporaryProof
    ) {
      return null;
    }

    return new PhoneAuthCredential({
      verificationId,
      verificationCode,
      phoneNumber,
      temporaryProof
    });
  }
}
