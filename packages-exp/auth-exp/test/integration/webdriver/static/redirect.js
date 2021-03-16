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

import {
  FacebookAuthProvider,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithRedirect,
  OAuthProvider,
  reauthenticateWithRedirect,
  signInWithCredential,
  signInWithRedirect
} from '@firebase/auth-exp';

let redirectCred = null;
let errorCred = null;

export function idpRedirect(optProvider) {
  const provider = optProvider
    ? new OAuthProvider(optProvider)
    : new GoogleAuthProvider();
  signInWithRedirect(auth, provider);
}

export function idpReauthRedirect() {
  reauthenticateWithRedirect(auth.currentUser, new GoogleAuthProvider());
}

export function idpLinkRedirect() {
  linkWithRedirect(auth.currentUser, new GoogleAuthProvider());
}

export function redirectResult() {
  return getRedirectResult(auth);
}

export async function generateCredentialFromRedirectResultAndStore() {
  const result = await getRedirectResult(auth);
  redirectCred = GoogleAuthProvider.credentialFromResult(result);
  return redirectCred;
}

export async function signInWithRedirectCredential() {
  return signInWithCredential(auth, redirectCred);
}

export async function linkWithErrorCredential() {
  await linkWithCredential(auth.currentUser, errorCred);
}

// These below are not technically redirect functions but they're helpers for
// the redirect tests.

export function createFakeGoogleUser(email) {
  return signInWithCredential(
    auth,
    GoogleAuthProvider.credential(
      `{"sub": "__${email}__", "email": "${email}", "email_verified": true}`
    )
  );
}

export async function tryToSignInUnverified(email) {
  try {
    await signInWithCredential(
      auth,
      FacebookAuthProvider.credential(
        `{"sub": "$$${email}$$", "email": "${email}", "email_verified": false}`
      )
    );
  } catch (e) {
    errorCred = FacebookAuthProvider.credentialFromError(e);
    throw e;
  }
}
