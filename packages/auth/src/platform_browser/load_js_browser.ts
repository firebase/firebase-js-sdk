/**
 * @license
 * Copyright 2026 Google LLC
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

import { _setTrustedScriptSrc } from '@firebase/app';

import { _createError } from '../core/util/assert';
import { AuthErrorCode } from '../core/errors';

function getScriptParentElement(): HTMLDocument | HTMLHeadElement {
  return document.getElementsByTagName('head')?.[0] ?? document;
}

/**
 * Loads an external script by inserting a script tag into the page. The script
 * URL is set through the Firebase Trusted Types policy when Trusted Types are
 * supported, so that this works on pages that enforce Trusted Types.
 *
 * @internal
 */
export function _loadJSInBrowser(url: string): Promise<Event> {
  // TODO: consider adding timeout support & cancellation
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    try {
      _setTrustedScriptSrc(el, url);
    } catch (e) {
      reject(e);
      return;
    }
    el.onload = resolve;
    el.onerror = e => {
      const error = _createError(AuthErrorCode.INTERNAL_ERROR);
      error.customData = e as unknown as Record<string, unknown>;
      reject(error);
    };
    el.type = 'text/javascript';
    el.charset = 'UTF-8';
    getScriptParentElement().appendChild(el);
  });
}
