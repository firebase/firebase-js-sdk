/**
 * @license
 * Copyright 2022 Google LLC
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

import { base64Decode } from './crypt';
import { getGlobal } from './global';

/**
 * Keys for experimental properties on the `FirebaseDefaults` object.
 * @public
 */
export type ExperimentalKey = 'authTokenSyncURL' | 'authIdTokenMaxAge';

/**
 * An object that can be injected into the environment as __FIREBASE_DEFAULTS__,
 * either as a property of globalThis, a shell environment variable, or a
 * cookie.
 *
 * This object can be used to automatically configure and initialize
 * a Firebase app as well as any emulators.
 *
 * @public
 */
export interface FirebaseDefaults {
  config?: Record<string, string>;
  emulatorHosts?: Record<string, string>;
  _authTokenSyncURL?: string;
  _authIdTokenMaxAge?: number;
  /**
   * Override Firebase's runtime environment detection and
   * force the SDK to act as if it were in the specified environment.
   */
  forceEnvironment?: 'browser' | 'node';
  [key: string]: unknown;
}

declare global {
  // Need `var` for this to work.
  // eslint-disable-next-line no-var
  var __FIREBASE_DEFAULTS__: FirebaseDefaults | undefined;
}

const getDefaultsFromGlobal = (): FirebaseDefaults | undefined =>
  getGlobal().__FIREBASE_DEFAULTS__;

/**
 * Attempt to read defaults from a JSON string provided to
 * process(.)env(.)__FIREBASE_DEFAULTS__ or a JSON file whose path is in
 * process(.)env(.)__FIREBASE_DEFAULTS_PATH__
 * The dots are in parens because certain compilers (Vite?) cannot
 * handle seeing that variable in comments.
 * See https://github.com/firebase/firebase-js-sdk/issues/6838
 */
const getDefaultsFromEnvVariable = (): FirebaseDefaults | undefined => {
  if (typeof process === 'undefined' || typeof process.env === 'undefined') {
    return;
  }
  const defaultsJsonString = process.env.__FIREBASE_DEFAULTS__;
  if (defaultsJsonString) {
    return JSON.parse(defaultsJsonString);
  }
};

const getDefaultsFromCookie = (): FirebaseDefaults | undefined => {
  if (typeof document === 'undefined') {
    return;
  }
  let match;
  try {
    match = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
  } catch (e) {
    // Some environments such as Angular Universal SSR have a
    // `document` object but error on accessing `document.cookie`.
    return;
  }
  const decoded = match && base64Decode(match[1]);
  return decoded && JSON.parse(decoded);
};

/**
 * Get the __FIREBASE_DEFAULTS__ object. It checks in order:
 * (1) if such an object exists as a property of `globalThis`
 * (2) if such an object was provided on a shell environment variable
 * (3) if such an object exists in a cookie
 * @public
 */
export const getDefaults = (): FirebaseDefaults | undefined => {
  try {
    return (
      getDefaultsFromGlobal() ||
      getDefaultsFromEnvVariable() ||
      getDefaultsFromCookie()
    );
  } catch (e) {
    /**
     * Catch-all for being unable to get __FIREBASE_DEFAULTS__ due
     * to any environment case we have not accounted for. Log to
     * info instead of swallowing so we can find these unknown cases
     * and add paths for them if needed.
     */
    console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
    return;
  }
};

/**
 * Returns emulator host stored in the __FIREBASE_DEFAULTS__ object
 * for the given product.
 * @returns a URL host formatted like `127.0.0.1:9999` or `[::1]:4000` if available
 * @public
 */
export const getDefaultEmulatorHost = (
  productName: string
): string | undefined => getDefaults()?.emulatorHosts?.[productName];

/**
 * Returns emulator hostname and port stored in the __FIREBASE_DEFAULTS__ object
 * for the given product.
 * @returns a pair of hostname and port like `["::1", 4000]` if available
 * @public
 */
export const getDefaultEmulatorHostnameAndPort = (
  productName: string
): [hostname: string, port: number] | undefined => {
  const host = getDefaultEmulatorHost(productName);
  if (!host) {
    return undefined;
  }
  const separatorIndex = host.lastIndexOf(':'); // Finding the last since IPv6 addr also has colons.
  if (separatorIndex <= 0 || separatorIndex + 1 === host.length) {
    throw new Error(`Invalid host ${host} with no separate hostname and port!`);
  }
  // eslint-disable-next-line no-restricted-globals
  const port = parseInt(host.substring(separatorIndex + 1), 10);
  if (host[0] === '[') {
    // Bracket-quoted `[ipv6addr]:port` => return "ipv6addr" (without brackets).
    return [host.substring(1, separatorIndex - 1), port];
  } else {
    return [host.substring(0, separatorIndex), port];
  }
};

/**
 * Returns Firebase app config stored in the __FIREBASE_DEFAULTS__ object.
 * @public
 */
export const getDefaultAppConfig = (): Record<string, string> | undefined =>
  getDefaults()?.config;

/**
 * Returns an experimental setting on the __FIREBASE_DEFAULTS__ object (properties
 * prefixed by "_")
 * @public
 */
export const getExperimentalSetting = <T extends ExperimentalKey>(
  name: T
): FirebaseDefaults[`_${T}`] =>
  getDefaults()?.[`_${name}`] as FirebaseDefaults[`_${T}`];
