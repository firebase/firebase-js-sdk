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
import { getDefaultsFromPostinstall } from './postinstall';

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

const LOOPBACK_HOSTNAME_RE =
  /^(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*localhost|127\.0\.0\.1|\[::1\]|::1)$/i;

const LOOPBACK_HOST_RE =
  /^(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*localhost|127\.0\.0\.1|\[::1\]):(\d{1,5})$/i;

function isLoopbackHostWithPort(host: unknown): host is string {
  if (typeof host !== 'string') {
    return false;
  }
  const match = LOOPBACK_HOST_RE.exec(host);
  if (!match) {
    return false;
  }
  const port = Number(match[1]);
  return port >= 1 && port <= 65535;
}

/**
 * Sanitize configuration loaded from the `__FIREBASE_DEFAULTS__` cookie.
 * Cookies can be set by sibling subdomains or on non-HSTS origins, so unlike
 * `globalThis` or environment-variable defaults they are not a trusted
 * same-origin source. Preserve `config` (and experimental settings such as
 * `_authTokenSyncURL`, which Auth restricts to same-origin) for deployed
 * Firebase Web Frameworks apps, strip `forceEnvironment`, and honor
 * `emulatorHosts` only when both the current page and each target emulator
 * host are loopback addresses.
 */
function sanitizeCookieDefaults(
  defaults: unknown
): FirebaseDefaults | undefined {
  if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults)) {
    return undefined;
  }
  const sanitized = defaults as FirebaseDefaults;
  if ('forceEnvironment' in sanitized) {
    console.warn(
      '[@firebase/util] Ignoring `forceEnvironment` in __FIREBASE_DEFAULTS__ cookie.'
    );
    delete sanitized.forceEnvironment;
  }
  if ('emulatorHosts' in sanitized) {
    const pageHostname =
      typeof location !== 'undefined'
        ? location.hostname
        : document.location?.hostname;
    if (!pageHostname || !LOOPBACK_HOSTNAME_RE.test(pageHostname)) {
      console.warn(
        '[@firebase/util] Ignoring `emulatorHosts` in __FIREBASE_DEFAULTS__ ' +
          'cookie on non-loopback origin.'
      );
      delete sanitized.emulatorHosts;
    } else if (
      !sanitized.emulatorHosts ||
      typeof sanitized.emulatorHosts !== 'object' ||
      Array.isArray(sanitized.emulatorHosts)
    ) {
      delete sanitized.emulatorHosts;
    } else {
      for (const product of Object.keys(sanitized.emulatorHosts)) {
        const host = sanitized.emulatorHosts[product];
        if (!isLoopbackHostWithPort(host)) {
          console.warn(
            `[@firebase/util] Ignoring \`emulatorHosts.${product}\` in ` +
              `__FIREBASE_DEFAULTS__ cookie: '${String(host)}' is not a loopback host.`
          );
          delete sanitized.emulatorHosts[product];
        }
      }
      if (Object.keys(sanitized.emulatorHosts).length === 0) {
        delete sanitized.emulatorHosts;
      }
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

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
  return decoded ? sanitizeCookieDefaults(JSON.parse(decoded)) : undefined;
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
      getDefaultsFromPostinstall() ||
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
