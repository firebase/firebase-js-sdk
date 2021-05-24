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
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or ied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import '../test/setup';
import { expect } from 'chai';
import { stub } from 'sinon';
import { setTokenAutoRefreshEnabled, initializeAppCheck } from './api';
import {
  FAKE_SITE_KEY,
  getFullApp,
  getFakeApp,
  getFakeCustomTokenProvider
} from '../test/util';
import { getState } from './state';
import * as reCAPTCHA from './recaptcha';
import { deleteApp, FirebaseApp } from '@firebase/app-exp';
import { ReCaptchaV3Provider } from './providers';

describe('api', () => {
  let app: FirebaseApp;

  beforeEach(() => {
    app = getFullApp();
  });

  afterEach(() => {
    return deleteApp(app);
  });

  describe('initializeAppCheck()', () => {
    it('can only be called once', () => {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(() =>
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
        })
      ).to.throw(/appCheck\/already-initialized/);
    });

    it('initialize reCAPTCHA when a sitekey is provided', () => {
      const initReCAPTCHAStub = stub(reCAPTCHA, 'initialize').returns(
        Promise.resolve({} as any)
      );
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(initReCAPTCHAStub).to.have.been.calledWithExactly(
        app,
        FAKE_SITE_KEY
      );
    });

    it('does NOT initialize reCAPTCHA when a custom token provider is provided', () => {
      const fakeCustomTokenProvider = getFakeCustomTokenProvider();
      const initReCAPTCHAStub = stub(reCAPTCHA, 'initialize');
      initializeAppCheck(app, {
        provider: fakeCustomTokenProvider
      });
      expect(getState(app).provider).to.equal(fakeCustomTokenProvider);
      expect(initReCAPTCHAStub).to.have.not.been.called;
    });

    it('sets activated to true', () => {
      expect(getState(app).activated).to.equal(false);
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(getState(app).activated).to.equal(true);
    });

    it('isTokenAutoRefreshEnabled value defaults to global setting', () => {
      app.automaticDataCollectionEnabled = false;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(getState(app).isTokenAutoRefreshEnabled).to.equal(false);
    });

    it('sets isTokenAutoRefreshEnabled correctly, overriding global setting', () => {
      app.automaticDataCollectionEnabled = false;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      expect(getState(app).isTokenAutoRefreshEnabled).to.equal(true);
    });
  });
  describe('setTokenAutoRefreshEnabled()', () => {
    it('sets isTokenAutoRefreshEnabled correctly', () => {
      const app = getFakeApp({ automaticDataCollectionEnabled: false });
      setTokenAutoRefreshEnabled(app, true);
      expect(getState(app).isTokenAutoRefreshEnabled).to.equal(true);
    });
  });
});
