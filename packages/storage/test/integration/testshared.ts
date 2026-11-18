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

// eslint-disable-next-line import/no-extraneous-dependencies
import { initializeApp, FirebaseApp } from '@firebase/app';
// eslint-disable-next-line import/no-extraneous-dependencies
import { getAuth, signInAnonymously } from '@firebase/auth';
import { getStorage } from '../../src';
import * as types from '../../src/public-types';
import PROJECT_CONFIG from '../../../../config/project.json';

export const PROJECT_ID = PROJECT_CONFIG.projectId;
export const STORAGE_BUCKET = PROJECT_CONFIG.storageBucket;
export const API_KEY = PROJECT_CONFIG.apiKey;
export const AUTH_DOMAIN = PROJECT_CONFIG.authDomain;

export async function createApp(): Promise<FirebaseApp> {
  const app = initializeApp({
    apiKey: API_KEY,
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
    authDomain: AUTH_DOMAIN
  });
  await signInAnonymously(getAuth(app));
  return app;
}

export function createStorage(app: FirebaseApp): types.FirebaseStorage {
  return getStorage(app);
}
