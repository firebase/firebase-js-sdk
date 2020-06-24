/**
 * @license
 * Copyright 2020 Google LLC
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

import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { FirebaseError } from '@firebase/util';

import { mockEndpoint } from '../../../test/api/helper';
import { testAuth } from '../../../test/mock_auth';
import * as fetch from '../../../test/mock_fetch';
import { Endpoint } from '../../api';
import { Auth } from '../../model/auth';
import { AUTH_WINDOW } from '../auth_window';
import { Parameters, Recaptcha } from './recaptcha';
import { _JSLOAD_CALLBACK, ReCaptchaLoader } from './recaptcha_loader';
import { MockReCaptcha } from './recaptcha_mock';
import { RecaptchaVerifier } from './recaptcha_verifier';

use(chaiAsPromised);
use(sinonChai);

describe('platform_browser/recaptcha/recaptcha_verifier.ts', () => {
  let auth: Auth;
  let container: HTMLElement;
  let verifier: RecaptchaVerifier;
  let parameters: Parameters;
  let recaptchaLoader: ReCaptchaLoader;

  beforeEach(async () => {
    fetch.setUp();
    auth = await testAuth();
    auth.languageCode = 'fr';
    container = document.createElement('div');
    parameters = {};
    verifier = new RecaptchaVerifier(container, parameters, auth);
    // The verifier will have set the parameters.callback field to be the wrapped callback

    mockEndpoint(Endpoint.GET_RECAPTCHA_PARAM, {
      recaptchaSiteKey: 'recaptcha-key'
    });
    recaptchaLoader = verifier._recaptchaLoader;
  });

  afterEach(() => {
    sinon.restore();
    fetch.tearDown();
  });

  context('#render', () => {
    it('caches the promise if not completed and returns if called multiple times', () => {
      // This will force the loader to never return so the render promise never completes
      sinon.stub(recaptchaLoader, 'load').returns(new Promise(() => {}));
      const renderPromise = verifier.render();
      expect(verifier.render()).to.eq(renderPromise);
    });

    it('appends an empty div to the container element', async () => {
      expect(container.childElementCount).to.eq(0);
      await verifier.render();
      expect(container.childElementCount).to.eq(1);
    });

    it('sets the site key on the parameters object', async () => {
      await verifier.render();
      expect(parameters.sitekey).to.eq('recaptcha-key');
    });

    it('sets loads the recaptcha per the app language code', async () => {
      sinon.spy(recaptchaLoader, 'load');
      await verifier.render();
      expect(recaptchaLoader.load).to.have.been.calledWith(auth, 'fr');
    });

    it('calls render on the underlying recaptcha widget', async () => {
      const widget = new MockReCaptcha(auth);
      sinon.spy(widget, 'render');
      sinon
        .stub(recaptchaLoader, 'load')
        .returns(Promise.resolve(widget));
      await verifier.render();
      expect(widget.render).to.have.been.calledWith(
        container.children[0],
        parameters
      );
    });

    it('in case of error, resets render promise', async () => {
      sinon.stub(recaptchaLoader, 'load').returns(Promise.reject('nope'));
      const promise = verifier.render();
      await expect(promise).to.be.rejectedWith('nope');
      expect(verifier.render()).not.to.eq(promise);
    });
  });

  context('#verify', () => {
    let recaptcha: Recaptcha;
    beforeEach(() => {
      recaptcha = new MockReCaptcha(auth);
      sinon
        .stub(recaptchaLoader, 'load')
        .returns(Promise.resolve(recaptcha));
    });

    it('returns immediately if response is available', async () => {
      sinon.stub(recaptcha, 'getResponse').returns('recaptcha-response');
      expect(await verifier.verify()).to.eq('recaptcha-response');
    });

    it('resolves with the token in the callback', async () => {
      sinon.stub(recaptcha, 'getResponse').returns('');
      const promise = verifier.verify();
      expect(typeof (await promise)).to.eq('string');
    });

    it('calls existing callback if provided', async () => {
      let token = '';
      parameters = {
        callback: (t: string): void => {
          token = t;
        }
      };

      verifier = new RecaptchaVerifier(container, parameters, auth);
      const expected = await verifier.verify();
      expect(token).to.eq(expected);
    });

    it('calls existing global function if on the window', async () => {
      let token = '';
      AUTH_WINDOW.callbackOnWindowObject = (t: unknown): void => {
        token = t as string;
      };

      parameters = {
        callback: 'callbackOnWindowObject'
      };

      verifier = new RecaptchaVerifier(container, parameters, auth);
      const expected = await verifier.verify();
      expect(token).to.eq(expected);

      delete AUTH_WINDOW.callbackOnWindowObject;
    });
  });

  context('#reset', () => {
    it('calls reset on the underlying widget', async () => {
      const recaptcha = new MockReCaptcha(auth);
      sinon
        .stub(recaptchaLoader, 'load')
        .returns(Promise.resolve(recaptcha));
      sinon.spy(recaptcha, 'reset');
      await verifier.render();
      verifier._reset();
      expect(recaptcha.reset).to.have.been.called;
    });
  });

  context('#clear', () => {
    it('removes the child node from the container', async () => {
      await verifier.render();
      expect(container.children.length).to.eq(1);
      verifier.clear();
      expect(container.children.length).to.eq(0);
    });

    it('causes other methods of the verifier to throw if called subsequently', async () => {
      verifier.clear();
      expect(() => verifier.clear()).to.throw(
        FirebaseError,
        'Firebase: An internal AuthError has occurred. (auth/internal-error).'
      );
      expect(() => verifier._reset()).to.throw(
        FirebaseError,
        'Firebase: An internal AuthError has occurred. (auth/internal-error).'
      );
      await expect(verifier.render()).to.be.rejectedWith(
        FirebaseError,
        'Firebase: An internal AuthError has occurred. (auth/internal-error).'
      );
      await expect(verifier.verify()).to.be.rejectedWith(
        FirebaseError,
        'Firebase: An internal AuthError has occurred. (auth/internal-error).'
      );
    });
  });
});
