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
import { TelemetryService } from './service';
import { registerTelemetry } from './register';

const PROJECT_ID = 'my-project';
const APP_ID = 'my-appid';

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
  loggerProvider: fakeLoggerProvider,
  fid: 'fid-1234'
};

describe('Top level API', () => {
  let app: FirebaseApp;

  beforeEach(() => {
    // Clear the logs before each test.
    emittedLogs.length = 0;
    app = getFakeApp();
  });

  afterEach(async () => {
    await deleteApp(app);
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
        'user.id': 'fid-1234',
        'error.type': 'TestError',
        'error.stack': '...stack trace...',
        'app.version': 'unset'
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
        'user.id': 'fid-1234',
        'error.type': 'Error',
        'error.stack': 'No stack trace available',
        'app.version': 'unset'
      });
    });

    it('should capture a string error correctly', () => {
      captureError(fakeTelemetry, 'a string error');

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.severityNumber).to.equal(SeverityNumber.ERROR);
      expect(log.body).to.equal('a string error');
      expect(log.attributes).to.deep.equal({
        'app.version': 'unset'
      });
    });

    it('should capture an unknown error type correctly', () => {
      captureError(fakeTelemetry, 12345);

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.severityNumber).to.equal(SeverityNumber.ERROR);
      expect(log.body).to.equal('Unknown error type: number');
      expect(log.attributes).to.deep.equal({
        'app.version': 'unset'
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
        'user.id': 'fid-1234',
        'error.type': 'TestError',
        'error.stack': '...stack trace...',
        'app.version': 'unset',
        'logging.googleapis.com/trace': `projects/${PROJECT_ID}/traces/my-trace`,
        'logging.googleapis.com/spanId': `my-span`
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
        'user.id': 'fid-1234',
        'error.type': 'TestError',
        'error.stack': '...stack trace...',
        'app.version': 'unset',
        strAttr: 'string attribute',
        mapAttr: {
          boolAttr: true,
          numAttr: 2
        },
        arrAttr: [1, 2, 3]
      });
    });

    it('should use explicit app version when provided', () => {
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
        'app.version': '1.0.0'
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
      () => ({
        getId: () => Promise.resolve('fid-1234'),
        getToken: () => Promise.resolve('token-5678')
      }),
      ComponentType.PRIVATE
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
  const app = initializeApp({});
  _addOrOverwriteComponent(
    app,
    //@ts-ignore
    new Component(
      'heartbeat',
      // @ts-ignore
      () => {
        return {
          triggerHeartbeat: () => { }
        };
      },
      ComponentType.PUBLIC
    )
  );
  return app;
}
