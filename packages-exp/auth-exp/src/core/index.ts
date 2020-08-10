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

import * as externs from '@firebase/auth-types-exp';
import { CompleteFn, ErrorFn, Unsubscribe } from '@firebase/util';

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
export function updateCurrentUser(
  auth: externs.Auth,
  user: externs.User | null
): Promise<void> {
  return auth.updateCurrentUser(user);
}
export function signOut(auth: externs.Auth): Promise<void> {
  return auth.signOut();
}

// credentials
export { OAuthCredential } from './credentials/oauth';

// persistence
export { inMemoryPersistence } from './persistence/in_memory';

// providers
export { EmailAuthProvider } from './providers/email';
export { FacebookAuthProvider } from './providers/facebook';
export { GoogleAuthProvider } from './providers/google';
export { GithubAuthProvider } from './providers/github';
export { OAuthProvider } from './providers/oauth';
export { TwitterAuthProvider } from './providers/twitter';

// strategies
export { signInAnonymously } from './strategies/anonymous';
export {
  signInWithCredential,
  linkWithCredential,
  reauthenticateWithCredential
} from './strategies/credential';
export { signInWithCustomToken } from './strategies/custom_token';
export {
  sendPasswordResetEmail,
  confirmPasswordReset,
  applyActionCode,
  checkActionCode,
  verifyPasswordResetCode,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from './strategies/email_and_password';
export {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from './strategies/email_link';
export {
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  verifyBeforeUpdateEmail
} from './strategies/email';

// core
export { ActionCodeURL, parseActionCodeURL } from './action_code_url';

// user
export {
  updateProfile,
  updateEmail,
  updatePassword
} from './user/account_info';
export { getIdToken, getIdTokenResult } from './user/id_token_result';
export { unlink } from './user/link_unlink';

// Non-optional user methods.
export { reload } from './user/reload';
export async function deleteUser(user: externs.User): Promise<void> {
  return user.delete();
}
