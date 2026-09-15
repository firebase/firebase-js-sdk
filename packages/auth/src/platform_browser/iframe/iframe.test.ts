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

import { SDK_VERSION } from '@firebase/app';
import { FirebaseError } from '@firebase/util';

import {
  TEST_AUTH_DOMAIN,
  TEST_KEY,
  testAuth,
  TestAuth
} from '../../../test/helpers/mock_auth';
import { stubSingleTimeout } from '../../../test/helpers/timeout_stub';
import { _window } from '../auth_window';
import * as gapiLoader from './gapi';
import { _openIframe } from './iframe';
import { MockInstance } from 'vitest';

vi.mock('./gapi', { spy: true });
type IframesCallback = (iframesLib: unknown) => Promise<unknown>;

describe('platform_browser/iframe/iframe', () => {
  let auth: TestAuth;
  let iframeSettings: Record<string, unknown>;
  let libraryLoadedCallback: IframesCallback;

  beforeEach(async () => {
    _window().gapi = {
      iframes: {
        CROSS_ORIGIN_IFRAMES_FILTER: 'cross-origin-filter'
      }
    } as unknown as typeof gapi;
    auth = await testAuth();

    vi.spyOn(gapiLoader, '_loadGapi').mockReturnValue(
      Promise.resolve({
        open: vi.fn(
          (settings: Record<string, unknown>, cb: IframesCallback) => {
            iframeSettings = settings;
            libraryLoadedCallback = cb;
          }
        )
      }) as unknown as Promise<gapi.iframes.Context>
    );
  });

  afterEach(() => {
    delete (_window() as any).gapi;
    sinon.restore();
    vi.restoreAllMocks();
  });

  it('sets all the correct settings', async () => {
    await _openIframe(auth);

    expect(iframeSettings.where).toEqual(document.body);
    expect(iframeSettings.url).toBe(
      `https://${TEST_AUTH_DOMAIN}/__/auth/iframe?apiKey=${TEST_KEY}&appName=test-app&v=${SDK_VERSION}`
    );
    expect(iframeSettings.messageHandlersFilter).toBe('cross-origin-filter');
    expect(iframeSettings.attributes).toEqual({
      style: {
        position: 'absolute',
        top: '-100px',
        width: '1px',
        height: '1px'
      },
      'aria-hidden': 'true',
      tabindex: '-1'
    });
    expect(iframeSettings.dontclear).toBe(true);
  });

  it('sets a single framework if logged', async () => {
    auth._logFramework('Magical');
    await _openIframe(auth);
    expect(iframeSettings.url).toBe(
      `https://${TEST_AUTH_DOMAIN}/__/auth/iframe?apiKey=${TEST_KEY}&appName=test-app&v=${SDK_VERSION}&fw=Magical`
    );
  });

  it('sets multiple frameworks comma-separated if logged', async () => {
    auth._logFramework('Mythical');
    auth._logFramework('Magical');
    auth._logFramework('Magical'); // Duplicate, should be ignored
    await _openIframe(auth);
    expect(iframeSettings.url).toBe(
      `https://${TEST_AUTH_DOMAIN}/__/auth/iframe?apiKey=${TEST_KEY}&appName=test-app&v=${SDK_VERSION}&fw=Magical%2CMythical`
    );
  });

  describe('on load callback', () => {
    let iframe: { restyle: MockInstance; ping: MockInstance };
    let clearTimeoutStub: MockInstance;

    beforeEach(() => {
      iframe = {
        restyle: vi.fn(),
        ping: vi.fn()
      };
      clearTimeoutStub = vi.spyOn(_window(), 'clearTimeout');
    });

    it('restyles the iframe to prevent hideOnLeave', async () => {
      stubSingleTimeout();
      iframe.ping.mockReturnValue(Promise.resolve([iframe]));
      await libraryLoadedCallback(iframe);
      expect(iframe.restyle).toHaveBeenCalledWith({
        setHideOnLeave: false
      });
    });

    it('rejects if the iframe ping promise rejects', async () => {
      stubSingleTimeout();
      iframe.ping.mockReturnValue(Promise.reject('no'));
      await expect(libraryLoadedCallback(iframe)).rejects.toThrow(
        FirebaseError,
        'auth/network-request-failed'
      );
    });

    it('clears the rejection timeout on success', async () => {
      stubSingleTimeout(123);
      iframe.ping.mockReturnValue(Promise.resolve([iframe]));
      await libraryLoadedCallback(iframe);
      expect(clearTimeoutStub).toHaveBeenCalledWith(123);
    });
  });
});
