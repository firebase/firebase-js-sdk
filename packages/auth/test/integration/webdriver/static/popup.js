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
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  OAuthProvider,
  reauthenticateWithPopup,
  signInWithCredential,
  signInWithPopup
} from '@firebase/auth';

// These functions are a little funky: WebDriver relies on callbacks to
// pass data back to the main Node process. Because of that setup, we can't
// return the popup tasks as pending promises as they won't resolve until
// the WebDriver is allowed to do other stuff. Instead, we'll store the
// promises in variables and provide a way to retrieve them later, unblocking
// the WebDriver process.
let popupPromise = null;
let popupCred = null;
let errorCred = null;

export function idpPopup(optProvider) {
  const provider = optProvider
    ? new OAuthProvider(optProvider)
    : new GoogleAuthProvider();
  popupPromise = signInWithPopup(auth, provider);
}

export function idpReauthPopup() {
  popupPromise = reauthenticateWithPopup(
    auth.currentUser,
    new GoogleAuthProvider()
  );
}

export function idpLinkPopup() {
  popupPromise = linkWithPopup(auth.currentUser, new GoogleAuthProvider());
}

export function popupResult() {
  return popupPromise;
}

export async function generateCredentialFromResult() {
  const result = await popupPromise;
  popupCred = GoogleAuthProvider.credentialFromResult(result);
  return popupCred;
}

export async function signInWithPopupCredential() {
  return signInWithCredential(auth, popupCred);
}

export async function linkWithErrorCredential() {
  await linkWithCredential(auth.currentUser, errorCred);
}

// These below are not technically popup functions but they're helpers for
// the popup tests.

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
