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
import { expect, vi, MockInstance } from 'vitest';
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

const {
  mockReadTokenFromStorage,
  mockWriteTokenToStorage,
  mockExchangeToken,
  mockGetReCAPTCHAToken,
  mockGetRecaptcha
} = vi.hoisted(() => ({
  mockReadTokenFromStorage: vi.fn(),
  mockWriteTokenToStorage: vi.fn(),
  mockExchangeToken: vi.fn(),
  mockGetReCAPTCHAToken: vi.fn(),
  mockGetRecaptcha: vi.fn()
}));

vi.mock('./storage', async importOriginal => {
  const actual = await importOriginal<typeof import('./storage')>();
  return {
    ...actual,
    readTokenFromStorage: (...args: unknown[]) =>
      mockReadTokenFromStorage.getMockImplementation()
        ? mockReadTokenFromStorage(...args)
        : actual.readTokenFromStorage(...(args as [any])),
    writeTokenToStorage: (...args: unknown[]) =>
      mockWriteTokenToStorage.getMockImplementation()
        ? mockWriteTokenToStorage(...args)
        : actual.writeTokenToStorage(...(args as [any, any]))
  };
});

vi.mock('./client', async importOriginal => {
  const actual = await importOriginal<typeof import('./client')>();
  return {
    ...actual,
    exchangeToken: (...args: unknown[]) =>
      mockExchangeToken.getMockImplementation()
        ? mockExchangeToken(...args)
        : actual.exchangeToken(...(args as [any, any]))
  };
});

vi.mock('./recaptcha', async importOriginal => {
  const actual = await importOriginal<typeof import('./recaptcha')>();
  return {
    ...actual,
    getToken: (...args: unknown[]) =>
      mockGetReCAPTCHAToken.getMockImplementation()
        ? mockGetReCAPTCHAToken(...args)
        : actual.getToken(...(args as [any]))
  };
});

vi.mock('./util', async importOriginal => {
  const actual = await importOriginal<typeof import('./util')>();
  return {
    ...actual,
    getRecaptcha: (isEnterprise?: boolean) =>
      mockGetRecaptcha.getMockImplementation()
        ? mockGetRecaptcha(isEnterprise)
        : actual.getRecaptcha(isEnterprise)
  };
});

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
  let storageReadStub: MockInstance;
  let storageWriteStub: MockInstance;

  function stubGetRecaptchaToken(
    token: string = fakeRecaptchaToken,
    isSuccess: boolean = true
  ): MockInstance {
    getStateReference(app).reCAPTCHAState!.succeeded = isSuccess;

    return mockGetReCAPTCHAToken.mockResolvedValue(token);
  }

  beforeEach(() => {
    app = getFullApp();
    mockReadTokenFromStorage.mockReset();
    mockWriteTokenToStorage.mockReset();
    mockExchangeToken.mockReset();
    mockGetReCAPTCHAToken.mockReset();
    mockGetRecaptcha.mockReset();

    storageReadStub = mockReadTokenFromStorage.mockResolvedValue(undefined);
    storageWriteStub = mockWriteTokenToStorage.mockResolvedValue(undefined);
    mockGetRecaptcha.mockReturnValue(getFakeGreCAPTCHA());
  });

  afterEach(() => {
    vi.useRealTimers();
    clearState();
    removegreCAPTCHAScriptsOnPage();
    return deleteApp(app);
  });
  // TODO: test error conditions
  describe('getToken()', () => {
    it('uses customTokenProvider to get an AppCheck token', async () => {
      const customTokenProvider = getFakeCustomTokenProvider();
      const customProviderSpy = vi.spyOn(customTokenProvider, 'getToken');

      const appCheck = initializeAppCheck(app, {
        provider: customTokenProvider
      });
      const token = await getToken(appCheck as AppCheckService);

      expect(customProviderSpy).toHaveBeenCalled();
      expect(token).to.deep.equal({
        token: 'fake-custom-app-check-token'
      });
    });

    it('uses reCAPTCHA (V3) token to exchange for AppCheck token', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stubGetRecaptchaToken();
      const exchangeTokenStub = mockExchangeToken.mockResolvedValue(
        fakeRecaptchaAppCheckToken
      );

      const token = await getToken(appCheck as AppCheckService);

      expect(reCAPTCHASpy).toHaveBeenCalled();

      expect(
        exchangeTokenStub.mock.calls[0][0].body['recaptcha_v3_token']
      ).to.equal(fakeRecaptchaToken);
      expect(token).toEqual({ token: fakeRecaptchaAppCheckToken.token });
    });

    it('uses reCAPTCHA (Enterprise) token to exchange for AppCheck token', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stubGetRecaptchaToken();

      const exchangeTokenStub = mockExchangeToken.mockResolvedValue(
        fakeRecaptchaAppCheckToken
      );

      const token = await getToken(appCheck as AppCheckService);

      expect(reCAPTCHASpy).toHaveBeenCalled();

      expect(
        exchangeTokenStub.mock.calls[0][0].body['recaptcha_enterprise_token']
      ).toBe(fakeRecaptchaToken);
      expect(token).toEqual({ token: fakeRecaptchaAppCheckToken.token });
    });

    it('resolves with a dummy token and an error if failed to get a token', async () => {
      const errorStub = vi.spyOn(console, 'error').mockImplementation(() => {});
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stubGetRecaptchaToken();

      const error = new Error('oops, something went wrong');
      mockExchangeToken.mockRejectedValue(error);

      const token = await getToken(appCheck as AppCheckService, false, true);

      expect(reCAPTCHASpy).toHaveBeenCalled();
      expect(token).to.deep.equal({
        token: formatDummyToken(defaultTokenErrorData),
        error
      });
      expect(errorStub.mock.calls[0][1].message).to.include(
        'oops, something went wrong'
      );
      errorStub.mockRestore();
    });

    it('resolves with a dummy token and an error if failed to get a token in debug mode', async () => {
      const errorStub = vi.spyOn(console, 'error').mockImplementation(() => {});
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const error = new Error('oops, something went wrong');
      mockExchangeToken.mockRejectedValue(error);

      const token = await getToken(appCheck as AppCheckService, false, true);

      expect(token).to.deep.equal({
        token: formatDummyToken(defaultTokenErrorData),
        error
      });
      expect(errorStub.mock.calls[0][1].message).to.include(
        'oops, something went wrong'
      );
      delete window.FIREBASE_APPCHECK_DEBUG_TOKEN;
      errorStub.mockRestore();
    });

    it('resolves with a dummy token and an error if recaptcha failed', async () => {
      const errorStub = vi.spyOn(console, 'error').mockImplementation(() => {});
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stubGetRecaptchaToken('', false);
      const exchangeTokenStub = mockExchangeToken;

      const token = await getToken(appCheck as AppCheckService, false, true);

      expect(reCAPTCHASpy).toHaveBeenCalled();
      expect(exchangeTokenStub).to.not.be.called;
      expect(token.token).toBe(formatDummyToken(defaultTokenErrorData));
      expect(errorStub.mock.calls[0][1].message).to.include(
        AppCheckError.RECAPTCHA_ERROR
      );
      errorStub.mockRestore();
    });

    it('notifies listeners using cached token', async () => {
      storageReadStub.mockResolvedValue(fakeCachedAppCheckToken);
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: false
      });

      vi.useFakeTimers({ now: 0 });

      const listener1 = vi.fn();
      const listener2 = vi.fn();
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

      await vi.advanceTimersByTimeAsync(1);

      expect(listener1).toHaveBeenCalledWith({
        token: fakeCachedAppCheckToken.token
      });
      expect(listener2).toHaveBeenCalledWith({
        token: fakeCachedAppCheckToken.token
      });

      vi.useRealTimers();
    });

    it('notifies listeners using new token', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });

      stubGetRecaptchaToken();
      mockExchangeToken.mockResolvedValue(fakeRecaptchaAppCheckToken);

      const listener1 = vi.fn();
      const listener2 = vi.fn();
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

      expect(listener1).toHaveBeenCalledWith({
        token: fakeRecaptchaAppCheckToken.token
      });
      expect(listener2).toHaveBeenCalledWith({
        token: fakeRecaptchaAppCheckToken.token
      });
    });

    it('calls 3P error handler if there is an error getting a token', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      stubGetRecaptchaToken();
      const err = new Error('exchange error');
      err.name = 'exchange error';
      mockExchangeToken.mockRejectedValue(err);
      const listener1 = vi.fn();
      const errorFn1 = vi.fn();

      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.EXTERNAL,
        listener1,
        errorFn1
      );

      await getToken(appCheck as AppCheckService);

      expect(errorFn1).toHaveBeenCalledTimes(1);
      expect(errorFn1.mock.calls[0][0].name).toContain('exchange error');
    });

    it('ignores listeners that throw', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      stubGetRecaptchaToken();
      mockExchangeToken.mockResolvedValue(fakeRecaptchaAppCheckToken);
      const listener1 = vi.fn().mockImplementation(() => {
        throw new Error();
      });
      const listener2 = vi.fn();

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

      expect(listener1).toHaveBeenCalledWith({
        token: fakeRecaptchaAppCheckToken.token
      });
      expect(listener2).toHaveBeenCalledWith({
        token: fakeRecaptchaAppCheckToken.token
      });
    });

    it('loads persisted token to memory and returns it', async () => {
      vi.useFakeTimers({ now: 0 });

      storageReadStub.mockResolvedValue(fakeCachedAppCheckToken);
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const clientStub = mockExchangeToken;

      expect(getStateReference(app).token).toBe(undefined);
      expect(await getToken(appCheck as AppCheckService)).to.deep.equal({
        token: fakeCachedAppCheckToken.token
      });
      expect(getStateReference(app).token).toBe(fakeCachedAppCheckToken);
      expect(clientStub).has.not.been.called;

      vi.useRealTimers();
    });

    it('persists token to storage', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      stubGetRecaptchaToken();
      mockExchangeToken.mockResolvedValue(fakeRecaptchaAppCheckToken);
      storageWriteStub.mockClear();
      const result = await getToken(appCheck as AppCheckService);
      expect(result).toEqual({ token: fakeRecaptchaAppCheckToken.token });
      expect(storageWriteStub).toHaveBeenCalledWith(
        app,
        fakeRecaptchaAppCheckToken
      );
    });

    it('returns the valid token in memory without making network request', async () => {
      vi.useFakeTimers({ now: 0 });
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      setInitialState(app, {
        ...getStateReference(app),
        token: fakeRecaptchaAppCheckToken
      });

      const clientStub = mockExchangeToken;
      expect(await getToken(appCheck as AppCheckService)).to.deep.equal({
        token: fakeRecaptchaAppCheckToken.token
      });
      expect(clientStub).to.not.have.been.called;

      vi.useRealTimers();
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
      mockExchangeToken.mockResolvedValue({
        token: 'new-recaptcha-app-check-token',
        expireTimeMillis: Date.now() + 60000,
        issuedAtTimeMillis: 0
      });

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
      mockExchangeToken.mockResolvedValue({
        token: 'new-recaptcha-app-check-token',
        expireTimeMillis: Date.now() + 60000,
        issuedAtTimeMillis: 0
      });

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
      vi.useFakeTimers({ now: 0 });

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
      mockExchangeToken.mockImplementation(
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

      await vi.advanceTimersByTimeAsync(2000);

      // save expired `token-old` with copied state and wait fetch token
      void getToken(appCheck as AppCheckService);

      // wait fetch token with copied state
      void getToken(appCheck as AppCheckService);

      // stored copied state with `token-new-0`
      await vi.advanceTimersByTimeAsync(1500);

      // fetch token with copied state
      const newToken = getToken(appCheck as AppCheckService, true);

      await vi.advanceTimersByTimeAsync(3500);

      expect(await newToken).toEqual({
        token: 'recaptcha-app-check-token-new-1'
      });
      vi.useRealTimers();
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
      mockExchangeToken.mockResolvedValue({
        token: 'new-recaptcha-app-check-token',
        expireTimeMillis: Date.now() + 60000,
        issuedAtTimeMillis: 0
      });

      expect(await getToken(appCheck as AppCheckService)).to.deep.equal({
        token: 'new-recaptcha-app-check-token'
      });
    });

    it('returns the valid token in storage without making a network request', async () => {
      vi.useFakeTimers({ now: 0 });

      storageReadStub.mockResolvedValue(fakeCachedAppCheckToken);
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const clientStub = mockExchangeToken;
      expect(await getToken(appCheck as AppCheckService)).to.deep.equal({
        token: fakeCachedAppCheckToken.token
      });
      expect(clientStub).to.not.have.been.called;

      vi.useRealTimers();
    });

    it('deletes cached token if it is invalid and continues to exchange request', async () => {
      storageReadStub.mockResolvedValue({
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
      mockExchangeToken.mockResolvedValue(freshToken);

      expect(await getToken(appCheck as AppCheckService)).to.deep.equal({
        token: 'new-recaptcha-app-check-token'
      });

      // When it wiped the invalid token.
      expect(storageWriteStub).toHaveBeenCalledWith(app, undefined);

      // When it wrote the new token fetched from the exchange endpoint.
      expect(storageWriteStub).toHaveBeenCalledWith(app, freshToken);
    });

    it('returns the actual token and an internalError if a token is valid but the request fails', async () => {
      vi.spyOn(logger, 'error').mockImplementation(() => {});
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      setInitialState(app, {
        ...getStateReference(app),
        token: fakeRecaptchaAppCheckToken
      });

      stubGetRecaptchaToken();
      mockExchangeToken.mockRejectedValue(new Error('blah'));

      const tokenResult = await getToken(appCheck as AppCheckService, true);
      expect(tokenResult.internalError?.message).toBe('blah');
      expect(tokenResult.token).toBe('fake-recaptcha-app-check-token');
    });

    it('exchanges debug token if in debug mode and there is no cached token', async () => {
      const exchangeTokenStub = mockExchangeToken.mockResolvedValue(
        fakeRecaptchaAppCheckToken
      );
      const debugState = getDebugState();
      debugState.enabled = true;
      debugState.token = new Deferred();
      debugState.token.resolve('my-debug-token');
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const token = await getToken(appCheck as AppCheckService);
      expect(exchangeTokenStub.mock.calls[0][0].body['debug_token']).to.equal(
        'my-debug-token'
      );
      expect(token).toEqual({ token: fakeRecaptchaAppCheckToken.token });
    });

    it('exchanges debug token only once if debug mode with no cached token', async () => {
      const exchangeTokenStub = mockExchangeToken.mockResolvedValue(
        fakeRecaptchaAppCheckToken
      );
      const debugState = getDebugState();
      debugState.enabled = true;
      debugState.token = new Deferred();
      debugState.token.resolve('my-debug-token');
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      const appCheckService = appCheck as AppCheckService;
      const [token1, token2] = await Promise.all([
        getToken(appCheckService),
        getToken(appCheckService)
      ]);
      expect(exchangeTokenStub.mock.calls[0][0].body['debug_token']).to.equal(
        'my-debug-token'
      );
      expect(token1).toEqual({ token: fakeRecaptchaAppCheckToken.token });
      expect(token2).toEqual({ token: fakeRecaptchaAppCheckToken.token });
      expect(exchangeTokenStub).toHaveBeenCalledTimes(1);
    });

    it('throttles for a period less than 1d on 503', async () => {
      // More detailed check of exponential backoff in providers.test.ts
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      stubGetRecaptchaToken();
      const warnStub = vi.spyOn(logger, 'warn').mockImplementation(() => {});
      mockExchangeToken.mockRejectedValue(
        ERROR_FACTORY.create(AppCheckError.FETCH_STATUS_ERROR, {
          httpStatus: 503
        })
      );

      const token = await getToken(appCheck as AppCheckService);

      // ReCaptchaV3Provider's _throttleData is private so checking
      // the resulting error message to be sure it has roughly the
      // correct throttle time. This also tests the time formatter.
      // Check both the error itself and that it makes it through to
      // console.warn
      expect(token.error?.message).toContain('503');
      expect(token.error?.message).toContain('00m');
      expect(token.error?.message).to.not.include('1d');
      expect(warnStub.mock.calls[0][0]).toContain('503');
    });

    it('throttles 1d on 403', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      stubGetRecaptchaToken();
      const warnStub = vi.spyOn(logger, 'warn').mockImplementation(() => {});
      mockExchangeToken.mockRejectedValue(
        ERROR_FACTORY.create(AppCheckError.FETCH_STATUS_ERROR, {
          httpStatus: 403
        })
      );

      const token = await getToken(appCheck as AppCheckService);

      // ReCaptchaV3Provider's _throttleData is private so checking
      // the resulting error message to be sure it has roughly the
      // correct throttle time. This also tests the time formatter.
      // Check both the error itself and that it makes it through to
      // console.warn
      expect(token.error?.message).toContain('403');
      expect(token.error?.message).toContain('1d');
      expect(warnStub.mock.calls[0][0]).toContain('403');
    });
  });

  describe('getLimitedUseToken()', () => {
    it('uses customTokenProvider to get an AppCheck token', async () => {
      const customTokenProvider = getFakeCustomTokenProvider();
      const customProviderSpy = vi.spyOn(customTokenProvider, 'getToken');

      const appCheck = initializeAppCheck(app, {
        provider: customTokenProvider
      });
      const token = await getLimitedUseToken(appCheck as AppCheckService);

      expect(customProviderSpy).toHaveBeenCalledWith(true);
      expect(token).to.deep.equal({
        token: 'fake-custom-app-check-token'
      });
    });

    it('does not interact with state', async () => {
      const customTokenProvider = getFakeCustomTokenProvider();
      vi.spyOn(customTokenProvider, 'getToken');

      const appCheck = initializeAppCheck(app, {
        provider: customTokenProvider
      });
      await getLimitedUseToken(appCheck as AppCheckService);

      expect(getStateReference(app).token).toBeUndefined();
      expect(getStateReference(app).isTokenAutoRefreshEnabled).toBe(false);
    });

    it('uses reCAPTCHA (V3) token to exchange for AppCheck token', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stubGetRecaptchaToken();
      const exchangeTokenStub = mockExchangeToken.mockResolvedValue(
        fakeRecaptchaAppCheckToken
      );

      const token = await getLimitedUseToken(appCheck as AppCheckService);

      expect(reCAPTCHASpy).toHaveBeenCalled();

      expect(
        exchangeTokenStub.mock.calls[0][0].body['recaptcha_v3_token']
      ).to.equal(fakeRecaptchaToken);

      expect(exchangeTokenStub.mock.calls[0][0].body['limited_use']).toBe(true);

      expect(token).toEqual({ token: fakeRecaptchaAppCheckToken.token });
    });

    it('uses reCAPTCHA (Enterprise) token to exchange for AppCheck token', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stubGetRecaptchaToken();
      const exchangeTokenStub = mockExchangeToken.mockResolvedValue(
        fakeRecaptchaAppCheckToken
      );

      const token = await getLimitedUseToken(appCheck as AppCheckService);

      expect(reCAPTCHASpy).toHaveBeenCalled();

      expect(
        exchangeTokenStub.mock.calls[0][0].body['recaptcha_enterprise_token']
      ).toBe(fakeRecaptchaToken);

      expect(exchangeTokenStub.mock.calls[0][0].body['limited_use']).toBe(true);
      expect(token).toEqual({ token: fakeRecaptchaAppCheckToken.token });
    });

    it('exchanges debug token if in debug mode', async () => {
      const exchangeTokenStub = mockExchangeToken.mockResolvedValue(
        fakeRecaptchaAppCheckToken
      );
      const debugState = getDebugState();
      debugState.enabled = true;
      debugState.token = new Deferred();
      debugState.token.resolve('my-debug-token');
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const token = await getLimitedUseToken(appCheck as AppCheckService);
      expect(exchangeTokenStub.mock.calls[0][0].body['debug_token']).to.equal(
        'my-debug-token'
      );
      expect(exchangeTokenStub.mock.calls[0][0].body['limited_use']).toBe(true);
      expect(token).toEqual({ token: fakeRecaptchaAppCheckToken.token });
    });
  });

  describe('addTokenListener', () => {
    afterEach(async () => {
      clearState();
    });

    it('adds token listeners', async () => {
      vi.useFakeTimers({ now: 0 });
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

      expect(getStateReference(app).tokenObservers[0].next).toBe(listener);
      // resolve initTokenRefresher dangling promise
      await vi.advanceTimersByTimeAsync(1000);
    });

    it('starts proactively refreshing token after adding the first listener', async () => {
      const listener = (): void => {};
      setInitialState(app, {
        ...getStateReference(app),
        isTokenAutoRefreshEnabled: true,
        cachedTokenPromise: Promise.resolve(undefined)
      });
      expect(getStateReference(app).tokenObservers.length).toBe(0);
      expect(getStateReference(app).tokenRefresher).toBe(undefined);

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

      expect(getStateReference(app).tokenRefresher?.isRunning()).toBe(true);
    });

    it('notifies the listener with the valid token in memory immediately', async () => {
      vi.useFakeTimers({ now: 0 });

      const listener = vi.fn();

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
      await Promise.resolve();
      await Promise.resolve();
      expect(listener).toHaveBeenCalledWith({
        token: 'fake-memory-app-check-token'
      });
      vi.useRealTimers();
    });

    it('notifies the listener with the valid token in storage', done => {
      storageReadStub.mockResolvedValue({
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
      vi.useFakeTimers({ now: 0 });
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

      const fakeListener: AppCheckTokenListener = vi.fn();

      const fakeExchange = mockExchangeToken.mockResolvedValue({
        token: 'new-recaptcha-app-check-token',
        expireTimeMillis: 10 * 60 * 1000,
        issuedAtTimeMillis: 0
      });

      stubGetRecaptchaToken();

      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.INTERNAL,
        fakeListener
      );
      // Tick 10s, make sure nothing is called repeatedly in that time.
      await vi.advanceTimersByTimeAsync(10000);
      expect(fakeListener).toHaveBeenCalledWith({
        token: 'fake-cached-app-check-token'
      });
      expect(fakeListener).toHaveBeenCalledWith({
        token: 'new-recaptcha-app-check-token'
      });
      expect(fakeExchange).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('proactive refresh window test - exchange request fails - wait 10s', async () => {
      vi.spyOn(logger, 'error').mockImplementation(() => {});
      vi.useFakeTimers({ now: 0 });
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

      const fakeListener: AppCheckTokenListener = vi.fn();

      const fakeExchange = mockExchangeToken.mockRejectedValue(
        new Error('fetch failed or something')
      );

      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.EXTERNAL,
        fakeListener
      );
      // Tick 10s, make sure nothing is called repeatedly in that time.
      await vi.advanceTimersByTimeAsync(10000);
      expect(fakeListener).toHaveBeenCalledWith({
        token: 'fake-cached-app-check-token'
      });
      // once on init and once invoked directly in this test
      expect(fakeListener).toHaveBeenCalledTimes(2);
      expect(fakeExchange).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('proactive refresh window test - exchange request fails - wait 40s', async () => {
      vi.spyOn(logger, 'error').mockImplementation(() => {});
      vi.useFakeTimers({ now: 0 });
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

      const fakeListener: AppCheckTokenListener = vi.fn();

      const fakeExchange = mockExchangeToken.mockRejectedValue(
        new Error('fetch failed or something')
      );

      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.EXTERNAL,
        fakeListener
      );
      // Tick 40s, expect one initial exchange request and one retry.
      // (First backoff is 30s).
      await vi.advanceTimersByTimeAsync(40000);
      expect(fakeListener).toHaveBeenCalledTimes(2);
      expect(fakeExchange).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('expired token - exchange request fails - wait 10s', async () => {
      vi.spyOn(logger, 'error').mockImplementation(() => {});
      vi.useFakeTimers({ now: 0 });
      await vi.advanceTimersByTimeAsync(1);
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

      const fakeListener = vi.fn();
      const errorHandler = vi.fn();
      const fakeNetworkError = new Error('fetch failed or something');

      const fakeExchange =
        mockExchangeToken.mockRejectedValue(fakeNetworkError);

      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.EXTERNAL,
        fakeListener,
        errorHandler
      );
      // Tick 10s, make sure nothing is called repeatedly in that time.
      await vi.advanceTimersByTimeAsync(10000);
      expect(fakeListener).not.toHaveBeenCalled();
      expect(fakeExchange).toHaveBeenCalledTimes(1);
      expect(errorHandler).toHaveBeenCalledWith(fakeNetworkError);
      vi.useRealTimers();
    });

    it('expired token - exchange request fails - wait 40s', async () => {
      vi.spyOn(logger, 'error').mockImplementation(() => {});
      vi.useFakeTimers({ now: 0 });
      await vi.advanceTimersByTimeAsync(1);
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

      const fakeListener = vi.fn();
      const errorHandler = vi.fn();
      const fakeNetworkError = new Error('fetch failed or something');

      const fakeExchange =
        mockExchangeToken.mockRejectedValue(fakeNetworkError);

      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.EXTERNAL,
        fakeListener,
        errorHandler
      );
      // Tick 40s, expect one initial exchange request and one retry.
      // (First backoff is 30s).
      await vi.advanceTimersByTimeAsync(40000);
      expect(fakeListener).not.toHaveBeenCalled();
      expect(fakeExchange).toHaveBeenCalledTimes(2);
      expect(errorHandler).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
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
      expect(getStateReference(app).tokenObservers.length).toBe(1);

      removeTokenListener(app, listener);
      expect(getStateReference(app).tokenObservers.length).toBe(0);
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

      expect(getStateReference(app).tokenObservers.length).toBe(1);
      expect(getStateReference(app).tokenRefresher?.isRunning()).toBe(true);

      removeTokenListener(app, listener);
      expect(getStateReference(app).tokenObservers.length).toBe(0);
      expect(getStateReference(app).tokenRefresher?.isRunning()).toBe(false);
    });
  });
});
