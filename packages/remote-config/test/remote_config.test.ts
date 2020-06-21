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

import { FirebaseApp } from '@firebase/app-types';
import {
  RemoteConfig as RemoteConfigType,
  LogLevel as RemoteConfigLogLevel
} from '@firebase/remote-config-types';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { StorageCache } from '../src/storage/storage_cache';
import { Storage } from '../src/storage/storage';
import { RemoteConfig } from '../src/remote_config';
import {
  RemoteConfigFetchClient,
  FetchResponse
} from '../src/client/remote_config_fetch_client';
import { Value } from '../src/value';
import './setup';
import { ERROR_FACTORY, ErrorCode } from '../src/errors';
import { Logger, LogLevel as FirebaseLogLevel } from '@firebase/logger';

describe('RemoteConfig', () => {
  const ACTIVE_CONFIG = {
    key1: 'active_config_value_1',
    key2: 'active_config_value_2',
    key3: 'true',
    key4: '123',
    key5: '{"key": "value"}'
  };
  const DEFAULT_CONFIG = {
    key1: 'default_config_value_1',
    key2: 'default_config_value_2',
    key3: 'false',
    key4: '345',
    key5: '{"key": "value"}',
    test: 'test'
  };

  let app: FirebaseApp;
  let client: RemoteConfigFetchClient;
  let storageCache: StorageCache;
  let storage: Storage;
  let logger: Logger;
  let rc: RemoteConfigType;

  let getActiveConfigStub: sinon.SinonStub;
  let loggerDebugSpy: sinon.SinonSpy;
  let loggerLogLevelSpy: sinon.SinonSpy;

  beforeEach(() => {
    // Clears stubbed behavior between each test.
    app = {} as FirebaseApp;
    client = {} as RemoteConfigFetchClient;
    storageCache = {} as StorageCache;
    storage = {} as Storage;
    logger = new Logger('package-name');
    getActiveConfigStub = sinon.stub().returns(undefined);
    storageCache.getActiveConfig = getActiveConfigStub;
    loggerDebugSpy = sinon.spy(logger, 'debug');
    loggerLogLevelSpy = sinon.spy(logger, 'logLevel', ['set']);
    rc = new RemoteConfig(app, client, storageCache, storage, logger);
  });

  afterEach(() => {
    loggerDebugSpy.restore();
    loggerLogLevelSpy.restore();
  });

  // Adapts getUserLanguage tests from packages/auth/test/utils_test.js for TypeScript.
  describe('setLogLevel', () => {
    it('proxies to the FirebaseLogger instance', () => {
      rc.setLogLevel('debug');

      // Casts spy to any because property setters aren't defined on the SinonSpy type.
      expect((loggerLogLevelSpy as any).set).to.have.been.calledWith(
        FirebaseLogLevel.DEBUG
      );
    });

    it('normalizes levels other than DEBUG and SILENT to ERROR', () => {
      for (const logLevel of ['info', 'verbose', 'error', 'severe']) {
        rc.setLogLevel(logLevel as RemoteConfigLogLevel);

        // Casts spy to any because property setters aren't defined on the SinonSpy type.
        expect((loggerLogLevelSpy as any).set).to.have.been.calledWith(
          FirebaseLogLevel.ERROR
        );
      }
    });
  });

  describe('ensureInitialized', () => {
    it('warms cache', async () => {
      storageCache.loadFromStorage = sinon.stub().returns(Promise.resolve());

      await rc.ensureInitialized();

      expect(storageCache.loadFromStorage).to.have.been.calledOnce;
    });

    it('de-duplicates repeated calls', async () => {
      storageCache.loadFromStorage = sinon.stub().returns(Promise.resolve());

      await rc.ensureInitialized();
      await rc.ensureInitialized();

      expect(storageCache.loadFromStorage).to.have.been.calledOnce;
    });
  });

  describe('fetchTimeMillis', () => {
    it('normalizes undefined values', async () => {
      storageCache.getLastSuccessfulFetchTimestampMillis = sinon
        .stub()
        .returns(undefined);

      expect(rc.fetchTimeMillis).to.eq(-1);
    });

    it('reads from cache', async () => {
      const lastFetchTimeMillis = 123;

      storageCache.getLastSuccessfulFetchTimestampMillis = sinon
        .stub()
        .returns(lastFetchTimeMillis);

      expect(rc.fetchTimeMillis).to.eq(lastFetchTimeMillis);
    });
  });

  describe('lastFetchStatus', () => {
    it('normalizes undefined values', async () => {
      storageCache.getLastFetchStatus = sinon.stub().returns(undefined);

      expect(rc.lastFetchStatus).to.eq('no-fetch-yet');
    });

    it('reads from cache', async () => {
      const lastFetchStatus = 'success';

      storageCache.getLastFetchStatus = sinon.stub().returns(lastFetchStatus);

      expect(rc.lastFetchStatus).to.eq(lastFetchStatus);
    });
  });

  describe('getValue', () => {
    it('returns the active value if available', () => {
      getActiveConfigStub.returns(ACTIVE_CONFIG);
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(rc.getValue('key1')).to.deep.eq(
        new Value('remote', ACTIVE_CONFIG.key1)
      );
    });

    it('returns the default value if active is not available', () => {
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(rc.getValue('key1')).to.deep.eq(
        new Value('default', DEFAULT_CONFIG.key1)
      );
    });

    it('returns the stringified default boolean values if active is not available', () => {
      const DEFAULTS = { trueVal: true, falseVal: false };
      rc.defaultConfig = DEFAULTS;

      expect(rc.getValue('trueVal')).to.deep.eq(
        new Value('default', String(DEFAULTS.trueVal))
      );
      expect(rc.getValue('falseVal')).to.deep.eq(
        new Value('default', String(DEFAULTS.falseVal))
      );
    });

    it('returns the stringified default numeric values if active is not available', () => {
      const DEFAULTS = { negative: -1, zero: 0, positive: 11 };
      rc.defaultConfig = DEFAULTS;

      expect(rc.getValue('negative')).to.deep.eq(
        new Value('default', String(DEFAULTS.negative))
      );
      expect(rc.getValue('zero')).to.deep.eq(
        new Value('default', String(DEFAULTS.zero))
      );
      expect(rc.getValue('positive')).to.deep.eq(
        new Value('default', String(DEFAULTS.positive))
      );
    });

    it('returns the static value if active and default are not available', () => {
      expect(rc.getValue('key1')).to.deep.eq(new Value('static'));

      // Asserts debug message logged if static value is returned, per EAP feedback.
      expect(logger.debug).to.have.been.called;
    });

    it('logs if initialization is incomplete', async () => {
      // Defines default value to isolate initialization logging from static value logging.
      rc.defaultConfig = { key1: 'val' };

      // Gets value before initialization.
      rc.getValue('key1');

      // Asserts getValue logs.
      expect(logger.debug).to.have.been.called;

      // Enables initialization to complete.
      storageCache.loadFromStorage = sinon.stub().returns(Promise.resolve());

      // Ensures initialization completes.
      await rc.ensureInitialized();

      // Gets value after initialization.
      rc.getValue('key1');

      // Asserts getValue doesn't log after initialization is complete.
      expect(logger.debug).to.have.been.calledOnce;
    });
  });

  describe('getBoolean', () => {
    it('returns the active value if available', () => {
      getActiveConfigStub.returns(ACTIVE_CONFIG);
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(rc.getBoolean('key3')).to.be.true;
    });

    it('returns the default value if active is not available', () => {
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(rc.getBoolean('key3')).to.be.false;
    });

    it('returns the static value if active and default are not available', () => {
      expect(rc.getBoolean('key3')).to.be.false;
    });
  });

  describe('getJSON', () => {
    it('returns the active value if available', () => {
      getActiveConfigStub.returns(ACTIVE_CONFIG);
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(rc.getJSON('key5')).to.eql(JSON.parse(ACTIVE_CONFIG.key5));
    });

    it('returns the default value if active is not available', () => {
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(rc.getJSON('key5')).to.eql(JSON.parse(DEFAULT_CONFIG.key5));
    });

    it('returns the static value if active and default are not available', () => {
      expect(rc.getJSON('key1')).to.eq(null);
    });
  });

  describe('getString', () => {
    it('returns the active value if available', () => {
      getActiveConfigStub.returns(ACTIVE_CONFIG);
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(rc.getString('key1')).to.eq(ACTIVE_CONFIG.key1);
    });

    it('returns the default value if active is not available', () => {
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(rc.getString('key2')).to.eq(DEFAULT_CONFIG.key2);
    });

    it('returns the static value if active and default are not available', () => {
      expect(rc.getString('key1')).to.eq('');
    });
  });

  describe('getNumber', () => {
    it('returns the active value if available', () => {
      getActiveConfigStub.returns(ACTIVE_CONFIG);
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(rc.getNumber('key4')).to.eq(Number(ACTIVE_CONFIG.key4));
    });

    it('returns the default value if active is not available', () => {
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(rc.getNumber('key4')).to.eq(Number(DEFAULT_CONFIG.key4));
    });

    it('returns the static value if active and default are not available', () => {
      expect(rc.getNumber('key1')).to.eq(0);
    });
  });

  describe('getAll', () => {
    it('returns values for all keys included in active and default configs', () => {
      getActiveConfigStub.returns(ACTIVE_CONFIG);
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(rc.getAll()).to.deep.eq({
        key1: new Value('remote', ACTIVE_CONFIG.key1),
        key2: new Value('remote', ACTIVE_CONFIG.key2),
        key3: new Value('remote', ACTIVE_CONFIG.key3),
        key4: new Value('remote', ACTIVE_CONFIG.key4),
        key5: new Value('remote', ACTIVE_CONFIG.key5),
        test: new Value('default', DEFAULT_CONFIG.test)
      });
    });

    it('returns values in default if active is not available', () => {
      rc.defaultConfig = DEFAULT_CONFIG;

      expect(rc.getAll()).to.deep.eq({
        key1: new Value('default', DEFAULT_CONFIG.key1),
        key2: new Value('default', DEFAULT_CONFIG.key2),
        key3: new Value('default', DEFAULT_CONFIG.key3),
        key4: new Value('default', DEFAULT_CONFIG.key4),
        key5: new Value('default', DEFAULT_CONFIG.key5),
        test: new Value('default', DEFAULT_CONFIG.test)
      });
    });

    it('returns empty object if both active and default configs are not defined', () => {
      expect(rc.getAll()).to.deep.eq({});
    });
  });

  describe('activate', () => {
    const ETAG = 'etag';
    const CONFIG = { key: 'val' };
    const NEW_ETAG = 'new_etag';

    let getLastSuccessfulFetchResponseStub: sinon.SinonStub;
    let getActiveConfigEtagStub: sinon.SinonStub;
    let setActiveConfigEtagStub: sinon.SinonStub;
    let setActiveConfigStub: sinon.SinonStub;

    beforeEach(() => {
      getLastSuccessfulFetchResponseStub = sinon.stub();
      getActiveConfigEtagStub = sinon.stub();
      setActiveConfigEtagStub = sinon.stub();
      setActiveConfigStub = sinon.stub();

      storage.getLastSuccessfulFetchResponse = getLastSuccessfulFetchResponseStub;
      storage.getActiveConfigEtag = getActiveConfigEtagStub;
      storage.setActiveConfigEtag = setActiveConfigEtagStub;
      storageCache.setActiveConfig = setActiveConfigStub;
    });

    it('does not activate if last successful fetch response is undefined', async () => {
      getLastSuccessfulFetchResponseStub.returns(Promise.resolve());
      getActiveConfigEtagStub.returns(Promise.resolve(ETAG));

      const activateResponse = await rc.activate();

      expect(activateResponse).to.be.false;
      expect(storage.setActiveConfigEtag).to.not.have.been.called;
      expect(storageCache.setActiveConfig).to.not.have.been.called;
    });

    it('does not activate if fetched and active etags are the same', async () => {
      getLastSuccessfulFetchResponseStub.returns(
        Promise.resolve({ config: {}, etag: ETAG })
      );
      getActiveConfigEtagStub.returns(Promise.resolve(ETAG));

      const activateResponse = await rc.activate();

      expect(activateResponse).to.be.false;
      expect(storage.setActiveConfigEtag).to.not.have.been.called;
      expect(storageCache.setActiveConfig).to.not.have.been.called;
    });

    it('activates if fetched and active etags are different', async () => {
      getLastSuccessfulFetchResponseStub.returns(
        Promise.resolve({ config: CONFIG, eTag: NEW_ETAG })
      );
      getActiveConfigEtagStub.returns(Promise.resolve(ETAG));

      const activateResponse = await rc.activate();

      expect(activateResponse).to.be.true;
      expect(storage.setActiveConfigEtag).to.have.been.calledWith(NEW_ETAG);
      expect(storageCache.setActiveConfig).to.have.been.calledWith(CONFIG);
    });

    it('activates if fetched is defined but active config is not', async () => {
      getLastSuccessfulFetchResponseStub.returns(
        Promise.resolve({ config: CONFIG, eTag: NEW_ETAG })
      );
      getActiveConfigEtagStub.returns(Promise.resolve());

      const activateResponse = await rc.activate();

      expect(activateResponse).to.be.true;
      expect(storage.setActiveConfigEtag).to.have.been.calledWith(NEW_ETAG);
      expect(storageCache.setActiveConfig).to.have.been.calledWith(CONFIG);
    });
  });

  describe('fetchAndActivate', () => {
    let rcActivateStub: sinon.SinonStub<[], Promise<boolean>>;

    beforeEach(() => {
      sinon.stub(rc, 'fetch').returns(Promise.resolve());
      rcActivateStub = sinon.stub(rc, 'activate');
    });
    it('calls fetch and activate and returns activation boolean if true', async () => {
      rcActivateStub.returns(Promise.resolve(true));

      const response = await rc.fetchAndActivate();

      expect(response).to.be.true;
      expect(rc.fetch).to.have.been.called;
      expect(rc.activate).to.have.been.called;
    });

    it('calls fetch and activate and returns activation boolean if false', async () => {
      rcActivateStub.returns(Promise.resolve(false));

      const response = await rc.fetchAndActivate();

      expect(response).to.be.false;
      expect(rc.fetch).to.have.been.called;
      expect(rc.activate).to.have.been.called;
    });
  });

  describe('fetch', () => {
    let timeoutStub: sinon.SinonStub<[
      (...args: any[]) => void,
      number,
      ...any[]
    ]>;
    beforeEach(() => {
      client.fetch = sinon
        .stub()
        .returns(Promise.resolve({ status: 200 } as FetchResponse));
      storageCache.setLastFetchStatus = sinon.stub();
      timeoutStub = sinon.stub(window, 'setTimeout');
    });

    afterEach(() => {
      timeoutStub.restore();
    });

    it('defines a default timeout', async () => {
      await rc.fetch();

      expect(timeoutStub).to.have.been.calledWith(sinon.match.any, 60000);
    });

    it('honors a custom timeout', async () => {
      rc.settings.fetchTimeoutMillis = 1000;

      await rc.fetch();

      expect(timeoutStub).to.have.been.calledWith(sinon.match.any, 1000);
    });

    it('sets success status', async () => {
      for (const status of [200, 304]) {
        client.fetch = sinon
          .stub()
          .returns(Promise.resolve({ status } as FetchResponse));

        await rc.fetch();

        expect(storageCache.setLastFetchStatus).to.have.been.calledWith(
          'success'
        );
      }
    });

    it('sets throttle status', async () => {
      storage.getThrottleMetadata = sinon.stub().returns(Promise.resolve({}));

      const error = ERROR_FACTORY.create(ErrorCode.FETCH_THROTTLE, {
        throttleEndTimeMillis: 123
      });

      client.fetch = sinon.stub().returns(Promise.reject(error));

      const fetchPromise = rc.fetch();

      await expect(fetchPromise).to.eventually.be.rejectedWith(error);
      expect(storageCache.setLastFetchStatus).to.have.been.calledWith(
        'throttle'
      );
    });

    it('defaults to failure status', async () => {
      storage.getThrottleMetadata = sinon.stub().returns(Promise.resolve());

      const error = ERROR_FACTORY.create(ErrorCode.FETCH_STATUS, {
        httpStatus: 400
      });

      client.fetch = sinon.stub().returns(Promise.reject(error));

      const fetchPromise = rc.fetch();

      await expect(fetchPromise).to.eventually.be.rejectedWith(error);
      expect(storageCache.setLastFetchStatus).to.have.been.calledWith(
        'failure'
      );
    });
  });
});
