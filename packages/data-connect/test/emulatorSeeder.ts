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

import fs from 'fs';
import * as path from 'path';

import { ReferenceType } from '../src';

import { EMULATOR_PORT } from './util';

export interface SeedInfo {
  type: ReferenceType;
  name: string;
}
export async function setupQueries(
  schema: string,
  seedInfoArray: SeedInfo[]
): Promise<Response> {
  const schemaPath = path.resolve(__dirname, schema);
  const schemaFileContents = fs.readFileSync(schemaPath).toString();
  const toWrite = {
    'service_id': 'l',
    'schema': {
      'files': [
        {
          'path': `schema/${schema}`,
          'content': schemaFileContents
        }
      ]
    },
    'connectors': {
      'c': {
        'files': seedInfoArray.map(seedInfo => {
          const fileName = seedInfo.name + '.gql';
          const operationFilePath = path.resolve(__dirname, fileName);
          const operationFileContents = fs
            .readFileSync(operationFilePath)
            .toString();
          return {
            path: `operations/${seedInfo.name}.gql`,
            content: operationFileContents
          };
        })
      }
    },
    // eslint-disable-next-line camelcase
    connection_string:
      'postgresql://postgres:secretpassword@localhost:5432/postgres?sslmode=disable'
  };
  return fetch(`http://localhost:${EMULATOR_PORT}/setupSchema`, {
    method: 'POST',
    body: JSON.stringify(toWrite)
  });
}
