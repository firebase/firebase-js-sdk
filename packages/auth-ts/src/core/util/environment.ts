/**
 * @license
 * Copyright 2019 Google Inc.
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

import { getCurrentScheme, isHttpOrHttps } from './location';

export function isChromeExtension(): boolean {
  return getCurrentScheme() === 'chrome-extension:';
}

interface CordovaNavigator extends Navigator {
  connection: any;
}

/**
 * @param {?Object=} opt_navigator The optional navigator object typically used
 *     for testing.
 * @return {boolean} Whether the app is currently online. If offline, false is
 *     returned. If this cannot be determined, true is returned.
 */
export function isOnline(): boolean {
  if (
    navigator &&
    typeof navigator.onLine === 'boolean' &&
    // Apply only for traditional web apps and Chrome extensions.
    // This is especially true for Cordova apps which have unreliable
    // navigator.onLine behavior unless cordova-plugin-network-information is
    // installed which overwrites the native navigator.onLine value and
    // defines navigator.connection.
    (isHttpOrHttps() ||
      isChromeExtension() ||
      typeof (navigator as CordovaNavigator).connection !== 'undefined')
  ) {
    return navigator.onLine;
  }
  // If we can't determine the state, assume it is online.
  return true;
}
