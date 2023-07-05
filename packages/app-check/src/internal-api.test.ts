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
import { deleteApp, FirebaseApp } from '@firebase/app';
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
  defaultTokenErrorData,
  getLimitedUseToken
} from './internal-api';
import * as reCAPTCHA from './recaptcha';
import * as client from './client';
import * as storage from './storage';
import * as util from './util';
import { logger } from './logger';
import {
  getStateReference,
  clearState,
  setInitialState,
  getDebugState
} from './state';
import { AppCheckTokenListener } from './public-types';
import { Deferred } from '@firebase/util';
import { ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from './providers';
import { AppCheckService } from './factory';
import { ListenerType } from './types';
import { AppCheckError, ERROR_FACTORY } from './errors';

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

  function stubGetRecaptchaToken(
    token: string = fakeRecaptchaToken,
    isSuccess: boolean = true
  ): SinonStub {
    getStateReference(app).reCAPTCHAState!.succeeded = isSuccess;

    return stub(reCAPTCHA, 'getToken').returns(Promise.resolve(token));
  }

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

    it('uses reCAPTCHA (V3) token to exchange for AppCheck token', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stubGetRecaptchaToken();
      const exchangeTokenStub: SinonStub = stub(
        client,
        'exchangeToken'
      ).returns(Promise.resolve(fakeRecaptchaAppCheckToken));

      const token = await getToken(appCheck as AppCheckService);

      expect(reCAPTCHASpy).to.be.called;

      expect(exchangeTokenStub.args[0][0].body['recaptcha_v3_token']).to.equal(
        fakeRecaptchaToken
      );
      expect(token).to.deep.equal({ token: fakeRecaptchaAppCheckToken.token });
    });

    it('uses reCAPTCHA (Enterprise) token to exchange for AppCheck token', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stubGetRecaptchaToken();

      const exchangeTokenStub: SinonStub = stub(
        client,
        'exchangeToken'
      ).returns(Promise.resolve(fakeRecaptchaAppCheckToken));

      const token = await getToken(appCheck as AppCheckService);

      expect(reCAPTCHASpy).to.be.called;

      expect(
        exchangeTokenStub.args[0][0].body['recaptcha_enterprise_token']
      ).to.equal(fakeRecaptchaToken);
      expect(token).to.deep.equal({ token: fakeRecaptchaAppCheckToken.token });
    });

    it('resolves with a dummy token and an error if failed to get a token', async () => {
      const errorStub = stub(console, 'error');
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stubGetRecaptchaToken();

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

    it('resolves with a dummy token and an error if recaptcha failed', async () => {
      const errorStub = stub(console, 'error');
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stubGetRecaptchaToken('', false);
      const exchangeTokenStub = stub(client, 'exchangeToken');

      const token = await getToken(appCheck as AppCheckService);

      expect(reCAPTCHASpy).to.be.called;
      expect(exchangeTokenStub).to.not.be.called;
      expect(token.token).to.equal(formatDummyToken(defaultTokenErrorData));
      expect(errorStub.args[0][1].message).to.include(
        AppCheckError.RECAPTCHA_ERROR
      );
      errorStub.restore();
    });

    it('notifies listeners using cached token', async () => {
      storageReadStub.resolves(fakeCachedAppCheckToken);
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: false
      });

      const clock = useFakeTimers();

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

      stubGetRecaptchaToken();
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
      stub(console, 'error');
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      stubGetRecaptchaToken();
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
      stub(console, 'error');
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      stubGetRecaptchaToken();
      stub(client, 'exchangeToken').returns(
        Promise.resolve(fakeRecaptchaAppCheckToken)
      );
      const listener1 = stub().throws(new Error());
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

    it('loads persisted token to memory and returns it', async () => {
      const clock = useFakeTimers();

      storageReadStub.resolves(fakeCachedAppCheckToken);
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const clientStub = stub(client, 'exchangeToken');

      expect(getStateReference(app).token).to.equal(undefined);
      expect(await getToken(appCheck as AppCheckService)).to.deep.equal({
        token: fakeCachedAppCheckToken.token
      });
      expect(getStateReference(app).token).to.equal(fakeCachedAppCheckToken);
      expect(clientStub).has.not.been.called;

      clock.restore();
    });

    it('persists token to storage', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      stubGetRecaptchaToken();
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
      setInitialState(app, {
        ...getStateReference(app),
        token: fakeRecaptchaAppCheckToken
      });

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
      setInitialState(app, {
        ...getStateReference(app),
        token: fakeRecaptchaAppCheckToken
      });

      stubGetRecaptchaToken();
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

    it('no dangling exchangeToken promise internal', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      setInitialState(app, {
        ...getStateReference(app),
        token: fakeRecaptchaAppCheckToken,
        cachedTokenPromise: undefined
      });

      stubGetRecaptchaToken();
      stub(client, 'exchangeToken').returns(
        Promise.resolve({
          token: 'new-recaptcha-app-check-token',
          expireTimeMillis: Date.now() + 60000,
          issuedAtTimeMillis: 0
        })
      );

      const getTokenPromise = getToken(appCheck as AppCheckService, true);

      expect(getStateReference(app).exchangeTokenPromise).to.be.instanceOf(
        Promise
      );

      await getTokenPromise;

      expect(getStateReference(app).exchangeTokenPromise).to.be.equal(
        undefined
      );
    });

    it('no dangling exchangeToken promise', async () => {
      const clock = useFakeTimers();

      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const soonExpiredToken = {
        token: `recaptcha-app-check-token-old`,
        expireTimeMillis: Date.now() + 1000,
        issuedAtTimeMillis: 0
      };

      setInitialState(app, {
        ...getStateReference(app),
        token: soonExpiredToken,
        cachedTokenPromise: undefined
      });

      stubGetRecaptchaToken();
      let count = 0;
      stub(client, 'exchangeToken').callsFake(
        () =>
          new Promise(res =>
            setTimeout(
              () =>
                res({
                  token: `recaptcha-app-check-token-new-${count++}`,
                  expireTimeMillis: Date.now() + 60000,
                  issuedAtTimeMillis: 0
                }),
              3000
            )
          )
      );

      // start fetch token
      void getToken(appCheck as AppCheckService, true);

      clock.tick(2000);

      // save expired `token-old` with copied state and wait fetch token
      void getToken(appCheck as AppCheckService);

      // wait fetch token with copied state
      void getToken(appCheck as AppCheckService);

      // stored copied state with `token-new-0`
      await clock.runAllAsync();

      // fetch token with copied state
      const newToken = getToken(appCheck as AppCheckService, true);

      await clock.runAllAsync();

      expect(await newToken).to.deep.equal({
        token: 'recaptcha-app-check-token-new-1'
      });
    });

    it('ignores in-memory token if it is invalid and continues to exchange request', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      setInitialState(app, {
        ...getStateReference(app),
        token: {
          token: 'something',
          expireTimeMillis: Date.now() - 1000,
          issuedAtTimeMillis: 0
        }
      });

      stubGetRecaptchaToken();
      stub(client, 'exchangeToken').returns(
        Promise.resolve({
          token: 'new-recaptcha-app-check-token',
          expireTimeMillis: Date.now() + 60000,
          issuedAtTimeMillis: 0
        })
      );

      expect(await getToken(appCheck as AppCheckService)).to.deep.equal({
        token: 'new-recaptcha-app-check-token'
      });
    });

    it('returns the valid token in storage without making a network request', async () => {
      const clock = useFakeTimers();

      storageReadStub.resolves(fakeCachedAppCheckToken);
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const clientStub = stub(client, 'exchangeToken');
      expect(await getToken(appCheck as AppCheckService)).to.deep.equal({
        token: fakeCachedAppCheckToken.token
      });
      expect(clientStub).to.not.have.been.called;

      clock.restore();
    });

    it('deletes cached token if it is invalid and continues to exchange request', async () => {
      storageReadStub.resolves({
        token: 'something',
        expireTimeMillis: Date.now() - 1000,
        issuedAtTimeMillis: 0
      });
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const freshToken = {
        token: 'new-recaptcha-app-check-token',
        expireTimeMillis: Date.now() + 60000,
        issuedAtTimeMillis: 0
      };

      stubGetRecaptchaToken();
      stub(client, 'exchangeToken').returns(Promise.resolve(freshToken));

      expect(await getToken(appCheck as AppCheckService)).to.deep.equal({
        token: 'new-recaptcha-app-check-token'
      });

      // When it wiped the invalid token.
      expect(storageWriteStub).has.been.calledWith(app, undefined);

      // When it wrote the new token fetched from the exchange endpoint.
      expect(storageWriteStub).has.been.calledWith(app, freshToken);
    });

    it('returns the actual token and an internalError if a token is valid but the request fails', async () => {
      stub(logger, 'error');
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      setInitialState(app, {
        ...getStateReference(app),
        token: fakeRecaptchaAppCheckToken
      });

      stubGetRecaptchaToken();
      stub(client, 'exchangeToken').returns(Promise.reject(new Error('blah')));

      const tokenResult = await getToken(appCheck as AppCheckService, true);
      expect(tokenResult.internalError?.message).to.equal('blah');
      expect(tokenResult.token).to.equal('fake-recaptcha-app-check-token');
    });

    it('exchanges debug token if in debug mode and there is no cached token', async () => {
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

    it('throttles for a period less than 1d on 503', async () => {
      // More detailed check of exponential backoff in providers.test.ts
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      stubGetRecaptchaToken();
      const warnStub = stub(logger, 'warn');
      stub(client, 'exchangeToken').returns(
        Promise.reject(
          ERROR_FACTORY.create(AppCheckError.FETCH_STATUS_ERROR, {
            httpStatus: 503
          })
        )
      );

      const token = await getToken(appCheck as AppCheckService);

      // ReCaptchaV3Provider's _throttleData is private so checking
      // the resulting error message to be sure it has roughly the
      // correct throttle time. This also tests the time formatter.
      // Check both the error itself and that it makes it through to
      // console.warn
      expect(token.error?.message).to.include('503');
      expect(token.error?.message).to.include('00m');
      expect(token.error?.message).to.not.include('1d');
      expect(warnStub.args[0][0]).to.include('503');
    });

    it('throttles 1d on 403', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      stubGetRecaptchaToken();
      const warnStub = stub(logger, 'warn');
      stub(client, 'exchangeToken').returns(
        Promise.reject(
          ERROR_FACTORY.create(AppCheckError.FETCH_STATUS_ERROR, {
            httpStatus: 403
          })
        )
      );

      const token = await getToken(appCheck as AppCheckService);

      // ReCaptchaV3Provider's _throttleData is private so checking
      // the resulting error message to be sure it has roughly the
      // correct throttle time. This also tests the time formatter.
      // Check both the error itself and that it makes it through to
      // console.warn
      expect(token.error?.message).to.include('403');
      expect(token.error?.message).to.include('1d');
      expect(warnStub.args[0][0]).to.include('403');
    });
  });

  describe('getLimitedUseToken()', () => {
    it('uses customTokenProvider to get an AppCheck token', async () => {
      const customTokenProvider = getFakeCustomTokenProvider();
      const customProviderSpy = spy(customTokenProvider, 'getToken');

      const appCheck = initializeAppCheck(app, {
        provider: customTokenProvider
      });
      const token = await getLimitedUseToken(appCheck as AppCheckService);

      expect(customProviderSpy).to.be.called;
      expect(token).to.deep.equal({
        token: 'fake-custom-app-check-token'
      });
    });

    it('does not interact with state', async () => {
      const customTokenProvider = getFakeCustomTokenProvider();
      spy(customTokenProvider, 'getToken');

      const appCheck = initializeAppCheck(app, {
        provider: customTokenProvider
      });
      await getLimitedUseToken(appCheck as AppCheckService);

      expect(getStateReference(app).token).to.be.undefined;
      expect(getStateReference(app).isTokenAutoRefreshEnabled).to.be.false;
    });

    it('uses reCAPTCHA (V3) token to exchange for AppCheck token', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stubGetRecaptchaToken();
      const exchangeTokenStub: SinonStub = stub(
        client,
        'exchangeToken'
      ).returns(Promise.resolve(fakeRecaptchaAppCheckToken));

      const token = await getLimitedUseToken(appCheck as AppCheckService);

      expect(reCAPTCHASpy).to.be.called;

      expect(exchangeTokenStub.args[0][0].body['recaptcha_v3_token']).to.equal(
        fakeRecaptchaToken
      );
      expect(token).to.deep.equal({ token: fakeRecaptchaAppCheckToken.token });
    });

    it('uses reCAPTCHA (Enterprise) token to exchange for AppCheck token', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stubGetRecaptchaToken();
      const exchangeTokenStub: SinonStub = stub(
        client,
        'exchangeToken'
      ).returns(Promise.resolve(fakeRecaptchaAppCheckToken));

      const token = await getLimitedUseToken(appCheck as AppCheckService);

      expect(reCAPTCHASpy).to.be.called;

      expect(
        exchangeTokenStub.args[0][0].body['recaptcha_enterprise_token']
      ).to.equal(fakeRecaptchaToken);
      expect(token).to.deep.equal({ token: fakeRecaptchaAppCheckToken.token });
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

      const token = await getLimitedUseToken(appCheck as AppCheckService);
      expect(exchangeTokenStub.args[0][0].body['debug_token']).to.equal(
        'my-debug-token'
      );
      expect(token).to.deep.equal({ token: fakeRecaptchaAppCheckToken.token });
    });
  });

  describe('addTokenListener', () => {
    afterEach(async () => {
      clearState();
    });

    it('adds token listeners', async () => {
      const clock = useFakeTimers();
      const listener = (): void => {};
      setInitialState(app, {
        ...getStateReference(app),
        cachedTokenPromise: Promise.resolve(undefined)
      });

      addTokenListener(
        { app } as AppCheckService,
        ListenerType.INTERNAL,
        listener
      );

      expect(getStateReference(app).tokenObservers[0].next).to.equal(listener);
      // resolve initTokenRefresher dangling promise
      await clock.tickAsync(1000);
    });

    it('starts proactively refreshing token after adding the first listener', async () => {
      const listener = (): void => {};
      setInitialState(app, {
        ...getStateReference(app),
        isTokenAutoRefreshEnabled: true,
        cachedTokenPromise: Promise.resolve(undefined)
      });
      expect(getStateReference(app).tokenObservers.length).to.equal(0);
      expect(getStateReference(app).tokenRefresher).to.equal(undefined);

      addTokenListener(
        { app } as AppCheckService,
        ListenerType.INTERNAL,
        listener
      );

      expect(getStateReference(app).tokenRefresher?.isRunning()).to.be
        .undefined;

      // addTokenListener() waits for the result of cachedTokenPromise
      // before starting the refresher
      await getStateReference(app).cachedTokenPromise;

      expect(getStateReference(app).tokenRefresher?.isRunning()).to.be.true;
    });

    it('notifies the listener with the valid token in memory immediately', async () => {
      const clock = useFakeTimers();

      const listener = stub();

      setInitialState(app, {
        ...getStateReference(app),
        cachedTokenPromise: Promise.resolve(undefined),
        token: {
          token: `fake-memory-app-check-token`,
          expireTimeMillis: Date.now() + 60000,
          issuedAtTimeMillis: 0
        }
      });

      addTokenListener(
        { app } as AppCheckService,
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
      storageReadStub.resolves({
        token: `fake-cached-app-check-token`,
        expireTimeMillis: Date.now() + 60000,
        issuedAtTimeMillis: 0
      });
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });

      const fakeListener: AppCheckTokenListener = token => {
        expect(token).to.deep.equal({
          token: `fake-cached-app-check-token`
        });
        done();
      };

      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.INTERNAL,
        fakeListener
      );
    });

    it('does not make rapid requests within proactive refresh window', async () => {
      const clock = useFakeTimers();
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      setInitialState(app, {
        ...getStateReference(app),
        token: {
          token: `fake-cached-app-check-token`,
          // within refresh window
          expireTimeMillis: 10000,
          issuedAtTimeMillis: 0
        }
      });

      const fakeListener: AppCheckTokenListener = stub();

      const fakeExchange = stub(client, 'exchangeToken').returns(
        Promise.resolve({
          token: 'new-recaptcha-app-check-token',
          expireTimeMillis: 10 * 60 * 1000,
          issuedAtTimeMillis: 0
        })
      );

      stubGetRecaptchaToken();

      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.INTERNAL,
        fakeListener
      );
      // Tick 10s, make sure nothing is called repeatedly in that time.
      await clock.tickAsync(10000);
      expect(fakeListener).to.be.calledWith({
        token: 'fake-cached-app-check-token'
      });
      expect(fakeListener).to.be.calledWith({
        token: 'new-recaptcha-app-check-token'
      });
      expect(fakeExchange).to.be.calledOnce;
      clock.restore();
    });

    it('proactive refresh window test - exchange request fails - wait 10s', async () => {
      stub(logger, 'error');
      const clock = useFakeTimers();
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      setInitialState(app, {
        ...getStateReference(app),
        token: {
          token: `fake-cached-app-check-token`,
          // not expired but within refresh window
          expireTimeMillis: 10000,
          issuedAtTimeMillis: 0
        }
      });

      stubGetRecaptchaToken();

      const fakeListener: AppCheckTokenListener = stub();

      const fakeExchange = stub(client, 'exchangeToken').returns(
        Promise.reject(new Error('fetch failed or something'))
      );

      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.EXTERNAL,
        fakeListener
      );
      // Tick 10s, make sure nothing is called repeatedly in that time.
      await clock.tickAsync(10000);
      expect(fakeListener).to.be.calledWith({
        token: 'fake-cached-app-check-token'
      });
      // once on init and once invoked directly in this test
      expect(fakeListener).to.be.calledTwice;
      expect(fakeExchange).to.be.calledOnce;
      clock.restore();
    });

    it('proactive refresh window test - exchange request fails - wait 40s', async () => {
      stub(logger, 'error');
      const clock = useFakeTimers();
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      setInitialState(app, {
        ...getStateReference(app),
        token: {
          token: `fake-cached-app-check-token`,
          // not expired but within refresh window
          expireTimeMillis: 10000,
          issuedAtTimeMillis: 0
        }
      });

      stubGetRecaptchaToken();

      const fakeListener: AppCheckTokenListener = stub();

      const fakeExchange = stub(client, 'exchangeToken').returns(
        Promise.reject(new Error('fetch failed or something'))
      );

      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.EXTERNAL,
        fakeListener
      );
      // Tick 40s, expect one initial exchange request and one retry.
      // (First backoff is 30s).
      await clock.tickAsync(40000);
      expect(fakeListener).to.be.calledTwice;
      expect(fakeExchange).to.be.calledTwice;
      clock.restore();
    });

    it('expired token - exchange request fails - wait 10s', async () => {
      stub(logger, 'error');
      const clock = useFakeTimers();
      clock.tick(1);
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });

      stubGetRecaptchaToken();
      setInitialState(app, {
        ...getStateReference(app),
        token: {
          token: `fake-cached-app-check-token`,
          // expired
          expireTimeMillis: 0,
          issuedAtTimeMillis: 0
        }
      });

      const fakeListener = stub();
      const errorHandler = stub();
      const fakeNetworkError = new Error('fetch failed or something');

      const fakeExchange = stub(client, 'exchangeToken').returns(
        Promise.reject(fakeNetworkError)
      );

      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.EXTERNAL,
        fakeListener,
        errorHandler
      );
      // Tick 10s, make sure nothing is called repeatedly in that time.
      await clock.tickAsync(10000);
      expect(fakeListener).not.to.be.called;
      expect(fakeExchange).to.be.calledOnce;
      expect(errorHandler).to.be.calledWith(fakeNetworkError);
      clock.restore();
    });

    it('expired token - exchange request fails - wait 40s', async () => {
      stub(logger, 'error');
      const clock = useFakeTimers();
      clock.tick(1);
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });

      stubGetRecaptchaToken();
      setInitialState(app, {
        ...getStateReference(app),
        token: {
          token: `fake-cached-app-check-token`,
          // expired
          expireTimeMillis: 0,
          issuedAtTimeMillis: 0
        }
      });

      const fakeListener = stub();
      const errorHandler = stub();
      const fakeNetworkError = new Error('fetch failed or something');

      const fakeExchange = stub(client, 'exchangeToken').returns(
        Promise.reject(fakeNetworkError)
      );

      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.EXTERNAL,
        fakeListener,
        errorHandler
      );
      // Tick 40s, expect one initial exchange request and one retry.
      // (First backoff is 30s).
      await clock.tickAsync(40000);
      expect(fakeListener).not.to.be.called;
      expect(fakeExchange).to.be.calledTwice;
      expect(errorHandler).to.be.calledTwice;
      clock.restore();
    });
  });

  describe('removeTokenListener', () => {
    it('should remove token listeners', () => {
      const listener = (): void => {};
      setInitialState(app, {
        ...getStateReference(app),
        cachedTokenPromise: Promise.resolve(undefined)
      });
      addTokenListener(
        { app } as AppCheckService,
        ListenerType.INTERNAL,
        listener
      );
      expect(getStateReference(app).tokenObservers.length).to.equal(1);

      removeTokenListener(app, listener);
      expect(getStateReference(app).tokenObservers.length).to.equal(0);
    });

    it('should stop proactively refreshing token after deleting the last listener', async () => {
      const listener = (): void => {};
      setInitialState(app, {
        ...getStateReference(app),
        isTokenAutoRefreshEnabled: true
      });
      setInitialState(app, {
        ...getStateReference(app),
        cachedTokenPromise: Promise.resolve(undefined)
      });

      addTokenListener(
        { app } as AppCheckService,
        ListenerType.INTERNAL,
        listener
      );

      // addTokenListener() waits for the result of cachedTokenPromise
      // before starting the refresher
      await getStateReference(app).cachedTokenPromise;

      expect(getStateReference(app).tokenObservers.length).to.equal(1);
      expect(getStateReference(app).tokenRefresher?.isRunning()).to.be.true;

      removeTokenListener(app, listener);
      expect(getStateReference(app).tokenObservers.length).to.equal(0);
      expect(getStateReference(app).tokenRefresher?.isRunning()).to.be.false;
    });
  });
});
