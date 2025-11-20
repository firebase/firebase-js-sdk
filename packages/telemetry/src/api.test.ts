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
import { Telemetry } from './public-types';
import { trace } from '@opentelemetry/api';
import { Logger, LogRecord, SeverityNumber } from '@opentelemetry/api-logs';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  WebTracerProvider
} from '@opentelemetry/sdk-trace-web';
import {
  FirebaseApp,
  initializeApp,
  _registerComponent,
  _addOrOverwriteComponent,
  deleteApp
} from '@firebase/app';
import { Component, ComponentType } from '@firebase/component';
import { FirebaseAppCheckInternal } from '@firebase/app-check-interop-types';
import { captureError, flush, getTelemetry } from './api';
import {
  LOG_ENTRY_ATTRIBUTE_KEYS,
  TELEMETRY_SESSION_ID_KEY
} from './constants';
import { TelemetryService } from './service';
import { registerTelemetry } from './register';
import { _FirebaseInstallationsInternal } from '@firebase/installations';
import { AUTO_CONSTANTS } from './auto-constants';

const PROJECT_ID = 'my-project';
const APP_ID = 'my-appid';
const API_KEY = 'my-api-key';
const MOCK_SESSION_ID = '00000000-0000-0000-0000-000000000000';

const emittedLogs: LogRecord[] = [];

const fakeLoggerProvider = {
  getLogger: (): Logger => {
    return {
      emit: (logRecord: LogRecord) => {
        emittedLogs.push(logRecord);
      }
    };
  },
  forceFlush: () => {
    emittedLogs.length = 0;
    return Promise.resolve();
  },
  shutdown: () => Promise.resolve()
} as unknown as LoggerProvider;

const fakeTelemetry: Telemetry = {
  app: {
    name: 'DEFAULT',
    automaticDataCollectionEnabled: true,
    options: {
      projectId: PROJECT_ID,
      appId: APP_ID
    }
  },
  loggerProvider: fakeLoggerProvider
};

describe('Top level API', () => {
  let app: FirebaseApp;
  let originalSessionStorage: Storage | undefined;
  let originalCrypto: Crypto | undefined;
  let storage: Record<string, string> = {};

  beforeEach(() => {
    // Clear the logs before each test.
    emittedLogs.length = 0;
    app = getFakeApp();
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

  afterEach(async () => {
    await deleteApp(app);
    Object.defineProperty(global, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true
    });
    Object.defineProperty(global, 'crypto', {
      value: originalCrypto,
      writable: true
    });
  });

  describe('getTelemetry()', () => {
    it('works without options', () => {
      expect(getTelemetry(getFakeApp())).to.be.instanceOf(TelemetryService);
      // Two instances are the same
      expect(getTelemetry(getFakeApp())).to.equal(getTelemetry(getFakeApp()));
    });

    it('works with options: no endpointUrl', () => {
      expect(getTelemetry(getFakeApp(), {})).to.equal(
        getTelemetry(getFakeApp())
      );
    });

    it('works with options: endpointUrl set', () => {
      const app = getFakeApp();
      expect(getTelemetry(app, { endpointUrl: 'http://endpoint1' })).to.equal(
        getTelemetry(app, { endpointUrl: 'http://endpoint1' })
      );
      expect(
        getTelemetry(app, { endpointUrl: 'http://endpoint1' })
      ).not.to.equal(getTelemetry(app, { endpointUrl: 'http://endpoint2' }));
      expect(
        getTelemetry(app, { endpointUrl: 'http://endpoint1' })
      ).not.to.equal(getTelemetry(app, {}));
    });
  });

  describe('captureError()', () => {
    it('should capture an Error object correctly', () => {
      const error = new Error('This is a test error');
      error.stack = '...stack trace...';
      error.name = 'TestError';

      captureError(fakeTelemetry, error);

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.severityNumber).to.equal(SeverityNumber.ERROR);
      expect(log.body).to.equal('This is a test error');
      expect(log.attributes).to.deep.equal({
        'error.type': 'TestError',
        'error.stack': '...stack trace...',
        [LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION]: 'unset',
        [LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]: MOCK_SESSION_ID
      });
    });

    it('should handle an Error object with no stack trace', () => {
      const error = new Error('error with no stack');
      error.stack = undefined;

      captureError(fakeTelemetry, error);

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.severityNumber).to.equal(SeverityNumber.ERROR);
      expect(log.body).to.equal('error with no stack');
      expect(log.attributes).to.deep.equal({
        'error.type': 'Error',
        'error.stack': 'No stack trace available',
        [LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION]: 'unset',
        [LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]: MOCK_SESSION_ID
      });
    });

    it('should capture a string error correctly', () => {
      captureError(fakeTelemetry, 'a string error');

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.severityNumber).to.equal(SeverityNumber.ERROR);
      expect(log.body).to.equal('a string error');
      expect(log.attributes).to.deep.equal({
        [LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION]: 'unset',
        [LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]: MOCK_SESSION_ID
      });
    });

    it('should capture an unknown error type correctly', () => {
      captureError(fakeTelemetry, 12345);

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.severityNumber).to.equal(SeverityNumber.ERROR);
      expect(log.body).to.equal('Unknown error type: number');
      expect(log.attributes).to.deep.equal({
        [LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION]: 'unset',
        [LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]: MOCK_SESSION_ID
      });
    });

    it('should propagate trace context', async () => {
      const provider = new WebTracerProvider({
        spanProcessors: [new SimpleSpanProcessor(new InMemorySpanExporter())]
      });
      provider.register();

      trace.getTracer('test-tracer').startActiveSpan('test-span', span => {
        const error = new Error('This is a test error');
        error.stack = '...stack trace...';
        error.name = 'TestError';

        span.spanContext().traceId = 'my-trace';
        span.spanContext().spanId = 'my-span';

        captureError(fakeTelemetry, error);
        span.end();
      });

      await provider.shutdown();

      expect(emittedLogs[0].attributes).to.deep.equal({
        'error.type': 'TestError',
        'error.stack': '...stack trace...',
        [LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION]: 'unset',
        'logging.googleapis.com/trace': `projects/${PROJECT_ID}/traces/my-trace`,
        'logging.googleapis.com/spanId': `my-span`,
        [LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]: MOCK_SESSION_ID
      });
    });

    it('should propagate custom attributes', () => {
      const error = new Error('This is a test error');
      error.stack = '...stack trace...';
      error.name = 'TestError';

      captureError(fakeTelemetry, error, {
        strAttr: 'string attribute',
        mapAttr: {
          boolAttr: true,
          numAttr: 2
        },
        arrAttr: [1, 2, 3]
      });

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.attributes).to.deep.equal({
        'error.type': 'TestError',
        'error.stack': '...stack trace...',
        [LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION]: 'unset',
        strAttr: 'string attribute',
        mapAttr: {
          boolAttr: true,
          numAttr: 2
        },
        arrAttr: [1, 2, 3],
        [LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]: MOCK_SESSION_ID
      });
    });

    it('should use explicit app version when provided', () => {
      AUTO_CONSTANTS.appVersion = '1.2.3'; // Unused
      const telemetry = new TelemetryService(
        fakeTelemetry.app,
        fakeTelemetry.loggerProvider
      );
      telemetry.options = {
        appVersion: '1.0.0'
      };

      captureError(telemetry, 'a string error');

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.attributes).to.deep.equal({
        [LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION]: '1.0.0',
        [LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]: MOCK_SESSION_ID
      });
    });

    it('should use auto constants if available', () => {
      AUTO_CONSTANTS.appVersion = '1.2.3';

      captureError(fakeTelemetry, 'a string error');

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.attributes).to.deep.equal({
        [LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION]: '1.2.3',
        [LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]: MOCK_SESSION_ID
      });
    });

    describe('Session Metadata', () => {
      it('should generate and store a new session ID if none exists', () => {
        captureError(fakeTelemetry, 'error');

        expect(emittedLogs.length).to.equal(1);
        const log = emittedLogs[0];
        expect(log.attributes![LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]).to.equal(
          MOCK_SESSION_ID
        );
        expect(storage[TELEMETRY_SESSION_ID_KEY]).to.equal(MOCK_SESSION_ID);
      });

      it('should retrieve existing session ID from sessionStorage', () => {
        storage[TELEMETRY_SESSION_ID_KEY] = 'existing-session-id';

        captureError(fakeTelemetry, 'error');

        expect(emittedLogs.length).to.equal(1);
        const log = emittedLogs[0];
        expect(log.attributes![LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]).to.equal(
          'existing-session-id'
        );
      });

      it('should handle errors when sessionStorage.getItem throws', () => {
        const sessionStorageMock: Partial<Storage> = {
          getItem: () => {
            throw new Error('SecurityError');
          },
          setItem: () => {}
        };

        Object.defineProperty(global, 'sessionStorage', {
          value: sessionStorageMock,
          writable: true
        });

        captureError(fakeTelemetry, 'error');

        expect(emittedLogs.length).to.equal(1);
        const log = emittedLogs[0];
        expect(log.attributes![LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]).to.be
          .undefined;
      });

      it('should handle errors when sessionStorage.setItem throws', () => {
        const sessionStorageMock: Partial<Storage> = {
          getItem: () => null, // Emulate no existing session ID
          setItem: () => {
            throw new Error('SecurityError');
          }
        };

        Object.defineProperty(global, 'sessionStorage', {
          value: sessionStorageMock,
          writable: true
        });

        captureError(fakeTelemetry, 'error');

        expect(emittedLogs.length).to.equal(1);
        const log = emittedLogs[0];
        expect(log.attributes![LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]).to.be
          .undefined;
      });
    });
  });

  describe('flush()', () => {
    it('should flush logs correctly', async () => {
      captureError(fakeTelemetry, 'error1');
      captureError(fakeTelemetry, 'error2');

      expect(emittedLogs.length).to.equal(2);

      await flush(fakeTelemetry);

      expect(emittedLogs.length).to.equal(0);
    });
  });
});

function getFakeApp(): FirebaseApp {
  registerTelemetry();
  _registerComponent(
    new Component(
      'installations-internal',
      () =>
        ({
          getId: async () => 'iid',
          getToken: async () => 'authToken'
        } as _FirebaseInstallationsInternal),
      ComponentType.PUBLIC
    )
  );
  _registerComponent(
    new Component(
      'app-check-internal',
      () => {
        return {} as FirebaseAppCheckInternal;
      },
      ComponentType.PUBLIC
    )
  );
  const app = initializeApp({
    projectId: PROJECT_ID,
    appId: APP_ID,
    apiKey: API_KEY
  });
  _addOrOverwriteComponent(
    app,
    //@ts-ignore
    new Component(
      'heartbeat',
      // @ts-ignore
      () => {
        return {
          triggerHeartbeat: () => {}
        };
      },
      ComponentType.PUBLIC
    )
  );
  return app;
}
