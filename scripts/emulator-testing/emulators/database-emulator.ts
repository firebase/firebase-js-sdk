/**
 * @license
 * Copyright 2018 Google LLC
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

import * as request from 'request';

import { Emulator } from './emulator';

import rulesJSON from '../../../config/database.rules.json';

const DATABASE_EMULATOR_VERSION = '4.11.0';

export class DatabaseEmulator extends Emulator {
  namespace: string;

  constructor(port = 8088, namespace = 'test-emulator') {
    super(
      `firebase-database-emulator-v${DATABASE_EMULATOR_VERSION}.jar`,
      // Use locked version of emulator for test to be deterministic.
      // The latest version can be found from database emulator doc:
      // https://firebase.google.com/docs/database/security/test-rules-emulator
      `https://storage.googleapis.com/firebase-preview-drop/emulator/firebase-database-emulator-v${DATABASE_EMULATOR_VERSION}.jar`,
      port
    );
    this.namespace = namespace;
  }

  setPublicRules(): Promise<number> {
    const jsonRules = JSON.stringify(rulesJSON);
    console.log(`Setting rule ${jsonRules} to emulator ...`);
    return new Promise<number>((resolve, reject) => {
      request.put(
        {
          uri: `http://localhost:${this.port}/.settings/rules.json?ns=${this.namespace}`,
          headers: { Authorization: 'Bearer owner' },
          body: jsonRules
        },
        (error, response, body) => {
          if (error) reject(error);
          console.log(`Done setting public rule to emulator: ${body}.`);
          resolve(response.statusCode);
        }
      );
    });
  }
}
