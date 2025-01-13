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

import { platform } from 'os';
import { Emulator } from './emulator';

const DATACONNECT_EMULATOR_VERSION = '1.7.5';

export class DataConnectEmulator extends Emulator {
  constructor(port = 9399) {
    console.log('passing in ' + port + ' as port for fdc');
    const os = platform();
    let urlString = '';
    switch (os) {
      case 'darwin':
        urlString = `https://firebasestorage.googleapis.com/v0/b/firemat-preview-drop/o/emulator%2Fdataconnect-emulator-macos-v${DATACONNECT_EMULATOR_VERSION}?alt=media`;
        break;
      case 'linux':
        urlString = `https://firebasestorage.googleapis.com/v0/b/firemat-preview-drop/o/emulator%2Fdataconnect-emulator-linux-v${DATACONNECT_EMULATOR_VERSION}?alt=media`;
        break;
      case 'win32':
        urlString = `https://firebasestorage.googleapis.com/v0/b/firemat-preview-drop/o/emulator%2Fdataconnect-emulator-windows-v${DATACONNECT_EMULATOR_VERSION}?alt=media`;
        break;
      default:
        throw new Error(
          `We are unable to support your environment ${os} at this time.`
        );
    }
    super(
      `cli-v${DATACONNECT_EMULATOR_VERSION}`,
      // Use locked version of emulator for test to be deterministic.
      // The latest version can be found from database emulator doc:
      // https://firebase.google.com/docs/database/security/test-rules-emulator
      urlString,
      port
    );
    this.isDataConnect = true;
  }
}
