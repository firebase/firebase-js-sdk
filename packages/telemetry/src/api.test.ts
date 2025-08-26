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
import { Logger, LogRecord, SeverityNumber } from '@opentelemetry/api-logs';
import { captureError, flush } from './api';

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
      projectId: 'my-project',
      appId: 'my-appid'
    }
  },
  loggerProvider: fakeLoggerProvider
};

describe('Top level API', () => {
  beforeEach(() => {
    // Clear the logs before each test.
    emittedLogs.length = 0;
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
        'error.stack': '...stack trace...'
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
        'error.stack': 'No stack trace available'
      });
    });

    it('should capture a string error correctly', () => {
      captureError(fakeTelemetry, 'a string error');

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.severityNumber).to.equal(SeverityNumber.ERROR);
      expect(log.body).to.equal('a string error');
      expect(log.attributes).to.be.undefined;
    });

    it('should capture an unknown error type correctly', () => {
      captureError(fakeTelemetry, 12345);

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.severityNumber).to.equal(SeverityNumber.ERROR);
      expect(log.body).to.equal('Unknown error type: number');
      expect(log.attributes).to.be.undefined;
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
