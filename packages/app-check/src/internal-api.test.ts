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

import type { MockInstance } from 'vitest';
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
import { logger } from './logger';
import {
  getStateReference,
  clearState,
  setInitialState,
  getDebugState
} from './state';
import { AppCheckToken, AppCheckTokenListener } from './public-types';
import { Deferred, FirebaseError } from '@firebase/util';
import {
  CustomProvider,
  ReCaptchaEnterpriseProvider,
  ReCaptchaV3Provider
} from './providers';
import { AppCheckService } from './factory';
import {
  AppCheckTokenInternal,
  AppCheckTokenResult,
  ListenerType
} from './types';
import { EXCHANGE_TOKEN_TIMEOUT } from './constants';
import { AppCheckError, ERROR_FACTORY } from './errors';

import * as storage from './storage';
import * as client from './client';
import * as recaptcha from './recaptcha';
import * as util from './util';

vi.mock('./storage', { spy: true });
vi.mock('./client', { spy: true });
vi.mock('./recaptcha', { spy: true });
vi.mock('./util', { spy: true });

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

    return vi.spyOn(recaptcha, 'getToken').mockResolvedValue(token);
  }

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    app = getFullApp();
    storageReadStub = vi
      .spyOn(storage, 'readTokenFromStorage')
      .mockResolvedValue(undefined);
    storageWriteStub = vi
      .spyOn(storage, 'writeTokenToStorage')
      .mockResolvedValue(undefined);
    vi.spyOn(storage, 'readOrCreateDebugTokenFromStorage').mockResolvedValue(
      'my-debug-token'
    );
    vi.spyOn(util, 'getRecaptcha').mockReturnValue(getFakeGreCAPTCHA());
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
      const customProviderSpy = vi.spyOn(customTokenProvider, 'getToken');

      const appCheck = initializeAppCheck(app, {
        provider: customTokenProvider
      });
      const token = await getToken(appCheck as AppCheckService);

      expect(customProviderSpy).toHaveBeenCalled();
      expect(token).toEqual({
        token: 'fake-custom-app-check-token'
      });
    });

    it('uses reCAPTCHA (V3) token to exchange for AppCheck token', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stubGetRecaptchaToken();
      const exchangeTokenStub = vi
        .spyOn(client, 'exchangeToken')
        .mockResolvedValue(fakeRecaptchaAppCheckToken);

      const token = await getToken(appCheck as AppCheckService);

      expect(reCAPTCHASpy).toHaveBeenCalled();

      expect(
        exchangeTokenStub.mock.calls[0][0].body['recaptcha_v3_token']
      ).toBe(fakeRecaptchaToken);
      expect(token).toEqual({ token: fakeRecaptchaAppCheckToken.token });
    });

    it('uses reCAPTCHA (Enterprise) token to exchange for AppCheck token', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stubGetRecaptchaToken();

      const exchangeTokenStub = vi
        .spyOn(client, 'exchangeToken')
        .mockResolvedValue(fakeRecaptchaAppCheckToken);

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
      vi.spyOn(client, 'exchangeToken').mockRejectedValue(error);

      const token = await getToken(appCheck as AppCheckService, false, true);

      expect(reCAPTCHASpy).toHaveBeenCalled();
      expect(token).toEqual({
        token: formatDummyToken(defaultTokenErrorData),
        error
      });
      expect(errorStub.mock.calls[0][1].message).toContain(
        'oops, something went wrong'
      );
    });

    it('resolves with a dummy token and an error if failed to get a token in debug mode', async () => {
      const errorStub = vi.spyOn(console, 'error').mockImplementation(() => {});
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const error = new Error('oops, something went wrong');
      vi.spyOn(client, 'exchangeToken').mockRejectedValue(error);

      const token = await getToken(appCheck as AppCheckService, false, true);

      expect(token).toEqual({
        token: formatDummyToken(defaultTokenErrorData),
        error
      });
      expect(errorStub.mock.calls[0][1].message).toContain(
        'oops, something went wrong'
      );
      delete window.FIREBASE_APPCHECK_DEBUG_TOKEN;
    });

    it('resolves with a dummy token and an error if recaptcha failed', async () => {
      const errorStub = vi.spyOn(console, 'error').mockImplementation(() => {});
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stubGetRecaptchaToken('', false);
      const exchangeTokenStub = vi
        .spyOn(client, 'exchangeToken')
        .mockImplementation(vi.fn());

      const token = await getToken(appCheck as AppCheckService, false, true);

      expect(reCAPTCHASpy).toHaveBeenCalled();
      expect(exchangeTokenStub).not.toHaveBeenCalled();
      expect(token.token).toBe(formatDummyToken(defaultTokenErrorData));
      expect(errorStub.mock.calls[0][1].message).toContain(
        AppCheckError.RECAPTCHA_ERROR
      );
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
    });

    it('notifies listeners using new token', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });

      stubGetRecaptchaToken();
      vi.spyOn(client, 'exchangeToken').mockResolvedValue(
        fakeRecaptchaAppCheckToken
      );

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
      vi.spyOn(client, 'exchangeToken').mockRejectedValue(
        new Error('exchange error')
      );
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
      expect(errorFn1.mock.calls[0][0].message).toContain('exchange error');
    });

    it('ignores listeners that throw', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      stubGetRecaptchaToken();
      vi.spyOn(client, 'exchangeToken').mockResolvedValue(
        fakeRecaptchaAppCheckToken
      );
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

      const clientStub = vi
        .spyOn(client, 'exchangeToken')
        .mockImplementation(vi.fn());

      expect(getStateReference(app).token).toBe(undefined);
      expect(await getToken(appCheck as AppCheckService)).toEqual({
        token: fakeCachedAppCheckToken.token
      });
      expect(getStateReference(app).token).toBe(fakeCachedAppCheckToken);
      expect(clientStub).not.toHaveBeenCalled();
    });

    it('persists token to storage', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      stubGetRecaptchaToken();
      vi.spyOn(client, 'exchangeToken').mockResolvedValue(
        fakeRecaptchaAppCheckToken
      );
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

      const clientStub = vi
        .spyOn(client, 'exchangeToken')
        .mockImplementation(vi.fn());
      expect(await getToken(appCheck as AppCheckService)).toEqual({
        token: fakeRecaptchaAppCheckToken.token
      });
      expect(clientStub).not.toHaveBeenCalled();
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
      vi.spyOn(client, 'exchangeToken').mockResolvedValue({
        token: 'new-recaptcha-app-check-token',
        expireTimeMillis: Date.now() + 60000,
        issuedAtTimeMillis: 0
      });

      expect(await getToken(appCheck as AppCheckService, true)).toEqual({
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
      vi.spyOn(client, 'exchangeToken').mockResolvedValue({
        token: 'new-recaptcha-app-check-token',
        expireTimeMillis: Date.now() + 60000,
        issuedAtTimeMillis: 0
      });

      const getTokenPromise = getToken(appCheck as AppCheckService, true);

      expect(getStateReference(app).exchangeTokenPromise).toBeInstanceOf(
        Promise
      );

      await getTokenPromise;

      expect(getStateReference(app).exchangeTokenPromise).toBe(undefined);
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
      vi.spyOn(client, 'exchangeToken').mockImplementation(
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
    });

    describe('an exchange that never settles', () => {
      // Longer than any deadline the exchange could reasonably use.
      const LONG_WAIT = 5 * 60 * 1000;

      // Replaces the reCAPTCHA call with one that never returns. The returned
      // Deferred resolves once the call has started.
      function stubLostRecaptchaToken(): {
        spy: MockInstance;
        started: Deferred<void>;
      } {
        const started = new Deferred<void>();
        const spy = vi.spyOn(recaptcha, 'getToken').mockImplementation(() => {
          started.resolve();
          return new Promise(() => {});
        });
        return { spy, started };
      }

      function trackSettled(promise: Promise<unknown>): () => boolean {
        let settled = false;
        void promise.then(() => {
          settled = true;
        });
        return () => settled;
      }

      it('releases the caller with a timeout error', async () => {
        vi.useFakeTimers({ now: 0 });
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        const appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
        });
        const { spy, started } = stubLostRecaptchaToken();
        const exchangeSpy = vi.spyOn(client, 'exchangeToken');

        const resultPromise = getToken(appCheck as AppCheckService);
        await started.promise;

        expect(spy).toHaveBeenCalledTimes(1);
        expect(getStateReference(app).exchangeTokenPromise).toBeInstanceOf(
          Promise
        );

        const isSettled = trackSettled(resultPromise);
        await vi.advanceTimersByTimeAsync(LONG_WAIT);
        expect(isSettled()).toBe(true);

        const result = await resultPromise;
        expect(result.token).toBe(formatDummyToken(defaultTokenErrorData));
        expect((result.error as FirebaseError).code).toBe(
          'appCheck/exchange-timeout'
        );
        expect(getStateReference(app).exchangeTokenPromise).toBeUndefined();
        expect(exchangeSpy).not.toHaveBeenCalled();
      });

      it('lets the next call start a new exchange', async () => {
        vi.useFakeTimers({ now: 0 });
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        const appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
        });
        const { started } = stubLostRecaptchaToken();

        const firstPromise = getToken(appCheck as AppCheckService);
        await started.promise;

        const isSettled = trackSettled(firstPromise);
        await vi.advanceTimersByTimeAsync(LONG_WAIT);
        expect(isSettled()).toBe(true);
        await firstPromise;

        // The stuck step now answers.
        const reCAPTCHASpy = stubGetRecaptchaToken();
        vi.spyOn(client, 'exchangeToken').mockResolvedValue({
          token: 'new-recaptcha-app-check-token',
          expireTimeMillis: Date.now() + 60000,
          issuedAtTimeMillis: 0
        });

        expect(await getToken(appCheck as AppCheckService)).toEqual({
          token: 'new-recaptcha-app-check-token'
        });
        expect(reCAPTCHASpy).toHaveBeenCalledTimes(2);
      });

      it('releases every caller waiting on the same exchange', async () => {
        vi.useFakeTimers({ now: 0 });
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        const appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
        });
        const { spy, started } = stubLostRecaptchaToken();

        const firstPromise = getToken(appCheck as AppCheckService);
        await started.promise;
        // Joins the exchange already in flight.
        const secondPromise = getToken(appCheck as AppCheckService);
        await vi.advanceTimersByTimeAsync(0);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(getStateReference(app).exchangeTokenPromise).toBeInstanceOf(
          Promise
        );

        const isFirstSettled = trackSettled(firstPromise);
        const isSecondSettled = trackSettled(secondPromise);
        await vi.advanceTimersByTimeAsync(LONG_WAIT);
        expect(isFirstSettled()).toBe(true);
        expect(isSecondSettled()).toBe(true);

        const [first, second] = await Promise.all([
          firstPromise,
          secondPromise
        ]);
        expect((first.error as FirebaseError).code).toBe(
          'appCheck/exchange-timeout'
        );
        expect((second.error as FirebaseError).code).toBe(
          'appCheck/exchange-timeout'
        );
      });

      it('releases the caller in debug mode', async () => {
        vi.useFakeTimers({ now: 0 });
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        const debugState = getDebugState();
        debugState.enabled = true;
        debugState.token = new Deferred();
        debugState.token.resolve('my-debug-token');
        const appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
        });

        const started = new Deferred<void>();
        const exchangeSpy = vi
          .spyOn(client, 'exchangeToken')
          .mockImplementation(() => {
            started.resolve();
            return new Promise(() => {});
          });

        const resultPromise = getToken(appCheck as AppCheckService);
        await started.promise;

        expect(exchangeSpy).toHaveBeenCalledTimes(1);
        expect(getStateReference(app).exchangeTokenPromise).toBeInstanceOf(
          Promise
        );

        const isSettled = trackSettled(resultPromise);
        await vi.advanceTimersByTimeAsync(LONG_WAIT);
        expect(isSettled()).toBe(true);

        const result = await resultPromise;
        expect(result.token).toBe(formatDummyToken(defaultTokenErrorData));
        expect((result.error as FirebaseError).code).toBe(
          'appCheck/exchange-timeout'
        );
      });

      it('returns the still valid token with an internalError', async () => {
        vi.useFakeTimers({ now: 0 });
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        const appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
        });
        setInitialState(app, {
          ...getStateReference(app),
          token: {
            token: 'still-valid-app-check-token',
            expireTimeMillis: Date.now() + 2 * LONG_WAIT,
            issuedAtTimeMillis: 0
          }
        });
        const { spy, started } = stubLostRecaptchaToken();

        const resultPromise = getToken(appCheck as AppCheckService, true);
        await started.promise;

        expect(spy).toHaveBeenCalledTimes(1);
        expect(getStateReference(app).exchangeTokenPromise).toBeInstanceOf(
          Promise
        );

        const isSettled = trackSettled(resultPromise);
        await vi.advanceTimersByTimeAsync(LONG_WAIT);
        expect(isSettled()).toBe(true);

        const result = await resultPromise;
        expect(result.token).toBe('still-valid-app-check-token');
        expect((result.internalError as FirebaseError).code).toBe(
          'appCheck/exchange-timeout'
        );
      });

      // Waits, with the fake clock frozen, until `condition` holds.
      async function until(condition: () => boolean): Promise<void> {
        for (let i = 0; i < 100 && !condition(); i++) {
          await vi.advanceTimersByTimeAsync(0);
        }
        expect(condition()).toBe(true);
      }

      function makeAppToken(token: string): AppCheckToken {
        return { token, expireTimeMillis: Date.now() + 10 * 60 * 1000 };
      }

      // A provider whose attempts are settled by the test. It gets no signal,
      // so it keeps running after App Check has given up on an attempt.
      function getControlledProvider(): {
        provider: CustomProvider;
        calls: Array<Deferred<AppCheckToken>>;
      } {
        const calls: Array<Deferred<AppCheckToken>> = [];
        const provider = new CustomProvider({
          getToken: () => {
            const call = new Deferred<AppCheckToken>();
            calls.push(call);
            return call.promise;
          }
        });
        return { provider, calls };
      }

      function okResponse(token: string): Response {
        return new Response(JSON.stringify({ token, ttl: '3600s' }), {
          status: 200
        });
      }

      // Replaces fetch with one that answers when the test says so, and that
      // ignores abort signals.
      function stubDeferredFetch(): {
        fetchSpy: MockInstance;
        responses: Array<Deferred<Response>>;
      } {
        const responses: Array<Deferred<Response>> = [];
        const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(() => {
          const response = new Deferred<Response>();
          responses.push(response);
          return response.promise;
        });
        return { fetchSpy, responses };
      }

      // Resolves when `promise` has settled, whichever way.
      function settledOf(promise: Promise<unknown>): Promise<unknown> {
        return promise.catch(() => {});
      }

      it('is still waiting just before the deadline and gives up at it', async () => {
        vi.useFakeTimers({ now: 0 });
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        const appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
        });
        const { spy, started } = stubLostRecaptchaToken();

        const resultPromise = getToken(appCheck as AppCheckService);
        await started.promise;
        const signal = spy.mock.calls[0][1] as AbortSignal;
        const isSettled = trackSettled(resultPromise);

        await vi.advanceTimersByTimeAsync(EXCHANGE_TOKEN_TIMEOUT - 1);
        expect(isSettled()).toBe(false);
        expect(signal.aborted).toBe(false);

        await vi.advanceTimersByTimeAsync(1);
        expect(isSettled()).toBe(true);
        expect(signal.aborted).toBe(true);
      });

      it('gives the client a signal that is aborted at the deadline in debug mode', async () => {
        vi.useFakeTimers({ now: 0 });
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        const debugState = getDebugState();
        debugState.enabled = true;
        debugState.token = new Deferred();
        debugState.token.resolve('my-debug-token');
        const appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
        });
        const started = new Deferred<void>();
        const exchangeSpy = vi
          .spyOn(client, 'exchangeToken')
          .mockImplementation(() => {
            started.resolve();
            return new Promise(() => {});
          });

        const resultPromise = getToken(appCheck as AppCheckService);
        await started.promise;
        const signal = exchangeSpy.mock.calls[0][2] as AbortSignal;
        expect(signal.aborted).toBe(false);

        await vi.advanceTimersByTimeAsync(EXCHANGE_TOKEN_TIMEOUT);
        expect(signal.aborted).toBe(true);
        expect(((await resultPromise).error as FirebaseError).code).toBe(
          'appCheck/exchange-timeout'
        );
      });

      it('keeps the exchange in flight when an exchange it gave up on settles', async () => {
        vi.useFakeTimers({ now: 0 });
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        const { provider, calls } = getControlledProvider();
        const appCheck = initializeAppCheck(app, {
          provider,
          isTokenAutoRefreshEnabled: false
        });

        const first = getToken(appCheck as AppCheckService);
        await until(() => calls.length === 1);
        await vi.advanceTimersByTimeAsync(EXCHANGE_TOKEN_TIMEOUT);
        expect(((await first).error as FirebaseError).code).toBe(
          'appCheck/exchange-timeout'
        );

        const second = getToken(appCheck as AppCheckService);
        await until(() => calls.length === 2);
        const slot = getStateReference(app).exchangeTokenPromise;
        expect(slot).toBeInstanceOf(Promise);
        const joiner = getToken(appCheck as AppCheckService);
        await vi.advanceTimersByTimeAsync(0);

        calls[0].resolve(makeAppToken('token-a'));
        await vi.advanceTimersByTimeAsync(0);
        expect(getStateReference(app).exchangeTokenPromise).toBe(slot);

        calls[1].resolve(makeAppToken('token-b'));
        expect(await second).toEqual({ token: 'token-b' });
        expect(await joiner).toEqual({ token: 'token-b' });
        expect(calls.length).toBe(2);
        expect(getStateReference(app).exchangeTokenPromise).toBeUndefined();
      });

      it('does not notify listeners or write a token for an exchange it gave up on', async () => {
        vi.useFakeTimers({ now: 0 });
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        const { provider, calls } = getControlledProvider();
        const appCheck = initializeAppCheck(app, {
          provider,
          isTokenAutoRefreshEnabled: false
        });
        const listener = vi.fn();
        addTokenListener(
          appCheck as AppCheckService,
          ListenerType.INTERNAL,
          listener
        );

        const first = getToken(appCheck as AppCheckService);
        await until(() => calls.length === 1);
        await vi.advanceTimersByTimeAsync(EXCHANGE_TOKEN_TIMEOUT);
        await first;
        const second = getToken(appCheck as AppCheckService);
        await until(() => calls.length === 2);
        calls[1].resolve(makeAppToken('token-b'));
        expect(await second).toEqual({ token: 'token-b' });

        expect(listener).toHaveBeenCalledTimes(2);
        expect((listener.mock.calls[0][0].error as FirebaseError).code).toBe(
          'appCheck/exchange-timeout'
        );
        expect(listener.mock.calls[1][0]).toEqual({ token: 'token-b' });
        const writesBefore = storageWriteStub.mock.calls.length;

        calls[0].resolve(makeAppToken('token-a'));
        await vi.advanceTimersByTimeAsync(0);

        expect(listener).toHaveBeenCalledTimes(2);
        expect(storageWriteStub.mock.calls.length).toBe(writesBefore);
        expect(getStateReference(app).token?.token).toBe('token-b');
      });

      it('ignores the late failure of an exchange it gave up on', async () => {
        vi.useFakeTimers({ now: 0 });
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        const { provider, calls } = getControlledProvider();
        const appCheck = initializeAppCheck(app, {
          provider,
          isTokenAutoRefreshEnabled: false
        });
        const listener = vi.fn();
        addTokenListener(
          appCheck as AppCheckService,
          ListenerType.INTERNAL,
          listener
        );

        const first = getToken(appCheck as AppCheckService);
        await until(() => calls.length === 1);
        await vi.advanceTimersByTimeAsync(EXCHANGE_TOKEN_TIMEOUT);
        await first;
        expect(listener).toHaveBeenCalledTimes(1);
        const writesBefore = storageWriteStub.mock.calls.length;

        calls[0].reject(new Error('late failure'));
        await vi.advanceTimersByTimeAsync(0);

        expect(listener).toHaveBeenCalledTimes(1);
        expect(storageWriteStub.mock.calls.length).toBe(writesBefore);
        expect(getStateReference(app).token).toBeUndefined();
        expect(getStateReference(app).exchangeTokenPromise).toBeUndefined();
      });

      it('does not throttle the provider when a late 403 arrives for an exchange it gave up on', async () => {
        vi.useFakeTimers({ now: 0 });
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        vi.spyOn(logger, 'warn').mockImplementation(() => {});
        const provider = new ReCaptchaV3Provider(FAKE_SITE_KEY);
        const providerSpy = vi.spyOn(provider, 'getToken');
        const appCheck = initializeAppCheck(app, { provider });
        stubGetRecaptchaToken();
        const { fetchSpy, responses } = stubDeferredFetch();

        const first = getToken(appCheck as AppCheckService);
        await until(() => responses.length === 1);
        const firstProviderPromise = providerSpy.mock.results[0]
          .value as Promise<unknown>;
        const firstProviderCall = settledOf(firstProviderPromise);
        await vi.advanceTimersByTimeAsync(EXCHANGE_TOKEN_TIMEOUT);
        expect(((await first).error as FirebaseError).code).toBe(
          'appCheck/exchange-timeout'
        );

        const second = getToken(appCheck as AppCheckService);
        await until(() => responses.length === 2);
        responses[1].resolve(okResponse('token-b'));
        expect(await second).toEqual({ token: 'token-b' });

        // The exchange that was given up on is answered with a 403.
        responses[0].resolve(new Response('', { status: 403 }));
        await firstProviderCall;
        const firstError = (await firstProviderPromise.catch(
          e => e
        )) as FirebaseError;
        expect(firstError).toBeInstanceOf(FirebaseError);
        expect(firstError.code).toBe('appCheck/fetch-status-error');
        expect(firstError.customData?.httpStatus).toBe(403);

        const third = getToken(appCheck as AppCheckService, true);
        await until(() => responses.length === 3);
        responses[2].resolve(okResponse('token-c'));
        expect(await third).toEqual({ token: 'token-c' });

        const limitedUse = getLimitedUseToken(appCheck as AppCheckService);
        await until(() => responses.length === 4);
        responses[3].resolve(okResponse('token-limited'));
        expect(await limitedUse).toEqual({ token: 'token-limited' });
        expect(
          JSON.parse(fetchSpy.mock.calls[3][1].body as string)['limited_use']
        ).toBe(true);
      });

      it('keeps the throttle of the provider when an exchange it gave up on succeeds late', async () => {
        vi.useFakeTimers({ now: 0 });
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        vi.spyOn(logger, 'warn').mockImplementation(() => {});
        const provider = new ReCaptchaV3Provider(FAKE_SITE_KEY);
        const providerSpy = vi.spyOn(provider, 'getToken');
        const appCheck = initializeAppCheck(app, { provider });
        stubGetRecaptchaToken();
        const { responses } = stubDeferredFetch();

        const first = getToken(appCheck as AppCheckService);
        await until(() => responses.length === 1);
        const firstProviderPromise = providerSpy.mock.results[0]
          .value as Promise<AppCheckTokenInternal>;
        const firstProviderCall = settledOf(firstProviderPromise);
        await vi.advanceTimersByTimeAsync(EXCHANGE_TOKEN_TIMEOUT);
        await first;

        const second = getToken(appCheck as AppCheckService);
        await until(() => responses.length === 2);
        responses[1].resolve(new Response('', { status: 403 }));
        expect(((await second).error as FirebaseError).code).toBe(
          'appCheck/initial-throttle'
        );

        // The exchange that was given up on succeeds late.
        responses[0].resolve(okResponse('token-a'));
        await firstProviderCall;
        expect((await firstProviderPromise).token).toBe('token-a');

        const third = await getToken(appCheck as AppCheckService, true);
        expect((third.error as FirebaseError).code).toBe('appCheck/throttled');
        expect(responses.length).toBe(2);
        expect(getStateReference(app).token).toBeUndefined();
      });

      it('leaves no timer behind once an exchange settles in time', async () => {
        vi.useFakeTimers({ now: 0 });
        const { provider, calls } = getControlledProvider();
        const appCheck = initializeAppCheck(app, {
          provider,
          isTokenAutoRefreshEnabled: false
        });
        const timersBefore = vi.getTimerCount();

        const resultPromise = getToken(appCheck as AppCheckService);
        await until(() => calls.length === 1);
        expect(vi.getTimerCount()).toBe(timersBefore + 1);

        calls[0].resolve(makeAppToken('token-a'));
        expect(await resultPromise).toEqual({ token: 'token-a' });
        expect(vi.getTimerCount()).toBe(timersBefore);
      });

      it('does not affect a limited use token', async () => {
        vi.useFakeTimers({ now: 0 });
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        const appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
        });
        getStateReference(app).reCAPTCHAState!.succeeded = true;
        // Only the first call, the ordinary exchange, never returns.
        const started = new Deferred<void>();
        let recaptchaCalls = 0;
        vi.spyOn(recaptcha, 'getToken').mockImplementation(() => {
          recaptchaCalls++;
          if (recaptchaCalls === 1) {
            started.resolve();
            return new Promise(() => {});
          }
          return Promise.resolve(fakeRecaptchaToken);
        });
        const exchangeSpy = vi
          .spyOn(client, 'exchangeToken')
          .mockResolvedValue(fakeRecaptchaAppCheckToken);

        const ordinary = getToken(appCheck as AppCheckService);
        await started.promise;

        // Not blocked by the ordinary exchange that is in flight.
        expect(await getLimitedUseToken(appCheck as AppCheckService)).toEqual({
          token: fakeRecaptchaAppCheckToken.token
        });
        expect(exchangeSpy).toHaveBeenCalledTimes(1);
        expect(exchangeSpy.mock.calls[0][0].body['limited_use']).toBe(true);
        expect(exchangeSpy.mock.calls[0][2]).toBeUndefined();

        // And the ordinary exchange timing out does not change that.
        await vi.advanceTimersByTimeAsync(EXCHANGE_TOKEN_TIMEOUT);
        expect(((await ordinary).error as FirebaseError).code).toBe(
          'appCheck/exchange-timeout'
        );
        expect(await getLimitedUseToken(appCheck as AppCheckService)).toEqual({
          token: fakeRecaptchaAppCheckToken.token
        });
      });

      it('joins the exchange in flight when the provider calls getToken() synchronously', async () => {
        vi.useFakeTimers({ now: 0 });
        let providerCalls = 0;
        let reentrant: Promise<AppCheckTokenResult> | undefined;
        const appCheck: AppCheckService = initializeAppCheck(app, {
          provider: new CustomProvider({
            getToken: () => {
              providerCalls++;
              if (providerCalls === 1) {
                reentrant = getToken(appCheck, true);
              }
              return Promise.resolve(makeAppToken('token-new'));
            }
          })
        }) as AppCheckService;
        setInitialState(app, {
          ...getStateReference(app),
          token: makeAppToken('token-in-memory') as AppCheckTokenInternal
        });

        const result = await getToken(appCheck, true);

        expect(result).toEqual({ token: 'token-new' });
        expect(await reentrant).toEqual({ token: 'token-new' });
        expect(providerCalls).toBe(1);
      });

      it('resolves with a dummy token and the error when the provider throws synchronously', async () => {
        vi.useFakeTimers({ now: 0 });
        const appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
          isTokenAutoRefreshEnabled: false
        });
        const error = new Error('thrown synchronously');
        const timersBefore = vi.getTimerCount();
        let slotDuringCall: unknown;
        let timersDuringCall: number | undefined;
        vi.spyOn(
          getStateReference(app).provider!,
          'getToken'
        ).mockImplementation(() => {
          slotDuringCall = getStateReference(app).exchangeTokenPromise;
          timersDuringCall = vi.getTimerCount();
          throw error;
        });

        const result = await getToken(appCheck as AppCheckService);

        // The slot was published and the deadline armed before provider code ran.
        expect(slotDuringCall).toBeInstanceOf(Promise);
        expect(timersDuringCall).toBe(timersBefore + 1);

        expect(result).toEqual({
          token: formatDummyToken(defaultTokenErrorData),
          error
        });
        expect(getStateReference(app).exchangeTokenPromise).toBeUndefined();
        expect(vi.getTimerCount()).toBe(timersBefore);
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
      vi.spyOn(client, 'exchangeToken').mockResolvedValue({
        token: 'new-recaptcha-app-check-token',
        expireTimeMillis: Date.now() + 60000,
        issuedAtTimeMillis: 0
      });

      expect(await getToken(appCheck as AppCheckService)).toEqual({
        token: 'new-recaptcha-app-check-token'
      });
    });

    it('returns the valid token in storage without making a network request', async () => {
      vi.useFakeTimers({ now: 0 });

      storageReadStub.mockResolvedValue(fakeCachedAppCheckToken);
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const clientStub = vi
        .spyOn(client, 'exchangeToken')
        .mockImplementation(vi.fn());
      expect(await getToken(appCheck as AppCheckService)).toEqual({
        token: fakeCachedAppCheckToken.token
      });
      expect(clientStub).not.toHaveBeenCalled();
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
      vi.spyOn(client, 'exchangeToken').mockResolvedValue(freshToken);

      expect(await getToken(appCheck as AppCheckService)).toEqual({
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
      vi.spyOn(client, 'exchangeToken').mockRejectedValue(new Error('blah'));

      const tokenResult = await getToken(appCheck as AppCheckService, true);
      expect(tokenResult.internalError?.message).toBe('blah');
      expect(tokenResult.token).toBe('fake-recaptcha-app-check-token');
    });

    it('exchanges debug token if in debug mode and there is no cached token', async () => {
      const exchangeTokenStub = vi
        .spyOn(client, 'exchangeToken')
        .mockResolvedValue(fakeRecaptchaAppCheckToken);
      const debugState = getDebugState();
      debugState.enabled = true;
      debugState.token = new Deferred();
      debugState.token.resolve('my-debug-token');
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const token = await getToken(appCheck as AppCheckService);
      expect(exchangeTokenStub.mock.calls[0][0].body['debug_token']).toBe(
        'my-debug-token'
      );
      expect(token).toEqual({ token: fakeRecaptchaAppCheckToken.token });
    });

    it('exchanges debug token only once if debug mode with no cached token', async () => {
      const exchangeTokenStub = vi
        .spyOn(client, 'exchangeToken')
        .mockResolvedValue(fakeRecaptchaAppCheckToken);
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
      expect(exchangeTokenStub.mock.calls[0][0].body['debug_token']).toBe(
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
      vi.spyOn(client, 'exchangeToken').mockRejectedValue(
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
      expect(token.error?.message).not.toContain('1d');
      expect(warnStub.mock.calls[0][0]).toContain('503');
    });

    it('throttles 1d on 403', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      stubGetRecaptchaToken();
      const warnStub = vi.spyOn(logger, 'warn').mockImplementation(() => {});
      vi.spyOn(client, 'exchangeToken').mockRejectedValue(
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
      expect(token).toEqual({
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
      const exchangeTokenStub = vi
        .spyOn(client, 'exchangeToken')
        .mockResolvedValue(fakeRecaptchaAppCheckToken);

      const token = await getLimitedUseToken(appCheck as AppCheckService);

      expect(reCAPTCHASpy).toHaveBeenCalled();

      expect(
        exchangeTokenStub.mock.calls[0][0].body['recaptcha_v3_token']
      ).toBe(fakeRecaptchaToken);

      expect(exchangeTokenStub.mock.calls[0][0].body['limited_use']).toBe(true);

      expect(token).toEqual({ token: fakeRecaptchaAppCheckToken.token });
    });

    it('uses reCAPTCHA (Enterprise) token to exchange for AppCheck token', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY)
      });

      const reCAPTCHASpy = stubGetRecaptchaToken();
      const exchangeTokenStub = vi
        .spyOn(client, 'exchangeToken')
        .mockResolvedValue(fakeRecaptchaAppCheckToken);

      const token = await getLimitedUseToken(appCheck as AppCheckService);

      expect(reCAPTCHASpy).toHaveBeenCalled();

      expect(
        exchangeTokenStub.mock.calls[0][0].body['recaptcha_enterprise_token']
      ).toBe(fakeRecaptchaToken);

      expect(exchangeTokenStub.mock.calls[0][0].body['limited_use']).toBe(true);
      expect(token).toEqual({ token: fakeRecaptchaAppCheckToken.token });
    });

    it('exchanges debug token if in debug mode', async () => {
      const exchangeTokenStub = vi
        .spyOn(client, 'exchangeToken')
        .mockResolvedValue(fakeRecaptchaAppCheckToken);
      const debugState = getDebugState();
      debugState.enabled = true;
      debugState.token = new Deferred();
      debugState.token.resolve('my-debug-token');
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });

      const token = await getLimitedUseToken(appCheck as AppCheckService);
      expect(exchangeTokenStub.mock.calls[0][0].body['debug_token']).toBe(
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
      vi.useFakeTimers({ now: 0 });
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

      expect(
        getStateReference(app).tokenRefresher?.isRunning()
      ).toBeUndefined();

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
      await vi.runAllTimersAsync();
      expect(listener).toHaveBeenCalledWith({
        token: 'fake-memory-app-check-token'
      });
    });

    it('notifies the listener with the valid token in storage', async () => {
      vi.useFakeTimers({ now: 0 });
      storageReadStub.mockResolvedValue({
        token: `fake-cached-app-check-token`,
        expireTimeMillis: Date.now() + 60000,
        issuedAtTimeMillis: 0
      });
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });

      const fakeListener = vi.fn();

      addTokenListener(
        appCheck as AppCheckService,
        ListenerType.INTERNAL,
        fakeListener
      );

      await getStateReference(app).cachedTokenPromise;
      expect(fakeListener).toHaveBeenCalledWith({
        token: `fake-cached-app-check-token`
      });
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

      const fakeExchange = vi.spyOn(client, 'exchangeToken').mockResolvedValue({
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

      const fakeExchange = vi
        .spyOn(client, 'exchangeToken')
        .mockRejectedValue(new Error('fetch failed or something'));

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

      const fakeExchange = vi
        .spyOn(client, 'exchangeToken')
        .mockRejectedValue(new Error('fetch failed or something'));

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

      const fakeExchange = vi
        .spyOn(client, 'exchangeToken')
        .mockRejectedValue(fakeNetworkError);

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

      const fakeExchange = vi
        .spyOn(client, 'exchangeToken')
        .mockRejectedValue(fakeNetworkError);

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
