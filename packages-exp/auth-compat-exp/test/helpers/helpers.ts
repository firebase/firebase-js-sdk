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

import * as sinon from 'sinon';
import firebase from '@firebase/app-compat';
import '../..';

import * as exp from '@firebase/auth-exp/internal';
import {
  getAppConfig,
  getEmulatorUrl
} from '../../../auth-exp/test/helpers/integration/settings';
import { resetEmulator } from '../../../auth-exp/test/helpers/integration/emulator_rest_helpers';

export function initializeTestInstance(): void {
  firebase.initializeApp(getAppConfig());
  const stub = stubConsoleToSilenceEmulatorWarnings();
  firebase.auth().useEmulator(getEmulatorUrl()!);
  stub.restore();
}

export async function cleanUpTestInstance(): Promise<void> {
  for (const app of firebase.apps) {
    await app.delete();
  }
  await resetEmulator();
}

export function randomEmail(): string {
  return `${exp._generateEventId('test.email.')}@integration.test`;
}

function stubConsoleToSilenceEmulatorWarnings(): sinon.SinonStub {
  const originalConsoleInfo = console.info.bind(console);
  return sinon.stub(console, 'info').callsFake((...args: unknown[]) => {
    if (
      !JSON.stringify(args[0]).includes(
        'WARNING: You are using the Auth Emulator'
      )
    ) {
      originalConsoleInfo(...args);
    }
  });
}
