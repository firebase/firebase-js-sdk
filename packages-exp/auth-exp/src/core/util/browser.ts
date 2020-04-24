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

/**
 * Enums for Browser name.
 */
export enum BrowserName {
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
  } else if (ua.includes('iemobile')) {
    // Windows phone IEMobile browser.
    return BrowserName.IEMOBILE;
  } else if (ua.includes('msie') || ua.includes('trident/')) {
    return BrowserName.IE;
  } else if (ua.includes('edge/')) {
    return BrowserName.EDGE;
  } else if (ua.includes('firefox/')) {
    return BrowserName.FIREFOX;
  } else if (ua.includes('silk/')) {
    return BrowserName.SILK;
  } else if (ua.includes('blackberry')) {
    // Blackberry browser.
    return BrowserName.BLACKBERRY;
  } else if (ua.includes('webos')) {
    // WebOS default browser.
    return BrowserName.WEBOS;
  } else if (
    ua.includes('safari/') &&
    !ua.includes('chrome/') &&
    !ua.includes('crios/') &&
    !ua.includes('android')
  ) {
    return BrowserName.SAFARI;
  } else if (
    (ua.includes('chrome/') || ua.includes('crios/')) &&
    !ua.includes('edge/')
  ) {
    return BrowserName.CHROME;
  } else if (ua.includes('android')) {
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
