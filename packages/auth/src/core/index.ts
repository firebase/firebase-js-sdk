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

import { getModularInstance } from '@firebase/util';
import {
  Auth,
  NextOrObserver,
  Persistence,
  User,
  CompleteFn,
  ErrorFn,
  Unsubscribe
} from '../model/public_types';

export {
  debugErrorMap,
  prodErrorMap,
  AUTH_ERROR_CODES_MAP_DO_NOT_USE_INTERNALLY as AuthErrorCodes
} from './errors';

// Non-optional auth methods.
/**
 * Changes the type of persistence on the {@link Auth} instance for the currently saved
 * `Auth` session and applies this type of persistence for future sign-in requests, including
 * sign-in with redirect requests.
 *
 * @remarks
 * This makes it easy for a user signing in to specify whether their session should be
 * remembered or not. It also makes it easier to never persist the `Auth` state for applications
 * that are shared by other users or have sensitive data.
 *
 * @example
 * ```javascript
 * setPersistence(auth, browserSessionPersistence);
 * ```
 *
 * @param auth - The {@link Auth} instance.
 * @param persistence - The {@link Persistence} to use.
 * @returns A `Promise` that resolves once the persistence change has completed
 *
 * @public
 */
export function setPersistence(
  auth: Auth,
  persistence: Persistence
): Promise<void> {
  return getModularInstance(auth).setPersistence(persistence);
}
/**
 * Adds an observer for changes to the signed-in user's ID token, which includes sign-in,
 * sign-out, and token refresh events.
 *
 * @param auth - The {@link Auth} instance.
 * @param nextOrObserver - callback triggered on change.
 * @param error - callback triggered on error.
 * @param completed - callback triggered when observer is removed.
 *
 * @public
 */
export function onIdTokenChanged(
  auth: Auth,
  nextOrObserver: NextOrObserver<User>,
  error?: ErrorFn,
  completed?: CompleteFn
): Unsubscribe {
  return getModularInstance(auth).onIdTokenChanged(
    nextOrObserver,
    error,
    completed
  );
}
/**
 * Adds an observer for changes to the user's sign-in state.
 *
 * @remarks
 * To keep the old behavior, see {@link onIdTokenChanged}.
 *
 * @param auth - The {@link Auth} instance.
 * @param nextOrObserver - callback triggered on change.
 * @param error - callback triggered on error.
 * @param completed - callback triggered when observer is removed.
 *
 * @public
 */
export function onAuthStateChanged(
  auth: Auth,
  nextOrObserver: NextOrObserver<User>,
  error?: ErrorFn,
  completed?: CompleteFn
): Unsubscribe {
  return getModularInstance(auth).onAuthStateChanged(
    nextOrObserver,
    error,
    completed
  );
}
/**
 * Sets the current language to the default device/browser preference.
 *
 * @param auth - The {@link Auth} instance.
 *
 * @public
 */
export function useDeviceLanguage(auth: Auth): void {
  getModularInstance(auth).useDeviceLanguage();
}
/**
 * Asynchronously sets the provided user as {@link Auth.currentUser} on the
 * {@link Auth} instance.
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
 * @param auth - The {@link Auth} instance.
 * @param user - The new {@link User}.
 *
 * @public
 */
export function updateCurrentUser(
  auth: Auth,
  user: User | null
): Promise<void> {
  return getModularInstance(auth).updateCurrentUser(user);
}
/**
 * Signs out the current user.
 *
 * @param auth - The {@link Auth} instance.
 *
 * @public
 */
export function signOut(auth: Auth): Promise<void> {
  return getModularInstance(auth).signOut();
}

export { initializeAuth } from './auth/initialize';
export { connectAuthEmulator } from './auth/emulator';

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
export { CustomParameters } from './providers/federated';
export { GoogleAuthProvider } from './providers/google';
export { GithubAuthProvider } from './providers/github';
export { OAuthProvider, OAuthCredentialOptions } from './providers/oauth';
export { SAMLAuthProvider } from './providers/saml';
export { TwitterAuthProvider } from './providers/twitter';

// strategies
export { signInAnonymously } from './strategies/anonymous';
export {
  signInWithCredential,
  linkWithCredential,
  reauthenticateWithCredential
} from './strategies/credential';
export {
  signInWithCustomToken,
  setCustomTokenProvider,
  clearCustomTokenProvider
} from './strategies/custom_token';
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
export async function deleteUser(user: User): Promise<void> {
  return getModularInstance(user).delete();
}
