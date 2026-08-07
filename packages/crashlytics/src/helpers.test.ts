/**
 * @license
 * Copyright 2025 Google LLC
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

import { expect } from 'chai';
import * as sinon from 'sinon';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { Logger, LogRecord } from '@opentelemetry/api-logs';
import { isNode } from '@firebase/util';
import { registerListeners, startNewSession, generateUuid } from './helpers';
import { AUTO_CONSTANTS } from './auto-constants';
import { CrashlyticsService } from './service';
import { CrashlyticsInternal } from './types';
import {
  AttributesStore,
  LOG_ATTR_KEY,
  SESSION_STORAGE_SESSION_ID_KEY
} from './attributes-store';
describe('helpers', () => {
  let originalSessionStorage: Storage | undefined;
  let originalCrypto: Crypto | undefined;
  let storage: Record<string, string> = {};
  let emittedLogs: LogRecord[] = [];
  let flushed = false;

  const fakeLoggerProvider = {
    getLogger: (): Logger => {
      return {
        emit: (logRecord: LogRecord) => {
          emittedLogs.push(logRecord);
        },
        enabled: () => true
      };
    },
    forceFlush: () => {
      flushed = true;
      return Promise.resolve();
    },
    shutdown: () => Promise.resolve()
  } as unknown as LoggerProvider;

  let fakeAttributesStore: AttributesStore;
  let fakeCrashlytics: CrashlyticsInternal;

  beforeEach(() => {
    emittedLogs = [];
    flushed = false;
    storage = {};
    // @ts-ignore
    originalSessionStorage = global.sessionStorage;
    // @ts-ignore
    originalCrypto = global.crypto;

    const sessionStorageMock: Partial<Storage> = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      }
    };
    Object.defineProperty(global, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true
    });

    fakeAttributesStore = new AttributesStore({ projectId: 'my-project' });
    fakeCrashlytics = {
      app: {
        name: 'DEFAULT',
        automaticDataCollectionEnabled: true,
        options: {
          projectId: 'my-project',
          appId: 'my-appid'
        }
      },
      loggerProvider: fakeLoggerProvider,
      attributesStore: fakeAttributesStore
    };
  });

  afterEach(() => {
    Object.defineProperty(global, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true
    });
    if (!isNode()) {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      });
    }
    delete AUTO_CONSTANTS.appVersion;
  });

  describe('startNewSession', () => {
    const MOCK_SESSION_ID = '00000000-0000-0000-0000-000000000000';

    beforeEach(() => {
      const cryptoMock: Partial<Crypto> = {
        randomUUID: () => MOCK_SESSION_ID
      };
      Object.defineProperty(global, 'crypto', {
        value: cryptoMock,
        writable: true
      });
    });

    afterEach(() => {
      Object.defineProperty(global, 'crypto', {
        value: originalCrypto,
        writable: true
      });
    });

    it('should create a new session and log it with app version (unset)', () => {
      startNewSession(fakeCrashlytics);

      expect(storage[SESSION_STORAGE_SESSION_ID_KEY]).to.equal(MOCK_SESSION_ID);
      expect(emittedLogs.length).to.equal(1);
      expect(emittedLogs[0].attributes).to.deep.equal({
        [LOG_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID,
        [LOG_ATTR_KEY.APP_VERSION]: 'unset'
      });
    });

    it('should log app version from AUTO_CONSTANTS', () => {
      AUTO_CONSTANTS.appVersion = '1.2.3';
      fakeAttributesStore = new AttributesStore({ projectId: 'my-project' });
      fakeCrashlytics.attributesStore = fakeAttributesStore;
      startNewSession(fakeCrashlytics);

      expect(emittedLogs[0].attributes).to.deep.equal({
        [LOG_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID,
        [LOG_ATTR_KEY.APP_VERSION]: '1.2.3'
      });
    });

    it('should log app version from telemetry options', () => {
      const telemetryWithVersion = new CrashlyticsService(
        fakeCrashlytics.app,
        fakeLoggerProvider,
        fakeAttributesStore
      );
      telemetryWithVersion.options = { appVersion: '9.9.9' };

      startNewSession(telemetryWithVersion);

      expect(emittedLogs[0].attributes).to.deep.equal({
        [LOG_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID,
        [LOG_ATTR_KEY.APP_VERSION]: '9.9.9'
      });
    });
  });

  describe('generateUuid', () => {
    const MOCK_UUID = '11111111-2222-3333-4444-555555555555';
    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    afterEach(() => {
      Object.defineProperty(global, 'crypto', {
        value: originalCrypto,
        writable: true
      });
    });

    it('should generate a valid v4 UUID using crypto.randomUUID when crypto is available', () => {
      const randomUUIDStub = sinon.stub().returns(MOCK_UUID);
      const cryptoMock: Partial<Crypto> = {
        randomUUID: randomUUIDStub
      };

      Object.defineProperty(global, 'crypto', {
        value: cryptoMock,
        writable: true
      });

      const uuid = generateUuid();
      expect(uuid).to.equal(MOCK_UUID);
      expect(randomUUIDStub.called).to.be.true;
    });

    it('should still generate a valid v4 UUID using Math.random when crypto is undefined', () => {
      Object.defineProperty(global, 'crypto', {
        value: undefined,
        writable: true
      });
      const randomSpy = sinon.spy(Math, 'random');
      const uuid = generateUuid();
      expect(uuid).to.match(UUID_REGEX);
      expect(randomSpy.called).to.be.true;
      randomSpy.restore();
    });
  });

  describe('registerListeners', () => {
    if (isNode()) {
      it('should do nothing in node', () => {
        registerListeners(fakeCrashlytics);
      });
    } else {
      it('should flush logs when the visibility changes to hidden', () => {
        registerListeners(fakeCrashlytics);

        expect(flushed).to.be.false;

        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          writable: true
        });
        window.dispatchEvent(new Event('visibilitychange'));

        expect(flushed).to.be.true;
      });

      it('should flush logs when the pagehide event fires', () => {
        registerListeners(fakeCrashlytics);

        expect(flushed).to.be.false;

        window.dispatchEvent(new Event('pagehide'));

        expect(flushed).to.be.true;
      });
    }
  });
});
