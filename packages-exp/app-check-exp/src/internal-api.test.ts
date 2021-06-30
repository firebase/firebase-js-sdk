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
import { deleteApp, FirebaseApp } from '@firebase/app-exp';
import {
  FAKE_SITE_KEY,
  getFullApp,
  getFakeCustomTokenProvider,
  removegreCAPTCHAScriptsOnPage,
  getFakeGreCAPTCHA
} from '../test/util';
import { initializeAppCheck } from './api';
import {
  getToken,
  addTokenListener,
  removeTokenListener,
  formatDummyToken,
  defaultTokenErrorData
} from './internal-api';
import * as reCAPTCHA from './recaptcha';
import * as client from './client';
import * as storage from './storage';
import * as util from './util';
import { getState, clearState, setState, getDebugState } from './state';
import { AppCheckTokenListener } from './public-types';
import { Deferred } from '@firebase/util';
import { ReCaptchaV3Provider } from './providers';
import { AppCheckService } from './factory';
import { ListenerType } from './types';

const fakeRecaptchaToken = 'fake-recaptcha-token';
const fakeRecaptchaAppCheckToken = {
  token: 'fake-recaptcha-app-check-token',
  expireTimeMillis: Date.now() + 60000,
  issuedAtTimeMillis: 0
};

const fakeCachedAppCheckToken = {
  token: 'fake-cached-app-check-token',
  expireTimeMillis: Date.now() + 60000,
  issuedAtTimeMillis: 0
};

describe('internal api', () => {
  let app: FirebaseApp;
  let storageReadStub: SinonStub;
  let storageWriteStub: SinonStub;

  beforeEach(() => {
    app = getFullApp();
    storageReadStub = stub(storage, 'readTokenFromStorage').resolves(undefined);
    storageWriteStub = stub(storage, 'writeTokenToStorage');
    stub(util, 'getRecaptcha').returns(getFakeGreCAPTCHA());
  });

  afterEach(() => {
    clearState();
    removegreCAPTCHAScriptsOnPage();
    return deleteApp(app);
  });
  // TODO: test error conditions
  describe('getToken()', () => {
    it('uses customTokenProvider to get an AppCheck token', async () => {
      const customTokenProvider = getFakeCustomTokenProvider();
      const customProviderSpy = spy(customTokenProvider, 'getToken');

      const appCheck = initializeAppCheck(app, {
        provider: customTokenProvider
      });
      const token = await getToken(appCheck as AppCheckService);

      expect(customProviderSpy).to.be.called;
      expect(token).to.deep.equal({
        token: 'fake-custom-app-check-token'
      });
    });

    it('uses reCAPTCHA token to exchange for AppCheck token', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stub(reCAPTCHA, 'getToken').returns(
        Promise.resolve(fakeRecaptchaToken)
      );
      const exchangeTokenStub: SinonStub = stub(
        client,
        'exchangeToken'
      ).returns(Promise.resolve(fakeRecaptchaAppCheckToken));

      const token = await getToken(appCheck as AppCheckService);

      expect(reCAPTCHASpy).to.be.called;

      expect(exchangeTokenStub.args[0][0].body['recaptcha_token']).to.equal(
        fakeRecaptchaToken
      );
      expect(token).to.deep.equal({ token: fakeRecaptchaAppCheckToken.token });
      // TODO: Permanently fix.
      // Small delay to prevent common test flakiness where this test runs
      // into afterEach() sometimes
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    it('resolves with a dummy token and an error if failed to get a token', async () => {
      const errorStub = stub(console, 'error');
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stub(reCAPTCHA, 'getToken').returns(
        Promise.resolve(fakeRecaptchaToken)
      );

      const error = new Error('oops, something went wrong');
      stub(client, 'exchangeToken').returns(Promise.reject(error));

      const token = await getToken(appCheck as AppCheckService);

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
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });

      const clock = useFakeTimers();
      storageReadStub.returns(Promise.resolve(fakeCachedAppCheckToken));

      const listener1 = spy();
      const listener2 = spy();
      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.INTERNAL,
        listener1
      );
      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.INTERNAL,
        listener2
      );

      await getToken(appCheck as AppCheckService);

      clock.tick(1);

      expect(listener1).to.be.calledWith({
        token: fakeCachedAppCheckToken.token
      });
      expect(listener2).to.be.calledWith({
        token: fakeCachedAppCheckToken.token
      });

      clock.restore();
    });

    it('notifies listeners using new token', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });

      stub(reCAPTCHA, 'getToken').returns(Promise.resolve(fakeRecaptchaToken));
      stub(client, 'exchangeToken').returns(
        Promise.resolve(fakeRecaptchaAppCheckToken)
      );

      const listener1 = spy();
      const listener2 = spy();
      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.INTERNAL,
        listener1
      );
      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.INTERNAL,
        listener2
      );

      await getToken(appCheck as AppCheckService);

      expect(listener1).to.be.calledWith({
        token: fakeRecaptchaAppCheckToken.token
      });
      expect(listener2).to.be.calledWith({
        token: fakeRecaptchaAppCheckToken.token
      });
    });

    it('calls 3P error handler if there is an error getting a token', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      stub(reCAPTCHA, 'getToken').returns(Promise.resolve(fakeRecaptchaToken));
      stub(client, 'exchangeToken').rejects('exchange error');
      const listener1 = spy();
      const errorFn1 = spy();

      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.EXTERNAL,
        listener1,
        errorFn1
      );

      await getToken(appCheck as AppCheckService);

      expect(errorFn1).to.be.calledOnce;
      expect(errorFn1.args[0][0].name).to.include('exchange error');
    });

    it('ignores listeners that throw', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      stub(reCAPTCHA, 'getToken').returns(Promise.resolve(fakeRecaptchaToken));
      stub(client, 'exchangeToken').returns(
        Promise.resolve(fakeRecaptchaAppCheckToken)
      );
      const listener1 = (): void => {
        throw new Error();
      };
      const listener2 = spy();

      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.INTERNAL,
        listener1
      );
      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.INTERNAL,
        listener2
      );

      await getToken(appCheck as AppCheckService);

      expect(listener2).to.be.calledWith({
        token: fakeRecaptchaAppCheckToken.token
      });
    });

    it('loads persisted token to memory and returns it', async () => {
      const clock = useFakeTimers();
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      storageReadStub.returns(Promise.resolve(fakeCachedAppCheckToken));

      const clientStub = stub(client, 'exchangeToken');

      expect(getState(app).token).to.equal(undefined);
      expect(await getToken(appCheck as AppCheckService)).to.deep.equal({
        token: fakeCachedAppCheckToken.token
      });
      expect(getState(app).token).to.equal(fakeCachedAppCheckToken);
      expect(clientStub).has.not.been.called;

      clock.restore();
    });

    it('persists token to storage', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      stub(reCAPTCHA, 'getToken').returns(Promise.resolve(fakeRecaptchaToken));
      stub(client, 'exchangeToken').returns(
        Promise.resolve(fakeRecaptchaAppCheckToken)
      );
      storageWriteStub.resetHistory();
      const result = await getToken(appCheck as AppCheckService);
      expect(result).to.deep.equal({ token: fakeRecaptchaAppCheckToken.token });
      expect(storageWriteStub).has.been.calledWith(
        app,
        fakeRecaptchaAppCheckToken
      );
    });

    it('returns the valid token in memory without making network request', async () => {
      const clock = useFakeTimers();
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      setState(app, { ...getState(app), token: fakeRecaptchaAppCheckToken });

      const clientStub = stub(client, 'exchangeToken');
      expect(await getToken(appCheck as AppCheckService)).to.deep.equal({
        token: fakeRecaptchaAppCheckToken.token
      });
      expect(clientStub).to.not.have.been.called;

      clock.restore();
    });

    it('force to get new token when forceRefresh is true', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      setState(app, { ...getState(app), token: fakeRecaptchaAppCheckToken });

      stub(reCAPTCHA, 'getToken').returns(Promise.resolve(fakeRecaptchaToken));
      stub(client, 'exchangeToken').returns(
        Promise.resolve({
          token: 'new-recaptcha-app-check-token',
          expireTimeMillis: Date.now() + 60000,
          issuedAtTimeMillis: 0
        })
      );

      expect(await getToken(appCheck as AppCheckService, true)).to.deep.equal({
        token: 'new-recaptcha-app-check-token'
      });
    });

    it('exchanges debug token if in debug mode', async () => {
      const exchangeTokenStub: SinonStub = stub(
        client,
        'exchangeToken'
      ).returns(Promise.resolve(fakeRecaptchaAppCheckToken));
      const debugState = getDebugState();
      debugState.enabled = true;
      debugState.token = new Deferred();
      debugState.token.resolve('my-debug-token');
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const token = await getToken(appCheck as AppCheckService);
      expect(exchangeTokenStub.args[0][0].body['debug_token']).to.equal(
        'my-debug-token'
      );
      expect(token).to.deep.equal({ token: fakeRecaptchaAppCheckToken.token });
    });
  });

  describe('addTokenListener', () => {
    it('adds token listeners', () => {
      const listener = (): void => {};

      addTokenListener(
        { app } as AppCheckService,
        ListenerType.INTERNAL,
        listener
      );

      expect(getState(app).tokenObservers[0].next).to.equal(listener);
    });

    it('starts proactively refreshing token after adding the first listener', () => {
      const listener = (): void => {};
      setState(app, { ...getState(app), isTokenAutoRefreshEnabled: true });
      expect(getState(app).tokenObservers.length).to.equal(0);
      expect(getState(app).tokenRefresher).to.equal(undefined);

      addTokenListener(
        { app } as AppCheckService,
        ListenerType.INTERNAL,
        listener
      );

      expect(getState(app).tokenRefresher?.isRunning()).to.be.true;
    });

    it('notifies the listener with the valid token in memory immediately', done => {
      const clock = useFakeTimers();
      const fakeListener: AppCheckTokenListener = token => {
        expect(token).to.deep.equal({
          token: `fake-memory-app-check-token`
        });
        clock.restore();
        done();
      };

      setState(app, {
        ...getState(app),
        token: {
          token: `fake-memory-app-check-token`,
          expireTimeMillis: Date.now() + 60000,
          issuedAtTimeMillis: 0
        }
      });

      addTokenListener(
        { app } as AppCheckService,
        ListenerType.INTERNAL,
        fakeListener
      );
    });

    it('notifies the listener with the valid token in storage', done => {
      const clock = useFakeTimers();
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      storageReadStub.returns(
        Promise.resolve({
          token: `fake-cached-app-check-token`,
          expireTimeMillis: Date.now() + 60000,
          issuedAtTimeMillis: 0
        })
      );

      const fakeListener: AppCheckTokenListener = token => {
        expect(token).to.deep.equal({
          token: `fake-cached-app-check-token`
        });
        clock.restore();
        done();
      };

      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.INTERNAL,
        fakeListener
      );

      clock.tick(1);
    });

    it('notifies the listener with the debug token immediately', done => {
      const fakeListener: AppCheckTokenListener = token => {
        expect(token).to.deep.equal({
          token: `my-debug-token`
        });
        done();
      };

      const debugState = getDebugState();
      debugState.enabled = true;
      debugState.token = new Deferred();
      debugState.token.resolve('my-debug-token');

      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.INTERNAL,
        fakeListener
      );
    });

    it('does NOT start token refresher in debug mode', () => {
      const debugState = getDebugState();
      debugState.enabled = true;
      debugState.token = new Deferred();
      debugState.token.resolve('my-debug-token');

      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.INTERNAL,
        () => {}
      );

      const state = getState(app);
      expect(state.tokenRefresher).is.undefined;
    });
  });

  describe('removeTokenListener', () => {
    it('should remove token listeners', () => {
      const listener = (): void => {};
      addTokenListener(
        { app } as AppCheckService,
        ListenerType.INTERNAL,
        listener
      );
      expect(getState(app).tokenObservers.length).to.equal(1);

      removeTokenListener(app, listener);
      expect(getState(app).tokenObservers.length).to.equal(0);
    });

    it('should stop proactively refreshing token after deleting the last listener', () => {
      const listener = (): void => {};
      setState(app, { ...getState(app), isTokenAutoRefreshEnabled: true });

      addTokenListener(
        { app } as AppCheckService,
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
