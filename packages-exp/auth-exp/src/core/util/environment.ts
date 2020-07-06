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

const CHROME_IOS_UA = 'crios/';
const FIREFOX_UA = 'firefox/';
const IPHONE_UA = 'iphone';
const IPOD_UA = 'ipod';
const IPAD_UA = 'ipad';

interface NavigatorStandalone extends Navigator {
  standalone?: unknown;
}

export function _isFirefox(ua: string): boolean {
  return ua.includes(FIREFOX_UA);
}

export function _isChromeIOS(ua: string): boolean {
  return ua.includes(CHROME_IOS_UA);
}

export function _isIOS(ua: string): boolean {
  return ua.includes(IPHONE_UA) || ua.includes(IPOD_UA) || ua.includes(IPAD_UA);
}

export function _isIOSStandalone(ua: string): boolean {
  return _isIOS(ua) && !!(window.navigator as NavigatorStandalone)?.standalone;
}