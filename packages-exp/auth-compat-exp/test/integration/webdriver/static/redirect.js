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

let redirectCred = null;
let errorCred = null;

export function idpRedirect(optProvider) {
  const provider = optProvider
    ? new compat.auth.OAuthProvider(optProvider)
    : new compat.auth.GoogleAuthProvider();
  compat.auth().signInWithRedirect(provider);
}

export function idpReauthRedirect() {
  compat
    .auth()
    .currentUser.reauthenticateWithRedirect(
      new compat.auth.GoogleAuthProvider()
    );
}

export function idpLinkRedirect() {
  compat
    .auth()
    .currentUser.linkWithRedirect(new compat.auth.GoogleAuthProvider());
}

export function redirectResult() {
  return compat.auth().getRedirectResult();
}

export async function generateCredentialFromRedirectResultAndStore() {
  const result = await compat.auth().getRedirectResult();
  redirectCred = result.credential;
  return redirectCred;
}

export async function signInWithRedirectCredential() {
  return compat.auth().signInWithCredential(redirectCred);
}

export async function linkWithErrorCredential() {
  await compat.auth().currentUser.linkWithCredential(errorCred);
}

// These below are not technically redirect functions but they're helpers for
// the redirect tests.

export function createFakeGoogleUser(email) {
  return compat
    .auth()
    .signInWithCredential(
      compat.auth.GoogleAuthProvider.credential(
        `{"sub": "__${email}__", "email": "${email}", "email_verified": true}`
      )
    );
}

export async function tryToSignInUnverified(email) {
  try {
    await compat
      .auth()
      .signInWithCredential(
        compat.auth.FacebookAuthProvider.credential(
          `{"sub": "$$${email}$$", "email": "${email}", "email_verified": false}`
        )
      );
  } catch (e) {
    errorCred = e.credential;
    throw e;
  }
}
