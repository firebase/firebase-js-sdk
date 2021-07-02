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
import { SinonStub, spy, stub, useFakeTimers } from 'sinon';
import { FirebaseApp } from '@firebase/app-types';
import {
  FAKE_SITE_KEY,
  getFakeApp,
  getFakeCustomTokenProvider,
  getFakeGreCAPTCHA,
  getFakePlatformLoggingProvider,
  removegreCAPTCHAScriptsOnPage
} from '../test/util';
import { activate } from './api';
import {
  getToken,
  addTokenListener,
  removeTokenListener,
  formatDummyToken,
  defaultTokenErrorData
} from './internal-api';
import * as reCAPTCHA from './recaptcha';
import * as logger from './logger';
import * as client from './client';
import * as storage from './storage';
import * as util from './util';
import {
  getState,
  clearState,
  setState,
  getDebugState,
  ListenerType
} from './state';
import { Deferred } from '@firebase/util';
import { AppCheckTokenResult } from '../../app-check-interop-types';

const fakePlatformLoggingProvider = getFakePlatformLoggingProvider();

describe('internal api', () => {
  let app: FirebaseApp;
  let storageReadStub: SinonStub;
  let storageWriteStub: SinonStub;

  beforeEach(() => {
    app = getFakeApp();
    storageReadStub = stub(storage, 'readTokenFromStorage').resolves(undefined);
    storageWriteStub = stub(storage, 'writeTokenToStorage');
    stub(util, 'getRecaptcha').returns(getFakeGreCAPTCHA());
  });

  afterEach(async () => {
    clearState();
    removegreCAPTCHAScriptsOnPage();
  });
  // TODO: test error conditions
  describe('getToken()', () => {
    const fakeRecaptchaToken = 'fake-recaptcha-token';
    const fakeRecaptchaAppCheckToken = {
      token: 'fake-recaptcha-app-check-token',
      // This makes isValid(token) true.
      expireTimeMillis: Date.now() + 60000,
      issuedAtTimeMillis: 0
    };

    const fakeCachedAppCheckToken = {
      token: 'fake-cached-app-check-token',
      // This makes isValid(token) true.
      expireTimeMillis: Date.now() + 60000,
      issuedAtTimeMillis: 0
    };

    it('uses customTokenProvider to get an AppCheck token', async () => {
      const customTokenProvider = getFakeCustomTokenProvider();
      const customProviderSpy = spy(customTokenProvider, 'getToken');

      activate(app, customTokenProvider);
      const token = await getToken(app, fakePlatformLoggingProvider);

      expect(customProviderSpy).to.be.called;
      expect(token).to.deep.equal({
        token: 'fake-custom-app-check-token'
      });
    });

    it('uses reCAPTCHA token to exchange for AppCheck token if no customTokenProvider is provided', async () => {
      activate(app, FAKE_SITE_KEY);

      const reCAPTCHASpy = stub(reCAPTCHA, 'getToken').resolves(
        fakeRecaptchaToken
      );
      const exchangeTokenStub: SinonStub = stub(
        client,
        'exchangeToken'
      ).resolves(fakeRecaptchaAppCheckToken);

      const token = await getToken(app, fakePlatformLoggingProvider);

      expect(reCAPTCHASpy).to.be.called;

      expect(exchangeTokenStub.args[0][0].body['recaptcha_token']).to.equal(
        fakeRecaptchaToken
      );
      expect(token).to.deep.equal({ token: fakeRecaptchaAppCheckToken.token });
    });

    it('resolves with a dummy token and an error if failed to get a token', async () => {
      const errorStub = stub(console, 'error');
      activate(app, FAKE_SITE_KEY, true);

      const reCAPTCHASpy = stub(reCAPTCHA, 'getToken').resolves(
        fakeRecaptchaToken
      );

      const error = new Error('oops, something went wrong');
      stub(client, 'exchangeToken').rejects(error);

      const token = await getToken(app, fakePlatformLoggingProvider);

      expect(reCAPTCHASpy).to.be.called;
      expect(token).to.deep.equal({
        token: formatDummyToken(defaultTokenErrorData),
        error
      });
      expect(errorStub.args[0][1].message).to.include(
        'oops, something went wrong'
      );
      errorStub.restore();
    });

    it('notifies listeners using cached token', async () => {
      activate(app, FAKE_SITE_KEY, false);
      storageReadStub.resolves(fakeCachedAppCheckToken);

      const listener1 = spy();
      const listener2 = spy();
      addTokenListener(
        app,
        fakePlatformLoggingProvider,
        ListenerType.INTERNAL,
        listener1
      );
      addTokenListener(
        app,
        fakePlatformLoggingProvider,
        ListenerType.INTERNAL,
        listener2
      );

      await getToken(app, fakePlatformLoggingProvider);

      expect(listener1).to.be.calledWith({
        token: fakeCachedAppCheckToken.token
      });
      expect(listener2).to.be.calledWith({
        token: fakeCachedAppCheckToken.token
      });
    });

    it('notifies listeners using new token', async () => {
      activate(app, FAKE_SITE_KEY, false);

      stub(reCAPTCHA, 'getToken').resolves(fakeRecaptchaToken);
      stub(client, 'exchangeToken').resolves(fakeRecaptchaAppCheckToken);

      const listener1 = spy();
      const listener2 = spy();
      addTokenListener(
        app,
        fakePlatformLoggingProvider,
        ListenerType.INTERNAL,
        listener1
      );
      addTokenListener(
        app,
        fakePlatformLoggingProvider,
        ListenerType.INTERNAL,
        listener2
      );

      await getToken(app, fakePlatformLoggingProvider);

      expect(listener1).to.be.calledWith({
        token: fakeRecaptchaAppCheckToken.token
      });
      expect(listener2).to.be.calledWith({
        token: fakeRecaptchaAppCheckToken.token
      });
    });

    it('calls 3P error handler if there is an error getting a token', async () => {
      stub(logger.logger, 'error');
      activate(app, FAKE_SITE_KEY, false);
      stub(reCAPTCHA, 'getToken').resolves(fakeRecaptchaToken);
      stub(client, 'exchangeToken').rejects('exchange error');
      const listener1 = spy();

      const errorFn1 = spy();

      addTokenListener(
        app,
        fakePlatformLoggingProvider,
        ListenerType.EXTERNAL,
        listener1,
        errorFn1
      );

      await getToken(app, fakePlatformLoggingProvider);

      expect(errorFn1).to.be.calledOnce;
      expect(errorFn1.args[0][0].name).to.include('exchange error');
    });

    it('ignores listeners that throw', async () => {
      activate(app, FAKE_SITE_KEY, false);
      stub(reCAPTCHA, 'getToken').resolves(fakeRecaptchaToken);
      stub(client, 'exchangeToken').resolves(fakeRecaptchaAppCheckToken);
      const listener1 = stub().throws(new Error());
      const listener2 = spy();

      const errorFn1 = spy();

      addTokenListener(
        app,
        fakePlatformLoggingProvider,
        ListenerType.INTERNAL,
        listener1,
        errorFn1
      );
      addTokenListener(
        app,
        fakePlatformLoggingProvider,
        ListenerType.INTERNAL,
        listener2
      );

      await getToken(app, fakePlatformLoggingProvider);

      expect(errorFn1).not.to.be.called;
      expect(listener1).to.be.called;
      expect(listener2).to.be.called;
    });

    it('loads persisted token to memory and returns it', async () => {
      activate(app, FAKE_SITE_KEY);

      storageReadStub.resolves(fakeCachedAppCheckToken);

      const clientStub = stub(client, 'exchangeToken');

      expect(getState(app).token).to.equal(undefined);
      const result = await getToken(app, fakePlatformLoggingProvider);
      expect(result).to.deep.equal({
        token: fakeCachedAppCheckToken.token
      });
      expect(getState(app).token).to.equal(fakeCachedAppCheckToken);
      expect(clientStub).has.not.been.called;
    });

    it('persists token to storage', async () => {
      activate(app, FAKE_SITE_KEY, false);

      stub(reCAPTCHA, 'getToken').resolves(fakeRecaptchaToken);
      stub(client, 'exchangeToken').resolves(fakeRecaptchaAppCheckToken);
      const result = await getToken(app, fakePlatformLoggingProvider);
      expect(result).to.deep.equal({ token: fakeRecaptchaAppCheckToken.token });
      expect(storageWriteStub).has.been.calledWith(
        app,
        fakeRecaptchaAppCheckToken
      );
    });

    it('returns the valid token in memory without making network request', async () => {
      activate(app, FAKE_SITE_KEY);
      setState(app, { ...getState(app), token: fakeRecaptchaAppCheckToken });

      const clientStub = stub(client, 'exchangeToken');
      const result = await getToken(app, fakePlatformLoggingProvider);
      expect(result).to.deep.equal({
        token: fakeRecaptchaAppCheckToken.token
      });
      expect(clientStub).to.not.have.been.called;
    });

    it('force to get new token when forceRefresh is true', async () => {
      activate(app, FAKE_SITE_KEY);
      setState(app, { ...getState(app), token: fakeRecaptchaAppCheckToken });

      stub(reCAPTCHA, 'getToken').resolves(fakeRecaptchaToken);
      stub(client, 'exchangeToken').resolves(fakeRecaptchaAppCheckToken);

      expect(
        await getToken(app, fakePlatformLoggingProvider, true)
      ).to.deep.equal({
        token: fakeRecaptchaAppCheckToken.token
      });
    });

    it('exchanges debug token if in debug mode and there is no cached token', async () => {
      const exchangeTokenStub: SinonStub = stub(
        client,
        'exchangeToken'
      ).resolves(fakeRecaptchaAppCheckToken);
      const debugState = getDebugState();
      debugState.enabled = true;
      debugState.token = new Deferred();
      debugState.token.resolve('my-debug-token');
      activate(app, FAKE_SITE_KEY);

      const token = await getToken(app, fakePlatformLoggingProvider);
      expect(exchangeTokenStub.args[0][0].body['debug_token']).to.equal(
        'my-debug-token'
      );
      expect(token).to.deep.equal({ token: fakeRecaptchaAppCheckToken.token });
    });
  });

  describe('addTokenListener', () => {
    const fakeRecaptchaAppCheckToken = {
      token: 'fake-recaptcha-app-check-token',
      // This makes isValid(token) true.
      expireTimeMillis: Date.now() + 60000,
      issuedAtTimeMillis: 0
    };
    it('adds token listeners', () => {
      const listener = (): void => {};
      stub(client, 'exchangeToken').resolves(fakeRecaptchaAppCheckToken);

      addTokenListener(
        app,
        fakePlatformLoggingProvider,
        ListenerType.INTERNAL,
        listener
      );

      expect(getState(app).tokenObservers[0].next).to.equal(listener);
    });

    it('starts proactively refreshing token after adding the first listener', () => {
      const listener = (): void => {};
      stub(client, 'exchangeToken').resolves(fakeRecaptchaAppCheckToken);
      setState(app, { ...getState(app), isTokenAutoRefreshEnabled: true });
      expect(getState(app).tokenObservers.length).to.equal(0);
      expect(getState(app).tokenRefresher).to.equal(undefined);

      addTokenListener(
        app,
        fakePlatformLoggingProvider,
        ListenerType.INTERNAL,
        listener
      );

      expect(getState(app).tokenRefresher?.isRunning()).to.be.true;

      removeTokenListener(app, listener);
    });

    it('notifies the listener with the valid token in memory immediately', async () => {
      const clock = useFakeTimers();
      const listener = stub();

      setState(app, {
        ...getState(app),
        token: {
          token: `fake-memory-app-check-token`,
          expireTimeMillis: Date.now() + 60000,
          issuedAtTimeMillis: 0
        }
      });

      addTokenListener(
        app,
        fakePlatformLoggingProvider,
        ListenerType.INTERNAL,
        listener
      );
      await clock.runAllAsync();
      expect(listener).to.be.calledWith({
        token: 'fake-memory-app-check-token'
      });
      clock.restore();
    });

    it('notifies the listener with the valid token in storage', done => {
      activate(app, FAKE_SITE_KEY);
      storageReadStub.resolves({
        token: `fake-cached-app-check-token`,
        expireTimeMillis: Date.now() + 60000,
        issuedAtTimeMillis: 0
      });

      // Need to use done() if the callback will be called by the
      // refresher.
      const fakeListener = (token: AppCheckTokenResult): void => {
        expect(token).to.deep.equal({
          token: `fake-cached-app-check-token`
        });
        done();
      };

      addTokenListener(
        app,
        fakePlatformLoggingProvider,
        ListenerType.INTERNAL,
        fakeListener
      );
    });
  });

  describe('removeTokenListener', () => {
    const fakeRecaptchaAppCheckToken = {
      token: 'fake-recaptcha-app-check-token',
      // This makes isValid(token) true.
      expireTimeMillis: Date.now() + 60000,
      issuedAtTimeMillis: 0
    };
    it('should remove token listeners', () => {
      stub(client, 'exchangeToken').resolves(fakeRecaptchaAppCheckToken);
      const listener = (): void => {};
      addTokenListener(
        app,
        fakePlatformLoggingProvider,
        ListenerType.INTERNAL,
        listener
      );
      expect(getState(app).tokenObservers.length).to.equal(1);

      removeTokenListener(app, listener);
      expect(getState(app).tokenObservers.length).to.equal(0);
    });

    it('should stop proactively refreshing token after deleting the last listener', () => {
      stub(client, 'exchangeToken').resolves(fakeRecaptchaAppCheckToken);
      const listener = (): void => {};
      setState(app, { ...getState(app), isTokenAutoRefreshEnabled: true });

      addTokenListener(
        app,
        fakePlatformLoggingProvider,
        ListenerType.INTERNAL,
        listener
      );
      expect(getState(app).tokenObservers.length).to.equal(1);
      expect(getState(app).tokenRefresher?.isRunning()).to.be.true;

      removeTokenListener(app, listener);
      expect(getState(app).tokenObservers.length).to.equal(0);
      expect(getState(app).tokenRefresher?.isRunning()).to.be.false;
    });
  });
});
