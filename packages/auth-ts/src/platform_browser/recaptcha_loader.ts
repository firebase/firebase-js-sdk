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

import 'grecaptcha';
import { generateCallbackName, loadJS } from './load_js';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../core/errors';
import { Auth } from '../model/auth';
import { Delay } from '../core/util/delay';
import { querystring } from '@firebase/util';
import { AuthWindow } from './auth_window';
import { MOCK_RECAPTCHA } from './recaptcha_mock';

// ReCaptcha will load using the same callback, so the callback function needs
// to be kept around
const JSLOAD_CALLBACK_ = generateCallbackName('rcb');
const NETWORK_TIMEOUT_DELAY_ = new Delay(30000, 60000);
const RECAPTCHA_BASE_ = 'https://www.google.com/recaptcha/api.js?';

export interface ReCaptchaLoader {
  load(auth: Auth, hl?: string): Promise<ReCaptchaV2.ReCaptcha>;
  clearedOneInstance(): void;
}

function pullGrecaptcha(): ReCaptchaV2.ReCaptcha | undefined {
  return (window as AuthWindow).grecaptcha;
}

/**
 * Loader for the GReCaptcha library. There should only ever be one of this.
 */
class ReCaptchaLoaderImpl implements ReCaptchaLoader {
  private hl = '';
  private counter = 0;
  private readonly librarySeparatelyLoaded = !!pullGrecaptcha();

  load(auth: Auth, hl = ''): Promise<ReCaptchaV2.ReCaptcha> {
    if (this.shouldResolveImmediately(hl)) {
      return Promise.resolve(pullGrecaptcha()!);
    }
    return new Promise<ReCaptchaV2.ReCaptcha>((resolve, reject) => {
      const networkTimeout = setTimeout(() => {
        reject(
          AUTH_ERROR_FACTORY.create(AuthErrorCode.NETWORK_REQUEST_FAILED, {
            appName: auth.name
          })
        );
      }, NETWORK_TIMEOUT_DELAY_.get());

      (window as AuthWindow)[JSLOAD_CALLBACK_] = () => {
        clearTimeout(networkTimeout);
        delete (window as AuthWindow)[JSLOAD_CALLBACK_];

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

      const url = `${RECAPTCHA_BASE_}?${querystring({
        onload: JSLOAD_CALLBACK_,
        render: 'explicit',
        hl
      })}`;

      loadJS(url).catch(() => {
        clearTimeout(networkTimeout);
        reject(
          AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, {
            appName: auth.name
          })
        );
      });
    });
  }

  clearedOneInstance() {
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
  async load(
    auth: Auth,
    hl?: string | undefined
  ): Promise<ReCaptchaV2.ReCaptcha> {
    return MOCK_RECAPTCHA;
  }

  clearedOneInstance(): void {}
}

export const MOCK_RECAPTCHA_LOADER: ReCaptchaLoader = new MockReCaptchaLoaderImpl();
export const RECAPTCHA_LOADER: ReCaptchaLoader = new ReCaptchaLoaderImpl();
