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

use(chaiAsPromised);
use(sinonChai);

describe('platform_browser/recaptcha/recaptcha_loader', () => {
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
  });

  afterEach(() => {
    sinon.restore();
    delete _window().grecaptcha;
  });

  describe('MockLoader', () => {
    it('returns a MockRecaptcha instance', async () => {
      expect(await new MockReCaptchaLoaderImpl().load(auth)).to.be.instanceOf(
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

      sinon.stub(jsHelpers, '_loadJS').callsFake(() => {
        return new Promise((resolve, reject) => {
          jsLoader = { resolve, reject };
        });
      });

      loader = new ReCaptchaLoaderImpl();
    });

    context('network timeout / errors', () => {
      it('rejects if the network times out', async () => {
        const promise = loader.load(auth);
        triggerNetworkTimeout();
        await expect(promise).to.be.rejectedWith(
          FirebaseError,
          'Firebase: A network AuthError (such as timeout, interrupted connection or unreachable host) has occurred. (auth/network-request-failed).'
        );
      });

      it('rejects with an internal error if the loadJS call fails', async () => {
        const promise = loader.load(auth);
        jsLoader.reject();
        await expect(promise).to.be.rejectedWith(
          FirebaseError,
          'Firebase: An internal AuthError has occurred. (auth/internal-error).'
        );
      });
    });

    context('on js load callback', () => {
      function spoofJsLoad(): void {
        _window()[_JSLOAD_CALLBACK]();
      }

      it('clears the network timeout', () => {
        sinon.spy(_window(), 'clearTimeout');
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        loader.load(auth);
        spoofJsLoad();
        expect(_window().clearTimeout).to.have.been.calledWith(
          networkTimeoutId
        );
      });

      it('rejects if the grecaptcha object is not on the window', async () => {
        const promise = loader.load(auth);
        spoofJsLoad();
        await expect(promise).to.be.rejectedWith(
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
        expect((await promise).render).not.to.eq(oldRenderMethod);
      });

      it('returns immediately if the new language code matches the old', async () => {
        const promise = loader.load(auth);
        _window().grecaptcha = new MockReCaptcha(auth);
        spoofJsLoad();
        await promise;
        // Notice no call to spoofJsLoad..
        expect(await loader.load(auth)).to.eq(_window().grecaptcha);
      });

      it('returns immediately if grecaptcha is already set on window', async () => {
        _window().grecaptcha = new MockReCaptcha(auth);
        const loader = new ReCaptchaLoaderImpl();
        expect(await loader.load(auth)).to.eq(_window().grecaptcha);
      });

      it('fails if the host language is invalid', async () => {
        expect(() => loader.load(auth, 'javascript:injection')).to.throw(
          FirebaseError,
          'auth/argument-error'
        );
      });
    });
  });
});
