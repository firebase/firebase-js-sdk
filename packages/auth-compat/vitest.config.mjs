/**
 * @license
 * Copyright 2026 Google LLC
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

import createBaseConfig from '../../config/vitest.base.mjs';

const AuthEventType = {
  LINK_VIA_POPUP: 'linkViaPopup',
  LINK_VIA_REDIRECT: 'linkViaRedirect',
  REAUTH_VIA_POPUP: 'reauthViaPopup',
  REAUTH_VIA_REDIRECT: 'reauthViaRedirect',
  SIGN_IN_VIA_POPUP: 'signInViaPopup',
  SIGN_IN_VIA_REDIRECT: 'signInViaRedirect',
  UNKNOWN: 'unknown',
  VERIFY_APP: 'verifyApp'
};

const AuthErrorCode = {
  ADMIN_ONLY_OPERATION: 'admin-restricted-operation',
  ARGUMENT_ERROR: 'argument-error',
  APP_NOT_AUTHORIZED: 'app-not-authorized',
  APP_NOT_INSTALLED: 'app-not-installed',
  CAPTCHA_CHECK_FAILED: 'captcha-check-failed',
  CODE_EXPIRED: 'code-expired',
  CORDOVA_NOT_READY: 'cordova-not-ready',
  CORS_UNSUPPORTED: 'cors-unsupported',
  CREDENTIAL_ALREADY_IN_USE: 'credential-already-in-use',
  CREDENTIAL_MISMATCH: 'custom-token-mismatch',
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN: 'requires-recent-login',
  DEPENDENT_SDK_INIT_BEFORE_AUTH: 'dependent-sdk-initialized-before-auth',
  DYNAMIC_LINK_NOT_ACTIVATED: 'dynamic-link-not-activated',
  EMAIL_CHANGE_NEEDS_VERIFICATION: 'email-change-needs-verification',
  EMAIL_EXISTS: 'email-already-in-use',
  EMULATOR_CONFIG_FAILED: 'emulator-config-failed',
  EXPIRED_OOB_CODE: 'expired-action-code',
  EXPIRED_POPUP_REQUEST: 'cancelled-popup-request',
  INTERNAL_ERROR: 'internal-error',
  INVALID_API_KEY: 'invalid-api-key',
  INVALID_APP_CREDENTIAL: 'invalid-app-credential',
  INVALID_APP_ID: 'invalid-app-id',
  INVALID_AUTH: 'invalid-user-token',
  INVALID_AUTH_EVENT: 'invalid-auth-event',
  INVALID_CERT_HASH: 'invalid-cert-hash',
  INVALID_CODE: 'invalid-verification-code',
  INVALID_CONTINUE_URI: 'invalid-continue-uri',
  INVALID_CORDOVA_CONFIGURATION: 'invalid-cordova-configuration',
  INVALID_CUSTOM_TOKEN: 'invalid-custom-token',
  INVALID_DYNAMIC_LINK_DOMAIN: 'invalid-dynamic-link-domain',
  INVALID_EMAIL: 'invalid-email',
  INVALID_EMULATOR_SCHEME: 'invalid-emulator-scheme',
  INVALID_CREDENTIAL: 'invalid-credential',
  INVALID_MESSAGE_PAYLOAD: 'invalid-message-payload',
  INVALID_MFA_SESSION: 'invalid-multi-factor-session',
  INVALID_OAUTH_CLIENT_ID: 'invalid-oauth-client-id',
  INVALID_OAUTH_PROVIDER: 'invalid-oauth-provider',
  INVALID_OOB_CODE: 'invalid-action-code',
  INVALID_ORIGIN: 'unauthorized-domain',
  INVALID_PASSWORD: 'wrong-password',
  INVALID_PERSISTENCE: 'invalid-persistence-type',
  INVALID_PHONE_NUMBER: 'invalid-phone-number',
  INVALID_PROVIDER_ID: 'invalid-provider-id',
  INVALID_RECIPIENT_EMAIL: 'invalid-recipient-email',
  INVALID_SENDER: 'invalid-sender',
  INVALID_SESSION_INFO: 'invalid-verification-id',
  INVALID_TENANT_ID: 'invalid-tenant-id',
  LOGIN_BLOCKED: 'login-blocked',
  MFA_INFO_NOT_FOUND: 'multi-factor-info-not-found',
  MFA_REQUIRED: 'multi-factor-auth-required',
  MISSING_ANDROID_PACKAGE_NAME: 'missing-android-pkg-name',
  MISSING_APP_CREDENTIAL: 'missing-app-credential',
  MISSING_AUTH_DOMAIN: 'auth-domain-config-required',
  MISSING_CODE: 'missing-verification-code',
  MISSING_CONTINUE_URI: 'missing-continue-uri',
  MISSING_IFRAME_START: 'missing-iframe-start',
  MISSING_IOS_BUNDLE_ID: 'missing-ios-bundle-id',
  MISSING_OR_INVALID_NONCE: 'missing-or-invalid-nonce',
  MISSING_MFA_INFO: 'missing-multi-factor-info',
  MISSING_MFA_SESSION: 'missing-multi-factor-session',
  MISSING_PHONE_NUMBER: 'missing-phone-number',
  MISSING_PASSWORD: 'missing-password',
  MISSING_SESSION_INFO: 'missing-verification-id',
  MODULE_DESTROYED: 'app-deleted',
  NEED_CONFIRMATION: 'account-exists-with-different-credential',
  NETWORK_REQUEST_FAILED: 'network-request-failed',
  NULL_USER: 'null-user',
  NO_AUTH_EVENT: 'no-auth-event',
  NO_SUCH_PROVIDER: 'no-such-provider',
  OPERATION_NOT_ALLOWED: 'operation-not-allowed',
  OPERATION_NOT_SUPPORTED: 'operation-not-supported-in-this-environment',
  POPUP_BLOCKED: 'popup-blocked',
  POPUP_CLOSED_BY_USER: 'popup-closed-by-user',
  PROVIDER_ALREADY_LINKED: 'provider-already-linked',
  QUOTA_EXCEEDED: 'quota-exceeded',
  REDIRECT_CANCELLED_BY_USER: 'redirect-cancelled-by-user',
  REDIRECT_OPERATION_PENDING: 'redirect-operation-pending',
  REJECTED_CREDENTIAL: 'rejected-credential',
  SECOND_FACTOR_ALREADY_ENROLLED: 'second-factor-already-enrolled',
  SECOND_FACTOR_REQUIRED: 'second-factor-required',
  TIMEOUT: 'timeout',
  TOKEN_EXPIRED: 'user-token-expired',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'too-many-requests',
  TOP_LEVEL_NAVIGATION_UNSUPPORTED: 'top-level-navigation-unsupported',
  UNAUTHORIZED_DOMAIN: 'unauthorized-continue-uri',
  UNSUPPORTED_FIRST_FACTOR: 'unsupported-first-factor',
  UNSUPPORTED_PERSISTENCE: 'unsupported-persistence-type',
  UNSUPPORTED_TENANT_OPERATION: 'unsupported-tenant-operation',
  UNVERIFIED_EMAIL: 'unverified-email',
  USER_CANCELLED: 'user-cancelled',
  USER_DELETED: 'user-not-found',
  USER_DISABLED: 'user-disabled',
  USER_MISMATCH: 'user-mismatch',
  USER_SIGNED_OUT: 'user-signed-out',
  WEAK_PASSWORD: 'weak-password',
  WEB_STORAGE_UNSUPPORTED: 'web-storage-unsupported',
  ALREADY_INITIALIZED: 'already-initialized',
  RECAPTCHA_NOT_ENABLED: 'recaptcha-not-enabled',
  MISSING_RECAPTCHA_TOKEN: 'missing-recaptcha-token',
  INVALID_RECAPTCHA_TOKEN: 'invalid-recaptcha-token',
  INVALID_RECAPTCHA_ACTION: 'invalid-recaptcha-action',
  MISSING_CLIENT_TYPE: 'missing-client-type',
  MISSING_RECAPTCHA_VERSION: 'missing-recaptcha-version',
  INVALID_RECAPTCHA_VERSION: 'invalid-recaptcha-version',
  INVALID_REQ_TYPE: 'invalid-req-type',
  INVALID_HOSTING_LINK_DOMAIN: 'invalid-hosting-link-domain'
};

function authInternalPlugin() {
  return {
    name: 'auth-internal-const-enums',
    transform(code, id) {
      if (id.includes('auth') && id.includes('internal')) {
        return {
          code: code + `\nexport const AuthErrorCode = ${JSON.stringify(AuthErrorCode)};\nexport const AuthEventType = ${JSON.stringify(AuthEventType)};\n`,
          map: null
        };
      }
    }
  };
}

const config = createBaseConfig(import.meta.url, {
  plugins: [authInternalPlugin()]
});

for (const project of config.test.projects) {
  project.plugins = [...(project.plugins || []), authInternalPlugin()];
  if (project.test.name === 'node') {
    project.test.exclude = [
      ...(project.test.exclude || []),
      'test/integration/**'
    ];
  } else if (project.test.name === 'browser') {
    project.test.exclude = [
      ...(project.test.exclude || []),
      'test/integration/**'
    ];
  }
}

export default config;
