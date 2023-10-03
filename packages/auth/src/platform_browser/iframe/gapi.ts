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

import { AuthErrorCode } from '../../core/errors';
import { _createError } from '../../core/util/assert';
import { Delay } from '../../core/util/delay';
import { AuthInternal } from '../../model/auth';
import { _window } from '../auth_window';
import * as js from '../load_js';

const NETWORK_TIMEOUT = new Delay(30000, 60000);

/**
 * Reset unlaoded GApi modules. If gapi.load fails due to a network error,
 * it will stop working after a retrial. This is a hack to fix this issue.
 */
function resetUnloadedGapiModules(): void {
  // Clear last failed gapi.load state to force next gapi.load to first
  // load the failed gapi.iframes module.
  // Get gapix.beacon context.
  const beacon = _window().___jsl;
  // Get current hint.
  if (beacon?.H) {
    // Get gapi hint.
    for (const hint of Object.keys(beacon.H)) {
      // Requested modules.
      beacon.H[hint].r = beacon.H[hint].r || [];
      // Loaded modules.
      beacon.H[hint].L = beacon.H[hint].L || [];
      // Set requested modules to a copy of the loaded modules.
      beacon.H[hint].r = [...beacon.H[hint].L];
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

function loadGapi(auth: AuthInternal): Promise<gapi.iframes.Context> {
  return new Promise<gapi.iframes.Context>((resolve, reject) => {
    // Function to run when gapi.load is ready.
    function loadGapiIframe(): void {
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
          reject(_createError(auth, AuthErrorCode.NETWORK_REQUEST_FAILED));
        },
        timeout: NETWORK_TIMEOUT.get()
      });
    }

    if (_window().gapi?.iframes?.Iframe) {
      // If gapi.iframes.Iframe available, resolve.
      resolve(gapi.iframes.getContext());
    } else if (!!_window().gapi?.load) {
      // Gapi loader ready, load gapi.iframes.
      loadGapiIframe();
    } else {
      // Create a new iframe callback when this is called so as not to overwrite
      // any previous defined callback. This happens if this method is called
      // multiple times in parallel and could result in the later callback
      // overwriting the previous one. This would end up with a iframe
      // timeout.
      const cbName = js._generateCallbackName('iframefcb');
      // GApi loader not available, dynamically load platform.js.
      _window()[cbName] = () => {
        // GApi loader should be ready.
        if (!!gapi.load) {
          loadGapiIframe();
        } else {
          // Gapi loader failed, throw error.
          reject(_createError(auth, AuthErrorCode.NETWORK_REQUEST_FAILED));
        }
      };
      // Load GApi loader.
      return js
        ._loadJS(`${js._gapiScriptUrl()}?onload=${cbName}`)
        .catch(e => reject(e));
    }
  }).catch(error => {
    // Reset cached promise to allow for retrial.
    cachedGApiLoader = null;
    throw error;
  });
}

let cachedGApiLoader: Promise<gapi.iframes.Context> | null = null;
export function _loadGapi(auth: AuthInternal): Promise<gapi.iframes.Context> {
  cachedGApiLoader = cachedGApiLoader || loadGapi(auth);
  return cachedGApiLoader;
}

export function _resetLoader(): void {
  cachedGApiLoader = null;
}
