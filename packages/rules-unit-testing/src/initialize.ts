/**
 * @license
 * Copyright 2021 Google LLC
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

import { RulesTestEnvironment, TestEnvironmentConfig } from './public_types';
import {
  DiscoveredEmulators,
  discoverEmulators,
  getEmulatorHostAndPort
} from './impl/discovery';

/**
 * Initializes a test environment for rules unit testing. Call this function first for test setup.
 *
 * Requires emulators to be running. This function tries to discover those emulators via environment
 * variables or through the Firebase Emulator hub if hosts and ports are unspecified. It is strongly
 * recommended to specify security rules for emulators used for testing. See minimal example below.
 *
 * @param config the configuration for emulators. most fields are optional if they can be discovered
 * @returns a promise that resolves with an environment ready for testing, or rejects on error.
 * @public
 * @example
 * ```javascript
 * const testEnv = await initializeTestEnvironment({
 *   firestore: {
 *     rules: fs.readFileSync("/path/to/firestore.rules", "utf8"), // Load rules from file
 *     // host and port can be omitted if they can be discovered from the hub.
 *   },
 *   // ...
 * });
 * ```
 */
export async function initializeTestEnvironment(
  config: TestEnvironmentConfig
): Promise<RulesTestEnvironment> {
  const projectId = config.projectId || process.env.GCLOUD_PROJECT;
  if (!projectId) {
    throw new Error(
      'Missing projectId option or env var GCLOUD_PROJECT! Please specify the projectId either ' +
        'way.\n(A demo-* projectId is strongly recommended for unit tests, such as "demo-test".)'
    );
  }
  const hub = getEmulatorHostAndPort('hub', config.hub);
  let discovered = hub ? { ...(await discoverEmulators(hub)), hub } : undefined;

  const emulators: DiscoveredEmulators = {};
  if (hub) {
    emulators.hub = hub;
  }

  for (const emulator of SUPPORTED_EMULATORS) {
    const hostAndPort = getEmulatorHostAndPort(
      emulator,
      config[emulator],
      discovered
    );
    if (hostAndPort) {
      emulators[emulator] = hostAndPort;
    }
  }

  // TODO: Create test env and set security rules.
  throw new Error('unimplemented');
}

const SUPPORTED_EMULATORS = ['database', 'firestore', 'storage'] as const;
