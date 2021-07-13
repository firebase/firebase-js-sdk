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
import '../test/setup';
import { expect } from 'chai';
import { stub, spy } from 'sinon';
import {
  activate,
  setTokenAutoRefreshEnabled,
  getToken,
  onTokenChanged
} from './api';
import {
  FAKE_SITE_KEY,
  getFakeApp,
  getFakeCustomTokenProvider,
  getFakePlatformLoggingProvider,
  getFakeGreCAPTCHA,
  removegreCAPTCHAScriptsOnPage
} from '../test/util';
import { clearState, getState } from './state';
import * as reCAPTCHA from './recaptcha';
import { FirebaseApp } from '@firebase/app-types';
import * as internalApi from './internal-api';
import * as client from './client';
import * as storage from './storage';
import * as logger from './logger';
import * as util from './util';

describe('api', () => {
  beforeEach(() => {
    stub(util, 'getRecaptcha').returns(getFakeGreCAPTCHA());
  });
  describe('activate()', () => {
    let app: FirebaseApp;

    beforeEach(() => {
      app = getFakeApp();
    });

    it('sets activated to true', () => {
      expect(getState(app).activated).to.equal(false);
      activate(app, FAKE_SITE_KEY);
      expect(getState(app).activated).to.equal(true);
    });

    it('isTokenAutoRefreshEnabled value defaults to global setting', () => {
      app = getFakeApp({ automaticDataCollectionEnabled: false });
      activate(app, FAKE_SITE_KEY);
      expect(getState(app).isTokenAutoRefreshEnabled).to.equal(false);
    });

    it('sets isTokenAutoRefreshEnabled correctly, overriding global setting', () => {
      app = getFakeApp({ automaticDataCollectionEnabled: false });
      activate(app, FAKE_SITE_KEY, true);
      expect(getState(app).isTokenAutoRefreshEnabled).to.equal(true);
    });

    it('can only be called once', () => {
      activate(app, FAKE_SITE_KEY);
      expect(() => activate(app, FAKE_SITE_KEY)).to.throw(
        /AppCheck can only be activated once/
      );
    });

    it('initialize reCAPTCHA when a sitekey is provided', () => {
      const initReCAPTCHAStub = stub(reCAPTCHA, 'initialize').returns(
        Promise.resolve({} as any)
      );
      activate(app, FAKE_SITE_KEY);
      expect(initReCAPTCHAStub).to.have.been.calledWithExactly(
        app,
        FAKE_SITE_KEY
      );
    });

    it('does NOT initialize reCAPTCHA when a custom token provider is provided', () => {
      const fakeCustomTokenProvider = getFakeCustomTokenProvider();
      const initReCAPTCHAStub = stub(reCAPTCHA, 'initialize');
      activate(app, fakeCustomTokenProvider);
      expect(getState(app).customProvider).to.equal(fakeCustomTokenProvider);
      expect(initReCAPTCHAStub).to.have.not.been.called;
    });
  });
  describe('setTokenAutoRefreshEnabled()', () => {
    it('sets isTokenAutoRefreshEnabled correctly', () => {
      const app = getFakeApp({ automaticDataCollectionEnabled: false });
      setTokenAutoRefreshEnabled(app, true);
      expect(getState(app).isTokenAutoRefreshEnabled).to.equal(true);
    });
  });
  describe('getToken()', () => {
    it('getToken() calls the internal getToken() function', async () => {
      const app = getFakeApp({ automaticDataCollectionEnabled: true });
      const fakePlatformLoggingProvider = getFakePlatformLoggingProvider();
      const internalGetToken = stub(internalApi, 'getToken').resolves({
        token: 'a-token-string'
      });
      await getToken(app, fakePlatformLoggingProvider, true);
      expect(internalGetToken).to.be.calledWith(
        app,
        fakePlatformLoggingProvider,
        true
      );
    });
    it('getToken() throws errors returned with token', async () => {
      const app = getFakeApp({ automaticDataCollectionEnabled: true });
      const fakePlatformLoggingProvider = getFakePlatformLoggingProvider();
      // If getToken() errors, it returns a dummy token with an error field
      // instead of throwing.
      stub(internalApi, 'getToken').resolves({
        token: 'a-dummy-token',
        error: Error('there was an error')
      });
      await expect(
        getToken(app, fakePlatformLoggingProvider, true)
      ).to.be.rejectedWith('there was an error');
    });
  });
  describe('onTokenChanged()', () => {
    const fakePlatformLoggingProvider = getFakePlatformLoggingProvider();
    const fakeRecaptchaToken = 'fake-recaptcha-token';
    const fakeRecaptchaAppCheckToken = {
      token: 'fake-recaptcha-app-check-token',
      expireTimeMillis: Date.now() + 60000,
      issuedAtTimeMillis: 0
    };

    beforeEach(() => {
      stub(storage, 'readTokenFromStorage').resolves(undefined);
      stub(storage, 'writeTokenToStorage');
    });
    afterEach(() => {
      clearState();
      removegreCAPTCHAScriptsOnPage();
    });
    it('Listeners work when using top-level parameters pattern', async () => {
      const app = getFakeApp();
      activate(app, FAKE_SITE_KEY, false);
      stub(reCAPTCHA, 'getToken').returns(Promise.resolve(fakeRecaptchaToken));
      stub(client, 'exchangeToken').returns(
        Promise.resolve(fakeRecaptchaAppCheckToken)
      );

      const listener1 = (): void => {
        throw new Error();
      };
      const listener2 = spy();

      const errorFn1 = spy();
      const errorFn2 = spy();

      const unsubscribe1 = onTokenChanged(
        app,
        fakePlatformLoggingProvider,
        listener1,
        errorFn1
      );
      const unsubscribe2 = onTokenChanged(
        app,
        fakePlatformLoggingProvider,
        listener2,
        errorFn2
      );

      expect(getState(app).tokenObservers.length).to.equal(2);

      await internalApi.getToken(app, fakePlatformLoggingProvider);

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
      const app = getFakeApp();
      activate(app, FAKE_SITE_KEY, false);
      stub(reCAPTCHA, 'getToken').returns(Promise.resolve(fakeRecaptchaToken));
      stub(client, 'exchangeToken').returns(
        Promise.resolve(fakeRecaptchaAppCheckToken)
      );

      const listener1 = (): void => {
        throw new Error();
      };
      const listener2 = spy();

      const errorFn1 = spy();
      const errorFn2 = spy();

      /**
       * Reverse the order of adding the failed and successful handler, for extra
       * testing.
       */
      const unsubscribe2 = onTokenChanged(app, fakePlatformLoggingProvider, {
        next: listener2,
        error: errorFn2
      });
      const unsubscribe1 = onTokenChanged(app, fakePlatformLoggingProvider, {
        next: listener1,
        error: errorFn1
      });

      expect(getState(app).tokenObservers.length).to.equal(2);

      await internalApi.getToken(app, fakePlatformLoggingProvider);

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
      const app = getFakeApp();
      activate(app, FAKE_SITE_KEY, false);
      stub(reCAPTCHA, 'getToken').returns(Promise.resolve(fakeRecaptchaToken));
      stub(client, 'exchangeToken').rejects('exchange error');

      const listener1 = spy();

      const errorFn1 = spy();

      const unsubscribe1 = onTokenChanged(
        app,
        fakePlatformLoggingProvider,
        listener1,
        errorFn1
      );

      await internalApi.getToken(app, fakePlatformLoggingProvider);

      expect(getState(app).tokenObservers.length).to.equal(1);

      expect(errorFn1).to.be.calledOnce;
      expect(errorFn1.args[0][0].name).to.include('exchange error');

      unsubscribe1();
      expect(getState(app).tokenObservers.length).to.equal(0);
    });
  });
});
