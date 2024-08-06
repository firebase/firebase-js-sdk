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

import { FirebaseApp, initializeApp } from '@firebase/app';

import projectInfo from '../../../config/project.json';
import {
  connectDataConnectEmulator,
  ConnectorConfig,
  DataConnect,
  getDataConnect
} from '../src';

export const EMULATOR_PORT = process.env.DC_EMULATOR_PORT;
export const USE_EMULATOR = !!EMULATOR_PORT;
// TODO: don't hardcode this.
export const CONNECTOR_NAME = 'queries';
export const LOCATION_NAME = 'us-west2';
export const SERVICE_NAME = 'my-service';
export const PROJECT_ID = projectInfo.projectId;
export function getConnectionConfig(): ConnectorConfig {
  return {
    connector: CONNECTOR_NAME,
    location: LOCATION_NAME,
    service: SERVICE_NAME
  };
}

export function initApp(): FirebaseApp {
  return initializeApp(projectInfo);
}

// Seed the database to have the proper fields to query, such as a list of tasks.
export function initDatabase(): DataConnect {
  const instance = getDataConnect(getConnectionConfig());
  if (!instance.isEmulator && USE_EMULATOR) {
    // eslint-disable-next-line no-console
    connectDataConnectEmulator(instance, 'localhost', Number(EMULATOR_PORT));
  }
  return instance;
}
interface FileInfo {
  name: string;
  content: string;
}

interface SpecTest {
  schema: FileInfo;
  fileInfo: FileInfo[];
}

export function setupQuery(testInfo: SpecTest): Promise<Response> {
  const toWrite = {
    'service_id': 'l',
    'schema': {
      'files': [
        {
          'path': `schema/${testInfo.schema.name}`,
          'content': testInfo.schema.content
        }
      ]
    },
    'connectors': {
      'c': {
        'files': testInfo.fileInfo.map(seedInfo => {
          return {
            path: `operations/${seedInfo.name}.gql`,
            content: seedInfo.content
          };
        })
      }
    }
  };
  return fetch(`http://localhost:${EMULATOR_PORT}/setupSchema`, {
    method: 'POST',
    body: JSON.stringify(toWrite)
  });
}
