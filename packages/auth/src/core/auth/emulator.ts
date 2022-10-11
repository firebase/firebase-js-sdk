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
import { Auth } from '../../model/public_types';
import { AuthErrorCode } from '../errors';
import { _assert } from '../util/assert';
import { _castAuth } from './auth_impl';

/**
 * Changes the {@link Auth} instance to communicate with the Firebase Auth Emulator, instead of production
 * Firebase Auth services.
 *
 * @remarks
 * This must be called synchronously immediately following the first call to
 * {@link initializeAuth}.  Do not use with production credentials as emulator
 * traffic is not encrypted.
 *
 *
 * @example
 * ```javascript
 * connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
 * ```
 *
 * @param auth - The {@link Auth} instance.
 * @param url - The URL at which the emulator is running (eg, 'http://localhost:9099').
 * @param options - Optional. `options.disableWarnings` defaults to `false`. Set it to
 * `true` to disable the warning banner attached to the DOM.
 *
 * @public
 */
export function connectAuthEmulator(
  auth: Auth,
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

  const disableWarnings = !!options?.disableWarnings;

  const protocol = extractProtocol(url);
  const { host, port } = extractHostAndPort(url);
  const portStr = port === null ? '' : `:${port}`;

  // Always replace path with "/" (even if input url had no path at all, or had a different one).
  authInternal.config.emulator = { url: `${protocol}//${host}${portStr}/` };
  authInternal.settings.appVerificationDisabledForTesting = true;
  authInternal.emulatorConfig = Object.freeze({
    host,
    port,
    protocol: protocol.replace(':', ''),
    options: Object.freeze({ disableWarnings })
  });

  if (!disableWarnings) {
    emitEmulatorWarning();
  }
}

function extractProtocol(url: string): string {
  const protocolEnd = url.indexOf(':');
  return protocolEnd < 0 ? '' : url.substr(0, protocolEnd + 1);
}

function extractHostAndPort(url: string): {
  host: string;
  port: number | null;
} {
  const protocol = extractProtocol(url);
  const authority = /(\/\/)?([^?#/]+)/.exec(url.substr(protocol.length)); // Between // and /, ? or #.
  if (!authority) {
    return { host: '', port: null };
  }
  const hostAndPort = authority[2].split('@').pop() || ''; // Strip out "username:password@".
  const bracketedIPv6 = /^(\[[^\]]+\])(:|$)/.exec(hostAndPort);
  if (bracketedIPv6) {
    const host = bracketedIPv6[1];
    return { host, port: parsePort(hostAndPort.substr(host.length + 1)) };
  } else {
    const [host, port] = hostAndPort.split(':');
    return { host, port: parsePort(port) };
  }
}

function parsePort(portStr: string): number | null {
  if (!portStr) {
    return null;
  }
  const port = Number(portStr);
  if (isNaN(port)) {
    return null;
  }
  return port;
}

function emitEmulatorWarning(): void {
  function attachBanner(): void {
    const el = document.createElement('p');
    const sty = el.style;
    el.innerText =
      'Running in emulator mode. Do not use with production credentials.';
    sty.position = 'fixed';
    sty.width = '100%';
    sty.backgroundColor = '#ffffff';
    sty.border = '.1em solid #000000';
    sty.color = '#b50000';
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
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', attachBanner);
    } else {
      attachBanner();
    }
  }
}
