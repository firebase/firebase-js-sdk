/**
 * @license
 * Copyright 2018 Google LLC
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
import { initializeApp } from '@firebase/app-exp';
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  initializeAuth,
  inMemoryPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  updateProfile,
} from '@firebase/auth-exp/dist/index.webworker';
import { OAuthCredential, User } from '@firebase/auth-types-exp';

import { config } from '../config';

/**
 * @fileoverview Web worker for Firebase Auth test app application. The
 * web worker tries to run operations on the Auth instance for testing purposes.
 */

// Initialize the Firebase app in the web worker.
const app = initializeApp(config);
const auth = initializeAuth(app, {
  persistence: inMemoryPersistence
});

/**
 * Returns a promise that resolves with an ID token if available.
 * @return {!Promise<?string>} The promise that resolves with an ID token if
 *     available. Otherwise, the promise resolves with null.
 */
function getIdToken(): Promise<string | null> {
  return new Promise((resolve) => {
    auth.onAuthStateChanged((user: User | null) => {
      if (user) {
        user.getIdToken().then(resolve).catch(
          () => {
            resolve(null);
          }
        );
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Runs various Firebase Auth tests in a web worker environment and confirms the
 * expected behavior. This is useful for manual testing in different browsers.
 * @param {string} googleIdToken The Google ID token to sign in with.
 * @return {!Promise<void>} A promise that resolves when all tests run
 *     successfully.
 */
async function runWorkerTests(_googleIdToken: OAuthCredential): Promise<void> {
  const expectedDisplayName = 'Test User';
  // TODO: uncomment this
  // const oauthCredential = GoogleAuthProvider.credential(
  //     googleIdToken);
  // const provider = new GoogleAuthProvider();
  const OPERATION_NOT_SUPPORTED_CODE =
    'auth/operation-not-supported-in-this-environment';
  const email =
    'user' +
    Math.floor(Math.random() * 10000000000).toString() +
    '@example.com';
  const pass = 'password';
  auth.useDeviceLanguage();
  let credential = await signInAnonymously(auth);
  if (!credential.user.uid) {
    throw new Error('signInAnonymously unexpectedly failed!');
  }
  await updateProfile(credential.user, { displayName: expectedDisplayName });
  if (auth.currentUser!.displayName !== expectedDisplayName) {
    throw new Error('Profile update failed!');
  }
  await auth.currentUser!.delete();
  if (auth.currentUser) {
    throw new Error('currentUser.delete unexpectedly failed!');
  }
  credential = await createUserWithEmailAndPassword(auth, email, pass);
  if (credential.user.email !== email) {
    throw new Error('createUserWithEmailAndPassword unexpectedly failed!');
  }
  const providers = await fetchSignInMethodsForEmail(auth, email);
  if (providers.length === 0 || providers[0] !== 'password') {
    throw new Error('fetchSignInMethodsForEmail failed!');
  }
  credential = await signInWithEmailAndPassword(auth, email, pass);
  if (credential.user.email !== email) {
    throw new Error('signInWithEmailAndPassword unexpectedly failed!');
  }
  await credential.user.delete();
  try {
    // TODO: uncomment this
    // await signInWithPopup(auth, provider);
  } catch (error) {
    if (error.code !== OPERATION_NOT_SUPPORTED_CODE) {
      throw error;
    }
  }
  try {
    // TODO: uncomment this
    // await signInWithRedirect(auth, provider);
  } catch (error) {
    if (error.code !== OPERATION_NOT_SUPPORTED_CODE) {
      throw error;
    }
  }
  // This test is now invalid because of strong typing...
  // Promise.resolve()
  // .then(() => {
  //   return new RecaptchaVerifier('id');
  // })
  // .then(() => {
  //   throw new Error(
  //     'RecaptchaVerifer instantiation succeeded unexpectedly!'
  //   );
  // })
  // .catch(error => {
  //   if (error.code !== OPERATION_NOT_SUPPORTED_CODE) {
  //     throw error;
  //   }
  // });
  // TODO: uncomment this
  // credential = await signInWithCredential(auth, oauthCredential);
  // if (
  //   !credential.user ||
  //   !credential.user.uid ||
  //   !credential.credential ||
  //   !credential.additionalUserInfo
  // ) {
  //   throw new Error('signInWithCredential unexpectedly failed!');
  // }
  await auth.signOut();
  if (auth.currentUser) {
    throw new Error('signOut unexpectedly failed!');
  }
}

/**
 * Handles the incoming message from the main script.
 * @param {!MessageEvent} e The message event received.
 */
self.onmessage = (e: MessageEvent) => {
  // https://github.com/microsoft/TypeScript/issues/12657
  const ctx = self as DedicatedWorkerGlobalScope;
  if (e?.data.type) {
    switch (e.data.type) {
      case 'GET_USER_INFO':
        getIdToken()
          .then(idToken => {
            ctx.postMessage({
              type: e.data.type,
              idToken,
              uid: auth.currentUser?.uid,
            });
          })
          .catch(error => {
            console.log(error);
          });
        break;
      case 'RUN_TESTS':
        runWorkerTests(e.data.googleIdToken)
          .then(() => {
            ctx.postMessage({
              type: e.data.type,
              status: 'success',
            });
          })
          .catch(error => {
            // DataCloneError when postMessaging in IE11 and 10.
            ctx.postMessage({
              type: e.data.type,
              status: 'failure',
              error: error.code ? error : error.message
            });
          });
        break;
      default:
        ctx.postMessage({});
    }
  }
};
