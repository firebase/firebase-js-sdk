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
/**
 * Changes the type of persistence on the Auth instance for the currently saved
 * Auth session and applies this type of persistence for future sign-in requests, including
 * sign-in with redirect requests.
 *
 * @remarks
 * This makes it easy for a user signing in to specify whether their session should be
 * remembered or not. It also makes it easier to never persist the Auth state for applications
 * that are shared by other users or have sensitive data.
 *
 * @example
 * ```javascript
 * setPersistence(auth, browserSessionPersistence);
 * ```
 *
 * @param auth - The Auth instance.
 * @param persistence - The {@link @firebase/auth-types#Persistence} to use.
 *
 * @public
 */
export function setPersistence(
  auth: externs.Auth,
  persistence: externs.Persistence
): void {
  auth.setPersistence(persistence);
}
/**
 * Adds an observer for changes to the signed-in user's ID token, which includes sign-in,
 * sign-out, and token refresh events.
 *
 * @param auth - The Auth instance.
 * @param nextOrObserver - callback triggered on change.
 * @param error - callback triggered on error.
 * @param completed - callback triggered when observer is removed.
 *
 * @public
 */
export function onIdTokenChanged(
  auth: externs.Auth,
  nextOrObserver: externs.NextOrObserver<externs.User>,
  error?: ErrorFn,
  completed?: CompleteFn
): Unsubscribe {
  return auth.onIdTokenChanged(nextOrObserver, error, completed);
}
/**
 * Adds an observer for changes to the user's sign-in state.
 *
 * @remarks
 * To keep the old behavior, see {@link onIdTokenChanged}.
 *
 * @param auth - The Auth instance.
 * @param nextOrObserver - callback triggered on change.
 * @param error - callback triggered on error.
 * @param completed - callback triggered when observer is removed.
 *
 * @public
 */
export function onAuthStateChanged(
  auth: externs.Auth,
  nextOrObserver: externs.NextOrObserver<externs.User>,
  error?: ErrorFn,
  completed?: CompleteFn
): Unsubscribe {
  return auth.onAuthStateChanged(nextOrObserver, error, completed);
}
/**
 * Sets the current language to the default device/browser preference.
 *
 * @param auth - The Auth instanec.
 *
 * @public
 */
export function useDeviceLanguage(auth: externs.Auth): void {
  auth.useDeviceLanguage();
}
/**
 * Asynchronously sets the provided user as {@link @firebase/auth-types#Auth.currentUser} on the
 * {@link @firebase/auth-types#Auth} instance.
 *
 * @remarks
 * A new instance copy of the user provided will be made and set as currentUser.
 *
 * This will trigger {@link onAuthStateChanged} and {@link onIdTokenChanged} listeners
 * like other sign in methods.
 *
 * The operation fails with an error if the user to be updated belongs to a different Firebase
 * project.
 *
 * @param auth - The Auth instance.
 * @param user - The new {@link @firebase/auth-types#User}.
 *
 * @public
 */
export function updateCurrentUser(
  auth: externs.Auth,
  user: externs.User | null
): Promise<void> {
  return auth.updateCurrentUser(user);
}
/**
 * Signs out the current user.
 *
 * @param auth - The Auth instance.
 *
 * @public
 */
export function signOut(auth: externs.Auth): Promise<void> {
  return auth.signOut();
}

export { initializeAuth } from './auth/initialize';

// credentials
export { AuthCredential } from './credentials';
export { EmailAuthCredential } from './credentials/email';
export { OAuthCredential } from './credentials/oauth';
export { PhoneAuthCredential } from './credentials/phone';

// persistence
export { inMemoryPersistence } from './persistence/in_memory';

// providers
export { EmailAuthProvider } from './providers/email';
export { FacebookAuthProvider } from './providers/facebook';
export { GoogleAuthProvider } from './providers/google';
export { GithubAuthProvider } from './providers/github';
export {
  OAuthProvider,
  CustomParameters,
  OAuthCredentialOptions
} from './providers/oauth';
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
export { getAdditionalUserInfo } from './user/additional_user_info';

// Non-optional user methods.
export { reload } from './user/reload';
/**
 * Deletes and signs out the user.
 *
 * @remarks
 * Important: this is a security-sensitive operation that requires the user to have recently
 * signed in. If this requirement isn't met, ask the user to authenticate again and then call
 * {@link reauthenticateWithCredential}.
 *
 * @param user - The user.
 *
 * @public
 */
export async function deleteUser(user: externs.User): Promise<void> {
  return user.delete();
}
