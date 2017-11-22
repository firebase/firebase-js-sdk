import { FirebaseApp, FirebaseNamespace } from "@firebase/app-types";
import { Observer, Unsubscribe } from "@firebase/util";

export interface User extends UserInfo {
  delete(): Promise<any>;
  emailVerified: boolean;
  getIdToken(forceRefresh?: boolean): Promise<any>;
  getToken(forceRefresh?: boolean): Promise<any>;
  isAnonymous: boolean;
  linkAndRetrieveDataWithCredential(
    credential: AuthCredential
  ): Promise<any>;
  linkWithCredential(credential: AuthCredential): Promise<any>;
  linkWithPhoneNumber(
    phoneNumber: string,
    applicationVerifier: ApplicationVerifier
  ): Promise<any>;
  linkWithPopup(provider: AuthProvider): Promise<any>;
  linkWithRedirect(provider: AuthProvider): Promise<any>;
  metadata: UserMetadata;
  phoneNumber: string | null;
  providerData: (UserInfo | null)[];
  reauthenticateAndRetrieveDataWithCredential(
    credential: AuthCredential
  ): Promise<any>;
  reauthenticateWithCredential(
    credential: AuthCredential
  ): Promise<any>;
  reauthenticateWithPhoneNumber(
    phoneNumber: string,
    applicationVerifier: ApplicationVerifier
  ): Promise<any>;
  reauthenticateWithPopup(provider: AuthProvider): Promise<any>;
  reauthenticateWithRedirect(
    provider: AuthProvider
  ): Promise<any>;
  refreshToken: string;
  reload(): Promise<any>;
  sendEmailVerification(
    actionCodeSettings?: ActionCodeSettings | null
  ): Promise<any>;
  toJSON(): Object;
  unlink(providerId: string): Promise<any>;
  updateEmail(newEmail: string): Promise<any>;
  updatePassword(newPassword: string): Promise<any>;
  updatePhoneNumber(
    phoneCredential: AuthCredential
  ): Promise<any>;
  updateProfile(profile: {
    displayName: string | null;
    photoURL: string | null;
  }): Promise<any>;
}

export interface UserInfo {
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  providerId: string;
  uid: string;
}

export interface ActionCodeInfo { }

export type ActionCodeSettings = {
  android?: {
    installApp?: boolean;
    minimumVersion?: string;
    packageName: string;
  };
  handleCodeInApp?: boolean;
  iOS?: { bundleId: string };
  url: string;
};

export type AdditionalUserInfo = {
  isNewUser: boolean;
  profile: Object | null;
  providerId: string;
  username?: string | null;
};

export interface ApplicationVerifier {
  type: string;
  verify(): Promise<any>;
}

export interface AuthCredential {
  providerId: string;
}

export interface AuthProvider {
  providerId: string;
}

export interface ConfirmationResult {
  confirm(verificationCode: string): Promise<any>;
  verificationId: string;
}

export class EmailAuthProvider extends EmailAuthProvider_Instance {
  static PROVIDER_ID: string;
  static credential(
    email: string,
    password: string
  ): AuthCredential;
}
export class EmailAuthProvider_Instance implements AuthProvider {
  providerId: string;
}

export interface Error {
  code: string;
  message: string;
}

export class FacebookAuthProvider extends FacebookAuthProvider_Instance {
  static PROVIDER_ID: string;
  static credential(token: string): AuthCredential;
}
export class FacebookAuthProvider_Instance implements AuthProvider {
  addScope(scope: string): AuthProvider;
  providerId: string;
  setCustomParameters(
    customOAuthParameters: Object
  ): AuthProvider;
}

export class GithubAuthProvider extends GithubAuthProvider_Instance {
  static PROVIDER_ID: string;
  static credential(token: string): AuthCredential;
}
export class GithubAuthProvider_Instance implements AuthProvider {
  addScope(scope: string): AuthProvider;
  providerId: string;
  setCustomParameters(
    customOAuthParameters: Object
  ): AuthProvider;
}

export class GoogleAuthProvider extends GoogleAuthProvider_Instance {
  static PROVIDER_ID: string;
  static credential(
    idToken?: string | null,
    accessToken?: string | null
  ): AuthCredential;
}
export class GoogleAuthProvider_Instance implements AuthProvider {
  addScope(scope: string): AuthProvider;
  providerId: string;
  setCustomParameters(
    customOAuthParameters: Object
  ): AuthProvider;
}

export class PhoneAuthProvider extends PhoneAuthProvider_Instance {
  static PROVIDER_ID: string;
  static credential(
    verificationId: string,
    verificationCode: string
  ): AuthCredential;
}
export class PhoneAuthProvider_Instance implements AuthProvider {
  constructor(auth?: FirebaseAuth | null);
  providerId: string;
  verifyPhoneNumber(
    phoneNumber: string,
    applicationVerifier: ApplicationVerifier
  ): Promise<any>;
}

export class RecaptchaVerifier extends RecaptchaVerifier_Instance { }
export class RecaptchaVerifier_Instance
  implements ApplicationVerifier {
  constructor(
    container: any | string,
    parameters?: Object | null,
    app?: FirebaseApp | null
  );
  clear(): any;
  render(): Promise<any>;
  type: string;
  verify(): Promise<any>;
}

export class TwitterAuthProvider extends TwitterAuthProvider_Instance {
  static PROVIDER_ID: string;
  static credential(
    token: string,
    secret: string
  ): AuthCredential;
}
export class TwitterAuthProvider_Instance implements AuthProvider {
  providerId: string;
  setCustomParameters(
    customOAuthParameters: Object
  ): AuthProvider;
}

export type UserCredential = {
  additionalUserInfo?: AdditionalUserInfo | null;
  credential: AuthCredential | null;
  operationType?: string | null;
  user: User | null;
};

export interface UserMetadata {
  creationTime?: string;
  lastSignInTime?: string;
}

export type Persistence = string;

export class FirebaseAuth {
  constructor();

  app: FirebaseApp;
  applyActionCode(code: string): Promise<any>;
  checkActionCode(code: string): Promise<any>;
  confirmPasswordReset(code: string, newPassword: string): Promise<any>;
  createUserWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<any>;
  currentUser: User | null;
  fetchProvidersForEmail(email: string): Promise<any>;
  getRedirectResult(): Promise<any>;
  languageCode: string | null;
  onAuthStateChanged(
    nextOrObserver:
      | Observer<any, any>
      | ((a: User | null) => any),
    error?: (a: Error) => any,
    completed?: Unsubscribe
  ): Unsubscribe;
  onIdTokenChanged(
    nextOrObserver:
      | Observer<any, any>
      | ((a: User | null) => any),
    error?: (a: Error) => any,
    completed?: Unsubscribe
  ): Unsubscribe;
  sendPasswordResetEmail(
    email: string,
    actionCodeSettings?: ActionCodeSettings | null
  ): Promise<any>;
  setPersistence(persistence: Persistence): Promise<any>;
  signInAndRetrieveDataWithCredential(
    credential: AuthCredential
  ): Promise<any>;
  signInAnonymously(): Promise<any>;
  signInWithCredential(
    credential: AuthCredential
  ): Promise<any>;
  signInWithCustomToken(token: string): Promise<any>;
  signInWithEmailAndPassword(email: string, password: string): Promise<any>;
  signInWithPhoneNumber(
    phoneNumber: string,
    applicationVerifier: ApplicationVerifier
  ): Promise<any>;
  signInWithPopup(provider: AuthProvider): Promise<any>;
  signInWithRedirect(provider: AuthProvider): Promise<any>;
  signOut(): Promise<any>;
  useDeviceLanguage(): any;
  verifyPasswordResetCode(code: string): Promise<any>;
}

declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    auth?: {
      (app?: FirebaseApp): FirebaseAuth;
      Auth: {
        new(): FirebaseAuth;
        Persistence: {
          LOCAL: Persistence;
          NONE: Persistence;
          SESSION: Persistence;
        };
      };
      EmailAuthProvider: typeof EmailAuthProvider;
      EmailAuthProvider_Instance: typeof EmailAuthProvider_Instance;
      FacebookAuthProvider: typeof FacebookAuthProvider;
      FacebookAuthProvider_Instance: typeof FacebookAuthProvider_Instance;
      GithubAuthProvider: typeof GithubAuthProvider;
      GithubAuthProvider_Instance: typeof GithubAuthProvider_Instance;
      GoogleAuthProvider: typeof GoogleAuthProvider;
      GoogleAuthProvider_Instance: typeof GoogleAuthProvider_Instance;
      PhoneAuthProvider: typeof PhoneAuthProvider;
      PhoneAuthProvider_Instance: typeof PhoneAuthProvider_Instance;
      RecaptchaVerifier: typeof RecaptchaVerifier;
      RecaptchaVerifier_Instance: typeof RecaptchaVerifier_Instance;
      TwitterAuthProvider: typeof TwitterAuthProvider;
      TwitterAuthProvider_Instance: typeof TwitterAuthProvider_Instance;
    }
  }
  interface FirebaseApp {
    auth?(): FirebaseAuth;
  }
}
