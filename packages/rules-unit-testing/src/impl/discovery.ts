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

import { EmulatorConfig, HostAndPort } from '../public_types';
import { makeUrl, fixHostname } from './url';

/**
 * Use the Firebase Emulator hub to discover other running emulators.
 *
 * @param hub the host and port where the Emulator Hub is running
 * @private
 */
export async function discoverEmulators(
  hub: HostAndPort,
  fetchImpl: typeof fetch = fetch
): Promise<DiscoveredEmulators> {
  const res = await fetchImpl(makeUrl(hub, '/emulators'));
  if (!res.ok) {
    throw new Error(
      `HTTP Error ${res.status} when attempting to reach Emulator Hub at ${res.url}, are you sure it is running?`
    );
  }

  const emulators: DiscoveredEmulators = {};

  const data = await res.json();

  if (data.database) {
    emulators.database = {
      host: data.database.host,
      port: data.database.port
    };
  }

  if (data.firestore) {
    emulators.firestore = {
      host: data.firestore.host,
      port: data.firestore.port
    };
  }

  if (data.storage) {
    emulators.storage = {
      host: data.storage.host,
      port: data.storage.port
    };
  }

  if (data.hub) {
    emulators.hub = {
      host: data.hub.host,
      port: data.hub.port
    };
  }
  return emulators;
}

/**
 * @private
 */
export interface DiscoveredEmulators {
  database?: HostAndPort;
  firestore?: HostAndPort;
  storage?: HostAndPort;
  hub?: HostAndPort;
}

/**
 * @private
 */
export function getEmulatorHostAndPort(
  emulator: keyof DiscoveredEmulators,
  conf?: EmulatorConfig,
  discovered?: DiscoveredEmulators
) {
  if (conf && ('host' in conf || 'port' in conf)) {
    const { host, port } = conf as any;
    if (!host || !port) {
      throw new Error(
        `Invalid configuration ${emulator}.host=${host} and ${emulator}.port=${port}. ` +
          'If either parameter is supplied, both must be defined.'
      );
    }
    if (discovered && !discovered[emulator]) {
      console.warn(
        `Warning: config for the ${emulator} emulator is specified, but the Emulator hub ` +
          'reports it as not running. This may lead to errors such as connection refused.'
      );
    }
    return {
      host: fixHostname(host, discovered?.hub?.host),
      port: port
    };
  }
  const envVar = EMULATOR_HOST_ENV_VARS[emulator];
  const fallback = discovered?.[emulator] || emulatorFromEnvVar(envVar);
  if (fallback) {
    if (discovered && !discovered[emulator]) {
      console.warn(
        `Warning: the environment variable ${envVar} is set, but the Emulator hub reports the ` +
          `${emulator} emulator as not running. This may lead to errors such as connection refused.`
      );
    }
    return {
      host: fixHostname(fallback.host, discovered?.hub?.host),
      port: fallback.port
    };
  }
}

// Visible for testing.
export const EMULATOR_HOST_ENV_VARS = {
  'database': 'FIREBASE_DATABASE_EMULATOR_HOST',
  'firestore': 'FIRESTORE_EMULATOR_HOST',
  'hub': 'FIREBASE_EMULATOR_HUB',
  'storage': 'FIREBASE_STORAGE_EMULATOR_HOST'
};

function emulatorFromEnvVar(envVar: string): HostAndPort | undefined {
  const hostAndPort = process.env[envVar];
  if (!hostAndPort) {
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(`http://${hostAndPort}`);
  } catch {
    throw new Error(
      `Invalid format in environment variable ${envVar}=${hostAndPort} (expected host:port)`
    );
  }
  let host = parsed.hostname;
  const port = Number(parsed.port || '80');
  if (!Number.isInteger(port)) {
    throw new Error(
      `Invalid port in environment variable ${envVar}=${hostAndPort}`
    );
  }
  return { host, port };
}
