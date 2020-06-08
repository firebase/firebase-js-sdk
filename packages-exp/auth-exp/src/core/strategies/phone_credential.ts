import * as externs from '@firebase/auth-types-exp';

import { PhoneOrOauthTokenResponse } from '../../api/authentication/mfa';
import { signInWithPhoneNumber, SignInWithPhoneNumberRequest } from '../../api/authentication/sms';
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { debugFail } from '../util/assert';

export interface PhoneAuthCredentialParameters {
  verificationId?: string;
  verificationCode?: string;
  phoneNumber?: string;
  temporaryProof?: string;
}

export class PhoneAuthCredential implements externs.AuthCredential {
  readonly providerId = externs.ProviderId.PHONE;
  readonly signInMethod = externs.SignInMethod.PHONE;

  constructor(private readonly params: PhoneAuthCredentialParameters) {}

  _getIdTokenResponse(auth: Auth): Promise<PhoneOrOauthTokenResponse> {
    return signInWithPhoneNumber(auth, this.makeVerificationRequest());
  }

  _linkToIdToken(auth: Auth, idToken: string): Promise<IdTokenResponse> {
    void auth;
    void idToken;
    return debugFail('not implemented');
  }
  
  _matchIdTokenWithUid(auth: Auth, uid: string): Promise<IdTokenResponse> {
    void auth;
    void uid;
    return debugFail('not implemented');
  }

  private makeVerificationRequest(): SignInWithPhoneNumberRequest {
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

  static fromJSON(json: string | object): externs.AuthCredential | null {
    if (typeof json === 'string') {
      json = JSON.parse(json);
    }

    const {verificationId, verificationCode, phoneNumber, temporaryProof} = json as {[key: string]: string};
    if (!verificationCode && !verificationId && !phoneNumber && !temporaryProof) {
      return null;
    }

    return new PhoneAuthCredential({
      verificationId,
      verificationCode,
      phoneNumber,
      temporaryProof,
    });
  }
}