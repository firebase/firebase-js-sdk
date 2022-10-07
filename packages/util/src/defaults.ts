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
import { getGlobal } from './environment';

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
 * process.env.__FIREBASE_DEFAULTS__ or a JSON file whose path is in
 * process.env.__FIREBASE_DEFAULTS_PATH__
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
  const match = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
  const decoded = match && base64Decode(match[1]);
  return decoded && JSON.parse(decoded);
};

/**
 * Get the __FIREBASE_DEFAULTS__ object. It checks in order:
 * (1) if such an object exists as a property of `globalThis`
 * (2) if such an object was provided on a shell environment variable
 * (3) if such an object exists in a cookie
 */
const getDefaults = (): FirebaseDefaults | undefined =>
  getDefaultsFromGlobal() ||
  getDefaultsFromEnvVariable() ||
  getDefaultsFromCookie();

/**
 * Returns emulator host stored in the __FIREBASE_DEFAULTS__ object
 * for the given product.
 * @public
 */
export const getDefaultEmulatorHost = (
  productName: string
): string | undefined => getDefaults()?.emulatorHosts?.[productName];

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
