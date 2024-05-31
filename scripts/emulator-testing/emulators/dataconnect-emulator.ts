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

import { Emulator } from './emulator';

const DATABASE_EMULATOR_VERSION = '1.1.19';

export class DataConnectEmulator extends Emulator {
  //   namespace: string;

  constructor(port = 3628, namespace = 'test-emulator') {
    super(
      `cli-v${DATABASE_EMULATOR_VERSION}`,
      // Use locked version of emulator for test to be deterministic.
      // The latest version can be found from database emulator doc:
      // https://firebase.google.com/docs/database/security/test-rules-emulator
      `https://firebasestorage.googleapis.com/v0/b/firemat-preview-drop/o/emulator%2Fdataconnect-emulator-macos-v1.1.19?alt=media&token=8415ec58-b7a1-486d-a579-d5e1a645025b`,
      port
    );
    this.isJar = false;
    // this.namespace = namespace;
  }
}
