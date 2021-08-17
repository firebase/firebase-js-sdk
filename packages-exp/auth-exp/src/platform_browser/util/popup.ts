/**
 * @license
 * Copyright 2020 Google LLC.
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

import { AuthErrorCode } from '../../core/errors';
import { _assert } from '../../core/util/assert';
import {
  _isChromeIOS,
  _isFirefox,
  _isIOSStandalone
} from '../../core/util/browser';
import { AuthInternal } from '../../model/auth';

const BASE_POPUP_OPTIONS = {
  location: 'yes',
  resizable: 'yes',
  statusbar: 'yes',
  toolbar: 'no'
};

const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 600;
const TARGET_BLANK = '_blank';

const FIREFOX_EMPTY_URL = 'http://localhost';

export class AuthPopup {
  associatedEvent: string | null = null;

  constructor(readonly window: Window | null) {}

  close(): void {
    if (this.window) {
      try {
        this.window.close();
      } catch (e) {}
    }
  }
}

export function _open(
  auth: AuthInternal,
  url?: string,
  name?: string,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT
): AuthPopup {
  const top = Math.max((window.screen.availHeight - height) / 2, 0).toString();
  const left = Math.max((window.screen.availWidth - width) / 2, 0).toString();
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
    target = _isChromeIOS(ua) ? TARGET_BLANK : name;
  }

  if (_isFirefox(ua)) {
    // Firefox complains when invalid URLs are popped out. Hacky way to bypass.
    url = url || FIREFOX_EMPTY_URL;
    // Firefox disables by default scrolling on popup windows, which can create
    // issues when the user has many Google accounts, for instance.
    options.scrollbars = 'yes';
  }

  const optionsString = Object.entries(options).reduce(
    (accum, [key, value]) => `${accum}${key}=${value},`,
    ''
  );

  if (_isIOSStandalone(ua) && target !== '_self') {
    openAsNewWindowIOS(url || '', target);
    return new AuthPopup(null);
  }

  // about:blank getting sanitized causing browsers like IE/Edge to display
  // brief error message before redirecting to handler.
  const newWin = window.open(url || '', target, optionsString);
  _assert(newWin, auth, AuthErrorCode.POPUP_BLOCKED);

  // Flaky on IE edge, encapsulate with a try and catch.
  try {
    newWin.focus();
  } catch (e) {}

  return new AuthPopup(newWin);
}

function openAsNewWindowIOS(url: string, target: string): void {
  const el = document.createElement('a');
  el.href = url;
  el.target = target;
  const click = document.createEvent('MouseEvent');
  click.initMouseEvent(
    'click',
    true,
    true,
    window,
    1,
    0,
    0,
    0,
    0,
    false,
    false,
    false,
    false,
    1,
    null
  );
  el.dispatchEvent(click);
}
