import * as externs from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import { Auth } from '../../model/auth';
import { initializeAuth } from '../auth/auth_impl';
import { _verifyPhoneNumber } from '../strategies/phone';
import { PhoneAuthCredential } from '../strategies/phone_credential';
import { debugFail } from '../util/assert';

export class PhoneAuthProvider implements externs.AuthProvider {
  static readonly PROVIDER_ID = externs.ProviderId.PHONE;
  static readonly PHONE_SIGN_IN_METHOD = externs.SignInMethod.PHONE;

  private readonly auth: Auth;
  readonly providerId = PhoneAuthProvider.PROVIDER_ID;

  constructor(auth?: externs.Auth | null) {
    this.auth = (auth || initializeAuth()) as Auth;
  }

  verifyPhoneNumber(
    phoneNumber: string,
    applicationVerifier: externs.ApplicationVerifier,
    /* multiFactorSession?: MultiFactorSession, */
   ): Promise<string> {
     return _verifyPhoneNumber(this.auth, phoneNumber, applicationVerifier);
   }

  static credential(
   verificationId: string,
   verificationCode: string
  ): PhoneAuthCredential {
    return new PhoneAuthCredential({verificationId, verificationCode});
  }

  static credentialFromResult(
     userCredential: externs.UserCredential): externs.AuthCredential | null {
    void userCredential;
    return debugFail('not implemented');
  }

  static credentialFromError(error: FirebaseError): externs.AuthCredential | null {
    void error;
    return debugFail('not implemented');
  }

  static credentialFromJSON(json: string|object): externs.AuthCredential {
    void json;
    return debugFail('not implemented');
  }
}