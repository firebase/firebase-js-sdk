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

import * as firestore from '@firebase/firestore-types';

/**
 * NOTE: These helpers are used by api/ tests and therefore may not have any
 * dependencies on src/ files.
 */
// __karma__ is an untyped global
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const __karma__: any;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PROJECT_CONFIG = require('../../../../../config/project.json');

const EMULATOR_PORT = process.env.FIRESTORE_EMULATOR_PORT;
const EMULATOR_PROJECT_ID = process.env.FIRESTORE_EMULATOR_PROJECT_ID;
export const USE_EMULATOR = !!EMULATOR_PORT;

const EMULATOR_FIRESTORE_SETTING = {
  host: `localhost:${EMULATOR_PORT}`,
  ssl: false,
  experimentalAutoDetectLongPolling: true
};

const PROD_FIRESTORE_SETTING = {
  host: 'firestore.googleapis.com',
  ssl: true,
  experimentalAutoDetectLongPolling: true
};

export const DEFAULT_SETTINGS = getDefaultSettings();

// eslint-disable-next-line no-console
console.log(`Default Settings: ${JSON.stringify(DEFAULT_SETTINGS)}`);

function getDefaultSettings(): firestore.Settings {
  const karma = typeof __karma__ !== 'undefined' ? __karma__ : undefined;
  if (karma && karma.config.firestoreSettings) {
    return karma.config.firestoreSettings;
  } else {
    return USE_EMULATOR ? EMULATOR_FIRESTORE_SETTING : PROD_FIRESTORE_SETTING;
  }
}

export const DEFAULT_PROJECT_ID = USE_EMULATOR
  ? EMULATOR_PROJECT_ID
  : PROJECT_CONFIG.projectId;
export const ALT_PROJECT_ID = 'test-db2';
