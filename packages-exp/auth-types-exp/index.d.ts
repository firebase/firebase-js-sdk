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
 * Supported providers.
 *
 * @public
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
 * Supported sign-in methods.
 *
 * @public
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
 * Supported operation types.
 *
 * @public
 */
export const enum OperationType {
  /** Operation involving linking an additional provider to an already signed-in user. */
  LINK = 'link',
  /** Operation involving using a provider to reauthenticate an already signed-in user. */
  REAUTHENTICATE = 'reauthenticate',
  /** Operation involving signing in a user. */
  SIGN_IN = 'signIn'
}

/**
 * Auth config object.
 *
 * @public
 */
export interface Config {
  /**
   * The API Key used to communicate with the Firebase Auth backend.
   */
  apiKey: string;
  /**
   * The host at which the Firebase Auth backend is running.
   */
  apiHost: string;
  /**
   * The scheme used to communicate with the Firebase Auth backend.
   */
  apiScheme: string;
  /**
   * The host at which the Secure Token API is running.
   */
  tokenApiHost: string;
  /**
   * The SDK Client Version.
   */
  sdkClientVersion: string;
  /**
   * The domain at which the web widgets are hosted (provided via Firebase Config).
   */
  authDomain?: string;
}

/**
 * Parsed ID token.
 *
 * @privateRemarks TODO(avolkovi): consolidate with parsed_token in implementation.
 *
 * @public
 */
export interface ParsedToken {
  /** Expiration time of the token. */
  'exp'?: string;
  /** UID of the user. */
  'sub'?: string;
  /** Time at which authentication was performed. */
  'auth_time'?: string;
  /** Issuance time of the token. */
  'iat'?: string;
  /** Firebase specific claims, containing the provider(s) used to authenticate the user. */
  'firebase'?: {
    'sign_in_provider'?: string;
    'sign_in_second_factor'?: string;
  };
  /** Map of any additional custom claims. */
  [key: string]: string | object | undefined;
}

/**
 * Type definition for an event callback.
 *
 * @privateRemarks TODO(avolkovi): should we consolidate with Subscribe<T> since we're changing the API anyway?
 *
 * @public
 */
export type NextOrObserver<T> = NextFn<T | null> | Observer<T | null>;

/**
 * @public
 */
export interface AuthError extends FirebaseError {
  /** The name of the Firebase App which triggered this error.  */
  readonly appName: string;
  /** The email of the user's account, used for sign-in/linking. */
  readonly email?: string;
  /** The phone number of the user's account, used for sign-in/linking. */
  readonly phoneNumber?: string;
  /**
   * The tenant ID being used for sign-in/linking. If you use `signInWithRedirect` to sign in,
   * you have to set the tenant ID on {@link Auth} instance again as the tenant ID is not persisted
   * after redirection.
   */
  readonly tenantid?: string;
}

/**
 * Interface representing an Auth instance's settings, currently used for enabling/disabling app
 * verification for phone Auth testing.
 *
 * @public
 */
export interface AuthSettings {
  /**
   * When set, this property disables app verification for the purpose of testing phone
   * authentication. For this property to take effect, it needs to be set before rendering a
   * reCAPTCHA app verifier. When this is disabled, a mock reCAPTCHA is rendered instead. This is
   * useful for manual testing during development or for automated integration tests.
   *
   * In order to use this feature, you will need to
   * {@link https://firebase.google.com/docs/auth/web/phone-auth#test-with-whitelisted-phone-numbers | whitelist your phone number}
   * via the Firebase Console.
   *
   * The default value is false (app verification is enabled).
   */
  appVerificationDisabledForTesting: boolean;
}

/**
 * The Firebase Auth service interface.
 *
 * See {@link https://firebase.google.com/docs/auth/ | Firebase Authentication} for a full guide
 * on how to use the Firebase Auth service.
 *
 * @public
 */
export interface Auth {
  /** The name of the app associated with the Auth service instance. */
  readonly name: string;
  /** The {@link Config} used to initialize this instance. */
  readonly config: Config;
  /**
   * Changes the type of persistence on the Auth instance for the currently saved
   * Auth session and applies this type of persistence for future sign-in requests, including
   * sign-in with redirect requests.
   *
   * This makes it easy for a user signing in to specify whether their session should be
   * remembered or not. It also makes it easier to never persist the Auth state for applications
   * that are shared by other users or have sensitive data.
   *
   * @example
   * ```javascript
   * auth.setPersistence(browserSessionPersistence);
   * ```
   *
   * @param persistence - The {@link Persistence} to use.
   */
  setPersistence(persistence: Persistence): void;
  /**
   * The Auth instance's language code. This is a readable/writable property. When set to
   * null, the default Firebase Console language setting is applied. The language code will
   * propagate to email action templates (password reset, email verification and email change
   * revocation), SMS templates for phone authentication, reCAPTCHA verifier and OAuth
   * popup/redirect operations provided the specified providers support localization with the
   * language code specified.
   */
  languageCode: string | null;
  /**
   * The Auth instance's tenant ID. This is a readable/writable property. When you set
   * the tenant ID of an Auth instance, all future sign-in/sign-up operations will pass this
   * tenant ID and sign in or sign up users to the specified tenant project. When set to null,
   * users are signed in to the parent project. By default, this is set to null.
   *
   * @example
   * ```javascript
   * // Set the tenant ID on Auth instance.
   * auth.tenantId = 'TENANT_PROJECT_ID';
   *
   * // All future sign-in request now include tenant ID.
   * const result = await signInWithEmailAndPassword(auth, email, password);
   * // result.user.tenantId should be 'TENANT_PROJECT_ID'.
   * ```
   */
  tenantId: string | null;
  /**
   * The Auth instance's settings. This is used to edit/read configuration related options
   * like app verification mode for phone authentication.
   */
  readonly settings: AuthSettings;
  /**
   * Adds an observer for changes to the user's sign-in state.
   *
   * To keep the old behavior, see {@link Auth.onIdTokenChanged}.
   *
   * @param nextOrObserver - callback triggere on change.
   * @param error - callback triggered on error.
   * @param completed - callback triggered when observer is removed.
   */
  onAuthStateChanged(
    nextOrObserver: NextOrObserver<User>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe;
  /**
   * Adds an observer for changes to the signed-in user's ID token, which includes sign-in,
   * sign-out, and token refresh events.
   *
   * @param nextOrObserver - callback triggere on change.
   * @param error - callback triggered on error.
   * @param completed - callback triggered when observer is removed.
   */
  onIdTokenChanged(
    nextOrObserver: NextOrObserver<User>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe;
  /** The currently signed-in user (or null). */
  readonly currentUser: User | null;
  /**
   * Asynchronously sets the provided user as `currentUser` on the Auth instance. A new
   * instance copy of the user provided will be made and set as currentUser.
   *
   * This will trigger {@link Auth.onAuthStateChanged} and {@link Auth.onIdTokenChanged} listeners
   * like other sign in methods.
   *
   * The operation fails with an error if the user to be updated belongs to a different Firebase
   * project.
   *
   * @param user - The new {@link User}.
   */
  updateCurrentUser(user: User | null): Promise<void>;
  /**
   * Sets the current language to the default device/browser preference.
   */
  useDeviceLanguage(): void;
  /**
   * Modify this Auth instance to communicate with the Firebase Auth emulator.  This must be
   * called synchronously immediately following the first call to `firebase.auth()`.  Do not use
   * with production credentials as emulator traffic is not encrypted.
   *
   * @param url - The URL at which the emulator is running (eg, 'http://localhost:9099')
   */
  useEmulator(url: string): void;
  /**
   * Signs out the current user.
   */
  signOut(): Promise<void>;
}

/**
 * An enumeration of the possible persistence mechanism types.
 *
 * @public
 */
export interface Persistence {
  /**
   * Type of Persistence.
   * - 'SESSION' is used for temporary persistence such as `sessionStorage`.
   * - 'LOCAL' is used for long term persistence such as `localStorage` or 'IndexedDB`.
   * - 'NONE' is used for in-memory, or no persistence.
   */
  readonly type: 'SESSION' | 'LOCAL' | 'NONE';
}

/**
 * Interface representing ID token result obtained from `getIdTokenResult`. It contains the ID
 * token JWT string and other helper properties for getting different data associated with the
 * token as well as all the decoded payload claims.
 *
 * Note that these claims are not to be trusted as they are parsed client side. Only server side
 * verification can guarantee the integrity of the token claims.
 *
 * @public
 */
export interface IdTokenResult {
  /**
   * The authentication time formatted as a UTC string. This is the time the user authenticated
   * (signed in) and not the time the token was refreshed.
   */
  authTime: string;
  /** The ID token expiration time formatted as a UTC string. */
  expirationTime: string;
  /** The ID token issuance time formatted as a UTC string. */
  issuedAtTime: string;
  /**
   * The sign-in provider through which the ID token was obtained (anonymous, custom, phone,
   * password, etc). Note, this does not map to provider IDs.
   */
  signInProvider: string | null;
  /**
   * The type of second factor associated with this session, provided the user was multi-factor
   * authenticated (eg. phone, etc).
   */
  signInSecondFactor: string | null;
  /** The Firebase Auth ID token JWT string. */
  token: string;
  /**
   * The entire payload claims of the ID token including the standard reserved claims as well as
   * the custom claims.
   */
  claims: ParsedToken;
}

/**
 * A response from `checkActionCode`.
 *
 * @public
 */
export interface ActionCodeInfo {
  /**
   * The data associated with the action code.
   * For the {@link Operation.PASSWORD_RESET}, {@link Operation.VERIFY_EMAIL}, and
   * {@link Operation.RECOVER_EMAIL} actions, this object contains an email field with the address
   * the email was sent to.
   *
   * For the {@link Operation.RECOVER_EMAIL} action, which allows a user to undo an email address
   * change, this object also contains a `previousEmail` field with the user account's current
   * email address. After the action completes, the user's email address will revert to the value
   * in the `email` field from the value in `previousEmail` field.
   *
   * For the {@link Operation.VERIFY_AND_CHANGE_EMAIL} action, which allows a user to verify the
   * email before updating it, this object contains a `previousEmail` field with the user account's
   * email address before updating. After the action completes, the user's email address will be
   * updated to the value in the `email` field from the value in `previousEmail` field.
   *
   * For the {@link Operation.REVERT_SECOND_FACTOR_ADDITION} action, which allows a user to
   * unenroll a newly added second factor, this object contains a `multiFactorInfo` field with
   * the information about the second factor. For phone second factor, the `multiFactorInfo`
   * is a {@link MultiFactorInfo} object, which contains the phone number.
   */
  data: {
    email?: string | null;
    multiFactorInfo?: MultiFactorInfo | null;
    previousEmail?: string | null;
  };
  /**
   * The type of operation that generated the action code.
   */
  operation: Operation;
}

/**
 * An enumeration of the possible email action types.
 *
 * @public
 */
export const enum Operation {
  /** The email link sign-in action.  */
  EMAIL_SIGNIN = 'EMAIL_SIGNIN',
  /** The password reset action. */
  PASSWORD_RESET = 'PASSWORD_RESET',
  /** The email revocation action. */
  RECOVER_EMAIL = 'RECOVER_EMAIL',
  /** The revert second factor addition email action.  */
  REVERT_SECOND_FACTOR_ADDITION = 'REVERT_SECOND_FACTOR_ADDITION',
  /** The revert second factor addition email action. */
  VERIFY_AND_CHANGE_EMAIL = 'VERIFY_AND_CHANGE_EMAIL',
  /** The email verification action. */
  VERIFY_EMAIL = 'VERIFY_EMAIL'
}

/**
 * This is the interface that defines the required continue/state URL with optional Android and iOS
 * bundle identifiers.
 *
 * @public
 */
export interface ActionCodeSettings {
  /**
   * Sets the Android package name. This will try to open the link in an android app if it is
   * installed. If `installApp` is passed, it specifies whether to install the Android app if the
   * device supports it and the app is not already installed. If this field is provided without
   * a `packageName`, an error is thrown explaining that the `packageName` must be provided in
   * conjunction with this field. If `minimumVersion` is specified, and an older version of the
   * app is installed, the user is taken to the Play Store to upgrade the app.
   */
  android?: {
    installApp?: boolean;
    minimumVersion?: string;
    packageName: string;
  };
  /**
   * The default is false. When set to true, the action code link will be be sent as a Universal
   * Link or Android App Link and will be opened by the app if installed. In the false case,
   * the code will be sent to the web widget first and then on continue will redirect to the app
   * if installed.
   */
  handleCodeInApp?: boolean;
  /**
   * Sets the iOS bundle ID. This will try to open the link in an iOS app if it is installed.
   *
   * App installation is not supported for iOS.
   */
  iOS?: {
    bundleId: string;
  };
  /**
   * Sets the link continue/state URL, which has different meanings in different contexts:
   * - When the link is handled in the web action widgets, this is the deep link in the
   * `continueUrl` query parameter.
   * - When the link is handled in the app directly, this is the `continueUrl` query parameter in
   * the deep link of the Dynamic Link.
   */
  url: string;
  /**
   * When multiple custom dynamic link domains are defined for a project, specify which one to use
   * when the link is to be opened via a specified mobile app (for example, `example.page.link`).
   * Otherwise the first domain is automatically selected.
   */
  dynamicLinkDomain?: string;
}

/**
 * A utility class to parse email action URLs such as password reset, email verification,
 * email link sign in, etc.
 *
 * @public
 */
export abstract class ActionCodeURL {
  /**
   * The API key of the email action link.
   */
  readonly apiKey: string;
  /**
   * The action code of the email action link.
   */
  readonly code: string;
  /**
   * The continue URL of the email action link. Null if not provided.
   */
  readonly continueUrl: string | null;
  /**
   * The language code of the email action link. Null if not provided.
   */
  readonly languageCode: string | null;
  /**
   * The action performed by the email action link. It returns from one of the types from
   * {@link ActionCodeInfo}
   */
  readonly operation: Operation;
  /**
   * The tenant ID of the email action link. Null if the email action is from the parent project.
   */
  readonly tenantId: string | null;

  /**
   * Parses the email action link string and returns an ActionCodeURL object if the link is valid, otherwise returns null.
   *
   * @param link  - The email action link string.
   * @returns The ActionCodeURL object, or null if the link is invalid.
   *
   * @public
   */
  static parseLink(link: string): ActionCodeURL | null;
}

/**
 * A verifier for domain verification and abuse prevention. Currently, the only implementation is
 * {@link RecaptchaVerifier}.
 *
 * @public
 */
export interface ApplicationVerifier {
  /**
   * Identifies the type of application verifier (e.g. "recaptcha").
   */
  readonly type: string;
  /**
   * Executes the verification process.
   *
   * @returns A Promise for a token that can be used to assert the validity of a request.
   */
  verify(): Promise<string>;
}

/**
 * An {@link https://www.google.com/recaptcha/ | reCAPTCHA}-based application verifier.
 *
 * @public
 */
export abstract class RecaptchaVerifier implements ApplicationVerifier {
  constructor(
    /**
     * The reCAPTCHA container parameter. This has different meaning depending on whether the
     * reCAPTCHA is hidden or visible. For a visible reCAPTCHA the container must be empty. If a
     * string is used, it has to correspond to an element ID. The corresponding element must also
     * must be in the DOM at the time of initialization.
     */
    container: any | string,
    /**
     * The optional reCAPTCHA parameters. Check the reCAPTCHA docs for a comprehensive list.
     * All parameters are accepted except for the sitekey. Firebase Auth backend provisions a
     * reCAPTCHA for each project and will configure this upon rendering. For an invisible
     * reCAPTCHA, a size key must have the value 'invisible'.
     */
    parameters?: Object | null,
    /**
     * The corresponding Firebase Auth instance. If none is provided, the default Firebase Auth
     * instance is used. A Firebase Auth instance must be initialized with an API key, otherwise
     * an error will be thrown.
     */
    auth?: Auth | null
  );
  /**
   * Clears the reCAPTCHA widget from the page and destroys the instance.
   */
  clear(): void;
  /**
   * Renders the reCAPTCHA widget on the page.
   *
   * @returns A Promise that resolves with the reCAPTCHA widget ID.
   */
  render(): Promise<number>;
  /**
   * The application verifier type. For a reCAPTCHA verifier, this is 'recaptcha'.
   */
  readonly type: string;
  /**
   * Waits for the user to solve the reCAPTCHA and resolves with the reCAPTCHA token.
   *
   * @returns A Promise for the reCAPTCHA token.
   */
  verify(): Promise<string>;
}

/**
 * Interface that represents the credentials returned by an auth provider. Implementations specify
 * the details about each auth provider's credential requirements.
 *
 * @public
 */
export abstract class AuthCredential {
  /**
   * Static method to deserialize a JSON representation of an object into an {@link AuthCredential}.
   *
   * @param json - Either `object` or the stringified representation of the object. When string is
   * provided, `JSON.parse` would be called first.
   *
   * @returns If the JSON input does not represent an {@link AuthCredential}, null is returned.
   */
  static fromJSON(json: object | string): AuthCredential | null;

  /**
   * The authentication provider ID for the credential. For example, 'facebook.com', or
   * 'google.com'.
   */
  readonly providerId: string;
  /**
   * The authentication sign in method for the credential. For example,
   * {@link SignInMethod.EMAIL_PASSWORD}, or {@link SignInMethod.EMAIL_LINK}. This corresponds to
   * the sign-in method identifier as returned in `fetchSignInMethodsForEmail`.
   */
  readonly signInMethod: string;
  /**
   * Returns a JSON-serializable representation of this object.
   *
   * @returns a JSON-serializable representation of this object.
   */
  toJSON(): object;
}

/**
 * Interface that represents the OAuth credentials returned by an OAuth provider. Implementations
 * specify the details about each auth provider's credential requirements.
 *
 * @public
 */
export abstract class OAuthCredential extends AuthCredential {
  /**
   * Static method to deserialize a JSON representation of an object into an
   * {@link AuthCredential}.
   *
   * @param json - Input can be either Object or the stringified representation of the object.
   * When string is provided, JSON.parse would be called first.
   *
   * @returns If the JSON input does not represent an {@link AuthCredential}, null is returned.
   */
  static fromJSON(json: object | string): OAuthCredential | null;

  /**
   * The OAuth access token associated with the credential if it belongs to an OAuth provider,
   * such as `facebook.com`, `twitter.com`, etc.
   */
  readonly accessToken?: string;
  /**
   * The OAuth ID token associated with the credential if it belongs to an OIDC provider,
   * such as `google.com`.
   */
  readonly idToken?: string;
  /**
   * The OAuth access token secret associated with the credential if it belongs to an OAuth 1.0
   * provider, such as `twitter.com`.
   */
  readonly secret?: string;
}

/**
 * Class that represents the Phone Auth credentials returned by a {@link PhoneAuthProvider}.
 *
 * @public
 */
export abstract class PhoneAuthCredential extends AuthCredential {
  /** {@inheritdoc AuthCredential} */
  static fromJSON(json: object | string): PhoneAuthCredential | null;
}

/**
 * Interface that represents an auth provider, used to facilitate creating {@link AuthCredential}.
 *
 * @public
 */
export interface AuthProvider {
  /**
   * Provider for which credentials can be constructed.
   */
  readonly providerId: string;
}

/**
 * Email and password auth provider implementation.
 *
 * @public
 */
export abstract class EmailAuthProvider implements AuthProvider {
  private constructor();
  /**
   * Always set to {@link ProviderId.PASSWORD}, even for email link.
   */
  static readonly PROVIDER_ID: ProviderId;
  /**
   * Always set to {@link SignInMethod.EMAIL_PASSWORD}.
   */
  static readonly EMAIL_PASSWORD_SIGN_IN_METHOD: SignInMethod;
  /**
   * Always set to {@link SignInMethod.EMAIL_LINK}.
   */
  static readonly EMAIL_LINK_SIGN_IN_METHOD: SignInMethod;
  /**
   * Initialize an {@link AuthCredential} using an email and password.
   *
   * @example
   * ```javascript
   * const authCredential = EmailAuthProvider.credential(email, password);
   * const userCredential = await signInWithCredential(auth, authCredential);
   * ```
   *
   * @example
   * ```javascript
   * const userCredential = await signInWithEmailAndPassword(auth, email, password);
   * ```
   *
   * @param email - Email address.
   * @param password - User account password.
   * @returns The auth provider credential.
   */
  static credential(email: string, password: string): AuthCredential;
  /**
   * Initialize an {@link AuthCredential} using an email and an email link after a sign in with
   * email link operation.
   *
   * @example
   * ```javascript
   * const authCredential = EmailAuthProvider.credentialWithLink(auth, email, emailLink);
   * const userCredential = await signInWithCredential(auth, authCredential);
   * ```
   *
   * @example
   * ```javascript
   * await sendSignInLinkToEmail(auth, email);
   * // Obtain emailLink from user.
   * const userCredential = await signInWithEmailLink(auth, email, emailLink);
   * ```
   *
   * @param auth - The Auth instance used to verify the link.
   * @param email - Email address.
   * @param emailLink - Sign-in email link.
   * @returns - The auth provider credential.
   */
  static credentialWithLink(
    auth: Auth,
    email: string,
    emailLink: string
  ): AuthCredential;
  /**
   * Always set to {@link ProviderId.PASSWORD}, even for email link.
   */
  readonly providerId: ProviderId;
}

/**
 * A provider for generating phone credentials.
 *
 * @example
 * ```javascript
 * // 'recaptcha-container' is the ID of an element in the DOM.
 * const applicationVerifier = new RecaptchaVerifier('recaptcha-container');
 * const provider = new PhoneAuthProvider(auth);
 * const verificationId = await provider.verifyPhoneNumber('+16505550101', applicationVerifier);
 * const verificationCode = window.prompt('Please enter the verification code that was sent to your mobile device.');
 * const phoneCredential = await PhoneAuthProvider.credential(verificationId, verificationCode);
 * const userCredential = await signInWithCredential(auth, phoneCredential);
 * ```
 *
 * @public
 */
export class PhoneAuthProvider implements AuthProvider {
  /** Always set to {@link ProviderId.PHONE}. */
  static readonly PROVIDER_ID: ProviderId;
  /** Always set to {@link SignInMethod.PHONE}. */
  static readonly PHONE_SIGN_IN_METHOD: SignInMethod;
  /**
   * Creates a phone auth credential, given the verification ID from
   * {@link PhoneAuthProvider.verifyPhoneNumber} and the code that was sent to the user's
   * mobile device.
   *
   * @example
   * ```javascript
   * const provider = new PhoneAuthProvider(auth);
   * const verificationId = provider.verifyPhoneNumber(phoneNumber, applicationVerifier);
   * // obtain verificationCode from the user
   * const authCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
   * const userCredential = signInWithCredential(auth, authCredential);
   * ```
   *
   * @example
   * An alternative flow is provided using the `signInWithPhoneNumber` method.
   * ```javascript
   * const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, applicationVerifier);
   * // obtain verificationCode from the user
   * const userCredential = await confirmationResult.confirm(verificationCode);
   * ```
   *
   * @param verificationId - The verification ID returned from
   * {@link PhoneAuthProvider.verifyPhoneNumber}.
   * @param verificationCode - The verification code sent to the user's mobile device.
   *
   * @returns The auth provider credential.
   */
  static credential(
    verificationId: string,
    verificationCode: string
  ): AuthCredential;
  /**
   * @param auth - The Firebase Auth instance in which sign-ins should occur. Uses the default Auth
   * instance if unspecified.
   */
  constructor(auth?: Auth | null);
  /** Always set to {@link ProviderId.PHONE}. */
  readonly providerId: ProviderId;

  /**
   *
   * Starts a phone number authentication flow by sending a verification code to the given phone
   * number. Returns an ID that can be passed to {@link PhoneAuthProvider.credential} to identify
   * this flow.
   *
   * @example
   * ```javascript
   * const provider = new PhoneAuthProvider(auth);
   * const verificationId = await provider.verifyPhoneNumber(phoneNumber, applicationVerifier);
   * // obtain verificationCode from the user
   * const authCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
   * const userCredential = await signInWithCredential(auth, authCredential);
   * ```
   *
   * @example
   * An alternative flow is provided using the `signInWithPhoneNumber` method.
   * ```javascript
   * const confirmationResult = signInWithPhoneNumber(auth, phoneNumber, applicationVerifier);
   * // obtain verificationCode from the user
   * const userCredential = confirmationResult.confirm(verificationCode);
   * ```
   *
   * @param phoneInfoOptions - The user's {@link PhoneInfoOptions}. The phone number should be in
   * E.164 format (e.g. +16505550101).
   * @param applicationVerifier - For abuse prevention, this method also requires a
   * {@link ApplicationVerifier}. This SDK includes a reCAPTCHA-based implementation,
   * {@link RecaptchaVerifier}.
   *
   * @returns A Promise for the verification ID.
   */
  verifyPhoneNumber(
    phoneInfoOptions: PhoneInfoOptions | string,
    applicationVerifier: ApplicationVerifier
  ): Promise<string>;
}

/**
 * A result from a phone number sign-in, link, or reauthenticate call.
 *
 * @public
 */
export interface ConfirmationResult {
  /**
   * The phone number authentication operation's verification ID. This can be used along with the
   * verification code to initialize a phone auth credential.
   */
  readonly verificationId: string;
  /**
   * Finishes a phone number sign-in, link, or reauthentication.
   *
   * @example
   * ```javascript
   * const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, applicationVerifier);
   * // obtain verificationCode from the user
   * const userCredential = await confirmationResult.confirm(verificationCode);
   * ```
   *
   * @param verificationCode - The code that was sent to the user's mobile device.
   */
  confirm(verificationCode: string): Promise<UserCredential>;
}

/**
 * The base class for asserting ownership of a second factor. This is used to facilitate enrollment
 * of a second factor on an existing user or sign-in of a user who already verified the first
 * factor.
 *
 * @public
 */
export interface MultiFactorAssertion {
  /** The identifier of the second factor. */
  readonly factorId: string;
}

/**
 * The error thrown when the user needs to provide a second factor to sign in successfully. The
 * error code for this error is `auth/multi-factor-auth-required`.
 *
 * @example
 * ```javascript
 * let resolver;
 * let multiFactorHints;
 *
 * signInWithEmailAndPassword(auth, email, password)
 *     .then((result) => {
 *       // User signed in. No 2nd factor challenge is needed.
 *     })
 *     .catch((error) => {
 *       if (error.code == 'auth/multi-factor-auth-required') {
 *         resolver = getMultiFactorResolver(auth, error);
 *         multiFactorHints = resolver.hints;
 *       } else {
 *         // Handle other errors.
 *       }
 *     });
 *
 * // Obtain a multiFactorAssertion by verifying the second-factor.
 *
 * const userCredential = await resolver.resolveSignIn(multiFactorAssertion);
 * ```
 *
 * @public
 */
export interface MultiFactorError extends AuthError {
  /**
   * The original redential used as a first-factor.
   */
  readonly credential: AuthCredential;
  /**
   * The type of operation (e.g., sign-in, link, or reauthenticate) during which the error was raised.
   */
  readonly operationType: OperationType;
}

/**
 * A structure containing the information of a second factor entity.
 *
 * @public
 */
export interface MultiFactorInfo {
  /** The multi-factor enrollment ID. */
  readonly uid: string;
  /** The user friendly name of the current second factor. */
  readonly displayName?: string | null;
  /** The enrollment date of the second factor formatted as a UTC string. */
  readonly enrollmentTime: string;
  /** The identifier of the second factor. */
  readonly factorId: ProviderId;
}

/**
 * The class used to facilitate recovery from {@link MultiFactorError} when a user needs to
 * provide a second factor to sign in.
 *
 * @example
 * ```javascript
 * let resolver;
 * let multiFactorHints;
 *
 * signInWithEmailAndPassword(auth, email, password)
 *     .then((result) => {
 *       // User signed in. No 2nd factor challenge is needed.
 *     })
 *     .catch((error) => {
 *       if (error.code == 'auth/multi-factor-auth-required') {
 *         resolver = getMultiFactorResolver(auth, error);
 *         // Show UI to let user select second factor.
 *         multiFactorHints = resolver.hints;
 *       } else {
 *         // Handle other errors.
 *       }
 *     });
 *
 * // The enrolled second factors that can be used to complete
 * // sign-in are returned in the `MultiFactorResolver.hints` list.
 * // UI needs to be presented to allow the user to select a second factor
 * // from that list.
 *
 * const selectedHint = // ; selected from multiFactorHints
 * const phoneAuthProvider = new PhoneAuthProvider();
 * const phoneInfoOptions = {
 *   multiFactorHint: selectedHint,
 *   session: resolver.session
 * };
 * const verificationId = phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, appVerifier);
 * // store `verificationId` and show UI to let user enter verification code.
 *
 * // UI to enter verification code and continue.
 * // Continue button click handler
 * const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
 * const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
 * const userCredential = await resolver.resolveSignIn(multiFactorAssertion);
 * // User signed in.
 * ```
 *
 * @public
 */
export abstract class MultiFactorResolver {
  /**
   * The list of hints for the second factors needed to complete the sign-in for the current
   * session.
   */
  hints: MultiFactorInfo[];
  /**
   * The session identifier for the current sign-in flow, which can be used to complete the second
   * factor sign-in.
   */
  session: MultiFactorSession;
  /**
   * A helper function to help users complete sign in with a second factor using an
   * {@link MultiFactorAssertion} confirming the user successfully completed the second factor
   * challenge.
   *
   * @example
   * ```javascript
   * const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
   * const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
   * const userCredential = await resolver.resolveSignIn(multiFactorAssertion);
   * ```
   *
   * @param assertion - The multi-factor assertion to resolve sign-in with.
   * @returns The promise that resolves with the user credential object.
   */
  resolveSignIn(assertion: MultiFactorAssertion): Promise<UserCredential>;
}

/**
 * The multi-factor session object used for enrolling a second factor on a user or helping sign in
 * an enrolled user with a second factor.
 *
 * @public
 */
export interface MultiFactorSession {}

/**
 * This is the interface that defines the multi-factor related properties and operations pertaining
 * to a {@link User}.
 *
 * @public
 */
export interface MultiFactorUser {
  /** Returns a list of the user's enrolled second factors. */
  readonly enrolledFactors: MultiFactorInfo[];
  /**
   * Returns the session identifier for a second factor enrollment operation. This is used to
   * identify the user trying to enroll a second factor.
   *
   * @example
   * ```javascript
   * const multiFactorUser = multiFactor(auth.currentUser);
   * const multiFactorSession = await multiFactorUser.getSession();
   *
   * // Send verification code
   * const phoneAuthProvider = new PhoneAuthProvider(auth);
   * const phoneInfoOptions = {
   *   phoneNumber: phoneNumber,
   *   session: multiFactorSession
   * };
   * const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, appVerifier);
   *
   * // Obtain verification code from user.
   * const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
   * const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
   * await multiFactorUser.enroll(multiFactorAssertion);
   * ```
   *
   * @returns The promise that resolves with the {@link MultiFactorSession}.
   */
  getSession(): Promise<MultiFactorSession>;
  /**
   *
   * Enrolls a second factor as identified by the {@link MultiFactorAssertion} for the
   * user. On resolution, the user tokens are updated to reflect the change in the JWT payload.
   * Accepts an additional display name parameter used to identify the second factor to the end
   * user. Recent re-authentication is required for this operation to succeed. On successful
   * enrollment, existing Firebase sessions (refresh tokens) are revoked. When a new factor is
   * enrolled, an email notification is sent to the user’s email.
   *
   * @example
   * ```javascript
   * const multiFactorUser = multiFactor(auth.currentUser);
   * const multiFactorSession = await multiFactorUser.getSession();
   *
   * // Send verification code
   * const phoneAuthProvider = new PhoneAuthProvider(auth);
   * const phoneInfoOptions = {
   *   phoneNumber: phoneNumber,
   *   session: multiFactorSession
   * };
   * const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, appVerifier);
   *
   * // Obtain verification code from user.
   * const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
   * const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
   * await multiFactorUser.enroll(multiFactorAssertion);
   * // Second factor enrolled.
   * ```
   *
   * @param assertion - The multi-factor assertion to enroll with.
   * @param displayName - The display name of the second factor.
   */
  enroll(
    assertion: MultiFactorAssertion,
    displayName?: string | null
  ): Promise<void>;
  /**
   * Unenrolls the specified second factor. To specify the factor to remove, pass a
   * {@link MultiFactorInfo} object (retrieved from {@link MultiFactorUser.enrolledFactors}) or the
   * factor's UID string. Sessions are not revoked when the account is unenrolled. An email
   * notification is likely to be sent to the user notifying them of the change. Recent
   * re-authentication is required for this operation to succeed. When an existing factor is
   * unenrolled, an email notification is sent to the user’s email.
   *
   * @example
   * ```javascript
   * const multiFactorUser = multiFactor(auth.currentUser);
   * // Present user the option to choose which factor to unenroll.
   * await multiFactorUser.unenroll(multiFactorUser.enrolledFactors[i])
   * ```
   *
   * @param option - The multi-factor option to unenroll.
   * @returns - A promise which resolves when the unenroll operation is complete.
   */
  unenroll(option: MultiFactorInfo | string): Promise<void>;
}

/**
 * The class for asserting ownership of a phone second factor. Provided by
 * {@link PhoneMultiFactorGenerator.assertion}.
 *
 * @public
 */
export interface PhoneMultiFactorAssertion extends MultiFactorAssertion {}

/**
 * The class used to initialize a {@link PhoneMultiFactorAssertion}.
 *
 * @public
 */
export abstract class PhoneMultiFactorGenerator {
  /**
   * The identifier of the phone second factor: {@link ProviderId.PHONE}.
   */
  static FACTOR_ID: ProviderId;
  /**
   * Provides a {@link PhoneMultiFactorAssertion} to confirm ownership of the phone second factor.
   *
   * @param phoneAuthCredential - A credential provided by {@link PhoneAuthProvider.credential}.
   * @returns A {@link PhoneMultiFactorAssertion} which can be used with {@link MultiFactorResolver.resolveSignIn}
   */
  static assertion(
    phoneAuthCredential: PhoneAuthCredential
  ): PhoneMultiFactorAssertion;
}

/**
 * The information required to verify the ownership of a phone number. The information that's
 * required depends on whether you are doing single-factor sign-in, multi-factor enrollment or
 * multi-factor sign-in.
 *
 * @public
 */
export type PhoneInfoOptions =
  | PhoneSingleFactorInfoOptions
  | PhoneMultiFactorEnrollInfoOptions
  | PhoneMultiFactorSignInInfoOptions;

/**
 * Options used for single-factor sign-in.
 *
 * @public
 */
export interface PhoneSingleFactorInfoOptions {
  /** Phone number to send a verification code to. */
  phoneNumber: string;
}

/**
 * Options used for enrolling a second-factor.
 *
 * @public
 */
export interface PhoneMultiFactorEnrollInfoOptions {
  /** Phone number to send a verification code to. */
  phoneNumber: string;
  /** The {@link MultiFactorSession} obtained via {@link MultiFactorUser.getSession}. */
  session: MultiFactorSession;
}
/**
 * Options used for signing-in with a second-factor.
 *
 * @public
 */
export interface PhoneMultiFactorSignInInfoOptions {
  /**
   * The {@link MultiFactorInfo} obtained via {@link MultiFactorResolver.hints}.
   *
   * One of `multiFactorHint` or `multiFactorUid` is required.
   */
  multiFactorHint?: MultiFactorInfo;
  /**
   * The uid of the second-factor.
   *
   * One of `multiFactorHint` or `multiFactorUid` is required.
   */
  multiFactorUid?: string;
  /** The {@link MultiFactorSession} obtained via {@link MultiFactorResolver.session}. */
  session: MultiFactorSession;
}

/**
 * Interface for a supplied AsyncStorage.
 *
 * @public
 */
export interface ReactNativeAsyncStorage {
  /**
   * Persist an item in storage.
   *
   * @param key - storage key.
   * @param value - storage value.
   */
  setItem(key: string, value: string): Promise<void>;
  /**
   * Retrieve an item from storage.
   *
   * @param key - storage key.
   */
  getItem(key: string): Promise<string | null>;
  /**
   * Remove an item from storage.
   *
   * @param key - storage key.
   */
  removeItem(key: string): Promise<void>;
}

/**
 * A user account.
 *
 * @public
 */
export interface User extends UserInfo {
  /**
   * Whether the email has been verified with `sendEmailVerification` and `applyActionCode`.
   */
  readonly emailVerified: boolean;
  /**
   * Whether the user is authenticated using the {@link ProviderId.ANONYMOUS} provider.
   */
  readonly isAnonymous: boolean;
  /**
   * Additional metadata around user creation and sign-in times.
   */
  readonly metadata: UserMetadata;
  /**
   * Additional per provider such as displayName and profile information.
   */
  readonly providerData: UserInfo[];
  /**
   * Refresh token used to reauthenticate the user. Avoid using this directly and prefer
   * {@link User.getIdToken()} to refresh the ID token instead.
   */
  readonly refreshToken: string;
  /**
   * The user's tenant ID. This is a read-only property, which indicates the tenant ID
   * used to sign in the user. This is null if the user is signed in from the parent
   * project.
   *
   * @example
   * ```javascript
   * // Set the tenant ID on Auth instance.
   * auth.tenantId = 'TENANT_PROJECT_ID';
   *
   * // All future sign-in request now include tenant ID.
   * const result = await signInWithEmailAndPassword(auth, email, password);
   * // result.user.tenantId should be 'TENANT_PROJECT_ID'.
   * ```
   */
  readonly tenantId: string | null;
  /**
   * Deletes and signs out the user.
   *
   * Important: this is a security-sensitive operation that requires the user to have recently
   * signed in. If this requirement isn't met, ask the user to authenticate again and then call
   * one of the reauthentication methods like `reauthenticateWithCredential`.
   */
  delete(): Promise<void>;
  /**
   * Returns a JSON Web Token (JWT) used to identify the user to a Firebase service.
   *
   * Returns the current token if it has not expired. Otherwise, this will refresh the token and
   * return a new one.
   *
   * @param forceRefresh - Force refresh regardless of token expiration.
   */
  getIdToken(forceRefresh?: boolean): Promise<string>;
  /**
   * Returns a de-serialized JSON Web Token (JWT) used to identitfy the user to a Firebase service.
   *
   * Returns the current token if it has not expired. Otherwise, this will refresh the token and
   * return a new one.
   *
   * @param forceRefresh - Force refresh regardless of token expiration.
   */
  getIdTokenResult(forceRefresh?: boolean): Promise<IdTokenResult>;
  /**
   * Refreshes the user, if signed in.
   */
  reload(): Promise<void>;
  /**
   * Returns a JSON-serializable representation of this object.
   *
   * @returns A JSON-serializable representation of this object.
   */
  toJSON(): object;
}

/**
 * A structure containing a {@link User}, an {@link AuthCredential}, the {@link OperationType},
 * and any additional user information that was returned from the identity provider. `operationType`
 * could be {@link OperationType.SIGN_IN} for a sign-in operation, {@link OperationType.LINK} for a
 * linking operation and {@link OperationType.REAUTHENTICATE} for a reauthentication operation.
 *
 * @public
 */
export interface UserCredential {
  /**
   * The user authenticated by this credential.
   */
  user: User;
  /**
   * The provider which was used to authenticate the user.
   */
  providerId: ProviderId | null;
  /**
   * The type of operation which was used to authenticate the user (such as sign-in or link).
   */
  operationType: OperationType;
}

/**
 * User profile information, visible only to the Firebase project's apps.
 *
 * @public
 */
export interface UserInfo {
  /**
   * The display name of the user.
   */
  readonly displayName: string | null;
  /**
   * The email of the user.
   */
  readonly email: string | null;
  /**
   * The phone number normalized based on the E.164 standard (e.g. +16505550101) for the
   * user. This is null if the user has no phone credential linked to the account.
   */
  readonly phoneNumber: string | null;
  /**
   * The profile photo URL of the user
   */
  readonly photoURL: string | null;
  /**
   * The provider used to authenticate the user.
   */
  readonly providerId: string;
  /**
   * The user's unique ID, scoped to the project.
   */
  readonly uid: string;
}

/**
 * Interface representing a user's metadata.
 *
 * @public
 */
export interface UserMetadata {
  /** Time the user was created. */
  readonly creationTime?: string;
  /** Time the user last signed in. */
  readonly lastSignInTime?: string;
}

/**
 * A structure containing additional user information from a federated identity provider.
 *
 * @public
 */
export interface AdditionalUserInfo {
  /**
   * Whether the user is new (created via sign-up) or existing (authenticated using sign-in).
   */
  readonly isNewUser: boolean;
  /**
   * Map containing IDP-specific user data.
   */
  readonly profile: UserProfile | null;
  /**
   * Identifier for the provider used to authenticate this user.
   */
  readonly providerId: ProviderId | null;
  /**
   * The username if the provider is GitHub or Twitter.
   */
  readonly username?: string | null;
}

/**
 * User profile used in {@link AdditionalUserInfo}.
 *
 * @public
 */
export type UserProfile = Record<string, unknown>;

/**
 * A resolver used for handling DOM specific operations like `signInWithPopup()` or
 * `signInWithRedirect()`
 *
 * @public
 */
export interface PopupRedirectResolver {}

declare module '@firebase/component' {
  interface NameServiceMapping {
    'auth-exp': Auth;
  }
}
