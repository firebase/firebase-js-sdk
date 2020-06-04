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

import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../../core/errors';
import { Delay } from '../../core/util/delay';
import { Auth } from '../../model/auth';
import { AuthWindow } from '../auth_window';
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

function pullGrecaptcha(): Recaptcha | undefined {
  return (window as AuthWindow).grecaptcha;
}

const WINDOW = window as AuthWindow;

/**
 * Loader for the GReCaptcha library. There should only ever be one of this.
 */
export class ReCaptchaLoaderImpl implements ReCaptchaLoader {
  private hl = '';
  private counter = 0;
  private readonly librarySeparatelyLoaded = !!pullGrecaptcha();

  load(auth: Auth, hl = ''): Promise<Recaptcha> {
    if (this.shouldResolveImmediately(hl)) {
      return Promise.resolve(pullGrecaptcha()!);
    }
    return new Promise<Recaptcha>((resolve, reject) => {
      const networkTimeout = WINDOW.setTimeout(() => {
        reject(
          AUTH_ERROR_FACTORY.create(AuthErrorCode.NETWORK_REQUEST_FAILED, {
            appName: auth.name
          })
        );
      }, NETWORK_TIMEOUT_DELAY.get());

      WINDOW[_JSLOAD_CALLBACK] = () => {
        WINDOW.clearTimeout(networkTimeout);
        delete WINDOW[_JSLOAD_CALLBACK];

        const recaptcha = pullGrecaptcha();

        if (!recaptcha) {
          reject(
            AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, {
              appName: auth.name
            })
          );
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

        this.hl = hl;
        resolve(recaptcha);
      };

      const url = `${RECAPTCHA_BASE}?${querystring({
        onload: _JSLOAD_CALLBACK,
        render: 'explicit',
        hl
      })}`;

      jsHelpers._loadJS(url).catch(() => {
        clearTimeout(networkTimeout);
        reject(
          AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, {
            appName: auth.name
          })
        );
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
      !!pullGrecaptcha() &&
      (hl === this.hl || this.counter > 0 || this.librarySeparatelyLoaded)
    );
  }
}

class MockReCaptchaLoaderImpl implements ReCaptchaLoader {
  async load(auth: Auth): Promise<Recaptcha> {
    return new MockReCaptcha(auth);
  }

  clearedOneInstance(): void {}
}

export const MOCK_RECAPTCHA_LOADER: ReCaptchaLoader = new MockReCaptchaLoaderImpl();
export const RECAPTCHA_LOADER: ReCaptchaLoader = new ReCaptchaLoaderImpl();
