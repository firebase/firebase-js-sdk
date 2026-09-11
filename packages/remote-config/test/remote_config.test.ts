/**
 * @license
 * Copyright 2019 Google LLC
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

import { FirebaseApp } from '@firebase/app';
import {
  FetchResponse,
  RemoteConfig as RemoteConfigType,
  LogLevel as RemoteConfigLogLevel
} from '../src/public_types';
import { expect, vi, MockInstance } from 'vitest';
import { StorageCache } from '../src/storage/storage_cache';
import { Storage } from '../src/storage/storage';
import { RemoteConfig } from '../src/remote_config';
import { RemoteConfigFetchClient } from '../src/client/remote_config_fetch_client';
import { Value } from '../src/value';
import './setup';
import { ERROR_FACTORY, ErrorCode } from '../src/errors';
import { Logger, LogLevel as FirebaseLogLevel } from '@firebase/logger';
import {
  activate,
  ensureInitialized,
  getAll,
  getBoolean,
  getNumber,
  getString,
  getValue,
  setLogLevel,
  fetchConfig,
  setCustomSignals
} from '../src/api';
import * as api from '../src/api';
import { fetchAndActivate } from '../src';
import { Experiment } from '../src/abt/experiment';
import { Provider } from '@firebase/component';
import { FirebaseAnalyticsInternalName } from '@firebase/analytics-interop-types';
import { RealtimeHandler } from '../src/client/realtime_handler';

const { mockFetchConfig, mockActivate, realState } = vi.hoisted(() => ({
  mockFetchConfig: vi.fn(),
  mockActivate: vi.fn(),
  realState: { realFetchConfig: null as any, realActivate: null as any }
}));

vi.mock('../src/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/api')>();
  realState.realFetchConfig = actual.fetchConfig;
  realState.realActivate = actual.activate;
  mockFetchConfig.mockImplementation((...args: unknown[]) =>
    actual.fetchConfig(...(args as [any]))
  );
  mockActivate.mockImplementation((...args: unknown[]) =>
    actual.activate(...(args as [any]))
  );
  return {
    ...actual,
    fetchConfig: (...args: unknown[]) => mockFetchConfig(...args),
    activate: (...args: unknown[]) => mockActivate(...args)
  };
});

describe('RemoteConfig', () => {
  const ACTIVE_CONFIG = {
    key1: 'active_config_value_1',
    key2: 'active_config_value_2',
    key3: 'true',
    key4: '123'
  };
  const DEFAULT_CONFIG = {
    key1: 'default_config_value_1',
    key2: 'default_config_value_2',
    key3: 'false',
    key4: '345',
    test: 'test'
  };

  let app: FirebaseApp;
  let client: RemoteConfigFetchClient;
  let storageCache: StorageCache;
  let storage: Storage;
  let logger: Logger;
  let realtimeHandler: RealtimeHandler;
  let rc: RemoteConfigType;
  let analyticsProvider: Provider<FirebaseAnalyticsInternalName>;

  let getActiveConfigStub: MockInstance;
  let loggerDebugSpy: MockInstance;
  let loggerLogLevelSpy: MockInstance;

  beforeEach(() => {
    // Clears stubbed behavior between each test.
    app = {} as FirebaseApp;
    client = {} as RemoteConfigFetchClient;
    storageCache = {} as StorageCache;
    storage = {} as Storage;
    analyticsProvider = {} as Provider<FirebaseAnalyticsInternalName>;
    realtimeHandler = {} as RealtimeHandler;
    logger = new Logger('package-name');
    getActiveConfigStub = vi.fn().mockReturnValue(undefined);
    storageCache.getActiveConfig = getActiveConfigStub;
    loggerDebugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
    loggerLogLevelSpy = vi.spyOn(logger, 'logLevel', 'set');
    rc = new RemoteConfig(
      app,
      client,
      storageCache,
      storage,
      logger,
      realtimeHandler,
      analyticsProvider
    );
  });

  afterEach(() => {
    loggerDebugSpy.mockRestore();
    loggerLogLevelSpy.mockRestore();
  });

  describe('setCustomSignals', () => {
    beforeEach(() => {
      storageCache.setCustomSignals = vi.fn();
      storage.setCustomSignals = vi.fn();
      logger.error = vi.fn();
    });

    it('call storage API to store signals', async () => {
      await setCustomSignals(rc, { key: 'value' });

      expect(storageCache.setCustomSignals).toHaveBeenCalledWith({
        key: 'value'
      });
    });

    it('logs an error when supplied with a custom signal key greater than 250 characters', async () => {
      const longKey = 'a'.repeat(251);
      const customSignals = { [longKey]: 'value' };

      await setCustomSignals(rc, customSignals);

      expect(storageCache.setCustomSignals).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    it('logs an error when supplied with a custom signal value greater than 500 characters', async () => {
      const longValue = 'a'.repeat(501);
      const customSignals = { 'key': longValue };

      await setCustomSignals(rc, customSignals);

      expect(storageCache.setCustomSignals).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    it('empty custom signals map does nothing', async () => {
      await setCustomSignals(rc, {});

      expect(storageCache.setCustomSignals).not.toHaveBeenCalled();
    });
  });

  // Adapts getUserLanguage tests from packages/auth/test/utils_test.js for TypeScript.
  describe('setLogLevel', () => {
    it('proxies to the FirebaseLogger instance', () => {
      setLogLevel(rc, 'debug');

      expect(loggerLogLevelSpy).toHaveBeenCalledWith(FirebaseLogLevel.DEBUG);
    });

    it('normalizes levels other than DEBUG and SILENT to ERROR', () => {
      for (const logLevel of ['info', 'verbose', 'error', 'severe']) {
        setLogLevel(rc, logLevel as RemoteConfigLogLevel);

        expect(loggerLogLevelSpy).toHaveBeenCalledWith(FirebaseLogLevel.ERROR);
      }
    });
  });

  describe('ensureInitialized', () => {
    it('warms cache', async () => {
      storageCache.loadFromStorage = vi.fn().mockResolvedValue(undefined);

      await ensureInitialized(rc);

      expect(storageCache.loadFromStorage).toHaveBeenCalledTimes(1);
    });

    it('de-duplicates repeated calls', async () => {
      storageCache.loadFromStorage = vi.fn().mockResolvedValue(undefined);

      await ensureInitialized(rc);
      await ensureInitialized(rc);

      expect(storageCache.loadFromStorage).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchTimeMillis', () => {
    it('normalizes undefined values', async () => {
      storageCache.getLastSuccessfulFetchTimestampMillis = vi
        .fn()
        .mockReturnValue(undefined);

      expect(rc.fetchTimeMillis).toBe(-1);
    });

    it('reads from cache', async () => {
      const lastFetchTimeMillis = 123;

      storageCache.getLastSuccessfulFetchTimestampMillis = vi
        .fn()
        .mockReturnValue(lastFetchTimeMillis);

      expect(rc.fetchTimeMillis).toBe(lastFetchTimeMillis);
    });
  });

  describe('lastFetchStatus', () => {
    it('normalizes undefined values', async () => {
      storageCache.getLastFetchStatus = vi.fn().mockReturnValue(undefined);

      expect(rc.lastFetchStatus).toBe('no-fetch-yet');
    });

    it('reads from cache', async () => {
      const lastFetchStatus = 'success';

      storageCache.getLastFetchStatus = vi
        .fn()
        .mockReturnValue(lastFetchStatus);

      expect(rc.lastFetchStatus).toBe(lastFetchStatus);
    });
  });

  describe('getValue', () => {
    it('returns the active value if available', () => {
      getActiveConfigStub.mockReturnValue(ACTIVE_CONFIG);
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(getValue(rc, 'key1')).toEqual(
        new Value('remote', ACTIVE_CONFIG.key1)
      );
    });

    it('returns the default value if active is not available', () => {
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(getValue(rc, 'key1')).toEqual(
        new Value('default', DEFAULT_CONFIG.key1)
      );
    });

    it('returns the stringified default boolean values if active is not available', () => {
      const DEFAULTS = { trueVal: true, falseVal: false };
      rc.defaultConfig = DEFAULTS;

      expect(getValue(rc, 'trueVal')).toEqual(
        new Value('default', String(DEFAULTS.trueVal))
      );
      expect(getValue(rc, 'falseVal')).toEqual(
        new Value('default', String(DEFAULTS.falseVal))
      );
    });

    it('returns the stringified default numeric values if active is not available', () => {
      const DEFAULTS = { negative: -1, zero: 0, positive: 11 };
      rc.defaultConfig = DEFAULTS;

      expect(getValue(rc, 'negative')).toEqual(
        new Value('default', String(DEFAULTS.negative))
      );
      expect(getValue(rc, 'zero')).toEqual(
        new Value('default', String(DEFAULTS.zero))
      );
      expect(getValue(rc, 'positive')).toEqual(
        new Value('default', String(DEFAULTS.positive))
      );
    });

    it('returns the static value if active and default are not available', () => {
      expect(getValue(rc, 'key1')).toEqual(new Value('static'));

      // Asserts debug message logged if static value is returned, per EAP feedback.
      expect(logger.debug).toHaveBeenCalled();
    });

    it('logs if initialization is incomplete', async () => {
      // Defines default value to isolate initialization logging from static value logging.
      rc.defaultConfig = { key1: 'val' };

      // Gets value before initialization.
      getValue(rc, 'key1');

      // Asserts getValue logs.
      expect(logger.debug).toHaveBeenCalled();

      // Enables initialization to complete.
      storageCache.loadFromStorage = vi.fn().mockResolvedValue(undefined);

      // Ensures initialization completes.
      await ensureInitialized(rc);

      // Gets value after initialization.
      getValue(rc, 'key1');

      // Asserts getValue doesn't log after initialization is complete.
      expect(logger.debug).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBoolean', () => {
    it('returns the active value if available', () => {
      getActiveConfigStub.mockReturnValue(ACTIVE_CONFIG);
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(getBoolean(rc, 'key3')).toBe(true);
    });

    it('returns the default value if active is not available', () => {
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(getBoolean(rc, 'key3')).toBe(false);
    });

    it('returns the static value if active and default are not available', () => {
      expect(getBoolean(rc, 'key3')).toBe(false);
    });
  });

  describe('getString', () => {
    it('returns the active value if available', () => {
      getActiveConfigStub.mockReturnValue(ACTIVE_CONFIG);
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(getString(rc, 'key1')).toBe(ACTIVE_CONFIG.key1);
    });

    it('returns the default value if active is not available', () => {
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(getString(rc, 'key2')).toBe(DEFAULT_CONFIG.key2);
    });

    it('returns the static value if active and default are not available', () => {
      expect(getString(rc, 'key1')).toBe('');
    });
  });

  describe('getNumber', () => {
    it('returns the active value if available', () => {
      getActiveConfigStub.mockReturnValue(ACTIVE_CONFIG);
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(getNumber(rc, 'key4')).toBe(Number(ACTIVE_CONFIG.key4));
    });

    it('returns the default value if active is not available', () => {
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(getNumber(rc, 'key4')).toBe(Number(DEFAULT_CONFIG.key4));
    });

    it('returns the static value if active and default are not available', () => {
      expect(getNumber(rc, 'key1')).toBe(0);
    });
  });

  describe('getAll', () => {
    it('returns values for all keys included in active and default configs', () => {
      getActiveConfigStub.mockReturnValue(ACTIVE_CONFIG);
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(getAll(rc)).toEqual({
        key1: new Value('remote', ACTIVE_CONFIG.key1),
        key2: new Value('remote', ACTIVE_CONFIG.key2),
        key3: new Value('remote', ACTIVE_CONFIG.key3),
        key4: new Value('remote', ACTIVE_CONFIG.key4),
        test: new Value('default', DEFAULT_CONFIG.test)
      });
    });

    it('returns values in default if active is not available', () => {
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(getAll(rc)).toEqual({
        key1: new Value('default', DEFAULT_CONFIG.key1),
        key2: new Value('default', DEFAULT_CONFIG.key2),
        key3: new Value('default', DEFAULT_CONFIG.key3),
        key4: new Value('default', DEFAULT_CONFIG.key4),
        test: new Value('default', DEFAULT_CONFIG.test)
      });
    });

    it('returns empty object if both active and default configs are not defined', () => {
      expect(getAll(rc)).toEqual({});
    });
  });

  describe('activate', () => {
    const ETAG = 'etag';
    const CONFIG = { key: 'val' };
    const NEW_ETAG = 'new_etag';
    const TEMPLATE_VERSION = 1;
    const EXPERIMENTS = [
      {
        'experimentId': '_exp_1',
        'variantId': '1',
        'experimentStartTime': '2025-04-06T14:13:57.597Z',
        'triggerTimeoutMillis': '15552000000',
        'timeToLiveMillis': '15552000000'
      }
    ];

    let updateActiveExperimentsStub: MockInstance;
    let getLastSuccessfulFetchResponseStub: MockInstance;
    let getActiveConfigEtagStub: MockInstance;
    let getActiveConfigTemplateVersionStub: MockInstance;
    let setActiveConfigEtagStub: MockInstance;
    let setActiveConfigStub: MockInstance;
    let setActiveConfigTemplateVersionStub: MockInstance;

    beforeEach(() => {
      updateActiveExperimentsStub = vi
        .spyOn(Experiment.prototype, 'updateActiveExperiments')
        .mockResolvedValue(undefined);
      getLastSuccessfulFetchResponseStub = vi.fn();
      getActiveConfigEtagStub = vi.fn();
      getActiveConfigTemplateVersionStub = vi.fn();
      setActiveConfigEtagStub = vi.fn();
      setActiveConfigStub = vi.fn();
      setActiveConfigTemplateVersionStub = vi.fn();

      storage.getLastSuccessfulFetchResponse =
        getLastSuccessfulFetchResponseStub;
      storage.getActiveConfigEtag = getActiveConfigEtagStub;
      storage.getActiveConfigTemplateVersion =
        getActiveConfigTemplateVersionStub;
      storage.setActiveConfigEtag = setActiveConfigEtagStub;
      storageCache.setActiveConfig = setActiveConfigStub;
      storage.setActiveConfigTemplateVersion =
        setActiveConfigTemplateVersionStub;
    });

    afterEach(() => {
      updateActiveExperimentsStub.mockRestore();
    });

    it('does not activate if last successful fetch response is undefined', async () => {
      getLastSuccessfulFetchResponseStub.mockResolvedValue(undefined);
      getActiveConfigEtagStub.mockResolvedValue(ETAG);
      getActiveConfigTemplateVersionStub.mockResolvedValue(TEMPLATE_VERSION);

      const activateResponse = await activate(rc);

      expect(activateResponse).toBe(false);
      expect(storage.setActiveConfigEtag).not.toHaveBeenCalled();
      expect(storageCache.setActiveConfig).not.toHaveBeenCalled();
      expect(storage.setActiveConfigTemplateVersion).not.toHaveBeenCalled();
      expect(updateActiveExperimentsStub).not.toHaveBeenCalled();
    });

    it('does not activate if fetched and active etags are the same', async () => {
      getLastSuccessfulFetchResponseStub.mockResolvedValue({
        config: {},
        eTag: ETAG,
        templateVersion: TEMPLATE_VERSION
      });
      getActiveConfigEtagStub.mockResolvedValue(ETAG);

      const activateResponse = await activate(rc);

      expect(activateResponse).toBe(false);
      expect(storage.setActiveConfigEtag).not.toHaveBeenCalled();
      expect(storageCache.setActiveConfig).not.toHaveBeenCalled();
      expect(storage.setActiveConfigTemplateVersion).not.toHaveBeenCalled();
      expect(updateActiveExperimentsStub).not.toHaveBeenCalled();
    });

    it('activates if fetched and active etags are different', async () => {
      getLastSuccessfulFetchResponseStub.mockResolvedValue({
        config: CONFIG,
        eTag: NEW_ETAG,
        templateVersion: TEMPLATE_VERSION,
        experiments: EXPERIMENTS
      });
      getActiveConfigEtagStub.mockResolvedValue(ETAG);

      const activateResponse = await activate(rc);

      expect(activateResponse).toBe(true);
      expect(storage.setActiveConfigEtag).toHaveBeenCalledWith(NEW_ETAG);
      expect(storageCache.setActiveConfig).toHaveBeenCalledWith(CONFIG);
      expect(storage.setActiveConfigTemplateVersion).toHaveBeenCalledWith(
        TEMPLATE_VERSION
      );
    });

    it('activates if fetched is defined but active config is not', async () => {
      getLastSuccessfulFetchResponseStub.mockResolvedValue({
        config: CONFIG,
        eTag: NEW_ETAG,
        templateVersion: TEMPLATE_VERSION,
        experiments: EXPERIMENTS
      });
      getActiveConfigEtagStub.mockResolvedValue(undefined);

      const activateResponse = await activate(rc);

      expect(activateResponse).toBe(true);
      expect(storage.setActiveConfigEtag).toHaveBeenCalledWith(NEW_ETAG);
      expect(storageCache.setActiveConfig).toHaveBeenCalledWith(CONFIG);
      expect(storage.setActiveConfigTemplateVersion).toHaveBeenCalledWith(
        TEMPLATE_VERSION
      );
      expect(updateActiveExperimentsStub).toHaveBeenCalledWith(EXPERIMENTS);
    });
  });

  describe('fetchAndActivate', () => {
    beforeEach(() => {
      mockFetchConfig.mockResolvedValue(undefined as any);
    });

    afterEach(() => {
      mockFetchConfig.mockImplementation((...args: unknown[]) =>
        realState.realFetchConfig(...(args as [any]))
      );
      mockActivate.mockImplementation((...args: unknown[]) =>
        realState.realActivate(...(args as [any]))
      );
    });

    it('calls fetch and activate and returns activation boolean if true', async () => {
      mockActivate.mockResolvedValue(true);

      const response = await fetchAndActivate(rc);

      expect(response).toBe(true);
      expect(mockFetchConfig).toHaveBeenCalledWith(rc);
      expect(mockActivate).toHaveBeenCalledWith(rc);
    });

    it('calls fetch and activate and returns activation boolean if false', async () => {
      mockActivate.mockResolvedValue(false);

      const response = await fetchAndActivate(rc);

      expect(response).toBe(false);
      expect(mockFetchConfig).toHaveBeenCalledWith(rc);
      expect(mockActivate).toHaveBeenCalledWith(rc);
    });
  });

  describe('fetch', () => {
    let timeoutStub: MockInstance;
    beforeEach(() => {
      client.fetch = vi
        .fn()
        .mockResolvedValue({ status: 200 } as FetchResponse);
      storageCache.setLastFetchStatus = vi.fn();
      storageCache.getCustomSignals = vi.fn();
      timeoutStub = vi.spyOn(window, 'setTimeout');
    });

    afterEach(() => {
      timeoutStub.mockRestore();
    });

    it('defines a default timeout', async () => {
      await fetchConfig(rc);

      expect(timeoutStub).toHaveBeenCalledWith(expect.anything(), 60000);
    });

    it('honors a custom timeout', async () => {
      rc.settings.fetchTimeoutMillis = 1000;

      await fetchConfig(rc);

      expect(timeoutStub).toHaveBeenCalledWith(expect.anything(), 1000);
    });

    it('sets success status', async () => {
      for (const status of [200, 304]) {
        client.fetch = vi.fn().mockResolvedValue({ status } as FetchResponse);

        await fetchConfig(rc);

        expect(storageCache.setLastFetchStatus).toHaveBeenCalledWith('success');
      }
    });

    it('sets throttle status', async () => {
      storage.getThrottleMetadata = vi.fn().mockResolvedValue({});

      const error = ERROR_FACTORY.create(ErrorCode.FETCH_THROTTLE, {
        throttleEndTimeMillis: 123
      });

      client.fetch = vi.fn().mockRejectedValue(error);

      const fetchPromise = fetchConfig(rc);

      await expect(fetchPromise).rejects.toThrow(error);
      expect(storageCache.setLastFetchStatus).toHaveBeenCalledWith('throttle');
    });

    it('defaults to failure status', async () => {
      storage.getThrottleMetadata = vi.fn().mockResolvedValue(undefined);

      const error = ERROR_FACTORY.create(ErrorCode.FETCH_STATUS, {
        httpStatus: 400
      });

      client.fetch = vi.fn().mockRejectedValue(error);

      const fetchPromise = fetchConfig(rc);

      await expect(fetchPromise).rejects.toThrow(error);
      expect(storageCache.setLastFetchStatus).toHaveBeenCalledWith('failure');
    });

    it('sends custom signals', async () => {
      await fetchConfig(rc);

      expect(storageCache.getCustomSignals).toHaveBeenCalled();
    });
  });
});
