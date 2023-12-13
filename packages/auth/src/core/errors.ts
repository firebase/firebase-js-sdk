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

import { AuthErrorMap, User } from '../model/public_types';
import { ErrorFactory, ErrorMap } from '@firebase/util';

import { IdTokenMfaResponse } from '../api/authentication/mfa';
import { AppName } from '../model/auth';
import { AuthCredential } from './credentials';

/**
 * Enumeration of Firebase Auth error codes.
 *
 * @internal
 */
export const enum AuthErrorCode {
  ADMIN_ONLY_OPERATION = 'admin-restricted-operation',
  ARGUMENT_ERROR = 'argument-error',
  APP_NOT_AUTHORIZED = 'app-not-authorized',
  APP_NOT_INSTALLED = 'app-not-installed',
  CAPTCHA_CHECK_FAILED = 'captcha-check-failed',
  CODE_EXPIRED = 'code-expired',
  CORDOVA_NOT_READY = 'cordova-not-ready',
  CORS_UNSUPPORTED = 'cors-unsupported',
  CREDENTIAL_ALREADY_IN_USE = 'credential-already-in-use',
  CREDENTIAL_MISMATCH = 'custom-token-mismatch',
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN = 'requires-recent-login',
  DEPENDENT_SDK_INIT_BEFORE_AUTH = 'dependent-sdk-initialized-before-auth',
  DYNAMIC_LINK_NOT_ACTIVATED = 'dynamic-link-not-activated',
  EMAIL_CHANGE_NEEDS_VERIFICATION = 'email-change-needs-verification',
  EMAIL_EXISTS = 'email-already-in-use',
  EMULATOR_CONFIG_FAILED = 'emulator-config-failed',
  EXPIRED_OOB_CODE = 'expired-action-code',
  EXPIRED_POPUP_REQUEST = 'cancelled-popup-request',
  INTERNAL_ERROR = 'internal-error',
  INVALID_API_KEY = 'invalid-api-key',
  INVALID_APP_CREDENTIAL = 'invalid-app-credential',
  INVALID_APP_ID = 'invalid-app-id',
  INVALID_AUTH = 'invalid-user-token',
  INVALID_AUTH_EVENT = 'invalid-auth-event',
  INVALID_CERT_HASH = 'invalid-cert-hash',
  INVALID_CODE = 'invalid-verification-code',
  INVALID_CONTINUE_URI = 'invalid-continue-uri',
  INVALID_CORDOVA_CONFIGURATION = 'invalid-cordova-configuration',
  INVALID_CUSTOM_TOKEN = 'invalid-custom-token',
  INVALID_DYNAMIC_LINK_DOMAIN = 'invalid-dynamic-link-domain',
  INVALID_EMAIL = 'invalid-email',
  INVALID_EMULATOR_SCHEME = 'invalid-emulator-scheme',
  INVALID_CREDENTIAL = 'invalid-credential',
  INVALID_MESSAGE_PAYLOAD = 'invalid-message-payload',
  INVALID_MFA_SESSION = 'invalid-multi-factor-session',
  INVALID_OAUTH_CLIENT_ID = 'invalid-oauth-client-id',
  INVALID_OAUTH_PROVIDER = 'invalid-oauth-provider',
  INVALID_OOB_CODE = 'invalid-action-code',
  INVALID_ORIGIN = 'unauthorized-domain',
  INVALID_PASSWORD = 'wrong-password',
  INVALID_PERSISTENCE = 'invalid-persistence-type',
  INVALID_PHONE_NUMBER = 'invalid-phone-number',
  INVALID_PROVIDER_ID = 'invalid-provider-id',
  INVALID_RECIPIENT_EMAIL = 'invalid-recipient-email',
  INVALID_SENDER = 'invalid-sender',
  INVALID_SESSION_INFO = 'invalid-verification-id',
  INVALID_TENANT_ID = 'invalid-tenant-id',
  LOGIN_BLOCKED = 'login-blocked',
  MFA_INFO_NOT_FOUND = 'multi-factor-info-not-found',
  MFA_REQUIRED = 'multi-factor-auth-required',
  MISSING_ANDROID_PACKAGE_NAME = 'missing-android-pkg-name',
  MISSING_APP_CREDENTIAL = 'missing-app-credential',
  MISSING_AUTH_DOMAIN = 'auth-domain-config-required',
  MISSING_CODE = 'missing-verification-code',
  MISSING_CONTINUE_URI = 'missing-continue-uri',
  MISSING_IFRAME_START = 'missing-iframe-start',
  MISSING_IOS_BUNDLE_ID = 'missing-ios-bundle-id',
  MISSING_OR_INVALID_NONCE = 'missing-or-invalid-nonce',
  MISSING_MFA_INFO = 'missing-multi-factor-info',
  MISSING_MFA_SESSION = 'missing-multi-factor-session',
  MISSING_PHONE_NUMBER = 'missing-phone-number',
  MISSING_PASSWORD = 'missing-password',
  MISSING_SESSION_INFO = 'missing-verification-id',
  MODULE_DESTROYED = 'app-deleted',
  NEED_CONFIRMATION = 'account-exists-with-different-credential',
  NETWORK_REQUEST_FAILED = 'network-request-failed',
  NULL_USER = 'null-user',
  NO_AUTH_EVENT = 'no-auth-event',
  NO_SUCH_PROVIDER = 'no-such-provider',
  OPERATION_NOT_ALLOWED = 'operation-not-allowed',
  OPERATION_NOT_SUPPORTED = 'operation-not-supported-in-this-environment',
  POPUP_BLOCKED = 'popup-blocked',
  POPUP_CLOSED_BY_USER = 'popup-closed-by-user',
  PROVIDER_ALREADY_LINKED = 'provider-already-linked',
  QUOTA_EXCEEDED = 'quota-exceeded',
  REDIRECT_CANCELLED_BY_USER = 'redirect-cancelled-by-user',
  REDIRECT_OPERATION_PENDING = 'redirect-operation-pending',
  REJECTED_CREDENTIAL = 'rejected-credential',
  SECOND_FACTOR_ALREADY_ENROLLED = 'second-factor-already-in-use',
  SECOND_FACTOR_LIMIT_EXCEEDED = 'maximum-second-factor-count-exceeded',
  TENANT_ID_MISMATCH = 'tenant-id-mismatch',
  TIMEOUT = 'timeout',
  TOKEN_EXPIRED = 'user-token-expired',
  TOO_MANY_ATTEMPTS_TRY_LATER = 'too-many-requests',
  UNAUTHORIZED_DOMAIN = 'unauthorized-continue-uri',
  UNSUPPORTED_FIRST_FACTOR = 'unsupported-first-factor',
  UNSUPPORTED_PERSISTENCE = 'unsupported-persistence-type',
  UNSUPPORTED_TENANT_OPERATION = 'unsupported-tenant-operation',
  UNVERIFIED_EMAIL = 'unverified-email',
  USER_CANCELLED = 'user-cancelled',
  USER_DELETED = 'user-not-found',
  USER_DISABLED = 'user-disabled',
  USER_MISMATCH = 'user-mismatch',
  USER_SIGNED_OUT = 'user-signed-out',
  WEAK_PASSWORD = 'weak-password',
  WEB_STORAGE_UNSUPPORTED = 'web-storage-unsupported',
  ALREADY_INITIALIZED = 'already-initialized',
  RECAPTCHA_NOT_ENABLED = 'recaptcha-not-enabled',
  MISSING_RECAPTCHA_TOKEN = 'missing-recaptcha-token',
  INVALID_RECAPTCHA_TOKEN = 'invalid-recaptcha-token',
  INVALID_RECAPTCHA_ACTION = 'invalid-recaptcha-action',
  MISSING_CLIENT_TYPE = 'missing-client-type',
  MISSING_RECAPTCHA_VERSION = 'missing-recaptcha-version',
  INVALID_RECAPTCHA_VERSION = 'invalid-recaptcha-version',
  INVALID_REQ_TYPE = 'invalid-req-type',
  UNSUPPORTED_PASSWORD_POLICY_SCHEMA_VERSION = 'unsupported-password-policy-schema-version',
  PASSWORD_DOES_NOT_MEET_REQUIREMENTS = 'password-does-not-meet-requirements'
}

function _debugErrorMap(): ErrorMap<AuthErrorCode> {
  return {
    [AuthErrorCode.ADMIN_ONLY_OPERATION]:
      'This operation is restricted to administrators only.',
    [AuthErrorCode.ARGUMENT_ERROR]: '',
    [AuthErrorCode.APP_NOT_AUTHORIZED]:
      "This app, identified by the domain where it's hosted, is not " +
      'authorized to use Firebase Authentication with the provided API key. ' +
      'Review your key configuration in the Google API console.',
    [AuthErrorCode.APP_NOT_INSTALLED]:
      'The requested mobile application corresponding to the identifier (' +
      'Android package name or iOS bundle ID) provided is not installed on ' +
      'this device.',
    [AuthErrorCode.CAPTCHA_CHECK_FAILED]:
      'The reCAPTCHA response token provided is either invalid, expired, ' +
      'already used or the domain associated with it does not match the list ' +
      'of whitelisted domains.',
    [AuthErrorCode.CODE_EXPIRED]:
      'The SMS code has expired. Please re-send the verification code to try ' +
      'again.',
    [AuthErrorCode.CORDOVA_NOT_READY]: 'Cordova framework is not ready.',
    [AuthErrorCode.CORS_UNSUPPORTED]: 'This browser is not supported.',
    [AuthErrorCode.CREDENTIAL_ALREADY_IN_USE]:
      'This credential is already associated with a different user account.',
    [AuthErrorCode.CREDENTIAL_MISMATCH]:
      'The custom token corresponds to a different audience.',
    [AuthErrorCode.CREDENTIAL_TOO_OLD_LOGIN_AGAIN]:
      'This operation is sensitive and requires recent authentication. Log in ' +
      'again before retrying this request.',
    [AuthErrorCode.DEPENDENT_SDK_INIT_BEFORE_AUTH]:
      'Another Firebase SDK was initialized and is trying to use Auth before Auth is ' +
      'initialized. Please be sure to call `initializeAuth` or `getAuth` before ' +
      'starting any other Firebase SDK.',
    [AuthErrorCode.DYNAMIC_LINK_NOT_ACTIVATED]:
      'Please activate Dynamic Links in the Firebase Console and agree to the terms and ' +
      'conditions.',
    [AuthErrorCode.EMAIL_CHANGE_NEEDS_VERIFICATION]:
      'Multi-factor users must always have a verified email.',
    [AuthErrorCode.EMAIL_EXISTS]:
      'The email address is already in use by another account.',
    [AuthErrorCode.EMULATOR_CONFIG_FAILED]:
      'Auth instance has already been used to make a network call. Auth can ' +
      'no longer be configured to use the emulator. Try calling ' +
      '"connectAuthEmulator()" sooner.',
    [AuthErrorCode.EXPIRED_OOB_CODE]: 'The action code has expired.',
    [AuthErrorCode.EXPIRED_POPUP_REQUEST]:
      'This operation has been cancelled due to another conflicting popup being opened.',
    [AuthErrorCode.INTERNAL_ERROR]: 'An internal AuthError has occurred.',
    [AuthErrorCode.INVALID_APP_CREDENTIAL]:
      'The phone verification request contains an invalid application verifier.' +
      ' The reCAPTCHA token response is either invalid or expired.',
    [AuthErrorCode.INVALID_APP_ID]:
      'The mobile app identifier is not registed for the current project.',
    [AuthErrorCode.INVALID_AUTH]:
      "This user's credential isn't valid for this project. This can happen " +
      "if the user's token has been tampered with, or if the user isn't for " +
      'the project associated with this API key.',
    [AuthErrorCode.INVALID_AUTH_EVENT]: 'An internal AuthError has occurred.',
    [AuthErrorCode.INVALID_CODE]:
      'The SMS verification code used to create the phone auth credential is ' +
      'invalid. Please resend the verification code sms and be sure to use the ' +
      'verification code provided by the user.',
    [AuthErrorCode.INVALID_CONTINUE_URI]:
      'The continue URL provided in the request is invalid.',
    [AuthErrorCode.INVALID_CORDOVA_CONFIGURATION]:
      'The following Cordova plugins must be installed to enable OAuth sign-in: ' +
      'cordova-plugin-buildinfo, cordova-universal-links-plugin, ' +
      'cordova-plugin-browsertab, cordova-plugin-inappbrowser and ' +
      'cordova-plugin-customurlscheme.',
    [AuthErrorCode.INVALID_CUSTOM_TOKEN]:
      'The custom token format is incorrect. Please check the documentation.',
    [AuthErrorCode.INVALID_DYNAMIC_LINK_DOMAIN]:
      'The provided dynamic link domain is not configured or authorized for the current project.',
    [AuthErrorCode.INVALID_EMAIL]: 'The email address is badly formatted.',
    [AuthErrorCode.INVALID_EMULATOR_SCHEME]:
      'Emulator URL must start with a valid scheme (http:// or https://).',
    [AuthErrorCode.INVALID_API_KEY]:
      'Your API key is invalid, please check you have copied it correctly.',
    [AuthErrorCode.INVALID_CERT_HASH]:
      'The SHA-1 certificate hash provided is invalid.',
    [AuthErrorCode.INVALID_CREDENTIAL]:
      'The supplied auth credential is incorrect, malformed or has expired.',
    [AuthErrorCode.INVALID_MESSAGE_PAYLOAD]:
      'The email template corresponding to this action contains invalid characters in its message. ' +
      'Please fix by going to the Auth email templates section in the Firebase Console.',
    [AuthErrorCode.INVALID_MFA_SESSION]:
      'The request does not contain a valid proof of first factor successful sign-in.',
    [AuthErrorCode.INVALID_OAUTH_PROVIDER]:
      'EmailAuthProvider is not supported for this operation. This operation ' +
      'only supports OAuth providers.',
    [AuthErrorCode.INVALID_OAUTH_CLIENT_ID]:
      'The OAuth client ID provided is either invalid or does not match the ' +
      'specified API key.',
    [AuthErrorCode.INVALID_ORIGIN]:
      'This domain is not authorized for OAuth operations for your Firebase ' +
      'project. Edit the list of authorized domains from the Firebase console.',
    [AuthErrorCode.INVALID_OOB_CODE]:
      'The action code is invalid. This can happen if the code is malformed, ' +
      'expired, or has already been used.',
    [AuthErrorCode.INVALID_PASSWORD]:
      'The password is invalid or the user does not have a password.',
    [AuthErrorCode.INVALID_PERSISTENCE]:
      'The specified persistence type is invalid. It can only be local, session or none.',
    [AuthErrorCode.INVALID_PHONE_NUMBER]:
      'The format of the phone number provided is incorrect. Please enter the ' +
      'phone number in a format that can be parsed into E.164 format. E.164 ' +
      'phone numbers are written in the format [+][country code][subscriber ' +
      'number including area code].',
    [AuthErrorCode.INVALID_PROVIDER_ID]:
      'The specified provider ID is invalid.',
    [AuthErrorCode.INVALID_RECIPIENT_EMAIL]:
      'The email corresponding to this action failed to send as the provided ' +
      'recipient email address is invalid.',
    [AuthErrorCode.INVALID_SENDER]:
      'The email template corresponding to this action contains an invalid sender email or name. ' +
      'Please fix by going to the Auth email templates section in the Firebase Console.',
    [AuthErrorCode.INVALID_SESSION_INFO]:
      'The verification ID used to create the phone auth credential is invalid.',
    [AuthErrorCode.INVALID_TENANT_ID]:
      "The Auth instance's tenant ID is invalid.",
    [AuthErrorCode.LOGIN_BLOCKED]:
      'Login blocked by user-provided method: {$originalMessage}',
    [AuthErrorCode.MISSING_ANDROID_PACKAGE_NAME]:
      'An Android Package Name must be provided if the Android App is required to be installed.',
    [AuthErrorCode.MISSING_AUTH_DOMAIN]:
      'Be sure to include authDomain when calling firebase.initializeApp(), ' +
      'by following the instructions in the Firebase console.',
    [AuthErrorCode.MISSING_APP_CREDENTIAL]:
      'The phone verification request is missing an application verifier ' +
      'assertion. A reCAPTCHA response token needs to be provided.',
    [AuthErrorCode.MISSING_CODE]:
      'The phone auth credential was created with an empty SMS verification code.',
    [AuthErrorCode.MISSING_CONTINUE_URI]:
      'A continue URL must be provided in the request.',
    [AuthErrorCode.MISSING_IFRAME_START]: 'An internal AuthError has occurred.',
    [AuthErrorCode.MISSING_IOS_BUNDLE_ID]:
      'An iOS Bundle ID must be provided if an App Store ID is provided.',
    [AuthErrorCode.MISSING_OR_INVALID_NONCE]:
      'The request does not contain a valid nonce. This can occur if the ' +
      'SHA-256 hash of the provided raw nonce does not match the hashed nonce ' +
      'in the ID token payload.',
    [AuthErrorCode.MISSING_PASSWORD]: 'A non-empty password must be provided',
    [AuthErrorCode.MISSING_MFA_INFO]:
      'No second factor identifier is provided.',
    [AuthErrorCode.MISSING_MFA_SESSION]:
      'The request is missing proof of first factor successful sign-in.',
    [AuthErrorCode.MISSING_PHONE_NUMBER]:
      'To send verification codes, provide a phone number for the recipient.',
    [AuthErrorCode.MISSING_SESSION_INFO]:
      'The phone auth credential was created with an empty verification ID.',
    [AuthErrorCode.MODULE_DESTROYED]:
      'This instance of FirebaseApp has been deleted.',
    [AuthErrorCode.MFA_INFO_NOT_FOUND]:
      'The user does not have a second factor matching the identifier provided.',
    [AuthErrorCode.MFA_REQUIRED]:
      'Proof of ownership of a second factor is required to complete sign-in.',
    [AuthErrorCode.NEED_CONFIRMATION]:
      'An account already exists with the same email address but different ' +
      'sign-in credentials. Sign in using a provider associated with this ' +
      'email address.',
    [AuthErrorCode.NETWORK_REQUEST_FAILED]:
      'A network AuthError (such as timeout, interrupted connection or unreachable host) has occurred.',
    [AuthErrorCode.NO_AUTH_EVENT]: 'An internal AuthError has occurred.',
    [AuthErrorCode.NO_SUCH_PROVIDER]:
      'User was not linked to an account with the given provider.',
    [AuthErrorCode.NULL_USER]:
      'A null user object was provided as the argument for an operation which ' +
      'requires a non-null user object.',
    [AuthErrorCode.OPERATION_NOT_ALLOWED]:
      'The given sign-in provider is disabled for this Firebase project. ' +
      'Enable it in the Firebase console, under the sign-in method tab of the ' +
      'Auth section.',
    [AuthErrorCode.OPERATION_NOT_SUPPORTED]:
      'This operation is not supported in the environment this application is ' +
      'running on. "location.protocol" must be http, https or chrome-extension' +
      ' and web storage must be enabled.',
    [AuthErrorCode.POPUP_BLOCKED]:
      'Unable to establish a connection with the popup. It may have been blocked by the browser.',
    [AuthErrorCode.POPUP_CLOSED_BY_USER]:
      'The popup has been closed by the user before finalizing the operation.',
    [AuthErrorCode.PROVIDER_ALREADY_LINKED]:
      'User can only be linked to one identity for the given provider.',
    [AuthErrorCode.QUOTA_EXCEEDED]:
      "The project's quota for this operation has been exceeded.",
    [AuthErrorCode.REDIRECT_CANCELLED_BY_USER]:
      'The redirect operation has been cancelled by the user before finalizing.',
    [AuthErrorCode.REDIRECT_OPERATION_PENDING]:
      'A redirect sign-in operation is already pending.',
    [AuthErrorCode.REJECTED_CREDENTIAL]:
      'The request contains malformed or mismatching credentials.',
    [AuthErrorCode.SECOND_FACTOR_ALREADY_ENROLLED]:
      'The second factor is already enrolled on this account.',
    [AuthErrorCode.SECOND_FACTOR_LIMIT_EXCEEDED]:
      'The maximum allowed number of second factors on a user has been exceeded.',
    [AuthErrorCode.TENANT_ID_MISMATCH]:
      "The provided tenant ID does not match the Auth instance's tenant ID",
    [AuthErrorCode.TIMEOUT]: 'The operation has timed out.',
    [AuthErrorCode.TOKEN_EXPIRED]:
      "The user's credential is no longer valid. The user must sign in again.",
    [AuthErrorCode.TOO_MANY_ATTEMPTS_TRY_LATER]:
      'We have blocked all requests from this device due to unusual activity. ' +
      'Try again later.',
    [AuthErrorCode.UNAUTHORIZED_DOMAIN]:
      'The domain of the continue URL is not whitelisted.  Please whitelist ' +
      'the domain in the Firebase console.',
    [AuthErrorCode.UNSUPPORTED_FIRST_FACTOR]:
      'Enrolling a second factor or signing in with a multi-factor account requires sign-in with a supported first factor.',
    [AuthErrorCode.UNSUPPORTED_PERSISTENCE]:
      'The current environment does not support the specified persistence type.',
    [AuthErrorCode.UNSUPPORTED_TENANT_OPERATION]:
      'This operation is not supported in a multi-tenant context.',
    [AuthErrorCode.UNVERIFIED_EMAIL]:
      'The operation requires a verified email.',
    [AuthErrorCode.USER_CANCELLED]:
      'The user did not grant your application the permissions it requested.',
    [AuthErrorCode.USER_DELETED]:
      'There is no user record corresponding to this identifier. The user may ' +
      'have been deleted.',
    [AuthErrorCode.USER_DISABLED]:
      'The user account has been disabled by an administrator.',
    [AuthErrorCode.USER_MISMATCH]:
      'The supplied credentials do not correspond to the previously signed in user.',
    [AuthErrorCode.USER_SIGNED_OUT]: '',
    [AuthErrorCode.WEAK_PASSWORD]:
      'The password must be 6 characters long or more.',
    [AuthErrorCode.WEB_STORAGE_UNSUPPORTED]:
      'This browser is not supported or 3rd party cookies and data may be disabled.',
    [AuthErrorCode.ALREADY_INITIALIZED]:
      'initializeAuth() has already been called with ' +
      'different options. To avoid this error, call initializeAuth() with the ' +
      'same options as when it was originally called, or call getAuth() to return the' +
      ' already initialized instance.',
    [AuthErrorCode.MISSING_RECAPTCHA_TOKEN]:
      'The reCAPTCHA token is missing when sending request to the backend.',
    [AuthErrorCode.INVALID_RECAPTCHA_TOKEN]:
      'The reCAPTCHA token is invalid when sending request to the backend.',
    [AuthErrorCode.INVALID_RECAPTCHA_ACTION]:
      'The reCAPTCHA action is invalid when sending request to the backend.',
    [AuthErrorCode.RECAPTCHA_NOT_ENABLED]:
      'reCAPTCHA Enterprise integration is not enabled for this project.',
    [AuthErrorCode.MISSING_CLIENT_TYPE]:
      'The reCAPTCHA client type is missing when sending request to the backend.',
    [AuthErrorCode.MISSING_RECAPTCHA_VERSION]:
      'The reCAPTCHA version is missing when sending request to the backend.',
    [AuthErrorCode.INVALID_REQ_TYPE]: 'Invalid request parameters.',
    [AuthErrorCode.INVALID_RECAPTCHA_VERSION]:
      'The reCAPTCHA version is invalid when sending request to the backend.',
    [AuthErrorCode.UNSUPPORTED_PASSWORD_POLICY_SCHEMA_VERSION]:
      'The password policy received from the backend uses a schema version that is not supported by this version of the Firebase SDK.',
    [AuthErrorCode.PASSWORD_DOES_NOT_MEET_REQUIREMENTS]:
      'The password does not meet the requirements.'
  };
}

export interface ErrorMapRetriever extends AuthErrorMap {
  (): ErrorMap<AuthErrorCode>;
}

function _prodErrorMap(): ErrorMap<AuthErrorCode> {
  // We will include this one message in the prod error map since by the very
  // nature of this error, developers will never be able to see the message
  // using the debugErrorMap (which is installed during auth initialization).
  return {
    [AuthErrorCode.DEPENDENT_SDK_INIT_BEFORE_AUTH]:
      'Another Firebase SDK was initialized and is trying to use Auth before Auth is ' +
      'initialized. Please be sure to call `initializeAuth` or `getAuth` before ' +
      'starting any other Firebase SDK.'
  } as ErrorMap<AuthErrorCode>;
}

/**
 * A verbose error map with detailed descriptions for most error codes.
 *
 * See discussion at {@link AuthErrorMap}
 *
 * @public
 */
export const debugErrorMap: AuthErrorMap = _debugErrorMap;

/**
 * A minimal error map with all verbose error messages stripped.
 *
 * See discussion at {@link AuthErrorMap}
 *
 * @public
 */
export const prodErrorMap: AuthErrorMap = _prodErrorMap;

export interface NamedErrorParams {
  appName: AppName;
  credential?: AuthCredential;
  email?: string;
  phoneNumber?: string;
  tenantId?: string;
  user?: User;
  _serverResponse?: object;
}

/**
 * @internal
 */
type GenericAuthErrorParams = {
  [key in Exclude<
    AuthErrorCode,
    | AuthErrorCode.ARGUMENT_ERROR
    | AuthErrorCode.DEPENDENT_SDK_INIT_BEFORE_AUTH
    | AuthErrorCode.INTERNAL_ERROR
    | AuthErrorCode.MFA_REQUIRED
    | AuthErrorCode.NO_AUTH_EVENT
    | AuthErrorCode.OPERATION_NOT_SUPPORTED
  >]: {
    appName?: AppName;
    email?: string;
    phoneNumber?: string;
    message?: string;
  };
};

/**
 * @internal
 */
export interface AuthErrorParams extends GenericAuthErrorParams {
  [AuthErrorCode.ARGUMENT_ERROR]: { appName?: AppName };
  [AuthErrorCode.DEPENDENT_SDK_INIT_BEFORE_AUTH]: { appName?: AppName };
  [AuthErrorCode.INTERNAL_ERROR]: { appName?: AppName };
  [AuthErrorCode.LOGIN_BLOCKED]: {
    appName?: AppName;
    originalMessage?: string;
  };
  [AuthErrorCode.OPERATION_NOT_SUPPORTED]: { appName?: AppName };
  [AuthErrorCode.NO_AUTH_EVENT]: { appName?: AppName };
  [AuthErrorCode.MFA_REQUIRED]: {
    appName: AppName;
    _serverResponse: IdTokenMfaResponse;
  };
  [AuthErrorCode.INVALID_CORDOVA_CONFIGURATION]: {
    appName: AppName;
    missingPlugin?: string;
  };
}

export const _DEFAULT_AUTH_ERROR_FACTORY = new ErrorFactory<
  AuthErrorCode,
  AuthErrorParams
>('auth', 'Firebase', _prodErrorMap());

/**
 * A map of potential `Auth` error codes, for easier comparison with errors
 * thrown by the SDK.
 *
 * @remarks
 * Note that you can't tree-shake individual keys
 * in the map, so by using the map you might substantially increase your
 * bundle size.
 *
 * @public
 */
export const AUTH_ERROR_CODES_MAP_DO_NOT_USE_INTERNALLY = {
  ADMIN_ONLY_OPERATION: 'auth/admin-restricted-operation',
  ARGUMENT_ERROR: 'auth/argument-error',
  APP_NOT_AUTHORIZED: 'auth/app-not-authorized',
  APP_NOT_INSTALLED: 'auth/app-not-installed',
  CAPTCHA_CHECK_FAILED: 'auth/captcha-check-failed',
  CODE_EXPIRED: 'auth/code-expired',
  CORDOVA_NOT_READY: 'auth/cordova-not-ready',
  CORS_UNSUPPORTED: 'auth/cors-unsupported',
  CREDENTIAL_ALREADY_IN_USE: 'auth/credential-already-in-use',
  CREDENTIAL_MISMATCH: 'auth/custom-token-mismatch',
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN: 'auth/requires-recent-login',
  DEPENDENT_SDK_INIT_BEFORE_AUTH: 'auth/dependent-sdk-initialized-before-auth',
  DYNAMIC_LINK_NOT_ACTIVATED: 'auth/dynamic-link-not-activated',
  EMAIL_CHANGE_NEEDS_VERIFICATION: 'auth/email-change-needs-verification',
  EMAIL_EXISTS: 'auth/email-already-in-use',
  EMULATOR_CONFIG_FAILED: 'auth/emulator-config-failed',
  EXPIRED_OOB_CODE: 'auth/expired-action-code',
  EXPIRED_POPUP_REQUEST: 'auth/cancelled-popup-request',
  INTERNAL_ERROR: 'auth/internal-error',
  INVALID_API_KEY: 'auth/invalid-api-key',
  INVALID_APP_CREDENTIAL: 'auth/invalid-app-credential',
  INVALID_APP_ID: 'auth/invalid-app-id',
  INVALID_AUTH: 'auth/invalid-user-token',
  INVALID_AUTH_EVENT: 'auth/invalid-auth-event',
  INVALID_CERT_HASH: 'auth/invalid-cert-hash',
  INVALID_CODE: 'auth/invalid-verification-code',
  INVALID_CONTINUE_URI: 'auth/invalid-continue-uri',
  INVALID_CORDOVA_CONFIGURATION: 'auth/invalid-cordova-configuration',
  INVALID_CUSTOM_TOKEN: 'auth/invalid-custom-token',
  INVALID_DYNAMIC_LINK_DOMAIN: 'auth/invalid-dynamic-link-domain',
  INVALID_EMAIL: 'auth/invalid-email',
  INVALID_EMULATOR_SCHEME: 'auth/invalid-emulator-scheme',
  INVALID_IDP_RESPONSE: 'auth/invalid-credential',
  INVALID_LOGIN_CREDENTIALS: 'auth/invalid-credential',
  INVALID_MESSAGE_PAYLOAD: 'auth/invalid-message-payload',
  INVALID_MFA_SESSION: 'auth/invalid-multi-factor-session',
  INVALID_OAUTH_CLIENT_ID: 'auth/invalid-oauth-client-id',
  INVALID_OAUTH_PROVIDER: 'auth/invalid-oauth-provider',
  INVALID_OOB_CODE: 'auth/invalid-action-code',
  INVALID_ORIGIN: 'auth/unauthorized-domain',
  INVALID_PASSWORD: 'auth/wrong-password',
  INVALID_PERSISTENCE: 'auth/invalid-persistence-type',
  INVALID_PHONE_NUMBER: 'auth/invalid-phone-number',
  INVALID_PROVIDER_ID: 'auth/invalid-provider-id',
  INVALID_RECIPIENT_EMAIL: 'auth/invalid-recipient-email',
  INVALID_SENDER: 'auth/invalid-sender',
  INVALID_SESSION_INFO: 'auth/invalid-verification-id',
  INVALID_TENANT_ID: 'auth/invalid-tenant-id',
  MFA_INFO_NOT_FOUND: 'auth/multi-factor-info-not-found',
  MFA_REQUIRED: 'auth/multi-factor-auth-required',
  MISSING_ANDROID_PACKAGE_NAME: 'auth/missing-android-pkg-name',
  MISSING_APP_CREDENTIAL: 'auth/missing-app-credential',
  MISSING_AUTH_DOMAIN: 'auth/auth-domain-config-required',
  MISSING_CODE: 'auth/missing-verification-code',
  MISSING_CONTINUE_URI: 'auth/missing-continue-uri',
  MISSING_IFRAME_START: 'auth/missing-iframe-start',
  MISSING_IOS_BUNDLE_ID: 'auth/missing-ios-bundle-id',
  MISSING_OR_INVALID_NONCE: 'auth/missing-or-invalid-nonce',
  MISSING_MFA_INFO: 'auth/missing-multi-factor-info',
  MISSING_MFA_SESSION: 'auth/missing-multi-factor-session',
  MISSING_PHONE_NUMBER: 'auth/missing-phone-number',
  MISSING_SESSION_INFO: 'auth/missing-verification-id',
  MODULE_DESTROYED: 'auth/app-deleted',
  NEED_CONFIRMATION: 'auth/account-exists-with-different-credential',
  NETWORK_REQUEST_FAILED: 'auth/network-request-failed',
  NULL_USER: 'auth/null-user',
  NO_AUTH_EVENT: 'auth/no-auth-event',
  NO_SUCH_PROVIDER: 'auth/no-such-provider',
  OPERATION_NOT_ALLOWED: 'auth/operation-not-allowed',
  OPERATION_NOT_SUPPORTED: 'auth/operation-not-supported-in-this-environment',
  POPUP_BLOCKED: 'auth/popup-blocked',
  POPUP_CLOSED_BY_USER: 'auth/popup-closed-by-user',
  PROVIDER_ALREADY_LINKED: 'auth/provider-already-linked',
  QUOTA_EXCEEDED: 'auth/quota-exceeded',
  REDIRECT_CANCELLED_BY_USER: 'auth/redirect-cancelled-by-user',
  REDIRECT_OPERATION_PENDING: 'auth/redirect-operation-pending',
  REJECTED_CREDENTIAL: 'auth/rejected-credential',
  SECOND_FACTOR_ALREADY_ENROLLED: 'auth/second-factor-already-in-use',
  SECOND_FACTOR_LIMIT_EXCEEDED: 'auth/maximum-second-factor-count-exceeded',
  TENANT_ID_MISMATCH: 'auth/tenant-id-mismatch',
  TIMEOUT: 'auth/timeout',
  TOKEN_EXPIRED: 'auth/user-token-expired',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'auth/too-many-requests',
  UNAUTHORIZED_DOMAIN: 'auth/unauthorized-continue-uri',
  UNSUPPORTED_FIRST_FACTOR: 'auth/unsupported-first-factor',
  UNSUPPORTED_PERSISTENCE: 'auth/unsupported-persistence-type',
  UNSUPPORTED_TENANT_OPERATION: 'auth/unsupported-tenant-operation',
  UNVERIFIED_EMAIL: 'auth/unverified-email',
  USER_CANCELLED: 'auth/user-cancelled',
  USER_DELETED: 'auth/user-not-found',
  USER_DISABLED: 'auth/user-disabled',
  USER_MISMATCH: 'auth/user-mismatch',
  USER_SIGNED_OUT: 'auth/user-signed-out',
  WEAK_PASSWORD: 'auth/weak-password',
  WEB_STORAGE_UNSUPPORTED: 'auth/web-storage-unsupported',
  ALREADY_INITIALIZED: 'auth/already-initialized',
  RECAPTCHA_NOT_ENABLED: 'auth/recaptcha-not-enabled',
  MISSING_RECAPTCHA_TOKEN: 'auth/missing-recaptcha-token',
  INVALID_RECAPTCHA_TOKEN: 'auth/invalid-recaptcha-token',
  INVALID_RECAPTCHA_ACTION: 'auth/invalid-recaptcha-action',
  MISSING_CLIENT_TYPE: 'auth/missing-client-type',
  MISSING_RECAPTCHA_VERSION: 'auth/missing-recaptcha-version',
  INVALID_RECAPTCHA_VERSION: 'auth/invalid-recaptcha-version',
  INVALID_REQ_TYPE: 'auth/invalid-req-type'
} as const;
