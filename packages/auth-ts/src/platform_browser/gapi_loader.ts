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

import { Delay } from '../core/util/delay';
import { Auth } from '../model/auth';
import { generateCallbackName, loadJS } from './load_js';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../core/errors';
import { AuthWindow } from './auth_window';

const NETWORK_TIMEOUT_ = new Delay(30000, 60000);
const LOADJS_CALLBACK_PREFIX_ = 'iframefcb';

/**
 * Reset unlaoded GApi modules. If gapi.load fails due to a network error,
 * it will stop working after a retrial. This is a hack to fix this issue.
 */
export function resetUnloadedGapiModules(): void {
  // Clear last failed gapi.load state to force next gapi.load to first
  // load the failed gapi.iframes module.
  // Get gapix.beacon context.
  const beacon = (window as AuthWindow)['___jsl'];
  // Get current hint.
  if (beacon?.H) {
    // Get gapi hint.
    for (const hint in beacon.H) {
      // Requested modules.
      beacon.H[hint].r = beacon.H[hint].r || [];
      // Loaded modules.
      beacon.H[hint].L = beacon.H[hint].L || [];
      // Set requested modules to a copy of the loaded modules.
      beacon.H[hint].r = beacon.H[hint].L.concat();
      // Clear pending callbacks.
      if (beacon.CP) {
        for (let i = 0; i < beacon.CP.length; i++) {
          // Remove all failed pending callbacks.
          beacon.CP[i] = null;
        }
      }
    }
  }
}

function loadGapi_(auth: Auth): Promise<gapi.iframes.Context> {
  return new Promise<gapi.iframes.Context>((resolve, reject) => {
    // Function to run when gapi.load is ready.
    const loadGapiIframe = () => {
      // The developer may have tried to previously run gapi.load and failed.
      // Run this to fix that.
      resetUnloadedGapiModules();
      gapi.load('gapi.iframes', {
        callback: () => {
          resolve(gapi.iframes.getContext());
        },
        ontimeout: () => {
          // The above reset may be sufficient, but having this reset after
          // failure ensures that if the developer calls gapi.load after the
          // connection is re-established and before another attempt to embed
          // the iframe, it would work and would not be broken because of our
          // failed attempt.
          // Timeout when gapi.iframes.Iframe not loaded.
          resetUnloadedGapiModules();
          reject(
            AUTH_ERROR_FACTORY.create(AuthErrorCode.NETWORK_REQUEST_FAILED, {
              appName: auth.name
            })
          );
        },
        timeout: NETWORK_TIMEOUT_.get()
      });
    };
    if (typeof gapi !== 'undefined' && gapi?.iframes?.Iframe !== undefined) {
      // If gapi.iframes.Iframe available, resolve.
      resolve(gapi.iframes.getContext());
    } else if (typeof gapi !== 'undefined' && gapi?.load !== undefined) {
      // Gapi loader ready, load gapi.iframes.
      loadGapiIframe();
    } else {
      // Create a new iframe callback when this is called so as not to overwrite
      // any previous defined callback. This happens if this method is called
      // multiple times in parallel and could result in the later callback
      // overwriting the previous one. This would end up with a iframe
      // timeout.
      const cbName = generateCallbackName(LOADJS_CALLBACK_PREFIX_);
      // GApi loader not available, dynamically load platform.js.
      (window as AuthWindow)[cbName] = () => {
        // GApi loader should be ready.
        if (gapi.load !== undefined) {
          loadGapiIframe();
        } else {
          // Gapi loader failed, throw error.
          reject(
            AUTH_ERROR_FACTORY.create(AuthErrorCode.NETWORK_REQUEST_FAILED, {
              appName: auth.name
            })
          );
        }
      };
      // Load GApi loader.
      return loadJS(`https://apis.google.com/js/api.js?onload=${cbName}`);
    }
  }).catch(error => {
    // Reset cached promise to allow for retrial.
    cachedGApiLoader_ = null;
    throw error;
  });
}

let cachedGApiLoader_: Promise<gapi.iframes.Context> | null = null;
export function loadGapi(auth: Auth): Promise<gapi.iframes.Context> {
  cachedGApiLoader_ = cachedGApiLoader_ || loadGapi_(auth);
  return cachedGApiLoader_;
}
