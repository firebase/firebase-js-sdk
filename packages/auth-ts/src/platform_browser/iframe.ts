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

import firebase from '@firebase/app';
import { loadGapi } from './gapi_loader';
import { Auth } from '../model/auth';
import { Delay } from '../core/util/delay';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../core/errors';

const PING_TIMEOUT = new Delay(5000, 15000);

function getIframeUrl(auth: Auth): string {
  const url = new URL(`https://${auth.config.authDomain!}/__/auth/iframe`);

  const searchParams = new URLSearchParams();
  searchParams.set('apiKey', auth.config.apiKey);
  searchParams.set('appName', auth.name);
  searchParams.set('v', firebase.SDK_VERSION);
  // Can pass 'eid' as one of 'p' (production), 's' (staging), or 't' (test)
  // TODO: do we care about frameworks? pass them as fw=

  url.search = searchParams.toString();
  return url.toString();
}

export async function openIframe(auth: Auth): Promise<gapi.iframes.Iframe> {
  const context = await loadGapi(auth);
  return context.open(
    {
      where: document.body,
      url: getIframeUrl(auth),
      messageHandlersFilter: gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER,
      attributes: {
        style: {
          position: 'absolute',
          top: '-100px',
          width: '1px',
          height: '1px'
        }
      },
      dontclear: true
    },
    (iframe: gapi.iframes.Iframe) => {
      return new Promise(async (resolve, reject) => {
        await iframe.restyle({
          // Prevent iframe from closing on mouse out.
          setHideOnLeave: false
        });
        // Confirm iframe is correctly loaded.
        // To fallback on failure, set a timeout.
        const networkErrorTimer = setTimeout(() => {
          reject(
            AUTH_ERROR_FACTORY.create(AuthErrorCode.NETWORK_REQUEST_FAILED, {
              appName: auth.name
            })
          );
        }, PING_TIMEOUT.get());
        // Clear timer and resolve pending iframe ready promise.
        const clearTimerAndResolve = (): void => {
          clearTimeout(networkErrorTimer);
          resolve(iframe);
        };
        // This returns an IThenable. However the reject part does not call
        // when the iframe is not loaded.
        iframe.ping(clearTimerAndResolve).then(clearTimerAndResolve, () => {
          reject(
            AUTH_ERROR_FACTORY.create(AuthErrorCode.NETWORK_REQUEST_FAILED, {
              appName: auth.name
            })
          );
        });
      });
    }
  );
}
