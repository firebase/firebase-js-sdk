/**
 * @license
 * Copyright 2021 Google LLC
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

/**
 * An enum of factors that may be used for multifactor authentication.
 *
 * @public
 */
export const FactorId = {
  /** Phone as second factor */
  PHONE: 'phone',
  TOTP: 'totp'
} as const;

/**
 * Enumeration of supported providers.
 *
 * @public
 */
export const ProviderId = {
  /** Facebook provider ID */
  FACEBOOK: 'facebook.com',
  /** GitHub provider ID */
  GITHUB: 'github.com',
  /** Google provider ID */
  GOOGLE: 'google.com',
  /** Password provider */
  PASSWORD: 'password',
  /** Phone provider */
  PHONE: 'phone',
  /** Twitter provider ID */
  TWITTER: 'twitter.com'
} as const;

/**
 * Enumeration of supported sign-in methods.
 *
 * @public
 */
export const SignInMethod = {
  /** Email link sign in method */
  EMAIL_LINK: 'emailLink',
  /** Email/password sign in method */
  EMAIL_PASSWORD: 'password',
  /** Facebook sign in method */
  FACEBOOK: 'facebook.com',
  /** GitHub sign in method */
  GITHUB: 'github.com',
  /** Google sign in method */
  GOOGLE: 'google.com',
  /** Phone sign in method */
  PHONE: 'phone',
  /** Twitter sign in method */
  TWITTER: 'twitter.com'
} as const;

/**
 * Enumeration of supported operation types.
 *
 * @public
 */
export const OperationType = {
  /** Operation involving linking an additional provider to an already signed-in user. */
  LINK: 'link',
  /** Operation involving using a provider to reauthenticate an already signed-in user. */
  REAUTHENTICATE: 'reauthenticate',
  /** Operation involving signing in a user. */
  SIGN_IN: 'signIn'
} as const;

/**
 * An enumeration of the possible email action types.
 *
 * @public
 */
export const ActionCodeOperation = {
  /** The email link sign-in action. */
  EMAIL_SIGNIN: 'EMAIL_SIGNIN',
  /** The password reset action. */
  PASSWORD_RESET: 'PASSWORD_RESET',
  /** The email revocation action. */
  RECOVER_EMAIL: 'RECOVER_EMAIL',
  /** The revert second factor addition email action. */
  REVERT_SECOND_FACTOR_ADDITION: 'REVERT_SECOND_FACTOR_ADDITION',
  /** The revert second factor addition email action. */
  VERIFY_AND_CHANGE_EMAIL: 'VERIFY_AND_CHANGE_EMAIL',
  /** The email verification action. */
  VERIFY_EMAIL: 'VERIFY_EMAIL'
} as const;
