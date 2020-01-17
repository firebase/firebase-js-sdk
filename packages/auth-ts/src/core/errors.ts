import { ErrorFactory, ErrorMap } from '@firebase/util';

/*
 * Developer facing Firebase Auth error codes.
 */
export const enum AuthError {
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
  DYNAMIC_LINK_NOT_ACTIVATED = 'dynamic-link-not-activated',
  EMAIL_EXISTS = 'email-already-in-use',
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
  INVALID_IDP_RESPONSE = 'invalid-credential',
  INVALID_MESSAGE_PAYLOAD = 'invalid-message-payload',
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
  MISSING_ANDROID_PACKAGE_NAME = 'missing-android-pkg-name',
  MISSING_APP_CREDENTIAL = 'missing-app-credential',
  MISSING_AUTH_DOMAIN = 'auth-domain-config-required',
  MISSING_CODE = 'missing-verification-code',
  MISSING_CONTINUE_URI = 'missing-continue-uri',
  MISSING_IFRAME_START = 'missing-iframe-start',
  MISSING_IOS_BUNDLE_ID = 'missing-ios-bundle-id',
  MISSING_OR_INVALID_NONCE = 'missing-or-invalid-nonce',
  MISSING_PHONE_NUMBER = 'missing-phone-number',
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
  TENANT_ID_MISMATCH = 'tenant-id-mismatch',
  TIMEOUT = 'timeout',
  TOKEN_EXPIRED = 'user-token-expired',
  TOO_MANY_ATTEMPTS_TRY_LATER = 'too-many-requests',
  UNAUTHORIZED_DOMAIN = 'unauthorized-continue-uri',
  UNSUPPORTED_PERSISTENCE = 'unsupported-persistence-type',
  UNSUPPORTED_TENANT_OPERATION = 'unsupported-tenant-operation',
  USER_CANCELLED = 'user-cancelled',
  USER_DELETED = 'user-not-found',
  USER_DISABLED = 'user-disabled',
  USER_MISMATCH = 'user-mismatch',
  USER_SIGNED_OUT = 'user-signed-out',
  WEAK_PASSWORD = 'weak-password',
  WEB_STORAGE_UNSUPPORTED = 'web-storage-unsupported'
}

const ERRORS: ErrorMap<AuthError> = {
  [AuthError.ADMIN_ONLY_OPERATION]:
    'This operation is restricted to administrators only.',
  [AuthError.ARGUMENT_ERROR]: '',
  [AuthError.APP_NOT_AUTHORIZED]:
    "This app]: identified by the domain where it's hosted]: is not " +
    'authorized to use Firebase Authentication with the provided API key. ' +
    'Review your key configuration in the Google API console.',
  [AuthError.APP_NOT_INSTALLED]:
    'The requested mobile application corresponding to the identifier (' +
    'Android package name or iOS bundle ID) provided is not installed on ' +
    'this device.',
  [AuthError.CAPTCHA_CHECK_FAILED]:
    'The reCAPTCHA response token provided is either invalid]: expired]: ' +
    'already used or the domain associated with it does not match the list ' +
    'of whitelisted domains.',
  [AuthError.CODE_EXPIRED]:
    'The SMS code has expired. Please re-send the verification code to try ' +
    'again.',
  [AuthError.CORDOVA_NOT_READY]: 'Cordova framework is not ready.',
  [AuthError.CORS_UNSUPPORTED]: 'This browser is not supported.',
  [AuthError.CREDENTIAL_ALREADY_IN_USE]:
    'This credential is already associated with a different user account.',
  [AuthError.CREDENTIAL_MISMATCH]:
    'The custom token corresponds to a different audience.',
  [AuthError.CREDENTIAL_TOO_OLD_LOGIN_AGAIN]:
    'This operation is sensitive and requires recent authentication. Log in ' +
    'again before retrying this request.',
  [AuthError.DYNAMIC_LINK_NOT_ACTIVATED]:
    'Please activate ' +
    'Dynamic Links in the Firebase Console and agree to the terms and ' +
    'conditions.',
  [AuthError.EMAIL_EXISTS]:
    'The email address is already in use by another account.',
  [AuthError.EXPIRED_OOB_CODE]: 'The action code has expired. ',
  [AuthError.EXPIRED_POPUP_REQUEST]:
    'This operation has been cancelled due to another conflicting popup ' +
    'being opened.',
  [AuthError.INTERNAL_ERROR]: 'An internal AuthError has occurred.',
  [AuthError.INVALID_APP_CREDENTIAL]:
    'The phone verification request contains an invalid application verifier.' +
    ' The reCAPTCHA token response is either invalid or expired.',
  [AuthError.INVALID_APP_ID]:
    'The mobile app identifier is not registed for the current project.',
  [AuthError.INVALID_AUTH]:
    "This user's credential isn't valid for this project. This can happen " +
    "if the user's token has been tampered with]: or if the user isn't for " +
    'the project associated with this API key.',
  [AuthError.INVALID_AUTH_EVENT]: 'An internal AuthError has occurred.',
  [AuthError.INVALID_CODE]:
    'The SMS verification code used to create the phone auth credential is ' +
    'invalid. Please resend the verification code sms and be sure use the ' +
    'verification code provided by the user.',
  [AuthError.INVALID_CONTINUE_URI]:
    'The continue URL provided in the request is invalid.',
  [AuthError.INVALID_CORDOVA_CONFIGURATION]:
    'The following' +
    ' Cordova plugins must be installed to enable OAuth sign-in= ' +
    'cordova-plugin-buildinfo]: cordova-universal-links-plugin]: ' +
    'cordova-plugin-browsertab]: cordova-plugin-inappbrowser and ' +
    'cordova-plugin-customurlscheme.',
  [AuthError.INVALID_CUSTOM_TOKEN]:
    'The custom token format is incorrect. Please check the documentation.',
  [AuthError.INVALID_DYNAMIC_LINK_DOMAIN]:
    'The provided ' +
    'dynamic link domain is not configured or authorized for the current ' +
    'project.',
  [AuthError.INVALID_EMAIL]: 'The email address is badly formatted.',
  [AuthError.INVALID_API_KEY]:
    'Your API key is invalid]: please check you have copied it correctly.',
  [AuthError.INVALID_CERT_HASH]:
    'The SHA-1 certificate hash provided is invalid.',
  [AuthError.INVALID_IDP_RESPONSE]:
    'The supplied auth credential is malformed or has expired.',
  [AuthError.INVALID_MESSAGE_PAYLOAD]:
    'The email template corresponding to this action contains invalid charac' +
    'ters in its message. Please fix by going to the Auth email templates se' +
    'ction in the Firebase Console.',
  [AuthError.INVALID_OAUTH_PROVIDER]:
    'EmailAuthProvider is not supported for this operation. This operation ' +
    'only supports OAuth providers.',
  [AuthError.INVALID_OAUTH_CLIENT_ID]:
    'The OAuth client ID provided is either invalid or does not match the ' +
    'specified API key.',
  [AuthError.INVALID_ORIGIN]:
    'This domain is not authorized for OAuth operations for your Firebase ' +
    'project. Edit the list of authorized domains from the Firebase console.',
  [AuthError.INVALID_OOB_CODE]:
    'The action code is invalid. This can happen if the code is malformed]: ' +
    'expired]: or has already been used.',
  [AuthError.INVALID_PASSWORD]:
    'The password is invalid or the user does not have a password.',
  [AuthError.INVALID_PERSISTENCE]:
    'The specified persistence type is invalid. It can only be local]: ' +
    'session or none.',
  [AuthError.INVALID_PHONE_NUMBER]:
    'The format of the phone number provided is incorrect. Please enter the ' +
    'phone number in a format that can be parsed into E.164 format. E.164 ' +
    'phone numbers are written in the format [+,[country code,[subscriber ' +
    'number including area code,.',
  [AuthError.INVALID_PROVIDER_ID]: 'The specified provider ID is invalid.',
  [AuthError.INVALID_RECIPIENT_EMAIL]:
    'The email corresponding to this action failed to send as the provided ' +
    'recipient email address is invalid.',
  [AuthError.INVALID_SENDER]:
    'The email template corresponding to this action contains an invalid sen' +
    'der email or name. Please fix by going to the Auth email templates sect' +
    'ion in the Firebase Console.',
  [AuthError.INVALID_SESSION_INFO]:
    'The verification ID used to create the phone auth credential is invalid.',
  [AuthError.INVALID_TENANT_ID]: "The Auth instance's tenant ID is invalid.",
  [AuthError.MISSING_ANDROID_PACKAGE_NAME]:
    'An Android ' +
    'Package Name must be provided if the Android App is required to be ' +
    'installed.',
  [AuthError.MISSING_AUTH_DOMAIN]:
    'Be sure to include authDomain when calling firebase.initializeApp()]: ' +
    'by following the instructions in the Firebase console.',
  [AuthError.MISSING_APP_CREDENTIAL]:
    'The phone verification request is missing an application verifier ' +
    'assertion. A reCAPTCHA response token needs to be provided.',
  [AuthError.MISSING_CODE]:
    'The phone auth credential was created with an empty SMS verification ' +
    'code.',
  [AuthError.MISSING_CONTINUE_URI]:
    'A continue URL must be provided in the request.',
  [AuthError.MISSING_IFRAME_START]: 'An internal AuthError has occurred.',
  [AuthError.MISSING_IOS_BUNDLE_ID]:
    'An iOS Bundle ID must be provided if an App Store ID is provided.',
  [AuthError.MISSING_OR_INVALID_NONCE]:
    'The request does not contain a valid nonce. This can occur if the ' +
    'SHA-256 hash of the provided raw nonce does not match the hashed nonce ' +
    'in the ID token payload.',
  [AuthError.MISSING_PHONE_NUMBER]:
    'To send verification codes]: provide a phone number for the recipient.',
  [AuthError.MISSING_SESSION_INFO]:
    'The phone auth credential was created with an empty verification ID.',
  [AuthError.MODULE_DESTROYED]:
    'This instance of FirebaseApp has been deleted.',
  [AuthError.NEED_CONFIRMATION]:
    'An account already exists with the same email address but different ' +
    'sign-in credentials. Sign in using a provider associated with this ' +
    'email address.',
  [AuthError.NETWORK_REQUEST_FAILED]:
    'A network AuthError (such as timeout]: interrupted connection or ' +
    'unreachable host) has occurred.',
  [AuthError.NO_AUTH_EVENT]: 'An internal AuthError has occurred.',
  [AuthError.NO_SUCH_PROVIDER]:
    'User was not linked to an account with the given provider.',
  [AuthError.NULL_USER]:
    'A null user object was provided as the argument for an operation which ' +
    'requires a non-null user object.',
  [AuthError.OPERATION_NOT_ALLOWED]:
    'The given sign-in provider is disabled for this Firebase project. ' +
    'Enable it in the Firebase console]: under the sign-in method tab of the ' +
    'Auth section.',
  [AuthError.OPERATION_NOT_SUPPORTED]:
    'This operation is not supported in the environment this application is ' +
    'running on. "location.protocol" must be http]: https or chrome-extension' +
    ' and web storage must be enabled.',
  [AuthError.POPUP_BLOCKED]:
    'Unable to establish a connection with the popup. It may have been ' +
    'blocked by the browser.',
  [AuthError.POPUP_CLOSED_BY_USER]:
    'The popup has been closed by the user before finalizing the operation.',
  [AuthError.PROVIDER_ALREADY_LINKED]:
    'User can only be linked to one identity for the given provider.',
  [AuthError.QUOTA_EXCEEDED]:
    "The project's quota for this operation has been exceeded.",
  [AuthError.REDIRECT_CANCELLED_BY_USER]:
    'The redirect operation has been cancelled by the user before finalizing.',
  [AuthError.REDIRECT_OPERATION_PENDING]:
    'A redirect sign-in operation is already pending.',
  [AuthError.REJECTED_CREDENTIAL]:
    'The request contains malformed or mismatching credentials.',
  [AuthError.TENANT_ID_MISMATCH]:
    "The provided tenant ID does not match the Auth instance's tenant ID",
  [AuthError.TIMEOUT]: 'The operation has timed out.',
  [AuthError.TOKEN_EXPIRED]:
    "The user's credential is no longer valid. The user must sign in again.",
  [AuthError.TOO_MANY_ATTEMPTS_TRY_LATER]:
    'We have blocked all requests from this device due to unusual activity. ' +
    'Try again later.',
  [AuthError.UNAUTHORIZED_DOMAIN]:
    'The domain of the continue URL is not whitelisted.  Please whitelist ' +
    'the domain in the Firebase console.',
  [AuthError.UNSUPPORTED_PERSISTENCE]:
    'The current environment does not support the specified persistence type.',
  [AuthError.UNSUPPORTED_TENANT_OPERATION]:
    'This operation is not supported in a multi-tenant context.',
  [AuthError.USER_CANCELLED]:
    'The user did not grant your application the permissions it requested.',
  [AuthError.USER_DELETED]:
    'There is no user record corresponding to this identifier. The user may ' +
    'have been deleted.',
  [AuthError.USER_DISABLED]:
    'The user account has been disabled by an administrator.',
  [AuthError.USER_MISMATCH]:
    'The supplied credentials do not correspond to the previously signed in ' +
    'user.',
  [AuthError.USER_SIGNED_OUT]: '',
  [AuthError.WEAK_PASSWORD]: 'The password must be 6 characters long or more.',
  [AuthError.WEB_STORAGE_UNSUPPORTED]:
    'This browser is not supported or 3rd party cookies and data may be ' +
    'disabled.'
};

type AuthErrorParams = { [key in AuthError]: { appName: string } };

export const AUTH_ERROR_FACTORY = new ErrorFactory<AuthError, AuthErrorParams>(
  'auth',
  'Firebase',
  ERRORS
);
