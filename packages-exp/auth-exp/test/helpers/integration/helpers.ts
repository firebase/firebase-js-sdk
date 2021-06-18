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
import { deleteApp, initializeApp } from '@firebase/app-exp';
import { Auth, User } from '../../../src/model/public_types';

import { getAuth, useAuthEmulator } from '../../../'; // Use browser OR node dist entrypoint depending on test env.
import { _generateEventId } from '../../../src/core/util/event_id';
import { getAppConfig, getEmulatorUrl } from './settings';
import { resetEmulator } from './emulator_rest_helpers';

interface IntegrationTestAuth extends Auth {
  cleanUp(): Promise<void>;
}

export function randomEmail(): string {
  return `${_generateEventId('test.email.')}@test.com`;
}

export function getTestInstance(requireEmulator = false): Auth {
  const app = initializeApp(getAppConfig());

  const createdUsers: User[] = [];
  const auth = getAuth(app) as IntegrationTestAuth;
  auth.settings.appVerificationDisabledForTesting = true;
  const emulatorUrl = getEmulatorUrl();

  if (emulatorUrl) {
    const stub = stubConsoleToSilenceEmulatorWarnings();
    useAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
    stub.restore();
  } else if (requireEmulator) {
    /* Emulator wasn't configured but test must use emulator */
    throw new Error('Test may only be run using the Auth Emulator!');
  }

  auth.onAuthStateChanged(user => {
    if (user) {
      createdUsers.push(user);
    }
  });

  auth.cleanUp = async () => {
    // If we're in an emulated environment, the emulator will clean up for us
    if (emulatorUrl) {
      await resetEmulator();
    } else {
      // Clear out any new users that were created in the course of the test
      for (const user of createdUsers) {
        try {
          await user.delete();
        } catch {
          // Best effort. Maybe the test already deleted the user ¯\_(ツ)_/¯
        }
      }
    }

    await deleteApp(app);
  };

  return auth;
}

export async function cleanUpTestInstance(auth: Auth): Promise<void> {
  await auth.signOut();
  await (auth as IntegrationTestAuth).cleanUp();
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
