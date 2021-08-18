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

import { ProviderId, SignInMethod } from '../../model/enums';

import { PhoneOrOauthTokenResponse } from '../../api/authentication/mfa';
import {
  linkWithPhoneNumber,
  signInWithPhoneNumber,
  SignInWithPhoneNumberRequest,
  verifyPhoneNumberForExisting
} from '../../api/authentication/sms';
import { AuthInternal } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { AuthCredential } from './auth_credential';

export interface PhoneAuthCredentialParameters {
  verificationId?: string;
  verificationCode?: string;
  phoneNumber?: string;
  temporaryProof?: string;
}

/**
 * Represents the credentials returned by {@link PhoneAuthProvider}.
 *
 * @public
 */
export class PhoneAuthCredential extends AuthCredential {
  private constructor(private readonly params: PhoneAuthCredentialParameters) {
    super(ProviderId.PHONE, SignInMethod.PHONE);
  }

  /** @internal */
  static _fromVerification(
    verificationId: string,
    verificationCode: string
  ): PhoneAuthCredential {
    return new PhoneAuthCredential({ verificationId, verificationCode });
  }

  /** @internal */
  static _fromTokenResponse(
    phoneNumber: string,
    temporaryProof: string
  ): PhoneAuthCredential {
    return new PhoneAuthCredential({ phoneNumber, temporaryProof });
  }

  /** @internal */
  _getIdTokenResponse(auth: AuthInternal): Promise<PhoneOrOauthTokenResponse> {
    return signInWithPhoneNumber(auth, this._makeVerificationRequest());
  }

  /** @internal */
  _linkToIdToken(
    auth: AuthInternal,
    idToken: string
  ): Promise<IdTokenResponse> {
    return linkWithPhoneNumber(auth, {
      idToken,
      ...this._makeVerificationRequest()
    });
  }

  /** @internal */
  _getReauthenticationResolver(auth: AuthInternal): Promise<IdTokenResponse> {
    return verifyPhoneNumberForExisting(auth, this._makeVerificationRequest());
  }

  /** @internal */
  _makeVerificationRequest(): SignInWithPhoneNumberRequest {
    const { temporaryProof, phoneNumber, verificationId, verificationCode } =
      this.params;
    if (temporaryProof && phoneNumber) {
      return { temporaryProof, phoneNumber };
    }

    return {
      sessionInfo: verificationId,
      code: verificationCode
    };
  }

  /** {@inheritdoc AuthCredential.toJSON} */
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

  /** Generates a phone credential based on a plain object or a JSON string. */
  static fromJSON(json: object | string): PhoneAuthCredential | null {
    if (typeof json === 'string') {
      json = JSON.parse(json);
    }

    const { verificationId, verificationCode, phoneNumber, temporaryProof } =
      json as { [key: string]: string };
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
