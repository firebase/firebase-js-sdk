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
import { UserCredential } from '../../model/user_credential';
import { AuthErrorCode, AUTH_ERROR_FACTORY } from '../errors';
import { Auth } from '../../model/auth';
import { ApplicationVerifier } from '../../model/application_verifier';
import {
  MultiFactorSession,
  MultiFactorSessionType,
  MultiFactorInfo
} from '../../model/multi_factor';
import { initializeAuth } from '../initialize_auth';
import {
  sendPhoneVerificationCode,
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  verifyPhoneNumberForExisting,
  StartPhoneMfaSignInRequest,
  startSignInPhoneMfa
} from '../../api/authentication';
import { RECAPTCHA_VERIFIER_TYPE } from '../../platform_browser/recaptcha_verifier';
import { IdTokenResponse, verifyTokenResponseUid } from '../../model/id_token';
import { AuthCredential } from '../../model/auth_credential';
import {
  StartPhoneMfaEnrollmentRequest,
  startEnrollPhoneMfa
} from '../../api/account_management';

export interface PhoneInfoOptions {
  phoneNumber: string;
  session?: MultiFactorSession;
  multiFactorHint?: MultiFactorInfo;
}

export class PhoneAuthProvider implements AuthProvider {
  static readonly PROVIDER_ID = ProviderId.PHONE;
  static readonly PHONE_SIGN_IN_METHOD = SignInMethod.PHONE;
  static credential(
    verificationId: string,
    verificationCode: string
  ): PhoneAuthCredential {
    return new PhoneAuthCredential({ verificationId, verificationCode });
  }
  static credentialFromProof(
    temporaryProof: string,
    phoneNumber: string
  ): AuthCredential {
    return new PhoneAuthCredential({ temporaryProof, phoneNumber });
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
    options: PhoneInfoOptions | string,
    applicationVerifier: ApplicationVerifier
  ): Promise<string> {
    const recaptchaToken = await applicationVerifier.verify();
    if (typeof recaptchaToken !== 'string') {
      throw AUTH_ERROR_FACTORY.create(AuthErrorCode.ARGUMENT_ERROR, {
        appName: this.auth.name
      });
    }

    if (applicationVerifier.type !== RECAPTCHA_VERIFIER_TYPE) {
      throw AUTH_ERROR_FACTORY.create(AuthErrorCode.ARGUMENT_ERROR, {
        appName: this.auth.name
      });
    }

    try {
      let phoneNumber: string;
      let session: MultiFactorSession | undefined;
      let multiFactorHint: MultiFactorInfo | undefined;
      if (typeof options === 'string') {
        phoneNumber = options;
      } else {
        phoneNumber = options.phoneNumber;
        session = options.session;
        multiFactorHint = options.multiFactorHint;
      }

      // Try MFA methods first
      if (session?.type === MultiFactorSessionType.ENROLL) {
        const request: StartPhoneMfaEnrollmentRequest = {
          idToken: session.rawSession,
          phoneEnrollmentInfo: {
            phoneNumber,
            recaptchaToken
          }
        };

        return (await startEnrollPhoneMfa(this.auth, request)).phoneSessionInfo
          .sessionInfo;
      } else if (session?.type === MultiFactorSessionType.SIGN_IN) {
        if (!multiFactorHint) {
          throw AUTH_ERROR_FACTORY.create(AuthErrorCode.ARGUMENT_ERROR, {
            appName: this.auth.name
          });
        }

        const request: StartPhoneMfaSignInRequest = {
          mfaPendingCredential: session.rawSession,
          mfaEnrollmentId: multiFactorHint.uid,
          phoneSignInInfo: {
            recaptchaToken
          }
        };
        return (await startSignInPhoneMfa(this.auth, request)).phoneResponseInfo
          .sessionInfo;
      }

      // If we're here, it's simple good old-fashioned phone sign in
      return (
        await sendPhoneVerificationCode(this.auth, {
          phoneNumber,
          recaptchaToken
        })
      ).sessionInfo;
    } finally {
      applicationVerifier.reset();
    }
  }
}

export interface PhoneAuthCredentialParameters {
  verificationId?: string;
  verificationCode?: string;
  phoneNumber?: string;
  temporaryProof?: string;
}

export class PhoneAuthCredential implements AuthCredential {
  readonly providerId = ProviderId.PHONE;
  readonly signInMethod = SignInMethod.PHONE;

  constructor(private readonly params: PhoneAuthCredentialParameters) {}

  toJSON(): object {
    const obj: { [key: string]: string } = {
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

  getIdTokenResponse_(auth: Auth): Promise<IdTokenResponse> {
    return signInWithPhoneNumber(auth, this.makeVerificationRequest());
  }

  linkToIdToken_(auth: Auth, idToken: string): Promise<IdTokenResponse> {
    return linkWithPhoneNumber(auth, {
      idToken,
      ...this.makeVerificationRequest()
    });
  }

  matchIdTokenWithUid_(auth: Auth, uid: string): Promise<IdTokenResponse> {
    const verifyRequest = this.makeVerificationRequest();
    const idTokenResolver = verifyPhoneNumberForExisting(auth, verifyRequest);
    return verifyTokenResponseUid(idTokenResolver, uid, auth.name);
  }

  makeVerificationRequest() {
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
}
