/**
* Copyright 2017 Google Inc.
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
 * @return {string} user agent string
 */
export const getUA = function() {
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator['userAgent'] === 'string'
  ) {
    return navigator['userAgent'];
  } else {
    return '';
  }
};

/**
 * Detect Cordova / PhoneGap / Ionic frameworks on a mobile device.
 *
 * Deliberately does not rely on checking `file://` URLs (as this fails PhoneGap in the Ripple emulator) nor
 * Cordova `onDeviceReady`, which would normally wait for a callback.
 *
 * @return {boolean} isMobileCordova
 */
export const isMobileCordova = function() {
  return (
    typeof window !== 'undefined' &&
    !!(window['cordova'] || window['phonegap'] || window['PhoneGap']) &&
    /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(getUA())
  );
};

/**
 * Detect React Native.
 *
 * @return {boolean} True if ReactNative environment is detected.
 */
export const isReactNative = function() {
  return (
    typeof navigator === 'object' && navigator['product'] === 'ReactNative'
  );
};

/**
 * Detect Node.js.
 *
 * @return {boolean} True if Node.js environment is detected.
 */
export const isNodeSdk = function() {
  return CONSTANTS.NODE_CLIENT === true || CONSTANTS.NODE_ADMIN === true;
};
