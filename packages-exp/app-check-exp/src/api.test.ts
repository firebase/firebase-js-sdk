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
import { spy, stub } from 'sinon';
import {
  setTokenAutoRefreshEnabled,
  initializeAppCheck,
  getToken,
  onTokenChanged
} from './api';
import {
  FAKE_SITE_KEY,
  getFullApp,
  getFakeApp,
  getFakeGreCAPTCHA,
  getFakeAppCheck,
  removegreCAPTCHAScriptsOnPage
} from '../test/util';
import { clearState, getState } from './state';
import * as reCAPTCHA from './recaptcha';
import * as util from './util';
import * as logger from './logger';
import * as client from './client';
import * as storage from './storage';
import * as internalApi from './internal-api';
import { deleteApp, FirebaseApp } from '@firebase/app-exp';
import { ReCaptchaV3Provider } from './providers';
import { AppCheckService } from './factory';

describe('api', () => {
  let app: FirebaseApp;

  beforeEach(() => {
    app = getFullApp();
    stub(util, 'getRecaptcha').returns(getFakeGreCAPTCHA());
  });

  afterEach(() => {
    clearState();
    removegreCAPTCHAScriptsOnPage();
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

    it('initialize reCAPTCHA when a ReCaptchaV3Provider is provided', () => {
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
      const appCheck = getFakeAppCheck(app);
      setTokenAutoRefreshEnabled(appCheck, true);
      expect(getState(app).isTokenAutoRefreshEnabled).to.equal(true);
    });
  });
  describe('getToken()', () => {
    it('getToken() calls the internal getToken() function', async () => {
      const app = getFakeApp({ automaticDataCollectionEnabled: true });
      const appCheck = getFakeAppCheck(app);
      const internalGetToken = stub(internalApi, 'getToken').resolves({
        token: 'a-token-string'
      });
      await getToken(appCheck, true);
      expect(internalGetToken).to.be.calledWith(appCheck, true);
    });
    it('getToken() throws errors returned with token', async () => {
      const app = getFakeApp({ automaticDataCollectionEnabled: true });
      const appCheck = getFakeAppCheck(app);
      // If getToken() errors, it returns a dummy token with an error field
      // instead of throwing.
      stub(internalApi, 'getToken').resolves({
        token: 'a-dummy-token',
        error: Error('there was an error')
      });
      await expect(getToken(appCheck, true)).to.be.rejectedWith(
        'there was an error'
      );
    });
  });
  describe('onTokenChanged()', () => {
    it('Listeners work when using top-level parameters pattern', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      const fakeRecaptchaToken = 'fake-recaptcha-token';
      const fakeRecaptchaAppCheckToken = {
        token: 'fake-recaptcha-app-check-token',
        expireTimeMillis: 123,
        issuedAtTimeMillis: 0
      };
      stub(reCAPTCHA, 'getToken').returns(Promise.resolve(fakeRecaptchaToken));
      stub(client, 'exchangeToken').returns(
        Promise.resolve(fakeRecaptchaAppCheckToken)
      );
      stub(storage, 'writeTokenToStorage').returns(Promise.resolve(undefined));

      const listener1 = stub().throws(new Error());
      const listener2 = spy();

      const errorFn1 = spy();
      const errorFn2 = spy();

      const unsubscribe1 = onTokenChanged(appCheck, listener1, errorFn1);
      const unsubscribe2 = onTokenChanged(appCheck, listener2, errorFn2);

      expect(getState(app).tokenObservers.length).to.equal(2);

      await internalApi.getToken(appCheck as AppCheckService);

      expect(listener1).to.be.called;
      expect(listener2).to.be.calledWith({
        token: fakeRecaptchaAppCheckToken.token
      });
      // onError should not be called on listener errors.
      expect(errorFn1).to.not.be.called;
      expect(errorFn2).to.not.be.called;
      unsubscribe1();
      unsubscribe2();
      expect(getState(app).tokenObservers.length).to.equal(0);
    });

    it('Listeners work when using Observer pattern', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      const fakeRecaptchaToken = 'fake-recaptcha-token';
      const fakeRecaptchaAppCheckToken = {
        token: 'fake-recaptcha-app-check-token',
        expireTimeMillis: 123,
        issuedAtTimeMillis: 0
      };
      stub(reCAPTCHA, 'getToken').returns(Promise.resolve(fakeRecaptchaToken));
      stub(client, 'exchangeToken').returns(
        Promise.resolve(fakeRecaptchaAppCheckToken)
      );
      stub(storage, 'writeTokenToStorage').returns(Promise.resolve(undefined));

      const listener1 = stub().throws(new Error());
      const listener2 = spy();

      const errorFn1 = spy();
      const errorFn2 = spy();

      /**
       * Reverse the order of adding the failed and successful handler, for extra
       * testing.
       */
      const unsubscribe2 = onTokenChanged(appCheck, {
        next: listener2,
        error: errorFn2
      });
      const unsubscribe1 = onTokenChanged(appCheck, {
        next: listener1,
        error: errorFn1
      });

      expect(getState(app).tokenObservers.length).to.equal(2);

      await internalApi.getToken(appCheck as AppCheckService);

      expect(listener1).to.be.called;
      expect(listener2).to.be.calledWith({
        token: fakeRecaptchaAppCheckToken.token
      });
      // onError should not be called on listener errors.
      expect(errorFn1).to.not.be.called;
      expect(errorFn2).to.not.be.called;
      unsubscribe1();
      unsubscribe2();
      expect(getState(app).tokenObservers.length).to.equal(0);
    });

    it('onError() catches token errors', async () => {
      stub(logger.logger, 'error');
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: false
      });
      const fakeRecaptchaToken = 'fake-recaptcha-token';
      stub(reCAPTCHA, 'getToken').returns(Promise.resolve(fakeRecaptchaToken));
      stub(client, 'exchangeToken').rejects('exchange error');
      stub(storage, 'writeTokenToStorage').returns(Promise.resolve(undefined));

      const listener1 = spy();

      const errorFn1 = spy();

      const unsubscribe1 = onTokenChanged(appCheck, listener1, errorFn1);

      await internalApi.getToken(appCheck as AppCheckService);

      expect(getState(app).tokenObservers.length).to.equal(1);

      expect(errorFn1).to.be.calledOnce;
      expect(errorFn1.args[0][0].name).to.include('exchange error');

      unsubscribe1();
      expect(getState(app).tokenObservers.length).to.equal(0);
    });
  });
});
