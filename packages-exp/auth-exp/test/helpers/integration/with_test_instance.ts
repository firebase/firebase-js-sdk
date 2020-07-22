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
import { initializeAuth } from '@firebase/auth-exp/index.browser';
import { Auth, User } from '@firebase/auth-types-exp';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PROJECT_CONFIG = require('../../../../../config/project.json');

export const PROJECT_ID = PROJECT_CONFIG.projectId;
export const AUTH_DOMAIN = PROJECT_CONFIG.authDomain;
export const API_KEY = PROJECT_CONFIG.apiKey;

export async function withTestInstance(
  fn: (auth: Auth) => void | Promise<void>
): Promise<void> {
  const app = initializeApp({
    apiKey: API_KEY,
    projectId: PROJECT_ID,
    authDomain: AUTH_DOMAIN
  });

  const createdUsers: User[] = [];
  const auth = initializeAuth(app);
  auth.settings.appVerificationDisabledForTesting = true;

  auth.onAuthStateChanged(user => {
    if (user) {
      createdUsers.push(user);
    }
  });

  await fn(auth);

  // Clear out any new users that were created in the course of the test
  for (const user of createdUsers) {
    try {
      await user.delete();
    } catch {
      // Best effort. Maybe the test already deleted the user ¯\_(ツ)_/¯
    }
  }
}
