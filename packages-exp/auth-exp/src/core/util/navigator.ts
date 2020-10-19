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

import { isBrowserExtension } from '@firebase/util';
import { _isHttpOrHttps } from './location';

/**
 * Determine whether the browser is working online
 */
export function _isOnline(): boolean {
  if (
    typeof navigator !== 'undefined' &&
    navigator &&
    'onLine' in navigator &&
    typeof navigator.onLine === 'boolean' &&
    // Apply only for traditional web apps and Chrome extensions.
    // This is especially true for Cordova apps which have unreliable
    // navigator.onLine behavior unless cordova-plugin-network-information is
    // installed which overwrites the native navigator.onLine value and
    // defines navigator.connection.
    (_isHttpOrHttps() || isBrowserExtension() || 'connection' in navigator)
  ) {
    return navigator.onLine;
  }
  // If we can't determine the state, assume it is online.
  return true;
}

export function _getUserLanguage(): string | null {
  if (typeof navigator === 'undefined') {
    return null;
  }
  const navigatorLanguage: NavigatorLanguage = navigator;
  return (
    // Most reliable, but only supported in Chrome/Firefox.
    (navigatorLanguage.languages && navigatorLanguage.languages[0]) ||
    // Supported in most browsers, but returns the language of the browser
    // UI, not the language set in browser settings.
    navigatorLanguage.language ||
    // Couldn't determine language.
    null
  );
}
