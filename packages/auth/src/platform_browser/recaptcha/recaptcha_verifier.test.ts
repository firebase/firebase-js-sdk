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

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { _window } from '../auth_window';
import { Recaptcha } from './recaptcha';
import { RecaptchaParameters } from '../../model/public_types';

import { ReCaptchaLoader } from './recaptcha_loader';
import { MockReCaptcha } from './recaptcha_mock';
import { RecaptchaVerifier } from './recaptcha_verifier';
describe('platform_browser/recaptcha/recaptcha_verifier', () => {
  let auth: TestAuth;
  let container: HTMLElement;
  let verifier: RecaptchaVerifier;
  let parameters: RecaptchaParameters;
  let recaptchaLoader: ReCaptchaLoader;

  beforeEach(async () => {
    fetch.setUp();
    auth = await testAuth();
    auth.languageCode = 'fr';
    container = document.createElement('div');
    parameters = {};
    verifier = new RecaptchaVerifier(auth, container, parameters);
    // The verifier will have set the parameters.callback field to be the wrapped callback

    mockEndpoint(Endpoint.GET_RECAPTCHA_PARAM, {
      recaptchaSiteKey: 'recaptcha-key'
    });
    recaptchaLoader = verifier._recaptchaLoader;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fetch.tearDown();
  });

  describe('#render', () => {
    it('caches the promise if not completed and returns if called multiple times', () => {
      // This will force the loader to never return so the render promise never completes
      vi.spyOn(recaptchaLoader, 'load').mockReturnValue(new Promise(() => {}));
      const renderPromise = verifier.render();
      expect(verifier.render()).toBe(renderPromise);
    });

    it('appends an empty div to the container element', async () => {
      expect(container.childElementCount).toBe(0);
      await verifier.render();
      expect(container.childElementCount).toBe(1);
    });

    it('sets the site key on the parameters object', async () => {
      await verifier.render();
      expect(parameters.sitekey).toBe('recaptcha-key');
    });

    it('sets loads the recaptcha per the app language code', async () => {
      vi.spyOn(recaptchaLoader, 'load');
      await verifier.render();
      expect(recaptchaLoader.load).toHaveBeenCalledWith(auth, 'fr');
    });

    it('calls render on the underlying recaptcha widget', async () => {
      const widget = new MockReCaptcha(auth);
      vi.spyOn(widget, 'render');
      vi.spyOn(recaptchaLoader, 'load').mockReturnValue(
        Promise.resolve(widget)
      );
      await verifier.render();
      expect(widget.render).toHaveBeenCalledWith(
        container.children[0],
        parameters
      );
    });

    it('in case of error, resets render promise', async () => {
      vi.spyOn(recaptchaLoader, 'load').mockImplementation(() =>
        Promise.reject(new Error('nope'))
      );
      const promise = verifier.render();
      await expect(promise).rejects.toThrow('nope');
      const secondPromise = verifier.render();
      expect(secondPromise).not.toBe(promise);
      await expect(secondPromise).rejects.toThrow('nope');
    });
  });

  describe('#verify', () => {
    let recaptcha: Recaptcha;
    beforeEach(() => {
      recaptcha = new MockReCaptcha(auth);
      vi.spyOn(recaptchaLoader, 'load').mockReturnValue(
        Promise.resolve(recaptcha)
      );
    });

    it('returns immediately if response is available', async () => {
      vi.spyOn(recaptcha, 'getResponse').mockReturnValue('recaptcha-response');
      expect(await verifier.verify()).toBe('recaptcha-response');
    });

    it('resolves with the token in the callback', async () => {
      vi.spyOn(recaptcha, 'getResponse').mockReturnValue('');
      const promise = verifier.verify();
      expect(typeof (await promise)).toBe('string');
    });

    it('calls existing callback if provided', async () => {
      let token = '';
      parameters = {
        callback: (t: string): void => {
          token = t;
        }
      };

      verifier = new RecaptchaVerifier(auth, container, parameters);
      const expected = await verifier.verify();
      expect(token).toBe(expected);
    });

    it('calls existing global function if on the window', async () => {
      let token = '';
      _window().callbackOnWindowObject = (t: unknown): void => {
        token = t as string;
      };

      parameters = {
        callback: 'callbackOnWindowObject'
      };

      verifier = new RecaptchaVerifier(auth, container, parameters);
      const expected = await verifier.verify();
      expect(token).toBe(expected);

      delete _window().callbackOnWindowObject;
    });
  });

  describe('#reset', () => {
    it('calls reset on the underlying widget', async () => {
      const recaptcha = new MockReCaptcha(auth);
      vi.spyOn(recaptchaLoader, 'load').mockReturnValue(
        Promise.resolve(recaptcha)
      );
      vi.spyOn(recaptcha, 'reset');
      await verifier.render();
      verifier._reset();
      expect(recaptcha.reset).toHaveBeenCalled();
    });
  });

  describe('#clear', () => {
    it('removes the child node from the container', async () => {
      await verifier.render();
      expect(container.children.length).toBe(1);
      verifier.clear();
      expect(container.children.length).toBe(0);
    });

    it('causes other methods of the verifier to throw if called subsequently', async () => {
      verifier.clear();
      expect(() => verifier.clear()).toThrow(
        FirebaseError,
        'Firebase: An internal AuthError has occurred. (auth/internal-error).'
      );
      expect(() => verifier._reset()).toThrow(
        FirebaseError,
        'Firebase: An internal AuthError has occurred. (auth/internal-error).'
      );
      await expect(verifier.render()).rejects.toThrow(
        FirebaseError,
        'Firebase: An internal AuthError has occurred. (auth/internal-error).'
      );
      await expect(verifier.verify()).rejects.toThrow(
        FirebaseError,
        'Firebase: An internal AuthError has occurred. (auth/internal-error).'
      );
    });
  });
});
