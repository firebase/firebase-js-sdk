/**
 * @license
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

import { Emulator } from './emulator';

export class FirestoreEmulator extends Emulator {
  projectId: string;

  constructor(port: number, projectId = 'test-emulator') {
    super(port);
    this.projectId = projectId;
    this.binaryName = 'firestore-emulator.jar';
    // Use locked version of emulator for test to be deterministic.
    // The latest version can be found from firestore emulator doc:
    // https://firebase.google.com/docs/firestore/security/test-rules-emulator
    this.binaryUrl =
      'https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v1.5.0.jar';
  }
}
