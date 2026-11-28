/**
 * @license
 * Copyright 2022 Google LLC
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

import PROJECT_CONFIG from '../../../../config/project.json';

/**
 * NOTE: These helpers are used by api/ tests and therefore may not have any
 * dependencies on src/ files.
 */
enum TargetBackend {
  EMULATOR = 'emulator',
  QA = 'qa',
  NIGHTLY = 'nightly',
  PROD = 'prod'
}

const TARGET_BACKEND: TargetBackend = getTargetBackend();

export const USE_EMULATOR: boolean = TARGET_BACKEND === TargetBackend.EMULATOR;

export const DEFAULT_SETTINGS = {
  host: getFirestoreHost(TARGET_BACKEND),
  ssl: getSslEnabled(TARGET_BACKEND)
};

// eslint-disable-next-line no-console
console.log(`Default Settings: ${JSON.stringify(DEFAULT_SETTINGS)}`);

function parseTargetBackend(targetBackend: string): TargetBackend {
  switch (targetBackend) {
    case 'emulator':
      return TargetBackend.EMULATOR;
    case 'qa':
      return TargetBackend.QA;
    case 'nightly':
      return TargetBackend.NIGHTLY;
    case 'prod':
      return TargetBackend.PROD;
    default:
      throw Error('Unknown backend configuration used for integration tests.');
  }
}

function getTargetBackend(): TargetBackend {
  if (process.env.FIRESTORE_TARGET_BACKEND) {
    return parseTargetBackend(process.env.FIRESTORE_TARGET_BACKEND);
  }
  if (process.env.FIRESTORE_EMULATOR_PORT) {
    return TargetBackend.EMULATOR;
  }
  return TargetBackend.PROD;
}

function getFirestoreHost(targetBackend: TargetBackend): string {
  switch (targetBackend) {
    case TargetBackend.EMULATOR: {
      const emulatorPort: string =
        process.env.FIRESTORE_EMULATOR_PORT || '8080';
      return `localhost:${emulatorPort}`;
    }
    case TargetBackend.QA:
      return 'staging-firestore.sandbox.googleapis.com';
    case TargetBackend.NIGHTLY:
      return 'test-firestore.sandbox.googleapis.com';
    case TargetBackend.PROD:
    default:
      return 'firestore.googleapis.com';
  }
}

function getSslEnabled(targetBackend: TargetBackend): boolean {
  return targetBackend !== TargetBackend.EMULATOR;
}

export const DEFAULT_PROJECT_ID = USE_EMULATOR
  ? process.env.FIRESTORE_EMULATOR_PROJECT_ID || 'test-emulator'
  : PROJECT_CONFIG.projectId;
export const ALT_PROJECT_ID = 'test-db2';
