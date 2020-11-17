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

import { SDK_VERSION } from '@firebase/app-exp';
import { querystring } from '@firebase/util';

import { AuthErrorCode } from '../../core/errors';
import { _assert, _createError } from '../../core/util/assert';
import { Delay } from '../../core/util/delay';
import { _emulatorUrl } from '../../core/util/emulator';
import { Auth } from '../../model/auth';
import { _window } from '../auth_window';
import * as gapiLoader from './gapi';

const PING_TIMEOUT = new Delay(5000, 15000);
const IFRAME_PATH = '__/auth/iframe';
const EMULATED_IFRAME_PATH = 'emulator/auth/iframe';

const IFRAME_ATTRIBUTES = {
  style: {
    position: 'absolute',
    top: '-100px',
    width: '1px',
    height: '1px'
  }
};

function getIframeUrl(auth: Auth): string {
  const config = auth.config;
  const url = config.emulator
    ? _emulatorUrl(config, EMULATED_IFRAME_PATH)
    : `https://${auth.config.authDomain!}/${IFRAME_PATH}`;

  const params = {
    apiKey: config.apiKey,
    appName: auth.name,
    v: SDK_VERSION
  };
  // Can pass 'eid' as one of 'p' (production), 's' (staging), or 't' (test)
  // TODO: do we care about frameworks? pass them as fw=

  return `${url}?${querystring(params).slice(1)}`;
}

export async function _openIframe(auth: Auth): Promise<gapi.iframes.Iframe> {
  const context = await gapiLoader._loadGapi(auth);
  const gapi = _window().gapi;
  _assert(gapi, auth, AuthErrorCode.INTERNAL_ERROR);
  return context.open(
    {
      where: document.body,
      url: getIframeUrl(auth),
      messageHandlersFilter: gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER,
      attributes: IFRAME_ATTRIBUTES,
      dontclear: true
    },
    (iframe: gapi.iframes.Iframe) =>
      new Promise(async (resolve, reject) => {
        await iframe.restyle({
          // Prevent iframe from closing on mouse out.
          setHideOnLeave: false
        });

        const networkError = _createError(
          auth,
          AuthErrorCode.NETWORK_REQUEST_FAILED
        );
        // Confirm iframe is correctly loaded.
        // To fallback on failure, set a timeout.
        const networkErrorTimer = _window().setTimeout(() => {
          reject(networkError);
        }, PING_TIMEOUT.get());
        // Clear timer and resolve pending iframe ready promise.
        function clearTimerAndResolve(): void {
          _window().clearTimeout(networkErrorTimer);
          resolve(iframe);
        }
        // This returns an IThenable. However the reject part does not call
        // when the iframe is not loaded.
        iframe.ping(clearTimerAndResolve).then(clearTimerAndResolve, () => {
          reject(networkError);
        });
      })
  );
}
