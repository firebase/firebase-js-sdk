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

import { deleteApp, initializeApp } from '@firebase/app-exp';
import { initializeAuth } from '@firebase/auth-exp/index.browser';
import { Auth, User } from '@firebase/auth-types-exp';

import { _generateEventId } from '../../../src/core/util/event_id';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PROJECT_CONFIG = require('../../../../../config/project.json');

export const PROJECT_ID = PROJECT_CONFIG.projectId;
export const AUTH_DOMAIN = PROJECT_CONFIG.authDomain;
export const API_KEY = PROJECT_CONFIG.apiKey;

interface IntegrationTestAuth extends Auth {
  cleanUp(): Promise<void>;
}

export function randomEmail(): string {
  return `${_generateEventId('test.email.')}@test.com`;
}

export function getTestInstance(): Auth {
  const app = initializeApp({
    apiKey: API_KEY,
    projectId: PROJECT_ID,
    authDomain: AUTH_DOMAIN
  });

  const createdUsers: User[] = [];
  const auth = initializeAuth(app) as IntegrationTestAuth;
  auth.settings.appVerificationDisabledForTesting = true;

  auth.onAuthStateChanged(user => {
    if (user) {
      createdUsers.push(user);
    }
  });

  auth.cleanUp = async () => {
    // Clear out any new users that were created in the course of the test
    for (const user of createdUsers) {
      try {
        await user.delete();
      } catch {
        // Best effort. Maybe the test already deleted the user ¯\_(ツ)_/¯
      }
    }

    await deleteApp(app);
  };

  return auth;
}

export async function cleanUpTestInstance(auth: Auth): Promise<void> {
  await auth.signOut();
  await (auth as IntegrationTestAuth).cleanUp();
}

