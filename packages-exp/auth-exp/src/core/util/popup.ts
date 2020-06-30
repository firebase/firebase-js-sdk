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

import { getUA } from '@firebase/util';

import { AuthErrorCode } from '../errors';
import { assert } from './assert';

const BASE_POPUP_OPTIONS = {
  location: 'yes',
  resizable: 'yes',
  statusbar: 'yes',
  toolbar: 'no'
};

const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 600;

const CHROME_IOS_UA = 'crios/';
const FIREFOX_UA = 'firefox/';
const FIREFOX_EMPTY_URL = 'http://localhost';

export class AuthPopup {
  public associatedEvent: string | null = null;

  constructor(public readonly window: Window) {}

  close() {
    try {
      this.window.close();
    } catch (e) {}
  }
}

export function _open(
  appName: string,
  url?: string,
  name?: string,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT
): AuthPopup {
  const top = Math.min(
    (window.screen.availHeight - height) / 2,
    0
  ).toString();
  const left = Math.min((window.screen.availWidth - width) / 2, 0).toString();
  let target = '';

  const options: { [key: string]: string } = {
    ...BASE_POPUP_OPTIONS,
    width: width.toString(),
    height: height.toString(),
    top,
    left
  };

  // Chrome iOS 7 and 8 is returning an undefined popup win when target is
  // specified, even though the popup is not necessarily blocked.
  const ua = getUA().toLowerCase();

  if (name) {
    target = ua.includes(CHROME_IOS_UA) ? '_blank' : name;
  }

  if (ua.includes(FIREFOX_UA)) {
    // Firefox complains when invalid URLs are popped out. Hacky way to bypass.
    url = url || FIREFOX_EMPTY_URL;
    // Firefox disables by default scrolling on popup windows, which can create
    // issues when the user has many Google accounts, for instance.
    options.scrollbars = 'yes';
  }

  const optionsString = Object.entries(options).reduce((accum, [key, value]) => `${accum}${key}=${value},`, '');

  // TODO: Plain-old window.open isn't going to work for iOS, need to fix this
  //       (see goog.window.open)

  // about:blank getting sanitized causing browsers like IE/Edge to display
  // brief error message before redirecting to handler.
  const newWin = window.open(url || '', target, optionsString);
  assert(newWin, appName, AuthErrorCode.POPUP_BLOCKED);

  // Flaky on IE edge, encapsulate with a try and catch.
  try {
    newWin.focus();
  } catch (e) {}

  return new AuthPopup(newWin);
}
