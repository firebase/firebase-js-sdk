/**
 * @license
 * Copyright 2026 Google LLC
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

import firebase from '@firebase/app-compat';
/* eslint-disable-next-line import/no-extraneous-dependencies */
import '@firebase/auth-compat';
import '../..';

import * as exp from '@firebase/auth/internal';
import {
  getAppConfig,
  getEmulatorUrl
} from '../../../auth/test/helpers/integration/settings';
import { resetEmulator } from '../../../auth/test/helpers/integration/emulator_rest_helpers';
import type { MockInstance } from 'vitest';

export * from './fake_providers';

export function initializeTestInstance(): void {
  firebase.initializeApp(getAppConfig());
  const stub = stubConsoleToSilenceEmulatorWarnings();
  firebase.auth().useEmulator(getEmulatorUrl()!);
  stub.mockRestore();
}

export async function cleanUpTestInstance(): Promise<void> {
  try {
    await resetEmulator();
  } finally {
    for (const app of firebase.apps) {
      await app.delete();
    }
  }
}

export function randomEmail(): string {
  return `${exp._generateEventId('test.email.')}@integration.test`;
}

function stubConsoleToSilenceEmulatorWarnings(): MockInstance {
  const originalConsoleInfo = console.info.bind(console);
  return vi.spyOn(console, 'info').mockImplementation((...args: unknown[]) => {
    if (
      !JSON.stringify(args[0]).includes(
        'WARNING: You are using the Auth Emulator'
      )
    ) {
      originalConsoleInfo(...args);
    }
  });
}
