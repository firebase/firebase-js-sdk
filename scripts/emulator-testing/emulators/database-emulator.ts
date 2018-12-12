/**
 * Copyright 2018 Google Inc.
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

export class DatabaseEmulator extends Emulator {
  constructor(port = 8088, namespace = 'test-emulator') {
    super(port, namespace);
    this.binaryName = 'database-emulator.jar';
    this.binaryUrl =
      'https://storage.googleapis.com/firebase-preview-drop/emulator/firebase-database-emulator-v3.5.0.jar';
  }

  async setPublicRules(): Promise<number> {
    console.log('Setting rule {".read": true, ".write": true} to emulator ...');
    return new Promise<number>((resolve, reject) => {
      request.put(
        {
          uri: `http://localhost:${this.port}/.settings/rules.json?ns=${
            this.namespace
          }`,
          headers: { Authorization: 'Bearer owner' },
          body: '{ "rules": { ".read": true, ".write": true } }'
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
