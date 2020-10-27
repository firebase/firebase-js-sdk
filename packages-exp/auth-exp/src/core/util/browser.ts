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

import { isIE, getUA } from '@firebase/util';

interface NavigatorStandalone extends Navigator {
  standalone?: unknown;
}

interface Document {
  documentMode?: number;
}

/**
 * Enums for Browser name.
 */
export const enum BrowserName {
  ANDROID = 'Android',
  BLACKBERRY = 'Blackberry',
  EDGE = 'Edge',
  FIREFOX = 'Firefox',
  IE = 'IE',
  IEMOBILE = 'IEMobile',
  OPERA = 'Opera',
  OTHER = 'Other',
  CHROME = 'Chrome',
  SAFARI = 'Safari',
  SILK = 'Silk',
  WEBOS = 'Webos'
}

/**
 * Determine the browser for the purposes of reporting usage to the API
 */
export function _getBrowserName(userAgent: string): BrowserName | string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('opera/') || ua.includes('opr/') || ua.includes('opios/')) {
    return BrowserName.OPERA;
  } else if (_isIEMobile(ua)) {
    // Windows phone IEMobile browser.
    return BrowserName.IEMOBILE;
  } else if (ua.includes('msie') || ua.includes('trident/')) {
    return BrowserName.IE;
  } else if (ua.includes('edge/')) {
    return BrowserName.EDGE;
  } else if (_isFirefox(ua)) {
    return BrowserName.FIREFOX;
  } else if (ua.includes('silk/')) {
    return BrowserName.SILK;
  } else if (_isBlackBerry(ua)) {
    // Blackberry browser.
    return BrowserName.BLACKBERRY;
  } else if (_isWebOS(ua)) {
    // WebOS default browser.
    return BrowserName.WEBOS;
  } else if (_isSafari(ua)) {
    return BrowserName.SAFARI;
  } else if (
    (ua.includes('chrome/') || _isChromeIOS(ua)) &&
    !ua.includes('edge/')
  ) {
    return BrowserName.CHROME;
  } else if (_isAndroid(ua)) {
    // Android stock browser.
    return BrowserName.ANDROID;
  } else {
    // Most modern browsers have name/version at end of user agent string.
    const re = /([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/;
    const matches = userAgent.match(re);
    if (matches?.length === 2) {
      return matches[1];
    }
  }
  return BrowserName.OTHER;
}

export function _isFirefox(ua: string): boolean {
  return /firefox\//i.test(ua);
}

export function _isSafari(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return (
    ua.includes('safari/') &&
    !ua.includes('chrome/') &&
    !ua.includes('crios/') &&
    !ua.includes('android')
  );
}

export function _isChromeIOS(ua: string): boolean {
  return /crios\//i.test(ua);
}

export function _isIEMobile(ua: string): boolean {
  return /iemobile/i.test(ua);
}

export function _isAndroid(ua: string): boolean {
  return /android/i.test(ua);
}

export function _isBlackBerry(ua: string): boolean {
  return /blackberry/i.test(ua);
}

export function _isWebOS(ua: string): boolean {
  return /webos/i.test(ua);
}

export function _isIOS(ua: string): boolean {
  return /iphone|ipad|ipod/i.test(ua);
}

export function _isIOSStandalone(ua: string): boolean {
  return _isIOS(ua) && !!(window.navigator as NavigatorStandalone)?.standalone;
}

export function _isIE10(): boolean {
  return isIE() && (document as Document).documentMode === 10;
}

export function _isMobileBrowser(ua: string = getUA()): boolean {
  // TODO: implement getBrowserName equivalent for OS.
  return (
    _isIOS(ua) ||
    _isAndroid(ua) ||
    _isWebOS(ua) ||
    _isBlackBerry(ua) ||
    /windows phone/i.test(ua) ||
    _isIEMobile(ua)
  );
}

export function _isIframe(): boolean {
  try {
    // Check that the current window is not the top window.
    // If so, return true.
    return !!(window && window !== window.top);
  } catch (e) {
    return false;
  }
}
