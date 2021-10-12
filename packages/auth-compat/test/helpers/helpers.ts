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

import {
  getAppConfig,
  getEmulatorUrl
} from '../../../auth/test/helpers/integration/settings';
import { resetEmulator } from '../../../auth/test/helpers/integration/emulator_rest_helpers';
export {
  createNewTenant,
  getOobCodes,
  getPhoneVerificationCodes,
  OobCodeSession
} from '../../../auth/test/helpers/integration/emulator_rest_helpers';
export {
  randomEmail,
  randomPhone
} from '../../../auth/test/helpers/integration/helpers';

export function initializeTestInstance(): void {
  firebase.initializeApp(getAppConfig());
  firebase.auth().useEmulator(getEmulatorUrl()!, {
    disableWarnings: true
  });
}

export async function cleanUpTestInstance(): Promise<void> {
  await firebase.auth().signOut();
  for (const app of firebase.apps) {
    await app.delete();
  }
  await resetEmulator();
}
