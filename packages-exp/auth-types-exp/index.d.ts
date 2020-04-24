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

export interface ReactNativeAsyncStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
}

export interface Config {
  apiKey: string;
  apiHost: string;
  apiScheme: string;
  tokenApiHost: string;
  sdkClientVersion: string;
  authDomain?: string;
}

export interface Persistence {
  readonly type: 'SESSION' | 'LOCAL' | 'NONE';
}

export interface AuthSettings {
  appVerificationDisabledForTesting: boolean;
}

export interface Auth {
  readonly name: string;
  readonly config: Config;
  setPersistence(persistence: Persistence): void;
  languageCode: string | null;
  tenantId?: string | null;
  readonly settings: AuthSettings;
  onIdTokenChanged(
    nextOrObserver: (a: User | null) => any,
    error?: (a: Error) => any,
    completed?: Unsubscribe
  ): Unsubscribe;
  onAuthStateChanged(
    nextOrObserver: (a: User | null) => any,
    error?: (a: Error) => any,
    completed?: Unsubscribe
  ): Unsubscribe;
  readonly currentUser: User | null;
  useDeviceLanguage(): void;
  signOut(): Promise<void>;
}

export interface UserInfo {
  readonly displayName: string | null;
  readonly email: string | null;
  readonly phoneNumber: string | null;
  readonly photoURL: string | null;
  readonly providerId: string;
  readonly uid: string;
}

export interface UserMetadata {
  readonly creationTime?: string;
  readonly lastSignInTime?: string;
}

export interface User extends UserInfo {
  readonly refreshToken: string;
  readonly emailVerified: boolean;
  readonly isAnonymous: boolean;
  readonly metadata: UserMetadata;
  readonly phoneNumber: string | null;
  readonly providerData: UserInfo[];
  readonly tenantId?: string | null;
  getIdToken(forceRefresh?: boolean): Promise<string>;
  getIdTokenResult(forceRefresh?: boolean): Promise<IdTokenResult>;
  reload(): Promise<void>;
  delete(): Promise<void>;
}

/**
 * Parsed IdToken for use in public API
 */
export interface IdTokenResult {
  token: string;
  authTime: string | null;
  expirationTime: string | null;
  issuedAtTime: string | null;
  signInProvider: ProviderId | null;
  signInSecondFactor: string | null;
  claims: ParsedToken;
}

export interface ParsedToken {
  'exp'?: string;
  'auth_time'?: string;
  'iat'?: string;
  'firebase'?: {
    'sign_in_provider'?: string;
    'sign_in_second_factor'?: string;
  };
  [key: string]: string | object | undefined;
}

export type Unsubscribe = () => void;

export interface ActionCodeInfo {
  data: {
    email: string | null;
    fromEmail: string | null;
  };
  operation: string;
}

export interface ActionCodeSettings {
  android?: {
    installApp?: boolean;
    minimumVersion?: string;
    packageName: string;
  };
  handleCodeInApp?: boolean;
  iOS?: {
    bundleId: string;
    appStoreId: string;
  };
  url: string;
  dynamicLinkDomain?: string;
}

export interface ActionCodeURL {
  readonly apiKey?: string;
  readonly operation?: ActionCodeOperationType;
  readonly code: string | null;
  readonly continueUrl: string | null;
  readonly languageCode: string | null;
  readonly tenantId: string | null;
}

type ActionCodeOperationType =
  | 'PASSWORD_RESET'
  | 'RECOVER_EMAIL'
  | 'EMAIL_SIGNIN'
  | 'VERIFY_EMAIL'
  | 'VERIFY_AND_CHANGE_EMAIL'
  | 'REVERT_SECOND_FACTOR_ADDITION';

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

export interface AuthProvider {
  readonly providerId: string;
}

export abstract class AuthCredential {
  readonly providerId: ProviderId;
  readonly signInMethod: SignInMethod;
  toJSON(): object;
}

export abstract class OAuthCredential implements AuthCredential {
  readonly accessToken?: string;
  readonly idToken?: string;
  readonly secret?: string;
  readonly providerId: ProviderId;
  readonly signInMethod: SignInMethod;

  constructor();

  toJSON(): object;
}

export const enum OperationType {
  LINK = 'link',
  REAUTHENTICATE = 'reauthenticate',
  SIGN_IN = 'signIn'
}

export interface UserCredential {
  user: User;
  credential: AuthCredential | null;
  operationType: OperationType;
}

export interface ApplicationVerifier {
  readonly type: string;
  verify(): Promise<string>;
  reset(): void;
}

export interface ConfirmationResult {
  readonly verificationId: string;
  confirm(verificationCode: string): Promise<UserCredential>;
}

export interface PhoneInfoOptions {
  phoneNumber: string;
  // session?: MultiFactorSession;
  // multiFactorHint?: MultiFactorInfo;
}

/**
 * A provider for generating credentials
 */
export interface AuthProvider {
  readonly providerId: ProviderId;
}
