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

import { AuthErrorCode } from '../core/errors';

/**
 * Errors that can be returned by the backend
 */
export const enum ServerError {
  ADMIN_ONLY_OPERATION = 'ADMIN_ONLY_OPERATION',
  CAPTCHA_CHECK_FAILED = 'CAPTCHA_CHECK_FAILED',
  CORS_UNSUPPORTED = 'CORS_UNSUPPORTED',
  CREDENTIAL_MISMATCH = 'CREDENTIAL_MISMATCH',
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN = 'CREDENTIAL_TOO_OLD_LOGIN_AGAIN',
  DYNAMIC_LINK_NOT_ACTIVATED = 'DYNAMIC_LINK_NOT_ACTIVATED',
  EMAIL_CHANGE_NEEDS_VERIFICATION = 'EMAIL_CHANGE_NEEDS_VERIFICATION',
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  EMAIL_NOT_FOUND = 'EMAIL_NOT_FOUND',
  EXPIRED_OOB_CODE = 'EXPIRED_OOB_CODE',
  FEDERATED_USER_ID_ALREADY_LINKED = 'FEDERATED_USER_ID_ALREADY_LINKED',
  INVALID_APP_CREDENTIAL = 'INVALID_APP_CREDENTIAL',
  INVALID_APP_ID = 'INVALID_APP_ID',
  INVALID_CERT_HASH = 'INVALID_CERT_HASH',
  INVALID_CODE = 'INVALID_CODE',
  INVALID_CONTINUE_URI = 'INVALID_CONTINUE_URI',
  INVALID_CUSTOM_TOKEN = 'INVALID_CUSTOM_TOKEN',
  INVALID_DYNAMIC_LINK_DOMAIN = 'INVALID_DYNAMIC_LINK_DOMAIN',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_ID_TOKEN = 'INVALID_ID_TOKEN',
  INVALID_IDP_RESPONSE = 'INVALID_IDP_RESPONSE',
  INVALID_IDENTIFIER = 'INVALID_IDENTIFIER',
  INVALID_MESSAGE_PAYLOAD = 'INVALID_MESSAGE_PAYLOAD',
  INVALID_MFA_PENDING_CREDENTIAL = 'INVALID_MFA_PENDING_CREDENTIAL',
  INVALID_OAUTH_CLIENT_ID = 'INVALID_OAUTH_CLIENT_ID',
  INVALID_OOB_CODE = 'INVALID_OOB_CODE',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  INVALID_PENDING_TOKEN = 'INVALID_PENDING_TOKEN',
  INVALID_PHONE_NUMBER = 'INVALID_PHONE_NUMBER',
  INVALID_PROVIDER_ID = 'INVALID_PROVIDER_ID',
  INVALID_RECIPIENT_EMAIL = 'INVALID_RECIPIENT_EMAIL',
  INVALID_SENDER = 'INVALID_SENDER',
  INVALID_SESSION_INFO = 'INVALID_SESSION_INFO',
  INVALID_TEMPORARY_PROOF = 'INVALID_TEMPORARY_PROOF',
  INVALID_TENANT_ID = 'INVALID_TENANT_ID',
  MFA_ENROLLMENT_NOT_FOUND = 'MFA_ENROLLMENT_NOT_FOUND',
  MISSING_ANDROID_PACKAGE_NAME = 'MISSING_ANDROID_PACKAGE_NAME',
  MISSING_APP_CREDENTIAL = 'MISSING_APP_CREDENTIAL',
  MISSING_CODE = 'MISSING_CODE',
  MISSING_CONTINUE_URI = 'MISSING_CONTINUE_URI',
  MISSING_CUSTOM_TOKEN = 'MISSING_CUSTOM_TOKEN',
  MISSING_IOS_BUNDLE_ID = 'MISSING_IOS_BUNDLE_ID',
  MISSING_MFA_ENROLLMENT_ID = 'MISSING_MFA_ENROLLMENT_ID',
  MISSING_MFA_PENDING_CREDENTIAL = 'MISSING_MFA_PENDING_CREDENTIAL',
  MISSING_OOB_CODE = 'MISSING_OOB_CODE',
  MISSING_OR_INVALID_NONCE = 'MISSING_OR_INVALID_NONCE',
  MISSING_PASSWORD = 'MISSING_PASSWORD',
  MISSING_REQ_TYPE = 'MISSING_REQ_TYPE',
  MISSING_PHONE_NUMBER = 'MISSING_PHONE_NUMBER',
  MISSING_SESSION_INFO = 'MISSING_SESSION_INFO',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  PASSWORD_LOGIN_DISABLED = 'PASSWORD_LOGIN_DISABLED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RESET_PASSWORD_EXCEED_LIMIT = 'RESET_PASSWORD_EXCEED_LIMIT',
  REJECTED_CREDENTIAL = 'REJECTED_CREDENTIAL',
  SECOND_FACTOR_EXISTS = 'SECOND_FACTOR_EXISTS',
  SECOND_FACTOR_LIMIT_EXCEEDED = 'SECOND_FACTOR_LIMIT_EXCEEDED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  TENANT_ID_MISMATCH = 'TENANT_ID_MISMATCH',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOO_MANY_ATTEMPTS_TRY_LATER = 'TOO_MANY_ATTEMPTS_TRY_LATER',
  UNSUPPORTED_FIRST_FACTOR = 'UNSUPPORTED_FIRST_FACTOR',
  UNSUPPORTED_TENANT_OPERATION = 'UNSUPPORTED_TENANT_OPERATION',
  UNAUTHORIZED_DOMAIN = 'UNAUTHORIZED_DOMAIN',
  UNVERIFIED_EMAIL = 'UNVERIFIED_EMAIL',
  USER_CANCELLED = 'USER_CANCELLED',
  USER_DISABLED = 'USER_DISABLED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  WEAK_PASSWORD = 'WEAK_PASSWORD'
}

/**
 * API Response in the event of an error
 */
export interface JsonError {
  error: {
    code: number;
    message: string;
    errors?: [
      {
        message: ServerError;
        domain: string;
        reason: string;
      }
    ];
  };
}

/**
 * Type definition for a map from server errors to developer visible errors
 */
export declare type ServerErrorMap<ApiError extends string> = {
  readonly [K in ApiError]: AuthErrorCode;
};

/**
 * Map from errors returned by the server to errors to developer visible errors
 */
export const SERVER_ERROR_MAP: Partial<ServerErrorMap<ServerError>> = {
  // Custom token errors.
  [ServerError.CREDENTIAL_MISMATCH]: AuthErrorCode.CREDENTIAL_MISMATCH,
  // This can only happen if the SDK sends a bad request.
  [ServerError.MISSING_CUSTOM_TOKEN]: AuthErrorCode.INTERNAL_ERROR,

  // Create Auth URI errors.
  [ServerError.INVALID_IDENTIFIER]: AuthErrorCode.INVALID_EMAIL,
  // This can only happen if the SDK sends a bad request.
  [ServerError.MISSING_CONTINUE_URI]: AuthErrorCode.INTERNAL_ERROR,

  // Sign in with email and password errors (some apply to sign up too).
  [ServerError.INVALID_PASSWORD]: AuthErrorCode.INVALID_PASSWORD,
  // This can only happen if the SDK sends a bad request.
  [ServerError.MISSING_PASSWORD]: AuthErrorCode.INTERNAL_ERROR,

  // Sign up with email and password errors.
  [ServerError.EMAIL_EXISTS]: AuthErrorCode.EMAIL_EXISTS,
  [ServerError.PASSWORD_LOGIN_DISABLED]: AuthErrorCode.OPERATION_NOT_ALLOWED,

  // Verify assertion for sign in with credential errors:
  [ServerError.INVALID_IDP_RESPONSE]: AuthErrorCode.INVALID_IDP_RESPONSE,
  [ServerError.INVALID_PENDING_TOKEN]: AuthErrorCode.INVALID_IDP_RESPONSE,
  [ServerError.FEDERATED_USER_ID_ALREADY_LINKED]:
    AuthErrorCode.CREDENTIAL_ALREADY_IN_USE,

  // This can only happen if the SDK sends a bad request.
  [ServerError.MISSING_REQ_TYPE]: AuthErrorCode.INTERNAL_ERROR,

  // Send Password reset email errors:
  [ServerError.EMAIL_NOT_FOUND]: AuthErrorCode.USER_DELETED,
  [ServerError.RESET_PASSWORD_EXCEED_LIMIT]:
    AuthErrorCode.TOO_MANY_ATTEMPTS_TRY_LATER,

  [ServerError.EXPIRED_OOB_CODE]: AuthErrorCode.EXPIRED_OOB_CODE,
  [ServerError.INVALID_OOB_CODE]: AuthErrorCode.INVALID_OOB_CODE,
  // This can only happen if the SDK sends a bad request.
  [ServerError.MISSING_OOB_CODE]: AuthErrorCode.INTERNAL_ERROR,

  // Operations that require ID token in request:
  [ServerError.CREDENTIAL_TOO_OLD_LOGIN_AGAIN]:
    AuthErrorCode.CREDENTIAL_TOO_OLD_LOGIN_AGAIN,
  [ServerError.INVALID_ID_TOKEN]: AuthErrorCode.INVALID_AUTH,
  [ServerError.TOKEN_EXPIRED]: AuthErrorCode.TOKEN_EXPIRED,
  [ServerError.USER_NOT_FOUND]: AuthErrorCode.TOKEN_EXPIRED,

  // Other errors.
  [ServerError.TOO_MANY_ATTEMPTS_TRY_LATER]:
    AuthErrorCode.TOO_MANY_ATTEMPTS_TRY_LATER,

  // Phone Auth related errors.
  [ServerError.INVALID_CODE]: AuthErrorCode.INVALID_CODE,
  [ServerError.INVALID_SESSION_INFO]: AuthErrorCode.INVALID_SESSION_INFO,
  [ServerError.INVALID_TEMPORARY_PROOF]: AuthErrorCode.INVALID_IDP_RESPONSE,
  [ServerError.MISSING_SESSION_INFO]: AuthErrorCode.MISSING_SESSION_INFO,
  [ServerError.SESSION_EXPIRED]: AuthErrorCode.CODE_EXPIRED,

  // Other action code errors when additional settings passed.
  // MISSING_CONTINUE_URI is getting mapped to INTERNAL_ERROR above.
  // This is OK as this error will be caught by client side validation.
  [ServerError.MISSING_ANDROID_PACKAGE_NAME]:
    AuthErrorCode.MISSING_ANDROID_PACKAGE_NAME,
  [ServerError.UNAUTHORIZED_DOMAIN]: AuthErrorCode.UNAUTHORIZED_DOMAIN,

  // getProjectConfig errors when clientId is passed.
  [ServerError.INVALID_OAUTH_CLIENT_ID]: AuthErrorCode.INVALID_OAUTH_CLIENT_ID,

  // User actions (sign-up or deletion) disabled errors.
  [ServerError.ADMIN_ONLY_OPERATION]: AuthErrorCode.ADMIN_ONLY_OPERATION,

  // Multi factor related errors.
  [ServerError.INVALID_MFA_PENDING_CREDENTIAL]:
    AuthErrorCode.INVALID_MFA_SESSION,
  [ServerError.MFA_ENROLLMENT_NOT_FOUND]: AuthErrorCode.MFA_INFO_NOT_FOUND,
  [ServerError.MISSING_MFA_ENROLLMENT_ID]: AuthErrorCode.MISSING_MFA_INFO,
  [ServerError.MISSING_MFA_PENDING_CREDENTIAL]:
    AuthErrorCode.MISSING_MFA_SESSION,
  [ServerError.SECOND_FACTOR_EXISTS]:
    AuthErrorCode.SECOND_FACTOR_ALREADY_ENROLLED,
  [ServerError.SECOND_FACTOR_LIMIT_EXCEEDED]:
    AuthErrorCode.SECOND_FACTOR_LIMIT_EXCEEDED
};
