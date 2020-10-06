import * as impl from '@firebase/auth-exp/internal';
import * as compat from '@firebase/auth-types';
import * as externs from '@firebase/auth-types-exp';
import firebase from '@firebase/app-compat';
import { unwrap, Wrapper } from './wrap';

export class PhoneAuthProvider implements compat.PhoneAuthProvider, Wrapper<externs.PhoneAuthProvider> {
  providerId = 'phone';
  private readonly phoneProvider: impl.PhoneAuthProvider;

  static PHONE_SIGN_IN_METHOD = impl.PhoneAuthProvider.PHONE_SIGN_IN_METHOD;
  static PROVIDER_ID = impl.PhoneAuthProvider.PROVIDER_ID;

  static credential ( verificationId :  string ,  verificationCode :  string ) : compat.AuthCredential {
    return impl.PhoneAuthProvider.credential(verificationId, verificationCode);
  }

  constructor() {
    this.phoneProvider = new impl.PhoneAuthProvider(unwrap(firebase.auth!()));
  }

  verifyPhoneNumber(phoneInfoOptions: string | compat.PhoneSingleFactorInfoOptions | compat.PhoneMultiFactorEnrollInfoOptions | compat.PhoneMultiFactorSignInInfoOptions, applicationVerifier: compat.ApplicationVerifier): Promise<string> {
    // The implementation matches but the types are subtly incompatible
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.phoneProvider.verifyPhoneNumber(phoneInfoOptions as any, unwrap(applicationVerifier));
  }

  unwrap(): externs.PhoneAuthProvider {
    return this.phoneProvider;
  }
}