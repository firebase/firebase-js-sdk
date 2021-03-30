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

import * as redirect from './redirect';
import * as anonymous from './anonymous';
import * as core from './core';
import * as popup from './popup';
import * as email from './email';
import * as persistence from './persistence';
import { initializeApp } from '@firebase/app-exp';
import { getAuth, useAuthEmulator } from '@firebase/auth-exp';

window.core = core;
window.anonymous = anonymous;
window.redirect = redirect;
window.popup = popup;
window.email = email;
window.persistence = persistence;

window.auth = null;
window.legacyAuth = null;

// The config and emulator URL are injected by the test. The test framework
// calls this function after that injection.
window.startAuth = async () => {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  useAuthEmulator(auth, emulatorUrl);
  window.auth = auth;
};

window.startLegacySDK = async persistence => {
  return new Promise((resolve, reject) => {
    const appScript = document.createElement('script');
    // TODO: Find some way to make the tests work without Internet.
    appScript.src = 'https://www.gstatic.com/firebasejs/8.3.0/firebase-app.js';
    appScript.onerror = reject;
    appScript.onload = () => {
      const authScript = document.createElement('script');
      authScript.src =
        'https://www.gstatic.com/firebasejs/8.3.0/firebase-auth.js';
      authScript.onerror = reject;
      authScript.onload = () => {
        firebase.initializeApp(firebaseConfig);
        const legacyAuth = firebase.auth();
        legacyAuth.useEmulator(emulatorUrl);
        legacyAuth.setPersistence(persistence.toLowerCase());
        window.legacyAuth = legacyAuth;
        resolve();
      };
      document.head.appendChild(authScript);
    };
    document.head.appendChild(appScript);
  });
};
