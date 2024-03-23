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
import { FirebaseServerApp, deleteApp, initializeApp } from '@firebase/app';
import { Auth, User } from '@firebase/auth';

import { getAuth, connectAuthEmulator } from '../../../'; // Use browser OR node dist entrypoint depending on test env.
import { _generateEventId } from '../../../src/core/util/event_id';
import { getAppConfig, getEmulatorUrl } from './settings';
import { resetEmulator } from './emulator_rest_helpers';
// @ts-ignore - ignore types since this is only used in tests.
import totp from 'totp-generator';
import { _castAuth } from '../../../internal';
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
    connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
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
        if (!user.email?.includes('donotdelete')) {
          try {
            await user.delete();
          } catch {
            // Best effort. Maybe the test already deleted the user ¯\_(ツ)_/¯
          }
        }
      }
    }

    await deleteApp(app);
  };

  return auth;
}

export function getTestInstanceForServerApp(
  serverApp: FirebaseServerApp
): Auth {
  const auth = getAuth(serverApp) as IntegrationTestAuth;
  auth.settings.appVerificationDisabledForTesting = true;
  const emulatorUrl = getEmulatorUrl();

  if (emulatorUrl) {
    connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
  }

  // Don't track created users on the created Auth instance like we do for  Auth objects created in
  // getTestInstance(...) above. FirebaseServerApp testing re-uses users created by the Auth
  // instances returned by getTestInstance, so those Auth cleanup routines will suffice.
  auth.cleanUp = async () => {
    // If we're in an emulated environment, the emulator will clean up for us.
    //if (emulatorUrl) {
    //  await resetEmulator();
    //}
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

export function getTotpCode(
  sharedSecretKey: string,
  periodSec: number,
  verificationCodeLength: number,
  timestamp: Date
): string {
  const token = totp(sharedSecretKey, {
    period: periodSec,
    digits: verificationCodeLength,
    algorithm: 'SHA-1',
    timestamp
  });

  return token;
}
export const email = 'totpuser-donotdelete@test.com';
export const password = 'password';
//1000000 is always incorrect since it has 7 digits and we expect 6.
export const incorrectTotpCode = '1000000';

/**
 * Generates a valid password for the project or tenant password policy in the Auth instance.
 * @param auth The {@link Auth} instance.
 * @returns A valid password according to the password policy.
 */
export async function generateValidPassword(auth: Auth): Promise<string> {
  if (getEmulatorUrl()) {
    return 'password';
  }

  // Fetch the policy using the Auth instance if one is not cached.
  const authInternal = _castAuth(auth);
  if (!authInternal._getPasswordPolicyInternal()) {
    await authInternal._updatePasswordPolicy();
  }

  const passwordPolicy = authInternal._getPasswordPolicyInternal()!;
  const options = passwordPolicy.customStrengthOptions;

  // Create a string that satisfies all possible options (uppercase, lowercase, numeric, and special characters).
  const nonAlphaNumericCharacter =
    passwordPolicy.allowedNonAlphanumericCharacters.charAt(0);
  const stringWithAllOptions = 'aA0' + nonAlphaNumericCharacter;

  // Repeat the string enough times to fill up the minimum password length.
  const minPasswordLength = options.minPasswordLength ?? 6;
  const password = stringWithAllOptions.repeat(
    Math.round(minPasswordLength / stringWithAllOptions.length)
  );

  // Return a string that is only as long as the minimum length required by the policy.
  return password.substring(0, minPasswordLength);
}
