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

import { querystring } from '@firebase/util';

import { AuthErrorCode } from '../../core/errors';
import { _assert, _createError } from '../../core/util/assert';
import { Delay } from '../../core/util/delay';
import { Auth } from '../../model/auth';
import { _window } from '../auth_window';
import * as jsHelpers from '../load_js';
import { Recaptcha } from './recaptcha';
import { MockReCaptcha } from './recaptcha_mock';

// ReCaptcha will load using the same callback, so the callback function needs
// to be kept around
export const _JSLOAD_CALLBACK = jsHelpers._generateCallbackName('rcb');
const NETWORK_TIMEOUT_DELAY = new Delay(30000, 60000);
const RECAPTCHA_BASE = 'https://www.google.com/recaptcha/api.js?';

export interface ReCaptchaLoader {
  load(auth: Auth, hl?: string): Promise<Recaptcha>;
  clearedOneInstance(): void;
}

/**
 * Loader for the GReCaptcha library. There should only ever be one of this.
 */
export class ReCaptchaLoaderImpl implements ReCaptchaLoader {
  private hostLanguage = '';
  private counter = 0;
  private readonly librarySeparatelyLoaded = !!_window().grecaptcha;

  load(auth: Auth, hl = ''): Promise<Recaptcha> {
    _assert(isHostLanguageValid(hl), auth, AuthErrorCode.ARGUMENT_ERROR);

    if (this.shouldResolveImmediately(hl)) {
      return Promise.resolve(_window().grecaptcha!);
    }
    return new Promise<Recaptcha>((resolve, reject) => {
      const networkTimeout = _window().setTimeout(() => {
        reject(_createError(auth, AuthErrorCode.NETWORK_REQUEST_FAILED));
      }, NETWORK_TIMEOUT_DELAY.get());

      _window()[_JSLOAD_CALLBACK] = () => {
        _window().clearTimeout(networkTimeout);
        delete _window()[_JSLOAD_CALLBACK];

        const recaptcha = _window().grecaptcha;

        if (!recaptcha) {
          reject(_createError(auth, AuthErrorCode.INTERNAL_ERROR));
          return;
        }

        // Wrap the greptcha render function so that we know if the developer has
        // called it separately
        const render = recaptcha.render;
        recaptcha.render = (container, params) => {
          const widgetId = render(container, params);
          this.counter++;
          return widgetId;
        };

        this.hostLanguage = hl;
        resolve(recaptcha);
      };

      const url = `${RECAPTCHA_BASE}?${querystring({
        onload: _JSLOAD_CALLBACK,
        render: 'explicit',
        hl
      })}`;

      jsHelpers._loadJS(url).catch(() => {
        clearTimeout(networkTimeout);
        reject(_createError(auth, AuthErrorCode.INTERNAL_ERROR));
      });
    });
  }

  clearedOneInstance(): void {
    this.counter--;
  }

  private shouldResolveImmediately(hl: string): boolean {
    // We can resolve immediately if:
    //   • grecaptcha is already defined AND (
    //     1. the requested language codes are the same OR
    //     2. there exists already a ReCaptcha on the page
    //     3. the library was already loaded by the app
    // In cases (2) and (3), we _can't_ reload as it would break the recaptchas
    // that are already in the page
    return (
      !!_window().grecaptcha &&
      (hl === this.hostLanguage ||
        this.counter > 0 ||
        this.librarySeparatelyLoaded)
    );
  }
}

function isHostLanguageValid(hl: string): boolean {
  return hl.length <= 6 && /^\s*[a-zA-Z0-9\-]*\s*$/.test(hl);
}

export class MockReCaptchaLoaderImpl implements ReCaptchaLoader {
  async load(auth: Auth): Promise<Recaptcha> {
    return new MockReCaptcha(auth);
  }

  clearedOneInstance(): void {}
}
