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
import { TracerProvider } from '@opentelemetry/api';
import { isNode } from '@firebase/util';
import { registerListeners, startNewSession } from './helpers';
import {
  LOG_ENTRY_ATTRIBUTE_KEYS,
  CRASHLYTICS_SESSION_ID_KEY
} from './constants';
import { AUTO_CONSTANTS } from './auto-constants';
import { CrashlyticsService } from './service';
import { CrashlyticsInternal } from './types';

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
        setAttribute: () => { },
        end: () => { }
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
    tracingProvider: fakeTracingProvider
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
        [LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]: MOCK_SESSION_ID,
        [LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION]: 'unset'
      });
      expect(fakeCrashlytics.currentSessionSpan).to.not.be.undefined;
    });

    it('should log app version from AUTO_CONSTANTS', () => {
      AUTO_CONSTANTS.appVersion = '1.2.3';
      startNewSession(fakeCrashlytics);

      expect(emittedLogs[0].attributes).to.deep.equal({
        [LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]: MOCK_SESSION_ID,
        [LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION]: '1.2.3'
      });
      expect(fakeCrashlytics.currentSessionSpan).to.not.be.undefined;
    });

    it('should log app version from telemetry options', () => {
      const telemetryWithVersion = new CrashlyticsService(
        fakeCrashlytics.app,
        fakeLoggerProvider,
        fakeTracingProvider
      );
      telemetryWithVersion.options = { appVersion: '9.9.9' };

      startNewSession(telemetryWithVersion);

      expect(emittedLogs[0].attributes).to.deep.equal({
        [LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]: MOCK_SESSION_ID,
        [LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION]: '9.9.9'
      });
      expect(telemetryWithVersion.currentSessionSpan).to.not.be.undefined;
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
        let spanEnded = false;
        const mockSpan = {
          setAttribute: () => { },
          end: () => {
            spanEnded = true;
          }
        };
        const mockTracer = {
          startSpan: () => mockSpan,
          startActiveSpan: (name: string, fn: (span: any) => any) =>
            fn({
              end: () => { },
              spanContext: () => ({ traceId: 'my-trace', spanId: 'my-span' })
            })
        };
        // Override getTracer to return our mock tracer
        const originalGetTracer = fakeTracingProvider.getTracer;
        fakeTracingProvider.getTracer = () => mockTracer as any;

        try {
          startNewSession(fakeCrashlytics);
          registerListeners(fakeCrashlytics);

          expect(flushed).to.be.false;
          expect(spanEnded).to.be.false;

          window.dispatchEvent(new Event('pagehide'));

          expect(flushed).to.be.true;
          expect(spanEnded).to.be.true;
        } finally {
          fakeTracingProvider.getTracer = originalGetTracer;
        }
      });
    }
  });
});
