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
export { initializeAuth } from './src/core/auth/auth_impl';

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

// core/credentials
export { OAuthCredential } from './src/core/credentials/oauth';

// core/persistence
export { inMemoryPersistence } from './src/core/persistence/in_memory';
export { indexedDBLocalPersistence } from './src/core/persistence/indexed_db';

// core/providers
export { EmailAuthProvider } from './src/core/providers/email';
export { GoogleAuthProvider } from './src/core/providers/google';
export { OAuthProvider } from './src/core/providers/oauth';
export { PhoneAuthProvider } from './src/core/providers/phone';

// core/strategies
export { signInAnonymously } from './src/core/strategies/anonymous';
export {
  signInWithCredential,
  linkWithCredential,
  reauthenticateWithCredential
} from './src/core/strategies/credential';
export { signInWithCustomToken } from './src/core/strategies/custom_token';
export {
  sendPasswordResetEmail,
  confirmPasswordReset,
  applyActionCode,
  checkActionCode,
  verifyPasswordResetCode,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from './src/core/strategies/email_and_password';
export {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from './src/core/strategies/email_link';
export {
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  verifyBeforeUpdateEmail
} from './src/core/strategies/email';

// core
export { ActionCodeURL, parseActionCodeURL } from './src/core/action_code_url';

// core/user
export {
  updateProfile,
  updateEmail,
  updatePassword
} from './src/core/user/account_info';
export { getIdToken, getIdTokenResult } from './src/core/user/id_token_result';
export { unlink } from './src/core/user/link_unlink';

// Non-optional user methods.
export { reload } from './src/core/user/reload';
export async function deleteUser(user: externs.User): Promise<void> {
  return user.delete();
}

// MFA
export { PhoneMultiFactorGenerator } from './src/mfa/assertions/phone';
export { getMultiFactorResolver } from './src/mfa/mfa_resolver';
export { multiFactor } from './src/mfa/mfa_user';
