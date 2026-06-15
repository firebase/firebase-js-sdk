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
  _addOrOverwriteComponent,
  deleteApp
} from '@firebase/app';
import { Component, ComponentType } from '@firebase/component';
import { FirebaseAppCheckInternal } from '@firebase/app-check-interop-types';
import { recordError, flush, getCrashlytics } from './api';
import { CrashlyticsService } from './service';
import { registerCrashlytics } from './register';
import { _FirebaseInstallationsInternal } from '@firebase/installations';
import { AUTO_CONSTANTS } from './auto-constants';
import { CrashlyticsInternal } from './types';
import {
  AttributesStore,
  COMMON_ATTR_KEY,
  SESSION_STORAGE_SESSION_ID_KEY
} from './attributes-store';

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

let fakeAttributesStore: AttributesStore;
let fakeCrashlytics: CrashlyticsInternal;

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

    // Simulate session creation that now happens in registerCrashlytics
    storage[SESSION_STORAGE_SESSION_ID_KEY] = MOCK_SESSION_ID;

    fakeAttributesStore = new AttributesStore({ projectId: PROJECT_ID });
    fakeCrashlytics = {
      app: {
        name: 'DEFAULT',
        automaticDataCollectionEnabled: true,
        options: {
          projectId: PROJECT_ID,
          appId: APP_ID
        }
      },
      loggerProvider: fakeLoggerProvider,
      attributesStore: fakeAttributesStore
    };
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
    delete AUTO_CONSTANTS.appVersion;
  });

  describe('getCrashlytics()', () => {
    it('works without options', () => {
      expect(getCrashlytics(getFakeApp())).to.be.instanceOf(CrashlyticsService);
      // Two instances are the same
      expect(getCrashlytics(getFakeApp())).to.equal(
        getCrashlytics(getFakeApp())
      );
    });

    it('works with options: no config values', () => {
      expect(getCrashlytics(getFakeApp(), {})).to.equal(
        getCrashlytics(getFakeApp())
      );
    });

    it('works with options: config values set', () => {
      const app = getFakeApp();
      expect(
        getCrashlytics(app, {
          endpointUrl: 'http://endpoint1',
          region: 'us-central1',
          appVersion: '1.2.3'
        })
      ).to.equal(
        getCrashlytics(app, {
          endpointUrl: 'http://endpoint1',
          region: 'us-central1',
          appVersion: '1.2.3'
        })
      );
      expect(() => {
        getCrashlytics(app, {
          endpointUrl: 'http://endpoint2',
          region: 'us-central1',
          appVersion: '1.2.3'
        });
      }).to.throw('getCrashlytics() cannot be called with different options');
      expect(() => {
        getCrashlytics(app, {
          endpointUrl: 'http://endpoint1',
          region: 'us-east1',
          appVersion: '1.2.3'
        });
      }).to.throw('getCrashlytics() cannot be called with different options');
      expect(() => {
        getCrashlytics(app, {
          endpointUrl: 'http://endpoint1',
          region: 'us-central1',
          appVersion: '1.2.4'
        });
      }).to.throw('getCrashlytics() cannot be called with different options');
      expect(() => {
        getCrashlytics(app, {});
      }).to.throw('getCrashlytics() cannot be called with different options');
    });
  });

  describe('registerCrashlytics()', () => {
    it('should create a session and emit a log entry if none exists', () => {
      // Clear storage to simulate no session
      storage = {};
      emittedLogs.length = 0;

      getCrashlytics(getFakeApp());

      // Check if session ID was created in storage
      expect(storage[SESSION_STORAGE_SESSION_ID_KEY]).to.equal(MOCK_SESSION_ID);
    });

    it('should not create a new session if one exists', () => {
      storage[SESSION_STORAGE_SESSION_ID_KEY] = 'existing-session';
      emittedLogs.length = 0;

      getCrashlytics(getFakeApp());

      expect(storage[SESSION_STORAGE_SESSION_ID_KEY]).to.equal(
        'existing-session'
      );
    });
  });

  describe('recordError()', () => {
    it('should capture an Error object correctly', () => {
      const error = new Error('This is a test error');
      error.stack = '...stack trace...';
      error.name = 'TestError';

      recordError(fakeCrashlytics, error);

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.severityNumber).to.equal(SeverityNumber.ERROR);
      expect(log.body).to.equal('This is a test error');
      expect(log.attributes).to.deep.equal({
        'exception.type': 'TestError',
        'exception.stacktrace': '...stack trace...',
        'exception.message': 'This is a test error',
        [COMMON_ATTR_KEY.APP_VERSION]: 'unset',
        [COMMON_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID
      });
    });

    it('should handle an Error object with no stack trace', () => {
      const error = new Error('error with no stack');
      error.stack = undefined;

      recordError(fakeCrashlytics, error);

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.severityNumber).to.equal(SeverityNumber.ERROR);
      expect(log.body).to.equal('error with no stack');
      expect(log.attributes).to.deep.equal({
        'exception.type': 'Error',
        'exception.stacktrace': 'No stack trace available',
        'exception.message': 'error with no stack',
        [COMMON_ATTR_KEY.APP_VERSION]: 'unset',
        [COMMON_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID
      });
    });

    it('should capture a string error correctly', () => {
      recordError(fakeCrashlytics, 'a string error');

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.severityNumber).to.equal(SeverityNumber.ERROR);
      expect(log.body).to.equal('a string error');
      expect(log.attributes).to.deep.equal({
        [COMMON_ATTR_KEY.APP_VERSION]: 'unset',
        [COMMON_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID
      });
    });

    it('should capture an unknown error type correctly', () => {
      recordError(fakeCrashlytics, 12345);

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.severityNumber).to.equal(SeverityNumber.ERROR);
      expect(log.body).to.equal('Unknown error type: number');
      expect(log.attributes).to.deep.equal({
        [COMMON_ATTR_KEY.APP_VERSION]: 'unset',
        [COMMON_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID
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

        recordError(fakeCrashlytics, error);
        span.end();
      });

      await provider.shutdown();

      expect(emittedLogs[0].attributes).to.deep.equal({
        'exception.type': 'TestError',
        'exception.stacktrace': '...stack trace...',
        'exception.message': 'This is a test error',
        [COMMON_ATTR_KEY.APP_VERSION]: 'unset',
        'logging.googleapis.com/trace': `projects/${PROJECT_ID}/traces/my-trace`,
        'logging.googleapis.com/spanId': `my-span`,
        [COMMON_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID
      });
    });

    it('should propagate custom attributes', () => {
      const error = new Error('This is a test error');
      error.stack = '...stack trace...';
      error.name = 'TestError';

      recordError(fakeCrashlytics, error, {
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
        'exception.type': 'TestError',
        'exception.stacktrace': '...stack trace...',
        'exception.message': 'This is a test error',
        [COMMON_ATTR_KEY.APP_VERSION]: 'unset',
        strAttr: 'string attribute',
        mapAttr: {
          boolAttr: true,
          numAttr: 2
        },
        arrAttr: [1, 2, 3],
        [COMMON_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID
      });
    });

    it('should use explicit app version when provided', () => {
      AUTO_CONSTANTS.appVersion = '1.2.3'; // Unused
      const crashlytics = new CrashlyticsService(
        fakeCrashlytics.app,
        fakeLoggerProvider,
        fakeAttributesStore
      );
      crashlytics.options = {
        appVersion: '1.0.0'
      };

      recordError(crashlytics, 'a string error');

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.attributes).to.deep.equal({
        [COMMON_ATTR_KEY.APP_VERSION]: '1.0.0',
        [COMMON_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID
      });
    });

    it('should use auto constants if available', () => {
      AUTO_CONSTANTS.appVersion = '1.2.3';
      fakeAttributesStore = new AttributesStore({ projectId: PROJECT_ID });
      fakeCrashlytics.attributesStore = fakeAttributesStore;

      recordError(fakeCrashlytics, 'a string error');

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.attributes).to.deep.equal({
        [COMMON_ATTR_KEY.APP_VERSION]: '1.2.3',
        [COMMON_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID
      });
    });

    it('should retrieve route path attribute from attributesStore', () => {
      const error = new Error('This is a test error');
      error.stack = '...stack trace...';
      error.name = 'TestError';

      fakeAttributesStore.setRoutePathProvider(() => '/my-route');

      recordError(fakeCrashlytics, error);

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.attributes).to.deep.equal({
        'exception.type': 'TestError',
        'exception.stacktrace': '...stack trace...',
        'exception.message': 'This is a test error',
        [COMMON_ATTR_KEY.APP_VERSION]: 'unset',
        'route_path': '/my-route',
        [COMMON_ATTR_KEY.SESSION_ID]: MOCK_SESSION_ID
      });
    });

    describe('Session Metadata', () => {
      it('should retrieve existing session ID from sessionStorage', () => {
        storage[SESSION_STORAGE_SESSION_ID_KEY] = 'existing-session-id';
        fakeAttributesStore = new AttributesStore({ projectId: PROJECT_ID });
        fakeCrashlytics.attributesStore = fakeAttributesStore;

        recordError(fakeCrashlytics, 'error');

        expect(emittedLogs.length).to.equal(1);
        const log = emittedLogs[0];
        expect(log.attributes![COMMON_ATTR_KEY.SESSION_ID]).to.equal(
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

        fakeAttributesStore = new AttributesStore({ projectId: PROJECT_ID });
        fakeCrashlytics.attributesStore = fakeAttributesStore;

        recordError(fakeCrashlytics, 'error');

        expect(emittedLogs.length).to.equal(1);
        const log = emittedLogs[0];
        expect(log.attributes![COMMON_ATTR_KEY.SESSION_ID]).to.be.undefined;
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

        fakeAttributesStore = new AttributesStore({ projectId: PROJECT_ID });
        fakeCrashlytics.attributesStore = fakeAttributesStore;

        recordError(fakeCrashlytics, 'error');

        expect(emittedLogs.length).to.equal(1);
        const log = emittedLogs[0];
        expect(log.attributes![COMMON_ATTR_KEY.SESSION_ID]).to.be.undefined;
      });
    });
  });

  describe('flush()', () => {
    it('should flush logs correctly', async () => {
      recordError(fakeCrashlytics, 'error1');
      recordError(fakeCrashlytics, 'error2');

      expect(emittedLogs.length).to.equal(2);

      await flush(fakeCrashlytics);

      expect(emittedLogs.length).to.equal(0);
    });
  });
});

function getFakeApp(): FirebaseApp {
  registerCrashlytics();
  const app = initializeApp({
    projectId: PROJECT_ID,
    appId: APP_ID,
    apiKey: API_KEY
  });
  _addOrOverwriteComponent(
    app,
    //@ts-ignore
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
  _addOrOverwriteComponent(
    app,
    //@ts-ignore
    new Component(
      'app-check-internal',
      () => {
        return {} as FirebaseAppCheckInternal;
      },
      ComponentType.PUBLIC
    )
  );
  _addOrOverwriteComponent(
    app,
    //@ts-ignore
    new Component(
      'heartbeat',
      // @ts-ignore
      () => {
        return {
          triggerHeartbeat: () => {},
          getHeartbeatsHeader: async () => ''
        };
      },
      ComponentType.PUBLIC
    )
  );
  return app;
}
