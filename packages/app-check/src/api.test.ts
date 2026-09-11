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

const {
  mockReadTokenFromStorage,
  mockWriteTokenToStorage,
  mockGetRecaptcha,
  mockWriteDebugTokenToIndexedDB,
  mockReadDebugTokenFromIndexedDB,
  mockInitializeDebugMode,
  mockInitializeRecaptchaV3,
  mockInitializeRecaptchaEnterprise,
  mockGetReCAPTCHAToken,
  mockExchangeToken,
  mockInternalGetToken,
  mockInternalGetLimitedUseToken
} = vi.hoisted(() => ({
  mockReadTokenFromStorage: vi.fn(),
  mockWriteTokenToStorage: vi.fn(),
  mockGetRecaptcha: vi.fn(),
  mockWriteDebugTokenToIndexedDB: vi.fn(),
  mockReadDebugTokenFromIndexedDB: vi.fn(),
  mockInitializeDebugMode: vi.fn(),
  mockInitializeRecaptchaV3: vi.fn(),
  mockInitializeRecaptchaEnterprise: vi.fn(),
  mockGetReCAPTCHAToken: vi.fn(),
  mockExchangeToken: vi.fn(),
  mockInternalGetToken: vi.fn(),
  mockInternalGetLimitedUseToken: vi.fn()
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

vi.mock('./indexeddb', async importOriginal => {
  const actual = await importOriginal<typeof import('./indexeddb')>();
  return {
    ...actual,
    writeDebugTokenToIndexedDB: (...args: unknown[]) =>
      mockWriteDebugTokenToIndexedDB.getMockImplementation()
        ? mockWriteDebugTokenToIndexedDB(...args)
        : actual.writeDebugTokenToIndexedDB(...(args as [any])),
    readDebugTokenFromIndexedDB: (...args: unknown[]) =>
      mockReadDebugTokenFromIndexedDB.getMockImplementation()
        ? mockReadDebugTokenFromIndexedDB(...args)
        : actual.readDebugTokenFromIndexedDB()
  };
});

vi.mock('./debug', async importOriginal => {
  const actual = await importOriginal<typeof import('./debug')>();
  return {
    ...actual,
    initializeDebugMode: (...args: unknown[]) => {
      mockInitializeDebugMode(...args);
      return actual.initializeDebugMode(...(args as [any]));
    }
  };
});

vi.mock('./recaptcha', async importOriginal => {
  const actual = await importOriginal<typeof import('./recaptcha')>();
  return {
    ...actual,
    initializeV3: (...args: unknown[]) =>
      mockInitializeRecaptchaV3.getMockImplementation()
        ? mockInitializeRecaptchaV3(...args)
        : actual.initializeV3(...(args as [any, any])),
    initializeEnterprise: (...args: unknown[]) =>
      mockInitializeRecaptchaEnterprise.getMockImplementation()
        ? mockInitializeRecaptchaEnterprise(...args)
        : actual.initializeEnterprise(...(args as [any, any])),
    getToken: (...args: unknown[]) =>
      mockGetReCAPTCHAToken.getMockImplementation()
        ? mockGetReCAPTCHAToken(...args)
        : actual.getToken(...(args as [any]))
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

vi.mock('./internal-api', async importOriginal => {
  const actual = await importOriginal<typeof import('./internal-api')>();
  return {
    ...actual,
    getToken: (...args: unknown[]) =>
      mockInternalGetToken.getMockImplementation()
        ? mockInternalGetToken(...args)
        : actual.getToken(...(args as [any, any?])),
    getLimitedUseToken: (...args: unknown[]) =>
      mockInternalGetLimitedUseToken.getMockImplementation()
        ? mockInternalGetLimitedUseToken(...args)
        : actual.getLimitedUseToken(...(args as [any]))
  };
});

describe('api', () => {
  let app: FirebaseApp;
  let storageReadStub: MockInstance;
  let storageWriteStub: MockInstance;

  function setRecaptchaSuccess(isSuccess: boolean = true): void {
    getStateReference(app).reCAPTCHAState!.succeeded = isSuccess;
  }

  beforeEach(() => {
    app = getFullApp();
    mockReadTokenFromStorage.mockReset();
    mockWriteTokenToStorage.mockReset();
    mockGetRecaptcha.mockReset();
    mockWriteDebugTokenToIndexedDB.mockReset();
    mockReadDebugTokenFromIndexedDB.mockReset();
    mockInitializeDebugMode.mockReset();
    mockInitializeRecaptchaV3.mockReset();
    mockInitializeRecaptchaEnterprise.mockReset();
    mockGetReCAPTCHAToken.mockReset();
    mockExchangeToken.mockReset();
    mockInternalGetToken.mockReset();
    mockInternalGetLimitedUseToken.mockReset();

    storageReadStub = mockReadTokenFromStorage.mockResolvedValue(undefined);
    storageWriteStub = mockWriteTokenToStorage.mockResolvedValue(undefined);
    mockGetRecaptcha.mockReturnValue(getFakeGreCAPTCHA());
  });

  afterEach(async () => {
    vi.useRealTimers();
    clearState();
    removegreCAPTCHAScriptsOnPage();
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
      ).toBe(appCheckInstance);
    });
    it('can be called multiple times (if given equivalent ReCaptchaEnterpriseProviders)', () => {
      const appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY)
      });
      expect(
        initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY)
        })
      ).toBe(appCheckInstance);
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
      ).toBe(appCheckInstance);
    });
    it('starts debug mode on first call', async () => {
      let token: string = '';
      const fakeWrite = (tokenToWrite: string): Promise<void> => {
        token = tokenToWrite;
        return Promise.resolve();
      };
      mockWriteDebugTokenToIndexedDB.mockImplementation(fakeWrite);
      mockReadDebugTokenFromIndexedDB.mockResolvedValue(token);
      const consoleStub = vi.spyOn(console, 'log').mockImplementation(() => {});
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      // Ensure getDebugToken() call inside `initializeAppCheck()`
      // has time to resolve, and double check its value matches that
      // written to indexedDB.
      expect(await getDebugToken()).toBe(token);
      expect(consoleStub.mock.calls[0][0]).toContain(token);
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = undefined;
    });
    it('does not call initializeDebugMode on second call', async () => {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = 'abcdefg';
      const consoleStub = vi.spyOn(console, 'log').mockImplementation(() => {});
      const initializeDebugModeSpy = mockInitializeDebugMode;
      // First call, should call initializeDebugMode()
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(initializeDebugModeSpy).toHaveBeenCalled();
      initializeDebugModeSpy.mockClear();
      // Second call, should not call initializeDebugMode()
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      const token = await getDebugToken();
      expect(token).toBe('abcdefg');
      // Two console logs of the token, for each initializeAppCheck call.
      expect(consoleStub.mock.calls[0][0]).toContain(token);
      expect(consoleStub.mock.calls[1][0]).toContain(token);
      expect(consoleStub.mock.calls[1][0]).toBe(consoleStub.mock.calls[0][0]);
      expect(initializeDebugModeSpy).not.toHaveBeenCalled();
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = undefined;
    });

    it('initialize reCAPTCHA when a ReCaptchaV3Provider is provided', () => {
      const initReCAPTCHAStub = mockInitializeRecaptchaV3.mockResolvedValue(
        {} as any
      );
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(initReCAPTCHAStub).toHaveBeenCalledWith(app, FAKE_SITE_KEY);
    });

    it('initialize reCAPTCHA when a ReCaptchaEnterpriseProvider is provided', () => {
      const initReCAPTCHAStub =
        mockInitializeRecaptchaEnterprise.mockResolvedValue({} as any);
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY)
      });
      expect(initReCAPTCHAStub).toHaveBeenCalledWith(app, FAKE_SITE_KEY);
    });

    it('sets activated to true', () => {
      expect(getStateReference(app).activated).toBe(false);
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(getStateReference(app).activated).toBe(true);
    });

    it('global false + local unset = false', () => {
      app.automaticDataCollectionEnabled = false;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).toBe(false);
    });

    it('global false + local true = false', () => {
      app.automaticDataCollectionEnabled = false;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).toBe(false);
    });

    it('global false + local false = false', () => {
      app.automaticDataCollectionEnabled = false;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: false
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).toBe(false);
    });

    it('global unset + local unset = false', () => {
      // Global unset should default to true.
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).toBe(false);
    });

    it('global unset + local false = false', () => {
      // Global unset should default to true.
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: false
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).toBe(false);
    });

    it('global unset + local true = true', () => {
      // Global unset should default to true.
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).toBe(true);
    });

    it('global true + local unset = false', () => {
      app.automaticDataCollectionEnabled = true;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).toBe(false);
    });

    it('global true + local false = false', () => {
      app.automaticDataCollectionEnabled = true;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: false
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).toBe(false);
    });

    it('global true + local true = true', () => {
      app.automaticDataCollectionEnabled = true;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).toBe(true);
    });

    it('sets isTokenAutoRefreshEnabled correctly, overriding global setting', () => {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      expect(getStateReference(app).isTokenAutoRefreshEnabled).toBe(true);
    });
  });
  describe('setTokenAutoRefreshEnabled()', () => {
    it('sets isTokenAutoRefreshEnabled correctly', () => {
      const app = getFakeApp({ automaticDataCollectionEnabled: false });
      const appCheck = getFakeAppCheck(app);
      setInitialState(app, { ...DEFAULT_STATE });
      setTokenAutoRefreshEnabled(appCheck, true);
      expect(getStateReference(app).isTokenAutoRefreshEnabled).toBe(true);
    });
  });
  describe('getToken()', () => {
    it('getToken() calls the internal getToken() function', async () => {
      const app = getFakeApp({ automaticDataCollectionEnabled: true });
      const appCheck = getFakeAppCheck(app);
      const internalGetToken = mockInternalGetToken.mockResolvedValue({
        token: 'a-token-string'
      });
      await getToken(appCheck, true);
      expect(internalGetToken).toHaveBeenCalledWith(appCheck, true);
    });
    it('getToken() throws errors returned with token', async () => {
      const app = getFakeApp({ automaticDataCollectionEnabled: true });
      const appCheck = getFakeAppCheck(app);
      // If getToken() errors, it returns a dummy token with an error field
      // instead of throwing.
      mockInternalGetToken.mockResolvedValue({
        token: 'a-dummy-token',
        error: Error('there was an error')
      });
      await expect(getToken(appCheck, true)).rejects.toThrow(
        'there was an error'
      );
    });
  });
  describe('getLimitedUseToken()', () => {
    it('getLimitedUseToken() calls the internal getLimitedUseToken() function', async () => {
      const app = getFakeApp({ automaticDataCollectionEnabled: true });
      const appCheck = getFakeAppCheck(app);
      const internalgetLimitedUseToken =
        mockInternalGetLimitedUseToken.mockResolvedValue({
          token: 'a-token-string'
        });
      expect(await getLimitedUseToken(appCheck)).toEqual({
        token: 'a-token-string'
      });
      expect(internalgetLimitedUseToken).toHaveBeenCalledWith(appCheck);
    });
  });
  describe('onTokenChanged()', () => {
    it('Listeners work when using top-level parameters pattern', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });

      setRecaptchaSuccess(true);

      expect(getStateReference(app).tokenObservers.length).toBe(1);

      const fakeRecaptchaToken = 'fake-recaptcha-token';
      const fakeRecaptchaAppCheckToken = {
        token: 'fake-recaptcha-app-check-token',
        expireTimeMillis: 123,
        issuedAtTimeMillis: 0
      };
      mockGetReCAPTCHAToken.mockResolvedValue(fakeRecaptchaToken);
      mockExchangeToken.mockResolvedValue(fakeRecaptchaAppCheckToken);

      const listener1 = vi.fn().mockImplementation(() => {
        throw new Error();
      });
      const listener2 = vi.fn();

      const errorFn1 = vi.fn();
      const errorFn2 = vi.fn();

      const unsubscribe1 = onTokenChanged(appCheck, listener1, errorFn1);
      const unsubscribe2 = onTokenChanged(appCheck, listener2, errorFn2);

      expect(getStateReference(app).tokenObservers.length).toBe(3);

      await internalApi.getToken(appCheck as AppCheckService);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith({
        token: fakeRecaptchaAppCheckToken.token
      });
      // onError should not be called on listener errors.
      expect(errorFn1).not.toHaveBeenCalled();
      expect(errorFn2).not.toHaveBeenCalled();
      unsubscribe1();
      unsubscribe2();
      expect(getStateReference(app).tokenObservers.length).toBe(1);
    });

    it('Listeners work when using Observer pattern', async () => {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });

      setRecaptchaSuccess(true);

      expect(getStateReference(app).tokenObservers.length).toBe(1);

      const fakeRecaptchaToken = 'fake-recaptcha-token';
      const fakeRecaptchaAppCheckToken = {
        token: 'fake-recaptcha-app-check-token',
        expireTimeMillis: 123,
        issuedAtTimeMillis: 0
      };
      mockGetReCAPTCHAToken.mockResolvedValue(fakeRecaptchaToken);
      mockExchangeToken.mockResolvedValue(fakeRecaptchaAppCheckToken);
      storageWriteStub.mockResolvedValue(undefined);

      const listener1 = vi.fn().mockImplementation(() => {
        throw new Error();
      });
      const listener2 = vi.fn();

      const errorFn1 = vi.fn();
      const errorFn2 = vi.fn();

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

      expect(getStateReference(app).tokenObservers.length).toBe(3);

      await internalApi.getToken(appCheck as AppCheckService);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith({
        token: fakeRecaptchaAppCheckToken.token
      });
      // onError should not be called on listener errors.
      expect(errorFn1).not.toHaveBeenCalled();
      expect(errorFn2).not.toHaveBeenCalled();
      unsubscribe1();
      unsubscribe2();
      expect(getStateReference(app).tokenObservers.length).toBe(1);
    });

    it('onError() catches token errors', async () => {
      vi.spyOn(logger.logger, 'error').mockImplementation(() => {});
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY),
        isTokenAutoRefreshEnabled: false
      });

      setRecaptchaSuccess(true);

      expect(getStateReference(app).tokenObservers.length).toBe(0);

      const fakeRecaptchaToken = 'fake-recaptcha-token';
      mockGetReCAPTCHAToken.mockResolvedValue(fakeRecaptchaToken);
      const err = new Error('exchange error');
      err.name = 'exchange error';
      mockExchangeToken.mockRejectedValue(err);
      storageWriteStub.mockResolvedValue(undefined);

      const listener1 = vi.fn();

      const errorFn1 = vi.fn();

      const unsubscribe1 = onTokenChanged(appCheck, listener1, errorFn1);

      await internalApi.getToken(appCheck as AppCheckService);

      expect(getStateReference(app).tokenObservers.length).toBe(1);

      expect(errorFn1).toHaveBeenCalledTimes(1);
      expect(errorFn1.mock.calls[0][0].name).toContain('exchange error');

      unsubscribe1();
      expect(getStateReference(app).tokenObservers.length).toBe(0);
    });
  });
});
