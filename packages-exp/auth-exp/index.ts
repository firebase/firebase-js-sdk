/**
 * Firebase Authentication
 *
 * @packageDocumentation
 */

/**
 * @license
 * Copyright 2017 Google LLC
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

import { FirebaseApp, getApp, _getProvider } from '@firebase/app-exp';

import { initializeAuth } from './src';
import { registerAuth } from './src/core/auth/register';
import { ClientPlatform } from './src/core/util/version';
import { browserLocalPersistence } from './src/platform_browser/persistence/local_storage';
import { indexedDBLocalPersistence } from './src/platform_browser/persistence/indexed_db';
import { browserPopupRedirectResolver } from './src/platform_browser/popup_redirect';
import { Auth } from './src/model/public_types';

// Public types
export {
  // Interfaces
  ActionCodeInfo,
  ActionCodeSettings,
  AdditionalUserInfo,
  ApplicationVerifier,
  Auth,
  AuthError,
  AuthErrorMap,
  AuthProvider,
  AuthSettings,
  Config,
  ConfirmationResult,
  IdTokenResult,
  MultiFactorAssertion,
  MultiFactorError,
  MultiFactorInfo,
  MultiFactorResolver,
  MultiFactorSession,
  MultiFactorUser,
  ParsedToken,
  Persistence,
  PhoneMultiFactorAssertion,
  PhoneMultiFactorEnrollInfoOptions,
  PhoneMultiFactorSignInInfoOptions,
  PhoneSingleFactorInfoOptions,
  PopupRedirectResolver,
  ReactNativeAsyncStorage,
  User,
  UserCredential,
  UserInfo,
  UserMetadata,
  UserProfile,
  PhoneInfoOptions,
  Dependencies,
  NextOrObserver,
  ErrorFn,
  CompleteFn,
  Unsubscribe
} from './src/model/public_types';

// Helper maps (not used internally)
export {
  FactorId,
  ProviderId,
  SignInMethod,
  OperationType,
  ActionCodeOperation
} from './src/model/enum_maps';

// Core functionality shared by all clients
export * from './src';

// Additional DOM dependend functionality

// persistence
export { browserLocalPersistence } from './src/platform_browser/persistence/local_storage';
export { browserSessionPersistence } from './src/platform_browser/persistence/session_storage';
export { indexedDBLocalPersistence } from './src/platform_browser/persistence/indexed_db';

// providers
export { PhoneAuthProvider } from './src/platform_browser/providers/phone';

// strategies
export {
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  reauthenticateWithPhoneNumber,
  updatePhoneNumber
} from './src/platform_browser/strategies/phone';
export {
  signInWithPopup,
  linkWithPopup,
  reauthenticateWithPopup
} from './src/platform_browser/strategies/popup';
export {
  signInWithRedirect,
  linkWithRedirect,
  reauthenticateWithRedirect,
  getRedirectResult
} from './src/platform_browser/strategies/redirect';

export { RecaptchaVerifier } from './src/platform_browser/recaptcha/recaptcha_verifier';
export { browserPopupRedirectResolver } from './src/platform_browser/popup_redirect';

// MFA
export { PhoneMultiFactorGenerator } from './src/platform_browser/mfa/assertions/phone';

/**
 * Initializes an Auth instance with platform specific default dependencies.
 *
 * @param app - The Firebase App.
 *
 * @public
 */
export function getAuth(app: FirebaseApp = getApp()): Auth {
  const provider = _getProvider(app, 'auth-exp');

  if (provider.isInitialized()) {
    return provider.getImmediate();
  }

  return initializeAuth(app, {
    popupRedirectResolver: browserPopupRedirectResolver,
    persistence: [indexedDBLocalPersistence, browserLocalPersistence]
  });
}

registerAuth(ClientPlatform.BROWSER);
