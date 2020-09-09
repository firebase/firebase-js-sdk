/**
 * @license
 * Copyright 2017 Google LLC
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

import { CONSTANTS } from './constants';

/**
 * Returns navigator.userAgent string or '' if it's not defined.
 * @return user agent string
 */
export function getUA(): string {
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator['userAgent'] === 'string'
  ) {
    return navigator['userAgent'];
  } else {
    return '';
  }
}

/**
 * Detect Cordova / PhoneGap / Ionic frameworks on a mobile device.
 *
 * Deliberately does not rely on checking `file://` URLs (as this fails PhoneGap
 * in the Ripple emulator) nor Cordova `onDeviceReady`, which would normally
 * wait for a callback.
 */
export function isMobileCordova(): boolean {
  return (
    typeof window !== 'undefined' &&
    // @ts-ignore Setting up an broadly applicable index signature for Window
    // just to deal with this case would probably be a bad idea.
    !!(window['cordova'] || window['phonegap'] || window['PhoneGap']) &&
    /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(getUA())
  );
}

/**
 * Detect Node.js.
 *
 * @return true if Node.js environment is detected.
 */
// Node detection logic from: https://github.com/iliakan/detect-node/
export function isNode(): boolean {
  try {
    return (
      Object.prototype.toString.call(global.process) === '[object process]'
    );
  } catch (e) {
    return false;
  }
}

/**
 * Detect Browser Environment
 */
export function isBrowser(): boolean {
  return typeof self === 'object' && self.self === self;
}

/**
 * Detect browser extensions (Chrome and Firefox at least).
 */
interface BrowserRuntime {
  id?: unknown;
}
declare const chrome: { runtime?: BrowserRuntime };
declare const browser: { runtime?: BrowserRuntime };
export function isBrowserExtension(): boolean {
  const runtime =
    typeof chrome === 'object'
      ? chrome.runtime
      : typeof browser === 'object'
      ? browser.runtime
      : undefined;
  return typeof runtime === 'object' && runtime.id !== undefined;
}

/**
 * Detect React Native.
 *
 * @return true if ReactNative environment is detected.
 */
export function isReactNative(): boolean {
  return (
    typeof navigator === 'object' && navigator['product'] === 'ReactNative'
  );
}

/** Detects Electron apps. */
export function isElectron(): boolean {
  return getUA().indexOf('Electron/') >= 0;
}

/** Detects Internet Explorer. */
export function isIE(): boolean {
  const ua = getUA();
  return ua.indexOf('MSIE ') >= 0 || ua.indexOf('Trident/') >= 0;
}

/** Detects Universal Windows Platform apps. */
export function isUWP(): boolean {
  return getUA().indexOf('MSAppHost/') >= 0;
}

/**
 * Detect whether the current SDK build is the Node version.
 *
 * @return true if it's the Node SDK build.
 */
export function isNodeSdk(): boolean {
  return CONSTANTS.NODE_CLIENT === true || CONSTANTS.NODE_ADMIN === true;
}

/** Returns true if we are running in Safari. */
export function isSafari(): boolean {
  return (
    !isNode() &&
    navigator.userAgent.includes('Safari') &&
    !navigator.userAgent.includes('Chrome')
  );
}

/**
 * This method checks if indexedDB is supported by current browser/service worker context
 * @return true if indexedDB is supported by current browser/service worker context
 */
export function isIndexedDBAvailable(): boolean {
  return 'indexedDB' in self && indexedDB != null;
}

/**
 * This method validates browser context for indexedDB by opening a dummy indexedDB database and reject
 * if errors occur during the database open operation.
 */
export function validateIndexedDBOpenable(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      let preExist: boolean = true;
      const DB_CHECK_NAME =
        'validate-browser-context-for-indexeddb-analytics-module';
      const request = window.indexedDB.open(DB_CHECK_NAME);
      request.onsuccess = () => {
        request.result.close();
        // delete database only when it doesn't pre-exist
        if (!preExist) {
          window.indexedDB.deleteDatabase(DB_CHECK_NAME);
        }
        resolve(true);
      };
      request.onupgradeneeded = () => {
        preExist = false;
      };

      request.onerror = () => {
        reject(request.error?.message || '');
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 *
 * This method checks whether cookie is enabled within current browser
 * @return true if cookie is enabled within current browser
 */
export function areCookiesEnabled(): boolean {
  if (!navigator || !navigator.cookieEnabled) {
    return false;
  }
  return true;
}
