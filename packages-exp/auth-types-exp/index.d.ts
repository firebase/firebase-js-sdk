/**
 * @license
 * Copyright 2019 Google LLC
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

import {
  CompleteFn,
  ErrorFn,
  FirebaseError,
  NextFn,
  Observer,
  Unsubscribe
} from '@firebase/util';

/**
 * Supported providers
 */
export const enum ProviderId {
  ANONYMOUS = 'anonymous',
  CUSTOM = 'custom',
  FACEBOOK = 'facebook.com',
  FIREBASE = 'firebase',
  GITHUB = 'github.com',
  GOOGLE = 'google.com',
  PASSWORD = 'password',
  PHONE = 'phone',
  TWITTER = 'twitter.com'
}

/**
 * Supported sign in methods
 */
export const enum SignInMethod {
  ANONYMOUS = 'anonymous',
  EMAIL_LINK = 'emailLink',
  EMAIL_PASSWORD = 'password',
  FACEBOOK = 'facebook.com',
  GITHUB = 'github.com',
  GOOGLE = 'google.com',
  PHONE = 'phone',
  TWITTER = 'twitter.com'
}

/**
 * Supported operation types
 */
export const enum OperationType {
  LINK = 'link',
  REAUTHENTICATE = 'reauthenticate',
  SIGN_IN = 'signIn'
}

/**
 * Auth config object
 */
export interface Config {
  apiKey: string;
  apiHost: string;
  apiScheme: string;
  tokenApiHost: string;
  sdkClientVersion: string;
  authDomain?: string;
}

/**
 * Parsed Id Token
 *
 * TODO(avolkovi): consolidate with parsed_token in implementation
 */
export interface ParsedToken {
  'exp'?: string;
  'sub'?: string;
  'auth_time'?: string;
  'iat'?: string;
  'firebase'?: {
    'sign_in_provider'?: string;
    'sign_in_second_factor'?: string;
  };
  [key: string]: string | object | undefined;
}

/**
 * TODO(avolkovi): should we consolidate with Subscribe<T> since we're changing the API anyway?
 */
export type NextOrObserver<T> = NextFn<T | null> | Observer<T | null>;

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.AuthError
 */
export interface AuthError extends FirebaseError {
  readonly appName: string;

  readonly email?: string;
  readonly phoneNumber?: string;
  readonly tenantid?: string;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.AuthSettings
 */
export interface AuthSettings {
  appVerificationDisabledForTesting: boolean;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.Auth
 */
export interface Auth {
  readonly name: string;
  readonly config: Config;
  setPersistence(persistence: Persistence): void;
  languageCode: string | null;
  tenantId: string | null;
  readonly settings: AuthSettings;
  onAuthStateChanged(
    nextOrObserver: NextOrObserver<User>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe;
  onIdTokenChanged(
    nextOrObserver: NextOrObserver<User>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe;
  readonly currentUser: User | null;
  updateCurrentUser(user: User | null): Promise<void>;
  useDeviceLanguage(): void;
  useEmulator(hostname: string, port: number): void;
  signOut(): Promise<void>;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.Auth#persistence
 */
export interface Persistence {
  readonly type: 'SESSION' | 'LOCAL' | 'NONE';
}

/**
 * Parsed IdToken for use in public API
 *
 * https://firebase.google.com/docs/reference/js/firebase.auth.IDTokenResult
 */
export interface IdTokenResult {
  authTime: string;
  expirationTime: string;
  issuedAtTime: string;
  signInProvider: string | null;
  signInSecondFactor: string | null;
  token: string;
  claims: ParsedToken;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.ActionCodeInfo
 */
export interface ActionCodeInfo {
  data: {
    email?: string | null;
    multiFactorInfo?: MultiFactorInfo | null;
    previousEmail?: string | null;
  };
  operation: Operation;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.ActionCodeInfo#operation_2
 */
export const enum Operation {
  EMAIL_SIGNIN = 'EMAIL_SIGNIN',
  PASSWORD_RESET = 'PASSWORD_RESET',
  RECOVER_EMAIL = 'RECOVER_EMAIL',
  REVERT_SECOND_FACTOR_ADDITION = 'REVERT_SECOND_FACTOR_ADDITION',
  VERIFY_AND_CHANGE_EMAIL = 'VERIFY_AND_CHANGE_EMAIL',
  VERIFY_EMAIL = 'VERIFY_EMAIL'
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth#actioncodesettings
 */
export interface ActionCodeSettings {
  android?: {
    installApp?: boolean;
    minimumVersion?: string;
    packageName: string;
  };
  handleCodeInApp?: boolean;
  iOS?: {
    bundleId: string;
  };
  url: string;
  dynamicLinkDomain?: string;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.ActionCodeURL
 */
export abstract class ActionCodeURL {
  readonly apiKey: string;
  readonly code: string;
  readonly continueUrl: string | null;
  readonly languageCode: string | null;
  readonly operation: Operation;
  readonly tenantId: string | null;

  static parseLink(link: string): ActionCodeURL | null;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.ApplicationVerifier
 */
export interface ApplicationVerifier {
  readonly type: string;
  verify(): Promise<string>;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.RecaptchaVerifier
 */
export abstract class RecaptchaVerifier implements ApplicationVerifier {
  constructor(
    container: any | string,
    parameters?: Object | null,
    auth?: Auth | null
  );
  clear(): void;
  render(): Promise<number>;
  readonly type: string;
  verify(): Promise<string>;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.AuthCredential
 */
export abstract class AuthCredential {
  static fromJSON(json: object | string): AuthCredential | null;

  readonly providerId: string;
  readonly signInMethod: string;
  toJSON(): object;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.OAuthCredential
 */
export abstract class OAuthCredential extends AuthCredential {
  static fromJSON(json: object | string): OAuthCredential | null;

  readonly accessToken?: string;
  readonly idToken?: string;
  readonly secret?: string;
}
/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.phoneauthcredential
 */
export abstract class PhoneAuthCredential extends AuthCredential {
  static fromJSON(json: object | string): PhoneAuthCredential | null;
}

/**
 * A provider for generating credentials
 *
 * https://firebase.google.com/docs/reference/js/firebase.auth.AuthProvider
 */
export interface AuthProvider {
  readonly providerId: string;
}

/**
 * A provider for generating email & password and email link credentials
 *
 * https://firebase.google.com/docs/reference/js/firebase.auth.EmailAuthProvider
 */
export abstract class EmailAuthProvider implements AuthProvider {
  private constructor();
  static readonly PROVIDER_ID: ProviderId;
  static readonly EMAIL_PASSWORD_SIGN_IN_METHOD: SignInMethod;
  static readonly EMAIL_LINK_SIGN_IN_METHOD: SignInMethod;
  static credential(email: string, password: string): AuthCredential;
  static credentialWithLink(
    auth: Auth,
    email: string,
    emailLink: string
  ): AuthCredential;
  readonly providerId: ProviderId;
}

/**
 * A provider for generating phone credentials
 *
 * https://firebase.google.com/docs/reference/js/firebase.auth.PhoneAuthProvider
 */
export class PhoneAuthProvider implements AuthProvider {
  static readonly PROVIDER_ID: ProviderId;
  static readonly PHONE_SIGN_IN_METHOD: SignInMethod;
  static credential(
    verificationId: string,
    verificationCode: string
  ): AuthCredential;

  constructor(auth?: Auth | null);

  readonly providerId: ProviderId;

  verifyPhoneNumber(
    phoneInfoOptions: PhoneInfoOptions | string,
    applicationVerifier: ApplicationVerifier
  ): Promise<string>;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.ConfirmationResult
 */
export interface ConfirmationResult {
  readonly verificationId: string;
  confirm(verificationCode: string): Promise<UserCredential>;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.multifactorassertion
 */
export interface MultiFactorAssertion {
  readonly factorId: string;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.multifactorerror
 */
export interface MultiFactorError extends AuthError {
  readonly credential: AuthCredential;
  readonly operationType: OperationType;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.multifactorinfo
 */
export interface MultiFactorInfo {
  readonly uid: string;
  readonly displayName?: string | null;
  readonly enrollmentTime: string;
  readonly factorId: ProviderId;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.multifactorresolver
 */
export abstract class MultiFactorResolver {
  hints: MultiFactorInfo[];
  session: MultiFactorSession;
  resolveSignIn(assertion: MultiFactorAssertion): Promise<UserCredential>;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.multifactorsession
 */
export interface MultiFactorSession {}

/**
 * https://firebase.google.com/docs/reference/js/firebase.user.multifactoruser
 */
export interface MultiFactorUser {
  readonly enrolledFactors: MultiFactorInfo[];
  getSession(): Promise<MultiFactorSession>;
  enroll(
    assertion: MultiFactorAssertion,
    displayName?: string | null
  ): Promise<void>;
  unenroll(option: MultiFactorInfo | string): Promise<void>;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.phonemultifactorassertion
 */
export interface PhoneMultiFactorAssertion extends MultiFactorAssertion {}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.phonemultifactorgenerator
 */
export abstract class PhoneMultiFactorGenerator {
  static FACTOR_ID: ProviderId;
  static assertion(
    phoneAuthCredential: PhoneAuthCredential
  ): PhoneMultiFactorAssertion;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth#phoneinfooptions
 */
export type PhoneInfoOptions =
  | PhoneSingleFactorInfoOptions
  | PhoneMultiFactorEnrollInfoOptions
  | PhoneMultiFactorSignInInfoOptions;

export interface PhoneSingleFactorInfoOptions {
  phoneNumber: string;
}

export interface PhoneMultiFactorEnrollInfoOptions {
  phoneNumber: string;
  session: MultiFactorSession;
}

export interface PhoneMultiFactorSignInInfoOptions {
  multiFactorHint?: MultiFactorInfo;
  multiFactorUid?: string;
  session: MultiFactorSession;
}

export interface ReactNativeAsyncStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.User
 */
export interface User extends UserInfo {
  readonly emailVerified: boolean;
  readonly isAnonymous: boolean;
  readonly metadata: UserMetadata;
  readonly providerData: UserInfo[];
  readonly refreshToken: string;
  readonly tenantId: string | null;

  delete(): Promise<void>;
  getIdToken(forceRefresh?: boolean): Promise<string>;
  getIdTokenResult(forceRefresh?: boolean): Promise<IdTokenResult>;
  reload(): Promise<void>;
  toJSON(): object;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth#usercredential
 */
export interface UserCredential {
  user: User;
  providerId: ProviderId | null;
  operationType: OperationType;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.UserInfo
 */
export interface UserInfo {
  readonly displayName: string | null;
  readonly email: string | null;
  readonly phoneNumber: string | null;
  readonly photoURL: string | null;
  readonly providerId: string;
  readonly uid: string;
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.auth.UserMetadata
 */
export interface UserMetadata {
  readonly creationTime?: string;
  readonly lastSignInTime?: string;
}

/**
 * Additional user information.
 */
export interface AdditionalUserInfo {
  readonly isNewUser: boolean;
  readonly profile: UserProfile | null;
  readonly providerId: ProviderId | null;
  readonly username?: string | null;
}

/**
 * User profile used in `AdditionalUserInfo`
 */
export type UserProfile = Record<string, unknown>;

/** No documentation for this yet */
export interface PopupRedirectResolver {}

declare module '@firebase/component' {
  interface NameServiceMapping {
    'auth-exp': Auth;
  }
}
