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

import * as impl from '@firebase/auth/internal';
import {
  getUA,
  isBrowserExtension,
  isReactNative,
  isNode,
  isIE,
  isIndexedDBAvailable
} from '@firebase/util';

declare global {
  interface Document {
    documentMode?: number;
  }
}

const CORDOVA_ONDEVICEREADY_TIMEOUT_MS = 1000;

function _getCurrentScheme(): string | null {
  return self?.location?.protocol || null;
}

/**
 * @return {boolean} Whether the current environment is http or https.
 */
function _isHttpOrHttps(): boolean {
  return _getCurrentScheme() === 'http:' || _getCurrentScheme() === 'https:';
}

/**
 * @param {?string=} ua The user agent.
 * @return {boolean} Whether the app is rendered in a mobile iOS or Android
 *     Cordova environment.
 */
export function _isAndroidOrIosCordovaScheme(ua: string = getUA()): boolean {
  return !!(
    (_getCurrentScheme() === 'file:' ||
      _getCurrentScheme() === 'ionic:' ||
      _getCurrentScheme() === 'capacitor:') &&
    ua.toLowerCase().match(/iphone|ipad|ipod|android/)
  );
}

/**
 * @return {boolean} Whether the environment is a native environment, where
 *     CORS checks do not apply.
 */
function _isNativeEnvironment(): boolean {
  return isReactNative() || isNode();
}

/**
 * Checks whether the user agent is IE11.
 * @return {boolean} True if it is IE11.
 */
function _isIe11(): boolean {
  return isIE() && document?.documentMode === 11;
}

/**
 * Checks whether the user agent is Edge.
 * @param {string} userAgent The browser user agent string.
 * @return {boolean} True if it is Edge.
 */
function _isEdge(ua: string = getUA()): boolean {
  return /Edge\/\d+/.test(ua);
}

/**
 * @param {?string=} opt_userAgent The navigator user agent.
 * @return {boolean} Whether local storage is not synchronized between an iframe
 *     and a popup of the same domain.
 */
function _isLocalStorageNotSynchronized(ua: string = getUA()): boolean {
  return _isIe11() || _isEdge(ua);
}

/** @return {boolean} Whether web storage is supported. */
export function _isWebStorageSupported(): boolean {
  try {
    const storage = self.localStorage;
    const key = impl._generateEventId();
    if (storage) {
      // setItem will throw an exception if we cannot access WebStorage (e.g.,
      // Safari in private mode).
      storage['setItem'](key, '1');
      storage['removeItem'](key);
      // For browsers where iframe web storage does not synchronize with a popup
      // of the same domain, indexedDB is used for persistent storage. These
      // browsers include IE11 and Edge.
      // Make sure it is supported (IE11 and Edge private mode does not support
      // that).
      if (_isLocalStorageNotSynchronized()) {
        // In such browsers, if indexedDB is not supported, an iframe cannot be
        // notified of the popup sign in result.
        return isIndexedDBAvailable();
      }
      return true;
    }
  } catch (e) {
    // localStorage is not available from a worker. Test availability of
    // indexedDB.
    return _isWorker() && isIndexedDBAvailable();
  }
  return false;
}

/**
 * @param {?Object=} global The optional global scope.
 * @return {boolean} Whether current environment is a worker.
 */
export function _isWorker(): boolean {
  // WorkerGlobalScope only defined in worker environment.
  return (
    typeof global !== 'undefined' &&
    'WorkerGlobalScope' in global &&
    'importScripts' in global
  );
}

export function _isPopupRedirectSupported(): boolean {
  return (
    (_isHttpOrHttps() ||
      isBrowserExtension() ||
      _isAndroidOrIosCordovaScheme()) &&
    // React Native with remote debugging reports its location.protocol as
    // http.
    !_isNativeEnvironment() &&
    // Local storage has to be supported for browser popup and redirect
    // operations to work.
    _isWebStorageSupported() &&
    // DOM, popups and redirects are not supported within a worker.
    !_isWorker()
  );
}

/** Quick check that indicates the platform *may* be Cordova */
export function _isLikelyCordova(): boolean {
  return _isAndroidOrIosCordovaScheme() && typeof document !== 'undefined';
}

export async function _isCordova(): Promise<boolean> {
  if (!_isLikelyCordova()) {
    return false;
  }

  return new Promise(resolve => {
    const timeoutId = setTimeout(() => {
      // We've waited long enough; the telltale Cordova event didn't happen
      resolve(false);
    }, CORDOVA_ONDEVICEREADY_TIMEOUT_MS);

    document.addEventListener('deviceready', () => {
      clearTimeout(timeoutId);
      resolve(true);
    });
  });
}

export function _getSelfWindow(): Window | null {
  return typeof window !== 'undefined' ? window : null;
}
