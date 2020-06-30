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

import * as externs from '@firebase/auth-types-exp';
import { CompleteFn, ErrorFn, Unsubscribe } from '@firebase/util';

// core/auth
export { initializeAuth } from './core/auth/auth_impl';

// Non-optional auth methods.
export function setPersistence(
  auth: externs.Auth,
  persistence: externs.Persistence
): void {
  auth.setPersistence(persistence);
}
export function onIdTokenChanged(
  auth: externs.Auth,
  nextOrObserver: externs.NextOrObserver<externs.User>,
  error?: ErrorFn,
  completed?: CompleteFn
): Unsubscribe {
  return auth.onIdTokenChanged(nextOrObserver, error, completed);
}
export function onAuthStateChanged(
  auth: externs.Auth,
  nextOrObserver: externs.NextOrObserver<externs.User>,
  error?: ErrorFn,
  completed?: CompleteFn
): Unsubscribe {
  return auth.onAuthStateChanged(nextOrObserver, error, completed);
}
export function useDeviceLanguage(auth: externs.Auth): void {
  auth.useDeviceLanguage();
}
export function signOut(auth: externs.Auth): Promise<void> {
  return auth.signOut();
}

// core/persistence
export {
  browserLocalPersistence,
  browserSessionPersistence
} from './core/persistence/browser';
export { inMemoryPersistence } from './core/persistence/in_memory';
export { indexedDBLocalPersistence } from './core/persistence/indexed_db';
export { getReactNativePersistence } from './core/persistence/react_native';

// core/providers
export { EmailAuthProvider } from './core/providers/email';
export { PhoneAuthProvider } from './core/providers/phone';

// core/strategies
export { signInAnonymously } from './core/strategies/anonymous';
export {
  signInWithCredential,
  linkWithCredential,
  reauthenticateWithCredential
} from './core/strategies/credential';
export { signInWithCustomToken } from './core/strategies/custom_token';
export {
  sendPasswordResetEmail,
  confirmPasswordReset,
  applyActionCode,
  checkActionCode,
  verifyPasswordResetCode,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from './core/strategies/email_and_password';
export {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from './core/strategies/email_link';
export {
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  verifyBeforeUpdateEmail
} from './core/strategies/email';
export {
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  reauthenticateWithPhoneNumber
} from './core/strategies/phone';

// core
export { ActionCodeURL, parseActionCodeURL } from './core/action_code_url';

// core/user
export {
  updateProfile,
  updateEmail,
  updatePassword
} from './core/user/account_info';
export { getIdToken, getIdTokenResult } from './core/user/id_token_result';
export { unlink } from './core/user/link_unlink';

export { RecaptchaVerifier } from './platform_browser/recaptcha/recaptcha_verifier';

// Non-optional user methods.
export { reload } from './core/user/reload';
export async function deleteUser(user: externs.User): Promise<void> {
  return user.delete();
}

// MFA
export { PhoneMultiFactorGenerator } from './mfa/assertions/phone';
export { getMultiFactorResolver } from './mfa/mfa_resolver';
export { multiFactor } from './mfa/mfa_user';
export { BrowserPopupRedirectResolver } from './platform_browser/popup_redirect';
export { signInWithPopup } from './core/strategies/popup';
export { OAuthProvider } from './core/providers/oauth';
