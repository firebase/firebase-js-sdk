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

import { FirebaseError } from '@firebase/util';

import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import { stubSingleTimeout } from '../../../test/helpers/timeout_stub';
import { _window } from '../auth_window';
import * as jsHelpers from '../load_js';
import {
  _JSLOAD_CALLBACK,
  MockReCaptchaLoaderImpl,
  ReCaptchaLoader,
  ReCaptchaLoaderImpl
} from './recaptcha_loader';
import { MockReCaptcha } from './recaptcha_mock';

vi.mock('../load_js', { spy: true });

describe('platform_browser/recaptcha/recaptcha_loader', () => {
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete _window().grecaptcha;
  });

  describe('MockLoader', () => {
    it('returns a MockRecaptcha instance', async () => {
      expect(await new MockReCaptchaLoaderImpl().load(auth)).toBeInstanceOf(
        MockReCaptcha
      );
    });
  });

  describe('RealLoader', () => {
    let triggerNetworkTimeout: () => void;
    let jsLoader: { resolve: () => void; reject: () => void };
    let loader: ReCaptchaLoader;
    const networkTimeoutId = 123;

    beforeEach(() => {
      triggerNetworkTimeout = stubSingleTimeout(networkTimeoutId);

      vi.spyOn(jsHelpers, '_loadJS').mockImplementation(() => {
        return new Promise<void>((resolve, reject) => {
          jsLoader = { resolve, reject };
        }) as unknown as Promise<Event>;
      });

      loader = new ReCaptchaLoaderImpl();
    });

    describe('network timeout / errors', () => {
      it('rejects if the network times out', async () => {
        const promise = loader.load(auth);
        triggerNetworkTimeout();
        await expect(promise).rejects.toThrow(
          FirebaseError,
          'Firebase: A network AuthError (such as timeout, interrupted connection or unreachable host) has occurred. (auth/network-request-failed).'
        );
      });

      it('rejects with an internal error if the loadJS call fails', async () => {
        const promise = loader.load(auth);
        jsLoader.reject();
        await expect(promise).rejects.toThrow(
          FirebaseError,
          'Firebase: An internal AuthError has occurred. (auth/internal-error).'
        );
      });
    });

    describe('on js load callback', () => {
      function spoofJsLoad(): void {
        _window()[_JSLOAD_CALLBACK]();
      }

      it('clears the network timeout', async () => {
        vi.spyOn(_window(), 'clearTimeout');
        const promise = loader.load(auth).catch(() => {});
        spoofJsLoad();
        expect(_window().clearTimeout).toHaveBeenCalledWith(networkTimeoutId);
        await promise;
      });

      it('rejects if the grecaptcha object is not on the window', async () => {
        const promise = loader.load(auth);
        spoofJsLoad();
        await expect(promise).rejects.toThrow(
          FirebaseError,
          'Firebase: An internal AuthError has occurred. (auth/internal-error).'
        );
      });

      it('overwrites the render method', async () => {
        const promise = loader.load(auth);
        const mockRecaptcha = new MockReCaptcha(auth);
        const oldRenderMethod = mockRecaptcha.render;
        _window().grecaptcha = mockRecaptcha;
        spoofJsLoad();
        expect((await promise).render).not.toBe(oldRenderMethod);
      });

      it('returns immediately if the new language code matches the old', async () => {
        const promise = loader.load(auth);
        _window().grecaptcha = new MockReCaptcha(auth);
        spoofJsLoad();
        await promise;
        // Notice no call to spoofJsLoad..
        expect(await loader.load(auth)).toBe(_window().grecaptcha);
      });

      it('returns immediately if grecaptcha is already set on window', async () => {
        _window().grecaptcha = new MockReCaptcha(auth);
        const loader = new ReCaptchaLoaderImpl();
        expect(await loader.load(auth)).toBe(_window().grecaptcha);
      });

      it('fails if the host language is invalid', async () => {
        expect(() => loader.load(auth, 'javascript:injection')).toThrow(
          FirebaseError,
          'auth/argument-error'
        );
      });
    });
  });
});
