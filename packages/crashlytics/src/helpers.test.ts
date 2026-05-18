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
import { Logger, LogRecord, AnyValueMap } from '@opentelemetry/api-logs';
import { trace, TracerProvider } from '@opentelemetry/api';
import sinon from 'sinon';
import { isNode } from '@firebase/util';
import {
  registerListeners,
  startNewSession,
  setCommonLogAttributes
} from './helpers';
import {
  CRASHLYTICS_ATTRIBUTE_KEYS,
  CRASHLYTICS_SESSION_ID_KEY
} from './constants';
import { AUTO_CONSTANTS } from './auto-constants';
import { CrashlyticsService } from './service';
import { CrashlyticsInternal } from './types';
import { RootSpanContextManager } from './tracing/root-span-context-manager';

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
          const rootSpan = fakeContextManager.getActiveRootSpan();
          if (rootSpan) {
            const spanContext = rootSpan.span.spanContext();
            logRecord.attributes = {
              ...logRecord.attributes,
              [CRASHLYTICS_ATTRIBUTE_KEYS.TRACE_ID]: spanContext.traceId,
              [CRASHLYTICS_ATTRIBUTE_KEYS.SPAN_ID]: spanContext.spanId
            };
          }
          emittedLogs.push(logRecord);
        }
      };
    },
    forceFlush: () => {
      flushed = true;
      return Promise.resolve();
    },
    shutdown: () => Promise.resolve()
  } as unknown as LoggerProvider;

  const fakeTracingProvider = {
    getTracer: () => ({
      startSpan: () => ({
        setAttribute: () => {},
        end: () => {},
        spanContext: () => ({ traceId: 'my-trace', spanId: 'my-span' })
      }),
      startActiveSpan: (name: string, fn: (span: any) => any) =>
        fn({
          end: () => {},
          spanContext: () => ({ traceId: 'my-trace', spanId: 'my-span' })
        })
    }),
    register: () => {},
    shutdown: () => Promise.resolve()
  } as unknown as TracerProvider;

  const fakeContextManager = {
    getActiveRootSpan: () => ({
      span: {
        spanContext: () => ({ traceId: 'my-trace', spanId: 'my-span' }),
        end: () => {}
      }
    }),
    setRootSpan: () => {},
    getLocationKey: () => undefined,
    setLocationKey: () => {}
  } as unknown as RootSpanContextManager;

  const fakeCrashlytics: CrashlyticsInternal = {
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
    contextManager: fakeContextManager
  };

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
  });

  describe('startNewSession', () => {
    it('should create a new session and log it with app version (unset)', () => {
      startNewSession(fakeCrashlytics);

      expect(storage[CRASHLYTICS_SESSION_ID_KEY]).to.equal(MOCK_SESSION_ID);
      expect(emittedLogs.length).to.equal(1);
      expect(emittedLogs[0].attributes).to.deep.equal({
        [CRASHLYTICS_ATTRIBUTE_KEYS.SESSION_ID]: MOCK_SESSION_ID,
        [CRASHLYTICS_ATTRIBUTE_KEYS.APP_VERSION]: 'unset',
        [CRASHLYTICS_ATTRIBUTE_KEYS.TRACE_ID]: 'my-trace',
        [CRASHLYTICS_ATTRIBUTE_KEYS.SPAN_ID]: 'my-span'
      });
    });

    it('should log app version from AUTO_CONSTANTS', () => {
      AUTO_CONSTANTS.appVersion = '1.2.3';
      startNewSession(fakeCrashlytics);

      expect(emittedLogs[0].attributes).to.deep.equal({
        [CRASHLYTICS_ATTRIBUTE_KEYS.SESSION_ID]: MOCK_SESSION_ID,
        [CRASHLYTICS_ATTRIBUTE_KEYS.APP_VERSION]: '1.2.3',
        [CRASHLYTICS_ATTRIBUTE_KEYS.TRACE_ID]: 'my-trace',
        [CRASHLYTICS_ATTRIBUTE_KEYS.SPAN_ID]: 'my-span'
      });
    });

    it('should log app version from telemetry options', () => {
      const telemetryWithVersion = new CrashlyticsService(
        fakeCrashlytics.app,
        fakeLoggerProvider,
        fakeTracingProvider,
        fakeContextManager
      );
      telemetryWithVersion.options = { appVersion: '9.9.9' };

      startNewSession(telemetryWithVersion);

      expect(emittedLogs[0].attributes).to.deep.equal({
        [CRASHLYTICS_ATTRIBUTE_KEYS.SESSION_ID]: MOCK_SESSION_ID,
        [CRASHLYTICS_ATTRIBUTE_KEYS.APP_VERSION]: '9.9.9',
        [CRASHLYTICS_ATTRIBUTE_KEYS.TRACE_ID]: 'my-trace',
        [CRASHLYTICS_ATTRIBUTE_KEYS.SPAN_ID]: 'my-span'
      });
    });
  });

  describe('setCommonLogAttributes', () => {
    let customAttributes: AnyValueMap;
    let getActiveSpanStub: sinon.SinonStub | undefined;

    beforeEach(() => {
      customAttributes = {};
    });

    afterEach(() => {
      getActiveSpanStub?.restore();
      getActiveSpanStub = undefined;
    });

    it('should assign trace id, span id, app version, and session id to customAttributes if active span', () => {
      const mockSpan = {
        spanContext: () => ({ traceId: 'trace-id-123', spanId: 'span-id-456' })
      };
      getActiveSpanStub = sinon
        .stub(trace, 'getActiveSpan')
        .returns(mockSpan as any);

      storage[CRASHLYTICS_SESSION_ID_KEY] = 'session-id-789';
      AUTO_CONSTANTS.appVersion = '1.0.0';

      setCommonLogAttributes(fakeCrashlytics, customAttributes);

      expect(customAttributes[CRASHLYTICS_ATTRIBUTE_KEYS.TRACE_ID]).to.equal(
        'trace-id-123'
      );
      expect(customAttributes[CRASHLYTICS_ATTRIBUTE_KEYS.SPAN_ID]).to.equal(
        'span-id-456'
      );
      expect(customAttributes[CRASHLYTICS_ATTRIBUTE_KEYS.APP_VERSION]).to.equal(
        '1.0.0'
      );
      expect(customAttributes[CRASHLYTICS_ATTRIBUTE_KEYS.SESSION_ID]).to.equal(
        'session-id-789'
      );
    });

    it('should not assign attributes for trace id and span id if there is no active span', () => {
      getActiveSpanStub = sinon.stub(trace, 'getActiveSpan').returns(undefined);

      setCommonLogAttributes(fakeCrashlytics, customAttributes);

      expect(customAttributes[CRASHLYTICS_ATTRIBUTE_KEYS.TRACE_ID]).to.be
        .undefined;
      expect(customAttributes[CRASHLYTICS_ATTRIBUTE_KEYS.SPAN_ID]).to.be
        .undefined;
    });

    it("should assign 'unset' to app version if not available", () => {
      getActiveSpanStub = sinon.stub(trace, 'getActiveSpan').returns(undefined);

      setCommonLogAttributes(fakeCrashlytics, customAttributes);

      expect(customAttributes[CRASHLYTICS_ATTRIBUTE_KEYS.APP_VERSION]).to.equal(
        'unset'
      );
    });

    it('should not assign any session id if not available', () => {
      getActiveSpanStub = sinon.stub(trace, 'getActiveSpan').returns(undefined);

      setCommonLogAttributes(fakeCrashlytics, customAttributes);

      expect(customAttributes[CRASHLYTICS_ATTRIBUTE_KEYS.SESSION_ID]).to.be
        .undefined;
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
        startNewSession(fakeCrashlytics);
        registerListeners(fakeCrashlytics);

        expect(flushed).to.be.false;

        window.dispatchEvent(new Event('pagehide'));

        expect(flushed).to.be.true;
      });
    }
  });
});
