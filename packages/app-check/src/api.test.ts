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
import { SinonStub, spy, stub } from 'sinon';
import {
  setTokenAutoRefreshEnabled,
  initializeAppCheck,
  getToken,
  onTokenChanged,
  getLimitedUseToken
} from './api';
import {
  FAKE_SITE_KEY,
  getFullApp,
  getFakeApp,
  getFakeGreCAPTCHA,
  getFakeAppCheck,
  removegreCAPTCHAScriptsOnPage
} from '../test/util';
import {
  clearState,
  DEFAULT_STATE,
  getStateReference,
  setInitialState
} from './state';
import * as reCAPTCHA from './recaptcha';
import * as util from './util';
import * as logger from './logger';
import * as client from './client';
import * as storage from './storage';
import * as internalApi from './internal-api';
import * as indexeddb from './indexeddb';
import * as debug from './debug';
import { deleteApp, FirebaseApp } from '@firebase/app';
import {
  CustomProvider,
  ReCaptchaEnterpriseProvider,
  ReCaptchaV3Provider
} from './providers';
import { AppCheckService } from './factory';
import { AppCheckToken } from './public-types';
import { getDebugToken } from './debug';

describe('api', () => {
  let app: FirebaseApp;
  let storageReadStub: SinonStub;
  let storageWriteStub: SinonStub;

  function setRecaptchaSuccess(isSuccess: boolean = true): void {
    getStateReference(app).reCAPTCHAState!.succeeded = isSuccess;
  }

  beforeEach(() => {
    app = getFullApp();
    storageReadStub = stub(storage, 'readTokenFromStorage').resolves(undefined);
    storageWriteStub = stub(storage, 'writeTokenToStorage');
    stub(util, 'getRecaptcha').returns(getFakeGreCAPTCHA());
  });

  afterEach(async () => {
    clearState();
    removegreCAPTCHAScriptsOnPage();
    storageReadStub.restore();
    storageWriteStub.restore();
    return deleteApp(app);
  });

  describe('initializeAppCheck()', () => {
    it('can only be called once (if given different provider classes)', () => {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(() =>
        initializeAppCheck(app, {
          provider: new CustomProvider({
            getToken: () => Promise.resolve({ token: 'mm' } as AppCheckToken)
          })
        })
      ).to.throw(/appCheck\/already-initialized/);
    });
    it('can only be called once (if given different ReCaptchaV3Providers)', () => {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(() =>
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(FAKE_SITE_KEY + 'X')
        })
      ).to.throw(/appCheck\/already-initialized/);
    });
    it('can only be called once (if given different ReCaptchaEnterpriseProviders)', () => {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY)
      });
      expect(() =>
        initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY + 'X')
        })
      ).to.throw(/appCheck\/already-initialized/);
    });
    it('can only be called once (if given different CustomProviders)', () => {
      initializeAppCheck(app, {
        provider: new CustomProvider({
          getToken: () => Promise.resolve({ token: 'ff' } as AppCheckToken)
        })
      });
      expect(() =>
        initializeAppCheck(app, {
          provider: new CustomProvider({
            getToken: () => Promise.resolve({ token: 'gg' } as AppCheckToken)
          })
        })
      ).to.throw(/appCheck\/already-initialized/);
    });
    it('can be called multiple times (if given equivalent ReCaptchaV3Providers)', () => {
      const appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
        })
      ).to.equal(appCheckInstance);
    });
    it('can be called multiple times (if given equivalent ReCaptchaEnterpriseProviders)', () => {
      const appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY)
      });
      expect(
        initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY)
        })
      ).to.equal(appCheckInstance);
    });
    it('can be called multiple times (if given equivalent CustomProviders)', () => {
      const appCheckInstance = initializeAppCheck(app, {
        provider: new CustomProvider({
          getToken: () => Promise.resolve({ token: 'ff' } as AppCheckToken)
        })
      });
      expect(
        initializeAppCheck(app, {
          provider: new CustomProvider({
            getToken: () => Promise.resolve({ token: 'ff' } as AppCheckToken)
          })
        })
      ).to.equal(appCheckInstance);
    });
    it('starts debug mode on first call', async () => {
      let token: string = '';
      const fakeWrite = (tokenToWrite: string): Promise<void> => {
        token = tokenToWrite;
        return Promise.resolve();
      };
      stub(indexeddb, 'writeDebugTokenToIndexedDB').callsFake(fakeWrite);
      stub(indexeddb, 'readDebugTokenFromIndexedDB').resolves(token);
      const consoleStub = stub(console, 'log');
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      // Ensure getDebugToken() call inside `initializeAppCheck()`
      // has time to resolve, and double check its value matches that
      // written to indexedDB.
      expect(await getDebugToken()).to.equal(token);
      expect(consoleStub.args[0][0]).to.include(token);
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = undefined;
    });
    it('does not call initializeDebugMode on second call', async () => {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = 'abcdefg';
      const consoleStub = stub(console, 'log');
      const initializeDebugModeSpy = spy(debug, 'initializeDebugMode');
      // First call, should call initializeDebugMode()
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(initializeDebugModeSpy).to.be.called;
      initializeDebugModeSpy.resetHistory();
      // Second call, should not call initializeDebugMode()
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      const token = await getDebugToken();
      expect(token).to.equal('abcdefg');
      // Two console logs of the token, for each initializeAppCheck call.
      expect(consoleStub.args[0][0]).to.include(token);
      expect(consoleStub.args[1][0]).to.include(token);
      expect(consoleStub.args[1][0]).to.equal(consoleStub.args[0][0]);
      expect(initializeDebugModeSpy).to.not.be.called;
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = undefined;
    });

    it('initialize reCAPTCHA when a ReCaptchaV3Provider is provided', () => {
      const initReCAPTCHAStub = stub(reCAPTCHA, 'initializeV3').returns(
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

    it('initialize reCAPTCHA when a ReCaptchaEnterpriseProvider is provided', () => {
      const initReCAPTCHAStub = stub(reCAPTCHA, 'initializeEnterprise').returns(
        Promise.resolve({} as any)
      );
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY)
      });
      expect(initReCAPTCHAStub).to.have.been.calledWithExactly(
        app,
        FAKE_SITE_KEY
      );
    });

    it('sets activated to true', () => {
      expect(getStateReference(app).activated).to.equal(false);
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(getStateReference(app).activated).to.equal(true);
    });

    it('global false + local unset = false', () => {
      app.automaticDataCollectionEnabled = false;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).to.equal(false);
    });

    it('global false + local true = false', () => {
      app.automaticDataCollectionEnabled = false;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).to.equal(false);
    });

    it('global false + local false = false', () => {
      app.automaticDataCollectionEnabled = false;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: false
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).to.equal(false);
    });

    it('global unset + local unset = false', () => {
      // Global unset should default to true.
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).to.equal(false);
    });

    it('global unset + local false = false', () => {
      // Global unset should default to true.
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: false
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).to.equal(false);
    });

    it('global unset + local true = true', () => {
      // Global unset should default to true.
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).to.equal(true);
    });

    it('global true + local unset = false', () => {
      app.automaticDataCollectionEnabled = true;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).to.equal(false);
    });

    it('global true + local false = false', () => {
      app.automaticDataCollectionEnabled = true;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: false
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).to.equal(false);
    });

    it('global true + local true = true', () => {
      app.automaticDataCollectionEnabled = true;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).to.equal(true);
    });

    it('sets isTokenAutoRefreshEnabled correctly, overriding global setting', () => {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).to.equal(true);
    });
  });
  describe('setTokenAutoRefreshEnabled()', () => {
    it('sets isTokenAutoRefreshEnabled correctly', () => {
      const app = getFakeApp({ automaticDataCollectionEnabled: false });
      const appCheck = getFakeAppCheck(app);
      setInitialState(app, { ...DEFAULT_STATE });
      setTokenAutoRefreshEnabled(appCheck, true);
      expect(getStateReference(app).isTokenAutoRefreshEnabled).to.equal(true);
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
  describe('getLimitedUseToken()', () => {
    it('getLimitedUseToken() calls the internal getLimitedUseToken() function', async () => {
      const app = getFakeApp({ automaticDataCollectionEnabled: true });
      const appCheck = getFakeAppCheck(app);
      const internalgetLimitedUseToken = stub(
        internalApi,
        'getLimitedUseToken'
      ).resolves({
        token: 'a-token-string'
      });
      expect(await getLimitedUseToken(appCheck)).to.eql({
        token: 'a-token-string'
      });
      expect(internalgetLimitedUseToken).to.be.calledWith(appCheck);
    });
  });
  describe('onTokenChanged()', () => {
    it('Listeners work when using top-level parameters pattern', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });

      setRecaptchaSuccess(true);

      expect(getStateReference(app).tokenObservers.length).to.equal(1);

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

      const listener1 = stub().throws(new Error());
      const listener2 = spy();

      const errorFn1 = spy();
      const errorFn2 = spy();

      const unsubscribe1 = onTokenChanged(appCheck, listener1, errorFn1);
      const unsubscribe2 = onTokenChanged(appCheck, listener2, errorFn2);

      expect(getStateReference(app).tokenObservers.length).to.equal(3);

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
      expect(getStateReference(app).tokenObservers.length).to.equal(1);
    });

    it('Listeners work when using Observer pattern', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });

      setRecaptchaSuccess(true);

      expect(getStateReference(app).tokenObservers.length).to.equal(1);

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
      storageWriteStub.returns(Promise.resolve(undefined));

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

      expect(getStateReference(app).tokenObservers.length).to.equal(3);

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
      expect(getStateReference(app).tokenObservers.length).to.equal(1);
    });

    it('onError() catches token errors', async () => {
      stub(logger.logger, 'error');
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: false
      });

      setRecaptchaSuccess(true);

      expect(getStateReference(app).tokenObservers.length).to.equal(0);

      const fakeRecaptchaToken = 'fake-recaptcha-token';
      stub(reCAPTCHA, 'getToken').returns(Promise.resolve(fakeRecaptchaToken));
      stub(client, 'exchangeToken').rejects('exchange error');
      storageWriteStub.returns(Promise.resolve(undefined));

      const listener1 = spy();

      const errorFn1 = spy();

      const unsubscribe1 = onTokenChanged(appCheck, listener1, errorFn1);

      await internalApi.getToken(appCheck as AppCheckService);

      expect(getStateReference(app).tokenObservers.length).to.equal(1);

      expect(errorFn1).to.be.calledOnce;
      expect(errorFn1.args[0][0].name).to.include('exchange error');

      unsubscribe1();
      expect(getStateReference(app).tokenObservers.length).to.equal(0);
    });
  });
});
