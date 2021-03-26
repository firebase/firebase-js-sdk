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

declare module '@firebase/auth' {
  function applyActionCode(auth: AuthCompat, oobCode: string): Promise<void>;
  function checkActionCode(
    auth: AuthCompat,
    oobCode: string
  ): Promise<ActionCodeInfo>;
  function confirmPasswordReset(
    auth: AuthCompat,
    oobCode: string,
    newPassword: string
  ): Promise<void>;
  function createUserWithEmailAndPassword(
    auth: AuthCompat,
    email: string,
    password: string
  ): Promise<UserCredential>;
  function fetchSignInMethodsForEmail(
    auth: AuthCompat,
    email: string
  ): Promise<string[]>;
  function getMultiFactorResolver(
    auth: AuthCompat,
    error: MultiFactorError_2
  ): MultiFactorResolver;
  function getRedirectResult(
    auth: AuthCompat,
    resolver?: PopupRedirectResolver
  ): Promise<UserCredential | null>;
  function isSignInWithEmailLink(auth: AuthCompat, emailLink: string): boolean;
  function onAuthStateChanged(
    auth: AuthCompat,
    nextOrObserver: NextOrObserver<User>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe;
  function onIdTokenChanged(
    auth: AuthCompat,
    nextOrObserver: NextOrObserver<User>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe;
  function sendPasswordResetEmail(
    auth: AuthCompat,
    email: string,
    actionCodeSettings?: ActionCodeSettings
  ): Promise<void>;
  function sendSignInLinkToEmail(
    auth: AuthCompat,
    email: string,
    actionCodeSettings?: ActionCodeSettings
  ): Promise<void>;
  function setPersistence(
    auth: AuthCompat,
    persistence: Persistence
  ): Promise<void>;
  function signInAnonymously(auth: AuthCompat): Promise<UserCredential>;
  function signInWithCredential(
    auth: AuthCompat,
    credential: AuthCredential
  ): Promise<UserCredential>;
  function signInWithCustomToken(
    auth: AuthCompat,
    customToken: string
  ): Promise<UserCredential>;
  function signInWithEmailAndPassword(
    auth: AuthCompat,
    email: string,
    password: string
  ): Promise<UserCredential>;
  function signInWithEmailLink(
    auth: AuthCompat,
    email: string,
    emailLink?: string
  ): Promise<UserCredential>;
  function signInWithPhoneNumber(
    auth: AuthCompat,
    phoneNumber: string,
    appVerifier: ApplicationVerifier
  ): Promise<ConfirmationResult>;
  function signInWithPopup(
    auth: AuthCompat,
    provider: AuthProvider,
    resolver?: PopupRedirectResolver
  ): Promise<UserCredential>;
  function signInWithRedirect(
    auth: AuthCompat,
    provider: AuthProvider,
    resolver?: PopupRedirectResolver
  ): Promise<never>;
  function signOut(auth: AuthCompat): Promise<void>;
  function updateCurrentUser(
    auth: AuthCompat,
    user: User | null
  ): Promise<void>;
  function useAuthEmulator(
    auth: AuthCompat,
    url: string,
    options?: {
      disableWarnings: boolean;
    }
  ): void;
  function useDeviceLanguage(auth: AuthCompat): void;
  function verifyPasswordResetCode(
    auth: AuthCompat,
    code: string
  ): Promise<string>;
}
