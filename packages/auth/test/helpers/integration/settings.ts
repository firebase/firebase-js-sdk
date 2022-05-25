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

import { FirebaseOptions } from '@firebase/app';

// __karma__ is an untyped global
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const __karma__: any;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PROJECT_CONFIG = require('../../../../../config/project.json');

const EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const EMULATOR_PROJECT_ID = process.env.GCLOUD_PROJECT;

export const USE_EMULATOR = !!EMULATOR_HOST;

export const PROJECT_ID = USE_EMULATOR
  ? EMULATOR_PROJECT_ID
  : PROJECT_CONFIG.projectId;
export const AUTH_DOMAIN = USE_EMULATOR
  ? 'emulator-auth-domain'
  : PROJECT_CONFIG.authDomain;
export const API_KEY = USE_EMULATOR
  ? 'emulator-api-key'
  : PROJECT_CONFIG.apiKey;

export function getAppConfig(): FirebaseOptions {
  // Prefer the karma config, then fallback on node process.env stuff
  return (
    getKarma()?.config?.authAppConfig || {
      apiKey: API_KEY,
      projectId: PROJECT_ID,
      authDomain: AUTH_DOMAIN
    }
  );
}

export function getEmulatorUrl(): string | null {
  // Check karma first, then fallback on node process
  const host =
    getKarma()?.config?.authEmulatorHost ||
    (USE_EMULATOR ? EMULATOR_HOST : null);
  const ssl = getKarma()?.config?.ssl ? 'https' : 'http';
  return host ? `${ssl}://${host}` : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getKarma(): any {
  return typeof __karma__ !== 'undefined' ? __karma__ : undefined;
}
