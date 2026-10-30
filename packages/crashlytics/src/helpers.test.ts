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

import { LoggerProvider, SdkLogRecord } from '@opentelemetry/sdk-logs';
import { Logger, LogRecord } from '@opentelemetry/api-logs';
import { trace, TracerProvider } from '@opentelemetry/api';
import { isNode } from '@firebase/util';
import {
  registerListeners,
  startNewSession,
  logVisibilityEvent,
  generateUuid,
  getTelemetryEndpointUrl,
  isTelemetryUrl
} from './helpers';
import { AUTO_CONSTANTS } from './auto-constants';
import { CrashlyticsService } from './service';
import { CrashlyticsInternal } from './types';
import {
  AttributesStore,
  LOG_ATTR_KEY,
  SESSION_STORAGE_SESSION_ID_KEY
} from './attributes-store';
import { TelemetryStore } from './telemetry-store';
import { FirebaseAttributesLogProcessor } from './logging/attributes-log-processor';
import { breadcrumbs } from './breadcrumbs';
import type { MockInstance } from 'vitest';

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
          const processor = new FirebaseAttributesLogProcessor(
            fakeAttributesStore,
            'my-project'
          );
          processor.onEmit(logRecord as unknown as SdkLogRecord);
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
  let fakeTelemetryStore: TelemetryStore;
  let fakeCrashlytics: CrashlyticsInternal;
  let getActiveSpanStub: MockInstance;

  beforeEach(() => {
    emittedLogs = [];
    flushed = false;
    storage = {};
    // @ts-ignore
    originalSessionStorage = globalThis.sessionStorage;
    // @ts-ignore
    originalCrypto = globalThis.crypto;

    const sessionStorageMock: Partial<Storage> = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      }
    };
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true
    });

    fakeAttributesStore = new AttributesStore({ projectId: 'my-project' });
    fakeTelemetryStore = new TelemetryStore();
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
      attributesStore: fakeAttributesStore,
      telemetryStore: fakeTelemetryStore
    };
    getActiveSpanStub = vi
      .spyOn(trace, 'getActiveSpan')
      .mockReturnValue(undefined);
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'sessionStorage', {
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
    getActiveSpanStub.mockRestore();
  });

  describe('startNewSession', () => {
    const MOCK_SESSION_ID = '00000000-0000-0000-0000-000000000000';

    beforeEach(() => {
      const cryptoMock: Partial<Crypto> = {
        randomUUID: () => MOCK_SESSION_ID
      };
      Object.defineProperty(globalThis, 'crypto', {
        value: cryptoMock,
        writable: true
      });
    });

    afterEach(() => {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        writable: true
      });
    });

    it('should create a new session and log it with app version (unset)', () => {
      startNewSession(fakeCrashlytics);

      expect(storage[SESSION_STORAGE_SESSION_ID_KEY]).toBe(MOCK_SESSION_ID);
      expect(emittedLogs.length).toBe(1);
      expect(emittedLogs[0].attributes).toEqual({
        [LOG_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID,
        [LOG_ATTR_KEY.APP_VERSION]: 'unset'
      });
    });

    it('should log app version from AUTO_CONSTANTS', () => {
      AUTO_CONSTANTS.appVersion = '1.2.3';
      fakeAttributesStore = new AttributesStore({ projectId: 'my-project' });
      fakeCrashlytics.attributesStore = fakeAttributesStore;
      startNewSession(fakeCrashlytics);

      expect(emittedLogs[0].attributes).toEqual({
        [LOG_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID,
        [LOG_ATTR_KEY.APP_VERSION]: '1.2.3'
      });
    });

    it('should log app version from telemetry options', () => {
      const telemetryWithVersion = new CrashlyticsService(
        fakeCrashlytics.app,
        fakeLoggerProvider,
        fakeTracingProvider,
        fakeAttributesStore,
        fakeTelemetryStore
      );
      telemetryWithVersion.options = { appVersion: '9.9.9' };

      startNewSession(telemetryWithVersion);

      expect(emittedLogs[0].attributes).toEqual({
        [LOG_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID,
        [LOG_ATTR_KEY.APP_VERSION]: '9.9.9'
      });
    });

    it('should log trace and span id from context', () => {
      const mockRootSpan = {
        spanContext: () => ({ traceId: 'traceId2', spanId: 'spanId2' })
      };
      getActiveSpanStub.mockReturnValue(mockRootSpan);
      startNewSession(fakeCrashlytics);

      expect(emittedLogs[0].attributes).toEqual({
        [LOG_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID,
        [LOG_ATTR_KEY.APP_VERSION]: 'unset',
        [LOG_ATTR_KEY.TRACE]: 'projects/my-project/traces/traceId2',
        [LOG_ATTR_KEY.SPAN_ID]: 'spanId2'
      });
    });
  });

  describe('generateUuid', () => {
    const MOCK_UUID = '11111111-2222-3333-4444-555555555555';
    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    afterEach(() => {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        writable: true
      });
    });

    it('should generate a valid v4 UUID using crypto.randomUUID when crypto is available', () => {
      const randomUUIDStub = vi.fn().mockReturnValue(MOCK_UUID);
      const cryptoMock: Partial<Crypto> = {
        randomUUID: randomUUIDStub
      };

      Object.defineProperty(globalThis, 'crypto', {
        value: cryptoMock,
        writable: true
      });

      const uuid = generateUuid();
      expect(uuid).toBe(MOCK_UUID);
      expect(randomUUIDStub).toHaveBeenCalled();
    });

    it('should fall back to crypto.getRandomValues when crypto.randomUUID is unavailable', () => {
      const getRandomValuesStub = vi
        .fn()
        .mockImplementation((arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = i;
          }
          return arr;
        });
      const cryptoMock: Partial<Crypto> = {
        randomUUID: undefined,
        getRandomValues: getRandomValuesStub
      };

      Object.defineProperty(globalThis, 'crypto', {
        value: cryptoMock,
        writable: true
      });

      const uuid = generateUuid();
      expect(uuid).toMatch(UUID_REGEX);
      expect(uuid).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
      expect(getRandomValuesStub).toHaveBeenCalledOnce();
    });

    it('should throw when Web Crypto API is completely unavailable', () => {
      Object.defineProperty(globalThis, 'crypto', {
        value: undefined,
        writable: true
      });
      expect(() => generateUuid()).toThrow(
        'Web Crypto API is not available to generate a UUID.'
      );
      expect(() => startNewSession(fakeCrashlytics)).not.toThrow();
    });
  });

  describe('registerListeners', () => {
    let addEventListenerStub: MockInstance;
    let listeners: Record<string, (...args: any[]) => any>;

    beforeEach(() => {
      listeners = {};
      if (typeof window !== 'undefined') {
        addEventListenerStub = vi
          .spyOn(window, 'addEventListener')
          .mockImplementation((event, callback) => {
            listeners[event] = callback as (...args: any[]) => any;
          });
      }
    });

    afterEach(() => {
      if (typeof window !== 'undefined') {
        addEventListenerStub.mockRestore();
      }
    });

    if (isNode()) {
      it('should do nothing in node', () => {
        registerListeners(fakeCrashlytics);
      });
    } else {
      it('should emit a log and flush when the visibility changes to hidden and breadcrumbs() is enabled', async () => {
        fakeCrashlytics.options = { features: [breadcrumbs()] };
        registerListeners(fakeCrashlytics);

        expect(flushed).toBe(false);
        expect(emittedLogs).toHaveLength(0);
        expect(listeners['visibilitychange']).toBeTruthy();

        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          writable: true
        });
        await listeners['visibilitychange']();

        expect(flushed).toBe(true);
        expect(emittedLogs).toHaveLength(1);
      });

      it('should emit a log but not flush when the visibility changes to visible and breadcrumbs() is enabled', async () => {
        fakeCrashlytics.options = { features: [breadcrumbs()] };
        registerListeners(fakeCrashlytics);

        expect(flushed).toBe(false);
        expect(emittedLogs).toHaveLength(0);
        expect(listeners['visibilitychange']).toBeTruthy();

        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true
        });
        await listeners['visibilitychange']();

        expect(flushed).toBe(false);
        expect(emittedLogs).toHaveLength(1);
      });

      it('should not emit a visibility log when breadcrumbs() is not enabled, but still flush on hidden', async () => {
        registerListeners(fakeCrashlytics);

        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          writable: true
        });
        await listeners['visibilitychange']();

        expect(flushed).toBe(true);
        expect(emittedLogs).toHaveLength(0);
      });

      it('should flush logs when the pagehide event fires', async () => {
        startNewSession(fakeCrashlytics);
        registerListeners(fakeCrashlytics);

        expect(flushed).toBe(false);
        expect(listeners['pagehide']).toBeTruthy();

        await listeners['pagehide']();

        expect(flushed).toBe(true);
      });
    }
  });

  describe('logVisibilityEvent', () => {
    it("should emit a log record for a hidden visibility with body of 'Background lifecycle event'", () => {
      logVisibilityEvent(fakeCrashlytics, 'hidden');

      expect(emittedLogs).toHaveLength(1);
      const log = emittedLogs[0];
      expect(log.body).toBe('Background lifecycle event');
    });

    it("should emit a log record for a visible visibility with body of 'Foreground lifecycle event'", () => {
      logVisibilityEvent(fakeCrashlytics, 'visible');

      expect(emittedLogs).toHaveLength(1);
      const log = emittedLogs[0];
      expect(log.body).toBe('Foreground lifecycle event');
    });
  });

  describe('getTelemetryEndpointUrl', () => {
    it('should return the default global clienttelemetry endpoint when no options are provided', () => {
      expect(getTelemetryEndpointUrl()).toBe(
        'https://clienttelemetry.googleapis.com'
      );
      expect(getTelemetryEndpointUrl({ region: 'global' })).toBe(
        'https://clienttelemetry.googleapis.com'
      );
    });

    it('should return a regional REP endpoint when a non-global region is provided', () => {
      expect(getTelemetryEndpointUrl({ region: 'us-east5' })).toBe(
        'https://clienttelemetry.us-east5.rep.googleapis.com'
      );
      expect(getTelemetryEndpointUrl({ region: 'europe-west1' })).toBe(
        'https://clienttelemetry.europe-west1.rep.googleapis.com'
      );
    });

    it('should use custom endpointUrl and strip trailing slashes', () => {
      expect(
        getTelemetryEndpointUrl({
          endpointUrl: 'https://custom-proxy.internal.net/'
        })
      ).toBe('https://custom-proxy.internal.net');
      expect(
        getTelemetryEndpointUrl({
          endpointUrl: 'https://custom-proxy.internal.net///'
        })
      ).toBe('https://custom-proxy.internal.net');
      const longSlashesPrefix = `https://custom-proxy.internal.net/${'/'.repeat(
        10000
      )}v1`;
      expect(
        getTelemetryEndpointUrl({
          endpointUrl: `${longSlashesPrefix}///`
        })
      ).toBe(longSlashesPrefix);
      expect(
        getTelemetryEndpointUrl({
          endpointUrl: 'https://custom-proxy.internal.net',
          region: 'us-east5'
        })
      ).toBe('https://custom-proxy.internal.net');
    });
  });

  describe('isTelemetryUrl', () => {
    it('should identify default global and regional clienttelemetry endpoint URLs', () => {
      expect(
        isTelemetryUrl('https://clienttelemetry.googleapis.com/v1/logs')
      ).toBe(true);
      expect(
        isTelemetryUrl(
          'https://clienttelemetry.us-east5.rep.googleapis.com/v1/logs'
        )
      ).toBe(true);
      expect(
        isTelemetryUrl(
          'https://clienttelemetry.googleapis.com.attacker.com/v1/logs'
        )
      ).toBe(false);
      expect(
        isTelemetryUrl(
          'https://clienttelemetry.us-east5.rep.googleapis.com.attacker.com/v1/logs'
        )
      ).toBe(false);
    });

    it('should identify custom endpoint URLs when provided', () => {
      expect(
        isTelemetryUrl(
          'https://custom-proxy.internal.net/v1/logs',
          'https://custom-proxy.internal.net'
        )
      ).toBe(true);
    });

    it('should return false for unrelated URLs (e.g. Auth, Firestore, APIs)', () => {
      expect(
        isTelemetryUrl('https://identitytoolkit.googleapis.com/v1/accounts')
      ).toBe(false);
      expect(
        isTelemetryUrl(
          'https://firestore.googleapis.com/v1/projects/p/databases'
        )
      ).toBe(false);
      expect(isTelemetryUrl('https://api.example.com/data')).toBe(false);
      expect(
        isTelemetryUrl(
          'https://example.com/search?query=clienttelemetry.googleapis.com'
        )
      ).toBe(false);
    });

    it('should handle undefined or non-string inputs safely', () => {
      expect(isTelemetryUrl(undefined)).toBe(false);
      expect(isTelemetryUrl(null)).toBe(false);
      expect(isTelemetryUrl(12345)).toBe(false);
      expect(isTelemetryUrl('')).toBe(false);
    });
  });
});
