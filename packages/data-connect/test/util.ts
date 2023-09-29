/**
 * @license
 * Copyright 2024 Google LLC
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

import { initializeApp } from '@firebase/app';

import {
  connectDataConnectEmulator,
  ConnectorConfig,
  getDataConnect
} from '../src';

export const USE_EMULATOR = true;
export const EMULATOR_PORT = process.env.DC_EMULATOR_PORT;
// export const EMULATOR_PROJECT = process.env.PROJECT;
export const CONNECTOR_NAME = 'c';
export const LOCATION_NAME = 'l';
export const SERVICE_NAME = 'l';
export const PROJECT_ID = 'p';
export function getConnectionConfig(): ConnectorConfig {
  return {
    connector: CONNECTOR_NAME,
    location: LOCATION_NAME,
    service: SERVICE_NAME
  };
}

export const app = initializeApp({
  projectId: PROJECT_ID
});

// Seed the database to have the proper fields to query, such as a list of tasks.
export function initDatabase() {
  const instance = getDataConnect(getConnectionConfig());
  if (!instance.isEmulator) {
    connectDataConnectEmulator(instance, 'localhost', Number(EMULATOR_PORT));
  }
  return instance;
}
