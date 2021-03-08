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

import { initializeApp } from '@firebase/app-exp';
import {
  getAuth,
  signInAnonymously,
  useAuthEmulator
} from '@firebase/auth-exp';

let auth;

// Helper functions for tests
window.anonymous = async () => {
  const userCred = await signInAnonymously(auth);
  return userCred;
};

window.reset = () => {
  sessionStorage.clear();
  localStorage.clear();
  const del = indexedDB.deleteDatabase('firebaseLocalStorageDb');

  return new Promise(resolve => {
    del.addEventListener('success', () => resolve());
    del.addEventListener('error', () => resolve());
    del.addEventListener('blocked', () => resolve());
  });
};

window.authInit = () => {
  return new Promise(resolve => {
    auth.onAuthStateChanged(() => resolve());
  });
};

window.userSnap = async () => auth.currentUser;

window.authSnap = async () => auth;

// The config and emulator URL are injected by the test. The test framework
// calls this function after that injection.
window.startAuth = async () => {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  useAuthEmulator(auth, emulatorUrl);
  window.auth = auth;
};
