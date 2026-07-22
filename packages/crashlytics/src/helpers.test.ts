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
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { Logger, LogRecord } from '@opentelemetry/api-logs';
import { trace, TracerProvider } from '@opentelemetry/api';
import sinon from 'sinon';
import { isNode } from '@firebase/util';
import {
  registerListeners,
  startNewSession,
  logVisibilityEvent
} from './helpers';
import { AUTO_CONSTANTS } from './auto-constants';
import { CrashlyticsService } from './service';
import { CrashlyticsInternal } from './types';
import {
  AttributesStore,
  LOG_ATTR_KEY,
  SESSION_STORAGE_SESSION_ID_KEY
} from './attributes-store';

const MOCK_SESSION_ID = '00000000-0000-0000-0000-000000000000';

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

  const fakeTracingProvider = {
    getTracer: () => ({}),
    register: () => {},
    shutdown: () => Promise.resolve()
  } as unknown as TracerProvider;
  let fakeAttributesStore: AttributesStore;
  let fakeCrashlytics: CrashlyticsInternal;
  let getActiveSpanStub: sinon.SinonStub;

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
    const cryptoMock: Partial<Crypto> = {
      randomUUID: () => MOCK_SESSION_ID
    };

    Object.defineProperty(global, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true
    });
    Object.defineProperty(global, 'crypto', {
      value: cryptoMock,
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
      tracingProvider: fakeTracingProvider,
      attributesStore: fakeAttributesStore
    };
    getActiveSpanStub = sinon.stub(trace, 'getActiveSpan').returns(undefined);
  });

  afterEach(() => {
    Object.defineProperty(global, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true
    });
    Object.defineProperty(global, 'crypto', {
      value: originalCrypto,
      writable: true
    });
    if (!isNode()) {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      });
    }
    delete AUTO_CONSTANTS.appVersion;
    getActiveSpanStub.restore();
  });

  describe('startNewSession', () => {
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
        fakeTracingProvider,
        fakeAttributesStore
      );
      telemetryWithVersion.options = { appVersion: '9.9.9' };

      startNewSession(telemetryWithVersion);

      expect(emittedLogs[0].attributes).to.deep.equal({
        [LOG_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID,
        [LOG_ATTR_KEY.APP_VERSION]: '9.9.9'
      });
    });

    it('should log trace and span id from context', () => {
      const mockRootSpan = {
        spanContext: () => ({ traceId: 'traceId2', spanId: 'spanId2' })
      };
      getActiveSpanStub.returns(mockRootSpan);
      startNewSession(fakeCrashlytics);

      expect(emittedLogs[0].attributes).to.deep.equal({
        [LOG_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID,
        [LOG_ATTR_KEY.APP_VERSION]: 'unset',
        [LOG_ATTR_KEY.TRACE]: 'projects/my-project/traces/traceId2',
        [LOG_ATTR_KEY.SPAN_ID]: 'spanId2'
      });
    });
  });

  describe('registerListeners', () => {
    let addEventListenerStub: sinon.SinonStub;
    let listeners: Record<string, (...args: any[]) => any>;

    beforeEach(() => {
      listeners = {};
      if (typeof window !== 'undefined') {
        addEventListenerStub = sinon
          .stub(window, 'addEventListener')
          .callsFake((event, callback) => {
            listeners[event] = callback as (...args: any[]) => any;
          });
      }
    });

    afterEach(() => {
      if (typeof window !== 'undefined') {
        addEventListenerStub.restore();
      }
    });

    if (isNode()) {
      it('should do nothing in node', () => {
        registerListeners(fakeCrashlytics);
      });
    } else {
      it('should emit a log and flush when the visibility changes to hidden', async () => {
        registerListeners(fakeCrashlytics);

        expect(flushed).to.be.false;
        expect(emittedLogs).to.have.lengthOf(0);
        expect(listeners['visibilitychange']).to.be.ok;

        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          writable: true
        });
        await listeners['visibilitychange']();

        expect(flushed).to.be.true;
        expect(emittedLogs).to.have.lengthOf(1);
      });

      it('should emit a log but not flush when the visibility changes to visible', async () => {
        registerListeners(fakeCrashlytics);

        expect(flushed).to.be.false;
        expect(emittedLogs).to.have.lengthOf(0);
        expect(listeners['visibilitychange']).to.be.ok;

        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true
        });
        await listeners['visibilitychange']();

        expect(flushed).to.be.false;
        expect(emittedLogs).to.have.lengthOf(1);
      });

      it('should flush logs when the pagehide event fires', async () => {
        startNewSession(fakeCrashlytics);
        registerListeners(fakeCrashlytics);

        expect(flushed).to.be.false;
        expect(listeners['pagehide']).to.be.ok;

        await listeners['pagehide']();

        expect(flushed).to.be.true;
      });
    }
  });

  describe('logVisibilityEvent', () => {
    it("should emit a log record for a hidden visibility with body of 'Background lifecycle event'", () => {
      logVisibilityEvent(fakeCrashlytics, 'hidden');

      expect(emittedLogs).to.have.lengthOf(1);
      const log = emittedLogs[0];
      expect(log.body).to.equal('Background lifecycle event');
    });

    it("should emit a log record for a visible visibility with body of 'Foreground lifecycle event'", () => {
      logVisibilityEvent(fakeCrashlytics, 'visible');

      expect(emittedLogs).to.have.lengthOf(1);
      const log = emittedLogs[0];
      expect(log.body).to.equal('Foreground lifecycle event');
    });
  });
});
