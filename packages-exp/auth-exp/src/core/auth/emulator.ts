/**
 * @license
 * Copyright 2021 Google LLC
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
import * as externs from '@firebase/auth-types-exp';
import { AuthErrorCode } from '../errors';
import { _assert } from '../util/assert';
import { _castAuth } from './auth_impl';

/**
 * Changes the Auth instance to communicate with the Firebase Auth Emulator, instead of production
 * Firebase Auth services.
 *
 * @remarks
 * This must be called synchronously immediately following the first call to
 * {@link @firebase/auth#initializeAuth}.  Do not use with production credentials as emulator
 * traffic is not encrypted.
 *
 *
 * @example
 * ```javascript
 * useAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
 * ```
 *
 * @param auth - The Auth instance.
 * @param url - The URL at which the emulator is running (eg, 'http://localhost:9099').
 * @param options.disableWarnings - (Optional: default false) Disable the warning banner attached to the DOM
 *
 * @public
 */
export function useAuthEmulator(
  auth: externs.Auth,
  url: string,
  options?: { disableWarnings: boolean }
): void {
  const authInternal = _castAuth(auth);
  _assert(
    authInternal._canInitEmulator,
    authInternal,
    AuthErrorCode.EMULATOR_CONFIG_FAILED
  );

  _assert(
    /^https?:\/\//.test(url),
    authInternal,
    AuthErrorCode.INVALID_EMULATOR_SCHEME
  );

  authInternal.config.emulator = { url };
  authInternal.settings.appVerificationDisabledForTesting = true;
  emitEmulatorWarning(!!options?.disableWarnings);
}

function emitEmulatorWarning(disableBanner: boolean): void {
  function attachBanner(): void {
    const el = document.createElement('p');
    const sty = el.style;
    el.innerText =
      'Running in emulator mode. Do not use with production credentials.';
    sty.position = 'fixed';
    sty.width = '100%';
    sty.backgroundColor = '#ffffff';
    sty.border = '.1em solid #000000';
    sty.color = '#ff0000';
    sty.bottom = '0px';
    sty.left = '0px';
    sty.margin = '0px';
    sty.zIndex = '10000';
    sty.textAlign = 'center';
    el.classList.add('firebase-emulator-warning');
    document.body.appendChild(el);
  }

  if (typeof console !== 'undefined' && typeof console.info === 'function') {
    console.info(
      'WARNING: You are using the Auth Emulator,' +
        ' which is intended for local testing only.  Do not use with' +
        ' production credentials.'
    );
  }
  if (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    !disableBanner
  ) {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', attachBanner);
    } else {
      attachBanner();
    }
  }
}
